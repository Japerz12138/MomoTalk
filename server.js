require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mysql = require('mysql2');
const { Server } = require('socket.io');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Server configuration
const PORT = process.env.PORT || 5000;
const HOST_DOMAIN = process.env.HOST_DOMAIN || 'http://localhost:3000';

const SECRET_KEY = process.env.SECRET_KEY;
if (!SECRET_KEY) {
    console.error('SECRET_KEY environment variable is required');
    process.exit(1);
}

// Message encryption configuration
const MESSAGE_ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || SECRET_KEY.substring(0, 32).padEnd(32, '0');
const MESSAGE_ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const parsedRefreshDays = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10);
const REFRESH_TOKEN_TTL_DAYS = Number.isFinite(parsedRefreshDays) && parsedRefreshDays > 0 ? parsedRefreshDays : 7;
const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
const parsedMaxSessions = parseInt(process.env.MAX_SESSIONS_PER_USER || '10', 10);
const MAX_SESSIONS_PER_USER = Number.isFinite(parsedMaxSessions) && parsedMaxSessions > 0 ? parsedMaxSessions : 10;
const TOKEN_TYPE_ACCESS = 'access';
const TOKEN_TYPE_REFRESH = 'refresh';

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    charset: 'utf8mb4'
};

if (!DB_CONFIG.user || !DB_CONFIG.password || !DB_CONFIG.database) {
    console.error('Database configuration is incomplete. Please check your environment variables.');
    process.exit(1);
}

const app = express();
const onlineUsers = new Map();

