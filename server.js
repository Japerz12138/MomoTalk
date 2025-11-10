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
    reconnect: true
};

if (!DB_CONFIG.user || !DB_CONFIG.password || !DB_CONFIG.database) {
    console.error('Database configuration is incomplete. Please check your environment variables.');
    process.exit(1);
}

const app = express();
const onlineUsers = new Map();

// Middleware configuration
app.use(cors({
    origin: HOST_DOMAIN,
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'build')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
            onlineUsers.set(userId, socket.id); //Set socket to a user
            socket.join(userId.toString());
            console.log(`User ${userId} joined room`);

            //Broadcast user online
            notifyFriends(userId, true);
        }
    });

    // Request online status for all friends
    socket.on('request_friends_status', (friendIds) => {
        if (!Array.isArray(friendIds)) return;
        
        const statusUpdates = friendIds.map(friendId => ({
            friendId: friendId,
            isOnline: onlineUsers.has(friendId)
        }));
        
        socket.emit('friends_status_response', statusUpdates);
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

    socket.on('send_message', (data) => {
        const { senderId, receiverId, text, imageUrl } = data;

        if (!senderId || !receiverId || (!text && !imageUrl)) {
            console.error('Invalid message payload:', data);
            return;
        }

        // Determine message type
        let messageType = 'text';
        if (text && imageUrl) {
            messageType = 'both';
        } else if (imageUrl) {
            messageType = 'image';
        }

        const query = 'INSERT INTO dms (sender_id, receiver_id, text, image_url, message_type, timestamp) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP());';
        db.query(query, [senderId, receiverId, text || null, imageUrl || null, messageType], (err) => {
            if (!err) {
                const userQuery = 'SELECT nickname, avatar FROM users WHERE id = ?';
                db.query(userQuery, [senderId], (userErr, userResults) => {
                    if (!userErr && userResults.length > 0) {
                        const { nickname, avatar } = userResults[0];

                        io.to(receiverId.toString()).emit('receive_message', {
                            senderId,
                            receiverId,
                            text,
                            imageUrl,
                            messageType,
                            timestamp: new Date().toISOString(), //TO UTC TIME
                            nickname,
                            avatar,
                        });
                    } else {
                        console.error('Error fetching sender info:', userErr ? userErr.message : 'No user found');
                    }
                });
            } else {
                console.error('Error saving message:', err.message);
            }
        });
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

        // Generate new session_token
        const sessionToken = crypto.randomBytes(32).toString('hex');

        const updateQuery = 'UPDATE users SET session_token = ? WHERE id = ?';
        db.query(updateQuery, [sessionToken, user.id], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to update session token' });

            const token = jwt.sign({ userId: user.id, username: user.username, sessionToken }, SECRET_KEY, { expiresIn: '3h' });

            res.json({
                token,
                userId: user.id,
                username: user.username,
                nickname: user.nickname,
                avatar: user.avatar || null,
                email: user.email,
                momoCode: user.momo_code || null,
            });
        });
    });
});

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            console.error('JWT Verification Error:', err.message);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const { userId, sessionToken } = decoded;

        // Auth if session_token matches to prevent same user login multiple times
        const query = 'SELECT session_token FROM users WHERE id = ?';
        db.query(query, [userId], (err, results) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (results.length === 0 || results[0].session_token !== sessionToken) {
                return res.status(401).json({ error: 'Invalid session token' });
            }

            req.user = { userId };
            next();
        });
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

        console.log(`Notifying friends of user ${userId} (${isOnline ? 'online' : 'offline'})`);
        friends.forEach((friend) => {
            io.to(friend.id.toString()).emit('friend_status_update', {
                friendId: userId,
                isOnline
            });
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
        SELECT u.id, u.username, u.nickname, u.avatar,
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
                ORDER BY d.timestamp DESC LIMIT 1) AS imageUrl
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
            isOnline: onlineUsers.has(friend.id)
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
            const fileExtension = 'jpg';
            const filename = `avatar_${userId}_${Date.now()}.${fileExtension}`;
            const filepath = path.join(__dirname, 'uploads', 'avatars', filename);

            // Process image with sharp: resize and optimize
            await sharp(req.file.buffer)
                .resize(400, 400, { fit: 'cover' })
                .jpeg({ quality: 85 })
                .toFile(filepath);

            // Generate full URL path
            const serverDomain = process.env.SERVER_URL || `http://localhost:${PORT}`;
            avatarUrl = `${serverDomain}/uploads/avatars/${filename}`;
            
            // Store MD5 and URL in database
            await db.promise().query(
                'INSERT INTO uploaded_images (md5_hash, file_url, file_type, file_size) VALUES (?, ?, "avatar", ?)',
                [md5Hash, avatarUrl, req.file.size]
            );
            
            console.log(`New avatar uploaded with MD5: ${md5Hash}`);
        }

        // Update user's avatar in database
        const updateQuery = 'UPDATE users SET avatar = ? WHERE id = ?';
        await db.promise().query(updateQuery, [avatarUrl, userId]);

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
            const fileExtension = 'jpg';
            const filename = `chat_${userId}_${Date.now()}.${fileExtension}`;
            const filepath = path.join(__dirname, 'uploads', 'chat-images', filename);

            // Process image with sharp: resize if too large and optimize
            const image = sharp(req.file.buffer);
            const metadata = await image.metadata();

            // Resize if width > 1200px
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

            // Generate full URL path
            const serverDomain = process.env.SERVER_URL || `http://localhost:${PORT}`;
            imageUrl = `${serverDomain}/uploads/chat-images/${filename}`;
            
            // Store MD5 and URL in database
            await db.promise().query(
                'INSERT INTO uploaded_images (md5_hash, file_url, file_type, file_size) VALUES (?, ?, "chat", ?)',
                [md5Hash, imageUrl, req.file.size]
            );
            
            console.log(`New chat image uploaded with MD5: ${md5Hash}`);
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
    const { nickname, avatar, oldPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Validate request
    if (!nickname && !avatar && (!oldPassword || !newPassword)) {
        return res.status(400).json({ error: 'No updates provided.' });
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

        // Handle nickname and avatar updates
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
        if (updates.length > 0) {
            params.push(userId);
            const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
            await db.promise().query(updateQuery, params);
        }

        res.json({ message: 'Profile updated successfully.' });
    } catch (error) {
        console.error('Error updating user profile:', error.message);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

app.post('/friend/respond', authenticateToken, (req, res) => {
    const { requestId, action } = req.body; // action: "accept" or "reject"
    const userId = req.user.userId;

    if (action === 'accept') {
        const acceptQuery = `
            UPDATE friends
            SET status = 'accepted'
            WHERE id = ? AND friend_id = ?
        `;
        db.query(acceptQuery, [requestId, userId], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Friend request accepted', senderId: requestId });
        });
    } else if (action === 'reject') {
        const rejectQuery = `
            DELETE FROM friends
            WHERE id = ? AND friend_id = ?
        `;
        db.query(rejectQuery, [requestId, userId], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Friend request rejected', senderId: requestId });
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

    // Friend Deletion Sequence
    db.beginTransaction((transactionErr) => {
        if (transactionErr) {
            console.error('Transaction start error:', transactionErr.message);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        //Delete friend
        db.query(deleteFriendQuery, [userId, friendId, friendId, userId], (friendErr) => {
            if (friendErr) {
                return db.rollback(() => {
                    console.error('Error deleting friend:', friendErr.message);
                    return res.status(500).json({ error: 'Failed to remove friend.' });
                });
            }

            //Delete Chat
            db.query(deleteDMQuery, [userId, friendId, friendId, userId], (dmErr) => {
                if (dmErr) {
                    return db.rollback(() => {
                        console.error('Error deleting DMs:', dmErr.message);
                        return res.status(500).json({ error: 'Failed to remove DMs.' });
                    });
                }

                db.commit((commitErr) => {
                    if (commitErr) {
                        return db.rollback(() => {
                            console.error('Transaction commit error:', commitErr.message);
                            return res.status(500).json({ error: 'Failed to complete transaction.' });
                        });
                    }

                    res.json({ message: 'Friend and DMs removed successfully.' });
                });
            });
        });
    });
});

// Direct message routes
app.post('/dm/send', authenticateToken, (req, res) => {
    const { receiverId, text } = req.body;
    const senderId = req.user.userId;

    const sendDMQuery = 'INSERT INTO dms (sender_id, receiver_id, text, timestamp) VALUES (?, ?, ?, UTC_TIMESTAMP())';
    db.query(sendDMQuery, [senderId, receiverId, text], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'DM sent' });
    });
});

app.get('/dm/:friendId', authenticateToken, (req, res) => {
    const friendId = req.params.friendId;
    const userId = req.user.userId;

    const getDMQuery = `
        SELECT dms.id, dms.text, dms.image_url AS imageUrl, dms.message_type AS messageType, dms.timestamp,
               dms.sender_id AS senderId, dms.receiver_id AS receiverId,
               (dms.sender_id = ?) AS self -- Calculate for self directly so front-end don't have to do it
        FROM dms
        WHERE (dms.sender_id = ? AND dms.receiver_id = ?)
           OR (dms.sender_id = ? AND dms.receiver_id = ?)
        ORDER BY dms.timestamp ASC
    `;

    db.query(getDMQuery, [userId, userId, friendId, friendId, userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
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

// Serve React app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Server startup
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Initializing cleanup for expired friend requests...');
    
    // Initial cleanup and setup recurring cleanup
    cleanExpiredRequests();
    setInterval(cleanExpiredRequests, 24 * 60 * 60 * 1000); // Run daily
});