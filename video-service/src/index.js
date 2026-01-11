const express = require('express');
const cors = require('cors');
const videoRouter = require('./routes/video');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/videos', videoRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'video-merge-service' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🎬 Video merge service running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});
