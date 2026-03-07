require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { query } = require('./config/database');
const { authenticate, requireRole, optionalAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// =============================================
// AUTH ROUTES
// =============================================
app.use('/api/auth', authRoutes);

// =============================================
// GENERIC CRUD HELPER
// =============================================
const createCrudRoutes = (tableName, options = {}) => {
  const router = express.Router();
  const { readAuth = true, writeAuth = true, adminOnly = false, selectFields = '*', orderBy = 'created_at DESC' } = options;

  // List
  router.get('/', readAuth ? authenticate : optionalAuth, async (req, res) => {
    try {
      const { limit = 1000, offset = 0, ...filters } = req.query;
      let sql = `SELECT ${selectFields} FROM ${tableName}`;
      const params = [];
      const conditions = [];

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.push(value);
          conditions.push(`${key} = $${params.length}`);
        }
      });

      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ` ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await query(sql, params);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get by ID
  router.get('/:id', readAuth ? authenticate : optionalAuth, async (req, res) => {
    try {
      const result = await query(`SELECT ${selectFields} FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create
  router.post('/', writeAuth ? authenticate : optionalAuth, adminOnly ? requireRole('admin') : (req, res, next) => next(), async (req, res) => {
    try {
      const keys = Object.keys(req.body);
      const values = Object.values(req.body);
      const placeholders = keys.map((_, i) => `$${i + 1}`);
      const result = await query(
        `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        values
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update
  router.patch('/:id', writeAuth ? authenticate : optionalAuth, adminOnly ? requireRole('admin') : (req, res, next) => next(), async (req, res) => {
    try {
      const keys = Object.keys(req.body);
      const values = Object.values(req.body);
      const sets = keys.map((key, i) => `${key} = $${i + 1}`);
      values.push(req.params.id);
      const result = await query(
        `UPDATE ${tableName} SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete
  router.delete('/:id', writeAuth ? authenticate : optionalAuth, adminOnly ? requireRole('admin') : (req, res, next) => next(), async (req, res) => {
    try {
      const result = await query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING id`, [req.params.id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

// =============================================
// ENTITY ROUTES
// =============================================

// Public routes (no auth)
app.use('/api/packages', createCrudRoutes('packages', { readAuth: false, writeAuth: true, adminOnly: true }));
app.use('/api/hotels', createCrudRoutes('hotels', { readAuth: false, writeAuth: true, adminOnly: true }));
app.use('/api/hotel-rooms', createCrudRoutes('hotel_rooms', { readAuth: false, writeAuth: true, adminOnly: true }));
app.use('/api/site-content', createCrudRoutes('site_content', { readAuth: false, writeAuth: true, adminOnly: true }));
app.use('/api/blog-posts', createCrudRoutes('blog_posts', { readAuth: false, writeAuth: true, adminOnly: true }));
app.use('/api/installment-plans', createCrudRoutes('installment_plans', { readAuth: false, writeAuth: true, adminOnly: true }));

// Auth required routes
app.use('/api/bookings', createCrudRoutes('bookings', { adminOnly: true }));
app.use('/api/payments', createCrudRoutes('payments', { adminOnly: true }));
app.use('/api/expenses', createCrudRoutes('expenses', { adminOnly: true }));
app.use('/api/transactions', createCrudRoutes('transactions', { adminOnly: true }));
app.use('/api/profiles', createCrudRoutes('profiles', { adminOnly: true }));
app.use('/api/accounts', createCrudRoutes('accounts', { adminOnly: true }));
app.use('/api/moallems', createCrudRoutes('moallems', { adminOnly: true }));
app.use('/api/moallem-payments', createCrudRoutes('moallem_payments', { adminOnly: true }));
app.use('/api/moallem-commission-payments', createCrudRoutes('moallem_commission_payments', { adminOnly: true }));
app.use('/api/supplier-agents', createCrudRoutes('supplier_agents', { adminOnly: true }));
app.use('/api/supplier-agent-payments', createCrudRoutes('supplier_agent_payments', { adminOnly: true }));
app.use('/api/supplier-contracts', createCrudRoutes('supplier_contracts', { adminOnly: true }));
app.use('/api/supplier-contract-payments', createCrudRoutes('supplier_contract_payments', { adminOnly: true }));
app.use('/api/booking-members', createCrudRoutes('booking_members', { adminOnly: true }));
app.use('/api/booking-documents', createCrudRoutes('booking_documents'));
app.use('/api/hotel-bookings', createCrudRoutes('hotel_bookings'));
app.use('/api/notification-logs', createCrudRoutes('notification_logs', { adminOnly: true }));
app.use('/api/notification-settings', createCrudRoutes('notification_settings', { adminOnly: true }));
app.use('/api/company-settings', createCrudRoutes('company_settings', { adminOnly: true }));
app.use('/api/cms-versions', createCrudRoutes('cms_versions', { adminOnly: true }));
app.use('/api/user-roles', createCrudRoutes('user_roles', { adminOnly: true }));
app.use('/api/financial-summary', createCrudRoutes('financial_summary', { adminOnly: true }));

// =============================================
// SPECIAL ROUTES
// =============================================

// Bookings with joins (like supabase select with relations)
app.get('/api/bookings-full', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT b.*, p.name as package_name, p.type as package_type, p.duration_days, p.price as package_price,
             m.name as moallem_name, m.phone as moallem_phone
      FROM bookings b
      LEFT JOIN packages p ON b.package_id = p.id
      LEFT JOIN moallems m ON b.moallem_id = m.id
      ORDER BY b.created_at DESC
    `);
    // Format to match supabase nested structure
    const bookings = result.rows.map(row => ({
      ...row,
      packages: { name: row.package_name, type: row.package_type, duration_days: row.duration_days, price: row.package_price },
      moallems: row.moallem_name ? { name: row.moallem_name, phone: row.moallem_phone } : null,
    }));
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Views
app.get('/api/views/booking-profit', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM v_booking_profit ORDER BY tracking_id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/views/customer-profit', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM v_customer_profit');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/views/package-profit', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM v_package_profit');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Track booking (public)
app.get('/api/track/:trackingId', async (req, res) => {
  try {
    const result = await query(`
      SELECT b.id, b.tracking_id, b.status, b.total_amount, b.paid_amount, b.due_amount,
             b.num_travelers, b.guest_name, b.created_at,
             p.name as package_name, p.type as package_type, p.duration_days
      FROM bookings b LEFT JOIN packages p ON b.package_id = p.id
      WHERE b.tracking_id = $1
    `, [req.params.trackingId.toUpperCase()]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });

    const payments = await query(
      'SELECT amount, status, due_date, paid_at, installment_number FROM payments WHERE booking_id = $1 ORDER BY installment_number',
      [result.rows[0].id]
    );
    res.json({ booking: result.rows[0], payments: payments.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// File upload
app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    file_path: `/uploads/${req.file.filename}`,
    file_name: req.file.originalname,
    file_size: req.file.size,
  });
});

// =============================================
// SERVE FRONTEND (production)
// =============================================
const frontendPath = path.join(__dirname, '..', 'dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

// =============================================
// START
// =============================================
app.listen(PORT, () => {
  console.log(`🚀 Rahe Kaba API running on port ${PORT}`);
  console.log(`📁 Serving frontend from ${frontendPath}`);
});
