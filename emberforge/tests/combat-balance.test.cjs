'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../systems/combat.js'),'utf8');
const definition=key=>{
 const line=src.split('\n').find(line=>line.startsWith('const '+key+'='));
 assert.ok(line,'Missing formula: '+key);
 return line;
};
const formula=[
 'const combatClamp=(n,a,b)=>Math.max(a,Math.min(b,n));',
 ...['maxHealth','defense','recovery','power','playerCritChance','enemyHitChance','blockChance','blockReduction'].map(definition),
 src.slice(src.indexOf('const playerHitChance='),src.indexOf('const enemyHitChance=')),
 'return {maxHealth,defense,recovery,power,playerCritChance,enemyHitChance,blockChance,blockReduction,playerHitChance};'
].join('\n');
const evaluate=(level,items={})=>new Function('s','gearPower','gearTotal','gearAbility','activeTraining','equippedItem',formula)(
 {combatLevel:level},
 slot=>items[slot]?.power||0,
 slots=>slots.reduce((n,slot)=>n+(items[slot]?.power||0),0),
 ability=>Object.values(items).reduce((n,item)=>n+(item.ability===ability?item.abilityValue||0:0),0),
 ()=>0,
 slot=>items[slot]||null
);
const mite={stage:1,zone:0,trait:'Standard',boss:false};
test('combat levels only increase health, never attack, accuracy, criticals, defense or evasion',()=>{
 const early=evaluate(1),late=evaluate(30);
 assert.equal(early.maxHealth(),105);
 assert.ok(late.maxHealth()>early.maxHealth());
 for(const key of ['power','defense','playerCritChance','blockChance'])assert.equal(early[key](),late[key](),key);
 assert.equal(early.playerHitChance(mite),late.playerHitChance(mite));
 assert.equal(early.enemyHitChance(mite),late.enemyHitChance(mite));
});
test('equipment improves attack, accuracy, criticals, defense, evasion, block and recovery',()=>{
 const empty=evaluate(1);
 const geared=evaluate(1,{
 mainHand:{slot:'mainHand',power:3},
 offHand:{slot:'offHand',power:2},
 boots:{slot:'boots',power:1},
 charm:{slot:'charm',ability:'regen',abilityValue:.00025}
 });
 assert.equal(empty.playerHitChance(mite),.30);
 assert.equal(empty.blockChance(),0);
 assert.ok(geared.power()>empty.power());
 assert.ok(geared.playerHitChance(mite)>empty.playerHitChance(mite));
 assert.ok(geared.playerCritChance()>empty.playerCritChance());
 assert.ok(geared.defense()>empty.defense());
 assert.ok(geared.enemyHitChance(mite)<empty.enemyHitChance(mite));
 assert.ok(geared.blockChance()>empty.blockChance());
 assert.equal(geared.recovery(true),0); // No in-combat regeneration, even with vitality gear.
 assert.ok(geared.recovery(false)>empty.recovery(false));
});
test('iron shield blocks better than rusty shield',()=>{
 const rusty=evaluate(1,{offHand:{slot:'offHand',power:2}});
 const iron=evaluate(1,{offHand:{slot:'offHand',power:5}});
 assert.ok(iron.blockChance()>rusty.blockChance());
 assert.ok(iron.blockReduction()>rusty.blockReduction());
});
test('forge click power and soul multipliers no longer influence direct combat damage',()=>{
 assert.doesNotMatch(definition('power'),/clicks\(|soulfactor\(|combatLevel|activeBuild|activeTraining|multiplier/);
 assert.match(definition('power'),/gearPower\('mainHand'\)/);
});
