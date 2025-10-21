// config/db.js
const mysql = require('mysql2');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

// Create MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,      // e.g., 'localhost'
  user: process.env.DB_USER,      // your MySQL username
  password: process.env.DB_PASS,  // your MySQL password
  database: process.env.DB_NAME   // your database name
});

// Connect to the database
db.connect(err => {
  if (err) {
    console.error('❌ Database connection failed: ' + err.stack);
    return;
  }
  console.log('✅ Connected to MySQL as ID ' + db.threadId);
});

// Export the connection to use in other files
module.exports = db;