function ensureUserSessionsTable() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            session_id VARCHAR(128) NOT NULL UNIQUE,
            refresh_token_hash CHAR(64) NOT NULL,
            refresh_expires_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_sessions_user_id (user_id)
        ) ENGINE=InnoDB;
    `;

    db.query(createTableQuery, (err) => {
        if (err) {
            console.error('Failed to ensure user_sessions table exists:', err);
        }
    });
}

function generateSessionId() {
    return typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : crypto.randomBytes(16).toString('hex');
}

function createRefreshToken(sessionId) {
    return `${sessionId}.${crypto.randomBytes(48).toString('hex')}`;
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function parseRefreshToken(refreshToken) {
    if (!refreshToken || typeof refreshToken !== 'string') {
        return null;
    }

    const [sessionId, secretPart] = refreshToken.split('.');
    if (!sessionId || !secretPart) {
        return null;
    }

    return { sessionId };
}

function getRefreshExpiryDate() {
    return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
}

function issueAccessToken({ userId, username, sessionId }) {
    return jwt.sign(
        {
            userId,
            username,
            sessionId,
            type: TOKEN_TYPE_ACCESS
        },
        SECRET_KEY,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );
}

function pruneExcessSessions(userId) {
    return new Promise((resolve) => {
        if (!MAX_SESSIONS_PER_USER) {
            return resolve();
        }

        const pruneQuery = `
            DELETE FROM user_sessions
            WHERE user_id = ?
              AND id NOT IN (
                  SELECT id FROM (
                      SELECT id FROM user_sessions
                      WHERE user_id = ?
                      ORDER BY last_used_at DESC
                      LIMIT ?
                  ) AS recent_sessions
              )
        `;

        db.query(pruneQuery, [userId, userId, MAX_SESSIONS_PER_USER], (err) => {
            if (err) {
                console.error('Failed to prune old sessions:', err);
            }
            resolve();
        });
    });
}

// Message encryption/decryption functions
function encryptMessage(text) {
    if (!text || text.trim().length === 0) {
        return text; // Return empty string as-is
    }

    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(
            MESSAGE_ENCRYPTION_ALGORITHM,
            Buffer.from(MESSAGE_ENCRYPTION_KEY, 'utf8'),
            iv
        );

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        // Format: iv:authTag:encrypted (all in hex)
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('Error encrypting message:', error);
        throw new Error('Failed to encrypt message');
    }
}

function decryptMessage(encryptedText) {
    if (!encryptedText || encryptedText.trim().length === 0) {
        return encryptedText; // Return empty string as-is
    }

    // Check if the text is encrypted (format: iv:authTag:encrypted)
    // If it doesn't contain colons, it's likely plaintext
    if (!encryptedText.includes(':')) {
        return encryptedText; // Return as plaintext 
    }

    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            // Invalid format, return as-is
            return encryptedText;
        }

        const [ivHex, authTagHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(
            MESSAGE_ENCRYPTION_ALGORITHM,
            Buffer.from(MESSAGE_ENCRYPTION_KEY, 'utf8'),
            iv
        );

        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Error decrypting message:', error);
        // If decryption fails, return the encrypted text
        return encryptedText;
    }
}

// Middleware configuration
app.use(cors({
    origin: HOST_DOMAIN,
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from React build (only if build directory exists)
const staticBuildPath = path.join(__dirname, 'build');
if (fs.existsSync(staticBuildPath)) {
    app.use(express.static(staticBuildPath));
}

// Image access authentication
app.get('/uploads/*', async (req, res) => {
    // Extract path without query parameters
    const imagePath = req.path.split('?')[0]; // 例如: /uploads/avatars/avatar_1_xxx.jpg
    const filePath = path.join(__dirname, imagePath);
    
    // SECURITY CHECK
    const normalizedPath = path.normalize(filePath);
    const uploadsDir = path.normalize(path.join(__dirname, 'uploads'));
    if (!normalizedPath.startsWith(uploadsDir)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Image not found' });
    }
    
    // Try to get userId from token (priority check - if token is valid, allow access)
    let userId = null;
    let hasValidToken = false;
    const token = req.headers['authorization']?.split(' ')[1] || req.query.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, SECRET_KEY);
            const { userId: decodedUserId, sessionId, sessionToken, type } = decoded;

            if (type && type !== TOKEN_TYPE_ACCESS) {
                throw new Error('Invalid token type');
            }

            if (decodedUserId && sessionId) {
                const [sessions] = await db.promise().query(
                    'SELECT refresh_expires_at FROM user_sessions WHERE user_id = ? AND session_id = ? LIMIT 1',
                    [decodedUserId, sessionId]
                );
                if (sessions.length > 0) {
                    const expiresAt = new Date(sessions[0].refresh_expires_at);
                    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > Date.now()) {
                        userId = decodedUserId;
                        hasValidToken = true;
                    }
                }
            } else if (decodedUserId && sessionToken) {
                const [results] = await db.promise().query('SELECT session_token FROM users WHERE id = ?', [decodedUserId]);
                if (results.length > 0 && results[0].session_token === sessionToken) {
                    userId = decodedUserId;
                    hasValidToken = true;
                }
            }
        } catch (err) {
            // Token invalid
        }
    }
    
    // If token is valid, allow access (skip Referer check)
    if (hasValidToken) {
        // Token is valid, proceed with permission checks below
    } else {
        // If no valid token, check Referer to prevent direct URL access
        const referer = req.get('Referer') || req.get('Referrer');
        if (!referer || !referer.startsWith(HOST_DOMAIN)) {
            return res.status(403).json({ error: 'Access denied' });
        }
    }
    
    // Check Access
    try {
        const filename = imagePath.split('/').pop();
        
        // If user is authenticated, check permissions
        if (userId) {
            // Check if is avatar (match by exact path or filename)
            const [avatarUsers] = await db.promise().query(
                'SELECT id FROM users WHERE avatar = ? OR avatar LIKE ? OR avatar LIKE ?',
                [imagePath, `%${filename}`, `%/${filename}`]
            );
            
            if (avatarUsers.length > 0) {
                const avatarOwnerId = avatarUsers[0].id;
                // Allow avatar owner and friends to access
                if (avatarOwnerId === userId) {
                    return res.sendFile(filePath);
                }
                
                // Check if is friend
                const [friendship] = await db.promise().query(
                    `SELECT * FROM friends 
                     WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) 
                     AND status = 'accepted'`,
                    [userId, avatarOwnerId, avatarOwnerId, userId]
                );
                
                if (friendship.length > 0) {
                    return res.sendFile(filePath);
                }
            }
            
            // Check if is chat image (match by exact path or filename)
            const [chatImages] = await db.promise().query(
                `SELECT sender_id, receiver_id FROM dms 
                 WHERE (image_url = ? OR image_url LIKE ? OR image_url LIKE ?)
                 AND (sender_id = ? OR receiver_id = ?)`,
                [imagePath, `%${filename}`, `%/${filename}`, userId, userId]
            );
            
            if (chatImages.length > 0) {
                return res.sendFile(filePath);
            }
        }
        
        // If no userId but Referer is valid, allow access (from app)
        // This handles old images without token
        return res.sendFile(filePath);
    } catch (error) {
        console.error('Error checking image access:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Create uploads directories if they don't exist
const uploadDirs = ['uploads/avatars', 'uploads/chat-images'];
uploadDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory for processing with sharp

const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Database connection
const db = mysql.createPool(DB_CONFIG);

ensureUserSessionsTable();

db.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        process.exit(1);
    } else {
        console.log('Connected to the database');
        connection.release();
    }
});

// Momo Code generation function
function generateMomoCode() {
    // Generate 12 random digits
    let code = '';
    for (let i = 0; i < 12; i++) {
        code += Math.floor(Math.random() * 10);
    }
    // Format as xxxx-xxxx-xxxx
    return `${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8, 12)}`;
}

async function generateUniqueMomoCode() {
    let momoCode;
    let isUnique = false;
    
    while (!isUnique) {
        momoCode = generateMomoCode();
        // Check if this code already exists
        const [rows] = await db.promise().query('SELECT id FROM users WHERE momo_code = ?', [momoCode]);
        if (rows.length === 0) {
            isUnique = true;
        }
    }
    
    return momoCode;
}

// Socket.io configuration
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: HOST_DOMAIN,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (userId) => {
        if (userId) {
            onlineUsers.set(userId, socket.id);
            socket.join(userId.toString());
            console.log(`User ${userId} joined room`);

            // Join all group rooms the user is a member of
            db.query('SELECT group_id FROM group_members WHERE user_id = ?', [userId], (err, groups) => {
                if (!err) {
                    groups.forEach(group => {
                        socket.join(`group_${group.group_id}`);
                    });
                }
            });

            // Update last_used_at when user comes online
            db.query('UPDATE user_sessions SET last_used_at = NOW() WHERE user_id = ?', [userId], (err) => {
                if (err) console.error('Error updating last_used_at on join:', err);
            });

            notifyFriends(userId, true);
        }
    });

    // Request online status for all friends
    socket.on('request_friends_status', (friendIds) => {
        if (!Array.isArray(friendIds)) return;
        
        const friendIdsStr = friendIds.join(',');
        if (!friendIdsStr) return;
        
        const query = `
            SELECT user_id, MAX(last_used_at) AS lastSeen 
            FROM user_sessions 
            WHERE user_id IN (${friendIds.map(() => '?').join(',')}) 
            GROUP BY user_id
        `;
        
        db.query(query, friendIds, (err, results) => {
            if (err) {
                console.error('Error fetching lastSeen:', err);
                const statusUpdates = friendIds.map(friendId => ({
                    friendId: friendId,
                    isOnline: onlineUsers.has(friendId)
                }));
                socket.emit('friends_status_response', statusUpdates);
                return;
            }
            
            const lastSeenMap = new Map();
            results.forEach(row => {
                lastSeenMap.set(row.user_id, row.lastSeen);
            });
            
            const statusUpdates = friendIds.map(friendId => {
                const isOnline = onlineUsers.has(friendId);
                const lastSeen = isOnline ? new Date().toISOString() : (lastSeenMap.get(friendId) || null);
                return {
                    friendId: friendId,
                    isOnline: isOnline,
                    lastSeen: lastSeen
                };
            });
            
            socket.emit('friends_status_response', statusUpdates);
        });
    });

    socket.on('disconnect', () => {
        const userId = Array.from(onlineUsers.entries()).find(([, id]) => id === socket.id)?.[0];
        if (userId) {
            onlineUsers.delete(userId);
            notifyFriends(userId, false); //Broadcast user offline
            console.log(`User ${userId} disconnected`);
        }
    });

    socket.on('leave_room', (userId) => {
        if (userId) {
            onlineUsers.delete(userId);
            socket.leave(userId.toString());
            console.log(`User ${userId} left room`);
        }
    });
    
    // Baisc Group Message Functions

    socket.on('send_group_message', (data) => {
        const { senderId, groupId, text, imageUrl, replyTo, clientId, isEmoji } = data;

        if (!senderId || !groupId) {
            console.error('Invalid group message payload: missing senderId or groupId', data);
            return;
        }

        const hasText = text && text.trim().length > 0;
        const hasImage = imageUrl && imageUrl.trim().length > 0;

        if (!hasText && !hasImage) {
            console.error('Invalid group message payload: missing text and imageUrl', data);
            return;
        }

        // Check if user is a member
        db.query('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, senderId], (checkErr, checkResults) => {
            if (checkErr || checkResults.length === 0) {
                console.error('User is not a member of this group');
                return;
            }

            let messageType = 'text';
            if (hasText && hasImage) {
                messageType = 'both';
            } else if (hasImage) {
                messageType = 'image';
            }

            const textValue = hasText ? text.trim() : '';
            const encryptedText = hasText ? encryptMessage(textValue) : '';

            let replyToId = null;
            let replyToData = null;
            if (replyTo) {
                if (replyTo.id) {
                    replyToId = replyTo.id;
                } else if (replyTo.senderId && (replyTo.text || replyTo.imageUrl)) {
                    const findReplyQuery = `
                        SELECT id FROM group_messages 
                        WHERE group_id = ? AND (text = ? OR image_url = ?)
                        ORDER BY timestamp DESC LIMIT 1
                    `;
                    const replyText = replyTo.text ? encryptMessage(replyTo.text.trim()) : '';
                    db.query(findReplyQuery, [groupId, replyText || null, replyTo.imageUrl || null], (findErr, findResults) => {
                        if (!findErr && findResults.length > 0) {
                            replyToId = findResults[0].id;
                            insertGroupMessage();
                        } else {
                            replyToData = JSON.stringify(replyTo);
                            insertGroupMessage();
                        }
                    });
                    return;
                }
            }

            function insertGroupMessage() {
                const query = 'INSERT INTO group_messages (group_id, sender_id, text, image_url, message_type, reply_to_id, reply_to_data, is_emoji, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP());';
                db.query(query, [groupId, senderId, encryptedText, hasImage ? imageUrl : null, messageType, replyToId, replyToData, isEmoji ? 1 : 0], (err, insertResult) => {
                    if (!err) {
                        const messageId = insertResult.insertId;
                        const userQuery = 'SELECT nickname, avatar FROM users WHERE id = ?';
                        db.query(userQuery, [senderId], (userErr, userResults) => {
                            if (!userErr && userResults.length > 0) {
                                const { nickname, avatar } = userResults[0];

                                let finalReplyTo = null;
                                if (replyToId) {
                                    const getReplyQuery = 'SELECT text, image_url, sender_id FROM group_messages WHERE id = ?';
                                    db.query(getReplyQuery, [replyToId], (replyErr, replyResults) => {
                                        if (!replyErr && replyResults.length > 0) {
                                            const replyMsg = replyResults[0];
                                            finalReplyTo = {
                                                id: replyToId,
                                                text: replyMsg.text ? decryptMessage(replyMsg.text) : null,
                                                imageUrl: replyMsg.image_url,
                                                senderId: replyMsg.sender_id
                                            };
                                        }
                                        emitGroupMessage(finalReplyTo);
                                    });
                                } else if (replyToData) {
                                    try {
                                        finalReplyTo = JSON.parse(replyToData);
                                    } catch (e) {
                                        finalReplyTo = null;
                                    }
                                    emitGroupMessage(finalReplyTo);
                                } else {
                                    emitGroupMessage(null);
                                }

                                function emitGroupMessage(replyToInfo) {
                                    const emitData = {
                                        id: messageId,
                                        senderId,
                                        groupId,
                                        text: hasText ? textValue : null,
                                        imageUrl: hasImage ? imageUrl : null,
                                        messageType,
                                        timestamp: new Date().toISOString(),
                                        nickname,
                                        avatar,
                                        replyTo: replyToInfo,
                                        clientId,
                                        isEmoji: Boolean(isEmoji)
                                    };
                                    // Send to all group members
                                    io.to(`group_${groupId}`).emit('receive_group_message', emitData);
                                }
                            }
                        });
                    } else {
                        console.error('Error saving group message:', err.message);
                    }
                });
            }

            if (!replyTo || replyTo.id) {
                insertGroupMessage();
            }
        });
    });

    socket.on('send_message', (data) => {
        const { senderId, receiverId, text, imageUrl, replyTo, clientId, isEmoji } = data;

        // Validate: must have senderId, receiverId, and at least text or imageUrl
        if (!senderId || !receiverId) {
            console.error('Invalid message payload: missing senderId or receiverId', data);
            return;
        }

        // Allow self-messaging for multi-device sync
        const isSelfMessage = senderId === receiverId;

        // Check if text has content (including emoji) or if there's an image
        const hasText = text && text.trim().length > 0;
        const hasImage = imageUrl && imageUrl.trim().length > 0;

        if (!hasText && !hasImage) {
            console.error('Invalid message payload: missing text and imageUrl', data);
            return;
        }

        // Determine message type
        let messageType = 'text';
        if (hasText && hasImage) {
            messageType = 'both';
        } else if (hasImage) {
            messageType = 'image';
        }

        // Prepare text value: use trimmed text if available, otherwise empty string (since text field is NOT NULL)
        const textValue = hasText ? text.trim() : '';
        
        // Encrypt the message text before storing
        const encryptedText = hasText ? encryptMessage(textValue) : '';

        // Handle replyTo: if replyTo has an id, use it; otherwise, extract reply info
        let replyToId = null;
        let replyToData = null;
        if (replyTo) {
            if (replyTo.id) {
                replyToId = replyTo.id;
            } else if (replyTo.senderId && (replyTo.text || replyTo.imageUrl)) {
                // Find the message being replied to by matching sender, text/image, and recent timestamp
                const findReplyQuery = `
                    SELECT id FROM dms 
                    WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
                    AND (text = ? OR image_url = ?)
                    ORDER BY timestamp DESC
                    LIMIT 1
                `;
                const replyText = replyTo.text ? encryptMessage(replyTo.text.trim()) : '';
                db.query(findReplyQuery, [
                    replyTo.senderId, receiverId === replyTo.senderId ? senderId : receiverId,
                    replyTo.senderId, receiverId === replyTo.senderId ? senderId : receiverId,
                    replyText || null, replyTo.imageUrl || null
                ], (findErr, findResults) => {
                    if (!findErr && findResults.length > 0) {
                        replyToId = findResults[0].id;
                        insertMessage();
                    } else {
                        // If can't find, still save reply info as JSON
                        replyToData = JSON.stringify(replyTo);
                        insertMessage();
                    }
                });
                return;
            }
        }

        function insertMessage() {
            const query = 'INSERT INTO dms (sender_id, receiver_id, text, image_url, message_type, reply_to_id, reply_to_data, is_emoji, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP());';
            db.query(query, [senderId, receiverId, encryptedText, hasImage ? imageUrl : null, messageType, replyToId, replyToData, isEmoji ? 1 : 0], (err, insertResult) => {
                if (!err) {
                    const messageId = insertResult.insertId;
                    const userQuery = 'SELECT nickname, avatar FROM users WHERE id = ?';
                    db.query(userQuery, [senderId], (userErr, userResults) => {
                        if (!userErr && userResults.length > 0) {
                            const { nickname, avatar } = userResults[0];

                            // Get replyTo info if it exists
                            let finalReplyTo = null;
                            if (replyToId) {
                                const getReplyQuery = 'SELECT text, image_url, sender_id FROM dms WHERE id = ?';
                                db.query(getReplyQuery, [replyToId], (replyErr, replyResults) => {
                                    if (!replyErr && replyResults.length > 0) {
                                        const replyMsg = replyResults[0];
                                        finalReplyTo = {
                                            id: replyToId,
                                            text: replyMsg.text ? decryptMessage(replyMsg.text) : null,
                                            imageUrl: replyMsg.image_url,
                                            senderId: replyMsg.sender_id
                                        };
                                    }
                                    emitMessage(finalReplyTo);
                                });
                            } else if (replyToData) {
                                try {
                                    finalReplyTo = JSON.parse(replyToData);
                                } catch (e) {
                                    finalReplyTo = null;
                                }
                                emitMessage(finalReplyTo);
                            } else {
                                emitMessage(null);
                            }

                            function emitMessage(replyToInfo) {
                                const emitData = {
                                    id: messageId,
                                    senderId,
                                    receiverId,
                                    text: hasText ? textValue : null,
                                    imageUrl: hasImage ? imageUrl : null,
                                    messageType,
                                    timestamp: new Date().toISOString(),
                                    nickname,
                                    avatar,
                                    replyTo: replyToInfo,
                                    clientId,
                                    isEmoji: Boolean(isEmoji)
                                };
                                if (isSelfMessage) {
                                    // Self-message: send to sender's all devices
                                    io.to(senderId.toString()).emit('receive_message', emitData);
                                } else {
                                    // Regular message: send to receiver's all devices
                                    io.to(receiverId.toString()).emit('receive_message', emitData);
                                    // Also send to sender's other devices for multi-device sync (excluding the sending socket)
                                    socket.to(senderId.toString()).emit('receive_message', emitData);
                                }
                            }
                        } else {
                            console.error('Error fetching sender info:', userErr ? userErr.message : 'No user found');
                        }
                    });
                } else {
                    console.error('Error saving message:', err.message);
                }
            });
        }

        if (!replyTo || replyTo.id) {
            insertMessage();
        }
    });



    // Handle friend request events
    socket.on('send_friend_request', ({ senderId, receiverId, senderUsername }) => {
        console.log(`Friend request sent from ${senderId} to ${receiverId}`);
        io.to(receiverId.toString()).emit('receive_friend_request', {
            senderId,
            senderUsername
        });
    });

    socket.on('respond_friend_request', ({ senderId, receiverId, action }) => {
        console.log(`Friend request ${action} by ${receiverId}`);
        io.to(senderId.toString()).emit('friend_request_responded', { receiverId, action });
        if (action === 'accept') {
            io.to(senderId.toString()).emit('update_friend_list');
        }
    });

});

app.get('/api', (req, res) => {
    res.json({ message: 'Hello from momotalk api!' });
});

// API ROUTERS
app.post('/register', async (req, res) => {
    const { username, email, password, nickname } = req.body;

    if (!username || !email || !password || !nickname) {
        return res.status(400).json({ error: 'Username, email, password, and nickname are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const momoCode = await generateUniqueMomoCode();
        const query = 'INSERT INTO users (username, email, password, nickname, momo_code) VALUES (?, ?, ?, ?, ?)';
        db.query(query, [username, email, hashedPassword, nickname, momoCode], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Username or email already exists.' });
                }
                return res.status(500).json({ error: 'Database error.' });
            }
            res.json({ message: 'User registered successfully.', momoCode });
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const sessionId = generateSessionId();
        const refreshToken = createRefreshToken(sessionId);
        const refreshTokenHash = hashToken(refreshToken);
        const refreshExpiresAt = getRefreshExpiryDate();

        const insertSessionQuery = `
            INSERT INTO user_sessions (user_id, session_id, refresh_token_hash, refresh_expires_at)
            VALUES (?, ?, ?, ?)
        `;

        db.query(insertSessionQuery, [user.id, sessionId, refreshTokenHash, refreshExpiresAt], (insertErr) => {
            if (insertErr) {
                console.error('Failed to store session:', insertErr);
                return res.status(500).json({ error: 'Failed to create session' });
            }

            const accessToken = issueAccessToken({
                userId: user.id,
                username: user.username,
                sessionId
            });

            pruneExcessSessions(user.id).finally(() => {
                res.json({
                    token: accessToken,
                    accessToken,
                    refreshToken,
                    userId: user.id,
                    username: user.username,
                    nickname: user.nickname,
                    avatar: user.avatar || null,
                    email: user.email,
                    momoCode: user.momo_code || null,
                    signature: user.signature || '',
                    birthday: user.birthday || null,
                });
            });
        });
    });
});

app.post('/token/refresh', async (req, res) => {
    const { refreshToken } = req.body || {};

    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }

    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const refreshTokenHash = hashToken(refreshToken);

    try {
        const [sessions] = await db.promise().query(
            'SELECT id, user_id, refresh_expires_at FROM user_sessions WHERE session_id = ? AND refresh_token_hash = ? LIMIT 1',
            [parsed.sessionId, refreshTokenHash]
        );

        if (sessions.length === 0) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        const session = sessions[0];
        const expiresAt = new Date(session.refresh_expires_at);
        if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
            await db.promise().query('DELETE FROM user_sessions WHERE id = ?', [session.id]);
            return res.status(401).json({ error: 'Refresh token expired' });
        }

        const [users] = await db.promise().query('SELECT username FROM users WHERE id = ? LIMIT 1', [session.user_id]);
        const username = users.length > 0 ? users[0].username : undefined;

        const accessToken = issueAccessToken({
            userId: session.user_id,
            username,
            sessionId: parsed.sessionId
        });

        const nextRefreshToken = createRefreshToken(parsed.sessionId);
        const nextRefreshHash = hashToken(nextRefreshToken);
        const nextRefreshExpiry = getRefreshExpiryDate();

        await db.promise().query(
            'UPDATE user_sessions SET refresh_token_hash = ?, refresh_expires_at = ?, last_used_at = NOW() WHERE id = ?',
            [nextRefreshHash, nextRefreshExpiry, session.id]
        );

        res.json({
            token: accessToken,
            accessToken,
            refreshToken: nextRefreshToken,
        });
    } catch (error) {
        console.error('Failed to refresh access token:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

app.post('/logout', async (req, res) => {
    const { refreshToken } = req.body || {};

    if (!refreshToken) {
        return res.status(200).json({ message: 'Logged out' });
    }

    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) {
        return res.status(200).json({ message: 'Logged out' });
    }

    const refreshTokenHash = hashToken(refreshToken);

    try {
        await db.promise().query(
            'DELETE FROM user_sessions WHERE session_id = ? AND refresh_token_hash = ?',
            [parsed.sessionId, refreshTokenHash]
        );
        res.json({ message: 'Logged out' });
    } catch (error) {
        console.error('Failed to invalidate session:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1] || req.query.token;
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            console.error('JWT Verification Error:', err.message);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const { userId, sessionId, sessionToken, type } = decoded;

        if (!userId) {
            return res.status(401).json({ error: 'Invalid session payload' });
        }

        if (type && type !== TOKEN_TYPE_ACCESS) {
            return res.status(401).json({ error: 'Invalid token type' });
        }

        if (sessionId) {
            const sessionQuery = `
                SELECT id, refresh_expires_at
                FROM user_sessions
                WHERE user_id = ? AND session_id = ?
                LIMIT 1
            `;

            db.query(sessionQuery, [userId, sessionId], (sessionErr, results) => {
                if (sessionErr) {
                    console.error('Failed to verify session:', sessionErr);
                    return res.status(500).json({ error: 'Database error' });
                }

                if (results.length === 0) {
                    return res.status(401).json({ error: 'Invalid session' });
                }

                const sessionRecord = results[0];
                const expiresAt = new Date(sessionRecord.refresh_expires_at);
                if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
                    const deleteQuery = 'DELETE FROM user_sessions WHERE id = ?';
                    db.query(deleteQuery, [sessionRecord.id], (deleteErr) => {
                        if (deleteErr) {
                            console.error('Failed to delete expired session:', deleteErr);
                        }
                        return res.status(401).json({ error: 'Session expired' });
                    });
                    return;
                }

                const touchQuery = 'UPDATE user_sessions SET last_used_at = NOW() WHERE id = ?';
                db.query(touchQuery, [sessionRecord.id], (touchErr) => {
                    if (touchErr) {
                        console.error('Failed to update session usage:', touchErr);
                    }
                    req.user = { userId, sessionId };
                    next();
                });
            });
            return;
        }

        // Backward compatibility: allow old tokens relying on users.session_token
        if (sessionToken) {
            const legacyQuery = 'SELECT session_token FROM users WHERE id = ?';
            db.query(legacyQuery, [userId], (legacyErr, results) => {
                if (legacyErr) return res.status(500).json({ error: 'Database error' });
                if (results.length === 0 || results[0].session_token !== sessionToken) {
                    return res.status(401).json({ error: 'Invalid session token' });
                }

                req.user = { userId };
                next();
            });
            return;
        }

        return res.status(401).json({ error: 'Invalid session token' });
    });
}

// Helper function to notify friends about online status changes
function notifyFriends(userId, isOnline) {
    const friendsQuery = `
        SELECT friend_id AS id FROM friends WHERE user_id = ? AND status = 'accepted'
        UNION
        SELECT user_id AS id FROM friends WHERE friend_id = ? AND status = 'accepted'
    `;
    
    db.query(friendsQuery, [userId, userId], (err, friends) => {
        if (err) {
            console.error('Error fetching friends for status notification:', err.message);
            return;
        }

        const lastSeen = isOnline ? new Date().toISOString() : null;
        
        db.query('SELECT MAX(last_used_at) AS lastSeen FROM user_sessions WHERE user_id = ?', [userId], (err2, results) => {
            if (!err2 && results[0] && results[0].lastSeen) {
                const dbLastSeen = results[0].lastSeen;
                const finalLastSeen = isOnline ? new Date().toISOString() : dbLastSeen;
                
                console.log(`Notifying friends of user ${userId} (${isOnline ? 'online' : 'offline'})`);
                friends.forEach((friend) => {
                    io.to(friend.id.toString()).emit('friend_status_update', {
                        friendId: userId,
                        isOnline,
                        lastSeen: finalLastSeen
                    });
                });
            } else {
                console.log(`Notifying friends of user ${userId} (${isOnline ? 'online' : 'offline'})`);
                friends.forEach((friend) => {
                    io.to(friend.id.toString()).emit('friend_status_update', {
                        friendId: userId,
                        isOnline,
                        lastSeen: lastSeen
                    });
                });
            }
        });
    });
}

// Helper function to notify friends to refresh their friend list (when profile changes)
function notifyFriendsToRefreshList(userId) {
    const friendsQuery = `
        SELECT friend_id AS id FROM friends WHERE user_id = ? AND status = 'accepted'
        UNION
        SELECT user_id AS id FROM friends WHERE friend_id = ? AND status = 'accepted'
    `;
    
    db.query(friendsQuery, [userId, userId], (err, friends) => {
        if (err) {
            console.error('Error fetching friends for list refresh notification:', err.message);
            return;
        }

        console.log(`Notifying friends to refresh list for user ${userId}`);
        friends.forEach((friend) => {
            io.to(friend.id.toString()).emit('update_friend_list');
        });
    });
}



// POST
app.post('/messages', authenticateToken, (req, res) => {
    const { text } = req.body;
    const query = 'INSERT INTO messages (user_id, text, timestamp) VALUES (?, ?, UTC_TIMESTAMP())';

    db.query(query, [req.user.userId, text], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Message sent' });
    });
});

app.get('/messages', authenticateToken, (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
        SELECT messages.id, messages.text, messages.timestamp, users.nickname AS username
        FROM messages
                 JOIN users ON messages.user_id = users.id
        ORDER BY messages.timestamp ASC
        LIMIT ? OFFSET ?
    `;

    db.query(query, [parseInt(limit), parseInt(offset)], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Friend management routes
app.get('/friends', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    const friendsQuery = `
        SELECT u.id, u.username, u.nickname, u.avatar, u.signature, u.birthday,
               (SELECT d.text
                FROM dms d
                WHERE (d.sender_id = u.id AND d.receiver_id = ?)
                   OR (d.sender_id = ? AND d.receiver_id = u.id)
                ORDER BY d.timestamp DESC LIMIT 1) AS lastMessage,
               (SELECT d.timestamp
                FROM dms d
                WHERE (d.sender_id = u.id AND d.receiver_id = ?)
                   OR (d.sender_id = ? AND d.receiver_id = u.id)
                ORDER BY d.timestamp DESC LIMIT 1) AS lastMessageTime,
               (SELECT d.image_url
                FROM dms d
                WHERE (d.sender_id = u.id AND d.receiver_id = ?)
                   OR (d.sender_id = ? AND d.receiver_id = u.id)
                ORDER BY d.timestamp DESC LIMIT 1) AS imageUrl,
               (SELECT MAX(last_used_at) FROM user_sessions WHERE user_id = u.id) AS lastSeen
        FROM users u
                 JOIN friends f ON
            ((f.user_id = ? AND f.friend_id = u.id) OR (f.friend_id = ? AND f.user_id = u.id))
                AND f.status = 'accepted';
    `;

    db.query(friendsQuery, [userId, userId, userId, userId, userId, userId, userId, userId], (err, results) => {
        if (err) {
            // console.error('Error executing friends query:', err.message); // For DEBUG
            return res.status(500).json({ error: 'Failed to fetch friends' });
        }
        
        // Add online status to each friend based on onlineUsers map
        const friendsWithStatus = results.map(friend => ({
            ...friend,
            isOnline: onlineUsers.has(friend.id),
            lastMessage: friend.lastMessage ? decryptMessage(friend.lastMessage) : null
        }));
        
        res.json(friendsWithStatus);
    });
});

