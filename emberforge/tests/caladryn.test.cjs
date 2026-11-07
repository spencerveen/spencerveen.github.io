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
 assert.match(view,/function buyMerchantGear\(name\)\{/);
 assert.match(view,/function sellMerchantPotion\(id\)\{/);
 assert.match(view,/travelToRealm\(z\)/);
 assert.match(view,/travelToKingdom\(\)/);
 assert.match(def,/location:'kingdom'/);
 assert.match(clean,/obj\.location\)\?obj\.location:'realm'/);
 assert.match(combat,/const activeFight=\(\)=>inExpedition\(\)/);
 assert.match(loop,/location:s\.location/);
});

test('Approved high-resolution Caladryn painting and its travel waypoints are wired correctly',()=>{
 const html=read('game.html'),css=read('styles/world.css'),view=read('ui/views.js');
 const art=fs.readFileSync(path.join(root,'art','caladryn-world-map.avif'));
 assert.equal(art.toString('ascii',4,8),'ftyp');
 assert.equal(art.toString('ascii',8,12),'avif');
 assert.ok(art.length>120000 && art.length<350000,'High resolution artwork must be optimized but not overly compressed');
 const ispe=art.indexOf(Buffer.from('ispe'));
 assert.ok(ispe>=0,'AVIF image dimensions are embedded');
 assert.equal(art.readUInt32BE(ispe+8),1672);
 assert.equal(art.readUInt32BE(ispe+12),941);
 assert.match(html,/src="\.\/art\/caladryn-world-map\.avif"/);
 assert.match(html,/width="1672" height="941"/);
 assert.match(css,/\.caladryn-map-viewport\{/);
 assert.match(css,/\.caladryn-map-pin\.current\{/);
 assert.match(css,/#ef4 \.caladryn-map-viewport\{[^\n]*overflow:hidden/);
 assert.match(css,/\.caladryn-pin-glyph\{opacity:0/);
 const stops=view.slice(view.indexOf('const CALADRYN_STOPS=['),view.indexOf('function renderWorld(){'));
 assert.equal((stops.match(/name:/g)||[]).length,7);
 assert.match(stops,/Ashen Wilds',x:22\.5,y:58\.7/);
 assert.match(stops,/Whispering Forest',x:36\.3,y:52\.0/);
 assert.match(stops,/Eternal Citadel',x:90\.8,y:26\.3/);
});
test('legacy users resume their expedition and new users start in Kingdom',()=>{
 const defs=read('data/definitions.js'),formatting=read('core/formatting.js');
 assert.match(defs,/version:12,workerTimers:\{\},potions:\{minor:0\},location:'kingdom'/);
 assert.match(formatting,/x\.location=\['kingdom','realm'\]\.includes\(obj\.location\)\?obj\.location:'realm'/);
 assert.match(formatting,/if\(x\.location==='kingdom'\)\{x\.autoMode='off';x\.auto=false;/);
 assert.match(formatting,/x\.version=11;/);
});

test('all six navigation tabs and nested combat switch safely',()=>{
 const views=read('ui/views.js');
 const start=views.indexOf('function go(p){'),end=views.indexOf('function modal(',start);
 assert.ok(start>=0&&end>start,'navigation function must exist');
 const nav=views.slice(start,end);
 const pages=['forge','workers','upgrades','gear','world','mastery'];
 const allViews=[...pages,'battle'].map(p=>({dataset:{view:p},classList:{active:false,toggle(name,on){this.active=on}}}));
 const allButtons=pages.map(p=>({dataset:{page:p},classList:{active:false,toggle(name,on){this.active=on}}}));
 let renderCount=0,scrollCount=0,expedition=false;
 const context={page:'forge',inExpedition:()=>expedition,
  $$:selector=>selector==='[data-view]'?allViews:selector==='[data-page]'?allButtons:[],
  $:id=>{assert.equal(id,'worldbattle');return {scrollIntoView(){scrollCount++}}},
  renderPage:()=>renderCount++};
 vm.createContext(context);vm.runInContext(nav,context);
 for(const p of pages){
  vm.runInContext('go('+JSON.stringify(p)+')',context);
  assert.equal(context.page,p,p+' navigation changes page');
  assert.deepEqual(allViews.filter(x=>x.classList.active).map(x=>x.dataset.view),[p]);
  assert.deepEqual(allButtons.filter(x=>x.classList.active).map(x=>x.dataset.page),[p]);
 }
 assert.equal(renderCount,pages.length);
 expedition=true;
 vm.runInContext("go('world')",context);
 assert.equal(context.page,'world');
 assert.deepEqual(allViews.filter(x=>x.classList.active).map(x=>x.dataset.view),['world','battle']);
 vm.runInContext("go('battle')",context);
 assert.equal(context.page,'world','old combat links must resolve to World');
 assert.equal(scrollCount,1,'legacy Battle shortcut scrolls to embedded combat');
 vm.runInContext("go('kingdom')",context);
 assert.equal(context.page,'world','legacy Kingdom link resolves to World');
 expedition=false;
 vm.runInContext("go('world')",context);
 assert.deepEqual(allViews.filter(x=>x.classList.active).map(x=>x.dataset.view),['world']);
});

test('Caladryn map resizes to the window without unnecessary zoom controls',()=>{
 const css=read('styles/world.css'),html=read('game.html'),view=read('ui/views.js');
 assert.match(css,/#ef4 \.caladryn-map-canvas\{[^\n]*width:100%;min-width:0;aspect-ratio:1672\/941/);
 assert.match(css,/#ef4 \.caladryn-map-viewport\{[^\n]*width:min\(100%,1120px\)/);
 assert.doesNotMatch(css,/\.caladryn-map-viewport\.zoomed/);
 assert.doesNotMatch(css,/min-width:(?:950|1050|920|860)px/);
 assert.match(html,/id="ef4-mapviewport"/);
 assert.doesNotMatch(html,/data-map-zoom|Enlarge map/);
 assert.doesNotMatch(view,/Object\.prototype\.hasOwnProperty\.call\(b\.dataset,'mapZoom'\)/);
});

test('Battle lives under World, without separate navigation or duplicate combat IDs',()=>{
 const html=read('game.html'),view=read('ui/views.js'),css=read('styles/world.css'),skin=read('emberforge-battle.js');
 const start=html.indexOf('<section class="page" data-view="world">');
 const world=html.slice(start,html.indexOf('<section class="page" data-view="mastery">',start));
 assert.ok(start>=0);
 assert.doesNotMatch(html,/data-page="battle"/);
 assert.doesNotMatch(html,/<section class="page" data-view="battle">/);
 assert.match(world,/id="ef4-worldbattle" data-view="battle" hidden/);
 assert.ok(world.indexOf('id="ef4-mapmarkers"')<world.indexOf('id="ef4-worldbattle"'));
 assert.ok(world.indexOf('id="ef4-worldbattle"')<world.indexOf('id="ef4-kingdominterior"'));
 for(const id of ['ef4-battlescene','ef4-strike','ef4-auto','ef4-huntsteps','ef4-traininglist','ef4-combatmessage'])assert.equal(html.split('id="'+id+'"').length-1,1,id+' must not duplicate');
 assert.match(view,/\$\('worldbattle'\)\.hidden=home/);
 assert.match(view,/if\(home\)renderKingdom\(\);else\{closeKingdomLocation\(\);renderTraining\(\);?\}/);
 assert.match(css,/\.caladryn-battle-interior\{/);
 assert.match(skin,/\[data-view="battle"\]/);
});

test('World uses the art map alone; combat and Kingdom render directly beneath it',()=>{
 const html=read('game.html'),view=read('ui/views.js'),css=read('styles/world.css');
 const start=html.indexOf('<section class="page" data-view="world">');
 const world=html.slice(start,html.indexOf('<section class="page" data-view="mastery">',start));
 assert.ok(start>=0);
 for(const obsolete of ['ef4-worldinfo','ef4-maplist','ef4-worldactions']){
  assert.doesNotMatch(world,new RegExp('id="'+obsolete+'"'));
  assert.ok(!view.includes("$('"+obsolete.replace('ef4-','')+"')"),obsolete+' must not be referenced by the renderer');
 }
 assert.doesNotMatch(view,/caladryn-destination|caladryn-away-message/);
 assert.doesNotMatch(css,/\.caladryn-destinations|\.caladryn-progress/);
 assert.match(world,/id="ef4-mapregion"/);
 assert.match(world,/id="ef4-mapmarkers"/);
 assert.match(world,/data-return-home/);
 assert.match(world,/id="ef4-maptoggle" data-map-toggle/);
 assert.ok(world.indexOf('id="ef4-mapregion"')<world.indexOf('id="ef4-worldbattle"'));
 assert.ok(world.indexOf('id="ef4-worldbattle"')<world.indexOf('id="ef4-kingdominterior"'));
 assert.match(view,/if\(home\)renderKingdom\(\);else\{closeKingdomLocation\(\);renderTraining\(\);?\}/);
});

test('Map collapse restores preference, keeps return-home control and never hides combat',()=>{
 const view=read('ui/views.js'),html=read('game.html');
 const start=view.indexOf("const CALADRYN_MAP_PREFERENCE=");
 const end=view.indexOf('const CALADRYN_STOPS=[',start);
 assert.ok(start>=0&&end>start,'Map visibility helper exists');
 const source=view.slice(start,end);
 const handlerStart=view.indexOf("if(Object.prototype.hasOwnProperty.call(b.dataset,'mapToggle'))");
 const handlerEnd=view.indexOf("if(b.dataset.kingdomPoint)",handlerStart);
 assert.ok(handlerStart>=0&&handlerEnd>handlerStart);
 const handler=view.slice(handlerStart,handlerEnd);
 const saved={'emberforge-caladryn-map-collapsed':'1'};
 const region={hidden:false},attributes={},classes=new Set(),header={classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name)}};
 const button={textContent:'',setAttribute:(name,value)=>attributes[name]=value,closest:()=>header};
 const ctx={window:{localStorage:{
  getItem:key=>saved[key]||null,
  setItem:(key,value)=>{saved[key]=value}
 }},$:id=>id==='mapregion'?region:id==='maptoggle'?button:null};
 vm.createContext(ctx);
 vm.runInContext(source+'updateCaladrynMapVisibility();',ctx);
 assert.equal(region.hidden,true);
 assert.equal(button.textContent,'Show Map');
 assert.equal(attributes['aria-expanded'],'false');
 assert.ok(classes.has('map-collapsed'));
 assert.match(html,/id="ef4-returnhome" data-return-home/);
 const click='(function(){const b={dataset:{mapToggle:""}};'+handler+'})();';
 vm.runInContext(click,ctx);
 assert.equal(region.hidden,false);
 assert.equal(button.textContent,'Minimize Map');
 assert.equal(saved['emberforge-caladryn-map-collapsed'],'0');
 assert.equal(attributes['aria-expanded'],'true');
 assert.equal(classes.has('map-collapsed'),false);
 vm.runInContext(click,ctx);
 assert.equal(region.hidden,true);
 assert.equal(saved['emberforge-caladryn-map-collapsed'],'1');
 assert.doesNotMatch(source,/worldbattle/,'The toggle must not touch the combat panel');
 assert.doesNotMatch(handler,/worldbattle/);
});
