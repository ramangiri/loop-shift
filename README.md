## Version 2.3.2 · Readable mobile play and essential help

- Gameplay uses larger score labels, a thicker level-progress bar, and readable 14–16px status/instruction text. The warning row now grows naturally instead of inheriting a clipped fixed-height mobile layout.
- How to Play has five essential steps: tap, sparks, barriers, shields, and pause/save. The 22-lesson menu and advanced tutorial engine are removed. Finishing returns Home.
- Tutorial dialogs have a single-column layout, readable body text, scrollable content, and full-width actions. The written guide is shortened to the same essentials.
- Portrait and short-landscape layouts reserve space for the header, instructions, and controls. Phone browser verification remains necessary.

## Version 2.3.1 · Mobile website flow

- Home has Play, Progress, and Friends destinations; Classic goals are separated from distinct modes. Focus Play has a direct entry.
- A compact in-game strip restores shields, charge, multiplier, and the power-up countdown. Instructions and celebrations share one message area.
- Instant tap is the default. Optional Tap + swipe persists in Settings; the directional tutorial still supports gestures.
- Result actions stack on narrow screens; menus and expanded result panels scroll, with safe-area spacing. Landscape places status alongside the circle.
- The first-run guide is reduced to three illustrated steps. The full interactive lesson library remains available.
- Back closes dialogs before leaving; an active run pauses first. Paused checkpoint status states what can be restored.
- Share supports explicit Copy link, a selectable fallback, and cancel feedback. Replay uses blue for the safe ring.
- Cached website assets open without waiting for the hosting service. Ordinary slow frames retain elapsed time; long interruptions pause safely.

Validation: automated regressions cover touch-down/release, swipe preference, Home destinations, modal Back, power-up visibility, low-frame-rate timing, cached startup and share fallback. Physical phone browser testing remains necessary. This release changes the website; it does not create an Android package.

## Version 2.3.0 · Responsive play and clearer progress

- `responsive.css` owns game-screen geometry for portrait, compact landscape, desktop, and scrollable results/settings. Browser viewport changes and safe areas are respected.
- Home includes an unranked 60-second round with a device-only best; pauses freeze its timer.
- Five-level sections have visible goals and varied existing pattern combinations. Two-ring play now shows the same destination arc described by the hint.
- Results show personal progress, clearer collision explanations, replay/share, and compact optional feedback. Pause has secondary statistics and the level objective.
- Settings can place Pause on the left or right. Existing independent music/effects, near-miss feedback, short retries, and comfort effects are retained.
- Mistake practice starts at 65% target speed for eight active seconds before easing back to normal.
- Practice and short rounds preserve checkpoints; canceled player setup cannot consume them. Checkpoint section choices are saved immediately. Breaks during Fire Ball no longer add the recovery gap twice.
- Regular scores autosave a device best and retain the existing online retry queue; result text distinguishes device saving from online synchronization.

Validation: `npm test` covers gameplay, result sharing, audio, ranking isolation, persistence, and the added mode/checkpoint regressions. `npm run build` includes the new stylesheet. Physical-device Safari/Android testing is still recommended for browser chrome and native sharing.

# Loop Shift — website with a shared Top 10

Two screens: Home and Play. Players choose a nickname before their first round. Home shows the ten highest personal bests and the current player's rank.

## First extra ring explanation (2.2.3)

The first transition from two rings to three (Level 2) pauses for a compact illustrated lesson: one player ball, a short blue arc marking the next tap destination, and a **Got it — Play** button. The illustration uses the selected ball colour. Gameplay, score, Fever and course timers freeze while the native modal contains keyboard focus. Dismissal is remembered on the device; returning Home without dismissal keeps the lesson pending. Resume keeps the same player position and the existing 2.3-second safe approach, without a countdown. Ordinary levels and later ring unlocks remain continuous with the existing ring fade, smooth geometry and speed ramp. The hollow destination ball and dotted route are replaced with one short blue track segment.

## Persistent server storage (2.2.2)

