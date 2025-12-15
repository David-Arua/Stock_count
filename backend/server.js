require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS Configuration - Allow all origins since frontend is served from same server
app.use(cors());

const io = new Server(server, {
    cors: { origin: '*' }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files (for production deployment)
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize database
const db = require('./models/database');

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/messages', require('./routes/messages'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running' });
});

// Socket.IO basic setup
io.on('connection', (socket) => {
    console.log('Client connected');
    socket.on('disconnect', () => console.log('Client disconnected'));
});

// Expose io for route modules to emit events
app.set('io', io);

// Start server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Using DB schema: ${process.env.MYSQL_DATABASE || 'marketplace'} on ${process.env.MYSQL_HOST || 'localhost'}`);
});
