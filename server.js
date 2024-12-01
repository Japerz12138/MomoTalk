const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

require('dotenv').config();

const app = express();
const PORT = 5000;
const SECRET_KEY = process.env.SECRET_KEY;
const SERVER_DB_PW = process.env.SERVER_DB_PW;

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: SERVER_DB_PW,
    database: 'momotalk_v2',
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

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

        const token = jwt.sign({ userId: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    });
});

function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}


// Messages - POST
app.post('/messages', authenticateToken, (req, res) => {
    const { text } = req.body;
    const query = 'INSERT INTO messages (user_id, text, timestamp) VALUES (?, ?, NOW())';

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
                ORDER BY d.timestamp DESC LIMIT 1) AS lastMessage
        FROM users u
                 JOIN friends f ON
            ((f.user_id = ? AND f.friend_id = u.id) OR (f.friend_id = ? AND f.user_id = u.id))
                AND f.status = 'accepted'
    `;

    db.query(friendsQuery, [userId, userId, userId, userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/friend/add', authenticateToken, (req, res) => {
    const { friendUsername } = req.body;
    const userId = req.user.userId;

    const getFriendQuery = 'SELECT id FROM users WHERE username = ?';
    db.query(getFriendQuery, [friendUsername], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'User not found' });

        const friendId = results[0].id;

        const checkFriendshipQuery = 'SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)';
        db.query(checkFriendshipQuery, [userId, friendId, friendId, userId], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length > 0) return res.status(400).json({ error: 'Friendship already exists' });

            const addFriendQuery = 'INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, "pending")';
            db.query(addFriendQuery, [userId, friendId], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Friend request sent' });
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

            // 插入反向关系
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

app.post('/friend/respond', authenticateToken, (req, res) => {
    const { requestId, action } = req.body; // action: "accept" or "reject"
    const userId = req.user.userId;

    if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
    }

    if (action === 'accept') {
        const acceptQuery = `
            UPDATE friends
            SET status = 'accepted'
            WHERE id = ? AND friend_id = ?
        `;
        db.query(acceptQuery, [requestId, userId], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Friend request not found or unauthorized' });
            }
            res.json({ message: 'Friend request accepted' });
        });
    } else if (action === 'reject') {
        const rejectQuery = `
            DELETE FROM friends
            WHERE id = ? AND friend_id = ?
        `;
        db.query(rejectQuery, [requestId, userId], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Friend request not found or unauthorized' });
            }
            res.json({ message: 'Friend request rejected' });
        });
    }
});

app.post('/friend/remove', authenticateToken, (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.userId;

    const deleteFriendQuery = 'DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)';
    db.query(deleteFriendQuery, [userId, friendId, friendId, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Friend removed' });
    });
});

app.post('/dm/send', authenticateToken, (req, res) => {
    const { receiverId, text } = req.body;
    const senderId = req.user.userId;

    const sendDMQuery = 'INSERT INTO dms (sender_id, receiver_id, text, timestamp) VALUES (?, ?, ?, NOW())';
    db.query(sendDMQuery, [senderId, receiverId, text], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'DM sent' });
    });
});

app.get('/dm/:friendId', authenticateToken, (req, res) => {
    const friendId = req.params.friendId;
    const userId = req.user.userId;

    const getDMQuery = `
        SELECT dms.id, dms.text, dms.timestamp, users.nickname AS username
        FROM dms
        JOIN users ON dms.sender_id = users.id
        WHERE (dms.sender_id = ? AND dms.receiver_id = ?) OR (dms.sender_id = ? AND dms.receiver_id = ?)
        ORDER BY dms.timestamp ASC
    `;

    db.query(getDMQuery, [userId, friendId, friendId, userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
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
        WHERE status = 'pending' AND TIMESTAMPDIFF(DAY, created_at, NOW()) > 30
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

    console.log('Initializing cleanup for expired friend requests...');
    cleanExpiredRequests();
});

setInterval(cleanExpiredRequests, 24 * 60 * 60 * 1000);