app.post('/friend/add', authenticateToken, (req, res) => {
    const { friendMomoCode } = req.body;
    const userId = req.user.userId;

    if (!friendMomoCode) {
        return res.status(400).json({ error: 'Friend Momo Code is required.' });
    }

    // No add myself
    const getUserQuery = 'SELECT id FROM users WHERE momo_code = ?';
    db.query(getUserQuery, [friendMomoCode], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'User not found.' });

        const friendId = results[0].id;

        if (friendId === userId) {
            return res.status(400).json({ error: 'You cannot add yourself as a friend.' });
        }

        // See if already friend
        const checkFriendshipQuery = `
            SELECT * FROM friends
            WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
        `;
        db.query(checkFriendshipQuery, [userId, friendId, friendId, userId], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length > 0) {
                return res.status(400).json({ error: 'Friendship already exists or pending.' });
            }

            // Friend request
            const addFriendQuery = 'INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, "pending")';
            db.query(addFriendQuery, [userId, friendId], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                
                // Get sender username for notification
                const getUserQuery = 'SELECT username FROM users WHERE id = ?';
                db.query(getUserQuery, [userId], (userErr, userResults) => {
                    if (!userErr && userResults.length > 0) {
                        // Notify receiver via socket
                        io.to(friendId.toString()).emit('receive_friend_request', {
                            senderId: userId,
                            senderUsername: userResults[0].username
                        });
                    }
                });
                
                res.json({ message: 'Friend request sent', receiverId: friendId });
            });
        });
    });
});

