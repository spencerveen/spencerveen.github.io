import assert from "node:assert/strict";
import {fishSites,fishHabitat,normalizeFishCatches,FISH_STAMINA_COST} from "../js/fishing.js";
import {coastlineX} from "../js/ocean-generation.js";
import {waterAt} from "../js/water-generation.js";
import {CHUNK_SIZE} from "../js/forest-generation.js";
import {GameState} from "../js/state.js";
import {SURVIVAL} from "../js/survival.js";
import {LEGACY_HOME} from "../js/stockpile.js";
const mem=new Map();
globalThis.localStorage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
assert(!fishHabitat({kind:"land",depth:1}));
assert(!fishHabitat({kind:"ocean",depth:4,shore:70}));
for(const kind of ["river","lake","ocean"])
 assert(fishHabitat({kind,depth:1,shore:8}));
const sample=kind=>()=>({kind,depth:.8,shore:7,surfaceY:1.2});
for(const kind of ["river","lake","ocean"]){
 const result=fishSites(12000,3,-2,sample(kind));
 assert.equal(result.length,2,"two visible fish per suitable chunk");
 assert.deepEqual(result,fishSites(12000,3,-2,sample(kind)),"fish are seed-stable");
 for(const f of result){
  assert(f.id.startsWith("fish:3,-2:"));
  assert.equal(f.kind,kind);
  assert(f.x>=3*CHUNK_SIZE&&f.x<4*CHUNK_SIZE);
  assert(f.z>=-2*CHUNK_SIZE&&f.z<-1*CHUNK_SIZE);
 }
}
assert.equal(fishSites(12000,0,0,()=>({kind:"land",depth:0})).length,0);
const coast=coastlineX(0,12000);
let oceanFish=0;
for(let cx=Math.floor((coast-16)/CHUNK_SIZE);cx<=Math.floor((coast+35)/CHUNK_SIZE);cx++)
 for(let cz=-1;cz<=1;cz++)
  for(const f of fishSites(12000,cx,cz,(x,z)=>waterAt(x,z,12000))){
   assert(fishHabitat(waterAt(f.x,f.z,12000)));
   if(f.kind==="ocean")oceanFish++;
  }
assert(oceanFish>0,"real shoreline generates fish");
assert.deepEqual(normalizeFishCatches({"fish:1,-2:0":true,"fish:1,-2:1":false,noise:true}),
 {"fish:1,-2:0":true});
const g=new GameState({slot:1,newGame:true});g.onChange=()=>{};
const site=fishSites(12000,2,2,sample("lake"))[0];
assert(!g.catchFish(site).ok,"no spear cannot catch fish");
g.data.equipment.weapon="stone_spear";g.data.weaponCondition=2;
g.data.survival.stamina=7;
assert(!g.catchFish(site).ok,"insufficient stamina blocks catch");
g.data.survival.stamina=100;
g.data.inventory=Array.from({length:10},()=>({id:"stone",qty:12}));
const snapshot=JSON.stringify(g.data);
assert(!g.catchFish(site).ok,"full backpack blocks catch");
assert.equal(JSON.stringify(g.data),snapshot,"failed catch is free");
g.data.inventory[0]=null;
assert(g.catchFish(site).ok);
assert.equal(g.fishCaught(site.id),true);
assert.equal(g.inventoryCount("fish_meat"),1);
assert.equal(g.data.weaponCondition,1);
assert.equal(g.data.survival.stamina,100-FISH_STAMINA_COST*SURVIVAL.staminaCostMultiplier);
assert(g.data.skills.fishing>0);
assert(!g.catchFish(site).ok,"cannot catch again");
g.save();
const reloaded=new GameState({slot:1});
assert(reloaded.fishCaught(site.id));
assert.equal(reloaded.data.weaponCondition,1);
const second=fishSites(12000,2,2,sample("lake"))[1];
assert(reloaded.catchFish(second).ok);
assert.equal(reloaded.data.equipment.weapon,null,"last hit breaks spear");
assert.equal(reloaded.inventoryCount("fish_meat"),2);
assert(!reloaded.eatFood("fish_meat"),"raw fish not edible");
assert(reloaded.foundStockpile(LEGACY_HOME.x,LEGACY_HOME.z));
reloaded.data.technologies.push("fire");
const hx=LEGACY_HOME.x+4,hz=LEGACY_HOME.z+4;
reloaded.data.village.buildings.push({id:"building_1",kind:"hearth",x:hx,z:hz,turn:0});
reloaded.data.village.stockpile.items.wood=1;
assert(reloaded.cookRecipe("cooked_fish",hx,hz).ok);
assert.equal(reloaded.inventoryCount("fish_meat"),0);
assert.equal(reloaded.inventoryCount("cooked_fish"),2);
reloaded.data.survival.hunger=15;reloaded.data.survival.stamina=10;reloaded.data.survival.health=70;
assert.equal(reloaded.quickEat(),"cooked_fish");
assert.equal(reloaded.data.survival.hunger,46);
assert.equal(reloaded.data.survival.stamina,28);
assert.equal(reloaded.data.survival.health,74);
reloaded.save();
const restored=new GameState({slot:1});
assert(restored.fishCaught(site.id)&&restored.fishCaught(second.id));
assert.equal(restored.inventoryCount("cooked_fish"),1);
console.log("PASS fishing: real/synthetic habitats, seed stability, stamina, spear wear, inventory, cooked fish and persistence");
