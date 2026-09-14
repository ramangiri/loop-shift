# Loop Shift — website with a shared Top 10

Two screens: Home and Play. Players choose a nickname before their first round. Home shows the ten highest personal bests and the current player's rank.

## This GitHub repository

The browser files at the repository root mirror `www/` so the existing root-based static website receives the latest game. Edit `www/` for the full project, and copy its browser assets to the root when updating the static website. The full server, database migrations, source download and automated checks are included.

A static host such as GitHub Pages runs the game with the existing **Play without ranking** option. Shared nicknames, Top 10 and the daily challenge require the included backend; static hosting alone cannot run that API. For the complete game locally, use `npm start` with Node.js 24 and open `http://localhost:8080`.

## Daily challenge and feedback update

Home now offers Endless and Daily Challenge. Daily is a 120-second score attack with a separate daily Top 10. The server assigns a dated seed: everyone gets the same sequence that day. It resets at 00:00 UTC (05:30 India time). Attempts are unlimited, but each player has only one active daily attempt; a new attempt replaces the previous one. A started attempt may finish across midnight, saving to its original date, and expires after 30 minutes including pauses. Daily requires a saved online nickname and connection to begin. Failed score submissions can be retried. Daily scores do not replace Endless scores.

All game modes use fixed 120 Hz physics. Obstacle generation has its own seeded random stream, unaffected by particles, reduced-motion settings or cosmetic selections. Safe-gap generation at level changes follows the course, not the player's chosen lane. This guarantees the same generated sequence, not identical player performance. Scores remain client-reported with bounded values and authenticated attempt ownership, not cheat-proof competition results.

The next safe gap now has a steady gold glow. The normal ball keeps its selected colour (lime by default); shields never change the ball's colour. One or two lime protective circles indicate charges. The first shield has a single chime, the second a double chime, and shield loss has a low two-note break sound and shatter fragments. The 0.65-second immunity remains. Reduced motion disables fragments and glowing animation; protection uses a steady translucent ball rather than flashing.

Game over briefly marks the impact location. Feedback is based on whether the ball was still moving toward the safe ring, had just moved into a blocked ring, or stayed away from the gap. Results show survival time, perfect shifts and the points needed to beat the relevant best. Try again repeats the same mode and course; Home's Play now starts a fresh Endless course when no round is paused. Tap and Space both use the same guided adjacent shift.

The soundtrack is replaced by an original mellow bass-and-percussion beat. It follows the game’s obstacle rhythm and gains stronger percussion during Fever. Short cues mark closed barriers’ perfect windows. Music and effects retain separate controls. No external recordings are included.

## Six-ring challenge update

Every 12 cleared obstacles completes a level. Level 1 has two rings for a roughly 14.5-second introduction; levels 2–4 have three, 5–8 four, 9–12 five, and 13 onward six. Six is the maximum. Angular speed rises from 0.78 to a capped 1.9 radians/second. Level transitions never pause or add a countdown. A small completion banner appears above the rings for 1.35 seconds. The next wall starts about 2.3 seconds away while speed eases upward and the radius smoothly follows the new ring layout.

Tap anywhere on the play screen or press Space: both move exactly one ring. The two-ring introduction has no hollow marker; guidance appears with the third ring at Level 2. With two rings, each tap switches to the other ring. With three to six rings, the nearest wall determines the direction toward its safe gap. After an early move into the gap, another tap returns toward that wall’s entry ring until the wall passes. This keeps timing meaningful and avoids jumping ahead to a later wall. Countdown, pause and the 95 ms cooldown ignore shifts; held Space and secondary touches do not repeat. Each generated gap is adjacent to the previous one, except easy recovery rows that keep the same gap. With three or more rings, a hollow ice-blue marker and dotted ring show the exact next destination. There are no inward/outward controls.

