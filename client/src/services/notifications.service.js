import api from './api';

export const notificationsService = {
  getNotifications: (limit = 20) =>
    api.get('/notifications', { params: { limit } }),

  markAsRead: (notificationId) =>
    api.patch(`/notifications/${notificationId}/read`),

  markAllAsRead: () =>
    api.patch('/notifications/read-all'),

  deleteNotification: (notificationId) =>
    api.delete(`/notifications/${notificationId}`),
};
