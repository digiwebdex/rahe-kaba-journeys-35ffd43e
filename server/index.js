require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
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

      const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
      Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === '') return;

        const opMatch = key.match(/^(.+?)_(not_is|neq|gt|gte|lt|lte|ilike|in|is)$/);
        const column = opMatch ? opMatch[1] : key;
        const operator = opMatch ? opMatch[2] : 'eq';
        if (!validColumn(column)) return;

        if (operator === 'is') {
          if (String(value).toLowerCase() === 'null') conditions.push(`${column} IS NULL`);
          else {
            params.push(value);
            conditions.push(`${column} = $${params.length}`);
          }
          return;
        }

        if (operator === 'not_is') {
          if (String(value).toLowerCase() === 'null') conditions.push(`${column} IS NOT NULL`);
          else {
            params.push(value);
            conditions.push(`${column} <> $${params.length}`);
          }
          return;
        }

        if (operator === 'in') {
          const arr = String(value).split(',').filter(Boolean);
          if (!arr.length) return;
          params.push(arr);
          conditions.push(`${column} = ANY($${params.length})`);
          return;
        }

        const sqlOp = {
          eq: '=',
          neq: '<>',
          gt: '>',
          gte: '>=',
          lt: '<',
          lte: '<=',
          ilike: 'ILIKE',
        }[operator] || '=';

        params.push(operator === 'ilike' ? `%${String(value).replace(/%/g, '')}%` : value);
        conditions.push(`${column} ${sqlOp} $${params.length}`);
      });

      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ` ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(Number(limit) || 1000, Number(offset) || 0);

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

  // Create (supports single object or array of objects)
  router.post('/', writeAuth ? authenticate : optionalAuth, adminOnly ? requireRole('admin') : (req, res, next) => next(), async (req, res) => {
    try {
      const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
      const quote = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;
      const rows = Array.isArray(req.body) ? req.body : [req.body];
      const results = [];

      for (const rawRow of rows) {
        if (!rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) {
          return res.status(400).json({ error: 'Invalid payload format for insert' });
        }

        const entries = Object.entries(rawRow).filter(([key, value]) => validColumn(key) && value !== undefined);
        if (!entries.length) {
          return res.status(400).json({ error: 'No valid columns provided for insert' });
        }

        const keys = entries.map(([key]) => key);
        const values = entries.map(([, value]) => value);
        const placeholders = keys.map((_, i) => `$${i + 1}`);
        const sql = `INSERT INTO "${tableName}" (${keys.map(quote).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        console.log(`INSERT into ${tableName}:`, { sql, values, keys });
        const result = await query(sql, values);
        results.push(result.rows[0]);
      }

      res.status(201).json(Array.isArray(req.body) ? results : results[0]);
    } catch (err) {
      console.error(`POST /${tableName} error:`, err.message, 'Body:', JSON.stringify(req.body).substring(0, 500));
      res.status(500).json({ error: err.message });
    }
  });

  // Update
  router.patch('/:id', writeAuth ? authenticate : optionalAuth, adminOnly ? requireRole('admin') : (req, res, next) => next(), async (req, res) => {
    try {
      const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
      const quote = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;
      const entries = Object.entries(req.body || {}).filter(([key, value]) => validColumn(key) && value !== undefined);

      if (!entries.length) {
        return res.status(400).json({ error: 'No valid columns provided for update' });
      }

      const keys = entries.map(([key]) => key);
      const values = entries.map(([, value]) => value);
      const sets = keys.map((key, i) => `${quote(key)} = $${i + 1}`);
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

  // Bulk delete by filter (e.g. DELETE /api/payments?booking_id=xxx)
  router.delete('/', writeAuth ? authenticate : optionalAuth, adminOnly ? requireRole('admin') : (req, res, next) => next(), async (req, res) => {
    try {
      const filters = req.query;
      const keys = Object.keys(filters);
      if (!keys.length) return res.status(400).json({ error: 'Filter required for bulk delete' });
      const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
      const conditions = [];
      const params = [];
      keys.forEach((col) => {
        if (!validColumn(col)) return;
        params.push(filters[col]);
        conditions.push(`${col} = $${params.length}`);
      });
      if (!conditions.length) return res.status(400).json({ error: 'Valid filter required' });
      const result = await query(`DELETE FROM ${tableName} WHERE ${conditions.join(' AND ')} RETURNING id`, params);
      res.json({ message: 'Deleted', count: result.rowCount });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete by ID
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
// Custom bookings GET with JOINs (must be before generic CRUD)
app.get('/api/bookings', authenticate, async (req, res) => {
  try {
    const { limit = 1000, offset = 0, ...filters } = req.query;
    let conditions = [];
    let params = [];
    const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === '') return;
      const opMatch = key.match(/^(.+?)_(not_is|neq|gt|gte|lt|lte|ilike|in|is)$/);
      const column = opMatch ? opMatch[1] : key;
      const operator = opMatch ? opMatch[2] : 'eq';
      if (!validColumn(column)) return;
      
      const prefixedCol = `b.${column}`;
      if (operator === 'is') {
        if (String(value).toLowerCase() === 'null') conditions.push(`${prefixedCol} IS NULL`);
        else { params.push(value); conditions.push(`${prefixedCol} = $${params.length}`); }
        return;
      }
      if (operator === 'not_is') {
        if (String(value).toLowerCase() === 'null') conditions.push(`${prefixedCol} IS NOT NULL`);
        else { params.push(value); conditions.push(`${prefixedCol} <> $${params.length}`); }
        return;
      }
      if (operator === 'in') {
        const arr = String(value).split(',').filter(Boolean);
        if (!arr.length) return;
        params.push(arr);
        conditions.push(`${prefixedCol} = ANY($${params.length})`);
        return;
      }
      const sqlOp = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', ilike: 'ILIKE' }[operator] || '=';
      params.push(operator === 'ilike' ? `%${String(value).replace(/%/g, '')}%` : value);
      conditions.push(`${prefixedCol} ${sqlOp} $${params.length}`);
    });

    let sql = `SELECT b.*, 
      json_build_object('name', p.name, 'type', p.type, 'duration_days', p.duration_days, 'price', p.price) as packages,
      CASE WHEN m.id IS NOT NULL THEN json_build_object('name', m.name, 'phone', m.phone) ELSE NULL END as moallems
      FROM bookings b
      LEFT JOIN packages p ON b.package_id = p.id
      LEFT JOIN moallems m ON b.moallem_id = m.id`;
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit) || 1000, Number(offset) || 0);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/bookings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
app.use('/api/bookings', createCrudRoutes('bookings', { adminOnly: true }));
app.use('/api/payments', createCrudRoutes('payments', { adminOnly: true }));
app.use('/api/expenses', createCrudRoutes('expenses', { adminOnly: true }));
app.use('/api/transactions', createCrudRoutes('transactions', { adminOnly: true }));
app.use('/api/profiles', createCrudRoutes('profiles', { adminOnly: true }));
app.use('/api/accounts', createCrudRoutes('accounts', { adminOnly: true }));
app.use('/api/moallems', createCrudRoutes('moallems', { adminOnly: true }));
// Custom moallem_payments GET with JOINs
app.get('/api/moallem-payments', authenticate, async (req, res) => {
  try {
    const { limit = 1000, offset = 0, ...filters } = req.query;
    let conditions = [];
    let params = [];
    const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === '') return;
      const opMatch = key.match(/^(.+?)_(not_is|neq|gt|gte|lt|lte|ilike|in|is)$/);
      const column = opMatch ? opMatch[1] : key;
      const operator = opMatch ? opMatch[2] : 'eq';
      if (!validColumn(column)) return;
      const prefixedCol = `mp.${column}`;
      if (operator === 'is') {
        if (String(value).toLowerCase() === 'null') conditions.push(`${prefixedCol} IS NULL`);
        else { params.push(value); conditions.push(`${prefixedCol} = $${params.length}`); }
        return;
      }
      if (operator === 'not_is') {
        if (String(value).toLowerCase() === 'null') conditions.push(`${prefixedCol} IS NOT NULL`);
        else { params.push(value); conditions.push(`${prefixedCol} <> $${params.length}`); }
        return;
      }
      if (operator === 'in') {
        const arr = String(value).split(',').filter(Boolean);
        if (!arr.length) return;
        params.push(arr);
        conditions.push(`${prefixedCol} = ANY($${params.length})`);
        return;
      }
      const sqlOp = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', ilike: 'ILIKE' }[operator] || '=';
      params.push(operator === 'ilike' ? `%${String(value).replace(/%/g, '')}%` : value);
      conditions.push(`${prefixedCol} ${sqlOp} $${params.length}`);
    });
    let sql = `SELECT mp.*,
      CASE WHEN m.id IS NOT NULL THEN json_build_object('name', m.name, 'phone', m.phone) ELSE NULL END as moallems,
      CASE WHEN b.id IS NOT NULL THEN json_build_object('tracking_id', b.tracking_id, 'total_amount', b.total_amount, 'paid_amount', b.paid_amount, 'due_amount', b.due_amount, 'paid_by_moallem', b.paid_by_moallem, 'moallem_due', b.moallem_due, 'guest_name', b.guest_name, 'packages', json_build_object('name', p.name, 'type', p.type)) ELSE NULL END as bookings
      FROM moallem_payments mp
      LEFT JOIN moallems m ON mp.moallem_id = m.id
      LEFT JOIN bookings b ON mp.booking_id = b.id
      LEFT JOIN packages p ON b.package_id = p.id`;
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY mp.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit) || 1000, Number(offset) || 0);
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/moallem-payments error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
app.use('/api/moallem-payments', createCrudRoutes('moallem_payments', { adminOnly: true }));
app.use('/api/moallem-commission-payments', createCrudRoutes('moallem_commission_payments', { adminOnly: true }));
app.use('/api/moallem-items', createCrudRoutes('moallem_items', { adminOnly: true }));
app.use('/api/supplier-agents', createCrudRoutes('supplier_agents', { adminOnly: true }));
// Custom supplier_agent_payments GET with JOINs
app.get('/api/supplier-agent-payments', authenticate, async (req, res) => {
  try {
    const { limit = 1000, offset = 0, ...filters } = req.query;
    let conditions = [];
    let params = [];
    const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === '') return;
      const opMatch = key.match(/^(.+?)_(not_is|neq|gt|gte|lt|lte|ilike|in|is)$/);
      const column = opMatch ? opMatch[1] : key;
      const operator = opMatch ? opMatch[2] : 'eq';
      if (!validColumn(column)) return;
      const prefixedCol = `sp.${column}`;
      if (operator === 'is') {
        if (String(value).toLowerCase() === 'null') conditions.push(`${prefixedCol} IS NULL`);
        else { params.push(value); conditions.push(`${prefixedCol} = $${params.length}`); }
        return;
      }
      if (operator === 'not_is') {
        if (String(value).toLowerCase() === 'null') conditions.push(`${prefixedCol} IS NOT NULL`);
        else { params.push(value); conditions.push(`${prefixedCol} <> $${params.length}`); }
        return;
      }
      if (operator === 'in') {
        const arr = String(value).split(',').filter(Boolean);
        if (!arr.length) return;
        params.push(arr);
        conditions.push(`${prefixedCol} = ANY($${params.length})`);
        return;
      }
      const sqlOp = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', ilike: 'ILIKE' }[operator] || '=';
      params.push(operator === 'ilike' ? `%${String(value).replace(/%/g, '')}%` : value);
      conditions.push(`${prefixedCol} ${sqlOp} $${params.length}`);
    });
    let sql = `SELECT sp.*,
      CASE WHEN sa.id IS NOT NULL THEN json_build_object('agent_name', sa.agent_name, 'company_name', sa.company_name) ELSE NULL END as supplier_agents,
      CASE WHEN b.id IS NOT NULL THEN json_build_object('tracking_id', b.tracking_id, 'total_amount', b.total_amount, 'total_cost', b.total_cost, 'paid_to_supplier', b.paid_to_supplier, 'supplier_due', b.supplier_due, 'guest_name', b.guest_name, 'packages', json_build_object('name', p.name, 'type', p.type)) ELSE NULL END as bookings
      FROM supplier_agent_payments sp
      LEFT JOIN supplier_agents sa ON sp.supplier_agent_id = sa.id
      LEFT JOIN bookings b ON sp.booking_id = b.id
      LEFT JOIN packages p ON b.package_id = p.id`;
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY sp.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit) || 1000, Number(offset) || 0);
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/supplier-agent-payments error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
app.use('/api/supplier-agent-payments', createCrudRoutes('supplier_agent_payments', { adminOnly: true }));
app.use('/api/supplier-agent-items', createCrudRoutes('supplier_agent_items', { adminOnly: true }));
app.use('/api/supplier-contracts', createCrudRoutes('supplier_contracts', { adminOnly: true }));
app.use('/api/supplier-contract-payments', createCrudRoutes('supplier_contract_payments', { adminOnly: true }));
app.use('/api/booking-members', createCrudRoutes('booking_members', { adminOnly: true }));
app.use('/api/booking-documents', createCrudRoutes('booking_documents'));
app.use('/api/hotel-bookings', createCrudRoutes('hotel_bookings'));
app.use('/api/notification-logs', createCrudRoutes('notification_logs', { adminOnly: true }));
app.use('/api/notification-settings', createCrudRoutes('notification_settings', { adminOnly: true, orderBy: 'event_key ASC' }));
app.use('/api/company-settings', createCrudRoutes('company_settings', { adminOnly: true }));
app.use('/api/cms-versions', createCrudRoutes('cms_versions', { adminOnly: true }));
app.use('/api/user-roles', createCrudRoutes('user_roles', { adminOnly: true }));

