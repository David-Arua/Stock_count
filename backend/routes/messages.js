const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { validateMessage } = require('../middleware/validate');

// Get messages between two users
router.get('/', (req, res) => {
    const { userId1, userId2 } = req.query;

    if (!userId1 || !userId2) {
        return res.status(400).json({ error: 'Both userIds required' });
    }

    db.all(
        `SELECT * FROM messages 
         WHERE (senderId = ? AND recipientId = ?) 
            OR (senderId = ? AND recipientId = ?)
         ORDER BY timestamp ASC`,
        [userId1, userId2, userId2, userId1],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(rows || []);
        }
    );
});

// Get conversations (unique contacts)
router.get('/conversations/:userId', (req, res) => {
    db.all(
        `SELECT DISTINCT 
            CASE 
                WHEN senderId = ? THEN recipientId 
                ELSE senderId 
            END as contactId
         FROM messages
         WHERE senderId = ? OR recipientId = ?`,
        [req.params.userId, req.params.userId, req.params.userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(rows || []);
        }
    );
});

// Send message
router.post('/', authenticate, validateMessage, (req, res) => {
    const { senderId, recipientId, text } = req.body;

    const id = uuidv4();
    const timestamp = Date.now();

    db.run(
        `INSERT INTO messages (id, senderId, recipientId, text, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [id, senderId, recipientId, text, timestamp],
        function(err) {
            if (err) return res.status(500).json({ error: 'Failed to send message' });
            req.app.get('io').emit('message.sent', { id, senderId, recipientId, text, timestamp });
            res.status(201).json({ id, senderId, recipientId, text, timestamp });
        }
    );
});

module.exports = router;
