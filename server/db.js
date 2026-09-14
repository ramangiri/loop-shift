export function database(env) {
  if (!env.DB) throw new Error('Leaderboard database is unavailable');
  return env.DB;
}
