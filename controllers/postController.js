// controllers/postController.js
const db = require('../config/db'); // Shared MySQL connection
const path = require('path');

// -------------------- GET ALL POSTS --------------------
exports.getAllPosts = (req, res) => {
  const sql = `
    SELECT posts.*, users.name AS user_name, users.image AS user_image, users.phone AS user_phone
    FROM posts
    JOIN users ON posts.user_id = users.id
    ORDER BY posts.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Database Error:', err);
      return res.status(500).send('Database error: ' + err.message);
    }

    res.render('home', {
      user: req.session.user || null,
      posts: results,
      selectedCategory: req.query.category || ''
    });
  });
};

// -------------------- CREATE NEW POST --------------------
exports.createPost = (req, res) => {
  const { title, description, category, budget } = req.body;
  const image = req.file ? req.file.filename : null;
  const user_id = req.session.user ? req.session.user.id : null;

  // Basic validation
  if (!user_id) return res.redirect('/login');
  if (!title || !description || !category) {
    return res.status(400).send(`
      <h3 style="color:red; text-align:center;">⚠ All fields are required.</h3>
      <a href="/post" style="display:block; text-align:center;">⬅ Back</a>
    `);
  }

  const sql = `
    INSERT INTO posts (user_id, title, description, category, budget, image, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;
  db.query(sql, [user_id, title, description, category, budget || null, image], (err) => {
    if (err) {
      console.error('❌ Database Error:', err);
      return res.status(500).send('Database error: ' + err.message);
    }
    res.redirect('/');
  });
};

// -------------------- DELETE POST --------------------
exports.deletePost = (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user ? req.session.user.id : null;

  if (!userId) return res.redirect('/login');

  const sql = 'DELETE FROM posts WHERE id = ? AND user_id = ?';
  db.query(sql, [postId, userId], (err) => {
    if (err) {
      console.error('❌ Delete Error:', err);
      return res.status(500).send('Database error: ' + err.message);
    }
    res.redirect('/mypost');
  });
};

// -------------------- UPDATE EXISTING POST --------------------
exports.updatePost = (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user ? req.session.user.id : null;
  const { title, description, category, budget } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!userId) return res.redirect('/login');

  let sql, params;
  if (image) {
    sql = `UPDATE posts SET title=?, description=?, category=?, budget=?, image=? WHERE id=? AND user_id=?`;
    params = [title, description, category, budget, image, postId, userId];
  } else {
    sql = `UPDATE posts SET title=?, description=?, category=?, budget=? WHERE id=? AND user_id=?`;
    params = [title, description, category, budget, postId, userId];
  }

  db.query(sql, params, (err) => {
    if (err) {
      console.error('❌ Update Error:', err);
      return res.status(500).send('Database error: ' + err.message);
    }
    res.redirect('/mypost');
  });
};

// -------------------- GET USER POSTS --------------------
exports.getUserPosts = (req, res) => {
  const userId = req.session.user ? req.session.user.id : null;
  if (!userId) return res.redirect('/login');

  const sql = 'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC';
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('❌ Database Error:', err);
      return res.status(500).send('Database error: ' + err.message);
    }
    res.render('myPost', { user: req.session.user, posts: results });
  });
};

// -------------------- GET POSTS AS JSON --------------------
exports.getPostsJSON = (req, res) => {
  const sql = `
    SELECT posts.*, users.name AS user_name, users.phone AS user_phone, users.image AS user_image 
    FROM posts 
    JOIN users ON posts.user_id = users.id
    ORDER BY posts.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ JSON Error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
};
