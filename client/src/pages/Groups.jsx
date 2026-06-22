import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsService } from '../services/groups.service';
import { filesService } from '../services/files.service';
import { useAuthStore } from '../store/auth';
import { useSocket } from '../hooks/useSocket';
import Navbar from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../services/api';
import {
  Users,
  Plus,
  ArrowLeft,
  Copy,
  Check,
  UserMinus,
  File,
  Download,
  Flame,
  Award,
  Bell,
  Info,
  ExternalLink,
  MessageSquare,
  X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Groups() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  
  // Modals / Input States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'leaderboard' | 'files' | 'feed'
  
  // Real-time group activity feed state
  const [activityFeed, setActivityFeed] = useState([]);

  // Fetch groups list
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsService.getGroups().then((r) => r.data),
  });

  // Fetch current selected group details
  const { data: groupDetails } = useQuery({
    queryKey: ['group', selectedGroupId],
    queryFn: () => groupsService.getGroup(selectedGroupId).then((r) => r.data),
    enabled: !!selectedGroupId,
  });

  // Fetch group members progress
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', selectedGroupId],
    queryFn: () => groupsService.getMembers(selectedGroupId).then((r) => r.data),
    enabled: !!selectedGroupId,
  });

  // Fetch group leaderboard
  const { data: groupLeaderboard = [] } = useQuery({
    queryKey: ['group-leaderboard', selectedGroupId],
    queryFn: () => groupsService.getGroupLeaderboard(selectedGroupId).then((r) => r.data),
    enabled: !!selectedGroupId,
  });

  // Fetch shared files for this group
  const { data: groupFiles = [] } = useQuery({
    queryKey: ['group-files', selectedGroupId],
    queryFn: () => filesService.getSharedFiles(selectedGroupId).then((r) => r.data),
    enabled: !!selectedGroupId,
  });

  // Initialize Socket.io connection for real-time room updates
  const socket = useSocket(selectedGroupId);

  useEffect(() => {
    if (!socket || !selectedGroupId) return;

    // Reset activity feed when switching groups
    setActivityFeed([]);

    const handleGroupActivity = (activity) => {
      if (activity.groupId === selectedGroupId) {
        setActivityFeed((prev) => [activity, ...prev]);
        
        // Refresh members list and leaderboard to show updated progress values
        queryClient.invalidateQueries({ queryKey: ['group-members', selectedGroupId] });
        queryClient.invalidateQueries({ queryKey: ['group-leaderboard', selectedGroupId] });
      }
    };

    socket.on('group_activity', handleGroupActivity);

    return () => {
      socket.off('group_activity', handleGroupActivity);
    };
  }, [socket, selectedGroupId, queryClient]);

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: ({ name, description }) => groupsService.createGroup(name, description),
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setSelectedGroupId(newGroup.id);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.error || 'Failed to create group');
    },
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: (code) => groupsService.joinGroup(code),
    onSuccess: (joinedGroup) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setShowJoinModal(false);
      setInviteCodeInput('');
      setSelectedGroupId(joinedGroup.id);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.error || 'Invalid or expired invite code');
      setTimeout(() => setErrorMessage(''), 4000);
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (memberId) => groupsService.removeGroupMember(selectedGroupId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', selectedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['group-leaderboard', selectedGroupId] });
    },
  });

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    createGroupMutation.mutate({ name: newGroupName.trim(), description: newGroupDesc.trim() });
  };

  const handleJoinGroup = (e) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    joinGroupMutation.mutate(inviteCodeInput.trim().toUpperCase());
  };

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Group file download
  const handleDownload = async (fileId, originalName) => {
    try {
      const response = await api.get(`/files/${fileId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('File download error:', err);
      alert('Failed to download file.');
    }
  };

  const isGroupAdmin = groupDetails?.created_by === currentUser?.id;

  return (
    <div className="min-h-screen bg-cream-50 text-brown-text font-sans">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6">
        {!selectedGroupId ? (
          // --- Main Dashboard: Lists all groups ---
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="text-4xl font-serif font-bold text-brown mb-2">
                  Study Groups
                </h1>
                <p className="text-brown-dark">
                  Collaborate with classmates and prepare for exams together
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowJoinModal(true)}>
                  Join Group
                </Button>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group
                </Button>
              </div>
            </div>

            {/* Error notifications */}
            {errorMessage && (
              <div className="p-3 mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {errorMessage}
              </div>
            )}

            {groupsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2].map((n) => (
                  <div key={n} className="card h-44 bg-white border border-tan animate-pulse" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="card text-center py-16 border border-dashed border-tan max-w-xl mx-auto">
                <Users className="w-16 h-16 text-tan mx-auto mb-4" />
                <h3 className="text-2xl font-serif font-bold text-brown mb-2">
                  Find your study team
                </h3>
                <p className="text-sm text-brown-dark mb-6 max-w-md mx-auto">
                  Create a study group for your exams, share study materials, and watch each other's syllabus progress.
                </p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => setShowJoinModal(true)}>
                    Join via Invite Code
                  </Button>
                  <Button onClick={() => setShowCreateModal(true)}>
                    Create a Group
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className="card border border-tan bg-white p-6 shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="text-xl font-serif font-bold text-brown truncate mb-2">
                        {group.name}
                      </h3>
                      <p className="text-xs text-brown-dark line-clamp-3 mb-4">
                        {group.description || 'No description provided.'}
                      </p>
                    </div>
                    
                    <div className="pt-4 border-t border-tan flex items-center justify-between text-xs text-brown-dark">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {group.membercount || 1} member{group.membercount !== 1 ? 's' : ''}
                      </span>
                      <span className="bg-cream-100 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider">
                        Code: {group.invite_code}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // --- Detailed View: Single Group Workspace ---
          <div className="space-y-6">
            {/* Header / Back Navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-tan">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => setSelectedGroupId(null)}
                  className="p-2 bg-white border border-tan hover:bg-cream-100 rounded-lg text-brown transition-colors mt-1"
                >
                  <ArrowLeft className="w-4.5 h-4.5" />
                </button>
                <div>
                  <h1 className="text-3xl font-serif font-bold text-brown">
                    {groupDetails?.name}
                  </h1>
                  <p className="text-sm text-brown-dark mt-1">
                    {groupDetails?.description || 'Collaborative workspace'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto bg-white border border-tan rounded-lg p-2.5 shadow-sm justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-brown-dark block tracking-wider leading-none">
                    Group Invite Code
                  </span>
                  <span className="text-sm font-bold font-serif text-brown tracking-widest mt-1 block">
                    {groupDetails?.invite_code}
                  </span>
                </div>
                <button
                  onClick={() => copyInviteCode(groupDetails.invite_code)}
                  className="p-1.5 hover:bg-cream-100 text-brown rounded-md transition-colors ml-4"
                  title="Copy Invite Code"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-green-700" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex border-b border-tan">
              {[
                { id: 'members', label: 'Members' },
                { id: 'leaderboard', label: 'Leaderboard' },
                { id: 'files', label: 'Group Files' },
                { id: 'feed', label: 'Activity Feed' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 font-serif font-bold text-sm border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-brown text-brown'
                      : 'border-transparent text-brown-dark hover:text-brown'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Workspace Area according to active tab */}
            <div className="mt-4">
              {activeTab === 'members' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-serif font-bold text-brown">
                    Group Members ({members.length})
                  </h3>

                  {membersLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="card h-28 bg-white border border-tan animate-pulse" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {members.map((member) => {
                        const isSelf = member.id === currentUser?.id;
                        return (
                          <div
                            key={member.id}
                            className={`card border border-tan bg-white p-4 shadow-sm flex items-center justify-between ${
                              isSelf ? 'ring-1 ring-brown/30 bg-cream-50/20' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center font-bold text-brown font-serif border border-tan flex-shrink-0">
                                {member.name[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-serif font-bold text-brown text-sm truncate">
                                  {member.name}
                                </h4>
                                <span className="text-[9px] uppercase font-bold tracking-wider text-brown-dark/70">
                                  {member.role}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* circular SVG progress bar */}
                              <div className="w-10 h-10 relative flex items-center justify-center flex-shrink-0" title={`${member.doneTopics}/${member.totalTopics} topics complete`}>
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle
                                    cx="20"
                                    cy="20"
                                    r="16"
                                    className="stroke-cream-200 fill-none"
                                    strokeWidth="3"
                                  />
                                  <circle
                                    cx="20"
                                    cy="20"
                                    r="16"
                                    className="stroke-brown fill-none transition-all duration-500"
                                    strokeWidth="3"
                                    strokeDasharray={`${2 * Math.PI * 16}`}
                                    strokeDashoffset={`${2 * Math.PI * 16 * (1 - member.percentage / 100)}`}
                                  />
                                </svg>
                                <span className="text-[10px] font-bold absolute text-brown-text">
                                  {member.percentage}%
                                </span>
                              </div>

                              {isGroupAdmin && !isSelf && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove ${member.name} from this group?`)) {
                                      removeMemberMutation.mutate(member.id);
                                    }
                                  }}
                                  className="p-1 rounded text-tan hover:text-red-700 transition-colors"
                                  title="Remove Member"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'leaderboard' && (
                <div className="card border border-tan bg-white p-6 shadow-sm max-w-xl">
                  <h3 className="text-xl font-serif font-bold text-brown mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-brown" />
                    Group Leaderboard
                  </h3>
                  <div className="space-y-2.5">
                    {groupLeaderboard.map((row) => {
                      const isSelf = row.id === currentUser?.id;
                      let rankBadge = `${row.rank}.`;
                      if (row.rank === 1) rankBadge = '🥇';
                      else if (row.rank === 2) rankBadge = '🥈';
                      else if (row.rank === 3) rankBadge = '🥉';

                      return (
                        <div
                          key={row.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            isSelf
                              ? 'bg-cream-100 border-brown font-semibold shadow-sm'
                              : 'bg-white border-tan hover:bg-cream-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm w-6 text-center">{rankBadge}</span>
                            <div className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center font-bold font-serif text-xs text-brown border border-tan">
                              {row.name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-brown-text leading-tight">
                                {row.name}
                              </p>
                              <p className="text-[10px] text-brown-dark">
                                {row.doneTopics || 0}/{row.totalTopics || 0} topics done
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-brown font-serif">
                            {row.percentage !== null && row.percentage !== undefined ? `${row.percentage}%` : '0%'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'files' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-serif font-bold text-brown">
                      Shared Materials
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => navigate('/files', { state: { groupId: selectedGroupId } })} className="text-xs">
                      Share new notes
                    </Button>
                  </div>

                  {groupFiles.length === 0 ? (
                    <div className="card text-center py-10 border border-dashed border-tan">
                      <File className="w-10 h-10 text-tan mx-auto mb-2" />
                      <p className="text-sm text-brown font-semibold">No materials shared yet</p>
                      <p className="text-xs text-brown-dark mt-1">
                        Go to your Files page to share notes or textbooks with this study group.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-tan overflow-hidden shadow-sm">
                      <div className="divide-y divide-tan">
                        {groupFiles.map((file) => (
                          <div
                            key={file.id}
                            className="p-4 flex items-center justify-between hover:bg-cream-50/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded bg-cream-100 flex items-center justify-center border border-tan flex-shrink-0">
                                <File className="w-5.5 h-5.5 text-brown" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-brown-text truncate">
                                  {file.original_name}
                                </p>
                                <p className="text-[10px] text-brown-dark mt-0.5">
                                  Shared by <span className="font-semibold text-brown">{file.uploaderName}</span> &bull; {format(new Date(file.created_at), 'MMM dd, yyyy')}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDownload(file.id, file.original_name)}
                              className="p-2 text-brown hover:bg-cream-100 rounded-lg transition-colors ml-4"
                              title="Download shared file"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'feed' && (
                <div className="card border border-tan bg-white p-6 shadow-sm max-w-xl">
                  <h3 className="text-xl font-serif font-bold text-brown mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-brown" />
                    Live Activity Feed
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Connection Status Helper */}
                    <div className="flex items-center gap-2 p-2 bg-cream-100/50 rounded-lg border border-tan text-[10px] text-brown-dark">
                      <span className={`w-2 h-2 rounded-full ${socket ? 'bg-green-700' : 'bg-tan animate-pulse'}`} />
                      <span>{socket ? 'Real-time sync active' : 'Connecting to workspace updates...'}</span>
                    </div>

                    <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                      {activityFeed.length === 0 ? (
                        <div className="text-center py-8 text-xs text-brown-dark italic">
                          No recent study activities. Updates will appear here in real-time as members complete syllabus topics.
                        </div>
                      ) : (
                        activityFeed.map((activity, idx) => (
                          <div key={idx} className="flex gap-2.5 text-xs text-brown-text items-start">
                            <div className="w-6 h-6 rounded-full bg-cream-200 flex items-center justify-center font-bold text-[10px] text-brown flex-shrink-0 mt-0.5">
                              {activity.userName[0].toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="leading-snug">
                                <span className="font-bold text-brown">{activity.userName}</span>{' '}
                                {activity.action}
                              </p>
                              <span className="text-[9px] text-brown-dark/60 block mt-0.5">
                                {format(parseISO(activity.createdAt), 'hh:mm a')}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-cream-50 rounded-xl border border-tan shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 text-brown-dark hover:text-brown transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-serif font-bold text-brown mb-4">
              Create Study Group
            </h3>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-text mb-1">
                  Group Name *
                </label>
                <Input
                  required
                  placeholder="e.g., AP Chemistry Study Crew"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-text mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Describe your study objectives, syllabus scope, or meeting timings..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-tan rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brown text-sm h-20"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createGroupMutation.isPending}
                >
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-cream-50 rounded-xl border border-tan shadow-xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setShowJoinModal(false)}
              className="absolute right-4 top-4 text-brown-dark hover:text-brown transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-serif font-bold text-brown mb-2">
              Join Study Group
            </h3>
            <p className="text-xs text-brown-dark mb-4">
              Enter the alphanumeric invite code shared by the group admin.
            </p>
            <form onSubmit={handleJoinGroup} className="space-y-4">
              <Input
                required
                maxLength={10}
                placeholder="ENTER CODE (e.g., MATH123)"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                className="text-center font-bold tracking-widest text-base uppercase"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowJoinModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={joinGroupMutation.isPending}
                >
                  Join
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
