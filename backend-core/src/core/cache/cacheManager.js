const { redisClient } = require('./redisClient');

async function setCache(key, value, ttl = 300) {
  try { await redisClient.setEx(key, ttl, JSON.stringify(value)); } catch (e) {}
}
async function getCache(key) {
  try { const d = await redisClient.get(key); return d ? JSON.parse(d) : null; } catch (e) { return null; }
}
async function deleteCache(key) {
  try { await redisClient.del(key); } catch (e) {}
}
async function deleteCachePattern(pattern) {
  try { const keys = await redisClient.keys(pattern); if (keys.length > 0) await redisClient.del(keys); } catch (e) {}
}

module.exports = { setCache, getCache, deleteCache, deleteCachePattern };