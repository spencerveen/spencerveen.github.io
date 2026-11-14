import {founderAppearance,randomAppearance,normalizeAppearance} from "./characters.js?v=20261113k";
import {createQuaterniusHuman} from "./quaternius-models.js?v=20261113k";
import {BUILDINGS} from "./settlement.js?v=20261114b";
import {choosePlacement,placementCheck} from "./village-placement.js?v=20261114b";
import {stockpileValidation,nearStockpile,LEGACY_HOME,BUILD_GRID} from "./stockpile.js?v=20261114a";
import {createStockpileWorld,syncStockpileWorld,showStockpilePreview} from "./stockpile-world.js?v=20261114b";
import {createVillageWorld,syncVillageWorld,showVillagePreview} from "./village-world.js?v=20261114b";
import {STARTER_SEED,terrainHeight,chunkCoord,chunkKey} from "./forest-generation.js?v=20261113k";
import {ForestChunks} from "./forest-chunks.js?v=20261113k";
const B=globalThis.BABYLON;
const V=(x,y,z)=>new B.Vector3(x,y,z);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class World {
 constructor(canvas,onGather,onStatus,onBuildingSelect=()=>{},seed=STARTER_SEED,getResourceStatus=()=>null,onFoundStockpile=()=>false,onOpenStockpile=()=>{},onBuild=()=>({ok:false}),getBuildStatus=()=>({ok:false}),onPlacementChange=()=>{}){
  this.canvas=canvas;this.onGather=onGather;this.onStatus=onStatus;this.getResourceStatus=getResourceStatus;this.onFoundStockpile=onFoundStockpile;this.onOpenStockpile=onOpenStockpile;this.onBuild=onBuild;this.getBuildStatus=getBuildStatus;this.onPlacementChange=onPlacementChange;this.worldSeed=seed>>>0;
  this.keys={};this.path=[];this.target=null;this.plotTarget=null;this.entities=[];this.obstacles=[];this.animals=[];this.people=[];this.walkTime=0;this.cooldown=0;this.berryClock=0;this.targetAction="gather";this.onPlot=onBuildingSelect;this.placingBuilding=null;this.buildingCandidate=null;this.village=null;this.placingStockpile=false;this.stockpileTarget=false;this.stockpile=null;this.stockpileCandidate=null;this.homePositionKey=null;
  this._inputBlocked=false;this.placementPinned=false;this.cameraDragging=false;this.focusTarget=null;
  this.stockpileInRange=undefined;this.onInteractionRangeChange=()=>{};this.hoveredInteraction=null;
  this.engine=new B.Engine(canvas,true,{antialias:true,stencil:true,preserveDrawingBuffer:false});
  this.scene=new B.Scene(this.engine);this.scene.clearColor=new B.Color4(.62,.71,.62,1);
  this.scene.fogMode=B.Scene.FOGMODE_EXP2;this.scene.fogDensity=.020;this.scene.fogColor=new B.Color3(.62,.71,.62);
  this.makeMaterials();this.makeGround();this.makeLight();this.makeLandscape();createVillageWorld(this,onBuildingSelect);createStockpileWorld(this);this.makePlayer();this.makeVillagers();this.makeCamera();this.bindInput();
  this.engine.runRenderLoop(()=>{const dt=Math.min(.045,this.engine.getDeltaTime()/1000);this.update(dt);this.scene.render()});
  window.addEventListener("resize",()=>this.engine.resize());
 }
 get inputBlocked(){return !!this._inputBlocked}
 set inputBlocked(value){
  const blocked=!!value;
  if(blocked===this._inputBlocked)return;
  this._inputBlocked=blocked;
  if(blocked){
   this.keys={};this.path=[];this.target=null;this.plotTarget=null;this.stockpileTarget=false;this.cameraDragging=false;
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
   river:this.mat("river","#598d8f"),fire:this.mat("fire","#ef9c45"),flame:this.mat("flame","#f6d181"),grass:this.mat("grass","#74986b")};
  this.m.river.alpha=.76;this.m.fire.emissiveColor=new B.Color3(.76,.28,.04);this.m.flame.emissiveColor=new B.Color3(.95,.63,.2);
 }
 makeGround(){
  // Chunk geometry is managed independently from the permanent village,
  // characters and camera. The world has no fixed outer boundaries.
  this.terrain=new ForestChunks(this,this.worldSeed);
 }
 makeLight(){
  const hemi=new B.HemisphericLight("soft sky",V(0,1,0),this.scene);hemi.intensity=.77;hemi.groundColor=new B.Color3(.32,.37,.29);
  const sun=new B.DirectionalLight("sun",V(-.5,-1,.4),this.scene);sun.intensity=.85;sun.diffuse=new B.Color3(1,.91,.75);
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
  const villagers=[
   {name:"Tala",sex:"female",x:-5,z:7},
   {name:"Bren",sex:"male",x:-10,z:-5},
   {name:"Kira",sex:"female",x:6,z:10},
   {name:"Oren",sex:"male",x:13,z:-5}
  ];
  this.people=villagers.map((person,i)=>{
   const profile=randomAppearance("epoch:tribe:"+person.name,person.sex);
   const human=createQuaterniusHuman(this.scene,profile,null,person.name);
   human.root.position=V(person.x,this.groundY(person.x,person.z),person.z);
   human.root.rotation.y=i*1.55;
   return {...person,profile,human,phase:i*2.6};
  });
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
 makeAnimal(x,z,chunkKey=null){
  const node=new B.TransformNode("wandering deer",this.scene);node.position=V(x,this.groundY(x,z),z);
  this.primitive("sphere","deer body",node,[0,.9,0],[1.35,.67,.59],this.m.woodLight).isPickable=false;
  this.primitive("sphere","deer head",node,[0,1.37,.63],[.48,.45,.5],this.m.woodLight).isPickable=false;
  for(const dx of [-.43,.43])for(const dz of [-.2,.22]){
   this.primitive("cylinder","deer leg",node,[dx,.43,dz],[.12,.72,.12],this.m.wood).isPickable=false;
  }
  this.animals.push({node,origin:V(x,0,z),phase:x+z,chunkKey});
  return node;
 }
 setWorldSeed(seed){
  // Reset only streamed terrain/resources/wildlife. Permanent village/characters
  // remain intact; the Village UI will resync their build state separately.
  for(const key of [...this.terrain.loaded.keys()])this.terrain.remove(key);
  this.worldSeed=(Number(seed)>>>0)||STARTER_SEED;
  this.terrain.seed=this.worldSeed;
  this.terrain.center=null;
  this.terrain.update(this.player.position.x,this.player.position.z);
  this.path=[];this.target=null;this.plotTarget=null;
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
  const key=pile?pile.x+","+pile.z:"unfounded";
  if(key===this.homePositionKey)return;
  this.homePositionKey=key;
  const base=pile||LEGACY_HOME;
  const dx=base.x-LEGACY_HOME.x,dz=base.z-LEGACY_HOME.z;
  for(const person of this.people||[]){
   const x=person.x+dx,z=person.z+dz;
   person.human.root.position=V(x,this.groundY(x,z),z);
  }
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
  this.focusTarget=null;
  if(nearStockpile(this.stockpile,this.player.position.x,this.player.position.z)){
   this.path=[];this.target=null;this.plotTarget=null;this.stockpileTarget=false;
   this.onOpenStockpile();return true;
  }
  const p=this.player.position,h=this.stockpile,dx=p.x-h.x,dz=p.z-h.z,len=Math.hypot(dx,dz)||1;
  const destX=h.x+dx/len*3.4,destZ=h.z+dz/len*3.4;
  const success=this.plan(destX,destZ);
  if(success){this.stockpileTarget=true;this.target=null;this.plotTarget=null;
   this.onStatus("Returning to village","Walking to the stockpile to unload supplies.");
  }else this.onStatus("Cannot reach stockpile","Try approaching from another side.");
  return success;
 }
 bindInput(){
  const isText=()=>["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
  window.addEventListener("keydown",e=>{
   if(this.inputBlocked||e.defaultPrevented||isText())return;const key=e.key.toLowerCase();
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
    if(key==="e")return;
   }
   // Keep keyboard camera orbit during exploration without stealing arrow keys
   // from placement controls, text fields or focused interface buttons.
   const orbit={arrowleft:[-.11,0],arrowright:[.11,0],arrowup:[0,-.08],arrowdown:[0,.08]}[key];
   if(orbit&&(document.activeElement===this.canvas||document.activeElement===document.body)){
    e.preventDefault();
    this.camera.alpha+=orbit[0];
    this.camera.beta=clamp(this.camera.beta+orbit[1],this.camera.lowerBetaLimit,this.camera.upperBetaLimit);
    return;
   }
   if(["w","a","s","d","shift","e"].includes(key)){e.preventDefault();this.keys[key]=true;}
   if(key==="e")this.interactNearby(e.shiftKey?"cut":"gather");
  });
  window.addEventListener("keyup",e=>{this.keys[e.key.toLowerCase()]=false});
  window.addEventListener("blur",()=>{this.keys={};this.cameraDragging=false});
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
    const key=meta?.stockpile?"stockpile":meta?.buildingId||null;
    this.canvas.style.cursor=key||meta?.resource?"pointer":"default";
    if(key&&key!==this.hoveredInteraction){
     if(meta.stockpile)this.onStatus("Village stockpile","Click to open village storage and construction.");
     else{
      const kind=meta.buildingKind;
      const destination={lore:"Technology",council:"Culture",family:"Dynasty",hearth:"Cooking Hearth"}[kind]||"Building";
      this.onStatus(BUILDINGS[kind]?.name||"Village building","Click to open "+destination+".");
     }
    }
    this.hoveredInteraction=key;
   }
   if(e.type!==B.PointerEventTypes.POINTERPICK||e.event?.button!==0)return;
   if(!pick?.hit)return;
   const mesh=pick.pickedMesh;
   if(mesh?.metadata?.stockpile){this.walkToStockpile();return}
   if(mesh?.metadata?.buildingId){
    this.path=[];this.target=null;this.plotTarget=null;this.stockpileTarget=false;
    this.onPlot(mesh.metadata.buildingId);return;
   }
   if(mesh?.metadata?.resource){
    this.stockpileTarget=false;
    this.walkToResource(mesh.metadata,e.event.shiftKey?"cut":"gather");return;
   }
   if(mesh?.metadata?.terrain){
    this.focusTarget=null;
    this.stockpileTarget=false;this.target=null;this.plotTarget=null;
    this.plan(pick.pickedPoint.x,pick.pickedPoint.z);
    this.onStatus("Traveling","Walking to the selected location.");
   }
  });
 }
 interactNearby(action="gather"){
  const p=this.player.position;
  const near=this.entities.filter(e=>(action!=="cut"||e.resource==="food")
    &&Math.hypot(e.x-p.x,e.z-p.z)<2.7)
   .sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
  if(near)this.walkToResource(near,action);
  else this.onStatus("Nothing nearby",action==="cut"?"Get within gathering range of a berry bush to cut it down.":"Move closer to a tree, rock or berry bush.");
 }
 walkToResource(meta,action="gather"){
  this.focusTarget=null;
  const status=this.getResourceStatus(meta);
  if(status?.removed){this.onStatus("Already depleted","This resource is no longer available.");return}
  const dist=Math.hypot(meta.x-this.player.position.x,meta.z-this.player.position.z);
  if(dist<2.5){
   this.target=null;this.plotTarget=null;this.path=[];
   this.collect(meta,action);return;
  }
  this.plotTarget=null;this.stockpileTarget=false;this.target=meta;this.targetAction=action;
  const dx=this.player.position.x-meta.x,dz=this.player.position.z-meta.z,len=Math.hypot(dx,dz)||1;
  if(!this.plan(meta.x+dx/len*2.05,meta.z+dz/len*2.05)){
   this.target=null;this.onStatus("Cannot reach resource","Try approaching from another side.");return;
  }
  this.onStatus("Approaching "+meta.label,action==="cut"&&meta.resource==="food"?
   "Going to chop down the bush for vines. This removes it permanently.":
   "Gathering available materials. Shift+click a berry bush to cut it for vines.");
 }
 collect(meta,action="gather"){
  if(this.cooldown>0)return;
  this.cooldown=.5;
  const result=this.onGather(meta,action);
  if(result?.removed&&meta.resourceId)this.terrain.removeResource(meta.resourceId,meta.chunkKey);
  else if(meta.resource==="food"&&meta.resourceId)this.terrain.refreshBerries();
  this.onStatus(result?.type==="full"?"Pack full":
   result?.type==="empty"?"Resource depleted":
   result?.removed?"Resource exhausted":"Gathering "+meta.label,
   result?.label||"No resources gathered.");
 }

 isBlocked(x,z){
  // No legacy square world boundary. Terrain and plots are navigable using
  // the same collision test wherever their chunks are currently active.
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
 update(dt){
  if(this.inputBlocked){this.keys={};this.path=[];this.target=null;this.stockpileTarget=false;}
  this.cooldown=Math.max(0,this.cooldown-dt);
  const p=this.player.position,c=this.camera;
  const forward=V(-Math.cos(c.alpha),0,-Math.sin(c.alpha)),right=V(forward.z,0,-forward.x);
  const x=(this.keys.d?1:0)-(this.keys.a?1:0),z=(this.keys.w?1:0)-(this.keys.s?1:0);
  let direction=V(0,0,0),moving=false;
  if(x||z){this.focusTarget=null;this.path=[];this.target=null;this.plotTarget=null;this.stockpileTarget=false;direction=right.scale(x).add(forward.scale(z)).normalize();moving=true;}
  else if(this.path.length){
   const next=this.path[0],diff=next.subtract(p);diff.y=0;
   if(diff.length()<.25){this.path.shift();}
   else{direction=diff.normalize();moving=true;}
  }
  if(moving){
   const speed=this.keys.shift?6.4:3.6,movement=direction.scale(speed*dt);
   const test=p.add(movement);
   if(!this.isBlocked(test.x,test.z)){p.x=test.x;p.z=test.z}
   else if(!this.isBlocked(p.x+movement.x,p.z))p.x+=movement.x;
   else if(!this.isBlocked(p.x,p.z+movement.z))p.z+=movement.z;
   this.player.rotation.y=Math.atan2(direction.x,direction.z);
   this.walkTime+=dt*speed*2.4;
  }
  else this.walkTime=0;
  // Chunks regenerate from the seed; berry recovery is based on real elapsed
  // time even if this node wasn't loaded while the bush was growing back.
  this.terrain.update(p.x,p.z);
  this.berryClock+=dt;
  if(this.berryClock>=2){this.berryClock=0;this.terrain.refreshBerries()}
  p.y=this.groundY(p.x,p.z);
  const atStockpile=nearStockpile(this.stockpile,p.x,p.z);
  if(atStockpile!==this.stockpileInRange){
   this.stockpileInRange=atStockpile;
   this.onInteractionRangeChange?.(atStockpile);
  }
  // Drive authored movement clips with a continuous clock; pressing Shift
  // switches the player to the jogging loop without resetting progression.
  this.character?.animate(performance.now()/1000,moving,moving&&!!this.keys.shift);
  if(this.target && Math.hypot(this.target.x-p.x,this.target.z-p.z)<2.55){const target=this.target,action=this.targetAction;this.target=null;this.path=[];this.collect(target,action)}
  if(this.stockpileTarget&&this.stockpile
    &&nearStockpile(this.stockpile,p.x,p.z)){
   this.stockpileTarget=false;this.path=[];this.onOpenStockpile();
  }
  const focus=this.focusTarget;
  const aim=focus?V(focus.x,this.groundY(focus.x,focus.z)+1.2,focus.z):V(p.x,p.y+1.2,p.z);
  // Never call ArcRotateCamera.setTarget every frame: it recomputes alpha/beta
  // from the old camera position and snaps a user's orbit angle back.
  // Move the target vector in place to retain rotation and zoom.
  c.target.copyFrom(B.Vector3.Lerp(c.target,aim,Math.min(1,dt*6)));
  const t=performance.now()/1000;
  this.people.forEach(person=>person.human.animate(t+person.phase,false));
  if(this.flame?.isEnabled())this.flame.scaling.y=1.05+.12*Math.sin(t*8);
  this.animals.forEach((a,i)=>{
   a.node.position.x=a.origin.x+Math.sin(t*.18+a.phase)*1.35;
   a.node.position.z=a.origin.z+Math.cos(t*.18+a.phase)*1.2;
   a.node.position.y=this.groundY(a.node.position.x,a.node.position.z);
   a.node.rotation.y=Math.atan2(Math.cos(t*.18+a.phase),-Math.sin(t*.18+a.phase));
  });
 }
}
