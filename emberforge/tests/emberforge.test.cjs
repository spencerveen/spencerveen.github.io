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
  assert.doesNotMatch(index, /watchLegacyBossTip|removeLegacyBossTip/);
  assert.match(battle, /routeBattleToasts/);
  assert.doesNotMatch(battle, /createTreeWalker|toastObserver\.observe\(root/);
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

test('automatic damage uses engine power and renders hit feedback', () => {
  const engine = read('core/loop.js');
  assert.match(engine, /let hit=autoPower\(\);damage\(hit\);spawnPop\(/);
  assert.match(engine, /requestAnimationFrame\(tick\)/);
});

test('battle HUD uses authoritative engine health and encounter values', () => {
  const engine = read('core/loop.js');
  const battle = read('emberforge-battle.js');
  assert.match(engine, /enemyMaxHP:enemy\(\)\.hp/);
  assert.match(engine, /enemyName:enemy\(\)\.name/);
  assert.match(engine, /fighting:activeFight\(\)/);
  assert.match(battle, /state\?\.enemyName/);
  assert.match(battle, /state\.enemyHP\/state\.enemyMaxHP/);
  assert.match(battle, /state\.down\?"Recovering"/);
});

test('unreadable saves are backed up before a new session can overwrite them', () => {
  const values = new Map([['emberforge-test-save', '{broken-json']]);
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); }
  };
  const context = {
    localStorage:storage, KEY:'emberforge-test-save',
    s:{version:7, updated:0}, clean:obj => obj,
    console:{warn() {}},
    $:() => ({textContent:''}),
    Date
  };
  vm.createContext(context);
  vm.runInContext(read('core/storage.js'), context);
  vm.runInContext('load();save()', context);
  assert.equal(values.get('emberforge-test-save-corrupt-backup'), '{broken-json');
  assert.equal(JSON.parse(values.get('emberforge-test-save')).version, 7);
});

test('legacy save backup is retained during version migration', () => {
  const raw = JSON.stringify({version:6, lifetime:450, journal:[]});
  const values = new Map([['emberforge-test-save', raw]]);
  const context = {
    localStorage:{
      getItem:key => values.get(key) ?? null,
      setItem:(key,value) => values.set(key,value)
    },
    KEY:'emberforge-test-save', s:{},
    clean:obj => ({...obj, version:7}), console:{warn() {}},
    $:() => ({textContent:''}), Date
  };
  vm.createContext(context);
  vm.runInContext(read('core/storage.js'), context);
  vm.runInContext('load()', context);
  assert.equal(values.get('emberforge-test-save-pre-v7-backup'), raw);
  assert.equal(context.s.version, 7);
});

test('background sheets are real, independently cacheable WebP files', () => {
  const groups = [
    ['realm-backgrounds.js', 'REG_BG_SHEETS', 6, 'realm'],
    ['boss-backgrounds.js', 'BOSS_BG_SHEET', 1, 'boss'],
    ['forge-backgrounds.js', 'HUB_BG_SHEET', 1, 'forge']
  ];
  for (const [source, constant, count, name] of groups) {
    const script = read('data/' + source);
    assert.doesNotMatch(script, /data:image\\/webp;base64,/);
    assert.match(script, new RegExp('\\\\b' + constant + '\\\\b'));
    for (let i = 0; i < count; i++) {
      const asset = 'art/' + name + '-' + i + '.webp';
      assert.ok(script.includes('./' + asset), asset + ' reference missing');
      const data = fs.readFileSync(path.join(gameDir, asset));
      assert.equal(data.toString('ascii', 0, 4), 'RIFF');
      assert.equal(data.toString('ascii', 8, 12), 'WEBP');
      assert.ok(data.length > 1000);
    }
  }
});

function gameLoopHarness(overrides = {}) {
  // Run the actual production tick function with deterministic engine fakes.
  // No DOM or localStorage is needed to verify timer and state transitions.
  const source = read('core/loop.js');
  const tickSource = source.slice(source.indexOf('function tick(now)'), source.indexOf('// The browser UI'));
  const calls = {damage:[],hits:0,render:0,saves:0};
  const s = {
    hp:90, downUntil:0, auto:true, smartResting:false,
    autoMode:'selected', engagedUntil:0, autoProgress:0.7,
    enemyTimer:0.7, enemyHP:60, combatMessage:''
  };
  Object.assign(s, overrides);
  const context = {
    s, last:0, elapsedUI:0, elapsedAutoSave:0, elapsedShop:0,
    needsMain:false, page:'battle', Date:{now:()=>10000},
    income:()=>0, gain:()=>{}, maxHealth:()=>100,
    realRecovery:()=>0, activeFight:()=>s.auto&&!s.smartResting,
    isDown:()=>s.downUntil>10000||s.hp<=0,
    autoInterval:()=>0.5, foeAttackInterval:()=>0.5, autoPower:()=>12,
    damage:n=>calls.damage.push(n), takeHit:()=>{calls.hits++;},
    spawnPop:()=>{}, $:()=>({}), fmt:String,
    enemy:()=>({hp:60}), toast:()=>{}, chooseSmartTarget:()=>{},
    stats:()=>{}, renderPage:()=>{calls.render++;},
    refreshShopAfford:()=>{}, save:()=>{calls.saves++;},
    requestAnimationFrame:()=>{}, console
  };
  vm.createContext(context);
  vm.runInContext(tickSource, context);
  return {s,calls,tick:now=>vm.runInContext('tick(' + now + ')',context)};
}

test('auto combat applies engine damage and enemy attacks while fighting', () => {
  const game = gameLoopHarness();
  game.tick(500);
  assert.deepEqual(game.calls.damage,[12,12]);
  assert.equal(game.calls.hits,2);
});

test('turning auto attack off stops damage and enemy hits during rest', () => {
  const game = gameLoopHarness({auto:false,autoMode:'off'});
  game.tick(500);
  assert.deepEqual(game.calls.damage,[]);
  assert.equal(game.calls.hits,0);
  assert.equal(game.s.enemyTimer,0);
  assert.equal(game.s.enemyHP,60);
});

test('recovery state cannot continue auto attacking', () => {
  const game = gameLoopHarness({downUntil:12000,hp:0});
  game.tick(500);
  assert.deepEqual(game.calls.damage,[]);
  assert.equal(game.calls.hits,0);
});

test('game loop continues scheduling frames after an engine exception', () => {
  const source = read('core/loop.js');
  const tickSource = source.slice(source.indexOf('function tick(now)'),source.indexOf('// The browser UI'));
  let frames=0;
  const context={
    last:0, income:()=>{throw Error('expected failure');},
    requestAnimationFrame:()=>{frames++;},
    console:{error:()=>{}}
  };
  vm.createContext(context);
  vm.runInContext(tickSource,context);
  vm.runInContext('tick(500)',context);
  assert.equal(frames,1);
});
