const express = require('express');
const router = express.Router();
const db = require('../config/db');

// -------------------- GET ALL ORDERS FOR LOGGED-IN USER --------------------
router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const userId = req.session.user.id;

  const sql = `
    SELECT orders.*, posts.title, posts.budget, posts.image AS post_image, posts.category,
           users.name AS seller_name, users.phone AS seller_phone, users.image AS seller_image,
           users.bank_name AS seller_bank_name,
           users.account_name AS seller_account_name,
           users.account_number AS seller_account_number,
           buyers.bank_name AS buyer_bank_name,
           buyers.account_name AS buyer_account_name,
           buyers.account_number AS buyer_account_number
    FROM orders
    JOIN posts ON orders.post_id = posts.id
    JOIN users ON posts.user_id = users.id
    JOIN users AS buyers ON orders.user_id = buyers.id
    WHERE orders.user_id = ?
    ORDER BY orders.created_at DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching orders:', err);
      return res.status(500).send('Database error: ' + err.message);
    }

    results.forEach(order => {
      order.total_price = order.budget * (order.quantity || 1);
    });

    res.render('order', { user: req.session.user, orders: results });
  });
});

// -------------------- ADD POST TO ORDERS --------------------
router.post('/:postId', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const userId = req.session.user.id;
  const postId = req.params.postId;
  const quantity = parseInt(req.body.quantity) || 1;

  const postSql = `SELECT id, category FROM posts WHERE id = ?`;
  db.query(postSql, [postId], (err, postResults) => {
    if (err) {
      console.error('Error checking post:', err);
      return res.status(500).send('Database error: ' + err.message);
    }

    if (postResults.length === 0) {
      return res.status(404).send('Post not found.');
    }

    const category = postResults[0].category;

    const checkSql = `SELECT * FROM orders WHERE user_id = ? AND post_id = ?`;
    db.query(checkSql, [userId, postId], (err2, results) => {
      if (err2) {
        console.error('Error checking existing order:', err2);
        return res.status(500).send('Database error: ' + err2.message);
      }

      if (results.length > 0) {
        const newQuantity = results[0].quantity + quantity;
        const updateSql = `UPDATE orders SET quantity = ? WHERE id = ?`;
        db.query(updateSql, [newQuantity, results[0].id], (err3) => {
          if (err3) {
            console.error('Error updating order quantity:', err3);
            return res.status(500).send('Database error: ' + err3.message);
          }
          res.redirect('/order');
        });
      } else {
        const insertSql = `
          INSERT INTO orders (user_id, post_id, quantity, category, created_at)
          VALUES (?, ?, ?, ?, NOW())
        `;
        db.query(insertSql, [userId, postId, quantity, category], (err4) => {
          if (err4) {
            console.error('Error inserting new order:', err4);
            return res.status(500).send('Database error: ' + err4.message);
          }
          res.redirect('/order');
        });
      }
    });
  });
});

// -------------------- DELETE ORDER --------------------
router.post('/delete/:orderId', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const userId = req.session.user.id;
  const orderId = req.params.orderId;

  const sql = `DELETE FROM orders WHERE id = ? AND user_id = ?`;
  db.query(sql, [orderId, userId], (err, result) => {
    if (err) {
      console.error('Error deleting order:', err);
      return res.status(500).send('Database error: ' + err.message);
    }
    if (result.affectedRows === 0)
      return res.status(404).send('Order not found or not authorized');
    res.redirect('/order');
  });
});

// -------------------- PAYMENT FOR SINGLE ORDER --------------------
router.post('/pay/:orderId', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const userId = req.session.user.id;
  const orderId = req.params.orderId;
  const method = req.body.method || 'cbe';
  const location = req.body.location || '-';
  const buyerAccountName = req.body.buyer_account_name || null;
  const buyerAccountNumber = req.body.buyer_account_number || null;

  const sql = `
    SELECT o.*, p.user_id AS seller_id, p.budget,
           buyers.bank_name AS buyer_bank_name,
           buyers.account_name AS buyer_account_name,
           buyers.account_number AS buyer_account_number,
           sellers.bank_name AS seller_bank_name,
           sellers.account_name AS seller_account_name,
           sellers.account_number AS seller_account_number
    FROM orders o
    JOIN posts p ON o.post_id = p.id
    JOIN users AS sellers ON p.user_id = sellers.id
    JOIN users AS buyers ON o.user_id = buyers.id
    WHERE o.id = ? AND o.user_id = ?
  `;
  db.query(sql, [orderId, userId], (err, results) => {
    if (err) {
      console.error('Error fetching payment info:', err);
      return res.status(500).send('Database error: ' + err.message);
    }
    if (!results.length) return res.status(404).send('Order not found');

    const order = results[0];
    const amount = order.quantity * order.budget;

    const insertSql = `
      INSERT INTO payments
        (order_id, buyer_id, seller_id, amount, payment_method, payment_status, location,
         buyer_bank_name, buyer_account_name, buyer_account_number,
         seller_bank_name, seller_account_name, seller_account_number, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const params = [
      order.id,
      userId,
      order.seller_id,
      amount,
      method,
      'paid',
      location,
      order.buyer_bank_name,
      buyerAccountName,
      buyerAccountNumber,
      order.seller_bank_name,
      order.seller_account_name,
      order.seller_account_number
    ];

    db.query(insertSql, params, (err2) => {
      if (err2) {
        console.error('Error inserting payment:', err2);
        return res.status(500).send('Database error: ' + err2.message);
      }
      res.redirect('/order?success=1');
    });
  });
});

