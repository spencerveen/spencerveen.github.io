import {founderAppearance,randomAppearance,normalizeAppearance} from "./characters.js?v=20261113c";
import {createModelHuman} from "./character-models.js?v=20261113c";
const B=globalThis.BABYLON;
const V=(x,y,z)=>new B.Vector3(x,y,z);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class World {
 constructor(canvas,onGather,onStatus){
  this.canvas=canvas;this.onGather=onGather;this.onStatus=onStatus;
  this.keys={};this.path=[];this.target=null;this.entities=[];this.obstacles=[];this.animals=[];this.people=[];this.walkTime=0;this.cooldown=0;
  this.engine=new B.Engine(canvas,true,{antialias:true,stencil:true,preserveDrawingBuffer:false});
  this.scene=new B.Scene(this.engine);this.scene.clearColor=new B.Color4(.62,.71,.62,1);
  this.scene.fogMode=B.Scene.FOGMODE_EXP2;this.scene.fogDensity=.011;this.scene.fogColor=new B.Color3(.62,.71,.62);
  this.makeMaterials();this.makeGround();this.makeLight();this.makeLandscape();this.makeCamp();this.makePlayer();this.makeVillagers();this.makeCamera();this.bindInput();
  this.engine.runRenderLoop(()=>{const dt=Math.min(.045,this.engine.getDeltaTime()/1000);this.update(dt);this.scene.render()});
  window.addEventListener("resize",()=>this.engine.resize());
 }
 groundY(x,z){return .28*Math.sin(x*.18)*Math.cos(z*.22)+.14*Math.sin(x*.36+z*.23)}
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
  const g=B.MeshBuilder.CreateGround("terrain",{width:80,height:80,subdivisions:55,updatable:true},this.scene);
  const p=g.getVerticesData(B.VertexBuffer.PositionKind);
  for(let i=0;i<p.length;i+=3)p[i+1]=this.groundY(p[i],p[i+2]);
  const idx=g.getIndices(),normals=[];B.VertexData.ComputeNormals(p,idx,normals);
  g.updateVerticesData(B.VertexBuffer.PositionKind,p);g.updateVerticesData(B.VertexBuffer.NormalKind,normals);
  g.material=this.m.earth;g.isPickable=true;this.ground=g;
  const river=B.MeshBuilder.CreateGround("river",{width:8,height:75,subdivisions:16},this.scene);river.position=V(30,.12,0);river.material=this.m.river;river.isPickable=false;
  const path=B.MeshBuilder.CreateGround("clearing",{width:11,height:11,subdivisions:8},this.scene);path.position=V(-3,this.groundY(-3,-2)+.03,-2);path.rotation.y=.24;path.material=this.m.soil;path.isPickable=false;
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
 decorate(resource,label,x,z,shape){
  const parent=new B.TransformNode(label,this.scene);parent.position=V(x,this.groundY(x,z),z);
  const mark=(mesh)=>{mesh.metadata={resource,label,x,z};this.entities.push({mesh,parent,resource,label,x,z})};
  if(shape==="tree"){
   const trunk=this.primitive("cylinder","tree trunk",parent,[0,1.35,0],[.55,2.7,.55],this.m.wood);mark(trunk);
   for(const [dx,dy,dz,s] of [[0,3.2,0,2.35],[-.8,2.8,.3,1.65],[.75,2.7,-.2,1.85],[.1,3.9,.15,1.45]]){
    const leaf=this.primitive("sphere","tree canopy",parent,[dx,dy,dz],[s,s*.85,s],(dx>0)?this.m.leaves2:this.m.leaves);mark(leaf);
   }
   this.obstacles.push({x,z,r:.75});
  } else if(shape==="rock"){
   const stone=this.primitive("sphere","stone deposit",parent,[0,.47,0],[1.3,.9,1.15],this.m.stone);mark(stone);
   const small=this.primitive("sphere","stone shard",parent,[.56,.25,.42],[.53,.44,.62],this.m.stoneDark);mark(small);
   this.obstacles.push({x,z,r:.74});
  } else {
   for(const [dx,dz] of [[0,0],[.4,.17],[-.28,.3]]){
    const bush=this.primitive("sphere","berry bush",parent,[dx,.42,dz],[.8,.75,.8],this.m.leafBright);mark(bush);
   }
   for(const [dx,dy,dz] of [[-.3,.6,.2],[.27,.57,-.2],[0,.84,.28]]){
    const berry=this.primitive("sphere","red berries",parent,[dx,dy,dz],[.17,.15,.17],this.m.berries);mark(berry);
   }
  }
 }
 makeLandscape(){
  const trees=[[4,4],[9,7],[13,1],[7,-9],[-9,8],[-14,-3],[-19,9],[16,13],[-22,-11],[11,-17],[19,-7],[-16,17],[1,15],[22,20],[-24,21],[6,22],[-7,-18],[-23,-20],[22,-19]];
  const rocks=[[3,-7],[-8,-8],[11,2],[-13,12],[16,-13],[-19,-16],[0,21],[21,8],[-23,4]];
  const berries=[[-2,5],[6,-4],[-10,1],[11,12],[-15,-10],[3,17],[-20,11]];
  trees.forEach(([x,z],i)=>this.decorate("wood",i%2?"Pinewood":"Ancient Oak",x,z,"tree"));
  rocks.forEach(([x,z])=>this.decorate("stone","Stone Deposit",x,z,"rock"));
  berries.forEach(([x,z])=>this.decorate("food","Wild Berry Bush",x,z,"bush"));
  // Decorative tufts break up the ground plane without introducing an asset pipeline.
  let seed=23;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<125;i++){
   const x=rand()*60-30,z=rand()*60-30;
   if(x>25||Math.hypot(x+3,z+2)<7)continue;
   const tuft=B.MeshBuilder.CreateSphere("ground foliage",{diameter:.2,segments:4},this.scene);
   tuft.position=V(x,this.groundY(x,z)+.12,z);tuft.scaling=V(.55+rand(),.65,.45+rand());tuft.material=this.m.grass;tuft.isPickable=false;
  }
  this.makeAnimal(-1,14);this.makeAnimal(18,-2);this.makeAnimal(-16,0);
 }
 makeCamp(){
  this.fireNode=new B.TransformNode("campfire",this.scene);this.fireNode.position=V(-5,this.groundY(-5,-3),-3);
  for(let i=0;i<9;i++){const a=i*Math.PI*2/9;
   this.primitive("sphere","fire ring",this.fireNode,[Math.cos(a)*.9,.1,Math.sin(a)*.9],[.45,.28,.4],this.m.stoneDark).isPickable=false;}
  for(let i=0;i<3;i++){const log=this.primitive("cylinder","fire log",this.fireNode,[0,.18,0],[.27,1.8,.27],this.m.wood);log.rotation.z=Math.PI/2;log.rotation.y=i*2*Math.PI/3;log.isPickable=false}
  this.flame=this.primitive("sphere","flame",this.fireNode,[0,.65,0],[.62,1.15,.62],this.m.fire);this.flame.isPickable=false;this.flame.setEnabled(false);
  this.fireLight=new B.PointLight("fire glow",this.fireNode.position.add(V(0,1,0)),this.scene);this.fireLight.intensity=0;this.fireLight.diffuse=new B.Color3(1,.58,.2);this.fireLight.range=10;
  this.shelterNode=new B.TransformNode("shelter",this.scene);this.shelterNode.position=V(-8,this.groundY(-8,4),4);
  const base=this.primitive("box","hut floor",this.shelterNode,[0,.16,0],[4,.3,3.4],this.m.wood);base.isPickable=false;
  for(const x of [-1.75,1.75])for(const z of [-1.4,1.4]){
   const pillar=this.primitive("cylinder","hut post",this.shelterNode,[x,1.25,z],[.22,2.4,.22],this.m.wood);pillar.isPickable=false;
  }
  for(const x of [-1,1]){
   const roof=this.primitive("box","slanted hut roof",this.shelterNode,[x*.92,2.58,0],[2.25,.22,4.2],this.m.woodLight);
   roof.rotation.z=x*-.45;roof.isPickable=false;
  }
  this.shelterNode.setEnabled(false);
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
  this.character=createModelHuman(this.scene,p,this.player,"adventurer");
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
   const human=createModelHuman(this.scene,profile,null,person.name);
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
 makeAnimal(x,z){
  const node=new B.TransformNode("wandering deer",this.scene);node.position=V(x,this.groundY(x,z),z);
  this.primitive("sphere","deer body",node,[0,.9,0],[1.35,.67,.59],this.m.woodLight).isPickable=false;
  this.primitive("sphere","deer head",node,[0,1.37,.63],[.48,.45,.5],this.m.woodLight).isPickable=false;
  for(const dx of [-.43,.43])for(const dz of [-.2,.22]){
   this.primitive("cylinder","deer leg",node,[dx,.43,dz],[.12,.72,.12],this.m.wood).isPickable=false;
  }
  this.animals.push({node,origin:V(x,0,z),phase:x+z});
 }
 setDiscovery(fire,shelter){
  this.flame.setEnabled(fire);this.fireLight.intensity=fire?1.2:0;
  this.shelterNode.setEnabled(shelter);
  const index=this.obstacles.findIndex(o=>o.hut);if(index!==-1)this.obstacles.splice(index,1);
  if(shelter)this.obstacles.push({x:-8,z:4,r:2.2,hut:true});
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
   if(mesh?.metadata?.resource){const meta=mesh.metadata;this.walkToResource(meta);return}
   if(mesh===this.ground){this.target=null;this.plan(pick.pickedPoint.x,pick.pickedPoint.z);this.onStatus("Traveling","Walking to the selected location.")}
  });
 }
 interactNearby(){
  const p=this.player.position;
  const near=this.entities.filter(e=>Math.hypot(e.x-p.x,e.z-p.z)<2.7).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
  if(near)this.walkToResource(near);else this.onStatus("Nothing nearby","Move closer to a tree, rock or berry bush.");
 }
 walkToResource(meta){
  const dist=Math.hypot(meta.x-this.player.position.x,meta.z-this.player.position.z);
  if(dist<2.5){this.target=null;this.path=[];this.collect(meta);return}
  this.target=meta;const dx=this.player.position.x-meta.x,dz=this.player.position.z-meta.z,len=Math.hypot(dx,dz)||1;
  this.plan(meta.x+dx/len*2.05,meta.z+dz/len*2.05);
  this.onStatus("Approaching "+meta.label,"Your adventurer is moving into gathering range.");
 }
 collect(meta){
  if(this.cooldown>0)return;
  this.cooldown=.5;this.onGather(meta.resource);this.onStatus("Gathering "+meta.label,"Click again or find another resource.");
 }
 isBlocked(x,z){if(x>25||x< -29||z>29||z< -29)return true;return this.obstacles.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+.31)}
 plan(x,z){
  const p=this.player.position;const route=this.findPath(p.x,p.z,clamp(x,-28,24),clamp(z,-28,28));
  this.path=route;return route.length>0;
 }
 findPath(sx,sz,ex,ez){
  const step=1.5,n=39;const ix=v=>clamp(Math.round((v+28)/step),0,n-1),coord=i=>-28+i*step;
  const start=[ix(sx),ix(sz)],goal=[ix(ex),ix(ez)];
  const open=[{x:start[0],z:start[1],g:0,f:0}],seen=new Map(),closed=new Set();
  const key=(x,z)=>x+","+z,goalKey=key(...goal);
  seen.set(key(...start),open[0]);let final=null;
  const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for(let i=0;i<3500 && open.length;i++){
   open.sort((a,b)=>a.f-b.f);const current=open.shift(),k=key(current.x,current.z);
   if(closed.has(k))continue;closed.add(k);
   if(k===goalKey){final=current;break}
   for(const [dx,dz] of directions){
    const x=current.x+dx,z=current.z+dz,nk=key(x,z);
    if(x<0||x>=n||z<0||z>=n||closed.has(nk))continue;
    if(this.isBlocked(coord(x),coord(z)) && nk!==goalKey)continue;
    if(dx&&dz && (this.isBlocked(coord(current.x+dx),coord(current.z))||this.isBlocked(coord(current.x),coord(current.z+dz))))continue;
    const g=current.g+Math.hypot(dx,dz),older=seen.get(nk);if(older&&older.g<=g)continue;
    const node={x,z,g,f:g+Math.hypot(goal[0]-x,goal[1]-z),parent:current};
    seen.set(nk,node);open.push(node);
   }
  }
  if(!final)return [];
  const route=[];let cur=final;while(cur?.parent){route.unshift(V(coord(cur.x),0,coord(cur.z)));cur=cur.parent}
  if(!this.isBlocked(ex,ez))route.push(V(ex,0,ez));
  return route;
 }
 update(dt){
  this.cooldown=Math.max(0,this.cooldown-dt);
  const p=this.player.position,c=this.camera;
  const forward=V(-Math.cos(c.alpha),0,-Math.sin(c.alpha)),right=V(forward.z,0,-forward.x);
  const x=(this.keys.d?1:0)-(this.keys.a?1:0),z=(this.keys.w?1:0)-(this.keys.s?1:0);
  let direction=V(0,0,0),moving=false;
  if(x||z){this.path=[];this.target=null;direction=right.scale(x).add(forward.scale(z)).normalize();moving=true;}
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
  p.y=this.groundY(p.x,p.z);
  this.character?.animate(moving?this.walkTime:performance.now()/1000,moving);
  if(this.target && Math.hypot(this.target.x-p.x,this.target.z-p.z)<2.55){const target=this.target;this.target=null;this.path=[];this.collect(target)}
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
