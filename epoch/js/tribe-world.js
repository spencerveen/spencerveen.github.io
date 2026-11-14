/**
 * Small, streamed Stone Age camps for the procedural tribes in tribes.js.
 * Visual roots and skinned characters are disposed when their chunk unloads.
 */
import {TRIBE_CLEARING_RADIUS} from "./tribes.js?v=20261114m";
const B=globalThis.BABYLON;
const V=(x,y,z)=>new B.Vector3(x,y,z);

function tagged(mesh,tribe){
 mesh.metadata={tribeId:tribe.id,tribeLeader:false};
 mesh.isPickable=true;
 return mesh;
}
function add(world,name,kind,parent,position,scale,material,tribe){
 const mesh=kind==="sphere"?B.MeshBuilder.CreateSphere(name,{diameter:1,segments:9},world.scene):
  kind==="cone"?B.MeshBuilder.CreateCylinder(name,{height:1,diameterTop:0,diameterBottom:1,tessellation:10},world.scene):
  kind==="cylinder"?B.MeshBuilder.CreateCylinder(name,{height:1,diameter:1,tessellation:11},world.scene):
  B.MeshBuilder.CreateBox(name,{size:1},world.scene);
 mesh.parent=parent;mesh.position=V(...position);mesh.scaling=V(...scale);mesh.material=material;
 tagged(mesh,tribe);
 return mesh;
}
function label(world,root,tribe){
 const panel=B.MeshBuilder.CreatePlane("Tribal leader sign: "+tribe.name,{width:3.25,height:.65},world.scene);
 panel.parent=root;panel.position=V(0,3.15,2.4);
 panel.billboardMode=B.Mesh.BILLBOARDMODE_ALL;
 const texture=new B.DynamicTexture("Tribe label "+tribe.id,{width:640,height:128},world.scene,false);
 texture.hasAlpha=true;
 const ctx=texture.getContext();
 ctx.clearRect(0,0,640,128);
 ctx.fillStyle="rgba(15,26,20,.92)";ctx.fillRect(3,3,634,122);
 ctx.strokeStyle="#c29d5e";ctx.lineWidth=3;ctx.strokeRect(4,4,632,120);
 ctx.font="bold 35px Arial";ctx.fillStyle="#f2e2c4";ctx.textAlign="center";
 ctx.fillText(tribe.name,320,55,605);
 ctx.font="24px Arial";ctx.fillStyle="#d1bf91";ctx.fillText("Meet the tribal leader",320,94,605);
 texture.update();
 const m=new B.StandardMaterial("Tribe sign "+tribe.id,world.scene);
 m.diffuseTexture=texture;m.emissiveTexture=texture;
 m.diffuseColor=B.Color3.White();m.emissiveColor=B.Color3.White();
 m.specularColor=B.Color3.Black();m.useAlphaFromDiffuseTexture=true;
 m.backFaceCulling=false;m.disableLighting=true;
 panel.material=m;tagged(panel,tribe);
 panel.metadata.tribeLeader=true;
 panel.onDisposeObservable.addOnce(()=>{m.dispose();texture.dispose()});
}
export function createTribeWorld(world,createHuman){
 const mats={
  earth:world.mat("Tribal cleared earth","#7a6547"),
  wood:world.mat("Tribal raw timber","#675039"),
  hide:world.mat("Tribal hide walls","#a78e68"),
  roof:world.mat("Tribal thatched roofs","#8b7950"),
  ash:world.mat("Tribal campfire ash","#3e3730"),
  stone:world.mat("Tribal firestones","#a0987f"),
  fire:world.mat("Tribal flame","#e5a044")
 };
 mats.fire.emissiveColor=new B.Color3(.7,.27,.03);
 world.tribeMaterials=mats;
 world.tribeCamps=new Map();
 world.abandonedTribeCamps=new Map();
 world.spawnAbandonedTribeCamp=function(tribe,chunk){
  if(this.abandonedTribeCamps.has(chunk))return;
  const root=new B.TransformNode("Abandoned settlement: "+tribe.name,this.scene);
  root.position=V(tribe.x,this.groundY(tribe.x,tribe.z),tribe.z);
  const ground=add(this,"Abandoned tribal clearing","cylinder",root,[0,.04,0],
   [TRIBE_CLEARING_RADIUS*1.5,.07,TRIBE_CLEARING_RADIUS*1.5],mats.earth,tribe);
  ground.isPickable=false;ground.metadata=null;
  // The old homes are dismantled, not razed. Scattered timber and cold ashes
  // signal a peaceful departure without leaving a usable settlement behind.
  for(const [x,z] of [[-3,-2],[3,-2],[-.5,-5]]){
   const log=add(this,"Dismantled timber","box",root,[x,.23,z],[2.7,.35,.42],mats.wood,tribe);
   log.isPickable=false;log.metadata=null;
  }
  const ashes=add(this,"Cold tribal hearth","cylinder",root,[0,.11,-.5],[1.5,.2,1.5],mats.ash,tribe);
  ashes.isPickable=false;ashes.metadata=null;
  this.abandonedTribeCamps.set(chunk,{tribe,root});
 };
 world.removeAbandonedTribeCamp=function(chunk){
  const remains=this.abandonedTribeCamps.get(chunk);
  if(!remains)return;
  remains.root.dispose(false,false);
  this.abandonedTribeCamps.delete(chunk);
 };
 world.spawnTribeCamp=function(tribe,chunk){
  if(!tribe||this.tribeCamps.has(chunk))return null;
  const root=new B.TransformNode("Independent tribe: "+tribe.name,this.scene);
  root.position=V(tribe.x,this.groundY(tribe.x,tribe.z),tribe.z);
  const floor=add(this,"Tribal clearing","cylinder",root,[0,.06,0],
   [TRIBE_CLEARING_RADIUS*1.5,.11,TRIBE_CLEARING_RADIUS*1.5],mats.earth,tribe);
  floor.isPickable=false;
  // Compact independent huts. This is deliberately distinct from the
  // player's editable village and does not expose build slots.
  for(const [x,z] of [[-4,-2.5],[4,-2.8],[-.5,-5.5]]){
   add(this,"Tribe hut wall","cylinder",root,[x,.86,z],[2.65,1.7,2.65],mats.hide,tribe);
   add(this,"Tribe thatched roof","cone",root,[x,2.13,z],[3.5,1.25,3.5],mats.roof,tribe);
   add(this,"Tribe hut doorway","box",root,[x,.74,z+1.3],[.85,1.35,.16],mats.ash,tribe);
   this.obstacles.push({x:tribe.x+x,z:tribe.z+z,r:1.7,chunkKey:chunk,tribeId:tribe.id});
  }
  const ring=add(this,"Tribal stone fire ring","cylinder",root,[0,.13,-.5],[1.7,.24,1.7],mats.stone,tribe);
  ring.isPickable=false;
  add(this,"Tribal hearth","cylinder",root,[0,.28,-.5],[1.15,.16,1.15],mats.ash,tribe);
  const flame=add(this,"Tribal camp flame","cone",root,[0,.74,-.5],[.58,.9,.58],mats.fire,tribe);
  flame.isPickable=false;
  label(this,root,tribe);
  const humans=tribe.members.map((member,i)=>{
   const human=createHuman(this.scene,member,tribe);
   human.root.position=V(member.x,this.groundY(member.x,member.z),member.z);
   human.root.rotation.y=i*1.4;
   // The skinned meshes arrive asynchronously, so mark them after loading.
   // Clicking a person or a hut opens the same camp interaction.
   human.ready?.then(()=>{
    for(const mesh of human.root.getChildMeshes())if(mesh.isPickable)
     mesh.metadata={...(mesh.metadata||{}),tribeId:tribe.id,tribeLeader:member.role==="leader"};
   });
   return human;
  });
  const camp={tribe,root,humans,chunk,leader:tribe.members[0]};
  this.tribeCamps.set(chunk,camp);
  return camp;
 };
 world.removeTribeCamp=function(chunk){
  const camp=this.tribeCamps.get(chunk);
  if(!camp)return;
  if(this.tribeTarget===camp.tribe.id){this.tribeTarget=null;this.path=[]}
  for(const human of camp.humans)human.dispose();
  camp.root.dispose(false,false);
  this.tribeCamps.delete(chunk);
  this.obstacles=this.obstacles.filter(ob=>ob.tribeId!==camp.tribe.id);
 };
}
