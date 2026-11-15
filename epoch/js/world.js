import {founderAppearance,randomAppearance,normalizeAppearance} from "./characters.js?v=20261113k";
import {createQuaterniusHuman} from "./quaternius-models.js?v=20261114swimanim1";
import {BUILDINGS} from "./settlement.js?v=20261114u";
import {choosePlacement,placementCheck} from "./village-placement.js?v=20261114y";
import {stockpileValidation,nearStockpile,stockpileSpace,LEGACY_HOME,BUILD_GRID} from "./stockpile.js?v=20261114fish1";
import {createStockpileWorld,syncStockpileWorld,showStockpilePreview} from "./stockpile-world.js?v=20261114b";
import {createVillageWorld,syncVillageWorld,showVillagePreview} from "./village-world.js?v=20261114u";
import {STARTER_SEED,terrainHeight,chunkCoord,chunkKey} from "./forest-generation.js?v=20261114view2";
import {ForestChunks} from "./forest-chunks.js?v=20261114flint1";
import {findVillagerWork,JOB_SPEED,JOB_WORK_SECONDS} from "./villager-jobs.js?v=20261114jobs2";
import {normalizeCargo,normalizeHaulPosition,cargoCount,landRoute,HAUL_WATER_DEPTH} from "./villager-hauling.js?v=20261114haul1";
import {setupSurfaceTextures} from "./terrain-textures.js?v=20261114sky1";
import {createSkyAtmosphere} from "./sky-atmosphere.js?v=20261114twilight1";
import {SWIM,isSwimmingDepth,swimCost} from "./swimming.js?v=20261114watershed3";
import {createTribeWorld} from "./tribe-world.js?v=20261114watershed3";
import {TRIBE_DISCOVERY_RANGE,TRIBE_INTERACT_RANGE,tribeCampIsActive} from "./tribes.js?v=20261114watershed3";
import {WILDLIFE,animalMotion,WILDLIFE_ATTACK_COOLDOWN,
 BOAR_ATTACK_COOLDOWN,HUNT_DISTANCE_BUFFER} from "./hunting.js?v=20261114hunt1";
