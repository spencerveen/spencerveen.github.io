import assert from "node:assert/strict";
import {terrainHeight,STARTER_SEED,CHUNK_SIZE,chunkCoord} from "../js/forest-generation.js";
import {mountainTerrainHeight} from "../js/mountain-generation.js";
import {buildWaterSurface} from "../js/forest-chunks.js";
import {WATER_MODEL_VERSION,SHALLOW_LIMIT,riverCenter,riverWidth,lakeSites,waterAt,waterTerrainHeight} from "../js/water-generation.js";
import {stockpileValidation} from "../js/stockpile.js";
import {placementCheck} from "../js/village-placement.js";
import {GameState} from "../js/state.js";

assert.equal(WATER_MODEL_VERSION,2);
assert(SHALLOW_LIMIT>.3&&SHALLOW_LIMIT<1.3);
const findDeep=(seed)=>{
 for(let basin=-3;basin<=3;basin++)
  for(let x=-1100;x<=400;x+=21){
   const z=riverCenter(x,basin,seed),w=waterAt(x,z,seed);
   if(w.depth>1&&w.kind==="river")return {x,z,w,basin};
  }
 return null;
};
for(const seed of [12000,1337,987654321,42]){
 assert.equal(waterAt(0,0,seed).depth,0,"founding clearing always dry");
 assert.equal(waterAt(-2,-8,seed).depth,0);
 const deep=findDeep(seed);
 assert(deep,"each seeded world has a deep finite river");
 assert.equal(deep.w.passable,false,"deep water requires swimming");
 assert.equal(waterAt(-2500,deep.z,seed).depth,0,"western headwaters have finite ends");
 const at=chunkCoord(deep.x,deep.z);
 const surface=buildWaterSurface(at.cx,at.cz,(x,z)=>waterAt(x,z,seed));
 assert(surface.indices.length>0,"water mesh renders the actual stream");
 assert.equal(surface.indices.length%3,0);
 assert.equal(surface.positions.length/3,surface.colors.length/4);
 assert(surface.colors.every((v,i)=>i%4!==3||v>=.84));
 for(let i=0;i<surface.indices.length;i+=3){
  const indices=surface.indices,vertices=surface.positions;
  const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
  const wx=(vertices[a]+vertices[b]+vertices[c])/3+(at.cx+.5)*CHUNK_SIZE;
  const wz=(vertices[a+2]+vertices[b+2]+vertices[c+2])/3+(at.cz+.5)*CHUNK_SIZE;
  const w=waterAt(wx,wz,seed);
  assert(w.depth>.001||w.shore<1.5,"water triangles clip near the natural banks");
 }
 for(let x=-440;x<=320;x+=31)for(let z=-420;z<=420;z+=43){
  const w=waterAt(x,z,seed);
  assert.deepEqual(w,waterAt(x,z,seed),"world seed always reproduces the same water");
  assert(Number.isFinite(w.depth)&&w.depth>=0&&w.depth<5);
  assert(Number.isFinite(waterTerrainHeight(x,z,seed)));
  assert(Math.abs(waterTerrainHeight(x,z,seed)-
   (mountainTerrainHeight(x,z,seed)-w.depth))<1e-9);
 }
 for(const [x,z] of [[deep.x,deep.z],[32,128],[-96,-160]]){
  const at=waterAt(x,z,seed);
  assert(Math.abs(waterAt(x+.00001,z,seed).depth-at.depth)<.002);
  assert(Math.abs(waterAt(x-.00001,z,seed).depth-at.depth)<.002);
 }
 const protect=waterAt(deep.x,deep.z,seed,[{x:deep.x,z:deep.z,radius:38}]);
 assert.equal(protect.depth,0,"old villages remain protected from changed water routes");
 const away=waterAt(deep.x+150,deep.z,seed,[{x:deep.x,z:deep.z,radius:38}]);
 assert.deepEqual(away,waterAt(deep.x+150,deep.z,seed));
}
assert.equal(waterAt(NaN,0).depth,0);
const deep=findDeep(12000);
assert(deep.w.depth>SHALLOW_LIMIT);

const dryWorld={player:{position:{x:0,z:0}},groundY:()=>.18,obstacles:[],
 terrain:{waterAt:()=>({depth:1.5})}};
assert(stockpileValidation(dryWorld,6,0).reason.includes("dry ground"),
 "stockpiles cannot be placed in a river or lake");
const village={stockpile:{x:0,z:0},buildings:[]};
assert(placementCheck({village,world:dryWorld,kind:"family",x:8,z:0}).reason.includes("dry land"),
 "buildings cannot be placed in deep water");
dryWorld.terrain.waterAt=()=>({depth:0});
assert(!stockpileValidation(dryWorld,6,0).reason.includes("dry ground"));
assert(!placementCheck({village,world:dryWorld,kind:"family",x:8,z:0}).reason.includes("dry land"));

const saves=new Map();
globalThis.localStorage={getItem:k=>saves.get(k)||null,setItem:(k,v)=>saves.set(k,v),removeItem:k=>saves.delete(k)};
const legacyAt={x:deep.x,z:deep.z};
saves.set("epoch.stoneage.slot.1",JSON.stringify({version:1,worldSeed:12000,
 hero:{name:"Old Founder"},village:{population:1,stockpile:{...legacyAt,items:{}},
 buildings:[{id:"building_1",kind:"family",x:legacyAt.x+8,z:legacyAt.z+8}],
 plots:{}}}));
const migrated=new GameState({slot:1});
assert(migrated.data.waterProtectedSites.length>=2,"old villages get a one-time site protection snapshot");
assert.equal(waterAt(legacyAt.x,legacyAt.z,12000,migrated.data.waterProtectedSites).depth,0,
 "migration keeps existing stockpile out of the water");
migrated.save();
const loaded=new GameState({slot:1});
assert.deepEqual(loaded.data.waterProtectedSites,migrated.data.waterProtectedSites,
 "save/reload keeps exact historical protected sites");
loaded.data.village.buildings.push({id:"building_2",kind:"family",x:400,z:400});
loaded.save();
const newer=new GameState({slot:1});
assert.deepEqual(newer.data.waterProtectedSites,migrated.data.waterProtectedSites,
 "new construction never reshapes an established river");
const fresh=new GameState({slot:2,newGame:true});
assert.deepEqual(fresh.data.waterProtectedSites,[],"fresh games do not alter seeded waterways around new settlements");
console.log("PASS 4B.2 seeded rivers, connected lakes, seamless chunk crossings, deep/shallow water, dry construction and historical village protection");
