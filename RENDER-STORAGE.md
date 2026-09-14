# Stop leaderboard resets on Render

The game previously stored its SQLite file on Render's local filesystem. On a Free web service, that file disappears on a redeploy, restart or idle shutdown. A successful score save cannot make that filesystem durable.

This update adds an external **Turso libSQL** database. Render can keep hosting the game on its Free web service while the separate database holds players, scores, daily/weekly boards, groups and rewards. Turso currently offers a free plan with usage limits: [pricing](https://turso.tech/pricing). No database or paid resource is created by this code change.

## 1. Create the database

Open [Turso](https://app.turso.tech), sign up and create a database called `loop-shift-scores`. Choose the **libSQL** engine for this integration. Copy its Database URL and create a database token with read/write access.

If using the CLI on your Mac, Turso's [quickstart](https://docs.turso.tech/quickstart) gives these commands:

```sh
brew install tursodatabase/tap/turso
turso auth signup
turso db create loop-shift-scores
turso db show loop-shift-scores --url
turso db tokens create loop-shift-scores
```

Use `turso auth login` if already registered. Creating without `--tursodb` selects libSQL. The token command prints a secret: enter it directly into Render's Environment settings. Keep it out of GitHub, browser JavaScript and screenshots. You do not need to create tables manually.

## 2. Configure the existing Render service

Open **Render → loop-shift → Environment → Edit**. Add:

| Key | Value |
| --- | --- |
| `TURSO_DATABASE_URL` | Your URL, such as `libsql://loop-shift-scores-your-account.turso.io` |
| `TURSO_AUTH_TOKEN` | The database's read/write token |
| `LOOPSHIFT_REQUIRE_REMOTE_DB` | `true` |

Keep `LOOPSHIFT_HOST=0.0.0.0`. Keep the Build Command `npm ci` and Start Command `npm start`. Node must be at least 22.13.0; the project is tested on Node 24.

If available, choose **Save only** while the code update is still being reviewed. Merge the persistent-storage update into the deployed branch, then choose **Manual Deploy → Deploy latest commit**. If Render automatically deploys on merge, let that deployment finish.

With all three new variables set, the server connects to Turso and applies each schema migration once. Invalid or missing credentials stop startup with a useful log message. It does not replace a failed remote connection with a new, empty local database. API failures after startup return an error and the browser keeps its pending score for Retry.

## 3. Confirm the connection

After Render shows **Live**, open:

[loop-shift.onrender.com/api/health](https://loop-shift.onrender.com/api/health)

The expected response is:

```json
{"ok":true,"storage":"turso"}
```

The deployment log also says `Storage: Turso connected.` A response containing `local-sqlite` means the remote setup is not active. A database outage returns HTTP 503. This health response never includes database URLs, tokens, names or scores.

Play a ranked round in the same browser, wait for **Best saved**, note its score, restart the Render service, and verify your same name and score remain. Then try a lower score: the best must remain unchanged. Daily and Weekly continue to have their own records.

## Existing records

Selecting a brand-new Turso database creates a new empty board. It does not import the old Render file, recover an already deleted score, or upload the browser's bare device-best number. If the old database still exists and its data matters, obtain a complete consistent SQLite backup, including `_loopshift_migrations`, before changing storage or restarting/deploying the old service. Import that complete database into Turso before connecting this update. A raw copy of only the main file while WAL writes are active is not a consistent backup.

The integration refuses a non-empty database with no Loop Shift migration ledger and refuses to run the historical fresh-start reset against an imported older player database. Current complete backups keep existing IDs, names and records. A nickname alone cannot recover a missing browser identity: use the same site and browser/cookie.

## Alternative: keep SQLite on a Render disk

If you already have a paid Render instance and an attached persistent disk, you can continue using SQLite. Mount the disk at `/opt/render/project/src/data` for the current default path. Alternatively, mount it at `/var/data` and set `LOOPSHIFT_DATA_DIR=/var/data`. Only the mounted directory is preserved. For this option leave the Turso variables unset and do not set `LOOPSHIFT_REQUIRE_REMOTE_DB=true`.

Changing `LOOPSHIFT_DATA_DIR` alone does not create or attach a disk. The default remains `data/leaderboard.sqlite` for existing local installations. There is no automatic move, overwrite or reset of that file.

References: [Render Free storage limits](https://render.com/docs/free#local-files-lost-on-redeploy), [Render persistent disks](https://render.com/docs/disks), [Turso libSQL client](https://docs.turso.tech/sdk/ts/reference), [Turso durability](https://docs.turso.tech/cloud/durability).