app.post('/friend/accept', authenticateToken, (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.userId;

    const checkRequestQuery = 'SELECT * FROM friends WHERE user_id = ? AND friend_id = ? AND status = "pending"';
    db.query(checkRequestQuery, [friendId, userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'No pending friend request found' });

        const acceptFriendQuery = 'UPDATE friends SET status = "accepted" WHERE user_id = ? AND friend_id = ?';
        db.query(acceptFriendQuery, [friendId, userId], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const reverseFriendQuery = `
                INSERT INTO friends (user_id, friend_id, status)
                VALUES (?, ?, "accepted")
                ON DUPLICATE KEY UPDATE status = "accepted"
            `;
            db.query(reverseFriendQuery, [userId, friendId], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                
                // Notify both users to update friend lists
                io.to(userId.toString()).emit('update_friend_list');
                io.to(friendId.toString()).emit('update_friend_list');
                
                // Notify sender that request was accepted
                io.to(friendId.toString()).emit('friend_request_responded', {
                    receiverId: userId,
                    action: 'accept'
                });
                
                res.json({ message: 'Friend request accepted and relationship updated' });
            });
        });
    });
});

app.get('/friend/requests', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    const query = `
        SELECT f.id, u.username, u.nickname
        FROM friends f
                 JOIN users u ON f.user_id = u.id
        WHERE f.friend_id = ? AND f.status = 'pending'
    `;

    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// File upload routes
app.post('/upload/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const userId = req.user.userId;
        
        // Calculate MD5 hash of the file
        const md5Hash = crypto.createHash('md5').update(req.file.buffer).digest('hex');
        
        // Check if image with this MD5 already exists
        const [existingImages] = await db.promise().query(
            'SELECT file_url, upload_count FROM uploaded_images WHERE md5_hash = ? AND file_type = "avatar"',
            [md5Hash]
        );
        
        let avatarUrl;
        
        if (existingImages.length > 0) {
            // Image already exists, use existing URL
            avatarUrl = existingImages[0].file_url;
            
            // Increment upload count and update last_used_at
            await db.promise().query(
                'UPDATE uploaded_images SET upload_count = upload_count + 1, last_used_at = UTC_TIMESTAMP() WHERE md5_hash = ? AND file_type = "avatar"',
                [md5Hash]
            );
            
            console.log(`Avatar reused from MD5 cache: ${md5Hash}`);
        } else {
            // New image, proceed with upload
            // Detect original format to preserve PNG transparency
            const image = sharp(req.file.buffer);
            const metadata = await image.metadata();
            const originalFormat = metadata.format; // 'gif', 'png', 'jpeg', 'webp', etc.
            
            // Determine file extension based on original format
            // For avatars, we prefer PNG for transparency, but convert GIF to static
            let fileExtension;
            if (originalFormat === 'png') {
                fileExtension = 'png';
            } else if (originalFormat === 'webp') {
                fileExtension = 'webp';
            } else {
                // Default to jpg for jpeg, gif (converted to static), and other formats
                fileExtension = 'jpg';
            }
            
            const filename = `avatar_${userId}_${Date.now()}.${fileExtension}`;
            const filepath = path.join(__dirname, 'uploads', 'avatars', filename);

            // Process image based on format
            if (originalFormat === 'png') {
                // For PNG, preserve transparency
                await image
                    .resize(400, 400, { fit: 'cover' })
                    .png({ quality: 90, compressionLevel: 9 })
                    .toFile(filepath);
            } else if (originalFormat === 'webp') {
                // For WebP, preserve format
                await image
                    .resize(400, 400, { fit: 'cover' })
                    .webp({ quality: 85 })
                    .toFile(filepath);
            } else {
                // For JPEG, GIF (convert to static), and other formats, convert to JPEG
                await image
                    .resize(400, 400, { fit: 'cover' })
                    .jpeg({ quality: 85 })
                    .toFile(filepath);
            }

            // Generate relative URL path (works with same-origin frontend)
            avatarUrl = `/uploads/avatars/${filename}`;
            
            // Store MD5 and URL in database
            await db.promise().query(
                'INSERT INTO uploaded_images (md5_hash, file_url, file_type, file_size) VALUES (?, ?, "avatar", ?)',
                [md5Hash, avatarUrl, req.file.size]
            );
            
            console.log(`New avatar uploaded with MD5: ${md5Hash}, format: ${originalFormat}`);
        }

        // Update user's avatar in database
        const updateQuery = 'UPDATE users SET avatar = ? WHERE id = ?';
        await db.promise().query(updateQuery, [avatarUrl, userId]);

        // Fetch updated user data to broadcast to all devices
        const [updatedUsers] = await db.promise().query(
            'SELECT id, username, nickname, avatar, signature, birthday FROM users WHERE id = ?',
            [userId]
        );
        
        if (updatedUsers.length > 0) {
            const updatedUser = updatedUsers[0];
            // Broadcast profile update to all user's devices
            io.to(userId.toString()).emit('profile_updated', {
                userId: updatedUser.id,
                username: updatedUser.username,
                nickname: updatedUser.nickname,
                avatar: updatedUser.avatar,
                signature: updatedUser.signature,
                birthday: updatedUser.birthday
            });
            
            // Notify friends to refresh their friend list (avatar changed)
            notifyFriendsToRefreshList(userId);
        }

        res.json({ 
            message: 'Avatar uploaded successfully.',
            avatarUrl: avatarUrl,
            cached: existingImages.length > 0
        });
    } catch (error) {
        console.error('Error uploading avatar:', error.message);
        res.status(500).json({ error: 'Failed to upload avatar.' });
    }
});

