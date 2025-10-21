// server.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
require('dotenv').config();

// -------------------- IMPORT ROUTES --------------------
const orderRoutes = require('./routes/order');
const postRoutes = require('./routes/posts');
const apiRoutes = require('./routes/api');       // API routes for deliveries & users
const homeRoute = require('./routes/home');      // Home page & deliveries
const authRoute = require('./routes/auth');      // Login, register, logout
const adminRoutes = require('./routes/admin');   // Admin panel
const followRoutes = require('./routes/follow'); // Customer follow routes

// -------------------- INITIALIZE APP --------------------
const app = express();
const port = process.env.PORT || 4000;

// -------------------- VIEW ENGINE SETUP --------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// -------------------- STATIC FILES --------------------
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images'))); // Serve uploaded images

// -------------------- BODY PARSER --------------------
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// -------------------- SESSION SETUP --------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_session_secret', 
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
  })
);

// -------------------- GLOBAL USER SESSION --------------------
// Make user & admin data available to all EJS views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAdmin = req.session.isAdmin || false;
  next();
});

// -------------------- ROUTES --------------------
// Authentication routes (login, register, logout)
app.use('/', authRoute);

// Home and delivery routes
app.use('/', homeRoute);

// Post & likes routes (requires session)
app.use('/', postRoutes);

// Orders routes
app.use('/order', orderRoutes);

// Admin panel routes
app.use('/admin', adminRoutes);

// API routes (users, deliveries, etc.)
app.use('/api', apiRoutes);

// Follow / customers routes
app.use('/customers', followRoutes);

// Redirect /admin root to login
app.get('/admin', (req, res) => {
  res.redirect('/admin/login');
});

// -------------------- 404 HANDLER --------------------
// Must be last middleware
app.use((req, res) => {
  res.status(404).render('404', { message: 'Page Not Found' });
});

// -------------------- START SERVER --------------------
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});