import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/auth';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useSocket(groupId) {
  const socketRef = useRef(null);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      auth: {
        token: accessToken,
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✓ Socket connected:', socket.id);
      if (groupId) {
        socket.emit('join_group_room', groupId);
      }
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    return () => {
      if (groupId) {
        socket.emit('leave_group_room', groupId);
      }
      socket.disconnect();
    };
  }, [accessToken, groupId]);

  return socketRef.current;
}
