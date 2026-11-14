import assert from "node:assert/strict";
import {BUILDINGS,PLOTS,capacity} from "../js/settlement.js";
import {LEGACY_HOME,VILLAGE_RADIUS} from "../js/stockpile.js";
import {normalizeBuildings,placementCheck,choosePlacement,footprint} from "../js/village-placement.js";
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const {GameState}=await import("../js/state.js");
const world={groundY:()=>.18,obstacles:[]};
const state=new GameState();
const village=state.data.village;
assert.equal(village.stockpile,null,"fresh character has no stockpile");
assert.deepEqual(village.buildings,[],"fresh character has no preset structures");
assert.equal(state.foundStockpile(LEGACY_HOME.x,LEGACY_HOME.z),true);
assert.deepEqual(state.data.village.buildings,[],"founding stockpile does not auto-create building plots");
assert.equal(state.villageCapacity(),5);
assert.equal(placementCheck({village,world,kind:"family",x:-2,z:-8}).ok,false,"stockpile footprint protected");
assert.equal(placementCheck({village,world,kind:"family",x:LEGACY_HOME.x+40,z:LEGACY_HOME.z}).ok,false,"outside village boundary");
assert.equal(placementCheck({village,world,kind:"family",x:-10,z:4}).ok,true,"good empty grid site");
world.obstacles.push({x:-10,z:4,r:.75});
assert.equal(placementCheck({village,world,kind:"family",x:-10,z:4}).ok,false,"tree obstructs selected site");
world.obstacles.length=0;
world.groundY=x=>x>=-8?1.5:0;
assert.equal(placementCheck({village,world,kind:"family",x:-10,z:4}).ok,false,"steep ground blocks construction");
world.groundY=()=>.18;
const candidate=choosePlacement(village,world,"family");
assert(candidate?.ok,"auto-select available ground for placement");
assert.equal(candidate.x%2,0,"building snaps to 2m grid");
assert.equal(candidate.z%2,0);
assert.equal(state.canPlaceVillageBuilding("family",candidate.x,candidate.z,0,world).ok,false,"must deposit wood and stone first");
for(const [id,n] of Object.entries({wood:70,stone:40})){
 assert.equal(state.addResource(id,n),n);
}
assert.equal(state.depositAllToStockpile(LEGACY_HOME.x,LEGACY_HOME.z),110);
const first=state.placeVillageBuilding("family",-10,4,1,world);
assert(first.ok,"build a Family Hut at chosen position");
assert.equal(first.building.x,-10);
assert.equal(first.building.z,4);
assert.equal(first.building.turn,1);
assert.equal(state.villageCapacity(),8);
assert.equal(state.data.village.buildings.length,1);
assert.equal(state.stockpileInfo().items.wood,60);
assert.equal(state.stockpileInfo().items.stone,34);
assert.equal(placementCheck({village:state.data.village,world,kind:"family",x:-10,z:4}).ok,false,"cannot overlap constructed hut");
const second=state.placeVillageBuilding("family",12,-10,2,world);
assert(second.ok,"can add more homes anywhere clear in village radius");
assert.notEqual(second.building.id,first.building.id,"each home has a distinct saved ID");
assert.equal(state.villageCapacity(),11);
assert.equal(state.data.village.buildings.length,2);
assert(state.data.village.buildings.every(b=>b.x!==-8||b.z!==4),"no ghost starter plot is used");
assert.equal(state.placeVillageBuilding("hearth",4,-4,0,world).ok,false,"must research Control of Fire");
state.data.technologies.push("fire");
const hearth=state.placeVillageBuilding("hearth",4,-4,3,world);
assert(hearth.ok,"Cooking Hearth can be positioned independently");
assert.equal(state.placeVillageBuilding("hearth",-12,-8,0,world).ok,false,"only one hearth per village");
assert.equal(state.data.village.buildings.length,3);
assert.equal(state.stockpileInfo().items.wood,44);
assert.equal(state.stockpileInfo().items.stone,23);
state.save();
const reload=new GameState();
assert.deepEqual(reload.data.village.buildings,state.data.village.buildings,"building coordinates survive reload");
assert.equal(reload.villageCapacity(),11,"two Family Huts keep +6 capacity");
reload.nextGeneration();
assert.deepEqual(reload.data.village.buildings,state.data.village.buildings,"descendants inherit same village layout");
assert.equal(reload.villageCapacity(),11);
const legacy={
 version:1,hero:{name:"Legacy founder",age:30},
 village:{plots:{family_1:"family",hearth_1:"hearth"},population:5,
 stockpile:{x:LEGACY_HOME.x,z:LEGACY_HOME.z,items:{wood:12,stone:12}}},
 technologies:["fire"],resources:{wood:10,stone:3}
};
memory.set("epoch.stoneage.v1",JSON.stringify(legacy));
const imported=new GameState();
const oldFamily=imported.data.village.buildings.find(b=>b.id==="family_1");
const oldHearth=imported.data.village.buildings.find(b=>b.id==="hearth_1");
assert(oldFamily&&oldHearth);
assert.deepEqual({x:oldFamily.x,z:oldFamily.z},{x:PLOTS[0].x,z:PLOTS[0].z},
 "existing Family Hut retains exact coordinates, even when off the new snap grid");
assert.deepEqual({x:oldHearth.x,z:oldHearth.z},{x:PLOTS[2].x,z:PLOTS[2].z});
const beforeMigration=JSON.stringify(imported.data.village.buildings);
imported.save();
const again=new GameState();
assert.equal(JSON.stringify(again.data.village.buildings),beforeMigration,"migration does not double-create old structures");
assert.equal(again.villageCapacity(),8);
console.log("PASS village free grid: no preset markers, 2m snap, arbitrary houses, unique hearth, costs, collisions, saves, inherited buildings and exact legacy migration");