The Node server now supports a remote Turso libSQL database. **This must be connected in Render before it can stop temporary-filesystem resets.** Follow [RENDER-STORAGE.md](./RENDER-STORAGE.md) to create a database, set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` and `LOOPSHIFT_REQUIRE_REMOTE_DB=true`, and verify `/api/health` reports `turso`. Tokens remain server-only. No provider account or paid resource is provisioned by the code.

The official `@libsql/client/web` driver adapts to the existing leaderboard API. Scores, all player records and the migration ledger live in the remote database. Migration SQL and its ledger entry commit atomically; repeated starts do not repeat the old reset. Untracked or older imported databases are refused rather than risking deletion. A failed configured remote connection stops startup and never falls back to a fresh local board. A complete current SQLite backup can be imported separately; the code does not automatically transfer or reconstruct historical records.

Local SQLite remains available at the existing path, with optional `LOOPSHIFT_DATA_DIR` for a real persistent disk. The health endpoint distinguishes `turso` from `local-sqlite`, and Render startup logs explain the storage requirement. Changing a directory variable does not provision a disk. The built Sites/D1 Worker continues using its existing managed binding; the Turso adapter is for the Node/Render server.

Tests use the actual libSQL SDK with a persistent SQLite fixture to check fresh connections, migration idempotence/rollback, same-player scores, daily/weekly boards, rewards and groups. HTTP authentication failures are mocked to verify errors and the absence of a local fallback. A live Turso account connection and Render restart check must be completed after entering the environment variables.

## Online score display fix (2.2.1)

Home's **Online best** now always uses the current player's server-confirmed 100-level score, matching their own **You** row on that board. An unrecognised player sees a dash and Add name. The local record is retained under the collapsed **On this device** explanation, rather than replacing an online score. It can contain offline rounds or another player's runs and is never automatically uploaded. There is no migration or reset of existing scores.

Pending main-game points appear beside the Home record with Retry save when needed. A connection failure retains the last confirmed value and labels it Last synced; a successful retry updates Home and the leaderboard together. Daily and Weekly responses also carry the current main best, so switching tabs or players cannot leave Home showing an old player's record. Their own challenge scores remain separate.

A missing server identity clears the stale nickname and requires choosing a player or explicitly opting into unranked play. Pending queues remain scoped to their original player. Score requests include that player key as an ownership check against the authenticated cookie; changing cookies cannot transfer a queued round to another profile, even one with the same nickname. Nicknames do not recover lost identities. The old bare device-best number has no ranked-round duration/ownership record and cannot be certified or backfilled.

This fixes display and session handling, not ephemeral hosting storage. The durable-storage requirement below still applies. Integration tests reproduce local 612 versus online 32, save/retry a genuine completed round, check lower-score protection, cookie changes, reloads and mode separation using the actual frontend and API.

## Collections, weekly twists and friends (2.2)

- **Boss collection:** ten distinct trophies, one for each boss at Levels 10 through 100. Finish the main run to save its earned trophies. Existing saved barrier progress awards previously cleared boss trophies during migration; scores and earlier unlocks are preserved. Device-only runs keep a separate local collection.
- **Player titles:** Perfect Pilot (a chain of five perfects), Shield Survivor (five consecutive levels without losing a shield), and Six-Ring Master (clear Level 13). Select an earned title under Progress & rewards → Boss collection & titles. Public, daily, weekly and friend boards show the selected title with the nickname. Online title selection is checked against the server's unlock mask.
- **Weekly twist:** a 120-second seeded course and its own Top 10. Weeks start Monday at 00:00 UTC (05:30 IST). Rules rotate: No Fever, Double Spark Points, One Shield Maximum. No Fever preserves scoring combos but never activates Fever; Double Spark Points doubles only gold-spark points, not shield charge, collection counts or community contributions; One Shield Maximum caps capacity at one on every level. Started attempts save to their original week, even across reset. Multiple attempt tokens can await retry and expire after 48 hours. Weekly scores never replace main or daily scores.
- **Friend groups:** create or join up to five groups, with at most 30 members each. Each group has a random 12-character invite code and a private board of its members' existing main-game best scores. Only members can retrieve that group, its code or its board. Group actions are limited to ten per player per minute. Invite codes grant membership, so share them only with intended friends. Nicknames still appear on public ranked boards; a nickname is not an account login or a way to recover a browser identity. Members can leave; an empty group is removed.
- **Community goal:** collect 100,000 gold sparks together each UTC week. Online main, daily and weekly runs contribute once when finished. Starting a run creates an owner-bound server token; an immutable finish prevents retry double-counting. Practice, tutorial and sprint do not contribute. Reaching the goal permanently unlocks the Convergence theme for everyone, including players who first open the game later. Community progress appears on Home, away from the arena.
- **Loss replay:** optional visual playback of the last three seconds at half speed, in a separate result viewer. It highlights the impact and the safe ring, while Try again remains enabled. At most 92 snapshots are retained, sampled at 30 Hz; it records neither screen video nor audio. Playing/closing replay never runs physics, submits scores or changes the original result. Closing it, leaving the page or retrying cancels playback.
- **Result cards:** create a PNG containing nickname, selected title, score, mode, level reached and best perfect chain. The Share button uses the device share sheet when supported; Save image and a copied game link are fallbacks. Images are generated locally in the browser and are not uploaded by the game. Sharing requires a deliberate button press.
- **Adaptive soundtrack:** starts with a light beat, eases bass in with perfect chains and adds melody during Fever. Layers use the existing orbit rhythm rather than restarting at level changes. Effect sounds briefly lower new background notes. Pause, mute and gesture-based audio recovery remain supported.

Home keeps rule descriptions, collections and group management folded. Result-only replay/card controls remain outside the live game. All new buttons support keyboard activation and use touch targets of at least 44 pixels.

### Storage and deployment

The new additive migration is `drizzle/0005_many_korvac.sql`. `npm start` applies unapplied migrations before serving requests. It adds trophy/title fields plus weekly attempts/scores, friend membership and community run tables; it does not reset a current installation. The older one-time fresh-start migration remains recorded in existing databases and must not be rerun manually.

Score queues and community-reward queues are scoped to the current server player identity. Rewards remain queued in browser storage until acknowledged, with Home → Progress & rewards → Retry saving rewards and reconnect retries. A server connection at run start is required for community contributions; a failed start does not fabricate a token later. Community and weekly retries expire after 48 hours. These bounded, client-reported stats are not authoritative replay-based anti-cheat verification.

All server data depends on durable storage. **Render Free can lose a local SQLite database on restart, redeploy or idle shutdown.** Connect Turso using [the storage setup guide](./RENDER-STORAGE.md), or use a paid web service with a persistent disk mounted at `/opt/render/project/src/data`. Code updates do not change the hosting plan or provision storage. GitHub Pages supports device-only play and result tools; online events/groups require the backend.

Run `npm test` for API, migration, isolation, community retry, replay/card, soundtrack and gameplay checks, including the 100-level route and all three weekly rules. `npm run build` bundles the browser assets and server. Automated DOM/canvas/audio simulations do not replace checking touch, font layout and sound on real iPhone/Android devices.

## This GitHub repository

The browser files at the repository root mirror `www/` so the existing root-based static website receives the latest game. Edit `www/` for the full project, and copy its browser assets to the root when updating the static website. The full server, database migrations, source download and automated checks are included.

A static host such as GitHub Pages runs the game with the existing **Play without ranking** option. Shared nicknames, Top 10 and the daily challenge require the included backend; static hosting alone cannot run that API. For the complete game locally, use `npm start` with Node.js 24 and open `http://localhost:8080`.

