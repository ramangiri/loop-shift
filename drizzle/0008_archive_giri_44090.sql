-- Remove the duplicate Giri 44,090 entry from public leaderboards without deleting unrelated player data.
INSERT OR IGNORE INTO board_removals (player_id, name, score, reason)
SELECT p.id, p.name, p.best, 'Owner-requested duplicate removal, screenshot 2026-09-17'
FROM players p
WHERE lower(trim(p.name)) = 'giri'
  AND p.best = 44090
  AND (SELECT COUNT(*) FROM players q WHERE lower(trim(q.name)) = 'giri' AND q.best = 44090) = 1;
