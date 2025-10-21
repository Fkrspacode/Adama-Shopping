// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // MySQL connection
const ExcelJS = require('exceljs');

// -------------------- ADMIN LOGIN PAGE --------------------
router.get('/login', (req, res) => {
  res.render('adminLogin', { error: null });
});

// -------------------- HANDLE ADMIN LOGIN --------------------
router.post('/login', (req, res) => {
  const password = (req.body.password || '').trim();

  if (password === '12222') { // ⚠️ Replace with env variable in production
    req.session.isAdmin = true;
    res.redirect('/admin/payments');
  } else {
    res.render('adminLogin', { error: 'Invalid admin password!' });
  }
});

// -------------------- ADMIN CHECK MIDDLEWARE --------------------
function isAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.redirect('/admin/login');
}

// -------------------- LIST ALL USERS --------------------
router.get('/users', isAdmin, (req, res) => {
  const sql = `SELECT id, name, email, phone, is_verified, active, image FROM users`;
  db.query(sql, (err, users) => {
    if (err) return res.status(500).send('Database error: ' + err.message);
    res.render('adminUsers', { users });
  });
});

// -------------------- VERIFY/UNVERIFY USER --------------------
router.post('/users/verify/:id', isAdmin, (req, res) => {
  db.query(`UPDATE users SET is_verified = 1 WHERE id = ?`, [req.params.id], (err) => {
    if (err) return res.status(500).send('Database error: ' + err.message);
    res.redirect('/admin/users');
  });
});

router.post('/users/unverify/:id', isAdmin, (req, res) => {
  db.query(`UPDATE users SET is_verified = 0 WHERE id = ?`, [req.params.id], (err) => {
    if (err) return res.status(500).send('Database error: ' + err.message);
    res.redirect('/admin/users');
  });
});

// -------------------- TOGGLE USER ACTIVE/INACTIVE --------------------
router.post('/users/toggle/:id', isAdmin, (req, res) => {
  const userId = req.params.id;
  db.query('SELECT active FROM users WHERE id = ?', [userId], (err, result) => {
    if (err) return res.status(500).send('Database error: ' + err.message);
    if (result.length === 0) return res.status(404).send('User not found');

    const newStatus = result[0].active ? 0 : 1;
    db.query('UPDATE users SET active = ? WHERE id = ?', [newStatus, userId], (err2) => {
      if (err2) return res.status(500).send('Database error: ' + err2.message);
      res.redirect('/admin/users');
    });
  });
});

