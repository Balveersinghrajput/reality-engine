const { prisma } = require('../../core/database/prismaClient');
const cloudinary  = require('cloudinary').v2;

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ── Upload helper ─────────────────────────────────────────────────
async function uploadToCloudinary(buffer, folder = 'profiles', resourceType = 'auto') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, transformation: [{ quality: 'auto', fetch_format: 'auto' }] },
      (err, result) => { if (err) reject(err); else resolve(result.secure_url); },
    );
    stream.end(buffer);
  });
}

// ── Helpers ────────────────────────────────────────────────────────
function formatUser(u) {
  return {
    id:               u.id,
    username:         u.username,
    email:            u.email,
    profilePic:       u.profilePic,
    bio:              u.bio,
    githubUrl:        u.githubUrl,
    linkedinUrl:      u.linkedinUrl,
    portfolioUrl:     u.portfolioUrl,
    skills:           u.skills || [],
    targetTrack:      u.targetTrack,
    level:            u.level,
    mode:             u.mode,
    tier:             u.tier,
    xp:               u.xp,
    masteryPercent:   u.masteryPercent,
    realityScore:     u.realityScore,
    streakCurrent:    u.streakCurrent,
    streakLongest:    u.streakLongest,
    trackRank:        u.trackRank,
    trackRankTotal:   u.trackRankTotal,
    platformRank:     u.platformRank,
    platformRankTotal:u.platformRankTotal,
    createdAt:        u.createdAt,
    _count:           u._count,
  };
}

function formatPosts(posts, viewerId) {
  return (posts || []).map(p => ({
    id:        p.id,
    content:   p.content,
    imageUrl:  p.imageUrl  || null,
    videoUrl:  p.videoUrl  || null,
    createdAt: p.createdAt,
    likes:     p._count?.likes    || 0,
    comments:  p._count?.comments || 0,
    liked:     Array.isArray(p.likes) ? p.likes.length > 0 : false,
    user: p.user
      ? { username: p.user.username, profilePic: p.user.profilePic || null, tier: p.user.tier }
      : null,
  }));
}

function postSelect(viewerId) {
  return {
    id: true, content: true, imageUrl: true, videoUrl: true, createdAt: true,
    user: { select: { username: true, profilePic: true, tier: true } },
    _count: { select: { likes: true, comments: true } },
    likes:  { where: { userId: viewerId }, select: { id: true } },
  };
}

// ── Own profile ────────────────────────────────────────────────────
async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id: true, username: true, email: true, profilePic: true,
      bio: true, githubUrl: true, linkedinUrl: true, portfolioUrl: true,
      skills: true, targetTrack: true, level: true, mode: true, tier: true,
      xp: true, masteryPercent: true, realityScore: true,
      streakCurrent: true, streakLongest: true,
      trackRank: true, trackRankTotal: true,
      platformRank: true, platformRankTotal: true, createdAt: true,
      _count: { select: { tasks: true, testResults: true } },
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: postSelect(userId),
      },
      highlights: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, imageUrl: true, link: true, description: true, createdAt: true },
      },
    },
  });

  if (!user) throw new Error('User not found');

  return {
    ...formatUser(user),
    posts:      formatPosts(user.posts, userId),
    highlights: user.highlights || [],
  };
}

async function updateProfile(userId, fields) {
  const allowed = {};
  if (fields.bio          !== undefined) allowed.bio          = fields.bio;
  if (fields.githubUrl    !== undefined) allowed.githubUrl    = fields.githubUrl;
  if (fields.linkedinUrl  !== undefined) allowed.linkedinUrl  = fields.linkedinUrl;
  if (fields.portfolioUrl !== undefined) allowed.portfolioUrl = fields.portfolioUrl;
  if (Array.isArray(fields.skills))      allowed.skills       = fields.skills;

  const user = await prisma.user.update({ where: { id: userId }, data: allowed });
  return formatUser(user);
}

async function updateProfilePic(userId, file) {
  let profilePic;
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    profilePic = await uploadToCloudinary(file.buffer, 'profile_pics', 'image');
  } else {
    profilePic = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }
  await prisma.user.update({ where: { id: userId }, data: { profilePic } });
  return { profilePic };
}

