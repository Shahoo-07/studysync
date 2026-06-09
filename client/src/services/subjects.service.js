import api from './api';

export const subjectsService = {
  // Subjects
  getSubjects: () => api.get('/subjects'),

  createSubject: (name, color) =>
    api.post('/subjects', { name, color }),

  updateSubject: (id, updates) =>
    api.patch(`/subjects/${id}`, updates),

  deleteSubject: (id) =>
    api.delete(`/subjects/${id}`),

  getSubject: (id) => api.get(`/subjects/${id}`),

  // Chapters
  getChapters: (subjectId) =>
    api.get(`/chapters/subject/${subjectId}`),

  createChapter: (subjectId, name) =>
    api.post(`/chapters/subject/${subjectId}`, { name }),

  updateChapter: (id, name) =>
    api.patch(`/chapters/${id}`, { name }),

  deleteChapter: (id) => api.delete(`/chapters/${id}`),

  reorderChapters: (subjectId, chapters) =>
    api.patch(`/chapters/subject/${subjectId}/reorder`, { chapters }),

  // Topics
  getTopics: (chapterId) =>
    api.get(`/topics/chapter/${chapterId}`),

  createTopic: (chapterId, name, notes) =>
    api.post(`/topics/chapter/${chapterId}`, { name, notes }),

  updateTopic: (id, updates) =>
    api.patch(`/topics/${id}`, updates),

  updateTopicStatus: (id, status) =>
    api.patch(`/topics/${id}/status`, { status }),

  deleteTopic: (id) => api.delete(`/topics/${id}`),

  reorderTopics: (chapterId, topics) =>
    api.patch(`/topics/chapter/${chapterId}/reorder`, { topics }),
};
