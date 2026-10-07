const db = {
  query(statement, values) {
    return { statement, values };
  }
};

function exec(command) {
  return command;
}

function formatValue(value) {
  return String(value).toUpperCase();
}

function safeLookup(req, res) {
  const id = req.query.id;
  db.query('SELECT * FROM users WHERE id = ?', [id]);
  return res;
}

function safeCommand(req, res) {
  exec('whoami');
  return res;
}

function unrelatedFunctionCall(req, res) {
  const label = req.query.label;
  formatValue(label);
  return res;
}

function normalCalculation(req, res) {
  const value = Number(req.query.value ?? 0);
  return res.json({ doubled: value * 2 });
}

module.exports = { normalCalculation, safeCommand, safeLookup, unrelatedFunctionCall };
