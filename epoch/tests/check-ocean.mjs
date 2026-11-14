import assert from "node:assert/strict";
import {STARTER_SEED,CHUNK_SIZE,chunkCoord} from "../js/forest-generation.js";
import {SEA_LEVEL,OCEAN_MODEL_VERSION,coastlineX,oceanAt} from "../js/ocean-generation.js";
import {waterAt,waterTerrainHeight,SHALLOW_LIMIT} from "../js/water-generation.js";
import {buildWaterSurface} from "../js/forest-chunks.js";
import {terrainAppearanceAt} from "../js/mountain-appearance.js";
import {stockpileValidation} from "../js/stockpile.js";
import {GameState} from "../js/state.js";
assert.equal(OCEAN_MODEL_VERSION,1);
for(const seed of [STARTER_SEED,42,1337,987654321]){
 assert.equal(oceanAt(0,0,seed),null,"original founding forest remains inland");
 assert.equal(waterAt(0,0,seed).depth,0);
 const shore=coastlineX(0,seed);
 assert(shore>440&&shore<690,"ocean is reachable but far enough away from the starting village");
 assert.equal(coastlineX(0,seed),shore);
 assert.notEqual(coastlineX(0,seed),coastlineX(220,seed),"seeded coastline varies with z");
 const inland=waterAt(shore-135,0,seed);
 assert.notEqual(inland.kind,"ocean");
 const beach=waterAt(shore-12,0,seed);
 assert.notEqual(beach.kind,"ocean");
 assert(beach.coastBeach>.1,"dry terrain includes a sandy beach");
 const shallow=waterAt(shore+2,0,seed);
 const deep=waterAt(shore+70,0,seed);
 assert.equal(shallow.kind,"ocean");
 assert(shallow.depth>0&&shallow.depth<SHALLOW_LIMIT&&shallow.passable,"shore is wadeable");
 assert(deep.depth>SHALLOW_LIMIT&&!deep.passable);
 assert.equal(deep.surfaceY,SEA_LEVEL);
 assert(deep.bedY<deep.surfaceY);
 assert(waterTerrainHeight(shore+70,0,seed)<SEA_LEVEL);
 assert(waterAt(shore+1500,100,seed).depth>10,"open ocean stays ocean indefinitely");
 const saved=[{x:shore+75,z:0,radius:34}];
 const island=waterAt(saved[0].x,saved[0].z,seed,[],[],saved);
 assert.notEqual(island.kind,"ocean","old village cannot be flooded");
 assert.equal(oceanAt(saved[0].x,saved[0].z,seed,saved).depth,0);
 const far=waterAt(shore+240,0,seed,[],[],saved);
 assert.equal(far.kind,"ocean","protection does not extend across the ocean");
 const onBeach=terrainAppearanceAt(shore-10,0,seed,[],beach,.1);
 const normal=terrainAppearanceAt(0,0,seed,[],waterAt(0,0,seed),.1);
 assert(onBeach.color[0]>normal.color[0]&&onBeach.color[1]>normal.color[1],
  "coastline should show warmer, lighter sand");
 for(const z of [-620,-33,0,16,32,510]){
  const x=coastlineX(z,seed);
  const first=waterAt(x+3,z,seed);
  assert.deepEqual(first,waterAt(x+3,z,seed));
  assert(Math.abs(waterTerrainHeight(x+3,z-.00001,seed)-waterTerrainHeight(x+3,z+.00001,seed))<.002,
   "terrain across chunk seams remains continuous");
 }
 const p=chunkCoord(shore+140,0);
 const surface=buildWaterSurface(p.cx,p.cz,(x,z)=>waterAt(x,z,seed),8);
 assert(surface.indices.length>0,"distant ocean has a rendered surface");
 assert(surface.colors.some((n,i)=>i%4===2&&n>1.06),"ocean mesh has a distinct blue tone");
}
const mem=new Map();
globalThis.localStorage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
const z=0,siteX=coastlineX(z,STARTER_SEED)+80;
const old={version:1,worldSeed:STARTER_SEED,hero:{name:"Coastal Founder"},
 village:{stockpile:{x:siteX,z,items:{}},
 buildings:[{id:"building_1",kind:"family",x:siteX+10,z:0}],plots:{}},
 waterProtectedSites:[],mountainProtectedSites:[]};
mem.set("epoch.stoneage.slot.1",JSON.stringify(old));
const migrated=new GameState({slot:1});
assert.equal(migrated.data.oceanProtectedSites.length,2,"pre-ocean saves protect built sites");
assert.equal(waterAt(siteX,0,STARTER_SEED,[],[],migrated.data.oceanProtectedSites).depth,0);
migrated.save();
const again=new GameState({slot:1});
assert.deepEqual(again.data.oceanProtectedSites,migrated.data.oceanProtectedSites);
again.data.village.buildings.push({id:"building_2",kind:"family",x:siteX+170,z:0});
again.save();
assert.deepEqual(new GameState({slot:1}).data.oceanProtectedSites,migrated.data.oceanProtectedSites,
 "later construction does not change the coast");
const newWorld=new GameState({slot:2,newGame:true});
assert.deepEqual(newWorld.data.oceanProtectedSites,[]);
const dryWorld={player:{position:{x:siteX-35,z:0}},groundY:(x,z)=>waterTerrainHeight(x,z,STARTER_SEED),
 obstacles:[],terrain:{waterAt:(x,z)=>waterAt(x,z,STARTER_SEED)}};
assert(stockpileValidation(dryWorld,siteX,0).reason.includes("dry ground"),
 "stockpile placement rejects the deep ocean");
console.log("PASS ocean: seeded shoreline, sand, shallow/deep water, uninterrupted sea, old villages, chunk seams and efficient mesh colors");
