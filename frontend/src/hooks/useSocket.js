import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [latestReading, setLatestReading] = useState(null);
  const [latestAlert, setLatestAlert] = useState(null);

  useEffect(() => {
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('🔌 Socket.IO connected');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('🔌 Socket.IO disconnected');
    });

    socket.on('reading', (data) => {
      setLatestReading(data);
    });

    socket.on('alert', (data) => {
      setLatestAlert(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinDevice = useCallback((deviceId) => {
    if (socketRef.current) {
      socketRef.current.emit('joinDevice', deviceId);
    }
  }, []);

  return { connected, latestReading, latestAlert, joinDevice, socket: socketRef };
}
