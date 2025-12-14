const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { validateUserRegistration } = require('../middleware/validate');

// Register
router.post('/register', validateUserRegistration, async (req, res) => {
    const { type, name, email, password, phone, location, farmName, businessName } = req.body;

    const id = uuidv4();
    const createdAt = Date.now();
    const hashed = await bcrypt.hash(password, 10);

    db.run(
        `INSERT INTO users (id, type, name, email, password, phone, location, farmName, businessName, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, type, name, email, hashed, phone, location, farmName, businessName, createdAt],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed') || err.message.includes('Duplicate entry')) {
                    return res.status(400).json({ error: 'Email already registered' });
                }
                return res.status(500).json({ error: 'Registration failed' });
            }
            // Generate JWT token
            const token = jwt.sign({ id, type, name }, JWT_SECRET, { expiresIn: '7d' });
            res.status(201).json({ id, type, name, email, phone, location, farmName, businessName, token });
        }
    );
});

// Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    db.get(
        `SELECT * FROM users WHERE email = ?`,
        [email],
        async (err, row) => {
            if (err) return res.status(500).json({ error: 'Login failed' });
            if (!row) return res.status(401).json({ error: 'Invalid credentials' });

            const ok = await bcrypt.compare(password, row.password);
            if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

            const token = jwt.sign({ id: row.id, type: row.type, name: row.name }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ id: row.id, type: row.type, name: row.name, email: row.email, phone: row.phone, location: row.location, farmName: row.farmName, businessName: row.businessName, token });
        }
    );
});

// Get user by ID
router.get('/:id', (req, res) => {
    db.get(
        `SELECT * FROM users WHERE id = ?`,
        [req.params.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!row) return res.status(404).json({ error: 'User not found' });

            res.json(row);
        }
    );
});

// Get all users
router.get('/', (req, res) => {
    db.all(
        `SELECT * FROM users`,
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(rows || []);
        }
    );
});

module.exports = router;
