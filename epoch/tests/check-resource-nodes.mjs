import assert from "node:assert/strict";
import {forestObjects} from "../js/forest-generation.js";
import {BERRY_REGROW_MS,resourceNodeStatus} from "../js/resource-nodes.js";
const memory=new Map();
globalThis.localStorage={
 getItem:key=>memory.get(key)||null,
 setItem:(key,value)=>memory.set(key,value),
 removeItem:key=>memory.delete(key)
};
const {GameState}=await import("../js/state.js");
const baseTime=1794600000000,seed=12000;
const all=[...Array(3)].flatMap((_,a)=>[...Array(3)].flatMap((__,b)=>forestObjects(seed,a-1,b-1)));
const tree=all.find(item=>item.resource==="wood");
const rock=all.find(item=>item.resource==="stone");
const bush=all.find(item=>item.resource==="food");
assert(tree&&rock&&bush,"starter forest must contain all resource types");
const state=new GameState();
state.onChange=()=>{};
assert.equal(state.resourceStatus(tree,baseTime).remaining,12,"new tree starts with twelve wood");
assert.equal(state.resourceStatus(rock,baseTime).remaining,12,"stone deposits begin with twelve stone");
assert.equal(state.resourceStatus(bush,baseTime).remaining,8,"berry bushes begin with eight berries");
assert.equal(state.resourceStatistics().modified,0,"untouched nodes occupy no save space");
for(let i=0;i<6;i++){
 const result=state.harvestResource(tree,"gather",baseTime+i*1000);
 assert.equal(result.added,2);
 assert.equal(result.remaining,10-2*i);
}
assert(state.resourceStatus(tree,baseTime+6000).removed,"exhausted tree is permanently gone");
assert.equal(state.harvestResource(tree,"gather",baseTime+7000).type,"empty");
assert.equal(state.inventoryCount("wood"),12);
assert.equal(state.inventoryCount("vines"),6);
const afterTree=new GameState();
assert(afterTree.resourceStatus(tree,baseTime+6000000).removed,"felled tree stays gone after reload");
afterTree.onChange=()=>{};
afterTree.data.inventory=Array.from({length:10},()=>null);
afterTree.syncResources();
for(let i=0;i<6;i++){
 const result=afterTree.harvestResource(rock,"gather",baseTime+i*1000);
 assert.equal(result.added,2);
}
assert(afterTree.resourceStatus(rock,baseTime+1000000).removed,"stone never regrows");
assert.equal(afterTree.harvestResource(rock,"gather",baseTime+1000001).type,"empty");
afterTree.data.inventory=Array.from({length:10},()=>null);
afterTree.syncResources();
for(let i=0;i<4;i++){
 const result=afterTree.harvestResource(bush,"gather",baseTime+i*1000);
 assert.equal(result.added,2);
}
const depleted=afterTree.resourceStatus(bush,baseTime+3000);
assert.equal(depleted.remaining,0);
assert.equal(depleted.removed,false);
assert.equal(depleted.regrowAt,baseTime+3000+BERRY_REGROW_MS);
assert.equal(afterTree.harvestResource(bush,"gather",baseTime+5000).type,"empty");
assert.equal(afterTree.resourceStatus(bush,depleted.regrowAt-1).remaining,0);
assert.equal(afterTree.resourceStatus(bush,depleted.regrowAt).remaining,8,"berries regrow at scheduled time");
const picked=afterTree.harvestResource(bush,"gather",depleted.regrowAt+5);
assert.equal(picked.remaining,6);
const anotherBush=all.find(x=>x.resource==="food"&&x.id!==bush.id);
assert(anotherBush);
const beforeCut=afterTree.inventoryCount("vines");
const cut=afterTree.harvestResource(anotherBush,"cut",baseTime+3000);
assert.equal(cut.type,"removed");
assert.equal(cut.vines,3);
assert.equal(afterTree.inventoryCount("vines"),beforeCut+3);
assert(afterTree.resourceStatus(anotherBush,baseTime+10*BERRY_REGROW_MS).removed,"chopped bush never regrows");
assert.equal(afterTree.harvestResource(anotherBush,"gather",baseTime+100000).type,"empty");
const persistent=new GameState();
assert(persistent.resourceStatus(anotherBush,baseTime+100000).removed,"chopped bush stays gone after save/reload");
assert(persistent.resourceStatus(rock,baseTime+100000).removed);
assert.equal(persistent.resourceStatus(bush,depleted.regrowAt+6).remaining,6,"berry progress survives reload");
persistent.onChange=()=>{};
persistent.data.inventory=Array.from({length:10},()=>({id:"wood",qty:12}));
persistent.syncResources();
const statusBefore=JSON.stringify(persistent.data.resourceNodes);
assert.equal(persistent.harvestResource(bush,"gather",baseTime+300000).type,"full","full pack blocks berry harvest");
assert.equal(persistent.harvestResource(bush,"cut",baseTime+300001).type,"full","full pack blocks destructive cut");
assert.equal(JSON.stringify(persistent.data.resourceNodes),statusBefore,"no resource loss when inventory is full");
assert(!persistent.resourceStatus(bush,baseTime+300001).removed);
persistent.nextGeneration();
assert(persistent.resourceStatus(tree,baseTime+400000).removed,"resource depletion carries across descendants");
assert(persistent.resourceStatus(rock,baseTime+400000).removed);
assert(persistent.resourceStatus(anotherBush,baseTime+400000).removed);
console.log("PASS resource depletion: 12 wood, 12 stone, 8 berries, timed berry regrowth, bush cutting, full-pack safety and persistent world modifications");
