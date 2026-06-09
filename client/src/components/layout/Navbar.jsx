import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { authService } from '../../services/auth.service';
import { notificationsService } from '../../services/notifications.service';
import { useSocket } from '../../hooks/useSocket';
import { Button } from '../ui/Button';
import { Bell, Mail, BookOpen, FileCheck, X, Check } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

export default function Navbar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  const socket = useSocket();

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.getNotifications(15).then((r) => r.data),
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Real-time socket updates for notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (payload) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (payload.type === 'friend_request' || payload.type === 'friend_accepted') {
        queryClient.invalidateQueries({ queryKey: ['friends'] });
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      }
    };

    socket.on('notification', handleNewNotification);

    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [socket, queryClient]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    logout();
    navigate('/login');
  };

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => notificationsService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getNotificationDetails = (n) => {
    switch (n.type) {
      case 'friend_request':
        return {
          icon: <Mail className="w-4 h-4 text-brown" />,
          title: 'Friend Request',
          message: `${n.payload?.fromName || 'Someone'} sent you a friend request.`,
        };
      case 'friend_accepted':
        return {
          icon: <Check className="w-4 h-4 text-green-700" />,
          title: 'Request Accepted',
          message: `${n.payload?.friendName || 'Someone'} accepted your friend request.`,
        };
      case 'progress_update':
        return {
          icon: <BookOpen className="w-4 h-4 text-brown" />,
          title: 'Friend Progress',
          message: `${n.payload?.friendName || 'A friend'} completed "${n.payload?.topicName || 'a topic'}".`,
        };
      case 'file_shared':
        return {
          icon: <FileCheck className="w-4 h-4 text-brown" />,
          title: 'File Shared',
          message: `${n.payload?.fromName || 'Someone'} shared a file: "${n.payload?.fileName || 'file'}".`,
        };
      default:
        return {
          icon: <Bell className="w-4 h-4 text-brown" />,
          title: 'Notification',
          message: 'You have a new update.',
        };
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-tan sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-serif font-bold text-brown">
            StudySync
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-brown-text hover:text-brown font-medium transition-colors"
          >
            Home
          </Link>
          <Link
            to="/analytics"
            className="text-brown-text hover:text-brown font-medium transition-colors"
          >
            Analytics
          </Link>
          <Link
            to="/friends"
            className="text-brown-text hover:text-brown font-medium transition-colors"
          >
            Friends
          </Link>
          <Link
            to="/groups"
            className="text-brown-text hover:text-brown font-medium transition-colors"
          >
            Groups
          </Link>
          <Link
            to="/files"
            className="text-brown-text hover:text-brown font-medium transition-colors"
          >
            Files
          </Link>

          {/* Notifications bell and dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1.5 text-brown-text hover:text-brown transition-colors focus:outline-none"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brown text-cream-50 text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center border border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-cream-50 rounded-xl border border-tan shadow-xl overflow-hidden z-50 animate-fade-in">
                <div className="px-4 py-3 bg-white border-b border-tan flex items-center justify-between">
                  <span className="font-serif font-bold text-brown">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsReadMutation.mutate()}
                      className="text-[10px] text-brown hover:underline font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-tan">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-brown-dark">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const { icon, title, message } = getNotificationDetails(n);
                      return (
                        <div
                          key={n.id}
                          className={`p-3 flex items-start gap-2.5 transition-colors relative group ${
                            !n.is_read ? 'bg-white font-medium' : 'bg-cream-50/50'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full bg-cream-100 flex items-center justify-center flex-shrink-0 border border-tan">
                            {icon}
                          </div>
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-xs text-brown-text font-semibold">{title}</p>
                            <p className="text-[11px] text-brown-dark mt-0.5 leading-snug break-words">
                              {message}
                            </p>
                            <span className="text-[9px] text-brown-dark/60 mt-1 block">
                              {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          
                          <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.is_read && (
                              <button
                                onClick={() => markReadMutation.mutate(n.id)}
                                className="p-0.5 hover:bg-cream-200 rounded text-brown-dark"
                                title="Mark read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotificationMutation.mutate(n.id)}
                              className="p-0.5 hover:bg-cream-200 rounded text-brown-dark"
                              title="Delete"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 ml-2 pl-4 border-l border-tan">
            <span className="text-sm font-medium text-brown max-w-[80px] truncate">
              {user?.name}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
