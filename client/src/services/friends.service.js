import api from './api';

export const friendsService = {
  getFriends: () => api.get('/friends'),

  sendFriendRequest: (email) =>
    api.post('/friends/request', { email }),

  respondToRequest: (requestId, action) =>
    api.patch(`/friends/request/${requestId}`, { action }),

  removeFriend: (friendId) =>
    api.delete(`/friends/${friendId}`),

  getFriendProgress: (friendId) =>
    api.get(`/friends/${friendId}/progress`),

  getVisibilitySettings: () =>
    api.get('/friends/visibility'),

  updateVisibilitySetting: (friendId, visibilityLevel) =>
    api.post('/friends/visibility', { friendId, visibilityLevel }),

  getLeaderboard: (subjectId) =>
    api.get('/leaderboard/friends', { params: { subjectId } }),
};
