// routes/home.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const postController = require('../controllers/postController');

// -------------------- MULTER CONFIG FOR POST IMAGES --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/images'),
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// -------------------- HOME PAGE --------------------
router.get('/', (req, res) => {
  const categoryFilter = req.query.category || '';
  let sql = `
    SELECT posts.*, users.name AS user_name, users.phone AS user_phone, users.image AS user_image 
    FROM posts 
    JOIN users ON posts.user_id = users.id
  `;
  if (categoryFilter) sql += ` WHERE posts.category = ?`;
  sql += ` ORDER BY posts.created_at DESC`;

  const params = categoryFilter ? [categoryFilter] : [];
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).send('Database error: ' + err.message);
    res.render('home', {
      user: req.session.user,
      posts: results,
      selectedCategory: categoryFilter
    });
  });
});

// -------------------- CREATE POST PAGE --------------------
router.get('/post', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const userId = req.session.user.id;

  db.query('SELECT is_verified FROM users WHERE id = ?', [userId], (err, result) => {
    if (err) return res.status(500).send('Database error.');
    if (result.length === 0) return res.redirect('/login');

    const isVerified = result[0].is_verified === 1;

    const sql = `
      SELECT posts.*, users.name AS user_name, users.phone AS user_phone, users.image AS user_image, users.is_verified
      FROM posts
      JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
    `;
    db.query(sql, (err2, posts) => {
      if (err2) return res.status(500).send('Database error fetching posts.');
      res.render('createPost', {
        user: { ...req.session.user, is_verified: isVerified },
        posts
      });
    });
  });
});

// -------------------- HANDLE POST CREATION --------------------
router.post('/post', upload.single('image'), (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const userId = req.session.user.id;
  db.query('SELECT is_verified FROM users WHERE id = ?', [userId], (err, result) => {
    if (err) return res.status(500).send('Database error.');
    if (result.length === 0 || result[0].is_verified !== 1) {
      return res.send(`
        <h2 style="text-align:center; color:red;">❌ You are not verified to post.</h2>
        <a href="/" style="display:block; text-align:center;">⬅ Back to Home</a>
      `);
    }
    postController.createPost(req, res);
  });
});

// -------------------- MY POSTS PAGE --------------------
router.get('/mypost', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const userId = req.session.user.id;

  const sql = `SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC`;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).send('Database error: ' + err.message);
    res.render('myPost', { user: req.session.user, posts: results });
  });
});

// -------------------- DELETE POST --------------------
router.post('/mypost/delete/:id', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const postId = req.params.id;
  const userId = req.session.user.id;

  const sql = `DELETE FROM posts WHERE id = ? AND user_id = ?`;
  db.query(sql, [postId, userId], (err) => {
    if (err) return res.status(500).send('Database error: ' + err.message);
    res.redirect('/mypost');
  });
});

// -------------------- EDIT POST PAGE --------------------
router.get('/mypost/edit/:id', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const postId = req.params.id;
  const userId = req.session.user.id;

  const sql = `SELECT * FROM posts WHERE id = ? AND user_id = ?`;
  db.query(sql, [postId, userId], (err, results) => {
    if (err) return res.status(500).send('Database error: ' + err.message);
    if (results.length === 0) return res.send('Post not found or unauthorized.');
    res.render('editPost', { user: req.session.user, post: results[0] });
  });
});

// -------------------- HANDLE EDIT POST --------------------
router.post('/mypost/edit/:id', upload.single('image'), (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const postId = req.params.id;
  const userId = req.session.user.id;
  const { title, description, category, budget } = req.body; // <-- added budget
  const image = req.file ? req.file.filename : null;

  let sql, params;
  if (image) {
    sql = `UPDATE posts SET title=?, description=?, category=?, budget=?, image=? WHERE id=? AND user_id=?`;
    params = [title, description, category, budget, image, postId, userId];
  } else {
    sql = `UPDATE posts SET title=?, description=?, category=?, budget=? WHERE id=? AND user_id=?`;
    params = [title, description, category, budget, postId, userId];
  }

  db.query(sql, params, (err) => {
    if (err) return res.status(500).send('Database error: ' + err.message);
    res.redirect('/mypost');
  });
});

// -------------------- GET POSTS AS JSON --------------------
router.get('/posts/json', (req, res) => {
  const sql = `
    SELECT posts.*, users.name AS user_name, users.phone AS user_phone, users.image AS user_image 
    FROM posts 
    JOIN users ON posts.user_id = users.id
    ORDER BY posts.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// -------------------- VIEW ALL POSTS BY SPECIFIC USER --------------------
router.get('/user/:userId', (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT posts.*, users.name AS user_name, users.phone AS user_phone, users.image AS user_image
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE users.id = ?
    ORDER BY posts.created_at DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).send('Database error: ' + err.message);

    // If the user has no posts
    if (results.length === 0) {
      return res.render('userPosts', {
        userPosts: [],
        profile: null,
        message: 'This user has not posted any deliveries yet.',
      });
    }

    const profile = {
      name: results[0].user_name,
      phone: results[0].user_phone,
      image: results[0].user_image,
    };

    res.render('userPosts', { userPosts: results, profile, message: null });
  });
});

router.get('/', (req, res) => {
  const userId = req.session.user ? req.session.user.id : null;

  const postsSql = `
    SELECT posts.*, users.name AS user_name, users.phone AS user_phone, users.image AS user_image, users.id AS user_id
    FROM posts
    JOIN users ON posts.user_id = users.id
    ORDER BY posts.created_at DESC
  `;

  if (!userId) {
    db.query(postsSql, (err, posts) => {
      if (err) return res.status(500).send('Database error: ' + err.message);
      res.render('home', { user: null, posts, followingList: [] });
    });
  } else {
    // Get posts and following list
    const followSql = `SELECT following_id FROM follows WHERE follower_id = ?`;
    db.query(followSql, [userId], (err, follows) => {
      if (err) return res.status(500).send('Database error: ' + err.message);
      const followingList = follows.map(f => f.following_id);
      db.query(postsSql, (err2, posts) => {
        if (err2) return res.status(500).send('Database error: ' + err2.message);
        res.render('home', { user: req.session.user, posts, followingList });
      });
    });
  }
});

module.exports = router;