app.post('/upload/chat-image', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const userId = req.user.userId;
        
        // Calculate MD5 hash of the file
        const md5Hash = crypto.createHash('md5').update(req.file.buffer).digest('hex');
        
        // Check if image with this MD5 already exists
        const [existingImages] = await db.promise().query(
            'SELECT file_url, upload_count FROM uploaded_images WHERE md5_hash = ? AND file_type = "chat"',
            [md5Hash]
        );
        
        let imageUrl;
        
        if (existingImages.length > 0) {
            // Image already exists, use existing URL
            imageUrl = existingImages[0].file_url;
            
            // Increment upload count and update last_used_at
            await db.promise().query(
                'UPDATE uploaded_images SET upload_count = upload_count + 1, last_used_at = UTC_TIMESTAMP() WHERE md5_hash = ? AND file_type = "chat"',
                [md5Hash]
            );
            
            console.log(`Chat image reused from MD5 cache: ${md5Hash}`);
        } else {
            // New image, proceed with upload
            // Detect original format to preserve GIF animation and PNG transparency
            const image = sharp(req.file.buffer);
            const metadata = await image.metadata();
            const originalFormat = metadata.format; // 'gif', 'png', 'jpeg', 'webp', etc.
            
            // Determine file extension based on original format
            let fileExtension;
            if (originalFormat === 'gif') {
                fileExtension = 'gif';
            } else if (originalFormat === 'png') {
                fileExtension = 'png';
            } else if (originalFormat === 'webp') {
                fileExtension = 'webp';
            } else {
                // Default to jpg for jpeg and other formats
                fileExtension = 'jpg';
            }
            
            const filename = `chat_${userId}_${Date.now()}.${fileExtension}`;
            const filepath = path.join(__dirname, 'uploads', 'chat-images', filename);

            // Process image based on format
            if (originalFormat === 'gif') {
                // For GIF, preserve animation by writing original buffer directly
                // Only resize if too large (this will convert to static, so we skip resizing for GIFs)
                // For now, save GIF as-is to preserve animation
                fs.writeFileSync(filepath, req.file.buffer);
            } else if (originalFormat === 'png') {
                // For PNG, preserve transparency
                if (metadata.width > 1200) {
                    await image
                        .resize(1200, null, { withoutEnlargement: true })
                        .png({ quality: 90, compressionLevel: 9 })
                        .toFile(filepath);
                } else {
                    // Optimize PNG without resizing
                    await image
                        .png({ quality: 90, compressionLevel: 9 })
                        .toFile(filepath);
                }
            } else if (originalFormat === 'webp') {
                // For WebP, preserve format
                if (metadata.width > 1200) {
                    await image
                        .resize(1200, null, { withoutEnlargement: true })
                        .webp({ quality: 85 })
                        .toFile(filepath);
                } else {
                    await image
                        .webp({ quality: 85 })
                        .toFile(filepath);
                }
            } else {
                // For JPEG and other formats, convert to JPEG
                if (metadata.width > 1200) {
                    await image
                        .resize(1200, null, { withoutEnlargement: true })
                        .jpeg({ quality: 85 })
                        .toFile(filepath);
                } else {
                    await image
                        .jpeg({ quality: 85 })
                        .toFile(filepath);
                }
            }

            // Generate relative URL path (works with same-origin frontend)
            imageUrl = `/uploads/chat-images/${filename}`;
            
            // Store MD5 and URL in database
            await db.promise().query(
                'INSERT INTO uploaded_images (md5_hash, file_url, file_type, file_size) VALUES (?, ?, "chat", ?)',
                [md5Hash, imageUrl, req.file.size]
            );
            
            console.log(`New chat image uploaded with MD5: ${md5Hash}, format: ${originalFormat}`);
        }

        res.json({ 
            message: 'Image uploaded successfully.',
            imageUrl: imageUrl,
            cached: existingImages.length > 0
        });
    } catch (error) {
        console.error('Error uploading chat image:', error.message);
        res.status(500).json({ error: 'Failed to upload image.' });
    }
});

