const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize } = require('../middleware/auth');
const { validateProduct } = require('../middleware/validate');
const upload = require('../middleware/upload');

// Get all products with optional filters
router.get('/', (req, res) => {
    const { farmerId, search, page = 1, limit = 20, sort = 'timestamp', order = 'DESC' } = req.query;
    let base = `SELECT * FROM products`;
    let where = '';
    let params = [];

    if (farmerId) {
        where += ` WHERE farmerId = ?`;
        params.push(farmerId);
    }

    if (search) {
        const searchTerm = `%${search}%`;
        where += farmerId ? ` AND` : ` WHERE`;
        where += ` (name LIKE ? OR description LIKE ?)`;
        params.push(searchTerm, searchTerm);
    }

    const validSort = ['timestamp', 'price', 'name', 'quantity'];
    const sortCol = validSort.includes(String(sort).toLowerCase()) ? sort : 'timestamp';
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const offset = (Number(page) - 1) * Number(limit);

    const query = `${base}${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`;
    db.all(query, [...params, Number(limit), Number(offset)], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        // total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM products${where}`;
        db.get(countQuery, params, (cerr, crow) => {
            if (cerr) return res.status(500).json({ error: 'Database error' });
            res.json({ items: rows || [], page: Number(page), limit: Number(limit), total: crow?.total || 0 });
        });
    });
});

// Get single product
router.get('/:id', (req, res) => {
    db.get(
        `SELECT * FROM products WHERE id = ?`,
        [req.params.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!row) return res.status(404).json({ error: 'Product not found' });
            res.json(row);
        }
    );
});

// Add product with file upload
router.post('/upload', authenticate, authorize('farmer'), upload.single('image'), validateProduct, (req, res) => {
    const { farmerId, name, category, quantity, unit, price, location, description } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const id = uuidv4();
    const timestamp = Date.now();

    db.run(
        `INSERT INTO products (id, farmerId, name, category, quantity, unit, price, location, description, image, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, farmerId, name, category, quantity, unit, price, location, description, imagePath, timestamp],
        function(err) {
            if (err) return res.status(500).json({ error: 'Failed to add product' });
            req.app.get('io').emit('product.created', { id, farmerId, name, category, quantity, unit, price, location, description, image: imagePath, timestamp });
            res.status(201).json({ id, farmerId, name, category, quantity, unit, price, location, description, image: imagePath, timestamp });
        }
    );
});

// Add product
router.post('/', authenticate, authorize('farmer'), validateProduct, (req, res) => {
    const { farmerId, name, category, quantity, unit, price, location, description, image } = req.body;

    const id = uuidv4();
    const timestamp = Date.now();

    db.run(
        `INSERT INTO products (id, farmerId, name, category, quantity, unit, price, location, description, image, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, farmerId, name, category, quantity, unit, price, location, description, image, timestamp],
        function(err) {
            if (err) return res.status(500).json({ error: 'Failed to add product' });
            // emit product.created
            req.app.get('io').emit('product.created', { id, farmerId, name, category, quantity, unit, price, location, description, image, timestamp });
            res.status(201).json({ id, farmerId, name, category, quantity, unit, price, location, description, image, timestamp });
        }
    );
});

// Update product
router.put('/:id', authenticate, authorize('farmer'), (req, res) => {
    const { name, category, quantity, unit, price, location, description, image } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (quantity !== undefined) { updates.push('quantity = ?'); params.push(quantity); }
    if (unit !== undefined) { updates.push('unit = ?'); params.push(unit); }
    if (price !== undefined) { updates.push('price = ?'); params.push(price); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (image !== undefined) { updates.push('image = ?'); params.push(image); }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);

    db.run(
        `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
        params,
        function(err) {
            if (err) return res.status(500).json({ error: 'Failed to update product' });
            if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
            res.json({ id: req.params.id, ...req.body });
        }
    );
});

// Delete product
router.delete('/:id', authenticate, authorize('farmer'), (req, res) => {
    db.run(
        `DELETE FROM products WHERE id = ?`,
        [req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Failed to delete product' });
            if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
            res.json({ message: 'Product deleted' });
        }
    );
});

module.exports = router;
