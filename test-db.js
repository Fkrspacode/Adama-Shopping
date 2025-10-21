const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.query('SELECT 1 + 1 AS result', (err, results) => {
  if (err) return console.log('Database error:', err.message);
  console.log('Database connected:', results);
});
