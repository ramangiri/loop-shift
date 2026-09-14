import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  bestChain: integer('best_chain').notNull().default(0),
  bestClean: integer('best_clean').notNull().default(0),
  highestLevel: integer('highest_level').notNull().default(1),
  furthestPass: integer('furthest_pass').notNull().default(0),
  achievements: integer('achievements').notNull().default(0),
  best: integer('best').notNull().default(0),
  achievedAt: integer('achieved_at').notNull(),
  lastSubmitAt: integer('last_submit_at').notNull().default(0),
}, t => [index('idx_players_ranking').on(sql`${t.best} desc`, t.achievedAt, t.id)]);

export const dailyScores = sqliteTable('daily_scores', {
  day: text('day').notNull(),
  playerId: text('player_id').notNull().references(()=>players.id),
  best: integer('best').notNull(),
  achievedAt: integer('achieved_at').notNull(),
}, t=>[primaryKey({columns:[t.day,t.playerId]}),index('idx_daily_ranking').on(t.day,sql`${t.best} desc`,t.achievedAt,t.playerId)]);
export const dailyRuns = sqliteTable('daily_runs', {
  playerId: text('player_id').primaryKey().references(()=>players.id),
  token: text('token').notNull(),
  day: text('day').notNull(),
  startedAt: integer('started_at').notNull(),
  finishScore: integer('finish_score'),
  finishDuration: integer('finish_duration'),
  finishedAt: integer('finished_at'),
});
