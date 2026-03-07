const jwt = require('jsonwebtoken');
const { prisma } = require('../core/database/prismaClient');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true, username: true, email: true,
        targetTrack: true, level: true, mode: true,
        tier: true, batchMember: { select: { batchId: true } },
      },
    });
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// ── Optional auth — attaches req.user if token present, never blocks ──
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true, username: true, email: true,
        targetTrack: true, level: true, mode: true,
        tier: true, batchMember: { select: { batchId: true } },
      },
    });
    if (user) req.user = user;
  } catch {
    // ignore invalid/expired token — just proceed as guest
  }
  next();
}

module.exports = { authMiddleware, optionalAuth };
