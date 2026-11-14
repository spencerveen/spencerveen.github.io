import assert from "node:assert/strict";
import {GameState} from "../js/state.js";
import {legacyResidents,normalizeResidents} from "../js/residents.js";
import {forestObjects} from "../js/forest-generation.js";
import {STOCKPILE_CAPACITY,stockpileUsed} from "../js/stockpile.js";
import {VILLAGER_CARRY_CAPACITY,normalizeCargo,cargoCount,cargoLabel,
 normalizeHaulPosition,transferCargo,landRoute,drySegment} from "../js/villager-hauling.js";

const memory=new Map();
globalThis.localStorage={
 getItem:k=>memory.get(k)||null,
 setItem:(k,v)=>memory.set(k,v),
 removeItem:k=>memory.delete(k)
};
const state=new GameState({slot:1,newGame:true});
state.onChange=()=>{};
assert(state.foundStockpile(0,8));
state.data.village.residents=normalizeResidents(legacyResidents(2));
state.data.village.population=3;
const id="legacy:resident:0";
assert(state.assignResidentJob(id,"woodcutter"));
const tree=forestObjects(state.data.worldSeed,0,0).find(p=>p.resource==="wood");
assert(tree,"a genuine seeded harvest target exists");
const task={id:tree.id,kind:"resource",resource:"wood",job:"woodcutter"};
const collected=state.collectVillagerCargo(id,task,tree.x+1.7,tree.z);
assert(collected.ok);
assert.equal(collected.carried,2);
assert.equal(state.stockpileInfo().items.wood,0,"pickup must NOT create stored supplies");
assert.equal(state.resourceStatus(tree).remaining,10,"real finite resource is claimed on pickup");
assert.equal(state.villageHaulingStatus().inTransit,2);
assert.equal(cargoCount(state.data.village.residents[0].cargo),2);
assert.equal(state.collectVillagerCargo(id,task).ok,false,"cannot carry two loads at once");
assert(state.assignResidentJob(id,"idle"),"reassigning must retain the current load");
assert.equal(state.villageHaulingStatus().inTransit,2,"reassignment never loses cargo");
state.save();
const reloaded=new GameState({slot:1});
reloaded.onChange=()=>{};
assert.equal(reloaded.data.village.residents[0].job,"idle");
assert.equal(reloaded.data.village.residents[0].cargo.wood,2);
assert.deepEqual(reloaded.data.village.residents[0].haulPosition,{x:tree.x+1.7,z:tree.z});
assert.equal(reloaded.stockpileInfo().items.wood,0);
assert.equal(reloaded.resourceStatus(tree).remaining,10);
const unloaded=reloaded.deliverVillagerCargo(id);
assert(unloaded.ok);
assert.equal(unloaded.moved,2);
assert.equal(unloaded.remaining,0);
assert.equal(reloaded.data.village.residents[0].haulPosition,null);
assert.equal(reloaded.stockpileInfo().items.wood,2);
assert.equal(reloaded.deliverVillagerCargo(id).ok,false,"no double-unload");
assert.equal(reloaded.villageHaulingStatus().inTransit,0);
assert(reloaded.assignResidentJob(id,"woodcutter"));
const almostFull=reloaded.data.village.stockpile.items;
almostFull.stone=STOCKPILE_CAPACITY-stockpileUsed(reloaded.data.village.stockpile)-1;
assert.equal(reloaded.collectVillagerCargo(id,task,tree.x+2,tree.z).ok,true);
const partial=reloaded.deliverVillagerCargo(id);
assert.equal(partial.moved,1);
assert.equal(partial.remaining,1);
assert.equal(reloaded.stockpileInfo().items.wood,3);
assert.equal(reloaded.deliverVillagerCargo(id).ok,false,"full storage leaves cargo intact");
assert.equal(cargoCount(reloaded.data.village.residents[0].cargo),1);
almostFull.stone-=2;
assert.equal(reloaded.deliverVillagerCargo(id).moved,1,"remaining load delivered once room opens");
assert.equal(reloaded.deliverVillagerCargo(id).ok,false);
assert.equal(reloaded.resourceStatus(tree).remaining,8);
assert.equal(reloaded.stockpileInfo().items.wood,4);
assert.equal(cargoCount({wood:8,stone:2}),8);
assert.deepEqual(normalizeCargo({bogus:20,wood:2,stone:-5,fish_meat:2}),{wood:2,fish_meat:2});
assert.equal(normalizeHaulPosition({x:Infinity,z:2}),null);
assert(cargoLabel({wood:2}).includes("wood"));
const second="legacy:resident:1";
assert(reloaded.assignResidentJob(second,"hunter"));
const deer={id:"wildlife:0,0:deer",kind:"hunt",species:"deer",job:"hunter"};
assert(reloaded.collectVillagerCargo(second,deer,4,6).ok);
assert.equal(reloaded.data.village.residents[1].cargo.animal_meat,3);
assert.equal(reloaded.data.village.residents[1].cargo.fur,2);
assert.equal(reloaded.villageHaulingStatus().inTransit,6);
assert(reloaded.wildlifeStatus({id:deer.id,species:"deer"}).looted,
 "hunting is recorded at pickup, not at delivery");
assert.equal(reloaded.collectVillagerCargo(second,deer).ok,false);
const geometry={
 isBlocked:(x,z)=>Math.abs(x-5)<1&&Math.abs(z)<6,
 terrain:{waterAt:(x,z)=>({depth:Math.abs(x-7)<1&&Math.abs(z)<6?1:0})},
 groundY:()=>0
};
const route=landRoute(geometry,{x:0,z:0},{x:13,z:0},.85);
assert(route&&route.length>=2,"the hauler should detour around obstacles and water");
let from={x:0,z:0};
for(const waypoint of route){
 assert(drySegment(geometry,from,waypoint),"waypoints must be reachable across dry land");
 from=waypoint;
}
assert(Math.hypot(from.x-13,from.z)<=1.5,"last point approaches target");
const cutOff={
 isBlocked:()=>false,
 terrain:{waterAt:(x)=>({depth:Math.abs(x-6)<2?3:0})},
 groundY:()=>0
};
assert.equal(landRoute(cutOff,{x:0,z:0},{x:15,z:0},1),null,
 "a continuous uncrossable waterway never becomes an imaginary bridge");
assert(VILLAGER_CARRY_CAPACITY>=6);
console.log("PASS 6B: real pickup, carried inventory, safe delivery, partial capacity, save reload, reassignment and dry routes");