// ── Dashboard ──────────────────────────────────────────────────────
async function getDashboard(userId) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id: true, username: true, profilePic: true, tier: true,
      targetTrack: true, level: true, mode: true, bio: true,
      masteryPercent: true, realityScore: true,
      streakCurrent: true, streakLongest: true, xp: true,
      batchMember: { select: { batchId: true, rank: true, batch: { select: { batchCode: true } } } },
      globalLeaderboard: true,
      _count: { select: { tasks: { where: { status: 'completed' } } } },
    },
  });

  const totalTasks  = await prisma.task.count({ where: { userId } });
  const recentTests = await prisma.taskResult.findMany({
    where:   { userId },
    orderBy: { completedAt: 'desc' },
    take:    20,
    select:  { id: true, score: true, xpEarned: true, timeTakenSeconds: true, difficulty: true, completedAt: true, challengeTitle: true },
  });

  return {
    profile: {
      id:          user.id,
      username:    user.username,
      profilePic:  user.profilePic,
      tier:        user.tier,
      targetTrack: user.targetTrack,
      level:       user.level,
      mode:        user.mode,
      bio:         user.bio,
    },
    performance: {
      masteryPercent:  user.masteryPercent,
      realityScore:    user.realityScore,
      streakCurrent:   user.streakCurrent,
      streakLongest:   user.streakLongest,
      xp:              user.xp,
      completedTasks:  user._count.tasks,
      totalTasks,
    },
    ranks: {
      batchRank:          user.batchMember?.rank,
      batchTotal:         user.batchMember ? 100 : null,
      batchCode:          user.batchMember?.batch?.batchCode,
      trackRank:          user.globalLeaderboard?.trackRank,
      trackRankTotal:     user.globalLeaderboard?.trackRankTotal,
      platformRank:       user.globalLeaderboard?.platformRank,
      platformRankTotal:  user.globalLeaderboard?.platformRankTotal,
      weeklyMovement:     user.globalLeaderboard?.weeklyMovement || 0,
    },
    recentTests: recentTests.map(t => ({
      id:         t.id,
      score:      t.score,
      percentage: t.score,
      passed:     t.score >= 60,
      difficulty: t.difficulty,
      date:       t.completedAt,
      topic:      t.challengeTitle?.replace(/^Test:\s*/, '').trim() || '',
      xpEarned:   t.xpEarned,
    })),
  };
}

// ── Public profile ─────────────────────────────────────────────────
async function getPublicProfile(username, viewerId) {
  const user = await prisma.user.findFirst({
    where:  { username: { equals: username, mode: 'insensitive' } },
    select: {
      id: true, username: true, profilePic: true, bio: true,
      githubUrl: true, linkedinUrl: true, portfolioUrl: true, skills: true,
      targetTrack: true, level: true, mode: true, tier: true,
      xp: true, masteryPercent: true, realityScore: true,
      streakCurrent: true, streakLongest: true,
      trackRank: true, trackRankTotal: true,
      platformRank: true, platformRankTotal: true, createdAt: true,
      _count: { select: { tasks: true, testResults: true } },
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: postSelect(viewerId),
      },
      highlights: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, imageUrl: true, link: true, description: true },
      },
    },
  });

  if (!user) throw new Error('User not found');

  const connection = viewerId ? await prisma.connection.findFirst({
    where: {
      OR: [
        { senderId: viewerId, receiverId: user.id },
        { senderId: user.id, receiverId: viewerId },
      ],
    },
  }) : null;

  let connectionStatus = 'none';
  if (connection) {
    if (connection.status === 'accepted') connectionStatus = 'accepted';
    else if (connection.senderId === viewerId) connectionStatus = 'pending_sent';
    else connectionStatus = 'pending_received';
  }

  const isConnected = connectionStatus === 'accepted';

  return {
    ...formatUser(user),
    connectionStatus,
    connectionId: connection?.id || null,
    posts:      isConnected || user.id === viewerId ? formatPosts(user.posts, viewerId) : [],
    highlights: user.highlights || [],
  };
}

// ── Get friends list for a public username ─────────────────────────
async function getUserFriends(username) {
  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: { id: true },
  });

  if (!user) throw new Error('User not found');

  const connections = await prisma.connection.findMany({
    where: {
      OR: [
        { senderId: user.id, status: 'accepted' },
        { receiverId: user.id, status: 'accepted' },
      ],
    },
    select: {
      sender:   { select: { id: true, username: true, tier: true, targetTrack: true, profilePic: true } },
      receiver: { select: { id: true, username: true, tier: true, targetTrack: true, profilePic: true } },
      senderId: true,
    },
  });

  return connections.map(c =>
    c.senderId === user.id ? c.receiver : c.sender
  );
}

