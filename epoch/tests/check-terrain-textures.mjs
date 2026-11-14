import assert from "node:assert/strict";
import {terrainUV,waterUV,terrainBiomeWeights,
 TERRAIN_TILE_METERS,WATER_TILE_METERS,TERRAIN_VERTEX_SHADER,TERRAIN_FRAGMENT_SHADER} from "../js/terrain-textures.js";
import {buildWaterSurface} from "../js/forest-chunks.js";
import {CHUNK_SIZE} from "../js/forest-generation.js";
import {waterAt} from "../js/water-generation.js";
import {coastlineX} from "../js/ocean-generation.js";
assert(TERRAIN_TILE_METERS>=5&&WATER_TILE_METERS>=7);
for(const [x,z] of [[0,0],[32,-32],[-218.7,483],[1e5,-1e5]]){
 assert.deepEqual(terrainUV(x,z),[x/TERRAIN_TILE_METERS,z/TERRAIN_TILE_METERS]);
 assert.deepEqual(waterUV(x,z),[x/WATER_TILE_METERS,z/WATER_TILE_METERS]);
 assert.deepEqual(terrainUV(x,z),terrainUV(x,z),"tiles depend only on world position");
}
assert.deepEqual(terrainBiomeWeights({kind:"land",coastBeach:0},0),[0,0]);
assert.deepEqual(terrainBiomeWeights({kind:"land",coastBeach:.45},.2),[.45,.2]);
assert.deepEqual(terrainBiomeWeights({kind:"ocean",coastBeach:0},.3),[1,.3]);
assert.deepEqual(terrainBiomeWeights({kind:"land",coastBeach:0},1),[0,1]);
assert(TERRAIN_VERTEX_SHADER.includes("uv2")&&TERRAIN_FRAGMENT_SHADER.includes("sandSampler"));
assert(TERRAIN_FRAGMENT_SHADER.includes("vBiome.y"),"highland rock must not inherit grass coloration");
for(const seed of [12000,42]){
 const x=coastlineX(0,seed)+70,z=0,cx=Math.floor(x/CHUNK_SIZE),cz=0;
 const a=buildWaterSurface(cx,cz,(px,pz)=>waterAt(px,pz,seed),8);
 assert(a.positions.length>0);
 assert.equal(a.uvs.length,a.positions.length/3*2);
 for(let i=0;i<a.uvs.length;i+=2){
  const ix=i/2;
  const wx=a.positions[ix*3]+(cx+.5)*CHUNK_SIZE;
  const wz=a.positions[ix*3+2]+(cz+.5)*CHUNK_SIZE;
  assert(Math.abs(a.uvs[i]-wx/WATER_TILE_METERS)<1e-9);
  assert(Math.abs(a.uvs[i+1]-wz/WATER_TILE_METERS)<1e-9);
 }
}
console.log("PASS texture world UVs, seamless chunk mapping, beach/rock masks and water mesh coordinates");
