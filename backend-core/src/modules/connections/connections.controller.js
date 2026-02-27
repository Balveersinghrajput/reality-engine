const connectionsService = require('./connections.service');
const { successResponse, errorResponse } = require('../../utils/response.helper');

async function getConnectionsController(req, res, next) {
  try {
    const data = await connectionsService.getConnections(req.user.id);
    return successResponse(res, data, 'Connections fetched');
  } catch (err) { next(err); }
}

async function getPendingRequestsController(req, res, next) {
  try {
    const data = await connectionsService.getPendingRequests(req.user.id);
    return successResponse(res, data, 'Pending requests fetched');
  } catch (err) { next(err); }
}

async function sendRequestController(req, res, next) {
  try {
    const data = await connectionsService.sendRequest(req.user.id, req.params.userId);
    return successResponse(res, data, 'Connection request sent', 201);
  } catch (err) { next(err); }
}

async function acceptRequestController(req, res, next) {
  try {
    const data = await connectionsService.acceptRequest(req.user.id, req.params.id);
    return successResponse(res, data, 'Connection accepted');
  } catch (err) { next(err); }
}

async function removeConnectionController(req, res, next) {
  try {
    const data = await connectionsService.removeConnection(req.user.id, req.params.id);
    return successResponse(res, data, 'Connection removed');
  } catch (err) { next(err); }
}

async function getStatusController(req, res, next) {
  try {
    const data = await connectionsService.getConnectionStatus(req.user.id, req.params.userId);
    return successResponse(res, data, 'Status fetched');
  } catch (err) { next(err); }
}

module.exports = {
  getConnectionsController,
  getPendingRequestsController,
  sendRequestController,
  acceptRequestController,
  removeConnectionController,
  getStatusController,
};