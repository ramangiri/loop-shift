import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// This layer is loaded after game.js. An old shift wrapper here silently restored
// the countdown input lock even when all core-only input tests were passing.
test('the feedback layer cannot replace the core tap handler', () => {
  const loader = readFileSync(new URL('../www/player-feedback.js', import.meta.url), 'utf8');
  const feedback = readFileSync(new URL('../www/player-feedback-base.js', import.meta.url), 'utf8');
  assert.match(loader, /load\('\.\/player-feedback-base\.js'/);
  assert.doesNotMatch(feedback, /\bshift\s*=\s*function\b/,
    'Input eligibility and debounce belong in game.js, not the late-loaded feedback layer');
});
