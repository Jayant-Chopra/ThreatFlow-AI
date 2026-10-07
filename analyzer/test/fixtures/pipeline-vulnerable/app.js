function handler(req, res) {
  const id = req.query.id;
  const query = 'SELECT * FROM users WHERE id=' + id;
  db.query(query);
  const command = req.body.command;
  exec(command);
  const code = req.params.code;
  eval(code);
}

app.get('/users', handler);
