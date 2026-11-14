import assert from "node:assert/strict";
import {terrainHeight,STARTER_SEED,CHUNK_SIZE,chunkCoord} from "../js/forest-generation.js";
import {buildWaterSurface} from "../js/forest-chunks.js";
import {WATER_MODEL_VERSION,SHALLOW_LIMIT,riverCenter,riverWidth,lakeSites,waterAt,waterTerrainHeight} from "../js/water-generation.js";
import {stockpileValidation} from "../js/stockpile.js";
import {placementCheck} from "../js/village-placement.js";
import {GameState} from "../js/state.js";

assert.equal(WATER_MODEL_VERSION,1);
// A real shoreline-shaped mesh must never spill a transparent quad over dry
// ground, and unloaded chunks must not allocate invisible water surfaces.
const drySurface=buildWaterSurface(0,0,(x,z)=>waterAt(x,z,STARTER_SEED));
assert.equal(drySurface.indices.length,0,"starter clearing has no water surface triangles");
const riverX=250,riverZ=riverCenter(riverX,0,STARTER_SEED);
const riverChunk=chunkCoord(riverX,riverZ);
const surface=buildWaterSurface(riverChunk.cx,riverChunk.cz,
 (x,z)=>waterAt(x,z,STARTER_SEED));
assert(surface.indices.length>0,"deep river creates rendered water triangles");
assert.equal(surface.indices.length%3,0);
assert.equal(surface.positions.length/3,surface.colors.length/4);
for(let i=3;i<surface.colors.length;i+=4)
 assert(surface.colors[i]>=.84,"shoreline mesh must not use transparent dry-land vertices");
for(let i=0;i<surface.indices.length;i+=3){
 const a=surface.indices[i]*3,b=surface.indices[i+1]*3,c=surface.indices[i+2]*3;
 const wx=(surface.positions[a]+surface.positions[b]+surface.positions[c])/3+(riverChunk.cx+.5)*CHUNK_SIZE;
 const wz=(surface.positions[a+2]+surface.positions[b+2]+surface.positions[c+2])/3+(riverChunk.cz+.5)*CHUNK_SIZE;
 const centroid=waterAt(wx,wz,STARTER_SEED);
 assert(centroid.depth>.001||centroid.shore<1.5,
  "a water triangle may cross the shoreline by only a sub-meter boundary approximation");
}

assert(SHALLOW_LIMIT>.3&&SHALLOW_LIMIT<1.3);
for(const seed of [12000,1337,987654321,42]){
 for(let x=-400;x<=400;x+=13)for(let z=-400;z<=400;z+=17){
  const water=waterAt(x,z,seed);
  assert.deepEqual(waterAt(x,z,seed),water,"water geometry must be reproducible from saved world seed");
  assert(Number.isFinite(water.depth)&&water.depth>=0&&water.depth<5);
  assert(Number.isFinite(waterTerrainHeight(x,z,seed)));
  assert(Math.abs(waterTerrainHeight(x,z,seed)-(terrainHeight(x,z,seed)-water.depth))<1e-9);
  if(water.depth>0)assert(["river","lake"].includes(water.kind));
 }
 assert.equal(waterAt(0,0,seed).depth,0,"original village stays dry across all existing seeds");
 assert.equal(waterAt(-2,-8,seed).depth,0,"legacy starting stockpile remains dry");
 for(let x of [-320,-224,-128,96,192,320]){
  for(const channel of [-1,0,1]){
   const z=riverCenter(x,channel,seed);
   assert(Number.isFinite(z));
   assert(Number.isFinite(riverWidth(x,channel,seed)));
   if(Math.hypot(x,z)<90)continue;
   const sample=waterAt(x,z,seed);
   assert(sample.depth>0&&sample.kind!=="land","rivers must have no missing sections");
  }
 }
 for(const boundary of [-CHUNK_SIZE*6,-CHUNK_SIZE,0,CHUNK_SIZE,CHUNK_SIZE*5]){
  const z=riverCenter(boundary,0,seed);
  if(Math.hypot(boundary,z)<84)continue;
  const at=waterAt(boundary,z,seed);
  assert(at.depth>.1,"river crosses chunk boundaries");
  assert(Math.abs(waterAt(boundary-.00001,z,seed).depth-at.depth)<.001,"left side of chunk seam agrees");
  assert(Math.abs(waterAt(boundary+.00001,z,seed).depth-at.depth)<.001,"right side of chunk seam agrees");
 }
 let lake=null;
 for(let channel=-2;channel<=2&&!lake;channel++)
  for(let section=-4;section<=4&&!lake;section++)
   lake=lakeSites(seed,channel,section).find(p=>Math.hypot(p.x,p.z)>100);
 assert(lake,"seed creates lakes in the explorable wilderness");
 assert(waterAt(lake.x,lake.z,seed).depth>1,"lakes have deep central water");
 const protect=waterAt(lake.x,lake.z,seed,[{x:lake.x,z:lake.z,radius:38}]);
 assert.equal(protect.depth,0,"existing village protection keeps a historical lake-bed dry");
 const at=waterAt(lake.x+85,lake.z,seed,[{x:lake.x,z:lake.z,radius:38}]);
 assert.deepEqual(at,waterAt(lake.x+85,lake.z,seed),"protection does not affect remote geography");
}
assert.notEqual(riverCenter(172,0,12000),riverCenter(172,0,1337),"world seeds affect river routes");
let crossing=null,deep=null;
for(let x=190;x<560;x+=7){
 const center=riverCenter(x,0,STARTER_SEED),width=riverWidth(x,0,STARTER_SEED);
 const inner=waterAt(x,center,STARTER_SEED);
 const bank=waterAt(x,center+width-.1,STARTER_SEED);
 if(inner.depth>1&&bank.depth>0&&bank.depth<SHALLOW_LIMIT){crossing=bank;deep=inner;break}
}
assert(crossing?.passable&&crossing.shallow,"shallows support wading");
assert.equal(deep?.passable,false,"deep water blocks walking until swimming exists");
assert.equal(waterAt(NaN,0).depth,0,"invalid coordinates never crash water generation");

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
const legacyAt={x:300,z:riverCenter(300,0,12000)};
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
