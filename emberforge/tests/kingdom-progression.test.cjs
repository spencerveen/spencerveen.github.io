'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const views=read('ui/views.js'),defs=read('data/definitions.js'),html=read('game.html');
const rules=views.slice(views.indexOf('const KINGDOM_VISTA_MILESTONES='),views.indexOf('function renderKingdom(){'));
const buildingCapLine=defs.split('\n').find(x=>x.startsWith('const buildingCap='));
const buildings=Array.from({length:6},(_,i)=>['building'+i]);
const eligible=(level,ascensions)=>new Function('s','buildings',rules+'return earnedKingdomVista();')(
 {ascensions,build:Object.fromEntries(buildings.map(b=>[b[0],level]))},buildings
);
test('Six Kingdom stages unlock only after every structure reaches its threshold',()=>{
 assert.equal(eligible(0,0),0);
 assert.equal(eligible(2,0),0);
 assert.equal(eligible(3,0),1);
 assert.equal(eligible(6,0),1);
 assert.equal(eligible(6,1),2);
 assert.equal(eligible(9,1),2);
 assert.equal(eligible(9,2),3);
 assert.equal(eligible(11,3),4);
 assert.equal(eligible(12,4),5);
 const fn=new Function('s','buildings',rules+'return earnedKingdomVista();');
 const partial={ascensions:4,build:Object.fromEntries(buildings.map(b=>[b[0],12]))};
 partial.build[buildings[0][0]]=11;
 assert.equal(fn(partial,buildings),4);
});
test('all six buildings unlock during the first era so the first vista is achievable',()=>{
 const gates=defs.slice(defs.indexOf('const GATE_BUILDINGS=['),defs.indexOf('const upgradeReq'));
 for(const id of ['mine','barracks','library','roost','watchtower','vault']){
  assert.match(gates,new RegExp("\\['"+id+"',0,\\d+\\]"));
 }
});
test('Building level cap expands by three each ascension and stops at twelve',()=>{
 assert.ok(buildingCapLine);
 const cap=new Function('s',buildingCapLine+'return buildingCap();');
 assert.deepEqual([0,1,2,3,4,5].map(ascensions=>cap({ascensions})),[3,6,9,12,12,12]);
});
test('Kingdom vista is automatic and manual previews are unavailable',()=>{
 assert.doesNotMatch(html,/data-vista="prev"|data-vista="next"|data-vista="auto"/);
 assert.match(views,/kingdomVistaPreview=Math\.min\(KINGDOM_VISTAS\.length-1,earned\)/);
 assert.doesNotMatch(views,/if\(b\.dataset\.vista\)/);
 assert.match(views,/if\(earned>\(s\.kingdomVistaMilestone\|\|0\)\)/);
 assert.match(views,/'kingdomVistaMilestone'/);
});
