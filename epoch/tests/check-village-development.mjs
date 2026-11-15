import assert from "node:assert/strict";
import {GameState} from "../js/state.js";
import {STOCKPILE_CAPACITY,stockpileCapacity,stockpileSpace,stockpileUsed,
 normalStockpile} from "../js/stockpile.js";
import {normalizeBuildings} from "../js/village-placement.js";
import {housingUnits} from "../js/residents.js";
import {prepareCooking} from "../js/cooking.js";
import {emptyInventory} from "../js/inventory.js";
import {VILLAGE_UPGRADES,structureLevel,stockpileLevel,
 workerGatherDurationMultiplier,workshopKnowledgeMultiplier,
 councilYearCulture,hearthExtraServing} from "../js/village-development.js";

const memory=new Map();
globalThis.localStorage={
 getItem:key=>memory.get(key)||null,
 setItem:(key,value)=>memory.set(key,String(value)),
 removeItem:key=>memory.delete(key)
};
assert.equal(STOCKPILE_CAPACITY,480);
assert.equal(stockpileCapacity(normalStockpile({x:0,z:8,items:{}})),480);
assert.equal(stockpileCapacity(normalStockpile({x:0,z:8,level:2,items:{}})),720);
assert.equal(stockpileLevel({level:999}),2,"upgrades are bounded");
assert.equal(structureLevel({level:999}),2);
assert.equal(structureLevel({level:-1}),1);
assert.equal(normalizeBuildings([{id:"old",kind:"family",x:8,z:8}])[0].level,1,
 "legacy buildings receive a safe level-one default");
assert.equal(normalizeBuildings([{id:"x",kind:"family",x:8,z:8,level:2}])[0].level,2);

const state=new GameState({slot:1,newGame:true});
state.onChange=()=>{};
state.onVillagerNeeds=()=>{};
state.devCheats.unlimitedHealth=true;
state.devCheats.unlimitedHunger=true;
assert(state.foundStockpile(0,8));
let pile=state.data.village.stockpile;
assert.equal(pile.level,1);
assert.equal(state.stockpileInfo().capacity,480);
const base=g=>g.data.village.buildings.map(b=>b.id);
assert.equal(state.upgradeVillage("missing",0,8).ok,false);
assert.equal(state.upgradeVillage("stockpile",100,100).ok,false);
pile.items.wood=190;pile.items.stone=180;pile.items.vines=20;
pile.items.flint=5;pile.items.animal_meat=8;pile.items.berries=12;
state.data.technologies.push("fire");
const buildings=[
 ["family",10,8],["hearth",-10,8],["lore",0,19],["council",0,-8]
].map(([kind,x,z])=>{
 const placed=state.placeVillageBuilding(kind,x,z,0);
 assert(placed.ok,kind+" should be buildable: "+placed.reason);
 return placed.building;
});
assert.equal(buildings.length,4);
assert.equal(state.villageCapacity(),8,"level-one Hut adds three residents");
assert.equal(housingUnits(state.data.village).find(h=>h.id===buildings[0].id).capacity,3);
assert.equal(workshopKnowledgeMultiplier(state.data.village),1);
assert.equal(workerGatherDurationMultiplier(state.data.village),1);
assert.equal(hearthExtraServing(state.data.village),0);
assert.equal(councilYearCulture(state.data.village),0);
const beforeNoop=JSON.stringify(pile.items);
assert.equal(state.upgradeVillage("missing",0,8).ok,false);
assert.equal(JSON.stringify(pile.items),beforeNoop,"invalid target doesn't consume materials");
pile.items.vines=0;
assert.equal(state.canUpgradeVillage("stockpile",0,8).ok,false);
assert.equal(state.upgradeVillage("stockpile",0,8).ok,false);
assert.equal(state.stockpileInfo().capacity,480);
pile.items.vines=20;

