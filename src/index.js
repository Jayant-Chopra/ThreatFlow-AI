require('dotenv').config();

const express = require('express');
const cors = require('cors');
const scanRoutes = require('./routes/scan');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/api', scanRoutes);

app.get('/', (req, res) => {
  res.json({
    name: 'ThreatFlow AI Backend',
    status: 'running',
    documentation: '/api/health',
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`ThreatFlow AI backend running on http://localhost:${PORT}`);
});
