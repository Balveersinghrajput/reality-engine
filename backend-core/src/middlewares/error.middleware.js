const logger = require('../core/logger/logger');

function errorMiddleware(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  logger.error(`${status} - ${message}`);
  res.status(status).json({ success: false, message });
}

module.exports = { errorMiddleware };