Six sparks earn a shield. At 2–4 rings you can hold one, at 5–6 rings you can hold two. One collision consumes one shield, followed by 0.65 seconds of protection so the remaining shield is not lost immediately. Fever preserves shields.

Every level gets a different accent colour, an animated completion banner above the rings and a level-up sound. The original bass-and-percussion soundtrack follows the orbit’s actual speed and obstacle grid, with stronger percussion during Fever. Music and effects have separate controls and saved preferences. Audio is unlocked by pressing Play, waits through countdowns, and stops on pause/background/game over. No third-party music recordings are included. Device/browser audio restrictions may require tapping Play again after returning to the game.

The Top 10 and saved player records are preserved. The live target shows the next listed rival's score to beat. Existing scores remain on the same board; historical scores were earned under the earlier game rules.

## Run on your Mac

1. Extract the complete ZIP.
2. Install Node.js 24 (or Node.js 22.13 or later).
3. Open Terminal, type `cd `, drag the extracted `LoopShift-Website` folder into Terminal and press Enter.
4. Run:

```sh
npm run web
```

5. Open http://127.0.0.1:8080 and keep Terminal open. Ctrl+C stops the server.

No dependency installation is needed to play locally. Node's built-in SQLite support may print an experimental warning on some Node versions; the server can still run. If port 8080 is busy, use `PORT=8081 npm run web`.

## Play on your phone

Connect your phone and Mac to the same trusted Wi-Fi. Run this from the project folder:

```sh
LOOPSHIFT_HOST=0.0.0.0 npm run web
```

Find your Mac's Wi-Fi IP address in its network settings. On your phone open `http://YOUR-MAC-IP:8080`. Everyone using this server shares its leaderboard. Keep the Mac awake and the server running. Install/offline features require HTTPS; gameplay works on local HTTP.

The layout includes large touch controls, compact controls for short screens, and expandable pause/results panels. Enter a nickname, press Save & play, then tap to switch rings.

## How the board works

- Nicknames use 1–16 Unicode letters/numbers, spaces, dots, apostrophes, hyphens or underscores.
- A player's best score appears once. Lower scores do not replace it. Changing the nickname keeps the score.
- Scores sort highest first. Equal scores rank by who reached the score first, then by stable player ID for exact ties.
- Signed-in visitors on the hosted Site use their platform identity; their nickname and ranked best follow that identity across devices.
- On a standalone server, a secure random browser cookie identifies each guest. Clearing cookies or using another browser creates a separate player. A nickname is a display label, not an account login; two guests can use the same nickname.
- Scores and nicknames are saved in the server database. The downloaded local server uses `data/leaderboard.sqlite`; preserve the entire data folder when moving or backing up a running server. The hosted Site uses persistent D1 storage. Each separately hosted copy has its own board.
- Old anonymous device scores are not uploaded under a new nickname. Mission progress, cosmetics, sound and the game's local personal best remain browser-local.
- The board displays real scores only. A failed save shows a retry button. Without a connection, players can choose Play without ranking; those rounds are not submitted later automatically.
- The API validates names, score bounds and request origins, limits rapid submissions and updates best scores atomically. Scores are still reported by the client; this is a casual leaderboard, not a cheat-proof competition or prize system.

## Hosting

The shared leaderboard needs a running backend. Uploading only `www/` to a static host plays the game but cannot save shared scores. Use the full Node project on a host with Node 22.13+ and persistent disk, or deploy the included Worker with a D1 database.

The included Node server reads `PORT` and `LOOPSHIFT_HOST`; on a managed Node host set `LOOPSHIFT_HOST=0.0.0.0` and start with `npm run web`. Configure persistent storage for `data/` and HTTPS at your host. Do not expose the SQLite file as a web asset.

For the Sites edition, `.openai/hosting.json` declares logical binding `DB`. Schema is in `db/schema.ts`; generated schema-only migrations are in `drizzle/`. Install development dependencies with `npm ci`, then `npm run build` creates the Worker under `dist/server`. The build embeds the website assets, requires no external CDN and exports a standard `fetch(request, env)` handler. The hosting platform provides the D1 binding and applies the included migrations before deployment. Never delete applied migrations.

