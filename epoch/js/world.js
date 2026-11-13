import {founderAppearance,randomAppearance,normalizeAppearance} from "./characters.js?v=20261113h";
import {createQuaterniusHuman} from "./quaternius-models.js?v=20261113h";
import {PLOT_BY_ID} from "./settlement.js?v=20261113h";
import {createVillageWorld,syncVillageWorld,highlightVillagePlot} from "./village-world.js?v=20261113h";
import {STARTER_SEED,terrainHeight} from "./forest-generation.js?v=20261113h";
import {ForestChunks} from "./forest-chunks.js?v=20261113h";
const B=globalThis.BABYLON;
const V=(x,y,z)=>new B.Vector3(x,y,z);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class World {
 constructor(canvas,onGather,onStatus,onPlot=()=>{},seed=STARTER_SEED){
  this.canvas=canvas;this.onGather=onGather;this.onStatus=onStatus;this.worldSeed=seed>>>0;
  this.keys={};this.path=[];this.target=null;this.plotTarget=null;this.entities=[];this.obstacles=[];this.animals=[];this.people=[];this.walkTime=0;this.cooldown=0;this.onPlot=onPlot;
  this.engine=new B.Engine(canvas,true,{antialias:true,stencil:true,preserveDrawingBuffer:false});
  this.scene=new B.Scene(this.engine);this.scene.clearColor=new B.Color4(.62,.71,.62,1);
  this.scene.fogMode=B.Scene.FOGMODE_EXP2;this.scene.fogDensity=.020;this.scene.fogColor=new B.Color3(.62,.71,.62);
  this.makeMaterials();this.makeGround();this.makeLight();this.makeLandscape();this.makeCamp();createVillageWorld(this,onPlot);this.makePlayer();this.makeVillagers();this.makeCamera();this.bindInput();
  this.engine.runRenderLoop(()=>{const dt=Math.min(.045,this.engine.getDeltaTime()/1000);this.update(dt);this.scene.render()});
  window.addEventListener("resize",()=>this.engine.resize());
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
 decorate(resource,label,x,z,shape,chunkKey=null){
  const parent=new B.TransformNode(label,this.scene);parent.position=V(x,this.groundY(x,z),z);
  const mark=(mesh)=>{mesh.metadata={resource,label,x,z,chunkKey};this.entities.push({mesh,parent,resource,label,x,z,chunkKey})};
  if(shape==="tree"){
   const trunk=this.primitive("cylinder","tree trunk",parent,[0,1.35,0],[.55,2.7,.55],this.m.wood);mark(trunk);
   for(const [dx,dy,dz,s] of [[0,3.2,0,2.35],[-.8,2.8,.3,1.65],[.75,2.7,-.2,1.85],[.1,3.9,.15,1.45]]){
    const leaf=this.primitive("sphere","tree canopy",parent,[dx,dy,dz],[s,s*.85,s],(dx>0)?this.m.leaves2:this.m.leaves);mark(leaf);
   }
   this.obstacles.push({x,z,r:.75,chunkKey});
  } else if(shape==="rock"){
   const stone=this.primitive("sphere","stone deposit",parent,[0,.47,0],[1.3,.9,1.15],this.m.stone);mark(stone);
   const small=this.primitive("sphere","stone shard",parent,[.56,.25,.42],[.53,.44,.62],this.m.stoneDark);mark(small);
   this.obstacles.push({x,z,r:.74,chunkKey});
  } else {
   for(const [dx,dz] of [[0,0],[.4,.17],[-.28,.3]]){
    const bush=this.primitive("sphere","berry bush",parent,[dx,.42,dz],[.8,.75,.8],this.m.leafBright);mark(bush);
   }
   for(const [dx,dy,dz] of [[-.3,.6,.2],[.27,.57,-.2],[0,.84,.28]]){
    const berry=this.primitive("sphere","red berries",parent,[dx,dy,dz],[.17,.15,.17],this.m.berries);mark(berry);
   }
  }
  return parent;
 }
 makeLandscape(){
  // The founding village and the original gathering-resource silhouettes
  // remain. Positions outside it are generated from the persistent seed.
  this.terrain.update(0,0);
 }
 makeCamp(){
  this.fireNode=new B.TransformNode("campfire",this.scene);this.fireNode.position=V(-5,this.groundY(-5,-3),-3);
  for(let i=0;i<9;i++){const a=i*Math.PI*2/9;
   this.primitive("sphere","fire ring",this.fireNode,[Math.cos(a)*.9,.1,Math.sin(a)*.9],[.45,.28,.4],this.m.stoneDark).isPickable=false;}
  for(let i=0;i<3;i++){const log=this.primitive("cylinder","fire log",this.fireNode,[0,.18,0],[.27,1.8,.27],this.m.wood);log.rotation.z=Math.PI/2;log.rotation.y=i*2*Math.PI/3;log.isPickable=false}
  this.flame=this.primitive("sphere","flame",this.fireNode,[0,.65,0],[.62,1.15,.62],this.m.fire);this.flame.isPickable=false;this.flame.setEnabled(false);
  this.fireLight=new B.PointLight("fire glow",this.fireNode.position.add(V(0,1,0)),this.scene);this.fireLight.intensity=0;this.fireLight.diffuse=new B.Color3(1,.58,.2);this.fireLight.range=10;

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
  c.attachControl(this.canvas,true);if(c.inputs.attached.pointers)c.inputs.attached.pointers.buttons=[2];
  this.camera=c;this.canvas.addEventListener("contextmenu",e=>e.preventDefault());
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
  this.flame.setEnabled(!!fire);
  this.fireLight.intensity=fire?1.2:0;
 }
 syncVillage(village){syncVillageWorld(this,village)}
 highlightPlot(id){highlightVillagePlot(this,id)}
 distanceToPlot(id){
  const p=PLOT_BY_ID[id];if(!p)return Infinity;
  return Math.hypot(this.player.position.x-p.x,this.player.position.z-p.z);
 }
 walkToPlot(id){
  const plot=PLOT_BY_ID[id];if(!plot)return false;
  this.target=null;
  this.plotTarget=null;
  const d=this.distanceToPlot(id);
  if(d<=4.2&&d>=2.5){this.onPlot(id);return true}
  const dx=this.player.position.x-plot.x,dz=this.player.position.z-plot.z;
  const len=Math.hypot(dx,dz)||1;
  const success=this.plan(plot.x+dx/len*3.45,plot.z+dz/len*3.45);
  if(!success){this.onStatus("Plot unreachable","Try approaching the building from another direction.");return false}
  this.plotTarget=id;
  this.onStatus("Approaching "+id.replace("_"," "),"Walking to the village construction site.");
  return true;
 }

 bindInput(){
  const isText=()=>["INPUT","TEXTAREA"].includes(document.activeElement?.tagName);
  window.addEventListener("keydown",e=>{
   if(isText())return;const key=e.key.toLowerCase();
   if(["w","a","s","d","shift","e"].includes(key)){e.preventDefault();this.keys[key]=true;}
   if(key==="e")this.interactNearby();
  });
  window.addEventListener("keyup",e=>{this.keys[e.key.toLowerCase()]=false});
  window.addEventListener("blur",()=>{this.keys={}});
  this.scene.onPointerObservable.add(e=>{
   if(e.type!==B.PointerEventTypes.POINTERPICK || e.event.button!==0)return;
   const pick=e.pickInfo;if(!pick?.hit)return;const mesh=pick.pickedMesh;
   if(mesh?.metadata?.plotId){this.walkToPlot(mesh.metadata.plotId);return}
   if(mesh?.metadata?.resource){const meta=mesh.metadata;this.walkToResource(meta);return}
   if(mesh?.metadata?.terrain){this.target=null;this.plotTarget=null;this.plan(pick.pickedPoint.x,pick.pickedPoint.z);this.onStatus("Traveling","Walking to the selected location.")}
  });
 }
 interactNearby(){
  const p=this.player.position;
  const near=this.entities.filter(e=>Math.hypot(e.x-p.x,e.z-p.z)<2.7).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
  if(near)this.walkToResource(near);else this.onStatus("Nothing nearby","Move closer to a tree, rock or berry bush.");
 }
 walkToResource(meta){
  const dist=Math.hypot(meta.x-this.player.position.x,meta.z-this.player.position.z);
  if(dist<2.5){this.target=null;this.plotTarget=null;this.path=[];this.collect(meta);return}
  this.plotTarget=null;this.target=meta;const dx=this.player.position.x-meta.x,dz=this.player.position.z-meta.z,len=Math.hypot(dx,dz)||1;
  this.plan(meta.x+dx/len*2.05,meta.z+dz/len*2.05);
  this.onStatus("Approaching "+meta.label,"Your adventurer is moving into gathering range.");
 }
 collect(meta){
  if(this.cooldown>0)return;
  this.cooldown=.5;this.onGather(meta.resource);this.onStatus("Gathering "+meta.label,"Click again or find another resource.");
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
  this.cooldown=Math.max(0,this.cooldown-dt);
  const p=this.player.position,c=this.camera;
  const forward=V(-Math.cos(c.alpha),0,-Math.sin(c.alpha)),right=V(forward.z,0,-forward.x);
  const x=(this.keys.d?1:0)-(this.keys.a?1:0),z=(this.keys.w?1:0)-(this.keys.s?1:0);
  let direction=V(0,0,0),moving=false;
  if(x||z){this.path=[];this.target=null;this.plotTarget=null;direction=right.scale(x).add(forward.scale(z)).normalize();moving=true;}
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
  // Loading a new forest chunk is triggered only when crossing a chunk edge.
  this.terrain.update(p.x,p.z);
  p.y=this.groundY(p.x,p.z);
  // Drive authored movement clips with a continuous clock; pressing Shift
  // switches the player to the jogging loop without resetting progression.
  this.character?.animate(performance.now()/1000,moving,moving&&!!this.keys.shift);
  if(this.target && Math.hypot(this.target.x-p.x,this.target.z-p.z)<2.55){const target=this.target;this.target=null;this.path=[];this.collect(target)}
  if(this.plotTarget && this.distanceToPlot(this.plotTarget)<4.2){
   const id=this.plotTarget;this.plotTarget=null;this.path=[];this.onPlot(id);
  }
  const aim=V(p.x,p.y+1.2,p.z);
  c.setTarget(B.Vector3.Lerp(c.target,aim,Math.min(1,dt*6)));
  const t=performance.now()/1000;
  this.people.forEach(person=>person.human.animate(t+person.phase,false));
  if(this.flame.isEnabled())this.flame.scaling.y=1.05+.12*Math.sin(t*8);
  this.animals.forEach((a,i)=>{
   a.node.position.x=a.origin.x+Math.sin(t*.18+a.phase)*1.35;
   a.node.position.z=a.origin.z+Math.cos(t*.18+a.phase)*1.2;
   a.node.position.y=this.groundY(a.node.position.x,a.node.position.z);
   a.node.rotation.y=Math.atan2(Math.cos(t*.18+a.phase),-Math.sin(t*.18+a.phase));
  });
 }
}
