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
test('worker price-to-income ratios remain gradual across all twelve tiers',()=>{
 const block=catalogs.slice(catalogs.indexOf('const workers=['),catalogs.indexOf('const upgrades=['));
 const rows=[...block.matchAll(/\['[^']+','[^']+','[^']+',([\deE.+-]+),([\deE.+-]+),/g)].map(m=>[+m[1],+m[2]]);
 assert.equal(rows.length,12);
 for(const [price,rate] of rows)assert.ok(price/rate>=40&&price/rate<=90,'worker payback '+price+'/'+rate);
 assert.match(combat,/const WORKER_MILESTONES=\[\[10,\.05\],\[25,\.10\],\[50,\.15\],\[100,\.20\]\]/);
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
 assert.match(views,/\$\{1\+Math\.floor\(rank\/2\)\} SP/);
 assert.match(read('game.html'),/>Specializations<\/button>/);
});