## Leaderboard saving and game guide

The home Top 10 is always visible. Rank, Player and Best score have separate spacing on phones and desktops; each row displays the saved nickname. Online best is the server-confirmed 100-level best for the current browser's player identity. On this device keeps offline/local records separate. The first-place player's score is not necessarily your personal best; your own row is marked You.

Ranked score submissions are serialized and queued until acknowledged. A failed main-game score survives Try again, later lower scores and a reload when browser storage is available. The highest queued main score retains its original duration. Queues are scoped to the server's opaque player key and never restored for another identity. Retry is available on both Home and the result screen; reconnecting retries the queue and rate-limit responses receive a delayed retry. Daily scores stay separate, and an unsaved daily attempt is retried before starting a replacement. Expired/replaced daily attempts show a failure and do not block all future attempts. This does not restore historical scores that were already lost.

Render Free uses an ephemeral filesystem: a local SQLite database is lost on redeploy, restart or idle shutdown. Reliable shared records require the configured Turso integration or a paid service with a disk mounted at `/opt/render/project/src/data` (with repository root as the service root). Client retry logic does not make an ephemeral server database durable. See https://render.com/docs/free#local-files-lost-on-redeploy.

How to play opens the full guide on Home: first-run steps, mobile/keyboard controls, the blue destination marker, safe gaps, shield circles, base scoring, Perfect shifts, combos, Fever, all ring milestones, bosses, the different game modes, sound, pause and saving. The optional 10-second tutorial launches from that guide.

