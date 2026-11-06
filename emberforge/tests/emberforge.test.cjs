'use strict';

// Run with: node --test emberforge/tests/*.test.cjs
// These fast checks guard critical DOM/API contracts. They are not a
// substitute for a browser gameplay test.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const gameDir = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(gameDir, relative), 'utf8');

test('all game and UI JavaScript parses', () => {
  const paths = [
    'emberforge-battle.js', 'emberforge-forge.js', 'emberforge-hud.js',
    'core/formatting.js', 'core/storage.js', 'core/loop.js',
    'systems/combat.js', 'ui/views.js',
    'data/catalogs.js', 'data/definitions.js'
  ];
  for (const file of paths) {
    assert.doesNotThrow(() => new vm.Script(read(file), {filename:file}), file);
  }
  const outer = read('index.html');
  const inline = [...outer.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  for (const [i, source] of inline.entries()) {
    assert.doesNotThrow(() => new vm.Script(source, {filename:'index.html:inline-'+i}));
  }
});

test('game HTML loads engine dependencies in the required order', () => {
  const html = read('game.html');
  const expected = [
    'data/catalogs.js', 'data/monster-portraits.js', 'data/definitions.js',
    'data/realm-backgrounds.js', 'data/boss-backgrounds.js',
    'data/forge-backgrounds.js', 'data/kingdom-vistas.js',
    'core/formatting.js', 'core/storage.js', 'systems/combat.js',
    'ui/views.js', 'core/loop.js'
  ];
  let last = -1;
  for (const name of expected) {
    const index = html.indexOf('src="./' + name);
    assert.ok(index > last, name + ' is missing or out of order');
    last = index;
  }
});

test('UI and engine retain the controls combat depends upon', () => {
  const html = read('game.html');
  for (const id of [
    'ef4', 'ef4-battlescene', 'ef4-combatmessage', 'ef4-toast',
    'ef4-auto', 'ef4-strike', 'ef4-potion', 'ef4-huntsteps',
    'ef4-combattip', 'ef4-bosslootnote', 'ef4-savebadge'
  ]) {
    assert.ok(html.includes('id="' + id + '"'), 'Missing DOM element ' + id);
  }
  const engine = read('core/loop.js');
  for (const method of ['getCombatState', 'selectStage', 'setAutoAttack', 'strike', 'heal']) {
    assert.match(engine, new RegExp('\\b' + method + ':'));
  }
});

test('boss intro suppression is exact; live notifications are preserved', () => {
  const index = read('index.html');
  const battle = read('emberforge-battle.js');
  const css = read('emberforge-battle.css');
  assert.match(index, /watchLegacyBossTip/);
  assert.match(battle, /routeBattleToasts/);
  assert.match(css, /#ef4(?:\s+\[data-view="battle"\])?\s+#ef4-combattip/);
  assert.match(css, /#ef4(?:\s+\[data-view="battle"\])?\s+#ef4-bosslootnote/);
  assert.match(battle, /routeCombatMessage\(\)/);
  assert.match(battle, /efb-event-log/);
  assert.match(battle, /updateBossChest\(\)/);
  assert.match(read('systems/combat.js'), /function spawnPop\(/);
});

test('save migration and battle automation remain engine-owned', () => {
  const storage = read('core/storage.js');
  assert.match(storage, /function load\(/);
  assert.match(storage, /function save\(/);
  assert.match(storage, /pre-v7-backup/);
  const engine = read('core/loop.js');
  assert.match(engine, /requestAnimationFrame\(tick\)/);
  assert.match(engine, /setAutoAttack:/);
  assert.match(read('emberforge-battle.js'), /api\.setAutoAttack\(/);
});

test('automatic boss salvage does not emit repeated popup notices', () => {
  const combat = read('systems/combat.js');
  assert.doesNotMatch(combat, /toast\(['"]Boss chest: ['"]\s*\+\s*drop\.name\s*\+\s*['"] salvaged['"]\)/);
  assert.match(combat, /if\(e\.boss&&drop&&!drop\.salvaged\)toast\(/);
  assert.match(combat, /if\(boss\)note\(['"]Boss chest:/);
  const battle = read('emberforge-battle.js');
  assert.match(battle, /routeBattleToasts\(\)/);
});
