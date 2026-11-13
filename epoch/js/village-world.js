import {PLOTS,BUILDINGS} from "./settlement.js?v=20261113j";
// Low-poly architectural placeholders for the first settlement-building slice.
// Each visual occupies a fixed build plot; meshes and interaction metadata are
// kept separate from saved game state. Only constructed models cause collision.
const B=globalThis.BABYLON;
const V=(x,y,z)=>new B.Vector3(x,y,z);

function mat(world,name,color,emissive=null){
 const m=new B.StandardMaterial(name,world.scene);
 m.diffuseColor=B.Color3.FromHexString(color);m.specularColor=new B.Color3(.055,.052,.04);
 if(emissive)m.emissiveColor=B.Color3.FromHexString(emissive);
 return m;
}
function obj(world,kind,name,parent,pos,scale,material,params={}){
 const builders={box:()=>B.MeshBuilder.CreateBox(name,{size:1},world.scene),
 cylinder:()=>B.MeshBuilder.CreateCylinder(name,{height:1,tessellation:10,diameter:1,...params},world.scene),
 sphere:()=>B.MeshBuilder.CreateSphere(name,{diameter:1,segments:9},world.scene)};
 const mesh=builders[kind]();mesh.parent=parent;mesh.position=V(...pos);
 if(scale)mesh.scaling=V(...scale);mesh.material=material;return mesh;
}
function pole(world,parent,x,z,height,material,r=.13){
 return obj(world,"cylinder","timber post",parent,[x,height/2,z],[r*2,height,r*2],material);
}
function beam(world,parent,a,b,r,material){
 const [ax,ay,az]=a,[bx,by,bz]=b;
 const from=V(ax,ay,az),to=V(bx,by,bz),offset=to.subtract(from);
 const pole=obj(world,"cylinder","timber beam",parent,[(ax+bx)/2,(ay+by)/2,(az+bz)/2],[r*2,offset.length(),r*2],material);
 // Roof timbers run in the X/Y plane for these early huts.
 pole.rotationQuaternion=B.Quaternion.RotationAxis(B.Axis.Z,-Math.atan2(offset.x,offset.y));
 return pole;
}
function hut(world,parent,materials,large=false){
 const radius=large?2.45:1.78,roofY=large?2.25:1.93,wallHeight=large?1.75:1.35;
 const walls=obj(world,"cylinder",large?"Council Lodge walls":"Family Hut walls",parent,[0,wallHeight/2,0],null,materials.mud,{diameterBottom:radius*2,diameterTop:radius*1.88,height:wallHeight,tessellation:10});
 const thatch=obj(world,"cylinder",large?"Council Lodge thatch roof":"Family Hut thatch roof",parent,[0,roofY,0],null,large?materials.thatchDark:materials.thatch,{diameterTop:.25,diameterBottom:radius*2+1,height:1.95,tessellation:10});
 // Doorway, lintel, tusk charms and roof beams help distinguish the silhouette.
 const door=obj(world,"box","dark woven doorway",parent,[0,.76,radius*.89],[.75,1.55,.08],materials.door);
 for(const x of [-.42,.42]){
  pole(world,parent,x,radius*.93,1.5,materials.wood,.11);
 }
 obj(world,"box","door lintel",parent,[0,1.52,radius*.96],[1.02,.18,.22],materials.wood);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;
  pole(world,parent,Math.cos(a)*radius*.87,Math.sin(a)*radius*.87,wallHeight+(.15),materials.wood,.10);
 }
 if(large){
  obj(world,"cylinder","Council meeting stone",parent,[0,.32,3.5],[1.05,.63,1.05],materials.stone,{tessellation:8});
  for(const x of [-1.5,1.5])obj(world,"cylinder","Council benches",parent,[x,.21,3.3],[.65,.32,.55],materials.wood,{tessellation:8});
  const banner=pole(world,parent,2.8,0,3.0,materials.wood,.12);
  for(const z of [-.5,.5])obj(world,"box","ceremonial wood sign",parent,[2.8,2.3,z],[.6,.75,.15],materials.fur);
 }
 return walls;
}
function techShelter(world,parent,m){
 // Open-sided A-frame, stone workbench, flint display.
 const z=1.25;
 for(const xx of [-1.35,1.35])for(const zz of [-z,z])pole(world,parent,xx,zz,2.0,m.wood,.15);
 for(const zz of [-z,z]){
  beam(world,parent,[-1.5,2,zz],[0,3.15,zz],.12,m.wood);
  beam(world,parent,[1.5,2,zz],[0,3.15,zz],.12,m.wood);
 }
 for(const sign of [-1,1]){
  const roof=obj(world,"box","woven shelter roof",parent,[sign*.80,2.6,0],[1.95,.20,3.4],m.thatch);roof.rotation.z=sign*.61;
 }
 obj(world,"box","stone tool bench",parent,[0,.85,0],[1.65,.35,1.05],m.stone);
 for(const xx of [-.6,.6])obj(world,"box","workbench leg",parent,[xx,.45,0],[.25,.67,.27],m.wood);
 for(const [xx,zz] of [[-.4,-.12],[.35,.25],[0,.3]])obj(world,"sphere","flint samples",parent,[xx,1.11,zz],[.28,.13,.21],m.stoneDark);
 obj(world,"box","drying rack",parent,[-1.7,.7,-.1],[.17,1.4,1.1],m.wood);
}
function cookingStation(world,parent,m){
 for(const x of [-1.3,1.3]){
  pole(world,parent,x,0,2,m.wood,.12);
  beam(world,parent,[x,2,0],[x-.45,2.3,0],.10,m.wood);
 }
 beam(world,parent,[-1.3,2,0],[1.3,2,0],.10,m.wood);
 for(let i=0;i<3;i++){
  const z=(i-1)*.28;
  obj(world,"box","hanging cooking hook",parent,[z*.5,1.42,z],[.075,.9,.08],m.stoneDark);
 }
 for(let i=0;i<11;i++){
  const a=2*Math.PI*i/11;
  obj(world,"sphere","additional hearth stones",parent,[Math.cos(a)*1.45,.15,Math.sin(a)*1.45],[.48,.27,.4],m.stone);
 }
}
function createLabel(world,parent,label,m){
 // A readable floating marker to identify the 3D construction location.
 const plane=B.MeshBuilder.CreatePlane("Village: "+label,{width:3.7,height:.63},world.scene);
 plane.parent=parent;plane.position=V(0,3.95,0);
 plane.billboardMode=B.Mesh.BILLBOARDMODE_ALL;
 const texture=new B.DynamicTexture("village label "+label,{width:512,height:96},world.scene,false);
 texture.hasAlpha=true;
 const ctx=texture.getContext();
 ctx.clearRect(0,0,512,96);
 ctx.fillStyle="rgba(12,24,18,0.85)";ctx.fillRect(0,0,512,96);
 ctx.strokeStyle="#d2ba83";ctx.strokeRect(3,3,506,90);
 ctx.fillStyle="#f1e5ce";ctx.font="bold 33px Arial";ctx.textAlign="center";
 ctx.fillText(label,256,60,476);texture.update();
 const labelMat=new B.StandardMaterial("label "+label,world.scene);
 labelMat.diffuseTexture=texture;labelMat.opacityTexture=texture;
 labelMat.disableLighting=true;labelMat.backFaceCulling=false;plane.material=labelMat;
 return plane;
}
export function createVillageWorld(world,onPlot){
 const m={
  wood:mat(world,"village timber","#6e4d34"),mud:mat(world,"village clay walls","#897454"),
  thatch:mat(world,"village straw","#ae9664"),thatchDark:mat(world,"village council thatch","#837a57"),
  door:mat(world,"dark hut doorway","#302b21"),fur:mat(world,"village tribal hide","#bca583"),
  stone:mat(world,"village stones","#81867d"),stoneDark:mat(world,"village flint","#4b5550"),
  free:mat(world,"free village plot","#b79751","#51421e"),
  built:mat(world,"completed village plot","#66986e","#263a25"),
  selected:mat(world,"selected village plot","#e4c47d","#b58c34")
 };
 world.villagePlots=new Map();world.villageMats=m;
 for(const plot of PLOTS){
  const building=BUILDINGS[plot.kind];
  const parent=new B.TransformNode("Village plot "+plot.id,world.scene);
  parent.position=V(plot.x,world.groundY(plot.x,plot.z)+.12,plot.z);
  parent.rotation.y=plot.rotation;
  const marker=B.MeshBuilder.CreateTorus("Plot outline: "+building.name,{diameter:plot.kind==="council"?6.5:5.3,thickness:.085,tessellation:30},world.scene);
  marker.parent=parent;marker.position.y=.10;marker.material=m.free;
  for(const x of [-2.2,2.2])for(const z of [-2.2,2.2]){
   const stake=pole(world,parent,x,z,.73,m.wood,.085);
   stake.material=m.free;
  }
  const sign=createLabel(world,parent,building.name,m);
  const constructed=new B.TransformNode("Built "+building.name,world.scene);
  constructed.parent=parent;constructed.position.y=0;constructed.setEnabled(false);
  if(plot.kind==="family")hut(world,constructed,m,false);
  if(plot.kind==="council")hut(world,constructed,m,true);
  if(plot.kind==="lore")techShelter(world,constructed,m);
  if(plot.kind==="hearth")cookingStation(world,constructed,m);
  // Clicking any mesh in a building or any plot outline selects the same plot.
  for(const mesh of parent.getChildMeshes()){
   mesh.metadata={...(mesh.metadata||{}),plotId:plot.id};
   mesh.isPickable=true;
  }
  world.villagePlots.set(plot.id,{plot,parent,marker,constructed,sign,built:false});
 }
 world.onVillagePlot=onPlot;
}
export function syncVillageWorld(world,village){
 if(!world.villagePlots)return;
 world.obstacles=world.obstacles.filter(o=>!o.plotId);
 for(const {plot,marker,constructed} of world.villagePlots.values()){
  const built=village?.plots?.[plot.id]===plot.kind;
  const item=world.villagePlots.get(plot.id);
  if(item)item.built=built;
  constructed.setEnabled(built);
  marker.material=built?world.villageMats.built:world.villageMats.free;
  if(built && plot.kind!=="hearth"){
   world.obstacles.push({x:plot.x,z:plot.z,r:plot.kind==="council"?2.6:2.0,plotId:plot.id});
  }
 }
}
export function highlightVillagePlot(world,id){
 for(const item of world.villagePlots?.values()||[]){
  item.marker.material=item.plot.id===id?world.villageMats.selected:
   item.built?world.villageMats.built:world.villageMats.free;
 }
}
