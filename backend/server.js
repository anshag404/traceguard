const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const axios = require('axios');
const cheerio = require('cheerio');

// Initialize environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'TraceGuard Backend is healthy' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`TraceGuard Server is running on port ${PORT}`);
});