The existing hosted Site keeps its current access settings. Updating the game does not make a private Site public. The standalone copy has guest access controlled by your chosen host.

## Files

- `www/index.html`, `style.css`, `game.js`: two screens, mobile styles and gameplay.
- `www/leaderboard.js`: name dialog, Top 10, score submission, error/retry UI.
- `www/sw.js`, manifest and icons: install/offline assets. API data is never service-worker cached.
- `server/api.js`, `server/daily.js`, `server/db.js`: validated leaderboard endpoints and D1 access.
- `scripts/serve.mjs`, `sqlite-adapter.mjs`: local HTTP server and persistent SQLite adapter.
- `scripts/build.mjs`: Worker build with embedded static assets.
- `db/schema.ts`, `drizzle/`: database schema and generated migrations.
- `tests/`: automated gameplay and leaderboard checks. Run `npm test`.
- `www/native-bridge.js`: optional bridge that stays inactive in ordinary browsers. This download is the website project, not an Android Studio or Xcode project.

## Gameplay upgrades

- **Perfect Shift:** switch away from a closed barrier 0.20–0.38 seconds before its centre reaches you. A gold outline shows the timing window. Safely passing confirms the bonus: 25 base points, once per barrier. Switching back cancels the attempt.
- **Combo:** 2, 3 and 5 consecutive perfect dodges give ×2, ×3 and ×5 scoring. An ordinary dodge or a hit resets the chain. Spark, pass and perfect points all use the current multiplier.
- **Fever:** 6 consecutive perfect dodges start 5 seconds of invincibility and double points, stacking with your combo. Fever protects your shield; its meter and combo reset when it ends. Pause and the resume countdown freeze its timer.
- **Patterns:** every 12 barriers cycles Classic → Moving → Pulse. Speed also rises every 12 passes. Moving barriers drift around the orbit; pulse gates open and close. The next pattern is announced before arrival. Each animated obstacle settles at least 0.75 seconds before its centre arrives. Dotted open gaps are safe; the other orbit is always clear at that obstacle.
- **Missions:** collect 20 sparks for Cyan, make 5 perfect shifts for Comet, activate Fever 3 times for Prism, and collect 60 sparks for Stardust. Progress accumulates across rounds and unlocks automatically. Select an unlocked ball or trail on Home.
- **Effects:** layered ring tracks, glowing trails, spark bursts, shield fragments and rainbow Fever rings. The system's reduced-motion preference removes trails/particles and keeps Fever colours static.

Mission totals, cosmetic selections, high score and sound preference stay on the current browser/device. They do not transfer automatically between the website, Android and iOS. Existing high scores and sound preferences are preserved.

## Verification

Automated checks cover gameplay timing, combos/Fever, pause/resume, missions, nickname validation, guest isolation, ranking, ties, renaming, duplicate/lower scores, server restart persistence, unavailable storage and the name/save/retry UI. Mobile CSS has been reviewed; visual and touch testing on your target phone is still needed. Native APK/AAB/IPA builds are separate from this website download.

### Arcade text and audio update (1.4.1)
Centre status text uses a bundled bold display font, slanted depth styling and a gentle float; countdown text scales softly. Reduced-motion settings disable these animations. Font licensing is in FONT-LICENSE.txt.
Music now includes an audible midrange melody and triangle bass. Playback starts with Play, pauses with the game, preserves mute preferences, and offers “Tap to enable” if browser audio is blocked. Tap that button to retry. Music recovery is tested with simulated browser interruptions; actual loudness depends on device media volume.

### Level celebrations (1.4.2)
Every completed level displays a brief slide-and-fade banner above the rings in the completed level’s colour. The six-colour palette repeats; the next level retains its own theme. Reduced motion disables the pop.