app.post('/user/update', authenticateToken, async (req, res) => {
    const { nickname, avatar, signature, birthday, oldPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Validate request
    if (!nickname && !avatar && !signature && birthday === undefined && (!oldPassword || !newPassword)) {
        return res.status(400).json({ error: 'No updates provided.' });
    }

    // Validate birthday format if provided (MM-DD)
    if (birthday !== undefined && birthday !== null && birthday !== '') {
        const birthdayRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
        if (!birthdayRegex.test(birthday)) {
            return res.status(400).json({ error: 'Invalid birthday format. Please use MM-DD format.' });
        }
    }

    try {
        // Handle password update
        if (oldPassword && newPassword) {
            const query = "SELECT password FROM users WHERE id = ?";
            const [rows] = await db.promise().query(query, [userId]);

            if (rows.length === 0) {
                return res.status(404).json({ error: 'User not found.' });
            }

            const user = rows[0];
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: 'Current password is incorrect.' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const updatePasswordQuery = "UPDATE users SET password = ? WHERE id = ?";
            await db.promise().query(updatePasswordQuery, [hashedPassword, userId]);
        }

        // Handle nickname, avatar, signature, and birthday updates
        const updates = [];
        const params = [];
        if (nickname) {
            updates.push('nickname = ?');
            params.push(nickname);
        }
        if (avatar) {
            updates.push('avatar = ?');
            params.push(avatar);
        }
        if (signature !== undefined) {
            updates.push('signature = ?');
            params.push(signature);
        }
        if (birthday !== undefined) {
            updates.push('birthday = ?');
            params.push(birthday || null);
        }
        if (updates.length > 0) {
            params.push(userId);
            const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
            await db.promise().query(updateQuery, params);
            
            // Fetch updated user data to broadcast to all devices
            const [updatedUsers] = await db.promise().query(
                'SELECT id, username, nickname, avatar, signature, birthday FROM users WHERE id = ?',
                [userId]
            );
            
            if (updatedUsers.length > 0) {
                const updatedUser = updatedUsers[0];
                // Broadcast profile update to all user's devices
                io.to(userId.toString()).emit('profile_updated', {
                    userId: updatedUser.id,
                    username: updatedUser.username,
                    nickname: updatedUser.nickname,
                    avatar: updatedUser.avatar,
                    signature: updatedUser.signature,
                    birthday: updatedUser.birthday
                });
                
                // Also notify friends to refresh their friend list (for avatar/nickname changes)
                if (nickname || avatar) {
                    notifyFriendsToRefreshList(userId);
                }
            }
        }

        res.json({ message: 'Profile updated successfully.' });
    } catch (error) {
        console.error('Error updating user profile:', error.message);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// Delete user account and all related data
app.delete('/user/delete', authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    try {
        // Use transaction to ensure all deletions succeed or none
        const connection = await db.promise().getConnection();
        await connection.beginTransaction();

        try {
            // Delete all DMs where user is sender or receiver
            await connection.query('DELETE FROM dms WHERE sender_id = ? OR receiver_id = ?', [userId, userId]);

            // Delete all friend relationships where user is involved
            await connection.query('DELETE FROM friends WHERE user_id = ? OR friend_id = ?', [userId, userId]);

            // Delete all messages from user
            await connection.query('DELETE FROM messages WHERE user_id = ?', [userId]);

            // Delete user sessions (should cascade, but delete explicitly to be safe)
            await connection.query('DELETE FROM user_sessions WHERE user_id = ?', [userId]);

            // Delete favorite emojis (should cascade, but delete explicitly to be safe)
            await connection.query('DELETE FROM favorite_emojis WHERE user_id = ?', [userId]);

            // Finally, delete the user (this will cascade delete user_sessions and favorite_emojis if foreign keys are set)
            await connection.query('DELETE FROM users WHERE id = ?', [userId]);

            await connection.commit();
            connection.release();

            res.json({ message: 'Account deleted successfully.' });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Error deleting user account:', error.message);
        res.status(500).json({ error: 'Failed to delete account.' });
    }
});

app.post('/friend/respond', authenticateToken, (req, res) => {
    const { requestId, action } = req.body; // action: "accept" or "reject"
    const userId = req.user.userId;

    if (action === 'accept') {
        // First get the sender's user_id from the request
        const getRequestQuery = 'SELECT user_id FROM friends WHERE id = ? AND friend_id = ?';
        db.query(getRequestQuery, [requestId, userId], (getErr, requestResults) => {
            if (getErr) return res.status(500).json({ error: getErr.message });
            if (requestResults.length === 0) return res.status(404).json({ error: 'Friend request not found' });
            
            const senderId = requestResults[0].user_id;
            
            const acceptQuery = `
                UPDATE friends
                SET status = 'accepted'
                WHERE id = ? AND friend_id = ?
            `;
            db.query(acceptQuery, [requestId, userId], (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                
                // Create reverse friendship record
                const reverseFriendQuery = `
                    INSERT INTO friends (user_id, friend_id, status)
                    VALUES (?, ?, "accepted")
                    ON DUPLICATE KEY UPDATE status = "accepted"
                `;
                db.query(reverseFriendQuery, [userId, senderId], (reverseErr) => {
                    if (reverseErr) return res.status(500).json({ error: reverseErr.message });
                    
                    // Notify both users to update friend lists
                    io.to(userId.toString()).emit('update_friend_list');
                    io.to(senderId.toString()).emit('update_friend_list');
                    
                    // Notify sender that request was accepted
                    io.to(senderId.toString()).emit('friend_request_responded', {
                        receiverId: userId,
                        action: 'accept'
                    });
                    
                    res.json({ message: 'Friend request accepted', senderId: senderId });
                });
            });
        });
    } else if (action === 'reject') {
        // First get the sender's user_id from the request
        const getRequestQuery = 'SELECT user_id FROM friends WHERE id = ? AND friend_id = ?';
        db.query(getRequestQuery, [requestId, userId], (getErr, requestResults) => {
            if (getErr) return res.status(500).json({ error: getErr.message });
            if (requestResults.length === 0) return res.status(404).json({ error: 'Friend request not found' });
            
            const senderId = requestResults[0].user_id;
            
            const rejectQuery = `
                DELETE FROM friends
                WHERE id = ? AND friend_id = ?
            `;
            db.query(rejectQuery, [requestId, userId], (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                
                // Notify sender that request was rejected
                io.to(senderId.toString()).emit('friend_request_responded', {
                    receiverId: userId,
                    action: 'reject'
                });
                
                res.json({ message: 'Friend request rejected', senderId: senderId });
            });
        });
    }
});

app.post('/friend/remove', authenticateToken, (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.userId;

    const deleteFriendQuery = `
        DELETE FROM friends
        WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `;

    const deleteDMQuery = `
        DELETE FROM dms
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `;

    // Get a connection from the pool for transaction
    db.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting database connection:', err.message);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        // Start transaction
        connection.beginTransaction((transactionErr) => {
            if (transactionErr) {
                connection.release();
                console.error('Transaction start error:', transactionErr.message);
                return res.status(500).json({ error: 'Internal server error.' });
            }

            //Delete friend
            connection.query(deleteFriendQuery, [userId, friendId, friendId, userId], (friendErr) => {
                if (friendErr) {
                    return connection.rollback(() => {
                        connection.release();
                        console.error('Error deleting friend:', friendErr.message);
                        return res.status(500).json({ error: 'Failed to remove friend.' });
                    });
                }

                //Delete Chat
                connection.query(deleteDMQuery, [userId, friendId, friendId, userId], (dmErr) => {
                    if (dmErr) {
                        return connection.rollback(() => {
                            connection.release();
                            console.error('Error deleting DMs:', dmErr.message);
                            return res.status(500).json({ error: 'Failed to remove DMs.' });
                        });
                    }

                    connection.commit((commitErr) => {
                        if (commitErr) {
                            return connection.rollback(() => {
                                connection.release();
                                console.error('Transaction commit error:', commitErr.message);
                                return res.status(500).json({ error: 'Failed to complete transaction.' });
                            });
                        }

                        connection.release();
                        res.json({ message: 'Friend and DMs removed successfully.' });
                    });
                });
            });
        });
    });
});

// Direct message routes
app.post('/dm/send', authenticateToken, (req, res) => {
    const { receiverId, text } = req.body;
    const senderId = req.user.userId;

    // Encrypt message before storing
    const encryptedText = text ? encryptMessage(text.trim()) : '';
    
    const sendDMQuery = 'INSERT INTO dms (sender_id, receiver_id, text, timestamp) VALUES (?, ?, ?, UTC_TIMESTAMP())';
    db.query(sendDMQuery, [senderId, receiverId, encryptedText], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'DM sent' });
    });
});

