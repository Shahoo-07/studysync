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

// Configure multer to hold files in memory before storing
const storage = multer.memoryStorage();

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
