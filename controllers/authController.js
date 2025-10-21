const bcrypt = require('bcrypt');
const db = require('../config/db');
const { sendAlertEmail } = require('../utils/email');
require('dotenv').config();

// -------------------- REGISTER USER --------------------
// -------------------- REGISTER USER --------------------
// -------------------- REGISTER USER --------------------
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, bank_name, account_name, account_number } = req.body; // <-- added bank fields
    const image = req.file ? req.file.filename : null;

    if (!name || !email || !password) {
      return res.status(400).send('Name, email, and password are required.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
      if (err) return res.status(500).send('Database error: ' + err.message);
      if (results.length > 0) return res.send('Email already exists.');

      // Add bank info to INSERT
      db.query(
        'INSERT INTO users (name, email, password_hash, phone, image, bank_name, account_name, account_number, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
        [name, email, hashedPassword, phone, image, bank_name, account_name, account_number],
        (err, results) => {
          if (err) return res.status(500).send('Database error: ' + err.message);

          req.session.user = {
            id: results.insertId,
            name,
            email,
            phone,
            image,
            bank_name,         // <-- added to session
            account_name,      // <-- added to session
            account_number,    // <-- added to session
            isVerified: false
          };

          res.redirect('/');
        }
      );
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error.');
  }
};


// -------------------- LOGIN USER --------------------
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip;
  const ua = req.headers['user-agent'];

  if (!email || !password) return res.status(400).send('Email and password are required.');

  isBlocked(ip, (err, blocked) => {
    if (err) return res.status(500).send('Server error.');
    if (blocked) return res.send('Too many failed attempts. Try again later.');

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).send('Database error: ' + err.message);

      const user = results[0];
      const valid = user ? await bcrypt.compare(password, user.password_hash) : false;

      recordLoginAttempt(email, valid, ip, ua);

      if (!user) return res.send('User not found.');
      if (!valid) return res.send('Incorrect password.');

      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        isVerified: user.is_verified === 1
      };

      res.redirect('/');
    });
  });
};

// -------------------- LOGOUT USER --------------------
exports.logoutUser = (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Logout error.');
    res.redirect('/login');
  });
};

// -------------------- LOGIN ATTEMPTS --------------------
function recordLoginAttempt(email, success, ip, ua) {
  db.query(
    'INSERT INTO login_attempts (email, success, ip, user_agent) VALUES (?, ?, ?, ?)',
    [email, success ? 1 : 0, ip, ua],
    (err) => {
      if (err) console.error('Login attempt insert error:', err.message);

      if (!success) {
        db.query(
          'SELECT COUNT(*) AS fails FROM login_attempts WHERE ip = ? AND success = 0 AND created_at > (NOW() - INTERVAL 15 MINUTE)',
          [ip],
          (err, results) => {
            if (err) return console.error(err);
            if (results[0].fails >= 5) {
              sendAlertEmail(
                '⚠️ Suspicious Login Activity Detected',
                `Multiple failed login attempts from IP ${ip}. Email tried: ${email}. User agent: ${ua}. Failed attempts: ${results[0].fails}`
              );
            }
          }
        );
      }
    }
  );
}

function isBlocked(ip, callback) {
  db.query(
    'SELECT COUNT(*) AS fails FROM login_attempts WHERE ip = ? AND success = 0 AND created_at > (NOW() - INTERVAL 15 MINUTE)',
    [ip],
    (err, results) => {
      if (err) return callback(err);
      callback(null, results[0].fails >= 5);
    }
  );
}

// -------------------- POSTS --------------------
exports.createPost = (req, res) => {
  const { title, description, category } = req.body;
  const user_id = req.session.user?.id;
  const image = req.file ? req.file.filename : null;

  if (!user_id) return res.redirect('/login');

  // Check verification
  if (!req.session.user.isVerified) {
    return res.render('verifyRequired', { user: req.session.user });
  }

  if (!title) return res.send('Title is required');

  db.query(
    'INSERT INTO posts (user_id, title, description, category, image) VALUES (?, ?, ?, ?, ?)',
    [user_id, title, description, category, image],
    (err) => {
      if (err) return res.status(500).send('Database error: ' + err.message);
      res.redirect('/');
    }
  );
};

exports.getAllPosts = (req, res) => {
  db.query(
    'SELECT posts.*, users.name AS user_name, users.image AS user_image FROM posts JOIN users ON posts.user_id = users.id ORDER BY posts.created_at DESC',
    (err, results) => {
      if (err) return res.status(500).send('Database error: ' + err.message);
      res.render('home', { user: req.session.user, posts: results });
    }
  );
};
