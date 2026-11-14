import assert from "node:assert/strict";
import {CHUNK_SIZE} from "../js/forest-generation.js";
import {tribeAtChunk,legacyTribeAtChunk,starterTribeChunk,
 TRIBE_MIN_SPACING,TRIBE_SITE_BUFFER,TRIBE_TERRITORY_CHUNKS} from "../js/tribes.js";
import {waterAt} from "../js/water-generation.js";
import {mountainAt} from "../js/mountain-generation.js";
import {GameState} from "../js/state.js";
assert.equal(TRIBE_TERRITORY_CHUNKS,5);
assert(TRIBE_MIN_SPACING>=120);
for(const seed of [12000,1337,72031,987654321,348097,90210,1,42]){
 const [sx,sz]=starterTribeChunk(seed),first=tribeAtChunk(seed,sx,sz);
 assert(first?.starter,"every seed must have a safe nearby encounter");
 const camps=[];
 for(let cx=-13;cx<=13;cx++)for(let cz=-13;cz<=13;cz++){
  const camp=tribeAtChunk(seed,cx,cz);
  if(!camp)continue;
  assert.equal(camp.placementVersion,2);
  assert.deepEqual(tribeAtChunk(seed,cx,cz),camp);
  assert.equal(Math.floor(camp.x/CHUNK_SIZE),cx);
  assert.equal(Math.floor(camp.z/CHUNK_SIZE),cz);
  for(const radius of [0,10,TRIBE_SITE_BUFFER])
   for(let i=0;i<(radius?8:1);i++){
    const a=i*Math.PI/4,px=camp.x+Math.cos(a)*radius,pz=camp.z+Math.sin(a)*radius;
    const w=waterAt(px,pz,seed);
    assert(w.depth<=.025&&w.kind!=="ocean","camps cannot intersect real waterways: "+camp.id);
    assert(mountainAt(px,pz,seed,[],w.corridorDistance).uplift<=5.5,
     "camps cannot intersect high mountain slopes");
    const center=waterAt(camp.x,camp.z,seed);
    assert(Math.abs(w.surfaceY-center.surfaceY)<1.9,"camp footprint stays relatively level");
   }
  for(const other of camps)
   assert(Math.hypot(camp.x-other.x,camp.z-other.z)>=TRIBE_MIN_SPACING,
    "tribes must be separated by natural territories");
  camps.push(camp);
 }
 assert(camps.length>3&&camps.length<35,"world should contain sparse but discoverable settlements");
}
let legacy=null;
for(let x=-5;x<=5&&!legacy;x++)for(let z=-5;z<=5&&!legacy;z++)
 legacy=legacyTribeAtChunk(12000,x,z);
assert(legacy&&legacy.placementVersion===1);
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
storage.set("epoch.stoneage.slot.1",JSON.stringify({version:1,worldSeed:12000,
 hero:{name:"Historic Explorer"},tribes:{[legacy.id]:{discovered:true,
  status:"active",trust:70,completed:2,discoveredYear:-12000}},
 village:{population:1,plots:{},buildings:[]}}));
const game=new GameState({slot:1});
assert.equal(game.tribeRecord(legacy.id).placementVersion,1);
assert.deepEqual(game.tribeDefinition(legacy.id),legacy,"historical tribe positions, IDs and residents survive");
game.save();
const again=new GameState({slot:1});
assert.deepEqual(again.tribeRecord(legacy.id),game.tribeRecord(legacy.id));
assert.equal(again.tribeProgress(legacy.id).record.completed,2);
console.log("PASS ecology: complete dry camp footprints, mountain safety, 132m+ tribe separation, historical save identity");
