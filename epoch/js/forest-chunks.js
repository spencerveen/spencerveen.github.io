import {CHUNK_SIZE,ACTIVE_RADIUS,TERRAIN_SUBDIVISIONS,terrainHeight,
 forestObjects,forestAnimals,seededRandom,chunkCoord,chunkKey,validForestSite} from "./forest-generation.js?v=20261113h";
const B=globalThis.BABYLON;
const V=(x,y,z)=>new B.Vector3(x,y,z);

/** Load/unload only nearby seeded chunks; the forest exists independently
 * of the meshes currently in memory. Never touch player or village models. */
export class ForestChunks{
 constructor(world,seed){
  this.world=world;
  this.seed=(seed>>>0);
  this.loaded=new Map();
  this.center=null;
  this.created=0;
  this.disposed=0;
 }
 heightAt(x,z){return terrainHeight(x,z,this.seed)}
 get status(){
  return {seed:this.seed,center:this.center?{...this.center}:null,
   loaded:this.loaded.size,keys:[...this.loaded.keys()],created:this.created,disposed:this.disposed,
   resources:this.world.entities.length,animals:this.world.animals.length};
 }
 create(cx,cz){
  const world=this.world,key=chunkKey(cx,cz),scene=world.scene;
  const x=(cx+.5)*CHUNK_SIZE,z=(cz+.5)*CHUNK_SIZE;
  const mesh=B.MeshBuilder.CreateGround("Forest terrain ["+key+"]",
   {width:CHUNK_SIZE,height:CHUNK_SIZE,subdivisions:TERRAIN_SUBDIVISIONS,updatable:true},scene);
  mesh.position=V(x,0,z);
  const positions=mesh.getVerticesData(B.VertexBuffer.PositionKind);
  for(let i=0;i<positions.length;i+=3)
   positions[i+1]=this.heightAt(x+positions[i],z+positions[i+2]);
  const normals=[];
  B.VertexData.ComputeNormals(positions,mesh.getIndices(),normals);
  mesh.updateVerticesData(B.VertexBuffer.PositionKind,positions);
  mesh.updateVerticesData(B.VertexBuffer.NormalKind,normals);
  mesh.refreshBoundingInfo();
  mesh.material=world.m.earth;
  mesh.metadata={terrain:true,chunkKey:key};
  mesh.isPickable=true;
  const vegetation=[];
  const objects=forestObjects(this.seed,cx,cz);
  for(const desc of objects){
   const root=world.decorate(desc.resource,desc.label,desc.x,desc.z,desc.shape,key);
   vegetation.push(root);
  }
  const rng=seededRandom(this.seed^0x7baf326,cx,cz);
  for(let i=0;i<13;i++){
   const px=cx*CHUNK_SIZE+1+rng()*(CHUNK_SIZE-2);
   const pz=cz*CHUNK_SIZE+1+rng()*(CHUNK_SIZE-2);
   if(!validForestSite(px,pz,3.7))continue;
   const tuft=B.MeshBuilder.CreateSphere("Forest grass tuft",{diameter:.18,segments:4},scene);
   tuft.position=V(px,this.heightAt(px,pz)+.08,pz);
   tuft.scaling=V(.8+rng()*.8,.65+rng()*.8,.5+rng()*.4);
   tuft.material=world.m.grass;tuft.isPickable=false;
   vegetation.push(tuft);
  }
  const deer=forestAnimals(this.seed,cx,cz);
  for(const animal of deer)world.makeAnimal(animal.x,animal.z,key);
  this.loaded.set(key,{cx,cz,key,mesh,vegetation});
  this.created++;
 }
 remove(key){
  const chunk=this.loaded.get(key);
  if(!chunk)return;
  if(this.world.target?.chunkKey===key){
   this.world.target=null;this.world.path=[];
  }
  chunk.mesh.dispose(false,false);
  for(const element of chunk.vegetation)element.dispose(false,false);
  this.world.entities=this.world.entities.filter(e=>e.chunkKey!==key);
  this.world.obstacles=this.world.obstacles.filter(e=>e.chunkKey!==key);
  const animals=this.world.animals.filter(a=>a.chunkKey===key);
  for(const animal of animals)animal.node.dispose(false,false);
  this.world.animals=this.world.animals.filter(a=>a.chunkKey!==key);
  this.loaded.delete(key);this.disposed++;
 }
 update(x,z){
  const current=chunkCoord(x,z);
  if(this.center&&this.center.cx===current.cx&&this.center.cz===current.cz)return;
  this.center=current;
  const required=new Set();
  for(let dx=-ACTIVE_RADIUS;dx<=ACTIVE_RADIUS;dx++)
   for(let dz=-ACTIVE_RADIUS;dz<=ACTIVE_RADIUS;dz++){
    const cx=current.cx+dx,cz=current.cz+dz,key=chunkKey(cx,cz);
    required.add(key);
    if(!this.loaded.has(key))this.create(cx,cz);
   }
  for(const key of [...this.loaded.keys()])if(!required.has(key))this.remove(key);
 }
}
