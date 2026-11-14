import {CHUNK_SIZE,ACTIVE_RADIUS,DETAIL_RADIUS,TERRAIN_SUBDIVISIONS,terrainHeight,
 forestObjects,forestAnimals,seededRandom,chunkCoord,chunkKey,validForestSite} from "./forest-generation.js?v=20261114hunt1";
import {waterAt,waterTerrainHeight} from "./water-generation.js?v=20261114beaches2";
import {tribeAtChunk,TRIBE_CLEARING_RADIUS} from "./tribes.js?v=20261114watershed3";
import {terrainAppearanceAt,mountainOutcropSites,mountainHabitat} from "./mountain-appearance.js?v=20261114beaches2";
import {mountainAt} from "./mountain-generation.js?v=20261114watershed3";
import {beachAt,beachFlintSites} from "./beach-generation.js?v=20261114beaches1";
import {terrainUV,waterUV,terrainBiomeWeights} from "./terrain-textures.js?v=20261114textures1";
import {fishSites} from "./fishing.js?v=20261114fish1";
const B=globalThis.BABYLON;
const V=(x,y,z)=>new B.Vector3(x,y,z);

/**
 * 5×5 terrain meshes keep the horizons smooth; only the inner 3×3 area has
 * expensive props and wildlife. Chunks regenerate consistently from the seed.
 */
// Construct actual shoreline geometry rather than blending a broad transparent
// grid over dry land. This is pure data so river rendering can be unit tested.
export function buildWaterSurface(cx,cz,sampleAt,subdivisions=32){
 const steps=Math.max(4,Math.floor(subdivisions));
 const spacing=CHUNK_SIZE/steps;
 const minX=cx*CHUNK_SIZE,minZ=cz*CHUNK_SIZE;
 const centerX=minX+CHUNK_SIZE/2,centerZ=minZ+CHUNK_SIZE/2;
 const threshold=.025;
 const nodes=[];
 for(let iz=0;iz<=steps;iz++){
  const row=[];
  for(let ix=0;ix<=steps;ix++){
   const wx=minX+ix*spacing,wz=minZ+iz*spacing;
   const sample=sampleAt(wx,wz);
   row.push({x:wx-centerX,z:wz-centerZ,
    y:sample.surfaceY+.025,d:sample.depth,o:sample.kind==="ocean"?1:0});
  }
  nodes.push(row);
 }
 const positions=[],colors=[],uvs=[],indices=[];
 const blend=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,
  y:a.y+(b.y-a.y)*t,d:threshold,o:a.o+(b.o-a.o)*t});
 const clip=(triangle)=>{
  const polygon=[];
  for(let i=0;i<3;i++){
   const a=triangle[i],b=triangle[(i+1)%3];
   const wetA=a.d>threshold,wetB=b.d>threshold;
   if(wetA)polygon.push(a);
   if(wetA!==wetB)polygon.push(blend(a,b,(threshold-a.d)/(b.d-a.d)));
  }
  if(polygon.length<3)return;
  const base=positions.length/3;
  for(const p of polygon){
   const deep=Math.max(0,Math.min(1,p.d/2));
   positions.push(p.x,p.y,p.z);
   uvs.push(...waterUV(p.x+centerX,p.z+centerZ));
   // Ocean teal in shallows fading toward deeper marine blue. One mesh and
   // material can contain both ocean and river triangles at an estuary.
   const ocean=p.o||0;
   const far=Math.max(0,Math.min(1,p.d/8));
   colors.push((1.04-deep*.28)*(1-ocean)+ocean*(.89-far*.24),
    (1.06-deep*.19)*(1-ocean)+ocean*(1.15-far*.26),
    (1.03-deep*.04)*(1-ocean)+ocean*(1.28-far*.18),
    .84+deep*.13);
  }
  for(let i=1;i<polygon.length-1;i++)indices.push(base,base+i,base+i+1);
 };
 for(let iz=0;iz<steps;iz++)for(let ix=0;ix<steps;ix++){
  const a=nodes[iz][ix],b=nodes[iz+1][ix];
  const c=nodes[iz][ix+1],d=nodes[iz+1][ix+1];
  // Counterclockwise from above (+Y). The same edge samples are reused on
  // both sides of every chunk seam, including negative world coordinates.
  clip([a,b,c]);
  clip([c,b,d]);
 }
 return {positions,colors,uvs,indices};
}

