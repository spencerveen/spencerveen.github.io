import assert from "node:assert/strict";
import {CHUNK_SIZE,STARTER_SEED,chunkCoord} from "../js/forest-generation.js";
import {mountainAt} from "../js/mountain-generation.js";
import {mountainFlintSites} from "../js/mountain-flint.js";
import {beachAt,beachFlintSites} from "../js/beach-generation.js";
import {waterAt} from "../js/water-generation.js";
import {GameState} from "../js/state.js";

let chosen=null;
for(const seed of [STARTER_SEED,42,1337,987654321]){
 let peak={uplift:0,x:0,z:0};
 for(let x=-1250;x<=1250;x+=75)for(let z=-1250;z<=1250;z+=75){
  const uplift=mountainAt(x,z,seed).uplift;
  if(uplift>peak.uplift)peak={uplift,x,z};
 }
 assert(peak.uplift>16,"each seeded world must have a mountain");
 const {cx,cz}=chunkCoord(peak.x,peak.z);
 const water=(x,z)=>waterAt(x,z,seed);
 const sites=[];
 for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
  const tx=cx+dx,tz=cz+dz;
  const a=mountainFlintSites(seed,tx,tz,water);
  assert.deepEqual(a,mountainFlintSites(seed,tx,tz,water),
   "mountain flint respawns at identical seeded locations");
  assert(a.length<=2,"mountain flint stays sparse");
  const beachIds=new Set(beachFlintSites(seed,tx,tz).map(p=>p.id));
  for(const p of a){
   assert.equal(p.resource,"flint");
   assert.equal(p.shape,"flint");
   assert.equal(p.habitat,"mountain");
   assert.equal(p.label,"Mountain Flint");
   assert(!beachIds.has(p.id),"mountain and beach flint must not overlap");
   assert(p.x>=tx*CHUNK_SIZE&&p.x<(tx+1)*CHUNK_SIZE);
   assert(p.z>=tz*CHUNK_SIZE&&p.z<(tz+1)*CHUNK_SIZE);
   assert(!beachAt(p.x,p.z,seed).vegetationClear,"mountain flint is inland");
   assert(water(p.x,p.z).depth<=.025,"flint never spawns underwater");
   assert(mountainAt(p.x,p.z,seed,[],water(p.x,p.z).corridorDistance).uplift>=4.5);
   sites.push(p);
  }
 }
 assert(sites.length>0,"rocky mountain foothills must contain some flint");
 assert.equal(new Set(sites.map(p=>p.id)).size,sites.length,
  "neighboring chunks never duplicate mountain flint IDs");
 const protect=[{x:peak.x,z:peak.z,radius:1000}];
 assert.deepEqual(mountainFlintSites(seed,cx,cz,water,protect),[],
  "protected settlements keep highland resource spawning out");
 assert.deepEqual(mountainFlintSites(seed,cx,cz,()=>({depth:4}),[]),[],
  "submerged mountain terrain cannot contain flint");
 if(!chosen)chosen=sites[0];
}
assert(chosen);
const data=new Map();
globalThis.localStorage={
 getItem:k=>data.get(k)||null,
 setItem:(k,v)=>data.set(k,v),
 removeItem:k=>data.delete(k)
};
const state=new GameState({slot:1,newGame:true});
state.onChange=()=>{};
state.data.survival.stamina=35;
assert.equal(state.resourceStatus(chosen).remaining,2);
assert.equal(state.harvestResource(chosen,"gather",1794600000000).added,1);
assert.equal(state.harvestResource(chosen,"gather",1794600001000).added,1);
assert(state.resourceStatus(chosen).removed,"flint is permanently depleted");
assert.equal(state.inventoryCount("flint"),2);
state.save();
const loaded=new GameState({slot:1});
assert(loaded.resourceStatus(chosen).removed,"mountain flint depletion survives reload");
assert.equal(loaded.inventoryCount("flint"),2);
console.log("PASS mountain flint: seeded sparse foothill spawns, no coastal/water overlap, settlement protection and permanent harvest");
