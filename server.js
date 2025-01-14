require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

// Init Express
const app = express();
const PORT = 5000;
const SECRET_KEY = process.env.SECRET_KEY;
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
const HOST_DOMAIN = process.env.HOST_DOMAIN;

app.use(
    cors({
        origin: HOST_DOMAIN,
        methods: ["GET", "POST"],
        credentials: true,
    })
);

app.use(bodyParser.json());

const db = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the database');
        connection.release();
    }
});

// Socket.io Instance
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: HOST_DOMAIN,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (userId) => {
        if (userId) {
            socket.join(userId.toString());
            console.log(`User ${userId} joined room`);
        }
    });

    socket.on('leave_room', (userId) => {
        if (userId) {
            socket.leave(userId.toString());
            console.log(`User ${userId} left room`);
        }
    });

    socket.on('send_message', (data) => {
        const { senderId, receiverId, text } = data;

        if (!senderId || !receiverId || !text) {
            console.error('Invalid message payload:', data);
            return;
        }

        const query = 'INSERT INTO dms (sender_id, receiver_id, text, timestamp) VALUES (?, ?, ?, UTC_TIMESTAMP());';
        db.query(query, [senderId, receiverId, text], (err) => {
            if (!err) {
                const userQuery = 'SELECT nickname, avatar FROM users WHERE id = ?';
                db.query(userQuery, [senderId], (userErr, userResults) => {
                    if (!userErr && userResults.length > 0) {
                        const { nickname, avatar } = userResults[0];

                        io.to(receiverId.toString()).emit('receive_message', {
                            senderId,
                            receiverId,
                            text,
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



    // Listen to Friend Request
    socket.on('send_friend_request', ({ senderId, receiverId, senderUsername }) => {
        console.log(`Friend request sent from ${senderId} to ${receiverId}`);
        io.to(receiverId.toString()).emit('receive_friend_request', {
            senderId,
            senderUsername,
        });
    });

    // Listen for response of the friend requests
    socket.on('respond_friend_request', ({ senderId, receiverId, action }) => {
        console.log(`Friend request ${action} by ${receiverId}`);
        io.to(senderId.toString()).emit('friend_request_responded', { receiverId, action });
        if (action === 'accept') {
            io.to(senderId.toString()).emit('update_friend_list');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        socket.removeAllListeners();
    });
});

app.get('/api', (req, res) => {
    res.json({ message: 'Hello from momotalk api!' });
});

// ROUTERS
app.post('/register', async (req, res) => {
    const { username, email, password, nickname } = req.body;

    if (!username || !email || !password || !nickname) {
        return res.status(400).json({ error: 'Username, email, password, and nickname are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (username, email, password, nickname) VALUES (?, ?, ?, ?)';
        db.query(query, [username, email, hashedPassword, nickname], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Username or email already exists.' });
                }
                return res.status(500).json({ error: 'Database error.' });
            }
            res.json({ message: 'User registered successfully.' });
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
                ORDER BY d.timestamp DESC LIMIT 1) AS lastMessageTime
        FROM users u
                 JOIN friends f ON
            ((f.user_id = ? AND f.friend_id = u.id) OR (f.friend_id = ? AND f.user_id = u.id))
                AND f.status = 'accepted';
    `;

    db.query(friendsQuery, [userId, userId, userId, userId, userId, userId], (err, results) => {
        if (err) {
            // console.error('Error executing friends query:', err.message); // For DEBUG
            return res.status(500).json({ error: 'Failed to fetch friends' });
        }
        res.json(results);
    });
});

app.post('/friend/add', authenticateToken, (req, res) => {
    const { friendUsername } = req.body;
    const userId = req.user.userId;

    if (!friendUsername) {
        return res.status(400).json({ error: 'Friend username is required.' });
    }

    // No add myself
    const getUserQuery = 'SELECT id FROM users WHERE username = ?';
    db.query(getUserQuery, [friendUsername], (err, results) => {
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
        SELECT dms.id, dms.text, dms.timestamp,
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

app.get('/users/search', authenticateToken, (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query parameter is required.' });

    const searchQuery = 'SELECT id, username, nickname FROM users WHERE username LIKE ?';
    db.query(searchQuery, [`%${query}%`], (err, results) => {
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

//Clean Friend Request!
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

setInterval(cleanExpiredRequests, 24 * 60 * 60 * 1000);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

    console.log('Initializing cleanup for expired friend requests...');
    cleanExpiredRequests();
});

setInterval(cleanExpiredRequests, 24 * 60 * 60 * 1000);