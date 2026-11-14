import {VILLAGE_RADIUS} from "./stockpile.js?v=20261113k";
const B=globalThis.BABYLON;
const V=(x,y,z)=>new B.Vector3(x,y,z);
function material(scene,name,hex,alpha=1){
 const m=new B.StandardMaterial(name,scene);
 m.diffuseColor=B.Color3.FromHexString(hex);
 m.specularColor=B.Color3.Black();
 m.alpha=alpha;
 return m;
}
function box(scene,name,parent,xyz,scale,mat){
 const mesh=B.MeshBuilder.CreateBox(name,{size:1},scene);
 mesh.parent=parent;mesh.position=V(...xyz);mesh.scaling=V(...scale);
 mesh.material=mat;return mesh;
}
function sphere(scene,name,parent,xyz,scale,mat){
 const mesh=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:9},scene);
 mesh.parent=parent;mesh.position=V(...xyz);mesh.scaling=V(...scale);
 mesh.material=mat;return mesh;
}
function pole(scene,name,parent,xyz,scale,mat){
 const mesh=B.MeshBuilder.CreateCylinder(name,{height:1,diameter:1,tessellation:10},scene);
 mesh.parent=parent;mesh.position=V(...xyz);mesh.scaling=V(...scale);
 mesh.material=mat;return mesh;
}
function floatingLabel(world,parent){
 const scene=world.scene;
 const panel=B.MeshBuilder.CreatePlane("Stockpile label",{width:2.15,height:.5},scene);
 panel.parent=parent;panel.position=V(0,2.05,0);
 panel.billboardMode=B.Mesh.BILLBOARDMODE_ALL;
 const texture=new B.DynamicTexture("Stockpile label art",{width:512,height:120},scene,false);
 texture.hasAlpha=true;
 const ctx=texture.getContext();
 ctx.clearRect(0,0,512,120);
 ctx.fillStyle="rgba(13,27,21,.9)";ctx.fillRect(2,2,508,116);
 ctx.strokeStyle="#8c8264";ctx.lineWidth=2;ctx.strokeRect(3,3,506,114);
 ctx.font="600 36px Arial";ctx.fillStyle="#f0e4c8";
 ctx.textAlign="center";ctx.fillText("Village",256,51,470);
 ctx.font="23px Arial";ctx.fillStyle="#a9b8a9";ctx.fillText("Stockpile",256,89,470);
 texture.update();
 const m=new B.StandardMaterial("Stockpile sign text",scene);
 m.diffuseTexture=texture;m.emissiveTexture=texture;
 m.diffuseColor=B.Color3.White();m.emissiveColor=B.Color3.White();
 m.specularColor=B.Color3.Black();m.useAlphaFromDiffuseTexture=true;
 m.backFaceCulling=false;m.disableLighting=true;
 panel.material=m;panel.isPickable=true;panel.metadata={stockpile:true};
 panel.onDisposeObservable.addOnce(()=>{m.dispose();texture.dispose();});
}
export function createStockpileWorld(world){
 const s=world.scene;
 const timber=material(s,"Stockpile wooden boards","#6b4e34");
 const rails=material(s,"Stockpile rails","#4e3d2a");
 const logs=material(s,"Stockpile stacked logs","#a47b50");
 const stone=material(s,"Stockpile rounded stone","#878c7b");
 const basket=material(s,"Stockpile woven basket","#b59457");
 const fruit=material(s,"Stockpile fruit","#9c393e");
 const vine=material(s,"Stockpile vines","#5b8a4d");
 const valid=material(s,"Stockpile valid footprint","#78bc7a",.38);
 const invalid=material(s,"Stockpile invalid footprint","#e67664",.48);
 const territory=material(s,"Village territory ring","#d6b777",.42);
 const root=new B.TransformNode("Founding Stockpile",s);
 for(let i=-2;i<=2;i++){
  const board=box(s,"Stockpile timber flooring",root,[0,.18,i*.72],[4.5,.25,.68],timber);
  board.metadata={stockpile:true};
 }
 for(const x of [-2.08,2.08])for(const z of [-1.82,1.82]){
  const post=pole(s,"Stockpile corner post",root,[x,.45,z],[.21,.9,.21],rails);
  post.metadata={stockpile:true};
 }
 const items={wood:[],stone:[],berries:[],vines:[]};
 for(let i=0;i<4;i++){
  const wood=box(s,"Stored bundle of logs",root,[-1.18,.59+(i%2)*.37,-.92+Math.floor(i/2)*.65],[.95,.32,.33],logs);
  wood.metadata={stockpile:true};items.wood.push(wood);
  const rock=sphere(s,"Stockpiled stone",root,[1.03+(i%2)*.53,.52, -.89+Math.floor(i/2)*.58],[.58,.48,.54],stone);
  rock.metadata={stockpile:true};items.stone.push(rock);
 }
 const berryContainer=pole(s,"Woven berry basket",root,[-.95,.57,1.05],[.85,.73,.85],basket);
 berryContainer.metadata={stockpile:true};
 const berries=sphere(s,"Basket of berries",root,[-.95,.97,1.05],[.73,.32,.73],fruit);
 berries.metadata={stockpile:true};items.berries.push(berryContainer,berries);
 for(let i=0;i<3;i++){
  const loops=B.MeshBuilder.CreateTorus("Hanging vine coil",{diameter:.51,thickness:.105,tessellation:15},s);
  loops.parent=root;loops.position=V(.62+i*.34,.82,1.16);
  loops.rotation.x=.5;loops.material=vine;loops.metadata={stockpile:true};
  items.vines.push(loops);
 }
 floatingLabel(world,root);
 const perimeter=B.MeshBuilder.CreateTorus("Village territory boundary",
  {diameter:VILLAGE_RADIUS*2,thickness:.075,tessellation:92},s);
 perimeter.parent=root;perimeter.position.y=.14;
 perimeter.material=territory;perimeter.isPickable=false;
 const ground=B.MeshBuilder.CreateTorus("Village founding preview",
  {diameter:5.2,thickness:.25,tessellation:32},s);
 ground.position.y=.18;ground.material=valid;ground.isPickable=false;
 const ghost=box(s,"Stockpile placement silhouette",null,[0,0,0],[4.2,.22,4.2],valid);
 ghost.isPickable=false;
 root.setEnabled(false);ground.setEnabled(false);ghost.setEnabled(false);
 world.stockpileWorld={
  root,ground,ghost,valid,invalid,items,lastPosition:null
 };
}
export function syncStockpileWorld(world,stockpile){
 const view=world.stockpileWorld;if(!view)return;
 view.root.setEnabled(!!stockpile);
 if(!stockpile){view.lastPosition=null;return}
 const key=stockpile.x+","+stockpile.z;
 if(key!==view.lastPosition){
  view.root.position=V(stockpile.x,world.groundY(stockpile.x,stockpile.z)+.03,stockpile.z);
  view.lastPosition=key;
 }
 const amounts=stockpile.items||{};
 for(const [id,meshes] of Object.entries(view.items)){
  const count=amounts[id]||0;
  for(let i=0;i<meshes.length;i++)
   meshes[i].setEnabled(count>i*12);
 }
}
export function showStockpilePreview(world,location){
 const view=world.stockpileWorld;if(!view)return;
 const show=!!location;
 view.ground.setEnabled(show);view.ghost.setEnabled(show);
 if(!show)return;
 const height=world.groundY(location.x,location.z);
 view.ground.position=V(location.x,height+.17,location.z);
 view.ghost.position=V(location.x,height+.14,location.z);
 const m=location.ok?view.valid:view.invalid;
 view.ground.material=m;view.ghost.material=m;
}
