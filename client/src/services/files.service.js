import api from './api';

export const filesService = {
  // Files
  uploadFile: (file, subjectId, folderId, description) => {
    const formData = new FormData();
    formData.append('file', file);
    if (subjectId) formData.append('subjectId', subjectId);
    if (folderId) formData.append('folderId', folderId);
    if (description) formData.append('description', description);

    return api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getFiles: (folderId) =>
    api.get('/files', { params: { folderId } }),

  getSharedFiles: () =>
    api.get('/files/shared-with-me'),

  downloadFile: (fileId) =>
    api.get(`/files/${fileId}/download`),

  shareFile: (fileId, userIds, groupIds, permission) =>
    api.post(`/files/${fileId}/share`, {
      userIds,
      groupIds,
      permission,
    }),

  deleteFile: (fileId) =>
    api.delete(`/files/${fileId}`),

  // Folders
  createFolder: (name, parentFolderId) =>
    api.post('/files/folders', { name, parentFolderId }),

  getFolders: () => api.get('/files/folders'),
};
