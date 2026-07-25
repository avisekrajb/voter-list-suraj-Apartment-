require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const connectDB = require('./config/database');
const voterRoutes = require('./routes/voterRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas
connectDB();

// Middleware
app.use(compression()); // Compress responses

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:3000', 'http://127.0.0.1:8080'],
  credentials: true
}));

// Increase payload size limits
app.use(express.json({ 
  limit: '100mb',
  extended: true 
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '100mb'
}));

// Routes
app.use('/api', voterRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    environment: process.env.NODE_ENV || 'development',
    database: 'MongoDB Atlas',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      error: 'File too large. Maximum upload size is 100MB.' 
    });
  }
  
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API URL: http://localhost:${PORT}/api`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Max upload size: 100mb`);
  console.log(`🔄 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 Database: MongoDB Atlas`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});