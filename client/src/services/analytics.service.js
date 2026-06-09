import api from './api';

export const analyticsService = {
  logSession: (topicId, subjectId, durationMinutes) =>
    api.post('/analytics/sessions', {
      topicId,
      subjectId,
      durationMinutes,
    }),

  getStreak: () => api.get('/analytics/streak'),

  getHeatmap: (days = 90) =>
    api.get('/analytics/heatmap', { params: { days } }),

  getWeakAreas: () => api.get('/analytics/weak-areas'),

  getPace: (subjectId) =>
    api.get(`/analytics/pace/${subjectId}`),
};
