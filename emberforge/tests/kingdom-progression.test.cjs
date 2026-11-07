'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const views=read('ui/views.js'),defs=read('data/definitions.js'),html=read('game.html'),combat=read('systems/combat.js');
const rules=views.slice(views.indexOf('const KINGDOM_VISTA_MILESTONES='),views.indexOf('function renderKingdom(){'));
const buildings=Array.from({length:6},(_,i)=>['building'+i]);
const earn=new Function('s','buildings','bossClearedAt',rules+'return earnedKingdomVista();');
const vista=(level,bosses=0,earned=0)=>{
 const s={kingdomVistaMilestone:earned,build:Object.fromEntries(buildings.map(b=>[b[0],level]))};
 return earn(s,buildings,i=>i<bosses);
};
test('landscapes require all six buildings at their old cap AND the area boss defeated',()=>{
 assert.equal(vista(3,0),0);
 assert.equal(vista(2,1),0);
 assert.equal(vista(3,1),1);
 assert.equal(vista(6,1),1);
 assert.equal(vista(6,2),2);
 assert.equal(vista(9,3),3);
 assert.equal(vista(11,4),4);
 assert.equal(vista(12,5),5);
 const s={kingdomVistaMilestone:4,build:Object.fromEntries(buildings.map(b=>[b[0],12]))};
 s.build[buildings[0][0]]=11;
 assert.equal(earn(s,buildings,i=>i<5),4);
});
test('saved scenery remains after resetting buildings during Ascension',()=>{
 assert.equal(vista(0,5,3),3);
 assert.match(views,/'kingdomVistaMilestone'/);
});
test('building cap increases when bosses are cleared, never from Ascension',()=>{
 const line=defs.split('\n').find(x=>x.startsWith('const buildingCap='));
 const cap=new Function('KINGDOM_BUILDING_CAPS','kingdomBossTier',line+'return buildingCap();');
 assert.deepEqual([0,1,2,3,4,5,6].map(n=>cap([3,6,9,11,12],()=>Math.min(5,n))),[3,6,9,11,12,12,12]);
 assert.doesNotMatch(line,/ascensions/);
});
test('all six Kingdom structures are available without boss victories',()=>{
 const gates=defs.slice(defs.indexOf('const GATE_BUILDINGS=['),defs.indexOf('const upgradeReq'));
 for(const id of ['mine','barracks','library','roost','watchtower','vault'])
  assert.match(gates,new RegExp("\\['"+id+"',0,1\\]"));
});
test('world and workers gate their progression behind first-time boss clears',()=>{
 assert.match(defs,/const realmAccessible=i=>/);
 assert.match(defs,/i===0\|\|bossClearedAt\(i-1\)/);
 assert.match(defs,/const workerUnlocked=w=>.*kingdomBossTier\(\)>=g\[1\]/);
 assert.match(defs,/const upgradeUnlocked = u =>.*kingdomBossTier\(\)>=g\[1\]/);
 assert.match(defs,/const trainingCap=.*kingdomBossTier\(\)/);
 assert.match(defs,/const skillCap=.*kingdomBossTier\(\)/);
 assert.match(combat,/firstBossVictory=e\.boss&&!bossClearedAt\(s\.zone\)/);
 assert.match(combat,/if\(firstBossVictory&&s\.zone===s\.unlocked/);
});
test('Kingdom vistas are earned automatically without manual preview controls',()=>{
 assert.doesNotMatch(html,/data-vista="prev"|data-vista="next"|data-vista="auto"/);
 assert.match(views,/kingdomVistaPreview=Math\.min\(KINGDOM_VISTAS\.length-1,earned\)/);
 assert.doesNotMatch(views,/if\(b\.dataset\.vista\)/);
});
