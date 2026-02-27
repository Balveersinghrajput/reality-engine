const helmet = require('helmet');

function securityMiddleware(app) {
  app.use(helmet());
  app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
}

module.exports = { securityMiddleware };