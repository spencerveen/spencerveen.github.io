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
    'systems/combat.js', 'systems/travel.js', 'ui/adventurer.js', 'ui/views.js',
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
    'systems/travel.js', 'ui/views.js', 'core/loop.js'
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
  for (const method of ['getCombatState', 'selectStage', 'setAutoAttack', 'strike', 'usePotion']) {
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

test('boss loot messages avoid removed salvage popup notices', () => {
  const combat = read('systems/combat.js');
  assert.doesNotMatch(combat, /toast\(['"]Boss chest: ['"]\s*\+\s*drop\.name\s*\+\s*['"] salvaged['"]\)/);
  assert.match(combat, /if\(e\.boss&&drop&&!drop\.lost\)toast\(/);
  assert.match(combat, /if\(boss\)\{s\.lastBossLoot=/);
  const battle = read('emberforge-battle.js');
  assert.match(battle, /routeBattleToasts\(\)/);
});

test('automatic damage uses engine power and renders hit feedback', () => {
  const engine = read('core/loop.js');
  assert.match(engine, /playerAttack\(true\)/);
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
    playerAttack:()=>{calls.damage.push(12);}, takeHit:()=>{calls.hits++;},
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
    items:[],equipped:{mainHand:null,chest:null,charm:null},
    combatLevel:1,hp:105,downUntil:0,autoMode:'selected',auto:true,
    enemyHP:10,enemyTimer:2,enemyHits:2,autoProgress:0.5,
    engagedUntil:15000,smartResting:false,journal:[],
    ember:1000,potionReady:0,potions:{minor:2}
  };
  const context={
    s, Date:{now:()=>10000}, Math, console,
    LEGACY_EQUIPMENT_SLOTS:{weapon:'mainHand',armor:'chest',charm:'charm'},
    EQUIPMENT_SLOT_KEYS:['mainHand','chest','charm'],
    realms:[['Ashen Wilds','','','','Cinder Warden','boss',20,8]],
    MONSTER_LADDERS:[Array.from({length:9},(_,i)=>['Foe '+(i+1),'imp'])],
    REALM_ASCENSIONS:[0],XP_GAIN:()=>15,
    currentTrait:()=>({name:'Standard',hp:1,atk:1,speed:1}),
    maxSelectable:()=>10,activeBuild:()=>0,activeSkill:()=>0,
    inExpedition:()=>true,atKingdom:()=>false,
    activeTraining:()=>0,upgradeUnlocked:()=>true,
    potionDefinition:()=>({id:'minor',name:'Minor Healing Potion',heal:.10,maxStack:10}),
    rollBattleBackground:()=>{},renderPage:()=>{},stats:()=>{},save:()=>{},
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

test('potion consumption restores HP, uses inventory, preserves Ember and applies cooldown', () => {
 const game=combatHarness();
 game.s.hp=10;
 game.run('usePotion()');
 assert.equal(game.s.hp,20.5);
 assert.equal(game.s.potions.minor,1);
 assert.equal(game.s.ember,1000);
 assert.equal(game.s.potionReady,28000);
 const hp=game.s.hp;
 game.run('usePotion()');
 assert.equal(game.s.hp,hp);
 assert.equal(game.s.potions.minor,1);
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
  assert.match(html,/styles\/upgrades\.css\?v=\d+/);
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

test('Armory creates 14 empty equipment slots around a neutral character', () => {
 const defs=read('data/definitions.js'),gear=read('ui/views.js');
 const css=read('styles/armory.css'),html=read('game.html');
 const declared=defs.slice(defs.indexOf('const EQUIPMENT_SLOTS='),defs.indexOf('const lootAbilityText='));
 const context={};
 vm.createContext(context);
 vm.runInContext(declared,context);
 const slots=vm.runInContext('EQUIPMENT_SLOT_KEYS',context);
 const expected=['helmet','chest','legs','gloves','boots','mainHand','offHand','ring1','ring2','ring3','ring4','necklace','charm','back'];
 assert.deepEqual([...slots].sort(),expected.sort());
 assert.match(gear,/efg-character-layout/);
 assert.match(gear,/renderAdventurerPaperDoll\(\)/);
 assert.match(gear,/data-unequip/);
 assert.match(html,/id="ef4-equipped"/);
 assert.match(html,/styles\/armory\.css\?v=/);
 assert.match(css,/\.efg-paperdoll-svg/);
 assert.doesNotMatch(css,/efg-anchor-aura|efg-anchor-mark/);
});

test('legacy weapon armor and charm mapping preserves stats and valid equipment IDs',()=>{
 const source=read('core/formatting.js');
 const block=source.slice(source.indexOf('// Migrate existing equipped legacy slots'),source.indexOf("x.claimed=Array.isArray"));
 const items=[
  {id:'blade',slot:'weapon',power:14},
  {id:'plate',slot:'armor',power:7},
  {id:'amulet',slot:'charm',power:4}
 ];
 const keys=['mainHand','chest','charm','helmet','offHand','gloves','legs','boots','ring1','ring2','ring3','ring4','necklace','back'];
 const context={
  obj:{equipped:{weapon:'blade',armor:'plate',charm:'amulet'}},
  x:{items,equipped:{}},
  f:{equipped:Object.fromEntries(keys.map(k=>[k,null]))},
  EQUIPMENT_SLOT_KEYS:keys,
  LEGACY_EQUIPMENT_SLOTS:{weapon:'mainHand',armor:'chest',charm:'charm'},
  equipmentSlotFor:g=>({weapon:'mainHand',armor:'chest',charm:'charm'}[g.slot]||g.slot)
 };
 vm.createContext(context);
 vm.runInContext('{'+block+'}',context);
 assert.equal(context.x.equipped.mainHand,'blade');
 assert.equal(context.x.equipped.chest,'plate');
 assert.equal(context.x.equipped.charm,'amulet');
 assert.equal(context.x.equipped.helmet,null);
 assert.equal(context.x.avatarBody,'male');
 context.obj.equipped={mainHand:'nonexistent',chest:'blade',charm:'amulet'};
 vm.runInContext('{'+block+'}',context);
 assert.equal(context.x.equipped.mainHand,null);
 assert.equal(context.x.equipped.chest,null);
 assert.equal(context.x.equipped.charm,'amulet');
 assert.match(read('systems/combat.js'),/gearTotal\(\['helmet','chest','gloves','legs','boots','offHand'\]\)/);
 assert.match(read('systems/combat.js'),/LEGACY_EQUIPMENT_SLOTS\[slot\]/);
});

test('Armory slots are organized into Equipped and Jewelry columns', () => {
 const render=read('ui/views.js');
 const section=render.slice(render.indexOf('function renderGear()'),render.indexOf(" const capacity=inventoryCapacity()",render.indexOf('function renderGear()')));
 assert.ok(section.includes('efg-group-heading">Equipped'));
 assert.ok(section.includes('efg-group-heading">Jewelry'));
 assert.ok(section.includes("'mainHand','offHand','back'"));
 assert.ok(section.includes("'ring4','charm'"));
 assert.ok(!section.includes('efg-hand-slots'));
});
test('Adventurer paper doll exposes independent equipment overlays for every slot', () => {
 const asset=read('ui/adventurer.js');
 const view=read('ui/views.js');
 const html=read('game.html');
 const slots=['helmet','chest','legs','gloves','boots','mainHand','offHand','ring1','ring2','ring3','ring4','necklace','charm','back'];
 const equipped=Object.fromEntries(slots.map(x=>[x,null]));
 equipped.mainHand='blade';
 equipped.chest='plate';
 const context={s:{equipped},EQUIPMENT_SLOT_KEYS:slots};
 vm.createContext(context);
 vm.runInContext(asset,context);
 const svg=vm.runInContext('renderAdventurerPaperDoll()',context);
 for(const slot of slots)assert.ok(svg.includes('data-visual-slot="'+slot+'"'),'Missing visual anchor '+slot);
 assert.equal((svg.match(/data-visual-slot=/g)||[]).length,slots.length);
 assert.match(svg,/class="efg-character-base"/);
 assert.match(svg,/class="efg-rune-stage"/);
 assert.match(svg,/data-visual-slot="mainHand"/);
 assert.match(svg,/class="efg-visual-layer has-gear"/);
 assert.match(svg,/viewBox="0 0 300 430"/);
 assert.ok(html.indexOf('ui/adventurer.js')<html.indexOf('ui/views.js'),'Load paper doll before dependent view');
 assert.match(view,/renderAdventurerPaperDoll\(\)/);
 assert.doesNotMatch(view,/efg-torso/);
});

test('character identity and selected portrait persist and render correctly',()=>{
 const html=read('game.html'),definitions=read('data/definitions.js'),formatting=read('core/formatting.js');
 const views=read('ui/views.js'),avatar=read('ui/adventurer.js');
 const equipment=['helmet','chest','legs','gloves','boots','mainHand','offHand','ring1','ring2','ring3','ring4','necklace','charm','back'];
 const state={avatarBody:'male',equipped:Object.fromEntries(equipment.map(k=>[k,null]))};
 const context={s:state,EQUIPMENT_SLOT_KEYS:equipment};
 vm.createContext(context);
 vm.runInContext(avatar,context);
 assert.match(vm.runInContext('renderAdventurerPaperDoll()',context),/adventurer-male\.webp/);
 state.avatarBody='female';
 assert.match(vm.runInContext('renderAdventurerPaperDoll()',context),/adventurer-female\.webp/);
 for (const gender of ['male','female']){
  const asset=fs.readFileSync(path.join(gameDir,'art','adventurer-'+gender+'.webp'));
  assert.equal(asset.toString('ascii',0,4),'RIFF');
  assert.equal(asset.toString('ascii',8,12),'WEBP');
  assert.equal(asset.readUInt32LE(4)+8,asset.length);
 }
 assert.match(views,/id="ef4-adventurer-name"/);
 assert.match(views,/data-avatar-gender="male"/);
 assert.match(views,/data-avatar-gender="female"/);
 assert.match(views,/root\.addEventListener\('input'/);
 assert.match(views,/if\(b\.dataset\.avatarGender\)/);
 assert.match(views,/'avatarBody','avatarName'\]/);
 assert.match(definitions,/avatarBody:'male',avatarName:''/);
 assert.match(formatting,/x\.avatarName=typeof obj\.avatarName==='string'/);
 assert.match(formatting,/\['male','female'\]\.includes\(obj\.avatarBody\)/);
 assert.match(html,/ui\/adventurer\.js\?v=/);
});

test('Armory slot cards keep generic icons, readable labels and functional unequip buttons',()=>{
 const view=read('ui/views.js'),css=read('styles/armory.css');
 const block=view.slice(view.indexOf('function renderGear(){'),view.indexOf(' const equippedSlots=',view.indexOf('function renderGear(){')));
 assert.match(block,/class="efg-slot-badge"/);
 assert.match(block,/class="efg-slot-copy"/);
 assert.match(block,/class="efg-slot-label"/);
 assert.match(block,/class="efg-slot-main/);
 assert.match(block,/class="efg-slot-sub"/);
 assert.match(block,/class="efg-slot-empty-pill"/);
 assert.match(block,/data-unequip=/);
 assert.match(block,/iconHTML\(def\[2\],'lg'\)/);
 assert.match(css,/#ef4 \.efg-slot-column\{display:flex;flex-direction:column/);
 assert.match(css,/#ef4 \.efg-slot-column \.efg-slot\{display:flex;flex-direction:row/);
 assert.match(css,/#ef4 \.efg-character-center\{position:relative/);
 assert.doesNotMatch(css,/#ef4 \.efg-slot-column,\/\*/);
});

test('empty Jewelry placeholders load optimized assets and reuse one ring image',()=>{
 const views=read('ui/views.js'),css=read('styles/armory.css');
 const gear=views.slice(views.indexOf('function renderGear(){'),views.indexOf(' const equippedSlots=',views.indexOf('function renderGear(){')));
 for(const kind of ['necklace','ring','charm']){
   const asset=fs.readFileSync(path.join(gameDir,'art','armory-slot-'+kind+'.webp'));
   assert.equal(asset.toString('ascii',0,4),'RIFF',kind);
   assert.equal(asset.toString('ascii',8,12),'WEBP',kind);
   assert.equal(asset.readUInt32LE(4)+8,asset.length,kind+' file integrity');
 }
 assert.match(gear,/ring1:'ring',ring2:'ring',ring3:'ring',ring4:'ring'/);
 assert.match(gear,/jewelryEmptyArt\[key\]/);
 assert.match(gear,/class="efg-slot-placeholder-art"/);
 assert.match(gear,/g\?lootVisual\(g\.icon,'lg'\)/);
 assert.match(gear,/iconHTML\(def\[2\],'lg'\)/);
 assert.match(css,/\.efg-slot-badge \.efg-slot-placeholder-art/);
});

test('Equipped placeholders have distinct art tiles and preserve live loot artwork',()=>{
 const views=read('ui/views.js'),css=read('styles/armory.css');
 const art=fs.readFileSync(path.join(gameDir,'art','armory-equipped-placeholders.webp'));
 assert.equal(art.toString('ascii',0,4),'RIFF');
 assert.equal(art.toString('ascii',8,12),'WEBP');
 assert.equal(art.readUInt32LE(4)+8,art.length);
 const gear=views.slice(views.indexOf('function renderGear(){'),views.indexOf(' const equippedSlots=',views.indexOf('function renderGear(){')));
 assert.match(gear,/helmet:0,chest:1,gloves:2,legs:3,boots:4,mainHand:5,offHand:6,back:7/);
 assert.match(gear,/Object\.prototype\.hasOwnProperty\.call\(equippedEmptyArt,key\)/);
 assert.match(gear,/efg-equipped-placeholder-/);
 assert.match(gear,/g\?lootVisual\(g\.icon,'lg'\)/);
 for(let n=0;n<8;n++)assert.ok(css.includes('.efg-equipped-placeholder-'+n+'{background-position-x:'),'missing atlas position '+n);
 assert.match(css,/armory-equipped-placeholders\.webp/);
 assert.match(gear,/jewelryEmptyArt\[key\]/);
});

test('Equipped slot sprites have inset space to prevent clipped frames',()=>{
 const css=read('styles/armory.css');
 assert.match(css,/\.efg-equipped-placeholder\{display:block;width:40px;height:40px/);
 assert.match(css,/background-size:800% 100%/);
 assert.match(css,/@media\(max-width:600px\)\{#ef4 \.efg-equipped-placeholder\{width:35px;height:35px/);
 assert.match(css,/align-items:center;justify-items:center/);
});

test('shared backpack capacity counts equipment and stacks of ten potions',()=>{
 const defs=read('data/definitions.js'),combat=read('systems/combat.js'),views=read('ui/views.js'),html=read('game.html');
 assert.match(defs,/const INVENTORY_CAPACITY=30;/);
 assert.match(defs,/const inventoryUsedSlots=\(\)=>s\.items\.length\+potionSlotsUsed\(\)/);
 assert.match(combat,/if\(inventoryUsedSlots\(\)>=inventoryCapacity\(\)\)/);
 assert.match(combat,/stored%potion\.maxStack===0&&inventoryUsedSlots\(\)>=inventoryCapacity\(\)/);
 assert.match(views,/const capacity=inventoryCapacity\(\),count=inventoryUsedSlots\(\)/);
 assert.match(views,/const potionTiles=HEALING_POTIONS\.flatMap/);
 assert.match(html,/Backpack \(0 \/ 30\)/);
});
test('Armory manages equipment while Kingdom merchant owns buying and selling',()=>{
 const html=read('game.html'),views=read('ui/views.js'),css=read('styles/inventory.css');
 const gear=html.slice(html.indexOf('<section class="page" data-view="gear">'),html.indexOf('<section class="page" data-view="world">'));
 const kingdom=html.slice(html.indexOf('id="ef4-kingdominterior"'),html.indexOf('<section class="page" data-view="mastery">'));
 assert.match(gear,/ef4-bagtitle/);
 assert.match(gear,/ef4-bagprogress/);
 assert.match(gear,/ef4-baglist/);
 assert.doesNotMatch(gear,/data-action="salvage-|data-sell=/);
 assert.match(kingdom,/id="ef4-merchantstock"/);
 assert.match(kingdom,/id="ef4-merchantlist"/);
 assert.match(kingdom,/data-kingdom-point="merchant"/);
 assert.match(kingdom,/id="ef4-kingdomdialog"/);
 assert.match(kingdom,/data-merchant-tab="sell"/);
 const bag=views.slice(views.indexOf('function renderGear(){'),views.indexOf('function renderWorld(){'));
 assert.match(bag,/class="efg-bag-slot efg-bag-empty"/);
 assert.match(bag,/data-equip=/);
 assert.match(bag,/data-lock=/);
 assert.doesNotMatch(bag,/data-sell=/);
 assert.match(views,/function renderKingdomMerchant\(\)/);
 assert.match(views,/if\(b\.dataset\.sell\)\{if\(!atKingdom\(\)\)return;/);
 assert.match(views,/function buyMerchantPotion\(id\)/);
 assert.match(css,/\.efg-bag-grid/);
 assert.match(css,/\.efk-merchant-item/);
});
test('shared gear protection honors equipped and locked items',()=>{
 const defs=read('data/definitions.js');
 const part=defs.slice(defs.indexOf('const equippedGearIds='),defs.indexOf('const lootAbilityText='));
 const context={s:{equipped:{mainHand:'blade',chest:null,charm:'amulet'}}};
 vm.createContext(context);vm.runInContext(part,context);
 const tests=[
  {item:{id:'blade',locked:false},protected:true},
  {item:{id:'amulet',locked:false},protected:true},
  {item:{id:'locked',locked:true},protected:true},
  {item:{id:'free',locked:false},protected:false}
 ];
 for(const row of tests){context.item=row.item;assert.equal(vm.runInContext('isGearTradeProtected(item)',context),row.protected,row.item.id)}
 context.s.equipped.mainHand=null;context.item={id:'blade',locked:false};
 assert.equal(vm.runInContext('isGearTradeProtected(item)',context),false);
});

test('merchant single-item sales protect equipped or locked gear',()=>{
 const views=read('ui/views.js');
 assert.match(views,/const protectedGear=isGearTradeProtected\(g,equippedIds\)/);
 assert.match(views,/if\(isGearTradeProtected\(g\)\)\{toast\('Unlock and unequip the item first.'/);
 assert.match(views,/s\.items=s\.items\.filter\(x=>x!==g\)/);
 assert.match(views,/gain\(sellValue\(g\)\)/);
 assert.match(views,/renderKingdomMerchant\(\);currencyStats\(\);save\(\)/);
});
test('pre-Ascension salvage actions are unavailable without removing merchant selling',()=>{
 const html=read('game.html'),views=read('ui/views.js');
 assert.doesNotMatch(html,/salvage-common|salvage-all|ef4-salvagefilter/);
 assert.doesNotMatch(views,/function inventorySell\(/);
 assert.match(views,/if\(b\.dataset\.sell\)/);
 assert.match(views,/function sellMerchantPotion\(id\)/);
});
test('Armory fantasy header keeps Equip Best functional and mobile layout scoped',()=>{
 const html=read('game.html'),css=read('styles/armory.css'),views=read('ui/views.js');
 const armory=html.slice(html.indexOf('<section class="page" data-view="gear">'),html.indexOf('<section class="page" data-view="kingdom">'));
 assert.match(armory,/class="efg-armory-header"/);
 assert.match(armory,/class="efg-armory-crest"/);
 assert.match(armory,/Equipment &amp; Inventory/);
 assert.match(armory,/class="page-title">The Armory/);
 assert.match(armory,/class="efg-armory-subtitle"/);
 assert.match(armory,/data-action="best"/);
 assert.equal((armory.match(/data-action="best"/g)||[]).length,1);
 assert.match(views,/if\(a==='best'\)/);
 assert.match(css,/#ef4 \.efg-armory-header\{/);
 assert.match(css,/#ef4 \.efg-armory-best:focus-visible/);
 assert.match(css,/@media\(max-width:450px\)/);
});

test('adventurer portraits ship as crisp high-resolution optimized WebP images',()=>{
 const avatar=read('ui/adventurer.js');
 assert.match(avatar,/adventurer-\$\{gender\}\.webp\?v=2/);
 for(const gender of ['male','female']){
  const asset=fs.readFileSync(path.join(gameDir,'art','adventurer-'+gender+'.webp'));
  assert.ok(asset.length>30000,'Portrait should contain the regenerated high resolution art');
  assert.ok(asset.length<150000,'Portrait should remain web-optimized');
  const p=asset.indexOf(Buffer.from([0x9d,0x01,0x2a]));
  assert.ok(p>0,'Expected VP8 WebP frame header');
  const width=asset.readUInt16LE(p+3)&0x3fff;
  const height=asset.readUInt16LE(p+5)&0x3fff;
  assert.equal(width,720);
  assert.equal(height,960);
 }
 assert.match(avatar,/class="efg-equipment-overlays"/);
});

test('Adventurer portraits have no visible diamond markers over characters',()=>{
 const avatar=read('ui/adventurer.js');
 const css=read('styles/armory.css');
 const slots=['helmet','chest','legs','gloves','boots','mainHand','offHand','ring1','ring2','ring3','ring4','necklace','charm','back'];
 const context={s:{avatarBody:'female',equipped:Object.fromEntries(slots.map(k=>[k,null]))},EQUIPMENT_SLOT_KEYS:slots};
 context.s.equipped.mainHand='weapon1';
 vm.createContext(context);vm.runInContext(avatar,context);
 for(const gender of ['female','male']){
  context.s.avatarBody=gender;
  const scene=vm.runInContext('renderAdventurerPaperDoll()',context);
  assert.equal((scene.match(/data-visual-slot=/g)||[]).length,14);
  assert.match(scene,/class="efg-visual-layer has-gear"/);
  assert.doesNotMatch(scene,/efg-anchor-aura|efg-anchor-mark/);
  assert.match(scene,/adventurer-\$?\{?gender\}?|adventurer-(?:male|female)/);
 }
 assert.doesNotMatch(css,/efg-anchor-aura|efg-anchor-mark/);
});

test('Armory banner uses committed optimized image with readable gradient overlay',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const css=read('styles/armory.css');
 const asset=fs.readFileSync(path.join(gameDir,'art','armory-banner.webp'));
 assert.equal(asset.toString('ascii',0,4),'RIFF');
 assert.equal(asset.toString('ascii',8,12),'WEBP');
 assert.equal(asset.readUInt32LE(4)+8,asset.length);
 assert.ok(asset.length>1000 && asset.length<30000);
 assert.match(css,/url\('\.\.\/art\/armory-banner\.webp'\)/);
 assert.match(css,/\.efg-armory-header\{/);
 assert.match(css,/rgba\(9,15,28,\.82\)/);
 assert.match(css,/\.efg-armory-best/);
});