### 100-level challenge (1.5.0)
The regular game finishes after all 12 obstacles in Level 100 (1,200 passes), with a Loop Champion trophy and victory sound. The score panel shows level / 100. Daily mode remains a separate two-minute challenge. Leaderboards show a cup for first place and medals for second and third; these indicate rank, not level completion.


### Adventure update and fresh start (2.0.0)
- Bosses every 10 levels alternate moving barriers and pulse gates, with a warning and wider spacing. All rows retain an adjacent safe route; speed stays capped and there are never more than six rings.
- Pink diamonds from Level 4 are optional risk bonuses worth 40 base points (multiplied), placed between barriers on a neighbouring ring. Golden sparks mark the normal safe route. Pink diamonds do not charge shields.
- Optional level goals rotate: collect 3 sparks, make 2 perfect shifts, or clear without taking a hit. Completing the goal adds 100 points once. Missing it never prevents advancing after 12 obstacles.
- Server-saved trophies: No Shield Needed, Perfect 10, Six-Ring Master, Boss Breaker and Loop Champion. These and practice unlocks are earned only in the regular 100-level mode.
- Forest is available immediately. Reaching levels 10, 25 and 50 unlocks Ion night, Nebula and Solar eclipse backgrounds, trail colours and victory particle colours. Theme selection is a device preference. Ball/shield identity and coral barriers remain readable.
- The ghost is a best-distance marker, not a replay of recorded inputs. It shows obstacles remaining to surpass the previous furthest regular run, with a marker on that level’s outer track.
- Practice any reached level. It ends after that level’s 12 obstacles and can be retried. Practice does not change scores, trophies, missions or unlocks and makes no leaderboard submission. Daily remains a separate 120-second course.
- Trophies, furthest distance and highest level are stored on the server against the player identity. A visible retry is available if saving fails. Offline play retains these only for the current session; it is not a cross-device save. Existing ball/trail mission counters remain device-local.
- The user-requested reset is applied once by migration 0003_fresh_start: old player profiles, daily runs and both boards are removed by recreating those tables. Subsequent restarts preserve new data. Legacy local score/mission/nickname keys are no longer loaded. Players choose their nickname again and begin at Level 1. Sound preferences remain unchanged.
- API writes require the current season header so a still-open old game cannot refill the fresh board. This is a compatibility check, not anti-cheat authentication. Scores/progress remain client-reported and are not suitable for cash-prize competitions.

Validation includes progression through all 100 levels, continuous level-banner behaviour, practice isolation, boss paths, optional bonus scoring, fresh-start migration idempotence and server progress persistence. No physical phone audio/listening test was performed.


