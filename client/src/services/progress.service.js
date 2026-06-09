import api from './api';

export const progressService = {
  getProgressOverview: () => api.get('/progress/overview'),

  getSubjectProgress: (subjectId) =>
    api.get(`/progress/subject/${subjectId}`),
};
