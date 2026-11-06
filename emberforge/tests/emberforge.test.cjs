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
    assert.doesNotMatch(script, /data:image\/webp;base64,/);
    assert.match(script, new RegExp('\\b' + constant + '\\b'));
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

function combatHarness() {
  // Evaluate the real combat functions with a small deterministic encounter.
  const s={
    zone:0,stage:9,ascensions:0,unlocked:0,stageUnlocked:[10],
    firstClears:[9],bossCleared:[false],build:{},skills:{},souls:0,
    items:[],equipped:{weapon:null,armor:null,charm:null},
    combatLevel:1,hp:105,downUntil:0,autoMode:'selected',auto:true,
    enemyHP:10,enemyTimer:2,enemyHits:2,autoProgress:0.5,
    engagedUntil:15000,smartResting:false,journal:[],
    ember:1000,potionReady:0
  };
  const context={
    s, Date:{now:()=>10000}, Math, console,
    realms:[['Ashen Wilds','','','','Cinder Warden','boss',20,8]],
    MONSTER_LADDERS:[Array.from({length:9},(_,i)=>['Foe '+(i+1),'imp'])],
    REALM_ASCENSIONS:[0],XP_GAIN:()=>15,
    currentTrait:()=>({name:'Standard',hp:1,atk:1,speed:1}),
    maxSelectable:()=>10,activeBuild:()=>0,activeSkill:()=>0,
    activeTraining:()=>0,upgradeUnlocked:()=>true,
    rollBattleBackground:()=>{},renderPage:()=>{},stats:()=>{},
    $:()=>({style:{},textContent:''}),toastTimer:0,setTimeout:()=>0,clearTimeout:()=>{},
    fmt:String,esc:String,needsMain:false
  };
  vm.createContext(context);
  vm.runInContext(read('systems/combat.js'),context);
  return {s,run:code=>vm.runInContext(code,context)};
}

test('boss navigation resets encounter correctly in both directions', () => {
  const game=combatHarness();
  assert.equal(game.run('setTarget(10)'),true);
  assert.equal(game.s.stage,10);
  assert.equal(game.run('enemy().boss'),true);
  assert.equal(game.s.enemyHP,game.run('enemy().hp'));
  assert.equal(game.run('setTarget(9)'),true);
  assert.equal(game.run('enemy().boss'),false);
  assert.equal(game.run('setTarget(10)'),true);
  assert.equal(game.run('enemy().boss'),true);
  assert.equal(game.s.enemyTimer,0);
  assert.equal(game.s.autoProgress,0);
  assert.equal(game.s.enemyHP,game.run('enemy().hp'));
});

test('heal spends Ember once, restores health and applies cooldown', () => {
  const game=combatHarness();
  game.s.hp=10;
  game.run('usePotion()');
  assert.ok(game.s.hp>10);
  assert.ok(game.s.ember<1000);
  assert.equal(game.s.potionReady,28000);
  const hp=game.s.hp, ember=game.s.ember;
  game.run('usePotion()');
  assert.equal(game.s.hp,hp);
  assert.equal(game.s.ember,ember);
});

test('retreat stops combat and resets encounter health and timers', () => {
  const game=combatHarness();
  game.run('retreat()');
  assert.equal(game.s.auto,false);
  assert.equal(game.s.autoMode,'off');
  assert.equal(game.s.engagedUntil,0);
  assert.equal(game.s.enemyTimer,0);
  assert.equal(game.s.enemyHits,0);
  assert.equal(game.s.enemyHP,game.run('enemy().hp'));
});

