const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = 3002;

app.get('/users', (req, res) => {
  const userId = req.query.id;
  const sql = 'SELECT * FROM users WHERE id = ' + userId;
  res.json({ message: 'Would run query', sql });
});

app.get('/execute', (req, res) => {
  const command = req.query.command;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr || error.message });
    }

    return res.json({ stdout });
  });
});

app.listen(port, () => {
  console.log(`Demo vulnerable app running on http://localhost:${port}`);
});