## Daily challenge and feedback update

Home now offers Endless and Daily Challenge. Daily is a 120-second score attack with a separate daily Top 10. The server assigns a dated seed: everyone gets the same sequence that day. It resets at 00:00 UTC (05:30 India time). Attempts are unlimited, but each player has only one active daily attempt; a new attempt replaces the previous one. A started attempt may finish across midnight, saving to its original date, and expires after 30 minutes including pauses. Daily requires a saved online nickname and connection to begin. Failed score submissions can be retried. Daily scores do not replace Endless scores.

All game modes use fixed 120 Hz physics. Obstacle generation has its own seeded random stream, unaffected by particles, reduced-motion settings or cosmetic selections. Safe-gap generation at level changes follows the course, not the player's chosen lane. This guarantees the same generated sequence, not identical player performance. Scores remain client-reported with bounded values and authenticated attempt ownership, not cheat-proof competition results.

The next safe gap now has a steady gold glow. The normal ball keeps its selected colour (lime by default); shields never change the ball's colour. One or two lime protective circles indicate charges. The first shield has a single chime, the second a double chime, and shield loss has a low two-note break sound and shatter fragments. The 0.65-second immunity remains. Reduced motion disables fragments and glowing animation; protection uses a steady translucent ball rather than flashing.

Game over briefly marks the impact location. Feedback is based on whether the ball was still moving toward the safe ring, had just moved into a blocked ring, or stayed away from the gap. Results show survival time, perfect shifts and the points needed to beat the relevant best. Try again repeats the same mode and course; Home's Play now starts a fresh Endless course when no round is paused. Tap and Space both use the same guided adjacent shift.

The soundtrack is replaced by an original mellow bass-and-percussion beat. It follows the game’s obstacle rhythm, adds bass with perfect chains and melody during Fever. Short cues mark closed barriers’ perfect windows. Music and effects retain separate controls. No external recordings are included.

## Six-ring challenge update

Every 12 cleared obstacles completes a level. Level 1 has two rings for a roughly 14.5-second introduction; levels 2–4 have three, 5–8 four, 9–12 five, and 13 onward six. Six is the maximum. Angular speed rises from 0.78 to a capped 1.9 radians/second. Level transitions never pause or add a countdown. A small completion banner appears above the rings for 1.35 seconds. The next wall starts at least 2.3 seconds away at the current speed, aligned to the continuing music beat. Rings, ring thickness, ball size and level colours blend over 1.1 seconds. The ball follows its moving ring without losing its trail or interrupting a tap. Only the current level’s walls are previewed; departing walls fade out and incoming walls fade in. A reserved notice area keeps level and boss messages from moving the arena. Angular speed still eases upward; there is no soundtrack restart at the level boundary.

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
- A skippable 10-second playable tutorial teaches switching, a collectible spark and a demo shield absorbing a barrier. It cannot change ranked progress. Learning is launched from How to play → Practise for 10 seconds; it is not forced over existing players.
- Personal best perfect chain and most consecutive levels cleared without losing a shield are stored alongside existing server progress. The new migration only adds two default-zero columns; existing profiles, scores and unlocks remain intact. The result screen chooses one encouraging fact and retains concise collision coaching. Level 100 shows the remaining obstacles to the finish.
- Settings save an independent vibration toggle. Supported browsers receive different patterns; the existing native bridge receives scheduled scalar pulses. Unsupported devices simply have no vibration. No device-level haptic verification is claimed.
- Daily results offer Challenge a friend using the native share sheet, clipboard or a selectable text fallback. The date and score are included; expired courses are clearly labelled. The link points to the daily section. Sharing a link does not grant Site access or change its owner-private audience. Only people with access can open a private hosted game.

