import assert from "node:assert/strict";
import {
 CHUNK_SIZE,ACTIVE_RADIUS,DETAIL_RADIUS,terrainHeight,forestObjects,forestAnimals,
 chunkCoord,chunkKey
} from "../js/forest-generation.js";

assert.equal(CHUNK_SIZE,32);
assert.equal(ACTIVE_RADIUS,2);
assert.equal(DETAIL_RADIUS,1);
assert.deepEqual(chunkCoord(-.01,-32.01),{cx:-1,cz:-2});
assert.deepEqual(chunkCoord(0,32),{cx:0,cz:1});
const seeds=[12000,1337,72031,987654321];
for(const seed of seeds){
 // Terrain is one continuous deterministic function, including chunk seams.
 for(let x=-200;x<=200;x+=13)
  for(let z=-200;z<=200;z+=17){
   const h=terrainHeight(x,z,seed);
   assert(Number.isFinite(h)&&Math.abs(h)<10,"forest terrain must remain walkable");
   assert.equal(h,terrainHeight(x,z,seed),"same seed gives exact same height");
  }
 for(const coord of [-64,-32,0,32,64]){
  const h=terrainHeight(coord,18.2,seed);
  assert(Math.abs(terrainHeight(coord-1e-5,18.2,seed)-h)<.0005,"height matches at left chunk boundary");
  assert(Math.abs(terrainHeight(coord+1e-5,18.2,seed)-h)<.0005,"height matches at right chunk boundary");
 }
 const objects=new Set();
 for(let cx=-2;cx<=2;cx++)for(let cz=-2;cz<=2;cz++){
  const a=forestObjects(seed,cx,cz),b=forestObjects(seed,cx,cz);
  assert.deepEqual(a,b,"resource locations repeat when chunks reload");
  assert.deepEqual(forestAnimals(seed,cx,cz),forestAnimals(seed,cx,cz),"deer spawns repeat");
  for(const ob of a){
   assert.equal(Math.floor(ob.x/CHUNK_SIZE),cx,"resource stays in own chunk");
   assert.equal(Math.floor(ob.z/CHUNK_SIZE),cz,"resource stays in own chunk");
   assert(!objects.has(ob.id),"no cross-chunk duplicated resource ids");
   objects.add(ob.id);
  }
 }
 assert(objects.size>140,"forest should have abundant gathered resources");
}
assert.notEqual(terrainHeight(100,200,1337),terrainHeight(100,200,1338),"different seeds change hills");
assert.notDeepEqual(forestObjects(1,4,-3),forestObjects(2,4,-3),"different seeds change gathering sites");

const initial=[...Array(3)].flatMap((_,i)=>[...Array(3)].flatMap((__,j)=>forestObjects(12000,i-1,j-1)));
for(const kind of ["wood","stone","food"])
 assert(initial.some(obj=>obj.resource===kind),"starter clearing must provide "+kind);
assert(Math.abs(terrainHeight(0,0,12000)-.18)<.001,"settlement starts on flat terrain");

// A strict scene mock checks streaming invariants without requiring WebGL.
class FakeMesh {
 constructor(name){this.name=name;this.position={x:0,y:0,z:0};this.scaling={x:1,y:1,z:1};this.disposed=false}
 getVerticesData(){return [0,0,0,-16,0,-16,16,0,-16,-16,0,16,16,0,16]}
 getIndices(){return [0,1,2,1,3,2]}
 updateVerticesData(){}
 refreshBoundingInfo(){}
 dispose(){this.disposed=true}
}
globalThis.BABYLON={
 Vector3:class {constructor(x,y,z){this.x=x;this.y=y;this.z=z}},
 MeshBuilder:{
  CreateGround:(name)=>new FakeMesh(name),
  CreateSphere:(name)=>new FakeMesh(name)
 },
 VertexBuffer:{PositionKind:"pos",NormalKind:"norm"},
 VertexData:{ComputeNormals:(positions,indices,normals)=>{for(let i=0;i<positions.length;i++)normals.push(0,1,0)}}
};
const {ForestChunks}=await import("../js/forest-chunks.js");
const disposed=[],world={
 scene:{},entities:[],obstacles:[],animals:[],m:{earth:{},grass:{}},
 decorate(resource,label,x,z,shape,key){
  const node={name:label,disposed:false,dispose(){this.disposed=true;disposed.push(label)}};
  this.entities.push({x,z,chunkKey:key});
  if(shape!=="bush")this.obstacles.push({x,z,chunkKey:key});
  return node;
 },
 makeAnimal(x,z,key){
  const node={position:{},dispose(){disposed.push("deer")}};
  this.animals.push({node,chunkKey:key});
 }
};
const manager=new ForestChunks(world,1337);
manager.update(0,0);
assert.equal(manager.loaded.size,25,"load 5×5 visible terrain chunks");
assert.equal(manager.status.detailed,9,"detail only the inner 3×3 forest chunks");
const counts={entities:world.entities.length,obstacles:world.obstacles.length,animals:world.animals.length};
manager.update(1,1);
assert.equal(manager.created,25,"same-chunk movement doesn't regenerate meshes");
manager.update(64,0);
assert.equal(manager.loaded.size,25,"moving away unloads distant terrain chunks");
assert.equal(manager.status.detailed,9,"detail window remains bounded");
assert(manager.disposed>0&&disposed.length>0,"meshes are disposed");
assert(manager.created>25,"new chunks appear");
assert(!manager.loaded.has(chunkKey(-1,-1)),"faraway chunks no longer remain in memory");
manager.update(0,0);
assert.equal(manager.loaded.size,25);
assert.equal(manager.status.detailed,9);
assert.deepEqual(forestObjects(1337,0,0),forestObjects(1337,0,0));
assert.equal(world.entities.length,counts.entities,"resource meshes don't accumulate after returning home");
assert.equal(world.obstacles.length,counts.obstacles,"colliders don't leak after streaming");
assert.equal(world.animals.length,counts.animals,"deer don't accumulate after streaming");
console.log("PASS seeded forest: continuous terrain, repeatable resources, 25 visible terrain chunks and 9 detailed chunks, streaming cleanup, village-safe starter");
