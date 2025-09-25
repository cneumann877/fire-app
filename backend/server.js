const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cron = require('node-cron');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'fire_admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'fire_department',
  password: process.env.DB_PASSWORD || 'secure_password',
  port: process.env.DB_PORT || 5432,
});

// FirstDue configuration
const FIRSTDUE_BASE_URL = 'https://sizeup.firstduesizeup.com/fd-api/v1';
let firstDueToken = null;

// Middleware for authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// FirstDue API authentication
const authenticateFirstDue = async () => {
  try {
    const response = await axios.post(`${FIRSTDUE_BASE_URL}/auth/token`, {
      grant_type: 'client_credentials',
      email: process.env.FIRSTDUE_EMAIL,
      password: process.env.FIRSTDUE_PASSWORD
    });
    
    firstDueToken = response.data.access_token;
    console.log('FirstDue authentication successful');
    
    // Schedule token refresh (expires in 1209600 seconds = 14 days)
    setTimeout(authenticateFirstDue, 12 * 24 * 60 * 60 * 1000); // Refresh every 12 days
  } catch (error) {
    console.error('FirstDue authentication failed:', error.message);
  }
};

// Initialize FirstDue authentication
authenticateFirstDue();

// Utility functions
const calculateVacationDays = (yearsOfService) => {
  if (yearsOfService <= 5) return 11;
  if (yearsOfService <= 7) return 14;
  if (yearsOfService <= 9) return 15;
  if (yearsOfService <= 11) return 16;
  if (yearsOfService <= 13) return 17;
  if (yearsOfService <= 15) return 18;
  if (yearsOfService <= 17) return 19;
  if (yearsOfService === 18) return 20;
  if (yearsOfService === 19) return 21;
  if (yearsOfService === 20) return 22;
  if (yearsOfService === 21) return 23;
  if (yearsOfService <= 24) return 24;
  return 25;
};

