// models/db.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./face.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      encoding TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;