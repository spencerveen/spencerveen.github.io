import assert from "node:assert/strict";
import {terrainHeight,STARTER_SEED} from "../js/forest-generation.js";
import {MOUNTAIN_MODEL_VERSION,MOUNTAIN_START_RADIUS,mountainAt,mountainTerrainHeight} from "../js/mountain-generation.js";
import {waterAt,waterTerrainHeight} from "../js/water-generation.js";
import {GameState} from "../js/state.js";
assert.equal(MOUNTAIN_MODEL_VERSION,1);
assert(MOUNTAIN_START_RADIUS>=100);
for(const seed of [STARTER_SEED,42,1337,987654321]){
 for(const [x,z] of [[0,0],[-2,-8],[65,25],[90,-70]]){
  assert.equal(mountainAt(x,z,seed).uplift,0,"starter region keeps old elevations");
  assert.equal(mountainTerrainHeight(x,z,seed),terrainHeight(x,z,seed));
 }
 let highest={uplift:0,x:0,z:0},foothills=0,highland=0;
 for(let x=-1400;x<=1400;x+=52)for(let z=-1400;z<=1400;z+=52){
  const s=mountainAt(x,z,seed);
  assert.deepEqual(mountainAt(x,z,seed),s);
  assert(Number.isFinite(s.uplift)&&s.uplift>=0&&s.uplift<=40);
  if(s.uplift>highest.uplift)highest={x,z,...s};
  if(s.uplift>.2&&s.uplift<9)foothills++;
  if(s.uplift>12)highland++;
 }
 assert(highest.uplift>16,"at least one mountainous ridge is discoverable");
 assert(foothills>10&&highland>10,"both foothills and high peaks exist");
 const protectedSites=[{x:highest.x,z:highest.z,radius:42}];
 assert.equal(mountainAt(highest.x,highest.z,seed,protectedSites).uplift,0);
 assert.equal(mountainTerrainHeight(highest.x,highest.z,seed,protectedSites),
  terrainHeight(highest.x,highest.z,seed),"old village is not lifted");
 assert.equal(mountainAt(highest.x+110,highest.z,seed,protectedSites).uplift,
  mountainAt(highest.x+110,highest.z,seed).uplift,"protection is local");
 for(const boundary of [-192,-32,0,32,160,288,512]){
  const y=mountainTerrainHeight(boundary,highest.z,seed);
  assert(Math.abs(mountainTerrainHeight(boundary-.00001,highest.z,seed)-y)<.001);
  assert(Math.abs(mountainTerrainHeight(boundary+.00001,highest.z,seed)-y)<.001);
 }
 const river=waterAt(highest.x,highest.z,seed,[],protectedSites);
 const y=waterTerrainHeight(highest.x,highest.z,seed,[],protectedSites);
 assert(Math.abs(y-(river.depth>0?river.bedY:river.surfaceY-.055))<1e-8,
  "water and terrain share the same protected elevation");
}
// Compare the seed-specific ridge itself before applying the new river-valley mask.
assert.notEqual(mountainAt(822,-511,1337,[],1000).uplift,mountainAt(822,-511,1338,[],1000).uplift);
assert.equal(mountainAt(Infinity,0).uplift,0);
const saves=new Map();
globalThis.localStorage={getItem:k=>saves.get(k)||null,setItem:(k,v)=>saves.set(k,v),
 removeItem:k=>saves.delete(k)};
const old={version:1,worldSeed:1337,hero:{name:"Veteran"},waterProtectedSites:[],
 village:{stockpile:{x:500,z:430,items:{}},
 buildings:[{id:"building_1",kind:"family",x:510,z:435}],plots:{}}};
saves.set("epoch.stoneage.slot.1",JSON.stringify(old));
const migrated=new GameState({slot:1});
assert.equal(migrated.data.mountainProtectedSites.length,2);
migrated.save();
const loaded=new GameState({slot:1});
assert.deepEqual(loaded.data.mountainProtectedSites,migrated.data.mountainProtectedSites);
loaded.data.village.buildings.push({id:"building_2",kind:"family",x:600,z:600});
loaded.save();
assert.deepEqual(new GameState({slot:1}).data.mountainProtectedSites,migrated.data.mountainProtectedSites);
assert.deepEqual(new GameState({slot:2,newGame:true}).data.mountainProtectedSites,[]);
console.log("PASS mountain phase 1: seeded ranges, foothills, chunk seams, water height, save migration");
