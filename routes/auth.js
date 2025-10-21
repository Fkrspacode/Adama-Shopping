// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const multer = require('multer');
const db = require('../config/db'); // Shared MySQL connection
const path = require('path');


// -------------------- MULTER CONFIG --------------------
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/images'); // folder for images
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// -------------------- SIGNUP --------------------
// Show signup page
router.get('/signup', (req, res) => {
  res.render('signup');
});
router.get('/about', (req,res) => {
  res.render('about');
});
router.get('/privecy',(req,res)=>{
  res.render('privecy');
});
router.get('/services', (req,res) => {
  res.render('services');
});
// Handle signup form submission with image
router.post('/signup', upload.single('image'), authController.registerUser);

// -------------------- LOGIN --------------------
// Show login page
router.get('/login', (req, res) => {
  res.render('login');
});

// Handle login form submission
router.post('/login', authController.loginUser);

// -------------------- LOGOUT --------------------
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Error logging out');
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

// -------------------- ADMIN AUTHENTICATION --------------------
function adminAuth(req, res, next) {
  if (req.session.isAdmin) return next();

  if (req.method === 'POST') {
    const { username, password } = req.body;

    // Read admin users from .env
    const admins = process.env.ADMIN_USERS.split(',').map(u => {
      const [user, pass] = u.split(':');
      return { username: user, password: pass };
    });

    const validAdmin = admins.find(a => a.username === username && a.password === password);
    if (!validAdmin) return res.send('❌ Invalid admin credentials');

    req.session.isAdmin = true;
    return res.redirect('/admin/management');
  }

  // GET request: show login form
  res.send(`
    <h2>Admin Login</h2>
    <form method="POST">
      <input type="text" name="username" placeholder="Admin username" required />
      <input type="password" name="password" placeholder="Admin password" required />
      <button type="submit">Login</button>
    </form>
  `);
}

// -------------------- ADMIN MANAGEMENT --------------------
router.all('/admin/management', adminAuth, (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).send('DB error: ' + err.message);

    // Count total users
    const totalUsers = results.length;

    res.render('management', { users: results, totalUsers });
  });
});

// -------------------- DELETE USER --------------------
router.get('/admin/delete/:id', adminAuth, (req, res) => {
  const userId = req.params.id;
  db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
    if (err) return res.status(500).send('Error deleting user: ' + err.message);
    res.redirect('/admin/management');
  });
});
router.get('/logout', authController.logoutUser);

module.exports = router;
