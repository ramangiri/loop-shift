-- Archive only the three uniquely matching screenshot entries. Keep accounts and scores intact.
CREATE TABLE board_removals (player_id TEXT PRIMARY KEY, name TEXT NOT NULL, score INTEGER NOT NULL, reason TEXT NOT NULL);
--> statement-breakpoint
INSERT INTO board_removals (player_id, name, score, reason)
SELECT p.id, p.name, p.best, 'Owner-requested removal, screenshot 2026-09-16'
FROM players p
WHERE ((lower(trim(p.name)) = 'giri' AND p.best = 1087)
 OR (lower(trim(p.name)) = 'toby' AND p.best = 313)
 OR (lower(trim(p.name)) = 'mom' AND p.best = 298))
AND (SELECT COUNT(*) FROM players q WHERE lower(trim(q.name)) = lower(trim(p.name)) AND q.best = p.best) = 1;