import {FISH_SPEAR_REACH} from "./fishing.js?v=20261114fish1";
const B=globalThis.BABYLON;
const V=(x,y,z)=>new B.Vector3(x,y,z);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class World {
 constructor(canvas,onGather,onStatus,onBuildingSelect=()=>{},seed=STARTER_SEED,getResourceStatus=()=>null,onFoundStockpile=()=>false,onOpenStockpile=()=>{},onBuild=()=>({ok:false}),getBuildStatus=()=>({ok:false}),onPlacementChange=()=>{},tribeHandlers={}){
  this.canvas=canvas;this.onGather=onGather;this.onStatus=onStatus;this.getResourceStatus=getResourceStatus;this.onFoundStockpile=onFoundStockpile;this.onOpenStockpile=onOpenStockpile;this.onBuild=onBuild;this.getBuildStatus=getBuildStatus;this.onPlacementChange=onPlacementChange;this.worldSeed=seed>>>0;
  this.onTribeDiscover=tribeHandlers.onDiscover||(()=>{});
  this.onTribeInteract=tribeHandlers.onInteract||(()=>{});
  this.onResidentSelect=tribeHandlers.onResidentSelect||(()=>{});
  this.onVillagerCollect=tribeHandlers.onVillagerCollect||(()=>({ok:false}));
  this.onVillagerDeliver=tribeHandlers.onVillagerDeliver||(()=>({ok:false}));
  this.getWildlifeStatus=tribeHandlers.getWildlifeStatus||(()=>null);
  this.onWildlifeHunt=tribeHandlers.onWildlifeHunt||(()=>({ok:false,reason:"Hunting unavailable."}));
  this.onWildlifeHarvest=tribeHandlers.onWildlifeHarvest||(()=>({ok:false,reason:"Harvest unavailable."}));
  this.onWildlifeDamage=tribeHandlers.onWildlifeDamage||(()=>false);
  this.getFishCaught=tribeHandlers.getFishCaught||(()=>false);
  this.onFishCatch=tribeHandlers.onFishCatch||(()=>({ok:false,reason:"Fishing unavailable."}));
  this.spendSprint=tribeHandlers.spendSprint||(()=>true);
  this.spendSwim=tribeHandlers.spendSwim||tribeHandlers.spendSprint||(()=>true);
  this.getVitals=tribeHandlers.getVitals||(()=>({health:100,gameOver:false}));
  this.getTribeRecord=tribeHandlers.getRecord||(()=>null);
  this.getTribeHome=tribeHandlers.getHome||(()=>null);
  // Migration snapshots, not current player construction, keep legacy saves
  // safe without moving rivers every time a new Hut is built.
  this.waterSafeSites=tribeHandlers.getWaterSafeSites?.()||[];
  this.mountainSafeSites=tribeHandlers.getMountainSafeSites?.()||[];
  this.oceanSafeSites=tribeHandlers.getOceanSafeSites?.()||[];
  this.discoveredTribes=new Set();this.tribeTarget=null;
  this.keys={};this.path=[];this.target=null;this.plotTarget=null;this.entities=[];this.obstacles=[];this.animals=[];this.fish=[];this.people=[];this.walkTime=0;this.cooldown=0;this.berryClock=0;this.targetAction="gather";this.onPlot=onBuildingSelect;this.placingBuilding=null;this.buildingCandidate=null;this.village=null;this.placingStockpile=false;this.stockpileTarget=false;this.stockpile=null;this.stockpileCandidate=null;this.homePositionKey=null;
  this._inputBlocked=false;this.placementPinned=false;this.cameraDragging=false;this.focusTarget=null;
  this.cameraKeys={};this.cameraOrbitVelocity={horizontal:0,vertical:0};
  this.stockpileInRange=undefined;this.onInteractionRangeChange=()=>{};this.hoveredInteraction=null;this.waterNoticeCooldown=0;
  this.swimExhausted=false;this.waterMotion="land";this.onWaterModeChange=()=>{};
  this.huntCooldown=0;this.boarCooldown=0;
  this.engine=new B.Engine(canvas,true,{antialias:true,stencil:true,preserveDrawingBuffer:false});
  this.scene=new B.Scene(this.engine);this.scene.clearColor=new B.Color4(.62,.71,.62,1);
  // Let distant trees and coastlines remain visible across the wider streamed area.
   // Keep this in sync with the terrain texture shader's fogDensity uniform.
   this.scene.fogMode=B.Scene.FOGMODE_EXP2;this.scene.fogDensity=.009;this.scene.fogColor=new B.Color3(.62,.71,.62);
  this.makeMaterials();this.makeGround();this.makeLight();
  this.skyAtmosphere=createSkyAtmosphere(B,this.scene,this);
  createTribeWorld(this,(scene,member,tribe)=>createQuaterniusHuman(scene,
   randomAppearance("epoch:wilderness:"+this.worldSeed+":"+member.id,member.sex),null,member.name));
  this.makeLandscape();createVillageWorld(this,onBuildingSelect);createStockpileWorld(this);this.makePlayer();this.makeVillagers();this.makeCamera();this.bindInput();
  this.engine.runRenderLoop(()=>{const dt=Math.min(.045,this.engine.getDeltaTime()/1000);this.update(dt);this.scene.render()});
  window.addEventListener("resize",()=>this.engine.resize());
 }
 get inputBlocked(){return !!this._inputBlocked}
 set inputBlocked(value){
  const blocked=!!value;
  if(blocked===this._inputBlocked)return;
  this._inputBlocked=blocked;
  if(blocked){
   this.keys={};this.resetCameraKeys();this.path=[];this.target=null;this.tribeTarget=null;this.plotTarget=null;this.stockpileTarget=false;this.cameraDragging=false;
   if(this.cameraPointerId!=null&&this.canvas.hasPointerCapture?.(this.cameraPointerId))
    this.canvas.releasePointerCapture(this.cameraPointerId);
   this.cameraPointerId=null;
   this.camera?.detachControl();
   if(this.camera){this.camera.inertialAlphaOffset=0;this.camera.inertialBetaOffset=0;this.camera.inertialRadiusOffset=0;}
   if(this.canvas)this.canvas.style.cursor="default";
  }else if(this.camera){
   // Configure the orbit button before reattaching after a modal closes.
   if(this.camera.inputs.attached.pointers)this.camera.inputs.attached.pointers.buttons=[2];
   this.camera.attachControl(this.canvas,true);
  }
 }
 groundY(x,z){return this.terrain?this.terrain.heightAt(x,z):terrainHeight(x,z,this.worldSeed)}
 mat(name,hex){const m=new B.StandardMaterial(name,this.scene);m.diffuseColor=B.Color3.FromHexString(hex);m.specularColor=new B.Color3(.035,.045,.035);return m}
 makeMaterials(){
  this.m={earth:this.mat("earth","#52694a"),soil:this.mat("soil","#6b5840"),wood:this.mat("wood","#6b4e35"),woodLight:this.mat("woodLight","#9d8156"),
   leaves:this.mat("leaves","#365c3b"),leaves2:this.mat("leaves2","#4d7850"),leafBright:this.mat("leafBright","#638455"),
   stone:this.mat("stone","#889089"),stoneDark:this.mat("stoneDark","#5b6661"),berries:this.mat("berries","#9d3832"),
   skin:this.mat("skin","#c99470"),hair:this.mat("hair","#3f3328"),cloth:this.mat("cloth","#806445"),
   river:this.mat("river","#4b8190"),fire:this.mat("fire","#ef9c45"),flame:this.mat("flame","#f6d181"),grass:this.mat("grass","#74986b"),
   flint:this.mat("flint","#626e71"),flintEdge:this.mat("flint edge","#9aa39b"),
   fishBody:this.mat("silver river fish","#8bb2a1"),fishFin:this.mat("fish fins","#466b73")};
  this.m.terrainSurface=this.mat("Layered mountain terrain","#ffffff");
  this.m.terrainSurface.specularColor=new B.Color3(.016,.017,.016);
  this.m.rockFaceDark=this.mat("Exposed mountain stone","#686d69");
  this.m.rockFaceLight=this.mat("Weathered highland stone","#89877e");
  this.m.river.alpha=.93;this.m.river.backFaceCulling=false;
  this.m.river.specularColor=new B.Color3(.19,.25,.27);
  this.m.river.specularPower=48;
  this.m.river.emissiveColor=new B.Color3(.025,.045,.05);
  setupSurfaceTextures(B,this.scene,this.m);
  this.m.fire.emissiveColor=new B.Color3(.76,.28,.04);this.m.flame.emissiveColor=new B.Color3(.95,.63,.2);
 }
 makeGround(){
  // Chunk geometry is managed independently from the permanent village,
  // characters and camera. The world has no fixed outer boundaries.
  this.terrain=new ForestChunks(this,this.worldSeed);
 }
 makeLight(){
  const hemi=new B.HemisphericLight("soft sky",V(0,1,0),this.scene);hemi.intensity=.77;hemi.groundColor=new B.Color3(.32,.37,.29);
  const sun=new B.DirectionalLight("sun",V(-.5,-1,.4),this.scene);sun.intensity=.85;sun.diffuse=new B.Color3(1,.91,.75);
  this.skyHemi=hemi;this.skySun=sun;
 }
 primitive(kind,name,parent,pos,sc,mat){
  const mesh=kind==="sphere"?B.MeshBuilder.CreateSphere(name,{diameter:1,segments:8},this.scene):
   kind==="cylinder"?B.MeshBuilder.CreateCylinder(name,{height:1,diameter:1,tessellation:8},this.scene):
   B.MeshBuilder.CreateBox(name,{size:1},this.scene);
  mesh.parent=parent;mesh.position=V(...pos);mesh.scaling=V(...sc);mesh.material=mat;return mesh
 }
 decorate(resource,label,x,z,shape,chunkKey=null,resourceId=null,status=null){
  const parent=new B.TransformNode(label,this.scene);
  parent.position=V(x,this.groundY(x,z),z);
  parent.metadata={resourceId,shape,chunkKey,berryMeshes:[]};
  const mark=(mesh)=>{mesh.metadata={resource,label,x,z,chunkKey,resourceId,shape};
   this.entities.push({mesh,parent,resource,label,x,z,chunkKey,resourceId,shape})};
  if(shape==="tree"){
   const trunk=this.primitive("cylinder","tree trunk",parent,[0,1.35,0],[.55,2.7,.55],this.m.wood);mark(trunk);
   for(const [dx,dy,dz,s] of [[0,3.2,0,2.35],[-.8,2.8,.3,1.65],[.75,2.7,-.2,1.85],[.1,3.9,.15,1.45]]){
    const leaf=this.primitive("sphere","tree canopy",parent,[dx,dy,dz],[s,s*.85,s],(dx>0)?this.m.leaves2:this.m.leaves);mark(leaf);
   }
   this.obstacles.push({x,z,r:.75,chunkKey,resourceId});
  } else if(shape==="flint"){
   // Small angular flint fragments, not a full-sized boulder or bush.
   // Pickable but not collidable, so coast and mountain exploration stay smooth.
   const shard=B.MeshBuilder.CreatePolyhedron("flint shard",
    {type:1,size:1},this.scene);
   shard.parent=parent;
   shard.position=V(0,.21,0);
   shard.scaling=V(.48,.27,.37);
   shard.rotation=V(.23,(x+z)*.17,.14);
   shard.material=this.m.flint;mark(shard);
   const flake=B.MeshBuilder.CreatePolyhedron("flint flake",
    {type:2,size:1},this.scene);
   flake.parent=parent;flake.position=V(.27,.09,.15);
   flake.scaling=V(.23,.14,.31);
   flake.rotation=V(.1,(x-z)*.23,.3);
   flake.material=this.m.flintEdge;mark(flake);
  } else if(shape==="rock"){
   const stone=this.primitive("sphere","stone deposit",parent,[0,.47,0],[1.3,.9,1.15],this.m.stone);mark(stone);
   const small=this.primitive("sphere","stone shard",parent,[.56,.25,.42],[.53,.44,.62],this.m.stoneDark);mark(small);
   this.obstacles.push({x,z,r:.74,chunkKey,resourceId});
  } else {
   for(const [dx,dz] of [[0,0],[.4,.17],[-.28,.3]]){
    const bush=this.primitive("sphere","berry bush",parent,[dx,.42,dz],[.8,.75,.8],this.m.leafBright);mark(bush);
   }
   for(const [dx,dy,dz] of [[-.3,.6,.2],[.27,.57,-.2],[0,.84,.28]]){
    const berry=this.primitive("sphere","red berries",parent,[dx,dy,dz],[.17,.15,.17],this.m.berries);
    mark(berry);parent.metadata.berryMeshes.push(berry);
    if(status&&status.remaining<=0)berry.setEnabled(false);
   }
  }
  return parent;
 }
 makeLandscape(){
  // The founding village and the original gathering-resource silhouettes
  // remain. Positions outside it are generated from the persistent seed.
  this.terrain.update(0,0);
 }
 makePlayer(){
  // The stable root represents the world actor; visual meshes can be replaced
  // at runtime without affecting movement, cameras, or collision.
  this.player=new B.TransformNode("player actor",this.scene);
  this.player.position=V(0,this.groundY(0,0),0);
  this.applyAppearance(founderAppearance());
 }
 applyAppearance(appearance){
  const p=normalizeAppearance(appearance),key=JSON.stringify(p);
  if(this.character && key===this.appearanceKey)return;
  if(this.character)this.character.dispose();
  this.character=createQuaterniusHuman(this.scene,p,this.player,"adventurer");
  this.appearanceKey=key;
 }
 makeVillagers(){
  // A new game has no strangers wandering around: only save-backed residents
  // are instantiated, excluding the player character.
  this.people=[];
 }
 makeResidentNameplate(human,resident){
  const name=resident.name,scene=this.scene;
  const panel=B.MeshBuilder.CreatePlane("Village resident: "+name,{width:1.9,height:.41},scene);
  panel.parent=human.root;panel.position=V(0,2.37,0);
  panel.billboardMode=B.Mesh.BILLBOARDMODE_ALL;
  const texture=new B.DynamicTexture("Resident label "+resident.id,{width:384,height:90},scene,false);
  texture.hasAlpha=true;
  const ctx=texture.getContext();
  ctx.clearRect(0,0,384,90);ctx.fillStyle="rgba(16,31,22,.92)";ctx.fillRect(2,2,380,86);
  ctx.strokeStyle="#b4a076";ctx.lineWidth=2;ctx.strokeRect(3,3,378,84);
  ctx.font="bold 32px Arial";ctx.fillStyle="#f0e6d0";ctx.textAlign="center";
  ctx.fillText(name,192,57,356);texture.update();
  const material=new B.StandardMaterial("Resident label "+resident.id,scene);
  material.diffuseTexture=texture;material.emissiveTexture=texture;
  material.diffuseColor=B.Color3.White();material.emissiveColor=B.Color3.White();
  material.specularColor=B.Color3.Black();material.useAlphaFromDiffuseTexture=true;
  material.backFaceCulling=false;material.disableLighting=true;
  panel.material=material;panel.metadata={residentId:resident.id};panel.isPickable=true;
  panel.onDisposeObservable.addOnce(()=>{material.dispose();texture.dispose()});
 }
 /** Low-poly packs make carried supplies visible on the character's back.
  * The payload comes only from the save-backed resident cargo manifest.
  */
 syncVillagerCargo(person){
  const cargo=normalizeCargo(person.cargo);
  const types=Object.keys(cargo).sort();
  const signature=types.join("|");
  if(!types.length){
   if(person.cargoVisual)person.cargoVisual.setEnabled(false);
   return;
  }
  if(person.cargoVisual&&person.cargoKind===signature){
   person.cargoVisual.setEnabled(true);return;
  }
  if(person.cargoVisual)person.cargoVisual.dispose(false,false);
  const pack=new B.TransformNode("Cargo carried by "+person.name,this.scene);
  pack.parent=person.human.root;pack.position=V(-.18,1.18,-.42);
  const addBox=(name,pos,scale,material)=>{
   const mesh=B.MeshBuilder.CreateBox(name,{size:1},this.scene);
   mesh.parent=pack;mesh.position=V(...pos);mesh.scaling=V(...scale);
   mesh.material=material;mesh.isPickable=false;return mesh;
  };
  const addSphere=(name,pos,scale,material)=>{
   const mesh=B.MeshBuilder.CreateSphere(name,{segments:6,diameter:1},this.scene);
   mesh.parent=pack;mesh.position=V(...pos);mesh.scaling=V(...scale);
   mesh.material=material;mesh.isPickable=false;return mesh;
  };
  const primary=types.includes("wood")?"wood":types.includes("stone")?"stone":
   types.includes("berries")?"berries":types.includes("fish_meat")?"fish_meat":
   types.includes("animal_meat")?"animal_meat":types[0];
  const frame=addBox("Woven villager carrying basket",[0,-.07,0],[.72,.51,.48],this.m.woodLight);
  frame.rotation.z=.08;
  for(const x of [-.29,.29]){
   addBox("Cargo basket rim",[x,.19,0],[.07,.08,.54],this.m.wood);
  }
  if(primary==="wood"){
   for(const [i,x] of [-.2,0,.2].entries()){
    const log=B.MeshBuilder.CreateCylinder("Carried timber "+i,{height:.78,diameter:.18,tessellation:7},this.scene);
    log.parent=pack;log.position=V(x,.31,0);log.rotation.x=Math.PI/2;
    log.material=this.m.wood;log.isPickable=false;
   }
  }else if(primary==="stone"){
   for(const [x,y,z,size] of [[-.17,.22,0,.31],[.15,.25,-.05,.27],[0,.43,.09,.25]])
    addSphere("Carried stone",[x,y,z],[size,size*.78,size*.86],this.m.stoneDark);
  }else if(primary==="berries"){
   for(const [x,z] of [[-.22,-.11],[0,.12],[.23,-.06],[-.02,-.13]])
    addSphere("Foraged berries",[x,.30,z],[.18,.17,.17],this.m.berries);
  }else if(primary==="fish_meat"){
   for(const x of [-.17,.14]){
    const fish=addSphere("Caught fish",[x,.30,0],[.16,.17,.48],this.m.fishBody);
    fish.rotation.x=.22;
   }
  }else{
   addSphere("Hauled supplies",[0,.25,0],[.39,.33,.29],
    primary==="animal_meat"?this.m.berries:this.m.cloth);
  }
  person.cargoVisual=pack;
  person.cargoKind=signature;
 }
 syncVillagers(village){
  const residents=(village?.residents||[]).slice(0,60);
  const wanted=new Set(residents.map(v=>v.id));
  for(const prior of this.people.filter(p=>!wanted.has(p.id))){
   prior.cargoVisual?.dispose(false,false);
   prior.human.dispose();
  }
  const previous=new Map(this.people.filter(p=>wanted.has(p.id)).map(p=>[p.id,p]));
  const camp=village?.stockpile||LEGACY_HOME;
  const huts=new Map((village?.buildings||[]).filter(b=>b.kind==="family").map(b=>[b.id,b]));
  const homeCounts=new Map();
  this.people=residents.map((resident,i)=>{
   let person=previous.get(resident.id);
   const oldHome=person?.homeId,oldJob=person?.job;
   if(!person){
    const profile=randomAppearance("epoch:villager:"+resident.id,resident.sex);
    const human=createQuaterniusHuman(this.scene,profile,null,resident.name);
    human.root.rotation.y=i*1.55;
    person={...resident,profile,human,phase:i*2.6};
    this.makeResidentNameplate(human,resident);
    human.ready?.then(()=>{
     if(human.root.isDisposed?.())return;
     for(const mesh of human.root.getChildMeshes())
      if(mesh.isPickable)mesh.metadata={...(mesh.metadata||{}),residentId:resident.id};
    }).catch(error=>console.warn("Villager model could not load",error));
   }
   person.homeId=resident.homeId;
   person.job=resident.job||"idle";
   person.cargo=normalizeCargo(resident.cargo);
   const carrying=cargoCount(person.cargo)>0;
   const home=resident.homeId||"camp";
   const index=homeCounts.get(home)||0;homeCounts.set(home,index+1);
   let x,z;
   const hut=huts.get(home);
   if(hut){
    const angle=index*Math.PI*2/3+.45;
    x=hut.x+Math.cos(angle)*3.5;z=hut.z+Math.sin(angle)*3.5;
   }else{
    const offsets=[[-5,7],[-10,-5],[6,10],[13,-5]];
    const point=offsets[index]||[Math.cos(index*2.4)*(7+(index%3)*2),Math.sin(index*2.4)*(7+(index%3)*2)];
    x=point[0]+camp.x-LEGACY_HOME.x;z=point[1]+camp.z-LEGACY_HOME.z;
   }
   person.homeX=x;person.homeZ=z;
   if(!previous.has(resident.id)){
    const recovery=carrying?normalizeHaulPosition(resident.haulPosition):null;
    person.x=recovery?.x??x;person.z=recovery?.z??z;
    person.human.root.position=V(person.x,this.groundY(person.x,person.z),person.z);
   }else if(oldHome!==resident.homeId&&!carrying&&person.work?.mode==="idle"){
    person.x=x;person.z=z;
    person.human.root.position=V(x,this.groundY(x,z),z);
   }
   // Changes to job/home must not erase cargo or interrupt a delivery.
   if(!person.work){
    person.work={mode:carrying?"returning":"idle",task:null,timer:0,
     retry:1+(i%4)*.4,moving:false,stalled:0,noProgress:0,
     route:null,routeGoal:null,dropoff:null};
   }else if(oldHome!==resident.homeId||oldJob!==person.job){
    person.work.task=null;
    person.work.mode=carrying?"returning":"idle";
    person.work.route=null;person.work.routeGoal=null;person.work.dropoff=null;
    person.work.stalled=0;person.work.noProgress=0;
   }else if(carrying&&["idle","outbound","working"].includes(person.work.mode)){
    person.work.mode="returning";person.work.task=null;
   }
   this.syncVillagerCargo(person);
   return person;
  });
 }
 /** A small, dry, collision-free receiving point beside the stockpile.
  * Each villager gets a different approach to avoid crowding the same side.
  */
 villagerDropoff(person,pile){
  const number=this.people.indexOf(person);
  const candidates=[];
  for(let i=0;i<12;i++){
   const a=(number+i)*Math.PI/6;
   const point={x:pile.x+Math.cos(a)*3.55,z:pile.z+Math.sin(a)*3.55};
   if(this.isBlocked(point.x,point.z)||
     this.terrain.waterAt(point.x,point.z).depth>HAUL_WATER_DEPTH)continue;
   candidates.push(point);
  }
  candidates.sort((a,b)=>Math.hypot(a.x-person.x,a.z-person.z)-
   Math.hypot(b.x-person.x,b.z-person.z));
  return candidates[0]||{x:pile.x+2.7,z:pile.z+2.7};
 }
 /** Cache a dry A* route for each journey. Nearby straight lines still avoid
  * the grid, but rivers, steep slopes and tree clusters cause local detours.
  */
 moveVillager(person,destination,dt,stop=2.1){
  const work=person.work,dist=Math.hypot(destination.x-person.x,destination.z-person.z);
  if(dist<=stop){work.moving=false;work.route=null;return true}
  if(!work.route||!work.routeGoal||
      Math.hypot(work.routeGoal.x-destination.x,work.routeGoal.z-destination.z)>3.5){
   work.route=landRoute(this,{x:person.x,z:person.z},destination,stop);
   work.routeGoal={x:destination.x,z:destination.z};
  }
  if(!work.route?.length){
   work.moving=false;work.stalled+=dt;
   return false;
  }
  // The final waypoint can be within stop distance of an obstacle,
  // including a tree trunk or the stockpile itself.
  while(work.route.length>1&&Math.hypot(work.route[0].x-person.x,
   work.route[0].z-person.z)<.8)work.route.shift();
  const goal=work.route[0];
  const dx=goal.x-person.x,dz=goal.z-person.z,len=Math.hypot(dx,dz);
  if(len<.4){
   work.route.shift();work.moving=false;return false;
  }
  const heading=Math.atan2(dx,dz),step=Math.min(JOB_SPEED*dt,len);
  const candidates=[0,.31,-.31,.65,-.65,1.05,-1.05];
  let advanced=false;
  for(const offset of candidates){
   const a=heading+offset,nx=person.x+Math.sin(a)*step,nz=person.z+Math.cos(a)*step;
   if(this.isBlocked(nx,nz)||this.terrain.waterAt(nx,nz).depth>HAUL_WATER_DEPTH||
      Math.abs(this.groundY(nx,nz)-this.groundY(person.x,person.z))>.56)continue;
   person.x=nx;person.z=nz;
   person.human.root.position=V(nx,this.groundY(nx,nz),nz);
   person.human.root.rotation.y=a;
   work.moving=true;work.stalled=0;advanced=true;
   const remain=Math.hypot(goal.x-nx,goal.z-nz);
   work.noProgress=remain<len-.006?0:(work.noProgress||0)+dt;
   if(remain<.7&&work.route.length>1)work.route.shift();
   break;
  }
  if(!advanced){
   work.moving=false;work.stalled+=dt;
   if(work.stalled>1.1){work.route=null;work.routeGoal=null}
  }
  return false;
 }
 updateVillagerJobs(dt){
  const pile=this.currentVillage?.stockpile;
  if(!pile||this.inputBlocked)return;
  // Workers stop simulating while the player is beyond the local streamed area.
  if(Math.hypot(this.player.position.x-pile.x,this.player.position.z-pile.z)>100)return;
  for(const person of this.people){
   const work=person.work;
   if(!work)continue;
   work.moving=false;
   const carrying=cargoCount(person.cargo)>0;
   if(carrying&&!["returning","waiting","stuck"].includes(work.mode)){
    work.mode="returning";work.task=null;work.route=null;work.routeGoal=null;
   }
   if(work.mode==="idle"&&person.job==="idle"&&!carrying){
    if(Number.isFinite(person.homeX)&&Number.isFinite(person.homeZ))
     this.moveVillager(person,{x:person.homeX,z:person.homeZ},dt,.7);
    continue;
   }
   if(work.mode==="idle"){
    work.retry-=dt;if(work.retry>0)continue;
    if(stockpileSpace(pile)<2){work.retry=7;continue}
    const claimed=new Set(this.people.filter(p=>p!==person&&p.work?.task)
     .map(p=>p.work.task.id));
    const task=findVillagerWork(this,person,claimed);
    if(!task){work.retry=5;continue}
    work.task=task;work.mode="outbound";work.stalled=0;work.noProgress=0;
    work.route=null;work.routeGoal=null;
   }
   if(work.mode==="outbound"){
    const task=work.task;
    if(!task){work.mode="idle";continue}
    if(task.kind==="hunt"){
     const animal=this.animals.find(a=>a.id===task.id&&!a.dead);
     if(!animal){work.mode="idle";work.task=null;work.retry=4;continue}
     task.x=animal.node.position.x;task.z=animal.node.position.z;
    }
    if(this.moveVillager(person,task,dt,task.kind==="fish"?.55:2.1)){
     work.mode="working";work.timer=JOB_WORK_SECONDS[person.job]||4;
     work.route=null;work.routeGoal=null;
    }
   }else if(work.mode==="working"){
    work.timer-=dt;
    if(work.timer<=0){
     const task=work.task;
     // Set return state before the synchronous onChange() resynchronizes models.
     work.mode="returning";work.task=null;work.stalled=0;work.noProgress=0;
     work.route=null;work.routeGoal=null;work.dropoff=null;
     const result=task?this.onVillagerCollect(person.id,task,person.x,person.z):null;
     if(result?.ok){
      if(task.kind==="resource"){
       if(result.removed)this.terrain.removeResource(task.id,task.chunkKey);
       else if(task.resource==="food")this.terrain.refreshBerries();
      }else if(task.kind==="fish"){
       const fish=this.fish.find(f=>f.id===task.id);
       if(fish){fish.root.dispose(false,false);this.fish=this.fish.filter(f=>f!==fish)}
      }else if(task.kind==="hunt"){
       const animal=this.animals.find(a=>a.id===task.id);
       if(animal){animal.node.dispose(false,false);this.animals=this.animals.filter(a=>a!==animal)}
      }
     }else{
      work.mode="idle";work.retry=4;
     }
    }
   }else if(work.mode==="returning"){
    if(!work.dropoff)work.dropoff=this.villagerDropoff(person,pile);
    if(this.moveVillager(person,work.dropoff,dt,.85)){
     work.mode="waiting";work.retry=0;
    }
   }
   if(work.mode==="waiting"){
    work.retry-=dt;
    if(work.retry<=0){
     const drop=this.onVillagerDeliver(person.id);
     if(drop?.remaining===0){
      work.mode="idle";work.task=null;work.dropoff=null;
      work.route=null;work.routeGoal=null;work.retry=2;
     }else work.retry=drop?.reason==="Stockpile is full."?4:2.5;
    }
   }
   // Failed land routes hold physical cargo safely until a new path opens.
   if(work.stalled>4||work.noProgress>9){
    if(cargoCount(person.cargo)>0){
     work.mode="stuck";work.retry=5;
    }else{
     work.mode="idle";work.task=null;work.retry=6;
    }
    work.route=null;work.routeGoal=null;
    work.stalled=0;work.noProgress=0;work.dropoff=null;
   }
   if(work.mode==="stuck"){
    work.retry-=dt;
    if(work.retry<=0){
     work.mode="returning";work.retry=0;
    }
   }
  }
 }
 makeCamera(){
  const c=new B.ArcRotateCamera("adventurer camera",-Math.PI/2,1.13,18,V(0,1,0),this.scene);
  c.lowerRadiusLimit=6;c.upperRadiusLimit=34;c.lowerBetaLimit=.48;c.upperBetaLimit=1.48;c.wheelDeltaPercentage=.016;c.panningSensibility=0;c.inertia=.72;
  // Babylon's pointer input stopped responding reliably to right-drag in Chromium.
  // Keep the ArcRotateCamera for following and projection, but own the canvas
  // interactions so pointer input is independent of Babylon's internal listeners.
  c.inputs.removeByType("ArcRotateCameraPointersInput");
  c.inputs.removeByType("ArcRotateCameraMouseWheelInput");
  c.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
  this.camera=c;
  c.attachControl(this.canvas,true);
  this.bindCameraControls();
 }
 bindCameraControls(){
  const canvas=this.canvas,camera=this.camera;
  const finish=e=>{
   if(this.cameraPointerId==null||e?.pointerId!==this.cameraPointerId)return;
   const id=this.cameraPointerId;
   this.cameraPointerId=null;this.cameraDragging=false;
   if(canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);
  };
  canvas.addEventListener("pointerdown",e=>{
   if(this.inputBlocked||e.button!==2)return;
   this.cameraPointerId=e.pointerId;this.cameraDragging=true;
   this.cameraDragX=e.clientX;this.cameraDragY=e.clientY;
   canvas.setPointerCapture?.(e.pointerId);
   e.preventDefault();
  });
  canvas.addEventListener("pointermove",e=>{
   if(this.inputBlocked||!this.cameraDragging||this.cameraPointerId!==e.pointerId)return;
   if(!(e.buttons&2)){finish(e);return}
   const dx=e.clientX-this.cameraDragX,dy=e.clientY-this.cameraDragY;
   this.cameraDragX=e.clientX;this.cameraDragY=e.clientY;
   camera.alpha-=dx*.004;
   camera.beta=clamp(camera.beta-dy*.003,camera.lowerBetaLimit,camera.upperBetaLimit);
   e.preventDefault();
  });
  canvas.addEventListener("pointerup",e=>{if(e.button===2)finish(e)});
  canvas.addEventListener("pointercancel",finish);
  canvas.addEventListener("lostpointercapture",e=>{
   if(this.cameraPointerId===e.pointerId){this.cameraPointerId=null;this.cameraDragging=false}
  });
  canvas.addEventListener("wheel",e=>{
   if(this.inputBlocked)return;
   e.preventDefault();
   const dy=e.deltaMode===1?e.deltaY*16:e.deltaMode===2?e.deltaY*canvas.clientHeight:e.deltaY;
   camera.radius=clamp(camera.radius+dy*.012,camera.lowerRadiusLimit,camera.upperRadiusLimit);
  },{passive:false});
  canvas.addEventListener("contextmenu",e=>e.preventDefault());
 }
 makeFish(site,ownerChunk){
  if(!site||this.getFishCaught(site.id))return null;
  const root=new B.TransformNode("Fish "+site.kind+" "+site.id,this.scene);
  const water=this.terrain.waterAt(site.x,site.z);
  if(water.depth<.24)return null;
  // Keep the silhouette just above the mostly opaque water material. The
  // small vertical bob reads as fish swimming at the surface, not flying.
  root.position=V(site.x,water.surfaceY+.10,site.z);
  root.rotation.y=(site.x+site.z)*.31;
  const mark=(mesh)=>{
   mesh.metadata={fishId:site.id,fishKind:site.kind};
   mesh.isPickable=true;return mesh;
  };
  mark(this.primitive("sphere","Swimming fish body",root,[0,0,0],
   [.70,.23,.34],this.m.fishBody));
  mark(this.primitive("sphere","Swimming fish head",root,[0,.01,.29],
   [.29,.19,.28],this.m.fishBody));
  const tail=mark(this.primitive("sphere","Swimming fish tail",root,[0,0,-.49],
   [.46,.10,.31],this.m.fishFin));
  mark(this.primitive("sphere","Swimming fish dorsal fin",root,[0,.15,-.06],
   [.13,.25,.25],this.m.fishFin));
  const fish={id:site.id,site,root,tail,chunkKey:ownerChunk,phase:site.x*.13+site.z*.21};
  this.fish.push(fish);
  return root;
 }
 nearbyFish(reach=FISH_SPEAR_REACH+.2){
  const p=this.player.position;
  return this.fish.filter(f=>Math.hypot(f.root.position.x-p.x,
   f.root.position.z-p.z)<=reach).sort((a,b)=>
   Math.hypot(a.root.position.x-p.x,a.root.position.z-p.z)-
   Math.hypot(b.root.position.x-p.x,b.root.position.z-p.z))[0]||null;
 }
 catchFish(fish){
  if(!fish)return false;
  const player=this.player.position;
  const distance=Math.hypot(fish.root.position.x-player.x,
   fish.root.position.z-player.z);
  if(distance>FISH_SPEAR_REACH){
   this.onStatus("Move closer","Approach the shallow water with WASD before spear fishing.");
   return false;
  }
  if(this.huntCooldown>0)return false;
  const sample=this.terrain.waterAt(fish.root.position.x,fish.root.position.z);
  if(sample.depth<.2){this.onStatus("No fish here","Fish need shallow water.");return false;}
  const result=this.onFishCatch(fish.site);
  this.onStatus(result.ok?"Fish caught":"Cannot fish",result.reason);
  if(!result.ok)return false;
  this.huntCooldown=WILDLIFE_ATTACK_COOLDOWN;
  fish.root.dispose(false,false);
  this.fish=this.fish.filter(f=>f!==fish);
  return true;
 }
 makeAnimal(x,z,chunkKey=null,definition={}){
  const species=WILDLIFE[definition.species]?definition.species:"deer";
  const id=definition.id||("wildlife:"+chunkKey+":"+Math.round(x*100)+":"+Math.round(z*100));
  const record=this.getWildlifeStatus({id,species});
  if(record?.looted)return null;
  const def=WILDLIFE[species],node=new B.TransformNode(species+" wildlife",this.scene);
  node.position=V(x,this.groundY(x,z),z);
  const mark=mesh=>{
   mesh.isPickable=true;
   mesh.metadata={animalId:id,animalSpecies:species};
   return mesh;
  };
  const size=def.scale;
  node.scaling=V(size,size,size);
  const brown=species==="boar"?this.m.wood:species==="rabbit"?this.m.woodLight:this.m.woodLight;
  mark(this.primitive("sphere",species+" body",node,[0,.91,0],
   species==="boar"?[1.36,.83,.77]:[1.35,.67,.59],brown));
  mark(this.primitive("sphere",species+" head",node,[0,1.33,.66],
   species==="boar"?[.68,.52,.55]:[.48,.45,.5],brown));
  for(const dx of [-.4,.4])for(const dz of [-.19,.22])
   mark(this.primitive("cylinder",species+" leg",node,[dx,.43,dz],
    [.12,.72,.12],this.m.wood));
  if(species==="rabbit"){
   for(const dx of [-.21,.21])
    mark(this.primitive("cylinder","rabbit ear",node,[dx,1.93,.71],
     [.14,.64,.16],this.m.woodLight));
  }else if(species==="boar"){
   for(const dx of [-.35,.35])
    mark(this.primitive("sphere","boar tusk",node,[dx,1.13,1.05],
     [.15,.15,.27],this.m.stone));
  }else{
   for(const dx of [-.3,.3])
    mark(this.primitive("cylinder","deer antler",node,[dx,1.85,.64],
     [.08,.53,.08],this.m.wood));
  }
  const dead=record?.dead||false;
  const animal={id,species,definition:{id,species},node,
   origin:V(x,0,z),phase:x+z,chunkKey,dead,
   fleeUntil:0,nextImpact:0};
  if(dead){node.rotation.z=-Math.PI/2;node.position.y-=.18;}
  this.animals.push(animal);
  return node;
 }
 nearbyAnimal(dead=false,reach=2.7){
  const pos=this.player.position;
  return this.animals.filter(a=>a.dead===dead&&
   Math.hypot(a.node.position.x-pos.x,a.node.position.z-pos.z)<=reach)
   .sort((a,b)=>Math.hypot(a.node.position.x-pos.x,a.node.position.z-pos.z)-
    Math.hypot(b.node.position.x-pos.x,b.node.position.z-pos.z))[0]||null;
 }
 huntAnimal(animal){
  if(!animal||animal.dead)return false;
  const p=this.player.position,def=WILDLIFE[animal.species];
  const weapon=this.getVitals().weapon;
  const reach=(weapon?.reach||2.3)+HUNT_DISTANCE_BUFFER;
  if(Math.hypot(animal.node.position.x-p.x,animal.node.position.z-p.z)>reach){
   this.onStatus("Out of hunting range","Approach "+def.name+" with WASD, then press H or click.");
   return false;
  }
  if(this.huntCooldown>0)return false;
  const result=this.onWildlifeHunt(animal.definition);
  this.onStatus(result.ok?(result.dead?"Hunt successful":"Hunting "+def.name):"Cannot hunt",
   result.reason||"Equip a weapon to hunt.");
  if(result.ok){
   this.huntCooldown=WILDLIFE_ATTACK_COOLDOWN;
   animal.fleeUntil=performance.now()/1000+6;
   if(result.dead){
    animal.dead=true;
    animal.node.rotation.z=-Math.PI/2;
    animal.node.position.y=this.groundY(animal.node.position.x,animal.node.position.z)-.18;
   }
  }
  return !!result.ok;
 }
 huntNearest(){
  const animal=this.nearbyAnimal(false,3.8),fish=this.nearbyFish();
  const player=this.player.position;
  if(fish&&(!animal||
   Math.hypot(fish.root.position.x-player.x,fish.root.position.z-player.z)<
   Math.hypot(animal.node.position.x-player.x,animal.node.position.z-player.z)))
   return this.catchFish(fish);
  if(animal)return this.huntAnimal(animal);
  this.onStatus("No hunting or fishing target",
   "Approach wildlife with a weapon or shallow-water fish with a Stone Spear, then press H.");
  return false;
 }
 harvestWildlife(animal){
  if(!animal?.dead)return false;
  if(Math.hypot(animal.node.position.x-this.player.position.x,
   animal.node.position.z-this.player.position.z)>2.7){
   this.onStatus("Move closer","Approach the carcass to collect its materials.");
   return false;
  }
  const result=this.onWildlifeHarvest(animal.definition);
  this.onStatus(result.ok?"Carcass harvested":"Cannot gather",result.reason);
  if(result.ok){
   animal.node.dispose(false,false);
   this.animals=this.animals.filter(a=>a!==animal);
  }
  return !!result.ok;
 }
 setWorldSeed(seed){
  // Reset only streamed terrain/resources/wildlife. Permanent village/characters
  // remain intact; the Village UI will resync their build state separately.
  for(const key of [...this.terrain.loaded.keys()])this.terrain.remove(key);
  this.worldSeed=(Number(seed)>>>0)||STARTER_SEED;
  this.terrain.seed=this.worldSeed;
  this.terrain.center=null;
  this.terrain.update(this.player.position.x,this.player.position.z);
  this.discoveredTribes.clear();
  this.path=[];this.target=null;this.tribeTarget=null;this.plotTarget=null;
 }
 setDiscovery(fire){
  // Fire research is only the prerequisite for building the hearth.
  this.fireDiscovered=!!fire;
  this.updateHearthFire();
 }
 updateHearthFire(){
  const lit=!!(this.fireDiscovered&&this.hearthBuilt);
  if(this.flame)this.flame.setEnabled(lit);
  if(this.fireLight)this.fireLight.intensity=lit?1.2:0;
 }
 syncVillage(village){
  const pile=village?.stockpile||null;
  this.stockpile=pile;
  this.currentVillage=village;
  syncVillageWorld(this,village);
  syncStockpileWorld(this,pile);
  this.obstacles=this.obstacles.filter(o=>!o.stockpile);
  if(pile)this.obstacles.push({x:pile.x,z:pile.z,r:1.65,stockpile:true});
  this.syncVillagers(village);
  // A newly founded village cannot occupy the same clearing as a tribe.
  for(const camp of [...this.tribeCamps.values()]){
   if(!this.isTribeSiteActive(camp.tribe)){
    this.removeTribeCamp(camp.chunk);
    if(this.getTribeRecord(camp.tribe.id)?.status==="relocated")
     this.spawnAbandonedTribeCamp?.(camp.tribe,camp.chunk);
   }
  }
 }
 isTribeSiteActive(tribe){
  const record=this.getTribeRecord(tribe.id);
  return tribeCampIsActive(tribe,record?{[tribe.id]:record}:null,this.getTribeHome());
 }
 focusTribe(id){
  const camp=[...this.tribeCamps.values()].find(c=>c.tribe.id===id);
  return camp?this.focusLocation(camp.leader.x,camp.leader.z):false;
 }
 focusResident(id){
  const person=this.people.find(p=>p.id===id);
  return person?this.focusLocation(person.x,person.z):false;
 }
 respawnAtHome(){
  const home=this.currentVillage?.stockpile||LEGACY_HOME;
  const x=home.x+3,z=home.z+3;
  this.player.position.copyFrom(V(x,this.groundY(x,z),z));
  this.keys={};this.resetCameraKeys();this.path=[];this.target=null;
  this.stockpileTarget=false;this.tribeTarget=null;this.plotTarget=null;
  this.focusTarget=null;this.cameraDragging=false;this.cooldown=0;
  if(this.camera)this.camera.target.copyFrom(V(x,this.player.position.y+1,z));
 }
 walkToTribe(id){
  const camp=[...this.tribeCamps.values()].find(c=>c.tribe.id===id);
  if(!camp)return false;
  const p=this.player.position,tribe=camp.tribe;
  if(Math.hypot(p.x-camp.leader.x,p.z-camp.leader.z)>=TRIBE_INTERACT_RANGE){
   this.onStatus(tribe.name,"Move closer to the tribal leader using WASD to interact.");
   return false;
  }
  this.path=[];this.target=null;this.tribeTarget=null;
  this.onTribeDiscover(tribe);
  this.onTribeInteract(tribe);
  return true;
 }
 highlightPlot(id){}
 focusBuilding(id){
  const building=this.currentVillage?.buildings?.find(entry=>entry.id===id);
  if(!building)return false;
  return this.focusLocation(building.x,building.z);
 }
 focusStockpile(){return this.stockpile?this.focusLocation(this.stockpile.x,this.stockpile.z):false}
 focusLocation(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  const {cx,cz}=chunkCoord(x,z),chunk=this.terrain?.loaded?.get(chunkKey(cx,cz));
  if(!chunk?.detailed){
   this.focusTarget=null;
   const p=this.player.position,distance=Math.round(Math.hypot(x-p.x,z-p.z));
   this.onStatus("Your village is beyond view","About "+distance+" m from your adventurer. Travel closer, then use Find again.");
   return false;
  }
  this.focusTarget={x,z};this.keys={};this.path=[];this.target=null;this.stockpileTarget=false;
  if(this.camera)this.camera.radius=Math.max(this.camera.radius,22);
  return true;
 }
 beginStockpilePlacement(){
  if(this.stockpile)return false;
  this.cancelBuildingPlacement();
  this.resetCameraKeys();
  this.placingStockpile=true;this.placementPinned=false;this.focusTarget=null;this.target=null;this.plotTarget=null;this.stockpileTarget=false;this.path=[];
  const initial=this.findSuggestedStockpileSite();
  const p=this.player.position;
  this.previewStockpileAt(initial?.x??p.x+8,initial?.z??p.z+8);
  this.onStatus("Choose stockpile location","Move with arrows or click the ground, then press Confirm Placement. Escape cancels.");
  return true;
 }
 findSuggestedStockpileSite(){
  const p=this.player.position,options=[[LEGACY_HOME.x,LEGACY_HOME.z]];
  for(const radius of [6,8,10,12,14,16])
   for(let step=0;step<24;step++){
    const a=step*Math.PI/12;
    options.push([p.x+Math.cos(a)*radius,p.z+Math.sin(a)*radius]);
   }
  for(const [x,z] of options){
   const candidate=stockpileValidation(this,x,z);
   if(candidate.ok)return candidate;
  }
  return null;
 }
 foundSuggestedStockpile(){
  if(this.stockpile)return false;
  const candidate=this.findSuggestedStockpileSite();
  if(!candidate){this.onStatus("No clear home site","Move to a clearing or chop nearby trees, then try again.");return false}
  const placed=this.onFoundStockpile(candidate.x,candidate.z);
  if(placed){
   this.cancelStockpilePlacement();
   this.onStatus("Village founded","Your stockpile is established! Return with gathered resources.");
  }
  return placed;
 }
 cancelStockpilePlacement(){
  this.placingStockpile=false;this.stockpileCandidate=null;this.placementPinned=false;
  showStockpilePreview(this,null);
  this.onPlacementChange();
 }
 previewStockpileAt(x,z){
  if(!this.placingStockpile)return null;
  const old=this.stockpileCandidate;
  const result=stockpileValidation(this,x,z);
  this.stockpileCandidate=result;showStockpilePreview(this,result);
  if(!old||old.x!==result.x||old.z!==result.z||old.ok!==result.ok)this.onPlacementChange();
  return result;
 }
 nudgeStockpile(dx,dz){
  if(!this.placingStockpile)return;
  this.placementPinned=true;
  const p=this.stockpileCandidate||this.player.position;
  this.previewStockpileAt(p.x+dx*BUILD_GRID,p.z+dz*BUILD_GRID);
 }
 confirmStockpilePlacement(){
  if(!this.placingStockpile||!this.stockpileCandidate)
   return {ok:false,reason:"Choose a location."};
  const {x,z}=this.stockpileCandidate;
  const current=stockpileValidation(this,x,z);
  if(!current.ok){this.previewStockpileAt(x,z);return {ok:false,reason:current.reason}}
  if(!this.onFoundStockpile(x,z))
   return {ok:false,reason:"Could not establish stockpile here."};
  this.cancelStockpilePlacement();
  return {ok:true,x,z};
 }
 beginBuildingPlacement(kind,village){
  if(!BUILDINGS[kind]||!village?.stockpile)return false;
  this.cancelStockpilePlacement();
  this.resetCameraKeys();
  this.placingBuilding=kind;this.village=village;this.placementPinned=false;this.focusTarget={x:village.stockpile.x,z:village.stockpile.z};this.target=null;this.plotTarget=null;this.stockpileTarget=false;this.path=[];
  const start=choosePlacement(village,this,kind);
  this.previewBuildingAt(start?.x??village.stockpile.x+8,start?.z??village.stockpile.z+8,0);
  this.onStatus("Place "+BUILDINGS[kind].name,"Move with arrows (2m grid), R to rotate, or click ground. Confirm in Village.");
  return true;
 }
 previewBuildingAt(x,z,turn=this.buildingCandidate?.turn||0){
  if(!this.placingBuilding)return null;
  const last=this.buildingCandidate;
  const result=placementCheck({village:this.village,world:this,kind:this.placingBuilding,x,z,turn});
  this.buildingCandidate=result;
  showVillagePreview(this,result);
  if(!last||last.x!==result.x||last.z!==result.z||last.turn!==result.turn||last.ok!==result.ok)
   this.onPlacementChange();
  return result;
 }
 nudgeBuilding(dx,dz){
  if(!this.placingBuilding)return;
  this.placementPinned=true;
  const c=this.buildingCandidate||this.village.stockpile;
  this.previewBuildingAt(c.x+dx*BUILD_GRID,c.z+dz*BUILD_GRID);
 }
 rotateBuilding(){
  if(!this.placingBuilding||!this.buildingCandidate)return;
  this.placementPinned=true;
  const c=this.buildingCandidate;
  this.previewBuildingAt(c.x,c.z,c.turn+1);
 }
 confirmBuildingPlacement(){
  const candidate=this.buildingCandidate;
  if(!this.placingBuilding||!candidate)return {ok:false,reason:"Select a building first."};
  const check=this.getBuildStatus(candidate.kind,candidate.x,candidate.z,candidate.turn,this);
  if(!check.ok){this.previewBuildingAt(candidate.x,candidate.z,candidate.turn);return {ok:false,reason:check.reason}}
  const result=this.onBuild(candidate.kind,candidate.x,candidate.z,candidate.turn,this);
  if(result.ok)this.cancelBuildingPlacement();
  return result;
 }
 cancelBuildingPlacement(){
  // A temporary village focus must not survive a completed/cancelled placement.
  if(this.placingBuilding)this.focusTarget=null;
  this.placingBuilding=null;this.buildingCandidate=null;this.village=null;this.placementPinned=false;
  showVillagePreview(this,null);
  this.onPlacementChange();
 }
 walkToStockpile(){
  if(!this.stockpile)return false;
  const p=this.player.position;
  if(!nearStockpile(this.stockpile,p.x,p.z)){
   this.onStatus("Village stockpile","Move within reach using WASD, then click the stockpile.");
   return false;
  }
  this.path=[];this.target=null;this.plotTarget=null;this.stockpileTarget=false;
  this.onOpenStockpile();
  return true;
 }
 resetCameraKeys(){
  this.cameraKeys={};
  this.cameraOrbitVelocity.horizontal=0;
  this.cameraOrbitVelocity.vertical=0;
 }
 updateKeyboardCamera(dt){
  // Hold-to-orbit with frame-based easing instead of stepped key-repeat motion.
  const keys=this.cameraKeys,v=this.cameraOrbitVelocity;
  const x=(keys.arrowright?1:0)-(keys.arrowleft?1:0);
  const y=(keys.arrowdown?1:0)-(keys.arrowup?1:0);
  const blend=1-Math.exp(-dt*((x||y)?10:14));
  v.horizontal+=(x*1.55-v.horizontal)*blend;
  v.vertical+=(y*1.10-v.vertical)*blend;
  if(Math.abs(v.horizontal)<.0001)v.horizontal=0;
  if(Math.abs(v.vertical)<.0001)v.vertical=0;
  this.camera.alpha+=v.horizontal*dt;
  this.camera.beta=clamp(this.camera.beta+v.vertical*dt,this.camera.lowerBetaLimit,this.camera.upperBetaLimit);
 }
 bindInput(){
  const isText=()=>["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
  window.addEventListener("keydown",e=>{
   if(this.inputBlocked||e.defaultPrevented||isText())return;const key=e.key.toLowerCase();
   // F now performs nearby interactions. Preserve Ctrl/Cmd+F browser Find,
   // and do not harvest repeatedly while the key is held.
   if((key==="f"||key==="h")&&(e.ctrlKey||e.metaKey||e.altKey||e.repeat))return;
   // Enter activates a focused HTML button itself; do not also place a building.
   if(key==="enter"&&document.activeElement?.closest("button,a,[role='button']"))return;
   if(this.placingStockpile||this.placingBuilding){
    const delta={arrowleft:[-1,0],arrowright:[1,0],arrowup:[0,-1],arrowdown:[0,1]}[key];
    if(delta){
     e.preventDefault();
     if(this.placingStockpile)this.nudgeStockpile(...delta);
     else this.nudgeBuilding(...delta);
     return;
    }
    if(key==="r"&&this.placingBuilding){e.preventDefault();this.rotateBuilding();return}
    if(key==="escape"){
     e.preventDefault();
     if(this.placingStockpile)this.cancelStockpilePlacement();
     else this.cancelBuildingPlacement();
     this.onStatus("Build mode closed","Select a building from the Village panel.");
     return;
    }
    if(key==="enter"){
     e.preventDefault();
     const outcome=this.placingStockpile?this.confirmStockpilePlacement():this.confirmBuildingPlacement();
     this.onStatus(outcome.ok?"Construction complete":"Cannot place here",outcome.reason||"Your village has grown.");
     return;
    }
    if(key==="f"||key==="h")return;
   }
   // Sample held arrow keys in the render loop, independent of OS key repeat.
   if(["arrowleft","arrowright","arrowup","arrowdown"].includes(key)&&
     (document.activeElement===this.canvas||document.activeElement===document.body)){
    e.preventDefault();
    this.cameraKeys[key]=true;
    return;
   }
   if(["w","a","s","d","shift","f"].includes(key)){e.preventDefault();this.keys[key]=true;}
   if(key==="f")this.interactNearby(e.shiftKey?"cut":"gather");
   if(key==="h"){e.preventDefault();this.huntNearest()}
  });
  window.addEventListener("keyup",e=>{
   const key=e.key.toLowerCase();
   this.keys[key]=false;
   if(key in this.cameraKeys)this.cameraKeys[key]=false;
  });
  window.addEventListener("blur",()=>{this.keys={};this.resetCameraKeys();this.cameraDragging=false});
  window.addEventListener("focusin",e=>{
   if(e.target!==this.canvas&&e.target!==document.body)this.cameraKeys={};
  });
  window.addEventListener("pointerup",e=>{if(e.button===2)this.cameraDragging=false});
  this.scene.onPointerObservable.add(e=>{
   if(this.inputBlocked)return;
   if(e.type===B.PointerEventTypes.POINTERDOWN&&e.event?.button===2)this.cameraDragging=true;
   if(e.type===B.PointerEventTypes.POINTERUP&&e.event?.button===2)this.cameraDragging=false;
   const pick=e.pickInfo;
   if(this.placingStockpile||this.placingBuilding){
    const clicked=e.type===B.PointerEventTypes.POINTERPICK&&e.event?.button===0;
    const hovering=e.type===B.PointerEventTypes.POINTERMOVE&&!this.placementPinned&&!this.cameraDragging&&!e.event?.buttons;
    if(clicked||hovering){
     // Always select the ground beneath scenery, even when a nearby tree,
     // player or ghost overlaps the frontmost cursor hit.
     const ground=this.scene.pick(this.scene.pointerX,this.scene.pointerY,
      mesh=>!!mesh?.metadata?.terrain);
     if(ground?.hit&&ground.pickedPoint){
      const x=ground.pickedPoint.x,z=ground.pickedPoint.z;
      if(clicked)this.placementPinned=true;
      const candidate=this.placingStockpile?this.previewStockpileAt(x,z):
       this.previewBuildingAt(x,z);
      if(clicked){
       this.onPlacementChange();
       this.onStatus(candidate?.ok?"Position selected":"Site blocked",
        (candidate?.reason||"Move the preview")+
        ". Position pinned. Confirm or adjust with the arrows.");
      }
     }
    }
    return;
   }
   if(e.type===B.PointerEventTypes.POINTERMOVE){
    const meta=pick?.pickedMesh?.metadata;
    const key=meta?.stockpile?"stockpile":meta?.buildingId||meta?.tribeId||
     meta?.residentId||meta?.animalId||meta?.fishId||null;
    this.canvas.style.cursor=key||meta?.resource?"pointer":"default";
    if(key&&key!==this.hoveredInteraction){
     if(meta.stockpile)this.onStatus("Village stockpile","Walk here with WASD, then click to open village storage.");
     else if(meta.tribeId){
      const camp=[...this.tribeCamps.values()].find(c=>c.tribe.id===meta.tribeId);
      if(camp)this.onStatus(camp.tribe.name,"Walk to the tribal leader with WASD, then click to meet them.");
     }else if(meta.fishId){
      this.onStatus("Fish in the shallows","Equip a Stone Spear and press H or click the fish to catch it.");
     }else if(meta.animalId){
      this.onStatus("Wildlife nearby","Equip a hunting weapon; press H or click to attack.");
     }else if(meta.residentId){
      const resident=this.people.find(p=>p.id===meta.residentId);
      if(resident)this.onStatus(resident.name,"Click to see this villager's story, connections and home.");
     }else{
      const kind=meta.buildingKind;
      const destination={lore:"Technology",council:"Culture",family:"Housing",hearth:"Cooking Hearth"}[kind]||"Building";
      this.onStatus(BUILDINGS[kind]?.name||"Village building","Click to open "+destination+".");
     }
    }
    this.hoveredInteraction=key;
   }
   if(e.type!==B.PointerEventTypes.POINTERPICK||e.event?.button!==0)return;
   if(!pick?.hit)return;
   const mesh=pick.pickedMesh;
   if(mesh?.metadata?.fishId){
    const fish=this.fish.find(f=>f.id===mesh.metadata.fishId);
    if(fish)this.catchFish(fish);
    return;
   }
   if(mesh?.metadata?.animalId){
    const animal=this.animals.find(a=>a.id===mesh.metadata.animalId);
    if(animal){if(animal.dead)this.harvestWildlife(animal);else this.huntAnimal(animal);}
    return;
   }
   if(mesh?.metadata?.tribeId){this.walkToTribe(mesh.metadata.tribeId);return}
   if(mesh?.metadata?.residentId){
    this.path=[];this.target=null;this.tribeTarget=null;
    this.stockpileTarget=false;this.onResidentSelect(mesh.metadata.residentId);return;
   }
   this.tribeTarget=null;
   if(mesh?.metadata?.stockpile){this.walkToStockpile();return}
   if(mesh?.metadata?.buildingId){
    const building=this.currentVillage?.buildings?.find(b=>b.id===mesh.metadata.buildingId);
    const p=this.player.position;
    if(!building||Math.hypot(p.x-building.x,p.z-building.z)>6){
     this.onStatus(BUILDINGS[mesh.metadata.buildingKind]?.name||"Village building",
      "Move closer with WASD, then click to interact.");
     return;
    }
    this.path=[];this.target=null;this.plotTarget=null;this.stockpileTarget=false;
    this.onPlot(building.id);return;
   }
   if(mesh?.metadata?.resource){
    this.stockpileTarget=false;
    this.walkToResource(mesh.metadata,e.event.shiftKey?"cut":"gather");return;
   }
   // Ground clicks do nothing outside construction placement.
   // Player locomotion is exclusively WASD; clicking cannot queue a route.
  });
 }
 interactNearby(action="gather"){
  if(action==="gather"){
   const corpse=this.nearbyAnimal(true,2.7);
   if(corpse){this.harvestWildlife(corpse);return;}
  }
  const p=this.player.position;
  const near=this.entities.filter(e=>(action!=="cut"||e.resource==="food")
    &&Math.hypot(e.x-p.x,e.z-p.z)<2.7)
   .sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
  if(near)this.walkToResource(near,action);
  else if(action==="gather"){
   if(nearStockpile(this.stockpile,p.x,p.z)){this.walkToStockpile();return}
   const building=this.currentVillage?.buildings?.find(b=>Math.hypot(b.x-p.x,b.z-p.z)<6);
   if(building){this.onPlot(building.id);return}
   const resident=this.people.find(person=>
    Math.hypot(person.x-p.x,person.z-p.z)<2.9);
   if(resident){this.onResidentSelect(resident.id);return}
   const camp=[...this.tribeCamps.values()]
    .find(c=>Math.hypot(c.leader.x-p.x,c.leader.z-p.z)<TRIBE_INTERACT_RANGE);
   if(camp)this.walkToTribe(camp.tribe.id);
   else this.onStatus("Nothing nearby","Move closer to a tree, flint piece, rock, berry bush or tribal leader.");
  }else this.onStatus("Nothing nearby","Get within gathering range of a berry bush to cut it down.");
 }
 walkToResource(meta,action="gather"){
  const status=this.getResourceStatus(meta);
  if(status?.removed){this.onStatus("Already depleted","This resource is no longer available.");return false}
  const p=this.player.position;
  if(Math.hypot(meta.x-p.x,meta.z-p.z)>=2.7){
   this.onStatus("Move closer to "+meta.label,"Use WASD to approach before gathering.");
   return false;
  }
  this.path=[];this.target=null;this.plotTarget=null;this.stockpileTarget=false;
  this.collect(meta,action);
  return true;
 }
 collect(meta,action="gather"){
  if(this.cooldown>0)return;
  this.cooldown=.5;
  const result=this.onGather(meta,action);
  if(result?.removed&&meta.resourceId)this.terrain.removeResource(meta.resourceId,meta.chunkKey);
  else if(meta.resource==="food"&&meta.resourceId)this.terrain.refreshBerries();
  this.onStatus(result?.type==="full"?"Pack full":
   result?.type==="exhausted"?"Exhausted":
   result?.type==="empty"?"Resource depleted":
   result?.removed?"Resource exhausted":"Gathering "+meta.label,
   result?.label||"No resources gathered.");
 }

 isBlocked(x,z){
  // Rivers, lakes and oceans are traversable by swimming. Props stay solid.
  return this.obstacles.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+.31);
 }
 plan(x,z){
  const p=this.player.position,dist=Math.hypot(x-p.x,z-p.z);
  // A path is local; distant clicks approach in stages rather than trying
  // to solve an unlimited grid. Players can click again to keep exploring.
  if(dist>90){
   x=p.x+(x-p.x)/dist*90;z=p.z+(z-p.z)/dist*90;
  }
  const route=this.findPath(p.x,p.z,x,z);
  this.path=route;
  return route.length>0;
 }
 findPath(sx,sz,ex,ez){
  // Dynamically bounded A* over the current start/end area, not a permanent
  // 39×39 map. Unrestricted 3D movement remains separate from navigation.
  const step=1.5,pad=9;
  const minX=Math.floor((Math.min(sx,ex)-pad)/step)*step;
  const minZ=Math.floor((Math.min(sz,ez)-pad)/step)*step;
  const nx=Math.ceil((Math.max(sx,ex)+pad-minX)/step)+1;
  const nz=Math.ceil((Math.max(sz,ez)+pad-minZ)/step)+1;
  const clampInt=(v,n)=>Math.max(0,Math.min(n-1,v));
  const idx=(v,min,n)=>clampInt(Math.round((v-min)/step),n);
  const coordX=i=>minX+i*step,coordZ=i=>minZ+i*step;
  const start=[idx(sx,minX,nx),idx(sz,minZ,nz)];
  const goal=[idx(ex,minX,nx),idx(ez,minZ,nz)];
  const key=(x,z)=>x+","+z;
  const goalKey=key(goal[0],goal[1]);
  const open=[{x:start[0],z:start[1],g:0,f:0}];
  const seen=new Map([[key(...start),open[0]]]),closed=new Set();
  const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  let final=null;
  for(let count=0;count<9500&&open.length;count++){
   open.sort((a,b)=>a.f-b.f);
   const current=open.shift(),k=key(current.x,current.z);
   if(closed.has(k))continue;
   closed.add(k);
   if(k===goalKey){final=current;break}
   for(const [dx,dz] of directions){
    const x=current.x+dx,z=current.z+dz,nk=key(x,z);
    if(x<0||x>=nx||z<0||z>=nz||closed.has(nk))continue;
    const wx=coordX(x),wz=coordZ(z);
    if(this.isBlocked(wx,wz)&&nk!==goalKey)continue;
    if(dx&&dz&&(this.isBlocked(coordX(current.x+dx),coordZ(current.z))||
                 this.isBlocked(coordX(current.x),coordZ(current.z+dz))))continue;
    const g=current.g+Math.hypot(dx,dz),older=seen.get(nk);
    if(older&&older.g<=g)continue;
    const node={x,z,g,f:g+Math.hypot(goal[0]-x,goal[1]-z),parent:current};
    seen.set(nk,node);open.push(node);
   }
  }
  if(!final)return [];
  const path=[];let cur=final;
  while(cur?.parent){path.unshift(V(coordX(cur.x),0,coordZ(cur.z)));cur=cur.parent}
  if(!this.isBlocked(ex,ez))path.push(V(ex,0,ez));
  return path;
 }
 setSkyPreview(mode){return this.skyAtmosphere?.setMode(mode)||false}
 get skyMode(){return this.skyAtmosphere?.mode||"day"}
 update(dt){
  if(this.skyAtmosphere&&this.camera){
   const before=this.skyAtmosphere.status().transitioning;
   this.skyAtmosphere.update(this.camera,dt);
   if(before&&!this.skyAtmosphere.status().transitioning)
    this.onSkyPreviewComplete?.();
  }
  if(this.m.waterTexture){
   this.m.waterTexture.uOffset=(this.m.waterTexture.uOffset+dt*.006)%1;
   this.m.waterTexture.vOffset=(this.m.waterTexture.vOffset+dt*.003)%1;
  }
  if(this.m.terrainSurface?.setVector3&&this.camera)
   this.m.terrainSurface.setVector3("cameraPosition",this.camera.position);
  if(this.inputBlocked){this.keys={};this.resetCameraKeys();this.path=[];this.target=null;this.stockpileTarget=false;}
  else if(this.placingStockpile||this.placingBuilding)this.resetCameraKeys();
  else this.updateKeyboardCamera(dt);
  this.cooldown=Math.max(0,this.cooldown-dt);
  this.huntCooldown=Math.max(0,this.huntCooldown-dt);
  this.boarCooldown=Math.max(0,this.boarCooldown-dt);
  this.waterNoticeCooldown=Math.max(0,this.waterNoticeCooldown-dt);
  const p=this.player.position,c=this.camera;
  const forward=V(-Math.cos(c.alpha),0,-Math.sin(c.alpha)),right=V(forward.z,0,-forward.x);
  const x=(this.keys.d?1:0)-(this.keys.a?1:0),z=(this.keys.w?1:0)-(this.keys.s?1:0);
  let direction=V(0,0,0),moving=false;
  if(x||z){this.focusTarget=null;this.path=[];this.target=null;this.tribeTarget=null;this.plotTarget=null;this.stockpileTarget=false;direction=right.scale(x).add(forward.scale(z)).normalize();moving=true;}
  // No click-to-move or automated path-following.
  // Only WASD sets a movement direction.
  let running=false,swam=false,actuallyMoved=false;
  const waterBefore=this.terrain.waterAt(p.x,p.z);
  if(!isSwimmingDepth(waterBefore))this.swimExhausted=false;
  if(moving){
   const fast=!!this.keys.shift;
   const probe=p.add(direction.scale(.2));
   const swimming=isSwimmingDepth(waterBefore)||
    isSwimmingDepth(this.terrain.waterAt(probe.x,probe.z));
   const speed=swimming?(fast?SWIM.fastSpeed:SWIM.speed):fast?6.4:3.6;
   const candidateAt=s=>{
    const step=direction.scale(s*dt);
    return [[p.x+step.x,p.z+step.z],[p.x+step.x,p.z],
     [p.x,p.z+step.z]].find(([nx,nz])=>
       !this.isBlocked(nx,nz)&&Math.hypot(nx-p.x,nz-p.z)>.00001)||null;
   };
   let target=candidateAt(speed);
   if(target){
    const needsSwim=swimming||isSwimmingDepth(this.terrain.waterAt(...target));
    if(needsSwim){
     target=candidateAt(fast?SWIM.fastSpeed:SWIM.speed);
     if(target){
      // Crossing from deep water directly into shallows is always possible,
      // including when the swimmer has run out of stamina.
      const reachingShallows=isSwimmingDepth(waterBefore)&&
       !isSwimmingDepth(this.terrain.waterAt(...target));
      if(this.swimExhausted&&this.getVitals().stamina>=SWIM.recovery)
       this.swimExhausted=false;
      if(reachingShallows||
         (!this.swimExhausted&&this.spendSwim(swimCost(dt,fast)))){
       p.x=target[0];p.z=target[1];actuallyMoved=true;swam=!reachingShallows;
      }else{
       this.swimExhausted=true;
       if(this.waterNoticeCooldown===0){
        this.onStatus("Too tired to swim",
         "Float to recover stamina, then swim toward the bank.");
        this.waterNoticeCooldown=4;
       }
      }
     }
    }else{
     running=fast&&this.spendSprint(11*dt);
     target=candidateAt(running?6.4:3.6);
     if(target){p.x=target[0];p.z=target[1];actuallyMoved=true;}
    }
   }
   this.player.rotation.y=Math.atan2(direction.x,direction.z);
   if(actuallyMoved)this.walkTime+=dt*(swam?speed:running?6.4:3.6)*2.4;
   else this.walkTime=0;
  }else this.walkTime=0;
  const waterNow=this.terrain.waterAt(p.x,p.z),deep=isSwimmingDepth(waterNow);
  if(!deep)this.swimExhausted=false;
  const nextMode=deep?(swam?"swimming":this.swimExhausted?"exhausted":"floating"):
   waterNow.depth>.03?"wading":"land";
  if(nextMode!==this.waterMotion){
   const previous=this.waterMotion;
   this.waterMotion=nextMode;
   this.onWaterModeChange(nextMode);
   if(nextMode==="swimming"&&previous!=="floating"&&previous!=="exhausted"&&
      this.waterNoticeCooldown===0){
    this.onStatus("Swimming","WASD to swim; Shift swims faster but costs more stamina. Release movement to float and recover.");
    this.waterNoticeCooldown=5;
   }
  }
  // Chunks regenerate from the seed; berry recovery is based on real elapsed
  // time even if this node wasn't loaded while the bush was growing back.
  this.terrain.update(p.x,p.z);
  this.updateVillagerJobs(dt);
  if(!this.inputBlocked){
   for(const camp of this.tribeCamps.values()){
    const tribe=camp.tribe;
    if(!this.discoveredTribes.has(tribe.id)&&Math.hypot(p.x-tribe.x,p.z-tribe.z)<TRIBE_DISCOVERY_RANGE){
     this.discoveredTribes.add(tribe.id);
     if(!this.getTribeRecord(tribe.id)?.discovered){
      this.onTribeDiscover(tribe);
      this.onStatus("A tribe discovered",tribe.name+" has a small settlement nearby. Meet its leader to learn more.");
     }
    }
   }

  }
  this.berryClock+=dt;
  if(this.berryClock>=2){this.berryClock=0;this.terrain.refreshBerries()}
  const bedY=this.groundY(p.x,p.z);
  p.y=deep?Math.max(bedY,waterNow.surfaceY-SWIM.surfaceOffset):bedY;
  if(this.character?.root){
   // Turn the entire existing skinned body into a mostly horizontal swimmer.
   // Keeping this on the avatar's visual root leaves collisions and camera
   // anchored to the original world actor and makes entering/exiting smooth.
   const root=this.character.root;
   const t=performance.now()/1000;
   const blend=Math.min(1,Math.max(0,dt)*7);
   const swimmingNow=deep&&this.waterMotion==="swimming";
   // Swimming is mostly prone with chest just below the waterline. When
   // floating or exhausted, tread upright with the head above the surface.
   const height=deep?(swimmingNow?.59:-.25)+.025*Math.sin(t*(swimmingNow?4:2.1)):0;
   const lean=deep?(swimmingNow?1.12:.16):0;
   root.position.y+=(height-root.position.y)*blend;
   root.position.z+=((swimmingNow?-.18:0)-root.position.z)*blend;
   root.rotation.x+=(lean-root.rotation.x)*blend;
  }
  const atStockpile=nearStockpile(this.stockpile,p.x,p.z);
  if(atStockpile!==this.stockpileInRange){
   this.stockpileInRange=atStockpile;
   this.onInteractionRangeChange?.(atStockpile);
  }
  // Drive authored movement clips with a continuous clock; pressing Shift
  // switches the player to the jogging loop without resetting progression.
  this.character?.animate(performance.now()/1000,actuallyMoved,running,
   this.waterMotion,!!this.keys.shift);
  const focus=this.focusTarget;
  const aim=focus?V(focus.x,this.groundY(focus.x,focus.z)+1.2,focus.z):V(p.x,p.y+1.2,p.z);
  // Never call ArcRotateCamera.setTarget every frame: it recomputes alpha/beta
  // from the old camera position and snaps a user's orbit angle back.
  // Move the target vector in place to retain rotation and zoom.
  c.target.copyFrom(B.Vector3.Lerp(c.target,aim,Math.min(1,dt*6)));
  const t=performance.now()/1000;
  this.people.forEach(person=>person.human.animate(t+person.phase,!!person.work?.moving));
  for(const camp of this.tribeCamps.values())
   camp.humans.forEach((human,i)=>human.animate(t+i*1.25,false));
  if(this.flame?.isEnabled())this.flame.scaling.y=1.05+.12*Math.sin(t*8);
  // Fish swim visibly in the shallows, staying inside their saved water site.
  // Movement remains render-only; stable catch IDs never depend on time.
  if(!this.inputBlocked){
   for(const f of this.fish){
    const phase=t*.8+f.phase;
    const offsetX=.23*Math.sin(phase),offsetZ=.23*Math.cos(phase*.8);
    f.root.position.x=f.site.x+offsetX;
    f.root.position.z=f.site.z+offsetZ;
    f.root.position.y=this.terrain.waterAt(f.site.x,f.site.z).surfaceY+
     .10+.024*Math.sin(t*2.3+f.phase);
    f.root.rotation.y=.5*Math.sin(phase);
    f.tail.rotation.y=.24*Math.sin(t*7+f.phase);
   }
  }
  // Behavior is local and deterministic in each loaded wildlife territory.
  // Fleeing animals avoid water and blocked props; boars defend themselves
  // after being attacked and can injure an unprepared hunter.
  if(!this.inputBlocked){
   for(const a of this.animals){
    if(a.dead)continue;
    const now=a.node.position;
    const result=animalMotion(a.species,now.x,now.z,a.origin.x,a.origin.z,
     p.x,p.z,t,dt,t<a.fleeUntil);
    const water=this.terrain.waterAt(result.x,result.z);
    if(water.depth<.08&&!this.isBlocked(result.x,result.z)&&
       Math.abs(this.groundY(result.x,result.z)-this.groundY(now.x,now.z))<.42){
     now.x=result.x;now.z=result.z;
    }
    now.y=this.groundY(now.x,now.z);
    a.node.rotation.y+=(result.heading-a.node.rotation.y)*Math.min(1,dt*6);
    const distance=Math.hypot(now.x-p.x,now.z-p.z);
    if(a.species==="boar"&&t<a.fleeUntil&&distance<1.8&&
       this.boarCooldown<=0&&!deep){
     this.boarCooldown=BOAR_ATTACK_COOLDOWN;
     this.onWildlifeDamage(WILDLIFE.boar.contactDamage,"a wild boar attack");
     this.onStatus("Wild boar attack!","The boar struck back. Retreat or fight.");
    }
   }
  }
 }
}
