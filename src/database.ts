import { config } from "dotenv";
import sqlite3 from "sqlite3";
import { Product, PriceHistory } from "./types";

config();

const db = new sqlite3.Database(
  process.env.DATABASE_PATH || "products.db",
  (err) => {
    if (err) {
      console.error("Error connecting to database:", err);
    } else {
      console.log("Connected to SQLite database");
    }
  }
);

export const initDatabase = (): void => {
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

export const addProduct = (name: string, searchQuery: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO products (name, search_query) VALUES (?, ?)",
      [name, searchQuery],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

export const addPriceHistory = (
  productId: number,
  price: number
): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO price_history (product_id, price) VALUES (?, ?)",
      [productId, price],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

export const getAllProducts = (): Promise<Product[]> => {
  return new Promise((resolve, reject) => {
    db.all<Product>(
      `
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
      `,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

export const getPriceHistory = (productId: number): Promise<PriceHistory[]> => {
  return new Promise((resolve, reject) => {
    db.all<PriceHistory>(
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