export class ForestChunks{
 constructor(world,seed){
  this.world=world;this.seed=seed>>>0;
  this.loaded=new Map();this.center=null;this.created=0;this.disposed=0;
  this.protectedSites=Array.isArray(world.waterSafeSites)?[...world.waterSafeSites]:[];
  this.mountainProtectedSites=Array.isArray(world.mountainSafeSites)?[...world.mountainSafeSites]:[];
  this.oceanProtectedSites=Array.isArray(world.oceanSafeSites)?[...world.oceanSafeSites]:[];
 }
 heightAt(x,z){return waterTerrainHeight(x,z,this.seed,this.protectedSites,this.mountainProtectedSites,this.oceanProtectedSites)}
 waterAt(x,z){return waterAt(x,z,this.seed,this.protectedSites,this.mountainProtectedSites,this.oceanProtectedSites)}
 refreshProtectedSites(cx,cz){
  // The landscape must dictate new tribe locations, not vice versa.
  // Only historically discovered tribes preserve their old terrain carving.
  const sites=[...(this.world.waterSafeSites||[])];
  const oldTribes=[];
  const mountainSites=[...(this.world.mountainSafeSites||[])];
  const oceanSites=[...(this.world.oceanSafeSites||[])];
  for(let dx=-5;dx<=5;dx++)for(let dz=-5;dz<=5;dz++){
   const tx=cx+dx,tz=cz+dz;
   const record=this.world.getTribeRecord?.("tribe:"+chunkKey(tx,tz));
   if(!record||record.placementVersion===2)continue;
   const tribe=tribeAtChunk(this.seed,tx,tz,true);
   if(!tribe)continue;
   oldTribes.push({x:tribe.x,z:tribe.z,id:tribe.id});
   sites.push({x:tribe.x,z:tribe.z,radius:10});
   mountainSites.push({x:tribe.x,z:tribe.z,radius:14});
   oceanSites.push({x:tribe.x,z:tribe.z,radius:15});
  }
  this.legacyTribeSites=oldTribes;
  this.protectedSites=sites;
  this.mountainProtectedSites=mountainSites;
  this.oceanProtectedSites=oceanSites;
 }
 get status(){
  return {seed:this.seed,center:this.center?{...this.center}:null,
   loaded:this.loaded.size,detailed:[...this.loaded.values()].filter(c=>c.detailed).length,
   keys:[...this.loaded.keys()],created:this.created,disposed:this.disposed,
   resources:this.world.entities.length,animals:this.world.animals.length,
   waterChunks:[...this.loaded.values()].filter(c=>!!c.waterMesh).length,
   oceanChunks:[...this.loaded.values()].filter(c=>c.hasOcean).length};
 }
 create(cx,cz){
  const world=this.world,key=chunkKey(cx,cz),scene=world.scene;
  const x=(cx+.5)*CHUNK_SIZE,z=(cz+.5)*CHUNK_SIZE;
  const mesh=B.MeshBuilder.CreateGround("Forest terrain ["+key+"]",
   {width:CHUNK_SIZE,height:CHUNK_SIZE,subdivisions:TERRAIN_SUBDIVISIONS,updatable:true},scene);
  mesh.position=V(x,0,z);
  const positions=mesh.getVerticesData(B.VertexBuffer.PositionKind);
  const terrainColors=[],terrainUVs=[],biomeUVs=[],waterSamples=[];
  for(let i=0;i<positions.length;i+=3){
   const sample=this.waterAt(x+positions[i],z+positions[i+2]);
   positions[i+1]=sample.depth>0?sample.bedY:sample.surfaceY-.055;
   waterSamples.push(sample);
  }
  const normals=[];
  B.VertexData.ComputeNormals(positions,mesh.getIndices(),normals);
  for(let i=0;i<positions.length;i+=3){
   const nx=normals[i]||0,ny=normals[i+1]??1,nz=normals[i+2]||0;
   const grade=Math.hypot(nx,nz)/Math.max(.08,Math.abs(ny));
   const wx=x+positions[i],wz=z+positions[i+2];
   const visual=terrainAppearanceAt(wx,wz,this.seed,
    this.mountainProtectedSites,waterSamples[i/3],grade);
   terrainColors.push(...visual.color);
   terrainUVs.push(...terrainUV(wx,wz));
   biomeUVs.push(...terrainBiomeWeights(waterSamples[i/3],visual.rock));
  }
  mesh.updateVerticesData(B.VertexBuffer.PositionKind,positions);
  mesh.updateVerticesData(B.VertexBuffer.NormalKind,normals);
  mesh.setVerticesData(B.VertexBuffer.UVKind,terrainUVs);
  mesh.setVerticesData(B.VertexBuffer.UV2Kind,biomeUVs);
  if(B.VertexBuffer.ColorKind&&mesh.setVerticesData){
   mesh.setVerticesData(B.VertexBuffer.ColorKind,terrainColors);
   mesh.useVertexColors=true;
  }
  mesh.refreshBoundingInfo();
  mesh.material=world.m.terrainSurface||world.m.earth;
  mesh.metadata={terrain:true,chunkKey:key};
  mesh.isPickable=true;
  // Clip the water surface to the actual wet portion of each square.
  // Triangles no longer stretch over dry land with interpolated alpha.
  const c=CHUNK_SIZE/2;
  const seaCorners=[[-c,-c],[-c,c],[c,-c],[c,c],[0,0]];
  const allOcean=seaCorners.every(([dx,dz])=>this.waterAt(x+dx,z+dz).kind==="ocean");
  // Low-poly open water; reserve detailed shoreline clipping for coastal chunks.
  const surface=buildWaterSurface(cx,cz,(wx,wz)=>this.waterAt(wx,wz),allOcean?8:32);
  let visibleWater=null;
  if(surface.indices.length){
   const waterMesh=new B.Mesh("Water ["+key+"]",scene);
   const data=new B.VertexData();
   data.positions=surface.positions;
   data.indices=surface.indices;
   data.colors=surface.colors;
   data.uvs=surface.uvs;
   data.normals=[];
   B.VertexData.ComputeNormals(data.positions,data.indices,data.normals);
   data.applyToMesh(waterMesh);
   waterMesh.position=V(x,0,z);
   waterMesh.useVertexColors=true;
   waterMesh.hasVertexAlpha=true;
   waterMesh.material=world.m.river;
   waterMesh.isPickable=false;
   // Do not use renderingGroupId=1: Babylon clears the depth buffer between
   // groups, putting translucent water in front of trees and characters.
   visibleWater=waterMesh;
  }
  this.loaded.set(key,{cx,cz,key,mesh,waterMesh:visibleWater,hasOcean:allOcean||
   seaCorners.some(([dx,dz])=>this.waterAt(x+dx,z+dz).kind==="ocean"),
   vegetation:[],detailed:false});
  this.created++;
 }
 showDetails(chunk){
  if(chunk.detailed)return;
  const world=this.world,{cx,cz,key}=chunk,scene=world.scene;
  const record=world.getTribeRecord?.("tribe:"+key);
  const candidate=world.spawnTribeCamp?
   tribeAtChunk(this.seed,cx,cz,!!record&&record.placementVersion!==2):null;
  const active=candidate&&world.isTribeSiteActive?.(candidate);
  const relocated=candidate&&world.getTribeRecord?.(candidate.id)?.status==="relocated";
  const dryTribe=candidate&&this.waterAt(candidate.x,candidate.z).depth<.12;
  // A new territory must not crowd an already-known historical camp.
  const spaced=candidate?.placementVersion!==2||
   (this.legacyTribeSites||[]).every(site=>
    Math.hypot(candidate.x-site.x,candidate.z-site.z)>=132);
  const tribe=active&&dryTribe&&spaced?candidate:null;
  const reservation=(active||relocated)&&dryTribe&&spaced?candidate:null;
  const withinCamp=(x,z,extra=0)=>reservation&&Math.hypot(x-reservation.x,z-reservation.z)<TRIBE_CLEARING_RADIUS+extra;
  const rawResources=forestObjects(this.seed,cx,cz);
  // Angular flint flakes are an independent, sparse coastal resource.
  // They share the normal harvesting, inventory and depletion machinery.
  const flintSites=beachFlintSites(this.seed,cx,cz);
  // Bedrock is decoration, not a new harvestable stone deposit or collider.
  const outcrops=mountainOutcropSites(this.seed,cx,cz,
   (px,pz)=>this.heightAt(px,pz),(px,pz)=>this.waterAt(px,pz),
   this.mountainProtectedSites,rawResources);
  for(const site of outcrops){
   if(withinCamp(site.x,site.z,3))continue;
   const rock=B.MeshBuilder.CreatePolyhedron("Mountain outcrop ["+key+"]",
    {type:2,size:1},scene);
   rock.position=V(site.x,site.y,site.z);
   rock.scaling=V(site.width,site.height,site.depth);
   rock.rotation=V(site.pitch,site.yaw,site.roll);
   rock.material=site.material?world.m.rockFaceLight:world.m.rockFaceDark;
   rock.isPickable=false;
   chunk.vegetation.push(rock);
  }
  const overlapsWater=(x,z,radius,centerWater=null)=>{
   if((centerWater||this.waterAt(x,z)).depth>.025)return true;
   for(let i=0;i<8;i++){
    const angle=i*Math.PI/4;
    if(this.waterAt(x+Math.cos(angle)*radius,z+Math.sin(angle)*radius).depth>.025)
     return true;
   }
   return false;
  };
  for(const item of [...rawResources,...flintSites]){
   const rootRadius=item.shape==="tree"?1.05:item.shape==="rock"?.95:.32;
   if(withinCamp(item.x,item.z))continue;
   const coastal=beachAt(item.x,item.z,this.seed);
   // Keep both trunks AND large canopies clear of dunes and wet sand.
   // Flint can occur only in the dry sandy band, not in the surf.
   if(item.shape==="flint"&&!coastal.flintZone)continue;
   if(item.shape!=="flint"&&coastal.vegetationClear)continue;
   const water=this.waterAt(item.x,item.z);
   if(item.shape==="flint"&&water.depth>.025)continue;
   const habitat=mountainHabitat(mountainAt(item.x,item.z,this.seed,
    this.mountainProtectedSites,water.corridorDistance).uplift);
   if((item.shape==="tree"&&!habitat.trees)||
      (item.shape==="bush"&&!habitat.berries)||
      overlapsWater(item.x,item.z,rootRadius,water))continue;
   // Depletion is keyed to deterministic flint/wood/stone/berry IDs.
   const status=world.getResourceStatus?.(item);
   if(status?.removed)continue;
   chunk.vegetation.push(world.decorate(item.resource,item.label,item.x,item.z,item.shape,key,item.id,status));
  }
  const rand=seededRandom(this.seed^0x7baf326,cx,cz);
  for(let i=0;i<13;i++){
   const x=cx*CHUNK_SIZE+1+rand()*(CHUNK_SIZE-2);
   const z=cz*CHUNK_SIZE+1+rand()*(CHUNK_SIZE-2);
   if(!validForestSite(x,z,3.7)||withinCamp(x,z)||
      beachAt(x,z,this.seed).vegetationClear)continue;
   const grassWater=this.waterAt(x,z);
   if(grassWater.depth>.04||
    !mountainHabitat(mountainAt(x,z,this.seed,this.mountainProtectedSites,
     grassWater.corridorDistance).uplift).grass)continue;
   const tuft=B.MeshBuilder.CreateSphere("Forest grass tuft",{diameter:.18,segments:4},scene);
   tuft.position=V(x,this.heightAt(x,z)+.08,z);
   tuft.scaling=V(.8+rand()*.8,.65+rand()*.8,.5+rand()*.4);
   tuft.material=world.m.grass;tuft.isPickable=false;
   chunk.vegetation.push(tuft);
  }
  for(const animal of forestAnimals(this.seed,cx,cz)){
   if(world.getWildlifeStatus?.(animal)?.looted)continue;
   if(withinCamp(animal.x,animal.z,2)||
      beachAt(animal.x,animal.z,this.seed).vegetationClear)continue;
   const animalWater=this.waterAt(animal.x,animal.z);
   if(animalWater.depth<.12&&
     mountainHabitat(mountainAt(animal.x,animal.z,this.seed,
      this.mountainProtectedSites,animalWater.corridorDistance).uplift).animals)
    world.makeAnimal(animal.x,animal.z,key,animal);
  }
  for(const site of fishSites(this.seed,cx,cz,(wx,wz)=>this.waterAt(wx,wz))){
   if(world.getFishCaught?.(site.id))continue;
   world.makeFish?.(site,key);
  }
  if(tribe)world.spawnTribeCamp(tribe,key);
  else if(relocated&&dryTribe)world.spawnAbandonedTribeCamp?.(candidate,key);
  chunk.detailed=true;
 }
 hideDetails(chunk){
  if(!chunk.detailed)return;
  const key=chunk.key,world=this.world;
  world.removeTribeCamp?.(key);
  world.removeAbandonedTribeCamp?.(key);
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
  for(const fish of world.fish.filter(f=>f.chunkKey===key))
   fish.root.dispose(false,false);
  world.fish=world.fish.filter(f=>f.chunkKey!==key);
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
  chunk.waterMesh?.dispose(false,false);
  this.loaded.delete(key);this.disposed++;
 }
 update(x,z){
  const current=chunkCoord(x,z);
  if(this.center&&this.center.cx===current.cx&&this.center.cz===current.cz)return;
  this.center=current;
  this.refreshProtectedSites(current.cx,current.cz);
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