### Continuous flow update (2.1.0)
- The level banner says LEVEL N COMPLETE! ✓ in the completed level’s colour. It has its own reserved line above the arena, separate from PERFECT! +25. Ball motion, input, Fever and the clock continue; manual pause still pauses. Reduced motion removes the slide animation.
- Speed eases toward the capped target. Row spacing allows at least 0.68 seconds between worst-case drifting centres. Boss families rotate: alternating neighbouring gaps (10/40/70/100), sweeping gaps (20/50/80), pulse timing (30/60/90). Safe routes require at most one adjacent move between walls. Post-boss levels start with three easy rows; post-pulse sections get two. These recovery rows retain a safe lane and normal golden sparks.
- Nearest closed barriers have a steady pale outline. Hits show the impact and a SAFE marker on the correct ring for 1.3 seconds, plus a short explanation. On losing the last shield, a mint recovery spark appears shortly ahead, at most one ring away; it gives a normal spark/charge and must be collected.
- A safe near miss after switching 0.14–0.20 seconds before a closed barrier awards CLOSE! +5 once. It is exclusive with perfect scoring, cancelled by another switch/hit, and not awarded for open gates or Fever. Bonus, shield, perfect and recovery sounds are distinct original synthesized cues.
- Choose a personal run focus: survive five levels, collect 20 sparks, or make five perfect shifts. These are goals, not extra scoring modifiers. Daily has the same survival focus for every player. The next theme unlock appears outside the rings.
- The unranked five-level sprint ends after 60 obstacles. It never submits scores or awards main-game records, missions or unlocks. Retry keeps the selected mode and uses a 0.45-second countdown after a finished run; first play and manual resume retain 1.5 seconds.
- A skippable 10-second playable tutorial teaches switching, a collectible spark and a demo shield absorbing a barrier. It cannot change ranked progress. Learning is launched with Learn in 10 seconds; it is not forced over existing players.
- Personal best perfect chain and most consecutive levels cleared without losing a shield are stored alongside existing server progress. The new migration only adds two default-zero columns; existing profiles, scores and unlocks remain intact. The result screen chooses one encouraging fact and retains concise collision coaching. Level 100 shows the remaining obstacles to the finish.
- Settings save an independent vibration toggle. Supported browsers receive different patterns; the existing native bridge receives scheduled scalar pulses. Unsupported devices simply have no vibration. No device-level haptic verification is claimed.
- Daily results offer Challenge a friend using the native share sheet, clipboard or a selectable text fallback. The date and score are included; expired courses are clearly labelled. The link points to the daily section. Sharing a link does not grant Site access or change its owner-private audience. Only people with access can open a private hosted game.

Verification covers all 100 levels with legal moves, input continuity, score isolation for sprint/tutorial/practice, tutorial stages, bounded boss paths and speed, near-miss payouts, reachable recovery sparks, stored record merging, final countdown and daily sharing fallbacks. Browser/device rendering, audio and haptics still require testing on the target phones.

### Guided controls update
The transparent play-area button supports keyboard focus and assistive activation; taps elsewhere in the game also shift, except on menus and controls. Optional pink bonuses now sit on the following guided ring: shift after clearing the current wall to collect one early. A perfect shift still requires the existing timing window. Course generation is deterministic for every mode, independent of visual effects and player input. Existing player names, scores and unlocks are retained.

## Rhythm and replay update

- Walls occupy beats 1, 2 and 4 of a repeating four-beat phrase: tap, tap, wait, tap. The empty beat creates breathing room. Random spacing jitter is removed; moving barriers ease back to their grid position and moving/pulse gates lock 0.85 seconds before the centre reaches the player.
- The soundtrack receives the game’s orbit phase and speed. Bright cues lead closed wall centres by 0.29 seconds, inside the perfect-shift window. Countdown, pause, retry, level changes, audio interruptions and mute preserve that relationship; Fever changes percussion without altering the timing grid. Audio is optional and does not control collision or scoring rules.
- A successful switch briefly brightens the landing ring, emits a small ripple and plays one crisp arrival tone. The effect waits for the ball to reach the ring, freezes with pause/countdown, and fades after 0.28 seconds. Reduced motion retains the ring highlight and removes the expanding ripple.
- Try again and the pause menu’s Restart this course reset the same run seed. Particle effects and input choices cannot change subsequent wall generation. Home’s Play now, Start a new course, Sprint and Practice choose fresh runs. Daily retries request a fresh attempt token and reuse that day’s server seed; after midnight a newly requested attempt uses the new daily course. Non-daily retry seeds last for the current page session.
- Ring unlocks are now Level 2 (three), 5 (four), 9 (five, two shield slots), and 13 (six). Level 1 is a short two-ring introduction without a second hollow ball. The existing six-ring trophy still unlocks on completing Level 13.

Automated verification clears all 100 levels and a full daily course without shield/Fever protection, compares retries through all six-ring milestones, checks landing feedback and reduced motion, and tests soundtrack cue timestamps, pause/resume and mute. These checks do not replace listening or touch testing on a physical phone.
