'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const combat=read('systems/combat.js');
const definitions=read('data/definitions.js');
const formatting=read('core/formatting.js');
const views=read('ui/views.js');
const html=read('game.html');
const recoveryLine=combat.split('\n').find(s=>s.startsWith('const recovery='));
const recovery=new Function('maxHealth','gearAbility',recoveryLine+' return recovery;')(()=>100,()=>0);
test('combat stops regeneration completely and resting restores half a percent per second',()=>{
 assert.equal(recovery(true),0);
 assert.equal(recovery(false),0.5);
 assert.match(recoveryLine,/fighting\?0:/);
});
test('healing potions have separate drop rates and a future merchant price',()=>{
 assert.match(definitions,/const HEALING_POTIONS=/);
 assert.match(definitions,/dropChance:0\.003/);
 assert.match(definitions,/bossDropChance:0\.008/);
 assert.match(definitions,/price:150/);
 assert.match(definitions,/heal:0\.10,maxStack:10/);
 assert.match(combat,/rollPotionDrop\(e\.boss\)/);
 assert.match(combat,/if\(s\.zone!==0\)return null;/);
});
test('consuming potions changes inventory, health and cooldown but never Ember',()=>{
 const begin=combat.indexOf("function usePotion(id='minor')");
 const end=combat.indexOf('\n\nconst costWorker=',begin);
 assert.ok(begin>=0&&end>begin);
 const s={potions:{minor:12},hp:20,potionReady:0,ember:888,combatMessage:''};
 const script=combat.slice(begin,end)+'\nreturn usePotion;';
 const usePotion=new Function('s','potionDefinition','Date','isDown','maxHealth','potionCount','activeTraining','toast','fmt','stats','save',script)(
  s,()=>({id:'minor',name:'Minor Healing Potion',heal:.10}),{now:()=>10000},
  ()=>false,()=>100,()=>s.potions.minor,()=>0,()=>{},String,()=>{},()=>{}
 );
 assert.equal(usePotion(),true);
 assert.equal(s.hp,30);
 assert.equal(s.potions.minor,11);
 assert.equal(s.ember,888);
 assert.equal(s.potionReady,28000);
 assert.equal(usePotion(),false);
 assert.equal(s.potions.minor,11);
});
test('potions share backpack capacity and are lost on Ascension',()=>{
 assert.match(definitions,/version:11,potions:\{minor:0\}/);
 assert.match(definitions,/const inventoryUsedSlots=\(\)=>s\.items\.length\+potionSlotsUsed\(\)/);
 assert.doesNotMatch(views.slice(views.indexOf('function ascend(){'),views.indexOf("root.addEventListener('click'")),/'items'|'equipped'|'potions'|'lastBossLoot'/);
 assert.match(combat,/inventoryUsedSlots\(\)>=inventoryCapacity\(\)/);
});
test('stacks of ten occupy backpack slots, with a maximum of 300 potions if empty',()=>{
 assert.match(definitions,/const INVENTORY_CAPACITY=30/);
 assert.match(definitions,/Math\.ceil\(quantity\/p\.maxStack\)/);
 assert.match(views,/const potionTiles=HEALING_POTIONS\.flatMap/);
 assert.match(combat,/stored%potion\.maxStack===0&&inventoryUsedSlots\(\)>=inventoryCapacity\(\)/);
 assert.match(formatting,/openSlots\*p\.maxStack/);
});
test('battle interface uses potions rather than paid healing',()=>{
 assert.match(html,/id="ef4-potion"[^>]*>Use Potion \(0\)/);
 assert.match(views,/Use Potion \('\+potionCount\(\)/);
 assert.doesNotMatch(combat.slice(combat.indexOf("function usePotion(id='minor')"),combat.indexOf('const costWorker=')),/s\.ember\s*[-+]=/);
 assert.match(read('core/loop.js'),/usePotion:\(id='minor'\)=>usePotion\(id\)/);
});