app.get('/dm/:friendId', authenticateToken, (req, res) => {
    const friendId = req.params.friendId;
    const userId = req.user.userId;
    const { limit = 100, before_id = null } = req.query; // Support cursor-based pagination

    let getDMQuery;
    let queryParams;

    if (before_id) {
        // Cursor-based pagination
        getDMQuery = `
            SELECT dms.id, dms.text, dms.image_url AS imageUrl, dms.message_type AS messageType, dms.timestamp,
                   dms.sender_id AS senderId, dms.receiver_id AS receiverId,
                   dms.reply_to_id AS replyToId, dms.reply_to_data AS replyToData,
                   dms.is_emoji AS isEmoji,
                   (dms.sender_id = ?) AS self,
                   reply_msg.text AS replyText, reply_msg.image_url AS replyImageUrl, reply_msg.sender_id AS replySenderId
            FROM dms
            LEFT JOIN dms AS reply_msg ON dms.reply_to_id = reply_msg.id
            WHERE ((dms.sender_id = ? AND dms.receiver_id = ?)
               OR (dms.sender_id = ? AND dms.receiver_id = ?))
               AND dms.id < ?
            ORDER BY dms.timestamp DESC
            LIMIT ?
        `;
        queryParams = [userId, userId, friendId, friendId, userId, parseInt(before_id), parseInt(limit)];
    } else {
        // Get latest messages
        getDMQuery = `
            SELECT dms.id, dms.text, dms.image_url AS imageUrl, dms.message_type AS messageType, dms.timestamp,
                   dms.sender_id AS senderId, dms.receiver_id AS receiverId,
                   dms.reply_to_id AS replyToId, dms.reply_to_data AS replyToData,
                   dms.is_emoji AS isEmoji,
                   (dms.sender_id = ?) AS self,
                   reply_msg.text AS replyText, reply_msg.image_url AS replyImageUrl, reply_msg.sender_id AS replySenderId
            FROM dms
            LEFT JOIN dms AS reply_msg ON dms.reply_to_id = reply_msg.id
            WHERE (dms.sender_id = ? AND dms.receiver_id = ?)
               OR (dms.sender_id = ? AND dms.receiver_id = ?)
            ORDER BY dms.timestamp DESC
            LIMIT ?
        `;
        queryParams = [userId, userId, friendId, friendId, userId, parseInt(limit)];
    }

    db.query(getDMQuery, queryParams, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Decrypt messages before sending to client
        const decryptedResults = results.map(msg => {
            const result = {
                ...msg,
                text: msg.text ? decryptMessage(msg.text) : null,
                isEmoji: msg.isEmoji ? true : false // Convert TINYINT(1) to boolean
            };
            
            // Handle replyTo
            if (msg.replyToId && msg.replyText !== null) {
                result.replyTo = {
                    id: msg.replyToId,
                    text: msg.replyText ? decryptMessage(msg.replyText) : null,
                    imageUrl: msg.replyImageUrl,
                    senderId: msg.replySenderId
                };
            } else if (msg.replyToData) {
                try {
                    result.replyTo = JSON.parse(msg.replyToData);
                } catch (e) {
                    result.replyTo = null;
                }
            }
            
            return result;
        });

        // Reverse order if using cursor pagination (to show oldest first)
        const finalResults = before_id ? decryptedResults.reverse() : decryptedResults.reverse();
        
        res.json(finalResults);
    });
});

app.get('/protected-resource', authenticateToken, (req, res) => {
    if (!req.user || req.user.role !== 'admin') { //This role for future use! Currently, no role for users yet!
        return res.status(403).json({ error: 'Access forbidden: insufficient permissions' });
    }
    res.json({ message: 'Welcome, admin!' });
});

// User search routes - Search by Momo Code only
app.get('/users/search', authenticateToken, (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query parameter is required.' });

    // Remove spaces and dashes from input for flexible search
    const cleanQuery = query.replace(/[\s-]/g, '');
    
    // Format with dashes for database search
    let formattedQuery;
    if (cleanQuery.length === 12) {
        formattedQuery = `${cleanQuery.substring(0, 4)}-${cleanQuery.substring(4, 8)}-${cleanQuery.substring(8, 12)}`;
    } else {
        // If not exactly 12 digits, try partial search with dashes
        formattedQuery = query.replace(/\s+/g, ''); // Just remove spaces
    }

    const searchQuery = 'SELECT id, username, nickname, momo_code FROM users WHERE momo_code = ?';
    db.query(searchQuery, [formattedQuery], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.delete('/dm/message/:messageId', authenticateToken, (req, res) => {
    const messageId = req.params.messageId;
    const userId = req.user.userId;

    const deleteMessageQuery = 'DELETE FROM dms WHERE id = ? AND sender_id = ?';
    db.query(deleteMessageQuery, [messageId, userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Message not found or you are not the sender.' });
        }
        res.json({ message: 'Message deleted successfully.' });
    });
});

app.post('/dm/delete', authenticateToken, (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.userId;

    const deleteDMQuery = 'DELETE FROM dms WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)';
    db.query(deleteDMQuery, [userId, friendId, friendId, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'DM history deleted' });
    });
});

// Emoji favorites routes
app.post('/emojis/favorite', authenticateToken, (req, res) => {
    const { imageUrl } = req.body;
    const userId = req.user.userId;

    if (!imageUrl) {
        return res.status(400).json({ error: 'Image URL is required' });
    }

    // Check if already exists
    const checkQuery = 'SELECT id FROM favorite_emojis WHERE user_id = ? AND image_url = ?';
    db.query(checkQuery, [userId, imageUrl], (err, results) => {
        if (err) {
            console.error('Error checking emoji:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length > 0) {
            return res.status(409).json({ error: 'Emoji already in favorites' });
        }

        // Insert new favorite
        const insertQuery = 'INSERT INTO favorite_emojis (user_id, image_url) VALUES (?, ?)';
        db.query(insertQuery, [userId, imageUrl], (insertErr) => {
            if (insertErr) {
                console.error('Error saving emoji:', insertErr.message);
                return res.status(500).json({ error: 'Failed to save emoji' });
            }
            res.json({ message: 'Emoji added to favorites' });
        });
    });
});

app.get('/emojis/favorites', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    const query = 'SELECT id, image_url, created_at FROM favorite_emojis WHERE user_id = ? ORDER BY created_at DESC';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching favorite emojis:', err.message);
            return res.status(500).json({ error: 'Failed to fetch favorites' });
        }
        res.json(results);
    });
});

