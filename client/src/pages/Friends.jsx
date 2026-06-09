import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { friendsService } from '../services/friends.service';
import { subjectsService } from '../services/subjects.service';
import { useAuthStore } from '../store/auth';
import Navbar from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, UserPlus, Check, X, Trophy, UserMinus, ShieldAlert, Award } from 'lucide-react';

export default function Friends() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [emailInput, setEmailInput] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'leaderboard'
  const [leaderboardSubjectId, setLeaderboardSubjectId] = useState('');

  // Fetch friends list
  const { data: friendships = [], isLoading: friendsLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: () => friendsService.getFriends().then((r) => r.data),
  });

  // Fetch leaderboard
  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery({
    queryKey: ['leaderboard', leaderboardSubjectId],
    queryFn: () => friendsService.getLeaderboard(leaderboardSubjectId || null).then((r) => r.data),
  });

  // Fetch subjects (for filtering the leaderboard)
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsService.getSubjects().then((r) => r.data),
  });

  // Send request mutation
  const sendRequestMutation = useMutation({
    mutationFn: (email) => friendsService.sendFriendRequest(email),
    onSuccess: () => {
      setSuccessMessage('Friend request sent successfully!');
      setErrorMessage('');
      setEmailInput('');
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      setTimeout(() => setSuccessMessage(''), 4000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.error || 'Failed to send friend request');
      setSuccessMessage('');
      setTimeout(() => setErrorMessage(''), 4000);
    },
  });

  // Accept/Decline request mutation
  const respondMutation = useMutation({
    mutationFn: ({ id, action }) => friendsService.respondToRequest(id, action),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      setSuccessMessage(`Friend request ${action}ed!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    },
  });

  // Remove friend mutation
  const removeFriendMutation = useMutation({
    mutationFn: (friendId) => friendsService.removeFriend(friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      setSuccessMessage('Friend removed');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
  });

  const handleSendRequest = (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    sendRequestMutation.mutate(emailInput.trim());
  };

  // Categorize friendships
  const friends = friendships.filter((f) => f.status === 'accepted');
  const incomingRequests = friendships.filter(
    (f) => f.status === 'pending' && f.requesterId !== currentUser?.id
  );
  const outgoingRequests = friendships.filter(
    (f) => f.status === 'pending' && f.requesterId === currentUser?.id
  );

  return (
    <div className="min-h-screen bg-cream-50 text-brown-text font-sans">
      <Navbar />

      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-brown mb-2">
            Social Accountability
          </h1>
          <p className="text-brown-dark">
            Connect with friends, check their syllabus completion, and rank on the leaderboard
          </p>
        </div>

        {/* Tab switcher on mobile / layouts on desktop */}
        <div className="flex border-b border-tan mb-6 md:hidden">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-3 text-center font-serif font-bold text-sm ${
              activeTab === 'list'
                ? 'border-b-2 border-brown text-brown'
                : 'text-brown-dark'
            }`}
          >
            Friends & Requests
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-3 text-center font-serif font-bold text-sm ${
              activeTab === 'leaderboard'
                ? 'border-b-2 border-brown text-brown'
                : 'text-brown-dark'
            }`}
          >
            Leaderboard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left / Middle: Friend List & Requests */}
          <div
            className={`md:col-span-2 space-y-6 ${
              activeTab === 'list' ? 'block' : 'hidden md:block'
            }`}
          >
            {/* Add Friend Card */}
            <div className="card border border-tan bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-serif font-bold text-brown mb-2">
                Add Study Buddy
              </h2>
              <p className="text-xs text-brown-dark mb-4">
                Enter your friend's email address to send them a progress-sharing invitation.
              </p>

              <form onSubmit={handleSendRequest} className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="email"
                    required
                    placeholder="friend@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="w-5 h-5 text-tan absolute left-3 top-2.5" />
                </div>
                <Button
                  type="submit"
                  disabled={sendRequestMutation.isPending}
                  className="flex items-center"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite
                </Button>
              </form>

              {successMessage && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 p-2.5 rounded-lg mt-3">
                  {successMessage}
                </p>
              )}
              {errorMessage && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-lg mt-3">
                  {errorMessage}
                </p>
              )}
            </div>

            {/* Requests Inbox Section */}
            {incomingRequests.length > 0 && (
              <div className="card border border-tan bg-white p-6 shadow-sm">
                <h3 className="text-xl font-serif font-bold text-brown mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brown animate-pulse" />
                  Friend Requests ({incomingRequests.length})
                </h3>
                <div className="divide-y divide-tan">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-cream-200 flex items-center justify-center font-bold text-brown font-serif border border-tan">
                          {req.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-brown-text">
                            {req.name}
                          </p>
                          <p className="text-xs text-brown-dark">{req.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            respondMutation.mutate({ id: req.id, action: 'accept' })
                          }
                          disabled={respondMutation.isPending}
                          className="p-1.5 rounded-lg bg-brown text-white hover:bg-brown-dark transition-colors"
                          title="Accept Request"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            respondMutation.mutate({ id: req.id, action: 'decline' })
                          }
                          disabled={respondMutation.isPending}
                          className="p-1.5 rounded-lg border border-tan text-brown-dark hover:bg-cream-100 transition-colors"
                          title="Decline Request"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outgoing Requests Pending */}
            {outgoingRequests.length > 0 && (
              <div className="card border border-tan bg-white p-6 shadow-sm">
                <h3 className="text-lg font-serif font-bold text-brown-dark mb-3">
                  Sent Invitations ({outgoingRequests.length})
                </h3>
                <div className="flex flex-wrap gap-3">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-2 px-3 py-2 bg-cream-50 rounded-lg border border-tan text-xs text-brown-dark"
                    >
                      <span>{req.name} ({req.email})</span>
                      <span className="italic text-[10px] text-brown-dark/70">pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends Grid */}
            <div>
              <h3 className="text-2xl font-serif font-bold text-brown mb-4">
                Your Study Buddies ({friends.length})
              </h3>
              
              {friendsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="card h-28 border border-tan bg-white animate-pulse" />
                  <div className="card h-28 border border-tan bg-white animate-pulse" />
                </div>
              ) : friends.length === 0 ? (
                <div className="card text-center py-12 border border-dashed border-tan">
                  <span className="text-4xl mb-3 block">🤝</span>
                  <h4 className="text-lg font-serif font-bold text-brown mb-1">
                    No study buddies yet
                  </h4>
                  <p className="text-sm text-brown-dark max-w-sm mx-auto">
                    Studying is better together! Type in their email above and invite them to sync up progress.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {friends.map((friend) => (
                    <FriendCard
                      key={friend.friendId}
                      friend={friend}
                      onRemove={() => {
                        if (confirm(`Remove ${friend.name} from friends list?`)) {
                          removeFriendMutation.mutate(friend.friendId);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Leaderboard */}
          <div
            className={`space-y-6 ${
              activeTab === 'leaderboard' ? 'block' : 'hidden md:block'
            }`}
          >
            <div className="card border border-tan bg-white p-6 shadow-sm h-full">
              <div className="flex items-center justify-between mb-4 border-b border-tan pb-3">
                <h2 className="text-2xl font-serif font-bold text-brown flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-brown fill-current" />
                  Leaderboard
                </h2>
              </div>

              <div className="mb-4">
                <label className="block text-xs uppercase font-bold text-brown-dark mb-1">
                  Filter by Subject
                </label>
                <select
                  value={leaderboardSubjectId}
                  onChange={(e) => setLeaderboardSubjectId(e.target.value)}
                  className="w-full px-2 py-1.5 border border-tan rounded-lg bg-cream-50 text-xs focus:ring-1 focus:ring-brown focus:outline-none"
                >
                  <option value="">All Subjects Combined</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {leaderboardLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-10 bg-cream-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <p className="text-xs text-brown-dark text-center py-6">
                  Add friends to populate the social leaderboard rankings.
                </p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((row) => {
                    const isSelf = row.id === currentUser?.id;
                    
                    // Style first three positions
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
                            <p className="text-xs truncate max-w-[100px] text-brown-text">
                              {row.name} {isSelf && <span className="text-[10px] bg-brown/10 px-1 rounded text-brown font-normal">You</span>}
                            </p>
                            <p className="text-[9px] text-brown-dark">
                              {row.doneTopics || 0}/{row.totalTopics || 0} done
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component representing a single accepted friend card
function FriendCard({ friend, onRemove }) {
  const [expanded, setExpanded] = useState(false);

  // Fetch this specific friend's subject-by-subject progress on accordion expansion
  const { data: progress = [], isLoading } = useQuery({
    queryKey: ['friend-progress', friend.friendId],
    queryFn: () => friendsService.getFriendProgress(friend.friendId).then((r) => r.data),
    enabled: expanded,
  });

  // Calculate total syllabus average from progress query data
  const totalWeight = progress.reduce((acc, sub) => acc + sub.total, 0);
  const doneWeight = progress.reduce((acc, sub) => acc + sub.done, 0);
  const totalPercentage = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0;

  return (
    <div className="card border border-tan bg-white p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Friend Profile Circle */}
          <div className="w-12 h-12 rounded-full bg-cream-100 flex items-center justify-center border border-tan relative">
            <span className="text-lg font-serif font-bold text-brown">
              {friend.name[0].toUpperCase()}
            </span>
          </div>

          <div>
            <h4 className="font-serif font-bold text-brown text-base">{friend.name}</h4>
            <p className="text-xs text-brown-dark">{friend.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Progress Circular visual representation */}
          <div className="w-10 h-10 relative flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                className="stroke-cream-200 fill-none"
                strokeWidth="3.5"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                className="stroke-brown fill-none transition-all duration-500"
                strokeWidth="3.5"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - totalPercentage / 100)}`}
              />
            </svg>
            <span className="text-[10px] font-bold absolute text-brown-text">
              {totalPercentage}%
            </span>
          </div>

          <button
            onClick={onRemove}
            className="p-1 rounded text-tan hover:text-red-700 transition-colors"
            title="Remove Friend"
          >
            <UserMinus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-tan flex flex-col items-center">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold text-brown hover:text-brown-dark flex items-center gap-1 transition-colors"
        >
          {expanded ? 'Hide Progress Detail' : 'Show Progress Detail'}
        </button>

        {expanded && (
          <div className="w-full mt-3 space-y-2">
            {isLoading ? (
              <p className="text-[10px] text-brown-dark text-center animate-pulse">
                Fetching syllabus progress...
              </p>
            ) : progress.length === 0 ? (
              <p className="text-[10px] text-brown-dark text-center italic">
                Syllabus is empty or progress sharing is restricted.
              </p>
            ) : (
              <div className="space-y-2.5">
                {progress.map((sub) => (
                  <div key={sub.subjectId}>
                    <div className="flex justify-between text-[10px] font-medium text-brown-dark mb-0.5">
                      <span className="truncate max-w-[70%]">{sub.subjectName}</span>
                      <span>{sub.percentage}% ({sub.done}/{sub.total})</span>
                    </div>
                    <div className="w-full bg-cream-100 rounded-full h-1">
                      <div
                        className="h-1 rounded-full"
                        style={{
                          backgroundColor: sub.color || '#8B6E52',
                          width: `${sub.percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
