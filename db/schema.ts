import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  bossTrophies: integer('boss_trophies').notNull().default(0),
  playerTitles: integer('player_titles').notNull().default(0),
  selectedTitle: text('selected_title').notNull().default(''),
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

export const weeklyScores = sqliteTable('weekly_scores', {
  week: text('week').notNull(), playerId: text('player_id').notNull().references(()=>players.id),
  best: integer('best').notNull(), achievedAt: integer('achieved_at').notNull(),
}, t=>[primaryKey({columns:[t.week,t.playerId]}),index('idx_weekly_ranking').on(t.week,sql`${t.best} desc`,t.achievedAt,t.playerId)]);
export const weeklyRuns = sqliteTable('weekly_runs', {
  token: text('token').primaryKey(), playerId: text('player_id').notNull().references(()=>players.id),
  week: text('week').notNull(), startedAt: integer('started_at').notNull(),
  finishScore: integer('finish_score'), finishDuration: integer('finish_duration'), finishedAt: integer('finished_at'),
},t=>[index('idx_weekly_runs_owner').on(t.playerId,t.startedAt)]);
export const socialRuns = sqliteTable('social_runs', {
  token: text('token').primaryKey(), playerId: text('player_id').notNull().references(()=>players.id),
  kind: text('kind').notNull(), week: text('week').notNull(), startedAt: integer('started_at').notNull(),
  finishedAt: integer('finished_at'), payload: text('payload'), sparks: integer('sparks').notNull().default(0),
},t=>[index('idx_community_week').on(t.week,t.finishedAt),index('idx_social_owner').on(t.playerId,t.week)]);
export const friendGroups = sqliteTable('friend_groups', {
  id: text('id').primaryKey(), name: text('name').notNull(), invite: text('invite').notNull().unique(), createdAt: integer('created_at').notNull(),
});
export const friendMembers = sqliteTable('friend_members', {
  groupId: text('group_id').notNull().references(()=>friendGroups.id), playerId: text('player_id').notNull().references(()=>players.id),
},t=>[primaryKey({columns:[t.groupId,t.playerId]}),index('idx_friend_owner').on(t.playerId)]);
export const socialLimits = sqliteTable('social_limits', {
  playerId: text('player_id').notNull().references(()=>players.id), action: text('action').notNull(), bucket: integer('bucket').notNull(), count: integer('count').notNull(),
},t=>[primaryKey({columns:[t.playerId,t.action]})]);
