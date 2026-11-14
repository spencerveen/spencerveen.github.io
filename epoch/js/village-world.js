import {BUILDINGS} from "./settlement.js?v=20261114b";
import {BUILDING_RADIUS,footprint} from "./village-placement.js?v=20261114b";
import {BUILD_GRID,VILLAGE_RADIUS} from "./stockpile.js?v=20261114a";
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
 // The campfire is part of the *constructed* Cooking Hearth. An empty
 // blueprint never contains logs, fire stones or an active fire source.
 for(let i=0;i<11;i++){
  const a=2*Math.PI*i/11;
  obj(world,"sphere","hearth ring stone",parent,[Math.cos(a)*1.45,.15,Math.sin(a)*1.45],[.48,.27,.4],m.stone);
 }
 for(let i=0;i<3;i++){
  const log=obj(world,"cylinder","hearth firewood",parent,[0,.23,0],[.23,1.55,.23],m.wood);
  log.rotation.z=Math.PI/2;
  log.rotation.y=i*Math.PI*2/3;
 }
 world.flame=obj(world,"sphere","hearth flame",parent,[0,.70,0],[.58,1.04,.58],world.m.fire);
 world.flame.isPickable=false;
 world.flame.setEnabled(false);
 world.fireLight=new B.PointLight("built cooking hearth glow",V(0,0,0),world.scene);
 world.fireLight.intensity=0;
 world.fireLight.diffuse=new B.Color3(1,.58,.2);
 world.fireLight.range=10;
}
function createLabel(world,parent,title,subtitle,height){
 const plane=B.MeshBuilder.CreatePlane("Village: "+title,{width:2.15,height:.5},world.scene);
 plane.parent=parent;plane.position=V(0,height,0);
 plane.billboardMode=B.Mesh.BILLBOARDMODE_ALL;
 const texture=new B.DynamicTexture("village label "+title,{width:512,height:120},world.scene,false);
 texture.hasAlpha=true;
 const ctx=texture.getContext();
 ctx.clearRect(0,0,512,120);
 ctx.fillStyle="rgba(13,27,21,.9)";ctx.fillRect(2,2,508,116);
 ctx.strokeStyle="#8c8264";ctx.lineWidth=2;ctx.strokeRect(3,3,506,114);
 ctx.fillStyle="#f0e4c8";ctx.font="600 36px Arial";ctx.textAlign="center";
 ctx.fillText(title,256,51,470);
 ctx.fillStyle="#a9b8a9";ctx.font="23px Arial";ctx.fillText(subtitle,256,89,470);
 texture.update();
 const labelMat=new B.StandardMaterial("label "+title,world.scene);
 labelMat.diffuseTexture=texture;labelMat.emissiveTexture=texture;
 labelMat.diffuseColor=B.Color3.White();labelMat.emissiveColor=B.Color3.White();
 labelMat.specularColor=B.Color3.Black();labelMat.useAlphaFromDiffuseTexture=true;
 labelMat.disableLighting=true;labelMat.backFaceCulling=false;plane.material=labelMat;
 plane.onDisposeObservable.addOnce(()=>{labelMat.dispose();texture.dispose();});
 return plane;
}
export function createVillageWorld(world,onBuildingClick){
 const m={
  wood:mat(world,"village timber","#6e4d34"),mud:mat(world,"village clay walls","#897454"),
  thatch:mat(world,"village straw","#ae9664"),thatchDark:mat(world,"village council thatch","#837a57"),
  door:mat(world,"dark hut doorway","#302b21"),fur:mat(world,"village tribal hide","#bca583"),
  stone:mat(world,"village stones","#81867d"),stoneDark:mat(world,"village flint","#4b5550"),
  valid:mat(world,"valid build outline","#9bdd98","#285d39"),
  invalid:mat(world,"invalid build outline","#e58f76","#68322d"),
  ghostValid:mat(world,"building preview","#84c7a2"),
  ghostInvalid:mat(world,"blocked building preview","#dc8172")
 };
 m.valid.alpha=.8;m.invalid.alpha=.8;
 m.ghostValid.alpha=.34;m.ghostInvalid.alpha=.38;
 world.villageMats=m;
 world.villageBuildings=new Map();
 world.villageSignature=null;world.villageGrid=null;world.villageGridHome=null;
 world.onVillagePlot=onBuildingClick;
 const previewRoot=new B.TransformNode("Movable village building preview",world.scene);
 const outline=B.MeshBuilder.CreateTorus("Build footprint preview",{diameter:1,thickness:.12,tessellation:38},world.scene);
 outline.parent=previewRoot;outline.position.y=.12;outline.isPickable=false;outline.material=m.valid;
 const ghost=obj(world,"box","Building silhouette preview",previewRoot,[0,.9,0],[2.6,1.8,2.6],m.ghostValid);
 ghost.isPickable=false;
 previewRoot.setEnabled(false);
 world.villagePreview={root:previewRoot,outline,ghost};
}
function makeBuiltStructure(world,entry){
 const kind=entry.kind,definition=BUILDINGS[kind];
 const root=new B.TransformNode("Village "+definition.name+" "+entry.id,world.scene);
 root.position=V(entry.x,world.groundY(entry.x,entry.z)+.12,entry.z);
 root.rotation.y=entry.turn*Math.PI/2;
 if(kind==="family")hut(world,root,world.villageMats,false);
 if(kind==="council")hut(world,root,world.villageMats,true);
 if(kind==="lore")techShelter(world,root,world.villageMats);
 if(kind==="hearth")cookingStation(world,root,world.villageMats);
 const labels={family:["Dynasty","Family Hut",3.35],council:["Culture","Council Lodge",3.65],lore:["Technology","Toolmaker's Shelter",3.65],hearth:["Cooking Hearth","Village fire",2.85]};
 const label=labels[kind];
 if(label)createLabel(world,root,...label);
 // Context labels exist only on constructed buildings.
 for(const mesh of root.getChildMeshes()){
  mesh.metadata={...(mesh.metadata||{}),buildingId:entry.id,buildingKind:entry.kind};
  mesh.isPickable=true;
 }
 return root;
}
function updateVillageGrid(world,pile){
 const key=pile?pile.x+","+pile.z:null;
 if(world.villageGridHome===key)return;
 if(world.villageGrid){world.villageGrid.dispose(false,false);world.villageGrid=null}
 world.villageGridHome=key;
 if(!pile)return;
 const lines=[];
 for(let i=-VILLAGE_RADIUS;i<=VILLAGE_RADIUS;i+=BUILD_GRID){
  const half=Math.sqrt(Math.max(0,VILLAGE_RADIUS*VILLAGE_RADIUS-i*i));
  if(half<.5)continue;
  const halfSteps=Math.floor(half/BUILD_GRID)*BUILD_GRID;
  for(const vertical of [true,false]){
   const pts=[];
   for(let step=-halfSteps;step<=halfSteps;step+=BUILD_GRID){
    const x=pile.x+(vertical?i:step),z=pile.z+(vertical?step:i);
    pts.push(V(x,world.groundY(x,z)+.10,z));
   }
   if(pts.length>=2)lines.push(pts);
  }
 }
 world.villageGrid=B.MeshBuilder.CreateLineSystem("Village 2m placement grid",{lines},world.scene);
 world.villageGrid.color=new B.Color3(.83,.75,.49);
 world.villageGrid.alpha=.38;
 world.villageGrid.isPickable=false;
 world.villageGrid.setEnabled(!!world.placingBuilding);
}
export function syncVillageWorld(world,village){
 if(!world.villageBuildings)return;
 updateVillageGrid(world,village?.stockpile);
 const rows=(village?.buildings||[]).filter(entry=>BUILDINGS[entry.kind]);
 const signature=JSON.stringify(rows);
 if(world.villageSignature!==signature){
  const ids=new Set(rows.map(b=>b.id));
  for(const [id,item] of world.villageBuildings){
   if(ids.has(id))continue;
   item.root.dispose(false,false);world.villageBuildings.delete(id);
  }
  for(const entry of rows){
   let item=world.villageBuildings.get(entry.id);
   if(!item||item.entry.kind!==entry.kind){
    if(item)item.root.dispose(false,false);
    const root=makeBuiltStructure(world,entry);
    item={root,entry:{...entry}};world.villageBuildings.set(entry.id,item);
   }
   item.entry={...entry};
   item.root.position=V(entry.x,world.groundY(entry.x,entry.z)+.12,entry.z);
   item.root.rotation.y=entry.turn*Math.PI/2;
  }
  world.villageSignature=signature;
 }
 world.obstacles=world.obstacles.filter(o=>!o.buildingId&&!o.plotId);
 for(const item of world.villageBuildings.values()){
  const e=item.entry;
  if(e.kind!=="hearth")
   world.obstacles.push({x:e.x,z:e.z,r:footprint(e.kind)-.25,buildingId:e.id});
 }
 const hearth=rows.find(row=>row.kind==="hearth");
 world.hearthBuilt=!!hearth;
 if(hearth&&world.fireLight)
  world.fireLight.position=V(hearth.x,world.groundY(hearth.x,hearth.z)+1.12,hearth.z);
 world.updateHearthFire();
}
export function showVillagePreview(world,candidate){
 const view=world.villagePreview;
 if(!view)return;
 const show=!!candidate;
 view.root.setEnabled(show);
 if(world.villageGrid)world.villageGrid.setEnabled(show);
 if(!show)return;
 const radius=footprint(candidate.kind),height=candidate.kind==="hearth"?.65:candidate.kind==="council"?2.8:2.2;
 view.root.position=V(candidate.x,world.groundY(candidate.x,candidate.z)+.04,candidate.z);
 view.root.rotation.y=(candidate.turn||0)*Math.PI/2;
 view.outline.scaling=V(radius*2.05,1,radius*2.05);
 view.ghost.scaling=V(radius*1.55,height,radius*1.55);
 view.ghost.position.y=height/2;
 view.outline.material=candidate.ok?world.villageMats.valid:world.villageMats.invalid;
 view.ghost.material=candidate.ok?world.villageMats.ghostValid:world.villageMats.ghostInvalid;
}
export function highlightVillagePlot(world,id){
 // Kept for older UI callers. Empty site outlines no longer exist.
}