app.delete('/emojis/favorite/:id', authenticateToken, (req, res) => {
    const emojiId = req.params.id;
    const userId = req.user.userId;

    const deleteQuery = 'DELETE FROM favorite_emojis WHERE id = ? AND user_id = ?';
    db.query(deleteQuery, [emojiId, userId], (err, results) => {
        if (err) {
            console.error('Error deleting emoji:', err.message);
            return res.status(500).json({ error: 'Failed to delete emoji' });
        }
        
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Emoji not found' });
        }

        res.json({ message: 'Emoji removed from favorites' });
    });
});

// Group Messages routes queries
app.post('/groups/create', authenticateToken, (req, res) => {
    const { name } = req.body;
    const userId = req.user.userId;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Group name is required' });
    }

    const createGroupQuery = 'INSERT INTO groups (name, created_by) VALUES (?, ?)';
    db.query(createGroupQuery, [name.trim(), userId], (err, result) => {
        if (err) {
            console.error('Error creating group:', err.message);
            return res.status(500).json({ error: 'Failed to create group' });
        }

        const groupId = result.insertId;
        // Add creator as member
        const addMemberQuery = 'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)';
        db.query(addMemberQuery, [groupId, userId], (memberErr) => {
            if (memberErr) {
                console.error('Error adding creator to group:', memberErr.message);
                return res.status(500).json({ error: 'Failed to add creator to group' });
            }

            res.json({ message: 'Group created successfully', groupId });
        });
    });
});

app.post('/groups/join', authenticateToken, (req, res) => {
    const { groupId } = req.body;
    const userId = req.user.userId;

    if (!groupId) {
        return res.status(400).json({ error: 'Group ID is required' });
    }

    // Check if group exists
    const checkGroupQuery = 'SELECT id FROM groups WHERE id = ?';
    db.query(checkGroupQuery, [groupId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if already a member
        const checkMemberQuery = 'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?';
        db.query(checkMemberQuery, [groupId, userId], (checkErr, checkResults) => {
            if (checkErr) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (checkResults.length > 0) {
                return res.status(400).json({ error: 'Already a member of this group' });
            }

            // Add member
            const addMemberQuery = 'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)';
            db.query(addMemberQuery, [groupId, userId], (addErr) => {
                if (addErr) {
                    return res.status(500).json({ error: 'Failed to join group' });
                }
                res.json({ message: 'Joined group successfully' });
            });
        });
    });
});

app.get('/groups', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    const groupsQuery = `
        SELECT g.id, g.name, g.avatar, g.created_by,
               (SELECT gm.text
                FROM group_messages gm
                WHERE gm.group_id = g.id
                ORDER BY gm.timestamp DESC LIMIT 1) AS lastMessage,
               (SELECT gm.timestamp
                FROM group_messages gm
                WHERE gm.group_id = g.id
                ORDER BY gm.timestamp DESC LIMIT 1) AS lastMessageTime,
               (SELECT gm.image_url
                FROM group_messages gm
                WHERE gm.group_id = g.id
                ORDER BY gm.timestamp DESC LIMIT 1) AS imageUrl
        FROM groups g
        INNER JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = ?
        ORDER BY lastMessageTime DESC, g.created_at DESC
    `;

    db.query(groupsQuery, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching groups:', err.message);
            return res.status(500).json({ error: 'Failed to fetch groups' });
        }

        const groupsWithDecrypted = results.map(group => ({
            ...group,
            lastMessage: group.lastMessage ? decryptMessage(group.lastMessage) : null
        }));

        res.json(groupsWithDecrypted);
    });
});

app.get('/groups/:groupId/messages', authenticateToken, (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.userId;
    const { limit = 100, before_id = null } = req.query;

    // Check if user is a member
    const checkMemberQuery = 'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?';
    db.query(checkMemberQuery, [groupId, userId], (checkErr, checkResults) => {
        if (checkErr) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (checkResults.length === 0) {
            return res.status(403).json({ error: 'Not a member of this group' });
        }

        let getMessagesQuery;
        let queryParams;

        if (before_id) {
            getMessagesQuery = `
                SELECT gm.id, gm.text, gm.image_url AS imageUrl, gm.message_type AS messageType, gm.timestamp,
                       gm.sender_id AS senderId, gm.group_id AS groupId,
                       gm.reply_to_id AS replyToId, gm.reply_to_data AS replyToData,
                       gm.is_emoji AS isEmoji,
                       (gm.sender_id = ?) AS self,
                       u.nickname, u.avatar,
                       reply_msg.text AS replyText, reply_msg.image_url AS replyImageUrl, reply_msg.sender_id AS replySenderId
                FROM group_messages gm
                LEFT JOIN users u ON gm.sender_id = u.id
                LEFT JOIN group_messages AS reply_msg ON gm.reply_to_id = reply_msg.id
                WHERE gm.group_id = ? AND gm.id < ?
                ORDER BY gm.timestamp DESC
                LIMIT ?
            `;
            queryParams = [userId, groupId, parseInt(before_id), parseInt(limit)];
        } else {
            getMessagesQuery = `
                SELECT gm.id, gm.text, gm.image_url AS imageUrl, gm.message_type AS messageType, gm.timestamp,
                       gm.sender_id AS senderId, gm.group_id AS groupId,
                       gm.reply_to_id AS replyToId, gm.reply_to_data AS replyToData,
                       gm.is_emoji AS isEmoji,
                       (gm.sender_id = ?) AS self,
                       u.nickname, u.avatar,
                       reply_msg.text AS replyText, reply_msg.image_url AS replyImageUrl, reply_msg.sender_id AS replySenderId
                FROM group_messages gm
                LEFT JOIN users u ON gm.sender_id = u.id
                LEFT JOIN group_messages AS reply_msg ON gm.reply_to_id = reply_msg.id
                WHERE gm.group_id = ?
                ORDER BY gm.timestamp DESC
                LIMIT ?
            `;
            queryParams = [userId, groupId, parseInt(limit)];
        }

        db.query(getMessagesQuery, queryParams, (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const decryptedResults = results.map(msg => {
                const result = {
                    ...msg,
                    text: msg.text ? decryptMessage(msg.text) : null,
                    isEmoji: msg.isEmoji ? true : false
                };

                if (msg.replyToId && msg.replyText !== null) {
                    result.replyTo = {
                        id: msg.replyToId,
                        text: msg.replyText ? decryptMessage(msg.replyText) : null,
                        imageUrl: msg.replyImageUrl,
                        senderId: msg.replySenderId
                    };
                } else if (msg.replyToData) {
                    try {
                        result.replyTo = JSON.parse(msg.replyToData);
                    } catch (e) {
                        result.replyTo = null;
                    }
                }

                return result;
            });

            const finalResults = before_id ? decryptedResults.reverse() : decryptedResults.reverse();
            res.json(finalResults);
        });
    });
});

// Utility functions
const cleanExpiredRequests = () => {
    const deleteQuery = `
        DELETE FROM friends
        WHERE status = 'pending' AND TIMESTAMPDIFF(DAY, created_at, UTC_TIMESTAMP()) > 30
    `;

    db.query(deleteQuery, (err, results) => {
        if (err) {
            console.error('Error cleaning expired friend requests:', err.message);
        } else {
            console.log(`Cleaned ${results.affectedRows} expired friend requests`);
        }
    });
};

// Serve React app for all other routes (only in production when build exists)
// This catch-all route should be last, after all API routes
const buildPath = path.join(__dirname, 'build');
const indexPath = path.join(buildPath, 'index.html');

// Check if build directory and index.html exist
try {
    if (fs.existsSync(buildPath) && fs.existsSync(indexPath)) {
        // Only register catch-all route if build files exist (production mode)
        app.get('*', (req, res) => {
            // Skip API routes that should return 404
            if (req.path.startsWith('/api') || 
                req.path.startsWith('/uploads') || 
                req.path.startsWith('/socket.io')) {
                return res.status(404).json({ error: 'Not found' });
            }
            
            // Double check file still exists before sending
            if (fs.existsSync(indexPath)) {
                res.sendFile(indexPath);
            } else {
                res.status(404).end();
            }
        });
    }
} catch (error) {
    // Silently ignore if build directory doesn't exist (development mode)
    // React dev server will handle routing in development
}

// Server startup
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Initializing cleanup for expired friend requests...');
    
    // Initial cleanup and setup recurring cleanup
    cleanExpiredRequests();
    setInterval(cleanExpiredRequests, 24 * 60 * 60 * 1000); // Run daily
});