const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const uploadRoutes = require('./routes/uploadRoutes');
const recordRoutes = require('./routes/recordRoutes');
const stateRoutes = require('./routes/stateRoutes');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const demographicUploadRoutes = require('./routes/demographicUploadRoutes');
const demographicRecordRoutes = require('./routes/demographicRecordRoutes');
const telecareRoutes = require('./routes/telecareRoutes');
const filterRoutes = require('./routes/filterRoutes');
const phoneNumberRoutes = require('./routes/phoneNumberRoutes');
const phoneNumberGenerationRoutes = require('./routes/phoneNumberGenerationRoutes');
const timezoneRoutes = require('./routes/timezoneRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy configuration (fixes express-rate-limit X-Forwarded-For warning)
// In development, trust localhost. In production, configure based on your proxy setup.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy in production
} else {
  app.set('trust proxy', 'loopback'); // Trust localhost in development
}

// Security middleware
app.use(helmet());

// CORS configuration - Allow all origins with better browser compatibility
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow all origins
    return callback(null, true);
  },
  credentials: true, // Allow credentials for authenticated requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Origin', 
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization', 
    'Cache-Control',
    'X-HTTP-Method-Override',
    'Referer',
    'User-Agent',
    'sec-ch-ua',
    'sec-ch-ua-mobile',
    'sec-ch-ua-platform'
  ],
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  preflightContinue: false
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/v1', authRoutes);
app.use('/api/v1', uploadRoutes);
app.use('/api/v1', recordRoutes);
app.use('/api/v1', stateRoutes);
app.use('/api/v1', fileRoutes);
app.use('/api/v1', downloadRoutes);
app.use('/api/v1/demographic/records', demographicRecordRoutes);
app.use('/api/v1/demographic', demographicUploadRoutes);
app.use('/api/v1/telecare', telecareRoutes);
app.use('/api/v1/filters', filterRoutes);
app.use('/api/v1/phone-numbers', phoneNumberRoutes);
app.use('/api/v1/phone-generations', phoneNumberGenerationRoutes);
app.use('/api/v1/timezones', timezoneRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
