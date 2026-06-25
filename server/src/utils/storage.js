import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Check if Cloudflare R2 is configured
const isR2Configured = 
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_ENDPOINT &&
  process.env.R2_BUCKET_NAME;

const UPLOAD_DIR = process.env.FILE_STORAGE_PATH || path.join(process.cwd(), 'uploads');

// Ensure local upload directory exists ONLY if R2 is not configured
if (!isR2Configured && !fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

let s3 = null;
if (isR2Configured) {
  s3 = new S3Client({
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    region: 'auto',
  });
  console.log('✓ Cloudflare R2 client initialized for file storage');
} else {
  console.log('ℹ Cloudflare R2 not configured. Falling back to local disk storage');
}

/**
 * Uploads a file to Cloudflare R2 or local disk storage.
 * @param {Object} file - Multer file object (memoryStorage format)
 * @returns {Promise<string>} Unique file name/key
 */
export const uploadFileToStorage = async (file) => {
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;

  if (isR2Configured) {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });
    await s3.send(command);
    return uniqueName;
  } else {
    const filePath = path.join(UPLOAD_DIR, uniqueName);
    fs.writeFileSync(filePath, file.buffer);
    return uniqueName;
  }
};

/**
 * Pipes the file stream from storage to the response for download.
 * @param {string} fileKey - Unique filename / R2 Key
 * @param {string} originalName - Original filename for the download header
 * @param {Object} res - Express response object
 */
export const downloadFileFromStorage = async (fileKey, originalName, res) => {
  if (isR2Configured) {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
    });
    const response = await s3.send(command);
    
    // Set response headers
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    res.setHeader('Content-Type', response.ContentType || 'application/octet-stream');
    
    // Stream response body to Express response
    response.Body.pipe(res);
  } else {
    const filePath = path.join(UPLOAD_DIR, fileKey);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found on disk');
    }
    res.download(filePath, originalName);
  }
};

/**
 * Deletes a file from storage.
 * @param {string} fileKey - Unique filename / R2 Key
 */
export const deleteFileFromStorage = async (fileKey) => {
  if (isR2Configured) {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
    });
    await s3.send(command);
  } else {
    const filePath = path.join(UPLOAD_DIR, fileKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};
