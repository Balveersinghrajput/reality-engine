// src/utils/cloudinary.js
// npm install cloudinary multer multer-storage-cloudinary

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Images: best quality, auto format ──
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'reality-engine/chat/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ quality: 'auto:best', fetch_format: 'auto' }],
    resource_type: 'image',
  },
});

// ── Videos ──
const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'reality-engine/chat/videos',
    allowed_formats: ['mp4', 'mov', 'avi', 'webm'],
    resource_type: 'video',
  },
});

// ── Raw files (PDF, ZIP, code, etc.) ──
const rawStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'reality-engine/chat/files',
    resource_type: 'raw',
    public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`,
  }),
});

const uploadImage = multer({ storage: imageStorage, limits: { fileSize: 20 * 1024 * 1024 } });
const uploadVideo = multer({ storage: videoStorage, limits: { fileSize: 200 * 1024 * 1024 } });
const uploadFile  = multer({ storage: rawStorage,   limits: { fileSize: 50 * 1024 * 1024 } });

// Helper to delete from cloudinary when needed
async function deleteCloudinaryFile(publicId, resourceType = 'image') {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (e) {
    console.error('[Cloudinary] delete error:', e.message);
  }
}

module.exports = { cloudinary, uploadImage, uploadVideo, uploadFile, deleteCloudinaryFile };