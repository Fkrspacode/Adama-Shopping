// routes/follow.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// -------------------- TOGGLE FOLLOW / UNFOLLOW (AJAX) --------------------
router.post('/toggle', (req, res) => {
  if (!req.session.user) 
    return res.status(401).json({ success: false, message: 'Not logged in' });

  const followerId = req.session.user.id;
  const followingId = Number(req.body.followingId);

  if (isNaN(followingId))
    return res.status(400).json({ success: false, message: 'Invalid following ID' });

  if (followerId === followingId)
    return res.status(400).json({ success: false, message: 'Cannot follow yourself' });

  // Check if already following
  const checkSql = `SELECT * FROM follows WHERE follower_id = ? AND following_id = ?`;
  db.query(checkSql, [followerId, followingId], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    if (result.length > 0) {
      // Already following → unfollow
      const deleteSql = `DELETE FROM follows WHERE follower_id = ? AND following_id = ?`;
      db.query(deleteSql, [followerId, followingId], (err2) => {
        if (err2) return res.status(500).json({ success: false, message: err2.message });
        res.json({ success: true, following: false });
      });
    } else {
      // Not following → follow
      const insertSql = `INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`;
      db.query(insertSql, [followerId, followingId], (err3) => {
        if (err3) return res.status(500).json({ success: false, message: err3.message });
        res.json({ success: true, following: true });
      });
    }
  });
});

// -------------------- VIEW YOUR CUSTOMERS --------------------
router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const userId = req.session.user.id;

  const sql = `
    SELECT users.id, users.name, users.phone, users.image, users.email
    FROM follows
    JOIN users ON follows.following_id = users.id
    WHERE follows.follower_id = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.render('customers', { user: req.session.user, customers: results });
  });
});

module.exports = router;