Verification covers all 100 levels with legal moves, input continuity, score isolation for sprint/tutorial/practice, tutorial stages, bounded boss paths and speed, near-miss payouts, reachable recovery sparks, stored record merging, final countdown and daily sharing fallbacks. Browser/device rendering, audio and haptics still require testing on the target phones.

### Guided controls update
The transparent play-area button supports keyboard focus and assistive activation; taps elsewhere in the game also shift, except on menus and controls. Optional pink bonuses now sit on the following guided ring: shift after clearing the current wall to collect one early. A perfect shift still requires the existing timing window. Course generation is deterministic for every mode, independent of visual effects and player input. Existing player names, scores and unlocks are retained.

## Rhythm and replay update

- Walls occupy beats 1, 2 and 4 of a repeating four-beat phrase: tap, tap, wait, tap. The empty beat creates breathing room. Random spacing jitter is removed; moving barriers ease back to their grid position and moving/pulse gates lock 0.85 seconds before the centre reaches the player.
- The soundtrack receives the game’s orbit phase and speed. Bright cues lead closed wall centres by 0.29 seconds, inside the perfect-shift window. Countdown, pause, retry, level changes, audio interruptions and mute preserve that relationship; Fever adds a melody layer without altering the timing grid. Audio is optional and does not control collision or scoring rules.
- A successful switch briefly brightens the landing ring, emits a small ripple and plays one crisp arrival tone. The effect waits for the ball to reach the ring, freezes with pause/countdown, and fades after 0.28 seconds. Reduced motion retains the ring highlight and removes the expanding ripple.
- Try again and the pause menu’s Restart this course reset the same run seed. Particle effects and input choices cannot change subsequent wall generation. Home’s Play now, Start a new course, Sprint and Practice choose fresh runs. Daily retries request a fresh attempt token and reuse that day’s server seed; after midnight a newly requested attempt uses the new daily course. Non-daily retry seeds last for the current page session.
- Ring unlocks are now Level 2 (three), 5 (four), 9 (five, two shield slots), and 13 (six). Level 1 is a short two-ring introduction without a second hollow ball. The existing six-ring trophy still unlocks on completing Level 13.

Automated verification clears all 100 levels and a full daily course without shield/Fever protection, compares retries through all six-ring milestones, checks landing feedback and reduced motion, and tests soundtrack cue timestamps, pause/resume and mute. These checks do not replace listening or touch testing on a physical phone.


### Journey and mastery update (2.2.8)
- Three-level unranked journeys award a device medal; daily personal goals, five-level milestone badges and clean weekly badges are also device-local. Boss trophies and ranked scores continue using the existing server.
- Four clean obstacles award +30 outside timed events. Optional pink routes grant points and two sparks; outlined gold bonus routes add one shield charge. Standard safe gaps remain available.
- Milestone breaks offer extra safe-route sparks or timing patterns. Boss patterns remain distinct; ordinary milestone finales alternate gaps.
- Loss practice restores the generated obstacle section and RNG state with a safe lead-in, unranked. Friend group rows offer a Challenge button; the chosen target appears briefly above play.
- Existing daily and weekly course generation/scoring remains unchanged, with the new weekly mastery badge recorded separately.
