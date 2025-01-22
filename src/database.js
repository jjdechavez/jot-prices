require('dotenv').config();

const sqlite3 = require('sqlite3').verbose();

// Use DATABASE_PATH from env
const db = new sqlite3.Database(process.env.DATABASE_PATH || 'products.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Initialize database tables
const initDatabase = () => {
    // Products table
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            search_query TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Price history table
    db.run(`
        CREATE TABLE IF NOT EXISTS price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            price REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `);
};

// Add a product to track
const addProduct = (name, searchQuery) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO products (name, search_query) VALUES (?, ?)',
            [name, searchQuery],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
};

// Add price to history
const addPriceHistory = (productId, price) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO price_history (product_id, price) VALUES (?, ?)',
            [productId, price],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
};

// Get all products with their latest prices
const getAllProducts = () => {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT 
                p.*,
                ph.price as current_price,
                MIN(ph2.price) as lowest_price,
                MAX(ph2.price) as highest_price
            FROM products p
            LEFT JOIN (
                SELECT product_id, price
                FROM price_history ph1
                WHERE created_at = (
                    SELECT MAX(created_at)
                    FROM price_history
                    WHERE product_id = ph1.product_id
                )
            ) ph ON p.id = ph.product_id
            LEFT JOIN price_history ph2 ON p.id = ph2.product_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Get price history for a specific product
const getPriceHistory = (productId) => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM price_history 
             WHERE product_id = ? 
             ORDER BY created_at DESC`,
            [productId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
};

module.exports = {
    initDatabase,
    addProduct,
    addPriceHistory,
    getAllProducts,
    getPriceHistory
}; 