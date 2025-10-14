export function perQuestionScore(responseMs, fastestMs) {
  const base = 100;
  const floor = 10;
  const penalty = Math.floor(Math.max(0, responseMs - fastestMs) / 100);
  return Math.max(floor, base - penalty);
}