test('Workers guild makeover retains original hiring contracts', () => {
  const game = read('game.html');
  const views = read('ui/views.js');
  const css = read('styles/workers.css');
  assert.match(game, /styles\/workers\.css\?v=\d+/);
  assert.match(game, /id="ef4-buymodes"/);
  assert.match(game, /id="ef4-workerlist"/);
  for (const mode of ['1','10','max']) {
    assert.ok(game.includes('data-buy="' + mode + '"'));
  }
  assert.match(views, /function renderWorkers\(\)/);
  assert.match(views, /shopButton\('worker',w\[0\]/);
  assert.match(views, /if\(b\.dataset\.worker\)/);
  assert.match(views, /if\(b\.dataset\.buy\)/);
  assert.doesNotMatch(views.slice(views.indexOf('function renderWorkers()'), views.indexOf('function renderUpgrades()')), /efw-locked|More workers await/);
  assert.match(css, /\.efw-worker/);
  assert.match(css, /mask-image:radial-gradient/);
  assert.match(css, /@media\(max-width:640px\)/);
});

test('workforce production milestones apply per type and reset with worker ownership', () => {
  const source=read('systems/combat.js');
  const part=source.slice(source.indexOf('const WORKER_MILESTONES='),source.indexOf('const equippedItem='));
  const worker=['sprite','Spark Sprite','sprite',15,2];
  const state={gens:{sprite:0}};
  const context={
    s:state,workers:[worker],
    workerUnlocked:()=>true,
    multiplier:()=>1,activeBuild:()=>0,activeSkill:()=>0,
    soulfactor:()=>1,skillfactor:()=>1
  };
  vm.createContext(context);
  vm.runInContext(part,context);
  const calculate=code=>vm.runInContext(code,context);
  for(const [count,mult] of [[0,1],[9,1],[10,1.05],[25,1.15],[50,1.30],[100,1.50]]) {
    state.gens.sprite=count;
    assert.ok(Math.abs(calculate('income()')-count*2*mult)<1e-9,'worker count '+count);
  }
  state.gens.sprite=9;
  assert.ok(Math.abs(calculate('workerMarginalProduction(workers[0])')-(10*2*1.05-9*2))<1e-9);
  state.gens.sprite=0;
  assert.equal(calculate('income()'),0,'Ascension resetting workers removes milestone output');
});

test('four workforce achievements are registered in permanent Mastery honors', () => {
  const definitions=read('data/definitions.js');
  const source=definitions.slice(definitions.indexOf('honors.push('),definitions.indexOf('const encounterBook='));
  const workers=Array.from({length:12},(_,i)=>['worker'+i]);
  const context={
    honors:[],workers
  };
  vm.createContext(context);
  vm.runInContext(source,context);
  assert.equal(context.honors.length,4);
  const conditions=Object.fromEntries(context.honors.map(h=>[h[0],h[3]]));
  const state={gens:Object.fromEntries(workers.map(w=>[w[0],0]))};
  state.gens.worker0=25;
  assert.equal(conditions.crew25(state),true);
  assert.equal(conditions.workforce100(state),false);
  state.gens.worker0=100;
  assert.equal(conditions.workforce100(state),true);
  assert.equal(conditions.veterancrew(state),true);
  state.gens=Object.fromEntries(workers.map(w=>[w[0],1]));
  assert.equal(conditions.allworkers(state),true);
  assert.match(read('ui/views.js'), /'ascensions','ach','skills'/);
  assert.match(read('ui/views.js'), /honorCheck\(\);renderWorkers\(\)/);
});

test('Workers overview and efficiency use the authoritative production helpers', () => {
  const html=read('game.html');
  const views=read('ui/views.js');
  const css=read('styles/workers.css');
  assert.match(html,/id="ef4-worker-summary"/);
  assert.match(views,/function renderWorkerSummary\(/);
  assert.match(views,/workerProduction\(w\)/);
  assert.match(views,/workerMarginalProduction\(w\)/);
  const workersSection=views.slice(views.indexOf('function renderWorkers()'),views.indexOf('function renderUpgrades()'));
  const masterySection=views.slice(views.indexOf('function renderMastery()'),views.indexOf('function renderPage()'));
  assert.doesNotMatch(workersSection, /efw-milestone|WORKER_MILESTONES/);
  assert.match(masterySection,/WORKER_MILESTONES\.find/);
  assert.match(masterySection,/if\(sub==='achievements'\)/);
  assert.match(masterySection,/efw-achievement-grid/);
  assert.match(html,/data-sub="achievements">Achievements/);
  assert.doesNotMatch(html,/data-sub="honors"/);
  assert.match(views,/costWorker\(w,1\)\.price/);
  assert.match(views,/renderWorkerSummary\(\)/);
  assert.match(css,/\.efw-summary-item/);
  assert.match(css,/\.efw-milestone-track/);
  assert.match(css,/\.efw-achievement-worker/);
  assert.doesNotMatch(views.slice(views.indexOf('function renderWorkers()'),views.indexOf('function renderUpgrades()')),/efw-locked/);
});

test('Workers production readout uses compact metrics and preserves costs', () => {
  const views=read('ui/views.js');
  const css=read('styles/workers.css');
  const block=views.slice(views.indexOf('function renderWorkers()'),views.indexOf('function renderUpgrades()'));
  assert.match(block,/class="efw-metrics"/);
  assert.match(block,/class="efw-metric-value"/);
  assert.match(block,/class="efw-share-track"/);
  assert.match(block,/class="efw-efficiency-amount"/);
  assert.match(block,/workerProduction\(w\)/);
  assert.match(block,/costWorker\(w,1\)\.price/);
  assert.match(block,/shopButton\('worker',w\[0\]/);
  assert.doesNotMatch(block,/efw-milestone/);
  assert.match(css,/\.efw-metrics/);
  assert.match(css,/\.efw-share-track/);
});

test('Arcane Upgrades retains purchase gating while using the new fantasy card layout', () => {
  const html=read('game.html');
  const views=read('ui/views.js');
  const css=read('styles/upgrades.css');
  const render=views.slice(views.indexOf('function renderUpgrades()'),views.indexOf('function renderKingdom()'));
  assert.match(html,/styles\/upgrades\.css\?v=1/);
  assert.match(html,/id="ef4-upgradeinfo"/);
  assert.match(html,/id="ef4-upgradehint"/);
  assert.match(html,/id="ef4-showowned"/);
  assert.doesNotMatch(html,/id="ef4-upgradeview"/);
  for(const type of ['unlocked','affordable','all']) assert.ok(html.includes('data-upgrade-filter="'+type+'"'));
  assert.match(render,/upgradeUnlocked\(u\)/);
  assert.match(render,/s\.ups\[u\[0\]\]/);
  assert.match(render,/s\.ember>=u\[3\]/);
  assert.match(render,/shopButton\('upgrade',u\[0\],u\[3\],!enabled/);
  assert.match(render,/class="efa-card/);
  assert.match(render,/class="efa-effect"/);
  assert.match(render,/class="efa-status/);
  assert.match(views,/if\(b\.dataset\.upgradeFilter\)/);
  assert.match(views,/\$\('showowned'\)\.addEventListener\('change'/);
  assert.match(css,/\.efa-purchase/);
  assert.match(css,/@media\(max-width:720px\)/);
});

test('Upgrades header contains generated banner with valid WebP size and concise labels', () => {
  const html=read('game.html');
  const css=read('styles/upgrades.css');
  const views=read('ui/views.js');
  const asset=fs.readFileSync(path.join(__dirname,'..','art','upgrades-banner.webp'));
  assert.equal(asset.toString('ascii',0,4),'RIFF');
  assert.equal(asset.toString('ascii',8,12),'WEBP');
  assert.equal(asset.readUInt32LE(4)+8,asset.length,'WebP asset must not be truncated');
  assert.match(html,/<h2 class="page-title">Upgrades<\/h2>/);
  assert.doesNotMatch(html,/<h2 class="page-title">Arcane Upgrades<\/h2>/);
  assert.match(css,/\.\.\/art\/upgrades-banner\.webp/);
  assert.match(views,/efa-effect-caption">Upgrade Effect/);
  assert.doesNotMatch(views,/efa-effect-caption">Arcane effect/);
});
