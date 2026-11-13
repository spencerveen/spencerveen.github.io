import {CHUNK_SIZE,ACTIVE_RADIUS,DETAIL_RADIUS,TERRAIN_SUBDIVISIONS,terrainHeight,
 forestObjects,forestAnimals,seededRandom,chunkCoord,chunkKey,validForestSite} from "./forest-generation.js?v=20261113i";
const B=globalThis.BABYLON;
const V=(x,y,z)=>new B.Vector3(x,y,z);

/**
 * 5×5 terrain meshes keep the horizons smooth; only the inner 3×3 area has
 * expensive props and wildlife. Chunks regenerate consistently from the seed.
 */
export class ForestChunks{
 constructor(world,seed){
  this.world=world;this.seed=seed>>>0;
  this.loaded=new Map();this.center=null;this.created=0;this.disposed=0;
 }
 heightAt(x,z){return terrainHeight(x,z,this.seed)}
 get status(){
  return {seed:this.seed,center:this.center?{...this.center}:null,
   loaded:this.loaded.size,detailed:[...this.loaded.values()].filter(c=>c.detailed).length,
   keys:[...this.loaded.keys()],created:this.created,disposed:this.disposed,
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
  this.loaded.set(key,{cx,cz,key,mesh,vegetation:[],detailed:false});
  this.created++;
 }
 showDetails(chunk){
  if(chunk.detailed)return;
  const world=this.world,{cx,cz,key}=chunk,scene=world.scene;
  for(const item of forestObjects(this.seed,cx,cz)){
   // Generated positions repeat, but harvesting changes persist by stable ID.
   // Never recreate a tree, mined rock or chopped bush that was removed.
   const status=world.getResourceStatus?.(item);
   if(status?.removed)continue;
   chunk.vegetation.push(world.decorate(item.resource,item.label,item.x,item.z,item.shape,key,item.id,status));
  }
  const rand=seededRandom(this.seed^0x7baf326,cx,cz);
  for(let i=0;i<13;i++){
   const x=cx*CHUNK_SIZE+1+rand()*(CHUNK_SIZE-2);
   const z=cz*CHUNK_SIZE+1+rand()*(CHUNK_SIZE-2);
   if(!validForestSite(x,z,3.7))continue;
   const tuft=B.MeshBuilder.CreateSphere("Forest grass tuft",{diameter:.18,segments:4},scene);
   tuft.position=V(x,this.heightAt(x,z)+.08,z);
   tuft.scaling=V(.8+rand()*.8,.65+rand()*.8,.5+rand()*.4);
   tuft.material=world.m.grass;tuft.isPickable=false;
   chunk.vegetation.push(tuft);
  }
  for(const animal of forestAnimals(this.seed,cx,cz))
   world.makeAnimal(animal.x,animal.z,key);
  chunk.detailed=true;
 }
 hideDetails(chunk){
  if(!chunk.detailed)return;
  const key=chunk.key,world=this.world;
  if(world.target?.chunkKey===key){
   world.target=null;world.path=[];
  }
  for(const element of chunk.vegetation)element.dispose(false,false);
  chunk.vegetation=[];
  world.entities=world.entities.filter(e=>e.chunkKey!==key);
  world.obstacles=world.obstacles.filter(e=>e.chunkKey!==key);
  for(const animal of world.animals.filter(a=>a.chunkKey===key))
   animal.node.dispose(false,false);
  world.animals=world.animals.filter(a=>a.chunkKey!==key);
  chunk.detailed=false;
 }
 /** Remove a felled tree, exhausted rock or cut-down bush immediately. */
 removeResource(resourceId,chunkKey){
  const world=this.world,chunk=this.loaded.get(chunkKey);
  const root=chunk?.vegetation.find(node=>node.metadata?.resourceId===resourceId);
  if(root){
   chunk.vegetation=chunk.vegetation.filter(node=>node!==root);
   root.dispose(false,false);
  }
  world.entities=world.entities.filter(e=>e.resourceId!==resourceId);
  world.obstacles=world.obstacles.filter(e=>e.resourceId!==resourceId);
  if(world.target?.resourceId===resourceId){world.target=null;world.path=[]}
 }
 /** Restore berry visuals when their clock-based regrowth timer expires. */
 refreshBerries(){
  const world=this.world;
  for(const chunk of this.loaded.values()){
   if(!chunk.detailed)continue;
   for(const root of chunk.vegetation){
    if(root.metadata?.shape!=="bush")continue;
    const status=world.getResourceStatus?.({id:root.metadata.resourceId,resource:"food"});
    const show=!status||status.remaining>0;
    for(const berry of root.metadata.berryMeshes||[])
     if(berry.isEnabled()!==show)berry.setEnabled(show);
   }
  }
 }
 remove(key){
  const chunk=this.loaded.get(key);
  if(!chunk)return;
  this.hideDetails(chunk);
  chunk.mesh.dispose(false,false);
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
  for(const chunk of this.loaded.values()){
   const delta=Math.max(Math.abs(chunk.cx-current.cx),Math.abs(chunk.cz-current.cz));
   if(delta<=DETAIL_RADIUS)this.showDetails(chunk);
   else this.hideDetails(chunk);
  }
 }
}