// SECURITY: Block admin role assignment via API
app.use('/api/user-roles', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PATCH') {
    const role = req.body?.role;
    if (role === 'admin') {
      return res.status(403).json({ error: 'Cannot assign admin role. Admin role is permanently locked.' });
    }
  }
  // Block deletion of admin role
  if (req.method === 'DELETE') {
    // Will be enforced by DB trigger too
  }
  next();
});

app.use('/api/financial-summary', createCrudRoutes('financial_summary', { adminOnly: true }));
app.use('/api/daily-cashbook', createCrudRoutes('daily_cashbook', { adminOnly: true }));

// =============================================
// BACKUP / RESTORE ROUTES
// =============================================
const BACKUP_TABLES = [
  'profiles', 'bookings', 'booking_members', 'booking_documents',
  'payments', 'packages', 'installment_plans',
  'hotels', 'hotel_rooms', 'hotel_bookings',
  'moallems', 'moallem_payments', 'moallem_commission_payments', 'moallem_items',
  'supplier_agents', 'supplier_agent_payments', 'supplier_agent_items',
  'supplier_contracts', 'supplier_contract_payments',
  'expenses', 'transactions', 'accounts', 'financial_summary',
  'notification_logs', 'notification_settings',
  'user_roles', 'site_content', 'company_settings',
  'blog_posts', 'cms_versions', 'daily_cashbook',
];

