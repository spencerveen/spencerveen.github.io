'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const defs=read('data/definitions.js'),catalogs=read('data/catalogs.js'),combat=read('systems/combat.js'),format=read('core/formatting.js'),views=read('ui/views.js');
test('region loot templates grow with zone difficulty and can be reconstructed from saves',()=>{
 const begin=defs.indexOf('const regionalGearTemplate='),end=defs.indexOf('const EQUIPMENT_SLOTS=',begin);
 assert.ok(begin>=0&&end>begin);
 const compiled=new Function('realms','ASHEN_LOOT','KINGDOM_STARTER_GEAR',defs.slice(begin,end)+'return {regionalGearTemplate,validatedEquipmentCatalog}');
 const realms=[['Ashen Wilds'],['Whispering Forest'],['Frostspire Peaks'],['Obsidian Wastes'],['Celestial Rift'],['Eternal Citadel']];
 const base=[{name:'Iron Sword',slot:'mainHand',power:7,icon:'swordglow',weight:1,min:8},{name:'Iron Chestplate',slot:'chest',power:9,weight:1,min:8}];
 const {regionalGearTemplate,validatedEquipmentCatalog}=compiled(realms,base,[]);
 assert.equal(regionalGearTemplate(base[0],1).power,70);
 assert.equal(regionalGearTemplate(base[1],2).power,900);
 assert.equal(regionalGearTemplate(base[0],1).name,'Whispering Forest Iron Sword');
 const found=validatedEquipmentCatalog().get('Whispering Forest Iron Sword');
 assert.equal(found.power,70);
 assert.equal(found.slot,'mainHand');
 assert.match(format,/validatedEquipmentCatalog\(\)/);
 assert.match(format,/origin:Math\.floor\(clamp\(g\.origin\?\?0,0,5\)\)/);
});
test('first boss clear grants the next region weapon while subsequent drops use local loot',()=>{
 assert.match(combat,/const lootZone=firstBossVictory\?Math\.min\(realms\.length-1,s\.zone\+1\):s\.zone/);
 assert.match(combat,/const dropRate=\(firstBossVictory\?1:/);
 assert.match(combat,/ASHEN_LOOT\.find\(item=>item\.name==='Iron Sword'\)/);
 assert.match(combat,/regionalGearTemplate\(base,lootZone\)/);
 assert.match(combat,/createLoot\(e\.boss,firstBossVictory\)/);
 assert.doesNotMatch(combat,/if\(s\.zone!==0\)return null/);
});
test('the twelve worker tiers match the slower timed economy',()=>{
 const block=catalogs.slice(catalogs.indexOf('const workers=['),catalogs.indexOf('const upgrades=['));
 const rows=[...block.matchAll(/\['([^']+)','[^']+','[^']+',([\deE.+-]+),([\deE.+-]+),'[^']+',([\d]+)\]/g)].map(m=>({id:m[1],cost:+m[2],payout:+m[3],seconds:+m[4]}));
 assert.equal(rows.length,12);
 const expected=[.09,.6,3.5,20,110,200,750,1750,5000,10000,5000000/300,25000];
 const prices=[15,85,440,2400,12500,65000,350000,2e6,12e6,75e6,475e6,3e9];
 rows.forEach((w,i)=>{
  assert.equal(w.cost,prices[i],w.id+' starting price');
  assert.ok(Math.abs(w.payout/w.seconds-expected[i])<1e-7,w.id+' effective rate');
  assert.equal(w.seconds===1,i<5,w.id+' payout schedule');
 });
 assert.match(combat,/const WORKER_PRICE_GROWTH=1\.33;/);
 assert.match(combat,/const WORKER_MILESTONES=\[\[10,\.01\],\[25,\.01\],\[50,\.01\],\[100,\.01\]\]/);
 assert.match(combat,/function accrueWorkerEarnings\(seconds,offlineFactor=1\)/);
});
test('first Kingdom tier is affordable but still requires significant construction',()=>{
 const block=catalogs.slice(catalogs.indexOf('const buildings=['),catalogs.indexOf('const skills=['));
 const prices=[...block.matchAll(/\['[^']+','[^']+','[^']+',([\deE.+-]+),/g)].map(m=>+m[1]);
 assert.equal(prices.length,6);
 const cost=prices.reduce((n,p)=>n+p*(1+2.72+2.72*2.72),0);
 assert.ok(cost>100000&&cost<200000,'total first vista upgrades '+cost);
 assert.match(combat,/const costBuild=b=>Math\.ceil\(b\[3\]\*2\.72\*\*s\.build\[b\[0\]\]\)/);
});
test('Mastery specializations affect different outcomes and display real skill costs',()=>{
 assert.match(catalogs,/Fortune Seeker','chest','\+15% equipment drop chance per level/);
 assert.match(catalogs,/Field Commander','badge','\+8% Ember rewards from bosses per level/);
 assert.match(combat,/\(1\+\.15\*activeSkill\('fortune'\)\)/);
 assert.match(combat,/e\.boss\?\.08\*activeSkill\('veteran'\):0/);
 assert.match(views,/price=1\+Math\.floor\(rank\/2\)/);
 assert.match(read('game.html'),/data-sub="skills"[^>]*>[\s\S]*?Specializations<\/span>/);
});
