require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');

// ─── Initialize Express App ───────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

// Make io accessible in routes
app.set('io', io);

// ─── Middleware ────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

// ─── Routes ───────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/readings', require('./routes/readings'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/thresholds', require('./routes/thresholds'));
app.use('/api/relay', require('./routes/relay'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/export', require('./routes/export'));

// ─── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ─── Socket.IO Events ────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });

  // Allow clients to join device-specific rooms
  socket.on('joinDevice', (deviceId) => {
    socket.join(`device:${deviceId}`);
    console.log(`📡 ${socket.id} joined room device:${deviceId}`);
  });
});

// ─── Error Handling ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Start Server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  🌊 Smart Lake Health Monitor — Backend');
    console.log(`  🚀 Server running on port ${PORT}`);
    console.log(`  📡 Socket.IO ready`);
    console.log(`  🌐 CORS: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');
  });
};

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