// AUTH ROUTES
app.post('/api/auth/login', async (req, res) => {
  try {
    const { badge, pin } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM personnel WHERE badge = $1',
      [badge]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPin = await bcrypt.compare(pin, user.pin);
    
    if (!validPin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, badge: user.badge, name: user.name, rank: user.rank },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        badge: user.badge,
        rank: user.rank
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DASHBOARD ROUTES
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get recent incidents (last 2 days)
    const incidentsResult = await pool.query(`
      SELECT * FROM incidents 
      WHERE created_at >= NOW() - INTERVAL '2 days'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    // Get upcoming events
    const eventsResult = await pool.query(`
      SELECT * FROM events 
      WHERE date >= NOW() AND event_type = 'event'
      ORDER BY date ASC
      LIMIT 5
    `);
    
    // Get upcoming training
    const trainingResult = await pool.query(`
      SELECT * FROM events 
      WHERE date >= NOW() AND event_type = 'training'
      ORDER BY date ASC
      LIMIT 5
    `);
    
    res.json({
      incidents: incidentsResult.rows,
      events: eventsResult.rows,
      training: trainingResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// INCIDENT ROUTES
app.get('/api/incidents', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, 
        COALESCE(json_agg(
          json_build_object(
            'personnel_id', ia.personnel_id,
            'apparatus_code', ia.apparatus_code,
            'signed_in_at', ia.signed_in_at
          )
        ) FILTER (WHERE ia.id IS NOT NULL), '[]') as attendance
      FROM incidents i
      LEFT JOIN incident_attendance ia ON i.id = ia.incident_id
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/incidents/:id/signin', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { apparatus_code } = req.body;
    const personnel_id = req.user.id;
    
    // Check if incident exists and is active
    const incidentResult = await pool.query(
      'SELECT * FROM incidents WHERE id = $1 AND status = $2',
      [id, 'active']
    );
    
    if (incidentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active incident not found' });
    }
    
    // Check if already signed in
    const existingSignIn = await pool.query(
      'SELECT * FROM incident_attendance WHERE incident_id = $1 AND personnel_id = $2',
      [id, personnel_id]
    );
    
    if (existingSignIn.rows.length > 0) {
      return res.status(400).json({ error: 'Already signed in to this incident' });
    }
    
    // Sign in to incident
    await pool.query(
      'INSERT INTO incident_attendance (incident_id, personnel_id, apparatus_code, signed_in_at) VALUES ($1, $2, $3, NOW())',
      [id, personnel_id, apparatus_code]
    );
    
    // Update station status if needed
    let stationColumn = '';
    if (apparatus_code.includes('1') || apparatus_code === 'ER1') stationColumn = 'station_1_status';
    else if (apparatus_code.includes('2') || apparatus_code === 'ER2') stationColumn = 'station_2_status';
    else if (apparatus_code.includes('3') || apparatus_code === 'ER3') stationColumn = 'station_3_status';
    
    if (stationColumn) {
      await pool.query(
        `UPDATE incidents SET ${stationColumn} = $1 WHERE id = $2`,
        ['signed_in', id]
      );
    }
    
    res.json({ message: 'Successfully signed in to incident' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/incidents/:id/complete-station', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { station } = req.body;
    
    let stationColumn = '';
    if (station === 'Station 1') stationColumn = 'station_1_status';
    else if (station === 'Station 2') stationColumn = 'station_2_status';
    else if (station === 'Station 3') stationColumn = 'station_3_status';
    
    if (!stationColumn) {
      return res.status(400).json({ error: 'Invalid station' });
    }
    
    await pool.query(
      `UPDATE incidents SET ${stationColumn} = $1 WHERE id = $2`,
      ['complete', id]
    );
    
    // Check if all stations are complete
    const result = await pool.query(
      'SELECT station_1_status, station_2_status, station_3_status FROM incidents WHERE id = $1',
      [id]
    );
    
    const incident = result.rows[0];
    if (incident.station_1_status === 'complete' && 
        incident.station_2_status === 'complete' && 
        incident.station_3_status === 'complete') {
      await pool.query(
        'UPDATE incidents SET status = $1 WHERE id = $2',
        ['closed', id]
      );
    }
    
    res.json({ message: 'Station completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// EVENTS & TRAINING ROUTES
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*,
        COALESCE(json_agg(
          json_build_object(
            'personnel_id', ea.personnel_id,
            'signed_in_at', ea.signed_in_at
          )
        ) FILTER (WHERE ea.id IS NOT NULL), '[]') as attendance
      FROM events e
      LEFT JOIN event_attendance ea ON e.id = ea.event_id
      GROUP BY e.id
      ORDER BY e.date DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/events', authenticateToken, async (req, res) => {
  try {
    const { name, type, date, duration, location, instructor, event_type } = req.body;
    const id = Date.now().toString();
    
    await pool.query(`
      INSERT INTO events (id, name, type, date, duration, location, instructor, event_type, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [id, name, type, date, duration, location, instructor, event_type, req.user.id]);
    
    res.json({ id, message: 'Event created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/events/:id/signin', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const personnel_id = req.user.id;
    
    // Check if event exists
    const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Check if already signed in
    const existingSignIn = await pool.query(
      'SELECT * FROM event_attendance WHERE event_id = $1 AND personnel_id = $2',
      [id, personnel_id]
    );
    
    if (existingSignIn.rows.length > 0) {
      return res.status(400).json({ error: 'Already signed in to this event' });
    }
    
    await pool.query(
      'INSERT INTO event_attendance (event_id, personnel_id, signed_in_at) VALUES ($1, $2, NOW())',
      [id, personnel_id]
    );
    
    res.json({ message: 'Successfully signed in to event' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// VACATION ROUTES
app.get('/api/vacation/days/:badge', authenticateToken, async (req, res) => {
  try {
    const { badge } = req.params;
    
    const result = await pool.query(
      'SELECT years_of_service, vacation_days_used FROM personnel WHERE badge = $1',
      [badge]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Personnel not found' });
    }
    
    const { years_of_service, vacation_days_used } = result.rows[0];
    const totalDays = calculateVacationDays(years_of_service);
    const remainingDays = totalDays - vacation_days_used;
    
    res.json({
      totalDays,
      usedDays: vacation_days_used,
      remainingDays,
      yearsOfService: years_of_service
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/vacation/requests', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT vr.*, p.name as personnel_name, p.badge
      FROM vacation_requests vr
      JOIN personnel p ON vr.user_id = p.id
    `;
    
    // If not admin, only show user's own requests
    if (req.user.rank !== 'Chief' && req.user.rank !== 'Captain') {
      query += ` WHERE vr.user_id = $1`;
    }
    
    query += ` ORDER BY vr.submitted_at DESC`;
    
    const values = req.user.rank !== 'Chief' && req.user.rank !== 'Captain' ? [req.user.id] : [];
    const result = await pool.query(query, values);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vacation/requests', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, days, reason } = req.body;
    const id = Date.now().toString();
    
    await pool.query(`
      INSERT INTO vacation_requests (id, user_id, start_date, end_date, days, reason, status, submitted_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
    `, [id, req.user.id, startDate, endDate, days, reason]);
    
    res.json({ id, message: 'Vacation request submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/vacation/requests/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    
    // Check if user has permission to approve
    if (req.user.rank !== 'Chief' && req.user.rank !== 'Captain') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const status = approved ? 'approved' : 'denied';
    
    await pool.query(
      'UPDATE vacation_requests SET status = $1, approved_by = $2, approved_at = NOW() WHERE id = $3',
      [status, req.user.id, id]
    );
    
    // If approved, update vacation days used
    if (approved) {
      const requestResult = await pool.query(
        'SELECT user_id, days FROM vacation_requests WHERE id = $1',
        [id]
      );
      
      if (requestResult.rows.length > 0) {
        const { user_id, days } = requestResult.rows[0];
        await pool.query(
          'UPDATE personnel SET vacation_days_used = vacation_days_used + $1 WHERE id = $2',
          [days, user_id]
        );
      }
    }
    
    res.json({ message: `Vacation request ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PERSONNEL ROUTES
app.get('/api/personnel', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, rank, badge, hire_date, years_of_service, vacation_days_used, active
      FROM personnel
      ORDER BY name
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/personnel', authenticateToken, async (req, res) => {
  try {
    // Check if user has permission
    if (req.user.rank !== 'Chief' && req.user.rank !== 'Captain') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { name, rank, badge, pin, hireDate, yearsOfService } = req.body;
    const id = Date.now().toString();
    const hashedPin = await bcrypt.hash(pin, 10);
    
    await pool.query(`
      INSERT INTO personnel (id, name, rank, badge, pin, hire_date, years_of_service, vacation_days_used, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0, true)
    `, [id, name, rank, badge, hashedPin, hireDate, yearsOfService]);
    
    res.json({ id, message: 'Personnel added successfully' });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Badge number already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.put('/api/personnel/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user has permission
    if (req.user.rank !== 'Chief' && req.user.rank !== 'Captain') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { id } = req.params;
    const { name, rank, badge, hireDate, yearsOfService } = req.body;
    
    await pool.query(`
      UPDATE personnel 
      SET name = $1, rank = $2, badge = $3, hire_date = $4, years_of_service = $5
      WHERE id = $6
    `, [name, rank, badge, hireDate, yearsOfService, id]);
    
    res.json({ message: 'Personnel updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// REPORTS ROUTES
app.get('/api/reports/call-percentages/:badge', authenticateToken, async (req, res) => {
  try {
    const { badge } = req.params;
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    if (period === 'month') dateFilter = "AND i.created_at >= DATE_TRUNC('month', CURRENT_DATE)";
    else if (period === 'quarter') dateFilter = "AND i.created_at >= DATE_TRUNC('quarter', CURRENT_DATE)";
    else if (period === 'year') dateFilter = "AND i.created_at >= DATE_TRUNC('year', CURRENT_DATE)";
    
    // Get personnel ID
    const personnelResult = await pool.query('SELECT id FROM personnel WHERE badge = $1', [badge]);
    if (personnelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Personnel not found' });
    }
    
    const personnelId = personnelResult.rows[0].id;
    
    // Get total incidents (excluding duty officer only)
    const totalIncidentsResult = await pool.query(`
      SELECT COUNT(*) as total 
      FROM incidents i 
      WHERE i.type != 'Duty Officer Only' ${dateFilter}
    `);
    
    // Get incidents attended by this person
    const attendedIncidentsResult = await pool.query(`
      SELECT COUNT(DISTINCT i.id) as attended
      FROM incidents i
      JOIN incident_attendance ia ON i.id = ia.incident_id
      WHERE ia.personnel_id = $1 ${dateFilter}
    `, [personnelId]);
    
    const totalIncidents = parseInt(totalIncidentsResult.rows[0].total);
    const attendedIncidents = parseInt(attendedIncidentsResult.rows[0].attended);
    const percentage = totalIncidents > 0 ? Math.round((attendedIncidents / totalIncidents) * 100) : 0;
    
    res.json({
      totalIncidents,
      attendedIncidents,
      percentage,
      period
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/department-stats', authenticateToken, async (req, res) => {
  try {
    // Get incident counts by type
    const incidentTypesResult = await pool.query(`
      SELECT type, COUNT(*) as count
      FROM incidents
      WHERE created_at >= NOW() - INTERVAL '1 year'
      GROUP BY type
      ORDER BY count DESC
    `);
    
    // Get personnel statistics
    const personnelStatsResult = await pool.query(`
      SELECT 
        p.name,
        p.badge,
        COUNT(DISTINCT ia.incident_id) as calls_attended,
        COUNT(DISTINCT ea.event_id) as events_attended
      FROM personnel p
      LEFT JOIN incident_attendance ia ON p.id = ia.personnel_id
      LEFT JOIN event_attendance ea ON p.id = ea.personnel_id
      WHERE p.active = true
      GROUP BY p.id, p.name, p.badge
      ORDER BY calls_attended DESC
    `);
    
    res.json({
      incidentsByType: incidentTypesResult.rows,
      personnelStats: personnelStatsResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FIRSTDUE SYNC ROUTES
app.post('/api/sync/firstdue', authenticateToken, async (req, res) => {
  try {
    if (!firstDueToken) {
      return res.status(500).json({ error: 'FirstDue not authenticated' });
    }
    
    // Sync incidents from FirstDue
    const response = await axios.get(`${FIRSTDUE_BASE_URL}/dispatches`, {
      headers: {
        'Authorization': `Bearer ${firstDueToken}`
      },
      params: {
        since: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // Last 2 days
      }
    });
    
    const dispatches = response.data;
    let syncedCount = 0;
    
    for (const dispatch of dispatches) {
      // Check if incident already exists
      const existingResult = await pool.query(
        'SELECT id FROM incidents WHERE firstdue_id = $1',
        [dispatch.xref_id]
      );
      
      if (existingResult.rows.length === 0) {
        // Insert new incident
        await pool.query(`
          INSERT INTO incidents (id, firstdue_id, type, address, city, status, created_at, station_1_status, station_2_status, station_3_status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'pending', 'pending')
        `, [
          Date.now().toString() + Math.random().toString(36).substr(2, 9),
          dispatch.xref_id,
          dispatch.type,
          dispatch.address,
          dispatch.city,
          dispatch.status_code,
          dispatch.created_at
        ]);
        
        syncedCount++;
      }
    }
    
    res.json({ message: `Synced ${syncedCount} new incidents from FirstDue` });
  } catch (error) {
    console.error('FirstDue sync error:', error.message);
    res.status(500).json({ error: 'Failed to sync with FirstDue' });
  }
});

// SCHEDULED TASKS
// Sync with FirstDue every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running FirstDue sync...');
  try {
    if (firstDueToken) {
      const response = await axios.get(`${FIRSTDUE_BASE_URL}/dispatches`, {
        headers: {
          'Authorization': `Bearer ${firstDueToken}`
        },
        params: {
          since: new Date(Date.now() - 10 * 60 * 1000).toISOString() // Last 10 minutes
        }
      });
      
      // Process new dispatches
      for (const dispatch of response.data) {
        const existingResult = await pool.query(
          'SELECT id FROM incidents WHERE firstdue_id = $1',
          [dispatch.xref_id]
        );
        
        if (existingResult.rows.length === 0) {
          await pool.query(`
            INSERT INTO incidents (id, firstdue_id, type, address, city, status, created_at, station_1_status, station_2_status, station_3_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'pending', 'pending')
          `, [
            Date.now().toString() + Math.random().toString(36).substr(2, 9),
            dispatch.xref_id,
            dispatch.type,
            dispatch.address,
            dispatch.city,
            dispatch.status_code,
            dispatch.created_at
          ]);
          
          console.log(`New incident synced: ${dispatch.xref_id}`);
        }
      }
    }
  } catch (error) {
    console.error('Scheduled FirstDue sync failed:', error.message);
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

// HEALTH CHECK ENDPOINT
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: 'connected', // You could add actual DB health check here
    firstdue: firstDueToken ? 'authenticated' : 'not authenticated'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Fire Department API server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
});
