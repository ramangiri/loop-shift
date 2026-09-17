import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../server/api.js';
import { openDatabase } from '../scripts/sqlite-adapter.mjs';

const migrations = new URL('../drizzle/', import.meta.url).pathname;

function fixture() {
  const DB = openDatabase(':memory:', migrations);
  const call = async (name, user) => {
    const request = new Request('https://game.test/api/player', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-loopshift-season': '2',
        'oai-authenticated-user-id': user,
      },
      body: JSON.stringify({ name }),
    });
    const response = await api(request, { DB });
    return { response, data: await response.json() };
  };
  return { DB, call };
}

test('active nicknames are unique case-insensitively while the owner can keep their name', async () => {
  const { DB, call } = fixture();
  try {
    assert.equal((await call('Giri', 'owner')).response.status, 200);

    const duplicate = await call('gIrI', 'other-player');
    assert.equal(duplicate.response.status, 409);
    assert.match(duplicate.data.error, /already taken/i);

    const sameOwner = await call('GIRI', 'owner');
    assert.equal(sameOwner.response.status, 200);
    assert.equal(sameOwner.data.me.name, 'GIRI');
  } finally {
    DB.close();
  }
});

test('archived leaderboard names do not block a new active nickname', async () => {
  const { DB, call } = fixture();
  try {
    await call('Old Name', 'archived');
    DB.sqlite.prepare("INSERT INTO board_removals(player_id,name,score,reason) SELECT id,name,best,'test' FROM players WHERE name='Old Name'").run();
    assert.equal((await call('old name', 'new-owner')).response.status, 200);
  } finally {
    DB.close();
  }
});
