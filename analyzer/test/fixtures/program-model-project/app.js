function getUsers(req, res) {
  const id = req.query.id;
  const query = "SELECT * FROM users WHERE id=" + id;
  db.query(query);
}
app.get('/users', getUsers);

function safeLookup(req, res) {
  const id = req.query.id;
  db.query('SELECT * FROM users WHERE id = ?', [id]);
}

function constantLookup() {
  const query = 'SELECT * FROM users';
  db.query(query);
}

function isolated() {
  const id = 'local';
  const other = id;
}
