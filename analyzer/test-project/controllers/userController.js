const db = {
  query(statement) {
    return statement;
  }
};

function exec(command) {
  return command;
}

function getUser(req, res) {
  const id = req.query.id;
  const query = 'SELECT * FROM users WHERE id=' + id;
  db.query(query);
  return res;
}

function runDiagnostic(req, res) {
  const host = req.query.host;
  const command = `ping ${host}`;
  exec(command);
  return res;
}

function executeCode(req, res) {
  const code = req.body.code;
  eval(code);
  return res;
}

module.exports = { executeCode, getUser, runDiagnostic };
