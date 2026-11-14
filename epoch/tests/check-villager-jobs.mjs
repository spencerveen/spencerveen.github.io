import assert from "node:assert/strict";
import {GameState} from "../js/state.js";
import {legacyResidents,normalizeResidents} from "../js/residents.js";
import {forestObjects} from "../js/forest-generation.js";
import {VILLAGER_JOBS,findVillagerWork} from "../js/villager-jobs.js";
import {STOCKPILE_CAPACITY,stockpileUsed} from "../js/stockpile.js";
const records=new Map();
globalThis.localStorage={
 getItem:key=>records.get(key)||null,
 setItem:(key,value)=>records.set(key,value),
 removeItem:key=>records.delete(key)
};
const g=new GameState({slot:1,newGame:true});
g.onChange=()=>{};
assert(g.foundStockpile(0,8));
g.data.village.residents=normalizeResidents(legacyResidents(2));
g.data.village.population=3;
assert.equal(g.data.village.residents[0].job,"idle","legacy villagers start unassigned");
assert(!g.assignResidentJob("legacy:resident:0","dragon-rider"),"unknown jobs are rejected");
assert(!g.assignResidentJob("legacy:resident:0","idle"),"unchanged jobs do nothing");
assert(g.assignResidentJob("legacy:resident:0","woodcutter"));
assert.equal(g.data.village.residents[0].job,"woodcutter");
assert(g.data.village.residents[0].memories.some(m=>m.text.includes("woodcutter")));
const sample=forestObjects(g.data.worldSeed,0,0).find(p=>p.resource==="wood");
assert(sample,"a real seeded tree should be present");
const task={id:sample.id,kind:"resource",resource:"wood",job:"woodcutter"};
assert.equal(g.completeVillagerWork("legacy:resident:1",task).ok,false,
 "a villager cannot deliver for a different assignment");
assert.equal(g.completeVillagerWork("legacy:resident:0",{...task,job:"forager"}).ok,false);
assert.equal(g.completeVillagerWork("legacy:resident:0",task).ok,true);
assert.equal(g.stockpileInfo().items.wood,2,"worker deposits real wood, not backpack items");
assert.equal(g.inventoryCount("wood"),0);
assert.equal(g.resourceStatus(sample).remaining,10);
for(let i=0;i<5;i++)assert(g.completeVillagerWork("legacy:resident:0",task).ok);
assert(g.resourceStatus(sample).removed,"finite trees disappear after enough worker visits");
assert.equal(g.completeVillagerWork("legacy:resident:0",task).ok,false,
 "no double-harvest on a depleted tree");
assert.equal(g.stockpileInfo().items.wood,12);
assert(g.assignResidentJob("legacy:resident:1","forager"));
const bush=forestObjects(g.data.worldSeed,0,0).find(p=>p.resource==="food");
assert(bush);
assert(g.completeVillagerWork("legacy:resident:1",
 {id:bush.id,kind:"resource",resource:"food",job:"forager"}).ok);
assert.equal(g.stockpileInfo().items.berries,2);
assert(g.assignResidentJob("legacy:resident:1","fisher"));
const fish={id:"fish:0,0:0",kind:"fish",job:"fisher"};
assert(g.completeVillagerWork("legacy:resident:1",fish).ok);
assert.equal(g.stockpileInfo().items.fish_meat,1);
assert.equal(g.completeVillagerWork("legacy:resident:1",fish).ok,false,
 "caught fish are never duplicated");
assert(g.assignResidentJob("legacy:resident:0","hunter"));
const deer={id:"wildlife:0,0:deer",kind:"hunt",job:"hunter",species:"deer"};
assert(g.completeVillagerWork("legacy:resident:0",deer).ok);
assert.equal(g.stockpileInfo().items.animal_meat,3);
assert.equal(g.stockpileInfo().items.fur,2);
assert.equal(g.stockpileInfo().items.raw_hide,1);
assert.equal(g.completeVillagerWork("legacy:resident:0",deer).ok,false);
g.save();
const loaded=new GameState({slot:1});
assert.equal(loaded.data.village.residents[0].job,"hunter");
assert.equal(loaded.data.village.residents[1].job,"fisher");
assert(loaded.resourceStatus(sample).removed,"saved workers cannot regather consumed trees");
assert(loaded.fishCaught(fish.id));
assert(loaded.wildlifeStatus({id:deer.id,species:"deer"}).looted);
assert.deepEqual(loaded.stockpileInfo().items,g.stockpileInfo().items);
const storage=loaded.data.village.stockpile.items;
storage.stone=STOCKPILE_CAPACITY-stockpileUsed(loaded.data.village.stockpile);
const before=loaded.resourceStatus(bush).remaining;
loaded.assignResidentJob("legacy:resident:1","forager");
assert.equal(loaded.completeVillagerWork("legacy:resident:1",
 {id:bush.id,kind:"resource",resource:"food",job:"forager"}).ok,false,
 "full stockpiles block work without consuming a node");
assert.equal(loaded.resourceStatus(bush).remaining,before);
assert.equal(stockpileUsed(loaded.data.village.stockpile),STOCKPILE_CAPACITY);
const mock={
 currentVillage:{stockpile:{x:0,z:8}},entities:[
 {resource:"wood",resourceId:sample.id,x:20,z:9,chunkKey:"0,0"},
 {resource:"wood",resourceId:sample.id,x:20,z:9,chunkKey:"0,0"},
 {resource:"food",resourceId:bush.id,x:10,z:10,chunkKey:"0,0"}],
 animals:[],fish:[],
 terrain:{waterAt:()=>({depth:0})},
 getResourceStatus:()=>({remaining:8,removed:false}),
 isBlocked:()=>false,
 getFishCaught:()=>false
};
const worker={x:0,z:8,job:"woodcutter"};
assert.equal(findVillagerWork(mock,worker).id,sample.id);
assert.equal(findVillagerWork(mock,worker,new Set([sample.id])),null,
 "only one worker claims each active node");
worker.job="forager";
assert.equal(findVillagerWork(mock,worker).id,bush.id);
assert.equal(Object.keys(VILLAGER_JOBS).length,6);
console.log("PASS phase 6A: job assignments, seeded gathering, wildlife, fish, capacity, persistence and work reservations");