const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

// List backups
app.get('/api/backup/list', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await fsp.mkdir(backupsDir, { recursive: true });
    const entries = await fsp.readdir(backupsDir, { withFileTypes: true });
    const files = await Promise.all(
      entries.filter(e => e.isFile() && e.name.endsWith('.json')).map(async e => {
        const stat = await fsp.stat(path.join(backupsDir, e.name));
        return { name: e.name, created_at: stat.birthtime.toISOString(), size: stat.size };
      })
    );
    res.json(files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create backup
app.post('/api/backup/create', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const backupData = {};
    const stats = [];
    for (const table of BACKUP_TABLES) {
      try {
        const result = await query(`SELECT * FROM ${table}`);
        backupData[table] = result.rows;
        stats.push({ name: table, rows: result.rows.length });
      } catch (e) {
        stats.push({ name: table, rows: -1, error: e.message });
      }
    }
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${timestamp}.json`;
    const jsonStr = JSON.stringify({ created_at: now.toISOString(), tables: backupData, stats }, null, 2);
    await fsp.writeFile(path.join(backupsDir, fileName), jsonStr);
    res.json({ success: true, fileName, tables: stats.length, size: jsonStr.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore backup
app.post('/api/backup/restore', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { fileName, mode } = req.body;
    if (!fileName) return res.status(400).json({ error: 'fileName required' });
    const filePath = path.join(backupsDir, path.basename(fileName));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup not found' });
    const raw = await fsp.readFile(filePath, 'utf-8');
    const backup = JSON.parse(raw);
    const results = [];

    for (const [table, rows] of Object.entries(backup.tables || {})) {
      if (!Array.isArray(rows) || rows.length === 0) {
        results.push({ table, status: 'skipped', reason: 'empty' });
        continue;
      }
      try {
        if (mode === 'full') {
          await query(`DELETE FROM ${table}`);
        }
        const keys = Object.keys(rows[0]);
        const quote = (id) => `"${String(id).replace(/"/g, '""')}"`;
        for (const row of rows) {
          const values = keys.map(k => row[k]);
          const placeholders = keys.map((_, i) => `$${i + 1}`);
          const sql = mode === 'full'
            ? `INSERT INTO ${table} (${keys.map(quote).join(',')}) VALUES (${placeholders.join(',')}) ON CONFLICT DO NOTHING`
            : `INSERT INTO ${table} (${keys.map(quote).join(',')}) VALUES (${placeholders.join(',')}) ON CONFLICT (id) DO UPDATE SET ${keys.filter(k => k !== 'id').map((k, i) => `${quote(k)} = EXCLUDED.${quote(k)}`).join(', ')}`;
          await query(sql, values);
        }
        results.push({ table, status: 'restored', rows: rows.length });
      } catch (e) {
        results.push({ table, status: 'error', error: e.message });
      }
    }
    const restored = results.filter(r => r.status === 'restored').length;
    res.json({ success: true, restored, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download backup
app.get('/api/backup/download', authenticate, requireRole('admin'), (req, res) => {
  const file = path.basename(req.query.file || '');
  const filePath = path.join(backupsDir, file);
  if (!file || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  res.download(filePath, file);
});

// Delete backup
app.post('/api/backup/delete', authenticate, requireRole('admin'), async (req, res) => {
  const file = path.basename(req.body?.fileName || '');
  const filePath = path.join(backupsDir, file);
  if (!file || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  await fsp.unlink(filePath);
  res.json({ message: 'Deleted' });
});

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

// File + Storage helpers
const sanitizeStoragePath = (input = '') =>
  String(input)
    .replace(/\\/g, '/')
    .split('/')
    .filter((p) => p && p !== '.' && p !== '..')
    .join('/');

const uploadsRoot = path.join(__dirname, 'uploads');

// File upload
app.post('/api/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const bucket = sanitizeStoragePath(req.body?.bucket || 'misc');
    const requestedPath = sanitizeStoragePath(req.body?.path || req.file.originalname);
    const finalRelative = path.join(bucket, requestedPath).replace(/\\/g, '/');
    const finalAbsolute = path.join(uploadsRoot, finalRelative);

    await fsp.mkdir(path.dirname(finalAbsolute), { recursive: true });
    await fsp.rename(req.file.path, finalAbsolute);

    res.json({
      file_path: `/uploads/${finalRelative}`,
      file_name: req.file.originalname,
      file_size: req.file.size,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Storage list
app.get('/api/storage/:bucket/list', authenticate, async (req, res) => {
  try {
    const bucket = sanitizeStoragePath(req.params.bucket);
    const prefix = sanitizeStoragePath(req.query.prefix || '');
    const dirPath = path.join(uploadsRoot, bucket, prefix);
    await fsp.mkdir(dirPath, { recursive: true });
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });

    const files = await Promise.all(
      entries
        .filter((e) => e.isFile())
        .map(async (e) => {
          const full = path.join(dirPath, e.name);
          const stat = await fsp.stat(full);
          return {
            name: e.name,
            id: `${bucket}/${prefix}/${e.name}`.replace(/\/+/g, '/'),
            created_at: stat.birthtime.toISOString(),
            updated_at: stat.mtime.toISOString(),
            metadata: { size: stat.size },
          };
        })
    );

    res.json(files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Storage download
app.get('/api/storage/:bucket/download', authenticate, async (req, res) => {
  try {
    const bucket = sanitizeStoragePath(req.params.bucket);
    const filePath = sanitizeStoragePath(req.query.path || '');
    if (!filePath) return res.status(400).json({ error: 'File path required' });

    const absolutePath = path.join(uploadsRoot, bucket, filePath);
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ error: 'File not found' });

    res.download(absolutePath, path.basename(filePath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Storage delete
app.delete('/api/storage/:bucket', authenticate, async (req, res) => {
  try {
    const bucket = sanitizeStoragePath(req.params.bucket);
    const paths = Array.isArray(req.body?.paths) ? req.body.paths : [];

    for (const p of paths) {
      const safe = sanitizeStoragePath(p);
      if (!safe) continue;
      const absolutePath = path.join(uploadsRoot, bucket, safe);
      if (fs.existsSync(absolutePath)) await fsp.unlink(absolutePath);
    }

    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
