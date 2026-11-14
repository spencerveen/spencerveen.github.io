import assert from "node:assert/strict";
import {STARTER_SEED,CHUNK_SIZE,chunkCoord} from "../js/forest-generation.js";
import {beachAt,beachWidth,beachFlintSites,BEACH_TREE_BUFFER,
 BEACH_MODEL_VERSION} from "../js/beach-generation.js";
import {coastlineX,COAST_SHELF} from "../js/ocean-generation.js";
import {waterAt,waterTerrainHeight,SHALLOW_LIMIT} from "../js/water-generation.js";
import {terrainAppearanceAt} from "../js/mountain-appearance.js";
import {GameState} from "../js/state.js";
assert.equal(BEACH_MODEL_VERSION,1);
assert(COAST_SHELF>=150);
for(const seed of [STARTER_SEED,42,1337,987654321]){
 let total=0,sites=[],noFlintOnSea=true;
 for(const z of [-650,-311,0,50,243,701]){
  const coast=coastlineX(z,seed),width=beachWidth(z,seed);
  assert(width>=70&&width<=110);
  const inland=beachAt(coast-width-20,z,seed);
  const edge=beachAt(coast-9,z,seed);
  assert(!inland.vegetationClear&&edge.vegetationClear);
  assert(edge.sand>.8&&inland.sand===0);
  assert(beachAt(coast-25,z,seed).flintZone);
  assert(!beachAt(coast+1,z,seed).flintZone);
  const near=waterAt(coast+12,z,seed);
  const deep=waterAt(coast+45,z,seed);
  assert.equal(near.kind,"ocean");
  assert(near.depth<SHALLOW_LIMIT&&near.depth>.1,"sandy seaward shelf is wadeable");
  assert(deep.depth>SHALLOW_LIMIT,"depth increases smoothly offshore");
  const dry=waterAt(coast-10,z,seed);
  const sand=terrainAppearanceAt(coast-10,z,seed,[],dry,0).color;
  const inlandColor=terrainAppearanceAt(coast-width-30,z,seed,[],
   waterAt(coast-width-30,z,seed),0).color;
  assert(sand[0]>inlandColor[0],"beach is visibly pale and sandy");
  const x=coast-30,{cx,cz}=chunkCoord(x,z);
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
   const a=beachFlintSites(seed,cx+dx,cz+dz);
   assert(a.length<=2);
   assert.deepEqual(a,beachFlintSites(seed,cx+dx,cz+dz));
   for(const p of a){
    assert(beachAt(p.x,p.z,seed).flintZone);
    assert(p.resource==="flint"&&p.shape==="flint");
    if(waterAt(p.x,p.z,seed).depth>0)noFlintOnSea=false;
    sites.push(p);total++;
   }
  }
 }
 assert(noFlintOnSea,"beach flint sites are dry, never submerged");
 assert(total>=5&&total<100,"flint appears sparsely across visited coastline");
 assert(new Set(sites.map(s=>s.id)).size>1);
 assert(Math.abs(waterTerrainHeight(coastlineX(0,seed)+.00001,0,seed)-
  waterTerrainHeight(coastlineX(0,seed)-.00001,0,seed))<.003,
  "seabed and dry beach remain continuous at the waterline");
}
const shore=coastlineX(0,STARTER_SEED);
let node=null;
for(let z=-300;z<=300&&!node;z+=32){
 const x=coastlineX(z,STARTER_SEED)-35,{cx,cz}=chunkCoord(x,z);
 node=beachFlintSites(STARTER_SEED,cx,cz)[0]||null;
}
assert(node,"at least one flint node spawns on the starter-seed coast");
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.get(k)||null,
 setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const state=new GameState({slot:1,newGame:true});
state.onChange=()=>{};
state.data.survival.stamina=30;
assert.equal(state.resourceStatus(node).remaining,2);
const first=state.harvestResource(node,"gather",1794600000000);
assert.equal(first.added,1);
assert.equal(state.inventoryCount("flint"),1);
assert.equal(state.resourceStatus(node).remaining,1);
const second=state.harvestResource(node,"gather",1794600001000);
assert.equal(second.added,1);
assert.equal(second.removed,true);
assert.equal(state.inventoryCount("flint"),2);
assert.equal(state.data.survival.stamina,26);
state.save();
const after=new GameState({slot:1});
assert(after.resourceStatus(node).removed,"collected beach flint remains depleted");
assert.equal(after.inventoryCount("flint"),2);
console.log("PASS beaches: 70-110m sandy bands, 20m wade shelf, no submerged flint, seeded flakes and permanent gathering");
