import express from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware } from '../middleware/auth.js';
import {
  uploadFile,
  getFiles,
  getSharedFiles,
  shareFile,
  downloadFile,
  deleteFile,
  createFolder,
  getFolders,
} from '../controllers/files.controller.js';

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.FILE_STORAGE_PATH || '/app/uploads';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

router.use(authMiddleware);

router.post('/upload', upload.single('file'), uploadFile);
router.get('/', getFiles);
router.get('/shared-with-me', getSharedFiles);
router.get('/:fileId/download', downloadFile);
router.post('/:fileId/share', shareFile);
router.delete('/:fileId', deleteFile);

// Folder routes
router.post('/folders', createFolder);
router.get('/folders', getFolders);

export default router;
