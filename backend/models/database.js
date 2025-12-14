const mysql = require('mysql2/promise');

// Read connection settings from environment variables
const {
    MYSQL_HOST = 'localhost',
    MYSQL_PORT = '3306',
    MYSQL_USER = 'root',
    MYSQL_PASSWORD = '',
    MYSQL_DATABASE = 'marketplace'
} = process.env;

let pool;

async function init() {
    pool = await mysql.createPool({
        host: MYSQL_HOST,
        port: Number(MYSQL_PORT),
        user: MYSQL_USER,
        password: MYSQL_PASSWORD,
        database: MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    // Create tables if they don't exist
    const conn = await pool.getConnection();
    try {
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                type VARCHAR(20) NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                location VARCHAR(255),
                farmName VARCHAR(255),
                businessName VARCHAR(255),
                createdAt BIGINT
            )
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS products (
                id VARCHAR(36) PRIMARY KEY,
                farmerId VARCHAR(36) NOT NULL,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                quantity DOUBLE NOT NULL,
                unit VARCHAR(50) NOT NULL,
                price DOUBLE NOT NULL,
                location VARCHAR(255),
                description TEXT,
                image LONGTEXT,
                timestamp BIGINT,
                FOREIGN KEY (farmerId) REFERENCES users(id)
            )
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS requests (
                id VARCHAR(36) PRIMARY KEY,
                productId VARCHAR(36) NOT NULL,
                farmerId VARCHAR(36) NOT NULL,
                vendorId VARCHAR(36) NOT NULL,
                quantity DOUBLE NOT NULL,
                notes TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                timestamp BIGINT,
                FOREIGN KEY (productId) REFERENCES products(id),
                FOREIGN KEY (farmerId) REFERENCES users(id),
                FOREIGN KEY (vendorId) REFERENCES users(id)
            )
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id VARCHAR(36) PRIMARY KEY,
                senderId VARCHAR(36) NOT NULL,
                recipientId VARCHAR(36) NOT NULL,
                text TEXT NOT NULL,
                timestamp BIGINT,
                FOREIGN KEY (senderId) REFERENCES users(id),
                FOREIGN KEY (recipientId) REFERENCES users(id)
            )
        `);

        console.log('Connected to MySQL and initialized tables');
    } finally {
        conn.release();
    }
}

// Create helpful indexes for common queries
async function ensureIndexes() {
    const conn = await pool.getConnection();
    try {
        // Helper to create index only if it doesn't exist
        async function createIndexIfNotExists(indexName, tableName, sql) {
            const [rows] = await conn.query(
                `SELECT COUNT(*) as count FROM information_schema.statistics 
                 WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
                [tableName, indexName]
            );
            if (rows[0].count === 0) {
                await conn.query(sql);
            }
        }

        // Users
        await createIndexIfNotExists('idx_users_email', 'users', 
            'CREATE INDEX idx_users_email ON users(email)');

        // Products: common filter/sort is farmerId + timestamp, and text search on name/description
        await createIndexIfNotExists('idx_products_farmer_ts', 'products',
            'CREATE INDEX idx_products_farmer_ts ON products(farmerId, timestamp)');
        await createIndexIfNotExists('idx_products_search', 'products',
            'CREATE FULLTEXT INDEX idx_products_search ON products(name, description)');

        // Requests: filtered by vendorId or farmerId, ordered by timestamp
        await createIndexIfNotExists('idx_requests_vendor_ts', 'requests',
            'CREATE INDEX idx_requests_vendor_ts ON requests(vendorId, timestamp)');
        await createIndexIfNotExists('idx_requests_farmer_ts', 'requests',
            'CREATE INDEX idx_requests_farmer_ts ON requests(farmerId, timestamp)');

        // Messages: pair lookups ordered by time, and per-recipient scans
        await createIndexIfNotExists('idx_messages_pair_ts', 'messages',
            'CREATE INDEX idx_messages_pair_ts ON messages(senderId, recipientId, timestamp)');
        await createIndexIfNotExists('idx_messages_recipient_ts', 'messages',
            'CREATE INDEX idx_messages_recipient_ts ON messages(recipientId, timestamp)');
    } finally {
        conn.release();
    }
}

// Provide a drop-in API compatible with the existing sqlite usage
const db = {
    async all(sql, params, cb) {
        try {
            const [rows] = await pool.query(sql, params || []);
            cb && cb(null, rows);
            return rows;
        } catch (err) {
            cb && cb(err);
            throw err;
        }
    },
    async get(sql, params, cb) {
        try {
            const [rows] = await pool.query(sql, params || []);
            const row = rows && rows.length ? rows[0] : null;
            cb && cb(null, row);
            return row;
        } catch (err) {
            cb && cb(err);
            throw err;
        }
    },
    async run(sql, params, cb) {
        try {
            const [result] = await pool.query(sql, params || []);
            const context = { changes: result?.affectedRows || 0 };
            cb && cb.call(context, null);
            return context;
        } catch (err) {
            if (cb) cb(err);
            throw err;
        }
    }
};

// Initialize immediately
init().then(() => ensureIndexes()).catch((err) => {
    console.error('MySQL initialization error:', err);
});

module.exports = db;