// ── Posts ──────────────────────────────────────────────────────────
async function getPosts(ownerId, viewerId) {
  const posts = await prisma.post.findMany({
    where:   { userId: ownerId },
    orderBy: { createdAt: 'desc' },
    take:    30,
    select:  postSelect(viewerId),
  });
  return formatPosts(posts, viewerId);
}

async function createPost(userId, content, file) {
  let imageUrl = null;
  let videoUrl = null;

  if (file && process.env.CLOUDINARY_CLOUD_NAME) {
    const isVideo = file.mimetype.startsWith('video/');
    const url = await uploadToCloudinary(file.buffer, 'reality-engine/posts', isVideo ? 'video' : 'image');
    if (isVideo) videoUrl = url;
    else imageUrl = url;
  } else if (file) {
    const b64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    if (file.mimetype.startsWith('video/')) videoUrl = b64;
    else imageUrl = b64;
  }

  const post = await prisma.post.create({
    data:    { userId, content: content || '', imageUrl, videoUrl },
    include: { user: { select: { username: true, profilePic: true, tier: true } } },
  });

  return {
    id:        post.id,
    content:   post.content,
    imageUrl:  post.imageUrl,
    videoUrl:  post.videoUrl,
    createdAt: post.createdAt,
    likes:     0,
    comments:  0,
    liked:     false,
    user: { username: post.user.username, profilePic: post.user.profilePic, tier: post.user.tier },
  };
}

async function deletePost(userId, postId) {
  const post = await prisma.post.findFirst({ where: { id: postId, userId } });
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });
  await prisma.post.delete({ where: { id: postId } });
}

async function likePost(userId, postId) {
  const existing = await prisma.postLike.findFirst({ where: { userId, postId } });
  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
    return { liked: false };
  }
  await prisma.postLike.create({ data: { userId, postId } });
  return { liked: true };
}

async function addComment(userId, postId, content) {
  const comment = await prisma.postComment.create({
    data:    { userId, postId, content },
    include: { user: { select: { username: true, profilePic: true, tier: true } } },
  });
  return {
    id:        comment.id,
    content:   comment.content,
    createdAt: comment.createdAt,
    user: { username: comment.user.username, profilePic: comment.user.profilePic, tier: comment.user.tier },
  };
}

async function getComments(postId) {
  const comments = await prisma.postComment.findMany({
    where:   { postId },
    orderBy: { createdAt: 'asc' },
    take:    50,
    include: { user: { select: { username: true, profilePic: true, tier: true } } },
  });
  return comments.map(c => ({
    id:        c.id,
    content:   c.content,
    createdAt: c.createdAt,
    user: { username: c.user.username, profilePic: c.user.profilePic, tier: c.user.tier },
  }));
}

// ── Highlights ─────────────────────────────────────────────────────
async function createHighlight(userId, { title, link, description }, file) {
  let imageUrl = null;
  if (file && process.env.CLOUDINARY_CLOUD_NAME) {
    imageUrl = await uploadToCloudinary(file.buffer, 'reality-engine/highlights', 'image');
  } else if (file) {
    imageUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }
  return prisma.highlight.create({
    data:   { userId, title, link, description: description || '', imageUrl },
    select: { id: true, title: true, link: true, description: true, imageUrl: true, createdAt: true },
  });
}

async function getHighlights(userId) {
  return prisma.highlight.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    select:  { id: true, title: true, link: true, description: true, imageUrl: true, createdAt: true },
  });
}

async function deleteHighlight(userId, highlightId) {
  const hl = await prisma.highlight.findFirst({ where: { id: highlightId, userId } });
  if (!hl) throw Object.assign(new Error('Highlight not found'), { status: 404 });
  await prisma.highlight.delete({ where: { id: highlightId } });
}

module.exports = {
  getProfile,
  updateProfile,
  updateProfilePic,
  getDashboard,
  getPublicProfile,
  getUserFriends,
  getPosts,
  createPost,
  deletePost,
  likePost,
  addComment,
  getComments,
  createHighlight,
  getHighlights,
  deleteHighlight,
};