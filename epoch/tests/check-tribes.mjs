import assert from "node:assert/strict";
import {GameState} from "../js/state.js";
import {CHUNK_SIZE} from "../js/forest-generation.js";
import {
 tribeAtChunk,starterTribeChunk,normalizeTribeRecords,tribeCampIsActive,
 TRIBE_CLEARING_RADIUS,TRIBE_STATUSES
} from "../js/tribes.js";

const saves=new Map();
globalThis.localStorage={getItem:k=>saves.get(k)||null,setItem:(k,v)=>saves.set(k,v),removeItem:k=>saves.delete(k)};
const seeds=[12000,1337,72031,987654321,348097,90210,1];
for(const seed of seeds){
 const [cx,cz]=starterTribeChunk(seed);
 const first=tribeAtChunk(seed,cx,cz);
 assert(first,"the opening world always has a tribe to discover by exploring outward");
 assert.equal(first.starter,true);
 assert.equal(first.cx,cx);assert.equal(first.cz,cz);
 assert.equal(first.id,"tribe:"+cx+","+cz);
 assert(first.population>=2&&first.population<=5,"tribes are small");
 assert.equal(first.members.length,first.population);
 assert.equal(first.members[0].role,"leader");
 assert.equal(first.members.filter(m=>m.role==="leader").length,1);
 assert(first.name.endsWith(" Tribe"));
 assert(Math.hypot(first.x,first.z)>=48,"wilderness tribes do not appear in the starting clearing");
 assert.deepEqual(first,tribeAtChunk(seed,cx,cz),"same seed and chunk always produce identical tribes");
 const ids=new Set();
 for(let x=-7;x<=7;x++)for(let z=-7;z<=7;z++){
  const tribe=tribeAtChunk(seed,x,z);
  if(!tribe)continue;
  assert(!ids.has(tribe.id),"world chunks have unique tribe IDs");
  ids.add(tribe.id);
  assert(Math.floor(tribe.x/CHUNK_SIZE)===x);
  assert(Math.floor(tribe.z/CHUNK_SIZE)===z);
  assert(tribe.members.length>=2&&tribe.members.length<=5);
  assert.equal(new Set(tribe.members.map(m=>m.id)).size,tribe.population);
  assert(tribe.members.every(m=>m.x!==undefined&&m.z!==undefined&&Number.isFinite(m.age)));
 }
 assert(ids.size>3&&ids.size<50,"small tribes are scattered rather than overwhelming the forest");
}
assert.notDeepEqual(tribeAtChunk(1337,...starterTribeChunk(1337)),
                    tribeAtChunk(12000,...starterTribeChunk(12000)),
                    "different world seeds result in different tribes");
const game=new GameState({slot:1,newGame:true});
game.onChange=()=>{};
const t=tribeAtChunk(game.data.worldSeed,...starterTribeChunk(game.data.worldSeed));
assert.deepEqual(game.data.tribes,{},"new save has no known tribes");
assert.equal(game.discoverTribe({...t,id:"tribe:999,999"}),false,"spoofed tribe IDs cannot be saved");
assert(game.discoverTribe(t),"approaching a valid site records discovery");
assert.equal(game.discoverTribe(t),false,"discovery is awarded only once");
assert.deepEqual(game.tribeRecord(t.id),{status:"active",discovered:true,discoveredYear:-12000});
assert.equal(game.data.village.population,1,"discovering a tribe never grants free villagers");
assert.equal(game.data.knowledge,0,"discovering does not mint Knowledge");
assert.equal(game.data.culture,0,"discovering does not mint Culture");
assert.equal(game.data.history.filter(h=>h.includes(t.name)).length,1,"the event appears once in history");
game.save();
const reload=new GameState({slot:1});
assert.deepEqual(reload.tribeRecord(t.id),game.tribeRecord(t.id),"discovery survives save/reload");
assert.equal(reload.discoverTribe(t),false);
assert(tribeCampIsActive(t,reload.data.tribes,{x:0,z:0}));
assert(!tribeCampIsActive(t,reload.data.tribes,{x:t.x,z:t.z}),"a player's founded village suppresses overlapping camps");
assert(TRIBE_CLEARING_RADIUS>=8,"camp clears enough space for shelters");
assert.deepEqual(TRIBE_STATUSES,["active","relocated","razed"]);
for(const status of ["relocated","razed"]){
 reload.data.tribes[t.id].status=status;
 reload.save();
 const ended=new GameState({slot:1});
 assert.equal(ended.tribeRecord(t.id).status,status);
 assert(!tribeCampIsActive(t,ended.data.tribes),"ended tribes cannot respawn");
 assert.equal(ended.discoverTribe(t),false,"an ended tribe cannot be re-created by discovery");
}
const contaminated=normalizeTribeRecords({
 "tribe:1,2":{status:"malicious",discovered:true,discoveredYear:18},
 "tribe:3,-4":{status:"razed",discovered:false},
 "tribe:invalid":{discovered:true},
 "__proto__":{status:"active"}
});
assert.equal(Object.keys(contaminated).length,2,"invalid or non-tribe records are ignored");
assert.equal(contaminated["tribe:1,2"].status,"active","unknown status is normalized safely");
assert.equal(contaminated["tribe:3,-4"].discoveredYear,null);
const legacy={version:1,hero:{name:"Legacy"},worldSeed:12000,village:{population:5,plots:{},buildings:[]},knowledge:11,culture:2};
saves.set("epoch.stoneage.slot.2",JSON.stringify(legacy));
const migrated=new GameState({slot:2});
assert.deepEqual(migrated.data.tribes,{},"old saves get empty tribe records");
assert.equal(migrated.data.village.population,5,"legacy population remains unchanged");
assert.equal(migrated.data.knowledge,11);
console.log("PASS tribes: deterministic camps, founders, 2–5 named residents, unique IDs, discovery, save migration, status persistence and no duplication");
