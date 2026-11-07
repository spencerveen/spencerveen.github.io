'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const views=read('ui/views.js'),defs=read('data/definitions.js'),html=read('game.html'),format=read('core/formatting.js');
const merchantMethods=views.slice(views.indexOf('function buyMerchantGear('),views.indexOf('function renderGear(){'));
function merchantHarness({ember=1000,gear=0,potions=0,bosses=0}={}){
 const s={ember,items:Array.from({length:gear},(_,i)=>({id:'g'+i})),potions:{minor:potions},bosses,journal:[]};
 const stock=[
  {name:'Starter Sword',slot:'mainHand',power:2,price:180,icon:'swordglow'},
  {name:"Traveler's Blade",slot:'mainHand',power:16,price:1800,bosses:1,icon:'swordglow'}
 ];
 const pot={id:'minor',price:150,maxStack:10,name:'Minor Healing Potion'};
 const catalog=new Map(stock.map(x=>[x.name,x]));
 let saved=0;
 const context={s,MERCHANT_GEAR_BY_NAME:catalog,potionDefinition:()=>pot,kingdomBossTier:()=>s.bosses,
  atKingdom:()=>true,inventoryCapacity:()=>30,
  inventoryUsedSlots:()=>s.items.length+Math.ceil(s.potions.minor/10),
  potionCount:()=>s.potions.minor,
  note:()=>{},toast:()=>{},save:()=>{saved++},renderGear:()=>{},renderKingdomMerchant:()=>{},currencyStats:()=>{},
  gain:n=>{s.ember+=n},Date:{now:()=>1000},Math
 };
 const methods=new Function(...Object.keys(context),merchantMethods+'return {buyMerchantGear,buyMerchantPotion,sellMerchantPotion};')(...Object.values(context));
 return {s,methods,get saved(){return saved}};
}
test('Kingdom merchant offers purchasable starter gear and healing supplies',()=>{
 assert.match(html,/id="ef4-merchantstock"/);
 assert.match(views,/data-merchant-gear/);
 assert.match(views,/data-merchant-potion/);
 assert.match(views,/data-merchant-sell-potion/);
 assert.match(defs,/const KINGDOM_STARTER_GEAR=/);
 assert.match(format,/validatedEquipmentCatalog\(\)/);
});
test('Gear purchase deducts Ember, adds a persistent equippable item, and prevents overflow',()=>{
 const {s,methods}=merchantHarness();
 assert.equal(methods.buyMerchantGear('Starter Sword'),true);
 assert.equal(s.ember,820);
 assert.equal(s.items.length,1);
 assert.equal(s.items[0].slot,'mainHand');
 assert.equal(s.items[0].power,2);
 assert.equal(s.items[0].rarity,'common');
 const full=merchantHarness({gear:30});
 assert.equal(full.methods.buyMerchantGear('Starter Sword'),false);
 assert.equal(full.s.ember,1000);
});
test('Only customers who defeated the first boss may purchase the Traveler blade',()=>{
 const before=merchantHarness({bosses:0});
 assert.equal(before.methods.buyMerchantGear("Traveler's Blade"),false);
 const after=merchantHarness({ember:2000,bosses:1});
 assert.equal(after.methods.buyMerchantGear("Traveler's Blade"),true);
 assert.equal(after.s.items[0].power,16);
 assert.equal(after.s.ember,200);
});
test('Potions fill partial stacks and require new backpack slots after each ten',()=>{
 const partial=merchantHarness({gear:29,potions:9});
 assert.equal(partial.methods.buyMerchantPotion('minor'),true);
 assert.equal(partial.s.potions.minor,10);
 assert.equal(partial.methods.buyMerchantPotion('minor'),false);
 assert.equal(partial.s.potions.minor,10);
 const full=merchantHarness({gear:30,potions:0});
 assert.equal(full.methods.buyMerchantPotion('minor'),false);
});
test('Merchant potion buyback frees a slot and grants a reduced price',()=>{
 const {s,methods}=merchantHarness({potions:11});
 assert.equal(methods.sellMerchantPotion('minor'),true);
 assert.equal(s.potions.minor,10);
 assert.equal(s.ember,1037);
});
test('Old salvage controls remain absent and the blacksmith requires the first boss',()=>{
 assert.doesNotMatch(html,/data-action="salvage-|ef4-salvagefilter|Salvage All/);
 assert.match(html,/id="ef4-craftsman"[^>]*hidden/);
 assert.match(views,/\$\('craftsman'\)\.hidden=!bossClearedAt\(0\)/);
 assert.doesNotMatch(views,/if\(a==='salvage-all'\)/);
});
