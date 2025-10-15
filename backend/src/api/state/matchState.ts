export type RuntimePlayer = { userId: string; score: number; answered: boolean };
export type RuntimeState = {
  matchId: string;
  startedAt?: number;
  currentIndex: number;
  fastestMs?: number;
  players: Record<string, RuntimePlayer>;
};

export const matchesRuntime = new Map<string, RuntimeState>();
