const express = require('express');
const router = express.Router();
const {
  getConnectionsController,
  getPendingRequestsController,
  sendRequestController,
  acceptRequestController,
  removeConnectionController,
  getStatusController,
} = require('./connections.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', getConnectionsController);
router.get('/pending', getPendingRequestsController);
router.get('/status/:userId', getStatusController);
router.post('/request/:userId', sendRequestController);
router.post('/accept/:id', acceptRequestController);
router.delete('/:id', removeConnectionController);

module.exports = router;