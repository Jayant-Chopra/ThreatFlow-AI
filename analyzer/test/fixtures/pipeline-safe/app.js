function handler(req, res) {
  const id = req.query.id;
  db.query('SELECT * FROM users WHERE id = ?', [id]);
  exec('whoami');
  eval('return 1;');
  return res.json({ ok: true });
}

app.get('/health', handler);
