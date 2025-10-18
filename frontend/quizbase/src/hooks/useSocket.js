import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_ORIGIN } from '../lib/apiClient.js';

const deriveSocketUrl = () => {
  const configured = import.meta.env?.VITE_SOCKET_URL;
  if (typeof configured === 'string' && configured.trim() !== '') {
    return configured.trim();
  }
  return API_ORIGIN || 'http://localhost:4000';
};

const SOCKET_URL = deriveSocketUrl();

/**
 * Hook to manage Socket.IO connection
 * Automatically connects on mount and disconnects on unmount
 */
export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket.IO connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error.message);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        console.log('🔌 Disconnecting socket');
        socket.disconnect();
      }
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
  };
}

export default useSocket;
