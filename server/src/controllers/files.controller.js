import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { uploadFileToStorage, downloadFileFromStorage, deleteFileFromStorage } from '../utils/storage.js';

export const uploadFile = async (req, res) => {
  try {
    const { userId } = req;

    if (!req.file) {
      return res.status(400).json({ error: 'File required' });
    }

    const { originalname, size, mimetype } = req.file;
    const { subjectId, folderId, description } = req.body;

    // Upload to storage (R2 or local disk via our utility)
    const uniqueName = await uploadFileToStorage(req.file);

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO files (id, uploader_id, name, original_name, mime_type, size_bytes, file_path, subject_id, folder_id, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, original_name, mime_type, size_bytes, file_path, subject_id, description, download_count, created_at`,
      [id, userId, uniqueName, originalname, mimetype, size, uniqueName, subjectId || null, folderId || null, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Upload file error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

export const getFiles = async (req, res) => {
  try {
    const { userId } = req;
    const { folderId } = req.query;

    let query = `SELECT id, name, original_name, mime_type, size_bytes, subject_id, folder_id, is_public, download_count, created_at
                 FROM files
                 WHERE uploader_id = $1`;
    const params = [userId];

    if (folderId) {
      query += ` AND folder_id = $2`;
      params.push(folderId);
    } else {
      query += ` AND folder_id IS NULL`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (err) {
    console.error('Get files error:', err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
};

export const getSharedFiles = async (req, res) => {
  try {
    const { userId } = req;
    const { groupId } = req.query;

    let query = `SELECT DISTINCT ON (f.id)
         f.id,
         f.name,
         f.original_name,
         f.mime_type,
         f.size_bytes,
         f.uploader_id,
         u.name as "uploaderName",
         fp.permission,
         fp.grantee_group_id as "groupId",
         f.created_at
       FROM files f
       INNER JOIN file_permissions fp ON f.id = fp.file_id
       INNER JOIN users u ON f.uploader_id = u.id`;

    const params = [userId];

    if (groupId) {
      query += ` WHERE fp.grantee_group_id = $2 AND EXISTS (
        SELECT 1 FROM group_members WHERE group_id = $2 AND user_id = $1
      )`;
      params.push(groupId);
    } else {
      query += ` WHERE fp.grantee_user_id = $1 OR fp.grantee_group_id IN (
        SELECT group_id FROM group_members WHERE user_id = $1
      )`;
    }

    query += ` ORDER BY f.id, f.created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (err) {
    console.error('Get shared files error:', err);
    res.status(500).json({ error: 'Failed to fetch shared files' });
  }
};

export const shareFile = async (req, res) => {
  try {
    const { userId } = req;
    const { fileId } = req.params;
    const { userIds, groupIds, permission } = req.body;

    if (!['view', 'download'].includes(permission)) {
      return res.status(400).json({ error: 'Invalid permission' });
    }

    // Verify ownership
    const file = await pool.query(
      'SELECT uploader_id FROM files WHERE id = $1',
      [fileId]
    );

    if (file.rows.length === 0 || file.rows[0].uploader_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Grant permissions to users
    if (userIds && Array.isArray(userIds)) {
      for (const granteeUserId of userIds) {
        const id = uuidv4();
        await pool.query(
          `INSERT INTO file_permissions (id, file_id, grantee_user_id, permission)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [id, fileId, granteeUserId, permission]
        );
      }
    }

    // Grant permissions to groups
    if (groupIds && Array.isArray(groupIds)) {
      for (const granteeGroupId of groupIds) {
        const id = uuidv4();
        await pool.query(
          `INSERT INTO file_permissions (id, file_id, grantee_group_id, permission)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [id, fileId, granteeGroupId, permission]
        );
      }
    }

    res.json({ message: 'File shared successfully' });
  } catch (err) {
    console.error('Share file error:', err);
    res.status(500).json({ error: 'Failed to share file' });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const { userId } = req;
    const { fileId } = req.params;

    // Check if file exists
    const file = await pool.query(
      'SELECT name, original_name, file_path, uploader_id FROM files WHERE id = $1',
      [fileId]
    );

    if (file.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileRecord = file.rows[0];

    // Check permissions
    if (fileRecord.uploader_id !== userId) {
      const permission = await pool.query(
        `SELECT permission FROM file_permissions
         WHERE file_id = $1 AND (grantee_user_id = $2 OR grantee_group_id IN (
           SELECT group_id FROM group_members WHERE user_id = $2
         ))`,
        [fileId, userId]
      );

      if (permission.rows.length === 0) {
        return res.status(403).json({ error: 'No permission to download' });
      }
    }

    // Increment download count
    await pool.query(
      'UPDATE files SET download_count = download_count + 1 WHERE id = $1',
      [fileId]
    );

    // Download from storage utility (handles both local and R2 streaming)
    await downloadFileFromStorage(fileRecord.file_path, fileRecord.original_name, res);
  } catch (err) {
    console.error('Download file error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { userId } = req;
    const { fileId } = req.params;

    // Verify ownership
    const file = await pool.query(
      'SELECT file_path, uploader_id FROM files WHERE id = $1',
      [fileId]
    );

    if (file.rows.length === 0 || file.rows[0].uploader_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete file from storage (R2 or local disk)
    await deleteFileFromStorage(file.rows[0].file_path);

    // Delete from database
    await pool.query('DELETE FROM files WHERE id = $1', [fileId]);

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

export const createFolder = async (req, res) => {
  try {
    const { userId } = req;
    const { name, parentFolderId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Folder name required' });
    }

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO file_folders (id, owner_id, name, parent_folder_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, parent_folder_id, created_at`,
      [id, userId, name, parentFolderId || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create folder error:', err);
    res.status(500).json({ error: 'Failed to create folder' });
  }
};

export const getFolders = async (req, res) => {
  try {
    const { userId } = req;

    const result = await pool.query(
      `SELECT id, name, parent_folder_id, created_at
       FROM file_folders
       WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get folders error:', err);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
};
