const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');

// Get requests with filters
router.get('/', (req, res) => {
    const { farmerId, vendorId } = req.query;
    let query = `SELECT * FROM requests`;
    let params = [];

    if (farmerId) {
        query += ` WHERE farmerId = ?`;
        params.push(farmerId);
    } else if (vendorId) {
        query += ` WHERE vendorId = ?`;
        params.push(vendorId);
    }

    query += ` ORDER BY timestamp DESC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows || []);
    });
});

// Create request
router.post('/', authenticate, authorize('vendor'), validateRequest, (req, res) => {
    const { productId, farmerId, vendorId, quantity, notes } = req.body;

    const id = uuidv4();
    const timestamp = Date.now();
    const status = 'pending';

    db.run(
        `INSERT INTO requests (id, productId, farmerId, vendorId, quantity, notes, status, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, productId, farmerId, vendorId, quantity, notes, status, timestamp],
        function(err) {
            if (err) return res.status(500).json({ error: 'Failed to create request' });
            req.app.get('io').emit('request.created', { id, productId, farmerId, vendorId, quantity, notes, status, timestamp });
            res.status(201).json({ id, productId, farmerId, vendorId, quantity, notes, status, timestamp });
        }
    );
});

// Update request status
router.patch('/:id', authenticate, authorize('farmer', 'vendor'), (req, res) => {
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Status required' });
    }

    db.run(
        `UPDATE requests SET status = ? WHERE id = ?`,
        [status, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Failed to update request' });
            if (this.changes === 0) return res.status(404).json({ error: 'Request not found' });
            req.app.get('io').emit('request.updated', { id: req.params.id, status });
            res.json({ id: req.params.id, status });
        }
    );
});

module.exports = router;
