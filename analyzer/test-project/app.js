const { registerUserRoutes } = require('./routes/userRoutes');

const app = {
  get(path, handler) {
    return { handler, method: 'GET', path };
  },
  post(path, handler) {
    return { handler, method: 'POST', path };
  }
};

registerUserRoutes(app);

module.exports = app;
