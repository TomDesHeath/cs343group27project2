import { useEffect, useState, useCallback } from 'react';

/**
 * Hook to manage game-specific Socket.IO events
 * Handles lobby, questions, answers, scores, and timers
 */
export function useGameSocket(socket, matchId, username) {
  // Game state
  const [players, setPlayers] = useState([]);
  const [hostId, setHostId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [matchConfig, setMatchConfig] = useState(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [finalRanking, setFinalRanking] = useState([]);
  const [isReady, setIsReady] = useState(false);

  // Join the match when socket connects
  useEffect(() => {
    if (!socket || !matchId || !username) return;

    console.log(`Joining match: ${matchId} as ${username}`);
    socket.emit('match:join', {
      matchId,
      displayName: username,
    });

    // Cleanup: leave match on unmount
    return () => {
      console.log('Leaving match');
    };
  }, [socket, matchId, username]);

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    // Presence updates (players joining/leaving)
    socket.on('presence:update', (data) => {
      console.log('Presence update:', data);
      setPlayers(data.players || []);
      setHostId(data.hostId);
    });

    // Lobby configuration (rounds, questions, etc.)
    socket.on('lobby:config', (data) => {
      console.log('Lobby config:', data);
      setMatchConfig(data);
    });

    // Question received
    socket.on('question:show', (data) => {
      console.log('Question received:', data);
      setCurrentQuestion(data);
      setTimeRemaining(data.timeLimitMs);
      setGameEnded(false);
    });

    // Timer tick
    socket.on('timer:tick', (data) => {
      setTimeRemaining(data.msRemaining);
    });

    // Answer acknowledgement
    socket.on('answer:ack', (data) => {
      console.log('Answer acknowledged:', data);
      if (!data.accepted) {
        console.warn('Answer rejected:', data.reason);
      }
    });

    // Reveal correct answer
    socket.on('question:reveal', (data) => {
      console.log('Answer revealed:', data);
      if (currentQuestion) {
        setCurrentQuestion({
          ...currentQuestion,
          correctAnswer: data.correctAnswer,
          correctAnswerIndex: data.correctAnswerIndex,
          revealed: true,
        });
      }
    });

    // Score update
    socket.on('score:update', (data) => {
      console.log('Score update:', data);
      setLeaderboard(data.leaderboard || []);
    });

    // Match ended
    socket.on('match:end', (data) => {
      console.log('Match ended:', data);
      setGameEnded(true);
      setFinalRanking(data.ranking || []);
      setCurrentQuestion(null);
      setTimeRemaining(null);
    });

    // Start acknowledgement
    socket.on('host:start:ack', (data) => {
      console.log('Start acknowledged:', data);
      if (!data.accepted) {
        alert(`Cannot start match: ${data.reason || 'Unknown error'}`);
      }
    });

    // Cleanup listeners
    return () => {
      socket.off('presence:update');
      socket.off('lobby:config');
      socket.off('question:show');
      socket.off('timer:tick');
      socket.off('answer:ack');
      socket.off('question:reveal');
      socket.off('score:update');
      socket.off('match:end');
      socket.off('host:start:ack');
    };
  }, [socket, currentQuestion]);

  // Toggle ready status
  const toggleReady = useCallback(() => {
    if (!socket || !matchId) return;
    const newReadyState = !isReady;
    console.log(`Setting ready to: ${newReadyState}`);
    socket.emit('lobby:ready', {
      matchId,
      ready: newReadyState,
    });
    setIsReady(newReadyState);
  }, [socket, matchId, isReady]);

  // Submit answer
  const submitAnswer = useCallback(
    (questionId, answer) => {
      if (!socket || !matchId) return;
      console.log(`Submitting answer: ${answer} for question ${questionId}`);
      socket.emit('answer:submit', {
        matchId,
        questionId,
        answer,
        atMs: Date.now(),
      });
    },
    [socket, matchId]
  );

  // Start match (host only)
  const startMatch = useCallback(
    (config = {}) => {
      if (!socket || !matchId) return;
      console.log('Starting match with config:', config);
      socket.emit('host:start', {
        matchId,
        ...config,
      });
    },
    [socket, matchId]
  );

  // Cancel match (host only)
  const cancelMatch = useCallback(() => {
    if (!socket || !matchId) return;
    console.log('Cancelling match');
    socket.emit('host:cancel', { matchId });
  }, [socket, matchId]);

  return {
    // State
    players,
    hostId,
    currentQuestion,
    timeRemaining,
    leaderboard,
    matchConfig,
    gameEnded,
    finalRanking,
    isReady,

    // Actions
    toggleReady,
    submitAnswer,
    startMatch,
    cancelMatch,
  };
}

export default useGameSocket;