// -------------------- ADMIN PAYMENTS DASHBOARD --------------------
router.get('/payments', isAdmin, (req, res) => {
  const sql = `
    SELECT 
      pay.id AS payment_id,
      pay.amount, 
      pay.payment_status, 
      pay.created_at,
      pay.location,
      o.quantity, 
      o.payment_method,
      pay.buyer_account_name,
      pay.buyer_account_number,
      buyer.name AS buyer_name, 
      buyer.image AS buyer_image,
      seller.name AS seller_name, 
      seller.phone AS seller_phone, 
      seller.image AS seller_image,
      posts.title AS post_title, 
      posts.image AS post_image,
      posts.category AS seller_category
    FROM payments pay
    JOIN orders o ON pay.order_id = o.id
    JOIN users buyer ON pay.buyer_id = buyer.id
    JOIN users seller ON pay.seller_id = seller.id
    JOIN posts ON o.post_id = posts.id
    ORDER BY pay.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).send('Database error: ' + err.message);

    let totalPaid = 0, totalUnpaid = 0;
    results.forEach(p => {
      const amount = Number(p.amount) || 0;
      const status = (p.payment_status || '').toLowerCase();
      if (status === 'paid') totalPaid += amount;
      else totalUnpaid += amount;
    });

    res.render('admin-payments', { payments: results, totals: { totalPaid, totalUnpaid } });
  });
});

// -------------------- UPDATE PAYMENT STATUS (CHECK / UNCHECK) --------------------
router.post('/payments/update/:id', isAdmin, (req, res) => {
  const { status } = req.body;
  const sql = `UPDATE payments SET payment_status = ? WHERE id = ?`;
  db.query(sql, [status, req.params.id], (err) => {
    if (err) return res.status(500).send('Database error: ' + err.message);
    res.redirect('/admin/payments');
  });
});

// -------------------- DELETE PAYMENT --------------------
router.post('/payments/delete/:id', isAdmin, (req, res) => {
  const paymentId = req.params.id;
  const sql = `DELETE FROM payments WHERE id = ?`;
  db.query(sql, [paymentId], (err) => {
    if (err) return res.status(500).send('Database error: ' + err.message);
    res.redirect('/admin/payments');
  });
});

// -------------------- SAVE BUYER LOCATION --------------------
router.post('/payments/location/:id', isAdmin, (req, res) => {
  const { location } = req.body;
  const paymentId = req.params.id;

  const sql = `UPDATE payments SET location = ? WHERE id = ?`;
  db.query(sql, [location, paymentId], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    res.json({ success: true });
  });
});

// -------------------- EXPORT PAYMENTS TO EXCEL --------------------
router.get('/export-payments', isAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT 
        pay.id AS payment_id, 
        pay.amount, 
        pay.payment_status, 
        pay.created_at,
        pay.location,
        o.quantity, 
        o.payment_method,
        pay.buyer_account_name,
        pay.buyer_account_number,
        buyer.name AS buyer_name, 
        buyer.phone AS buyer_phone,
        seller.name AS seller_name, 
        seller.phone AS seller_phone,
        posts.title AS post_title
      FROM payments pay
      JOIN orders o ON pay.order_id = o.id
      JOIN users buyer ON pay.buyer_id = buyer.id
      JOIN users seller ON pay.seller_id = seller.id
      JOIN posts ON o.post_id = posts.id
      ORDER BY pay.created_at DESC
    `;

    db.query(sql, async (err, results) => {
      if (err) return res.status(500).send('Database error: ' + err.message);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Payments Report');

      sheet.columns = [
        { header: 'ID', key: 'payment_id', width: 10 },
        { header: 'Post Title', key: 'post_title', width: 25 },
        { header: 'Buyer Name', key: 'buyer_name', width: 20 },
        { header: 'Buyer Phone', key: 'buyer_phone', width: 15 },
        { header: 'Buyer Account Name', key: 'buyer_account_name', width: 25 },
        { header: 'Buyer Account Number', key: 'buyer_account_number', width: 20 },
        { header: 'Seller Name', key: 'seller_name', width: 20 },
        { header: 'Seller Phone', key: 'seller_phone', width: 15 },
        { header: 'Location', key: 'location', width: 25 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Amount (ETB)', key: 'amount', width: 15 },
        { header: 'Payment Method', key: 'payment_method', width: 15 },
        { header: 'Status', key: 'payment_status', width: 10 },
        { header: 'Date', key: 'created_at', width: 20 },
      ];

      let totalPaid = 0, totalUnpaid = 0;
      results.forEach(p => {
        const amount = Number(p.amount) || 0;
        const status = (p.payment_status || '').toLowerCase();

        sheet.addRow({
          payment_id: p.payment_id,
          post_title: p.post_title || '-',
          buyer_name: p.buyer_name || '-',
          buyer_phone: p.buyer_phone || '-',
          buyer_account_name: p.buyer_account_name || '-',
          buyer_account_number: p.buyer_account_number || '-',
          seller_name: p.seller_name || '-',
          seller_phone: p.seller_phone || '-',
          location: p.location || '-',
          quantity: p.quantity || 0,
          amount,
          payment_method: p.payment_method || '-',
          payment_status: (p.payment_status || '').toUpperCase(),
          created_at: p.created_at ? new Date(p.created_at).toLocaleString() : '-',
        });

        if (status === 'paid') totalPaid += amount;
        else totalUnpaid += amount;
      });

      if (results.length > 0) {
        sheet.addRow([]);
        sheet.addRow({ post_title: 'TOTAL PAID', amount: totalPaid, payment_status: 'PAID' });
        sheet.addRow({ post_title: 'TOTAL UNPAID', amount: totalUnpaid, payment_status: 'UNPAID' });
        sheet.getRow(sheet.lastRow.number).font = { bold: true };
        sheet.getRow(sheet.lastRow.number - 1).font = { bold: true };
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=payments_report.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    });
  } catch (error) {
    res.status(500).send('Error generating Excel file: ' + error.message);
  }
});

// -------------------- ADMIN LOGOUT --------------------
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

module.exports = router;
