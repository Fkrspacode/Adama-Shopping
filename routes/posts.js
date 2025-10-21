// routes/posts.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // MySQL connection

// -------------------- GET ALL POSTS --------------------
router.get('/', async (req, res) => {
  try {
    const [posts] = await db.query(`
      SELECT posts.*, users.name AS user_name, users.image AS user_image, users.phone AS user_phone
      FROM posts
      JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
    `);

    // Attach like counts & check if current user liked each
    for (let post of posts) {
      const [likeCount] = await db.query(
        'SELECT COUNT(*) AS likes FROM likes WHERE post_id = ?',
        [post.id]
      );
      post.likes = likeCount[0].likes || 0;

      if (req.session.user) {
        const [userLiked] = await db.query(
          'SELECT * FROM likes WHERE post_id = ? AND user_id = ?',
          [post.id, req.session.user.id]
        );
        post.likedByUser = userLiked.length > 0;
      } else {
        post.likedByUser = false;
      }
    }

    // Render home page
    res.render('home', { posts, user: req.session.user || null });
  } catch (err) {
    console.error('Error loading posts:', err);
    res.status(500).send('Database error');
  }
});

// -------------------- LIKE / UNLIKE POST --------------------
router.post('/like/:postId', async (req, res) => {
  try {
    const user = req.session.user;
    const postId = req.params.postId;

    if (!user) return res.json({ success: false, message: 'Not logged in' });

    // Check if user already liked
    const [existing] = await db.query(
      'SELECT * FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, user.id]
    );

    let liked;
    if (existing.length > 0) {
      // Unlike
      await db.query('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, user.id]);
      liked = false;
    } else {
      // Like
      await db.query('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, user.id]);
      liked = true;
    }

    // Get total like count
    const [countResult] = await db.query(
      'SELECT COUNT(*) AS likes FROM likes WHERE post_id = ?',
      [postId]
    );
    const likes = countResult[0].likes;

    res.json({ success: true, liked, likes });
  } catch (err) {
    console.error('Error in like route:', err);
    res.json({ success: false, message: 'Database error' });
  }
});

// -------------------- CREATE NEW POST --------------------
router.post('/create', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/login');

    const { title, budget, description, category, account_number } = req.body; // added account_number

    await db.query(
      'INSERT INTO posts (user_id, title, description, category, budget, account_number, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())', // added account_number
      [user.id, title, description || '', category || 'General', budget || 0, account_number || ''] // added account_number
    );

    res.redirect('/');
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).send('Database error');
  }
});

module.exports = router;