// -------------------- PAYMENT FOR ALL ORDERS --------------------
router.post('/pay-all', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const userId = req.session.user.id;
  const buyerAccountName = req.body.buyer_account_name || null;
  const buyerAccountNumber = req.body.buyer_account_number || null;

  const sql = `
    SELECT o.*, p.user_id AS seller_id, p.budget,
           buyers.bank_name AS buyer_bank_name,
           buyers.account_name AS buyer_account_name,
           buyers.account_number AS buyer_account_number,
           sellers.bank_name AS seller_bank_name,
           sellers.account_name AS seller_account_name,
           sellers.account_number AS seller_account_number
    FROM orders o
    JOIN posts p ON o.post_id = p.id
    JOIN users AS sellers ON p.user_id = sellers.id
    JOIN users AS buyers ON o.user_id = buyers.id
    WHERE o.user_id = ?
  `;

  db.query(sql, [userId], (err, orders) => {
    if (err) {
      console.error('Error fetching orders for pay-all:', err);
      return res.status(500).send('Database error: ' + err.message);
    }
    if (!orders.length) return res.redirect('/order');

    const insertPayments = orders.map(order => [
      order.id,
      userId,
      order.seller_id,
      order.quantity * order.budget,
      'all',
      'paid',
      '-',
      order.buyer_bank_name,
      buyerAccountName,
      buyerAccountNumber,
      order.seller_bank_name,
      order.seller_account_name,
      order.seller_account_number
    ]);

    const paymentSql = `
      INSERT INTO payments
        (order_id, buyer_id, seller_id, amount, payment_method, payment_status, location,
         buyer_bank_name, buyer_account_name, buyer_account_number,
         seller_bank_name, seller_account_name, seller_account_number)
      VALUES ?
    `;

    db.query(paymentSql, [insertPayments], (err2) => {
      if (err2) {
        console.error('Error inserting multiple payments:', err2);
        return res.status(500).send('Database error: ' + err2.message);
      }
      res.redirect('/order?success=1');
    });
  });
});

// -------------------- SELLER VIEW --------------------
router.get('/seller-orders', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const sellerId = req.session.user.id;

  const sql = `
    SELECT orders.*, posts.title AS post_title, posts.image AS post_image, posts.budget,
           buyers.name AS buyer_name, buyers.phone AS buyer_phone, buyers.image AS buyer_image
    FROM orders
    JOIN posts ON orders.post_id = posts.id
    JOIN users AS buyers ON orders.user_id = buyers.id
    WHERE posts.user_id = ?
    ORDER BY orders.created_at DESC
  `;

  db.query(sql, [sellerId], (err, results) => {
    if (err) {
      console.error('Error fetching seller orders:', err);
      return res.status(500).send('Database error: ' + err.message);
    }

    results.forEach(order => {
      order.total_price = order.budget * (order.quantity || 1);
    });

    res.render('seller-orders', { user: req.session.user, orders: results });
  });
});

module.exports = router;
