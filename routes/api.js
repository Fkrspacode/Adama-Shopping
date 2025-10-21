// routes/api.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// -------------------- GET ALL POSTS (JSON) --------------------
router.get('/posts', (req, res) => {
  const category = req.query.category || '';

  let sql = `
    SELECT posts.*, users.name AS user_name, users.phone AS user_phone, users.image AS user_image 
    FROM posts
    JOIN users ON posts.user_id = users.id
  `;

  const params = [];
  if (category) {
    sql += ` WHERE posts.category = ?`;
    params.push(category);
  }

  sql += ` ORDER BY posts.created_at DESC`;

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// -------------------- GET SINGLE POST BY ID --------------------
router.get('/posts/:id', (req, res) => {
  const postId = req.params.id;
  const sql = `
    SELECT posts.*, users.name AS user_name, users.phone AS user_phone, users.image AS user_image 
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE posts.id = ?
  `;
  db.query(sql, [postId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json(results[0]);
  });
});

// -------------------- GET VERIFIED USERS --------------------
router.get('/users/verified', (req, res) => {
  const sql = `SELECT id, name, email, phone, password,image FROM users WHERE is_verified = 1`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// -------------------- GET SINGLE USER --------------------
router.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  const sql = `SELECT id, name, email, phone, image, is_verified FROM users WHERE id = ?`;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(results[0]);
  });
});

module.exports = router;