function improve(id,kind){
 const cost=VILLAGE_UPGRADES[kind].cost;
 const before={...pile.items};
 const levelBefore=id==="stockpile"?pile.level:buildings.find(b=>b.id===id).level;
 assert.equal(levelBefore,1);
 const ready=state.canUpgradeVillage(id,0,8);
 assert(ready.ok,id+" purchase should be possible: "+ready.reason);
 const upgraded=state.upgradeVillage(id,0,8);
 assert(upgraded.ok,id+" purchase failed: "+upgraded.reason);
 assert.equal(upgraded.level,2);
 for(const [item,qty] of Object.entries(cost))
  assert.equal(pile.items[item],before[item]-qty,"exactly the upgrade cost must be paid");
 const second=JSON.stringify(pile.items);
 assert.equal(state.upgradeVillage(id,0,8).ok,false,"improvement is one-time only");
 assert.equal(JSON.stringify(pile.items),second,"cannot double-charge an upgrade");
}
improve("stockpile","stockpile");
assert.equal(stockpileCapacity(pile),720);
assert.equal(state.stockpileInfo().capacity,720);
const extraRoom=720-stockpileUsed(pile);
assert(extraRoom>240,"store has actual larger capacity");
improve(buildings[0].id,"family");
assert.equal(state.villageCapacity(),10,"improved Hut really increases recruitment capacity");
assert.equal(state.villageHousing().find(h=>h.id===buildings[0].id).capacity,5);
improve(buildings[1].id,"hearth");
assert.equal(hearthExtraServing(state.data.village),1);
const supplies={...pile.items};
const preview=prepareCooking("roasted_meat",emptyInventory(),pile,1);
assert(preview.ok&&preview.outputQty===3);
assert.equal(preview.supplies.animal_meat,supplies.animal_meat-2);
assert.equal(preview.supplies.wood,supplies.wood-1);
const beforeCook=state.inventoryCount("cooked_meat");
const cooked=state.cookRecipe("roasted_meat",-10,8);
assert(cooked.ok,"a built, researched hearth actually cooks");
assert.equal(cooked.qty,3);
assert.equal(state.inventoryCount("cooked_meat"),beforeCook+3);
assert.equal(pile.items.animal_meat,supplies.animal_meat-2);
assert.equal(pile.items.wood,supplies.wood-1);
const recipeMissing=prepareCooking("roasted_meat",emptyInventory(),
 {items:{animal_meat:0,wood:99}},1);
assert.equal(recipeMissing.ok,false,"improvements cannot fabricate ingredients");
improve(buildings[2].id,"lore");
assert.equal(workerGatherDurationMultiplier(state.data.village),.8);
assert.equal(workshopKnowledgeMultiplier(state.data.village),1.5);
const researchBefore=state.data.knowledge;
state.data.researchSeconds=0;
for(let i=0;i<8;i++)state.advance(5); // 40 real seconds at 1.5x = 60 research seconds
assert.equal(state.data.knowledge,researchBefore+1,
 "the workshop bonus applies to real research production");
improve(buildings[3].id,"council");
assert.equal(councilYearCulture(state.data.village),2);
const cultureBefore=state.data.culture,yearBefore=state.data.year;
state.data.calendarProgress=1-1/432;
state.advance(1);
assert.equal(state.data.year,yearBefore+1);
assert.equal(state.data.culture,cultureBefore+2,
 "upgraded council produces Culture on actual yearly rollover");
assert.equal(state.villageDevelopment().culturePerYear,2);
assert.equal(state.villageDevelopment().bonusCooking,1);
assert.equal(state.villageDevelopment().housing,10);
assert.equal(state.villageDevelopment().storage,720);

pile.items.stone=720-stockpileUsed(pile)+pile.items.stone;
assert.equal(stockpileUsed(pile),720);
assert.equal(stockpileSpace(pile),0);
state.save();
const reload=new GameState({slot:1});
assert.equal(reload.stockpileInfo().capacity,720);
assert.equal(stockpileSpace(reload.data.village.stockpile),0);
assert(reload.data.village.buildings.every(b=>b.level===2),"building levels survive reload");
assert.equal(reload.villageCapacity(),10);
assert.equal(reload.villageDevelopment().knowledgeMultiplier,1.5);
assert.equal(reload.villageDevelopment().culturePerYear,2);
assert.equal(reload.villageDevelopment().bonusCooking,1);
assert.equal(reload.upgradeVillage(buildings[0].id,0,8).ok,false);
assert.equal(reload.upgradeVillage("stockpile",0,8).ok,false);
console.log("PASS 6D: housing, storage, workshop, hearth, council, atomic one-time costs and persistence");
