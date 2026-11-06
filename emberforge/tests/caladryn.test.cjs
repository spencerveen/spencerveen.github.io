'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function setup(location='kingdom'){
 const s={location,zone:0,stage:8,unlocked:2,stageUnlocked:[10,7,1,0,0,0],
  items:[{id:'keepsake',locked:true}],equipped:{mainHand:'keepsake'},
  auto:true,autoMode:'selected',autoProgress:.8,smartResting:false,engagedUntil:1200,
  enemyTimer:3,enemyHits:2,manualAt:1200,enemyHP:12,downUntil:0,combatMessage:''};
 let saves=0,sceneUpdates=0;
 const context={s,Number,realms:[['Ashen Wilds'],['Whispering Forest'],['Frostspire Peaks']],
  realmAccessible:i=>i>=0&&i<=2,enemy:()=>({hp:100}),note:()=>{},
  save:()=>saves++,rollBattleBackground:()=>sceneUpdates++,
  atKingdom:()=>s.location==='kingdom',inExpedition:()=>s.location==='realm'};
 vm.createContext(context);
 vm.runInContext(read('systems/travel.js'),context);
 return {s,run:x=>vm.runInContext(x,context),saves:()=>saves,scenes:()=>sceneUpdates};
}
test('traveling to a realm stops old encounters but preserves inventory and equipment',()=>{
 const x=setup(),items=x.s.items,equipped=x.s.equipped;
 assert.equal(x.run('travelToRealm(1)'),true);
 assert.equal(x.s.location,'realm');assert.equal(x.s.zone,1);assert.equal(x.s.stage,1);
 assert.equal(x.s.auto,false);assert.equal(x.s.autoMode,'off');
 assert.equal(x.s.engagedUntil,0);assert.equal(x.s.enemyTimer,0);
 assert.equal(x.s.enemyHits,0);assert.equal(x.s.enemyHP,100);
 assert.equal(x.s.items,items);assert.equal(x.s.equipped,equipped);
 assert.equal(x.saves(),1);assert.equal(x.scenes(),1);
});
test('players can always return home, even when defeated',()=>{
 const x=setup('realm');x.s.downUntil=100000;x.s.hp=0;
 assert.equal(x.run('travelToKingdom()'),true);
 assert.equal(x.s.location,'kingdom');assert.equal(x.s.auto,false);
 assert.equal(x.s.stage,8);assert.equal(x.s.hp,0);
 assert.equal(x.s.items.length,1);assert.equal(x.saves(),1);
});
test('locked travel is rejected without changing the last location',()=>{
 const x=setup();
 assert.equal(x.run('travelToRealm(4)'),false);
 assert.equal(x.run('travelToRealm(-1)'),false);
 assert.equal(x.run('travelToRealm(1.5)'),false);
 assert.equal(x.s.location,'kingdom');assert.equal(x.saves(),0);
});
test('World includes Kingdom and six realms, but keeps Kingdom services local',()=>{
 const html=read('game.html'),view=read('ui/views.js'),def=read('data/definitions.js');
 const clean=read('core/formatting.js'),combat=read('systems/combat.js'),loop=read('core/loop.js');
 assert.match(html,/id="ef4-mapmarkers"/);
 assert.match(html,/id="ef4-kingdominterior"/);
 assert.match(html,/id="ef4-worldlocation"/);
 assert.match(html,/data-return-home/);
 assert.doesNotMatch(html,/data-page="kingdom"/);
 assert.doesNotMatch(html,/data-view="kingdom"/);
 assert.match(html,/systems\/travel\.js\?v=/);
 assert.match(view,/const CALADRYN_STOPS=\[/);
 assert.match(view,/if\(home\)renderKingdom\(\)/);
 assert.match(view,/if\(!atKingdom\(\)\)\{toast\('Return to the Kingdom to construct buildings/);
 assert.match(view,/if\(b\.dataset\.sell\)\{if\(!atKingdom\(\)\)return;/);
 assert.match(view,/function inventorySell\(predicate\)\{if\(!atKingdom\(\)\)return;/);
 assert.match(view,/travelToRealm\(z\)/);
 assert.match(view,/travelToKingdom\(\)/);
 assert.match(def,/location:'kingdom'/);
 assert.match(clean,/obj\.location\)\?obj\.location:'realm'/);
 assert.match(combat,/const activeFight=\(\)=>inExpedition\(\)/);
 assert.match(loop,/location:s\.location/);
});

test('Caladryn map artwork is self-contained and aligned with interactive waypoints',()=>{
 const html=read('game.html'),map=read('art/caladryn-world-map.svg'),css=read('styles/world.css'),view=read('ui/views.js');
 assert.match(map,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
 assert.match(map,/viewBox="0 0 1672 941"/);
 assert.match(map,/<\/svg>\s*$/);
 assert.match(map,/CALADRYN/);
 assert.match(html,/src="\.\/art\/caladryn-world-map\.svg"/);
 assert.match(css,/\.caladryn-map-viewport\{/);
 assert.match(css,/\.caladryn-map-pin\.current\{/);
 assert.match(css,/overflow-x:auto/);
 assert.match(view,/const CALADRYN_STOPS=\[/);
 const stops=view.slice(view.indexOf('const CALADRYN_STOPS=['),view.indexOf('function renderWorld(){'));
 assert.equal((stops.match(/name:/g)||[]).length,7);
});
test('legacy users resume their expedition and new users start in Kingdom',()=>{
 const defs=read('data/definitions.js'),formatting=read('core/formatting.js');
 assert.match(defs,/version:8,location:'kingdom'/);
 assert.match(formatting,/x\.location=\['kingdom','realm'\]\.includes\(obj\.location\)\?obj\.location:'realm'/);
 assert.match(formatting,/if\(x\.location==='kingdom'\)\{x\.autoMode='off';x\.auto=false;/);
 assert.match(formatting,/x\.version=8;/);
});

test('all navigation tabs remain clickable after Caladryn initialization',()=>{
 const views=read('ui/views.js');
 const start=views.indexOf('function go(p){');
 const end=views.indexOf('function modal(',start);
 assert.ok(start>=0&&end>start,'navigation function must exist');
 const nav=views.slice(start,end);
 const pages=['forge','battle','workers','upgrades','gear','world','mastery'];
 const allViews=pages.map(p=>({dataset:{view:p},classList:{active:false,toggle(name,on){this.active=on}}}));
 const allButtons=pages.map(p=>({dataset:{page:p},classList:{active:false,toggle(name,on){this.active=on}}}));
 let renderCount=0,toastCount=0;
 const context={
  page:'forge',atKingdom:()=>false,
  $$:selector=>selector==='[data-view]'?allViews:selector==='[data-page]'?allButtons:[],
  $:()=>{throw new Error('Navigation must use the querySelectorAll helper')},
  renderPage:()=>renderCount++,toast:()=>toastCount++
 };
 vm.createContext(context);
 vm.runInContext(nav,context);
 for(const p of pages){
  vm.runInContext('go('+JSON.stringify(p)+')',context);
  assert.equal(context.page,p,p+' navigation changes page');
  assert.deepEqual(allViews.filter(x=>x.classList.active).map(x=>x.dataset.view),[p]);
  assert.deepEqual(allButtons.filter(x=>x.classList.active).map(x=>x.dataset.page),[p]);
 }
 assert.equal(renderCount,pages.length);
 assert.equal(toastCount,0);
 context.atKingdom=()=>true;
 vm.runInContext("go('battle')",context);
 assert.equal(context.page,'world','safe home must redirect Battle to World');
 assert.equal(toastCount,1);
 vm.runInContext("go('kingdom')",context);
 assert.equal(context.page,'world','legacy Kingdom link must redirect to World');
});
