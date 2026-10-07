const {
  executeCode,
  getUser,
  runDiagnostic
} = require('../controllers/userController');
const {
  normalCalculation,
  safeCommand,
  safeLookup,
  unrelatedFunctionCall
} = require('../safe/safeExamples');

function registerUserRoutes(app) {
  app.get('/users', getUser);
  app.get('/diagnostic', runDiagnostic);
  app.post('/execute', executeCode);
  app.get('/safe/users', safeLookup);
  app.get('/safe/command', safeCommand);
  app.get('/safe/normal', normalCalculation);
  app.get('/safe/unrelated', unrelatedFunctionCall);
}

module.exports = { registerUserRoutes };
