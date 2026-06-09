import api from './api';

export const groupsService = {
  getGroups: () => api.get('/groups'),

  createGroup: (name, description) =>
    api.post('/groups', { name, description }),

  getGroup: (groupId) =>
    api.get(`/groups/${groupId}`),

  joinGroup: (inviteCode) =>
    api.post('/groups/join', { inviteCode }),

  getMembers: (groupId) =>
    api.get(`/groups/${groupId}/members`),

  removeGroupMember: (groupId, memberId) =>
    api.delete(`/groups/${groupId}/members/${memberId}`),

  getGroupLeaderboard: (groupId) =>
    api.get(`/groups/${groupId}/leaderboard`),
};
