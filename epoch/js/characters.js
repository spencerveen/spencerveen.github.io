// Epoch reusable procedural humanoids — shared for the player, descendants and villagers.
// These are animated mesh assemblies, not imported Blender rigs. Every character uses
// the same joints and geometry recipe, with a lightweight appearance profile.
const B=globalThis.BABYLON;
const V=(x,y,z)=>new B.Vector3(x,y,z);
export const HAIR_STYLES=[
 {name:"Side-parted",id:"short"},
 {name:"Buzz cut",id:"shaggy"},
 {name:"Long",id:"shoulder"},
 {name:"Tied buns",id:"tied"},
 {name:"Close cropped",id:"braid"},
 {name:"Shaved",id:"topknot"}
];
export const HAIR_COLORS=[
 {name:"Black",hex:"#25211f"},
 {name:"Dark brown",hex:"#483226"},
 {name:"Chestnut",hex:"#704631"},
 {name:"Auburn",hex:"#9b5131"},
 {name:"Dirty blond",hex:"#ae9164"},
 {name:"Gray",hex:"#9b9b93"}
];
export const SKIN_TONES=["#e2b18b","#c9916f","#b87b59","#986345","#784c37","#573a2e"];
export const EYE_COLORS=["#53452e","#54736b","#55758a","#75523b"];
export const OUTFITS=["Hide wrap","Fur mantle","Primitive tunic"];
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
export function seededRandom(seed){let s=hash(seed);return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
export function normalizeAppearance(a={}){
 return {
  sex:a.sex==="female"?"female":"male",
  hairStyle:clamp(Math.round(Number(a.hairStyle)||0),0,HAIR_STYLES.length-1),
  hairColor:clamp(Math.round(Number(a.hairColor)||0),0,HAIR_COLORS.length-1),
  skin:clamp(Math.round(Number(a.skin)||0),0,SKIN_TONES.length-1),
  eyes:clamp(Math.round(Number(a.eyes)||0),0,EYE_COLORS.length-1),
  beard:clamp(Math.round(Number(a.beard)||0),0,3),
  outfit:clamp(Math.round(Number(a.outfit)||0),0,OUTFITS.length-1),
  height:clamp(Number(a.height)||1,.87,1.13),
  build:clamp(Number(a.build)||1,.84,1.18)
 };
}
export function founderAppearance(){
 return normalizeAppearance({sex:"male",hairStyle:0,hairColor:1,skin:2,eyes:0,beard:1,outfit:1,height:1,build:1});
}
export function randomAppearance(seed,sex=null){
 const r=seededRandom(seed),pick=n=>Math.floor(r()*n);
 return normalizeAppearance({
  sex:sex||(["male","female"][pick(2)]),
  hairStyle:pick(HAIR_STYLES.length),hairColor:pick(5),skin:pick(6),
  eyes:pick(4),beard:pick(4),outfit:pick(3),
  height:.9+r()*.2,build:.88+r()*.24
 });
}
export function descendantAppearance(parent,gen){
 const p=normalizeAppearance(parent),r=seededRandom("descendant:"+gen+":"+JSON.stringify(p));
 const choose=(n)=>Math.floor(r()*n);
 const close=(value,n)=>clamp(value+(r()<.33?(r()<.5?-1:1):0),0,n-1);
 return normalizeAppearance({
  sex:r()<.5?"male":"female",
  skin:close(p.skin,SKIN_TONES.length),
  hairColor:r()<.72?close(p.hairColor,5):choose(5),
  hairStyle:choose(HAIR_STYLES.length),
  eyes:r()<.7?p.eyes:choose(EYE_COLORS.length),
  beard:choose(4),outfit:choose(OUTFITS.length),
  height:clamp(p.height+(r()-.5)*.15,.88,1.12),
  build:clamp(p.build+(r()-.5)*.21,.85,1.16)
 });
}
const materialCache=new WeakMap();
function material(scene,hex){
 if(typeof hex!=="string" || !/^#[0-9a-f]{6}$/i.test(hex))throw new TypeError("Character material requires a #RRGGBB color string");
 let materials=materialCache.get(scene);
 if(!materials){materials=new Map();materialCache.set(scene,materials)}
 if(!materials.has(hex)){
  const m=new B.StandardMaterial("character_"+hex,scene);
  m.diffuseColor=B.Color3.FromHexString(hex);
  m.specularColor=new B.Color3(.065,.06,.055);
  materials.set(hex,m);
 }
 return materials.get(hex);
}
function sphere(scene,name,parent,position,scale,mat,segments=10){
 const m=B.MeshBuilder.CreateSphere(name,{diameter:1,segments},scene);
 m.parent=parent;m.position=V(...position);m.scaling=V(...scale);m.material=mat;m.isPickable=false;return m;
}
function cylinder(scene,name,parent,position,height,top,bottom,mat,tessellation=10){
 const m=B.MeshBuilder.CreateCylinder(name,{height,diameterTop:top,diameterBottom:bottom,tessellation},scene);
 m.parent=parent;m.position=V(...position);m.material=mat;m.isPickable=false;return m;
}
function box(scene,name,parent,position,scaling,mat){
 const m=B.MeshBuilder.CreateBox(name,{size:1},scene);
 m.parent=parent;m.position=V(...position);m.scaling=V(...scaling);m.material=mat;m.isPickable=false;return m;
}
function strand(scene,parent,x,y,z,length,tilt,mat){
 const mesh=sphere(scene,"hair lock",parent,[x,y,z],[.085,length,.085],mat,7);mesh.rotation.z=tilt;return mesh;
}
function addHair(scene,head,p,hair){
 const style=HAIR_STYLES[p.hairStyle].id;
 // The base hair cap is independent from the facial mesh, so color can be swapped.
 sphere(scene,"scalp hair",head,[0,.255,-.015],[.325,.178,.305],hair,12);
 for(let i=0;i<7;i++){
  const a=i*Math.PI*2/7,x=Math.sin(a)*.24,z=Math.cos(a)*.22;
  strand(scene,head,x,.26,z,.12,(i%2?.43:-.43),hair);
 }
 if(style==="short"){
  for(let i=0;i<4;i++)strand(scene,head,(i-1.5)*.13,.375,.11,.13,(i-1.5)*-.27,hair);
 }
 if(style==="shaggy"||style==="shoulder"||style==="tied"){
  const len=style==="shoulder"?.41:style==="shaggy"?.28:.16;
  for(let i=-2;i<=2;i++)strand(scene,head,i*.115,-.045,-.235, len, i*.16,hair);
  if(style!=="tied")for(const side of [-1,1])
   strand(scene,head,side*.275,-.08,.02,len*.75,side*-.15,hair);
 }
 if(style==="tied"){
  const tail=sphere(scene,"ponytail",head,[0,-.205,-.34],[.12,.29,.13],hair,9);tail.rotation.x=-.24;
  sphere(scene,"hair tie",head,[0,-.04,-.31],[.14,.055,.13],material(scene,"#a98c63"),8);
 }
 if(style==="braid"){
  for(let j=0;j<5;j++){
   const bead=sphere(scene,"braid link",head,[.09+j*.017,-.08-j*.135,-.29-j*.006],[.135-j*.014,.11,.125-j*.013],hair,8);
   bead.rotation.z=j%2?.24:-.24;
  }
  sphere(scene,"braid tie",head,[.16,-.76,-.3],[.08,.045,.075],material(scene,"#ad8d5f"),8);
 }
 if(style==="topknot"){
  sphere(scene,"topknot",head,[0,.47,-.06],[.215,.185,.2],hair,10);
  cylinder(scene,"topknot tie",head,[0,.36,-.06],.075,.16,.16,material(scene,"#a48963"),9);
 }
}
function addBeard(scene,head,p,hair){
 if(p.sex!=="male"||p.beard===0)return;
 const strength=p.beard;
 if(strength===1){
  sphere(scene,"short chin stubble",head,[0,-.225,.17],[.21,.10,.155],hair,10);
 } else {
  sphere(scene,"beard jaw",head,[0,-.225,.14],[.245,strength===3?.235:.145,.195],hair,11);
  for(const side of [-1,1]){
   sphere(scene,"beard side",head,[side*.195,-.14,.155],[.07,.16,.105],hair,8);
   const moustache=sphere(scene,"mustache",head,[side*.075,-.12,.278],[.105,.045,.06],hair,8);
   moustache.rotation.z=side*.25;
  }
 }
}
export function createHuman(scene,appearance,parent=null,name="human"){
 const p=normalizeAppearance(appearance);
 const root=new B.TransformNode("human:"+name,scene);if(parent)root.parent=parent;
 const body=new B.TransformNode("human skeleton",scene);body.parent=root;
 body.scaling=V(p.build,p.height,p.build);
 const skin=material(scene,SKIN_TONES[p.skin]),hair=material(scene,HAIR_COLORS[p.hairColor].hex);
 const eye=material(scene,EYE_COLORS[p.eyes]),dark=material(scene,"#30251e"),light=material(scene,"#d8b88e");
 const hide=material(scene,p.outfit===2?"#776347":"#72533b"),fur=material(scene,p.outfit===0?"#a38d71":"#aa9477");
 const leather=material(scene,"#4e3829"),boots=material(scene,"#5b4734");
 const shoulder=p.sex==="male"?.78:.68, hip=p.sex==="male"?.46:.55;
 const pelvis=sphere(scene,"hips",body,[0,1.045,0],[hip,.27,.29],hide);
 cylinder(scene,"torso",body,[0,1.5,0],.85,shoulder,.52,hide,12);
 // Rounded clavicle, collar bones and skin at the neckline create a readable human silhouette.
 sphere(scene,"upper chest",body,[0,1.83,0],[shoulder*.49,.17,.295],hide,12);
 cylinder(scene,"neck",body,[0,1.96,0],.22,.18,.21,skin,10);
 cylinder(scene,"hide skirt",body,[0,1.09,0],.48,.52,.78,hide,12);
 const belt=cylinder(scene,"leather belt",body,[0,1.24,0],.09,.59,.6,leather,11);
 sphere(scene,"belt buckle",body,[0,1.25,.305],[.13,.105,.065],light,8);
 // Tunics share attachment points. Fur mantles and wraps can be swapped without changing animation.
 if(p.outfit===1){
  for(const side of [-1,1]){
   const cape=sphere(scene,"fur shoulder mantle",body,[side*.32,1.86,-.045],[.29,.16,.37],fur,8);cape.rotation.z=side*.3;
  }
  sphere(scene,"fur collar",body,[0,1.88,-.19],[.35,.16,.18],fur,8);
 } else if(p.outfit===0){
  const sash=box(scene,"asymmetric wrap",body,[.07,1.52,.3],[.27,.7,.065],fur);sash.rotation.z=-.4;
 } else {
  for(const side of [-1,1])box(scene,"tunic shoulder strap",body,[side*.25,1.78,.245],[.14,.34,.06],leather);
 }
 // Primitive side pouch.
 const pouch=box(scene,"tool pouch",body,[.36,1.05,.03],[.19,.3,.22],leather);pouch.rotation.z=.15;
 // Head + facial anatomy, parented to a neck pivot.
 const head=new B.TransformNode("head pivot",scene);head.parent=body;head.position=V(0,2.125,0);
 sphere(scene,"face",head,[0,0,0],[p.sex==="male"?.29:.275,.34,.27],skin,14);
 sphere(scene,"jaw",head,[0,-.205,.07],[p.sex==="male"?.24:.215,.135,.21],skin,11);
 for(const side of [-1,1]){
  sphere(scene,"ear",head,[side*.277,-.013,-.002],[.063,.11,.085],skin,9);
  sphere(scene,"eye",head,[side*.117,.043,.251],[.041,.037,.027],eye,10);
  const brow=box(scene,"eyebrow",head,[side*.117,.12,.261],[.105,.027,.028],hair);
  brow.rotation.z=side*-.095;
 }
 sphere(scene,"nose bridge",head,[0,-.005,.277],[.073,.14,.086],skin,10);
 sphere(scene,"nose tip",head,[0,-.095,.327],[.088,.057,.084],skin,10);
 box(scene,"mouth",head,[0,-.186,.257],[.125,.022,.015],dark);
 addHair(scene,head,p,hair);addBeard(scene,head,p,hair);
 // Shared arm/leg pivots work with every sex, outfit, hairstyle and body shape.
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=new B.TransformNode("arm pivot",scene);arm.parent=body;arm.position=V(side*shoulder*.48,1.72,0);
  sphere(scene,"deltoid",arm,[side*.048,-.09,0],[.19,.2,.19],skin,10);
  cylinder(scene,"upper arm",arm,[side*.07,-.31,0],.47,.26,.2,skin);
  const elbow=new B.TransformNode("elbow",scene);elbow.parent=arm;elbow.position=V(side*.07,-.56,0);
  cylinder(scene,"forearm",elbow,[0,-.25,0],.46,.205,.155,skin);
  sphere(scene,"hand",elbow,[0,-.51,.015],[.105,.16,.083],skin,9);
  if(p.outfit!==2)cylinder(scene,"leather wrist wrap",elbow,[0,-.39,0],.16,.195,.165,leather,9);
  arms.push({arm,elbow,side});
  const leg=new B.TransformNode("hip pivot",scene);leg.parent=body;leg.position=V(side*(p.sex==="male"?.19:.21),1.05,0);
  cylinder(scene,"thigh",leg,[0,-.31,0],.59,.305,.235,skin,10);
  const knee=new B.TransformNode("knee joint",scene);knee.parent=leg;knee.position=V(0,-.63,0);
  sphere(scene,"knee",knee,[0,.02,0],[.14,.14,.14],skin,9);
  cylinder(scene,"shin",knee,[0,-.205,0],.36,.23,.16,skin,10);
  cylinder(scene,"ankle wrap",knee,[0,-.365,0],.18,.21,.20,boots,10);
  sphere(scene,"foot",knee,[0,-.42,.11],[.19,.12,.32],boots,10);
  legs.push({leg,knee,side});
 }
 const animate=(time,moving=false,speed=1)=>{
  const stride=moving?Math.sin(time*1.12)*.49:0;
  legs.forEach(({leg,knee,side})=>{leg.rotation.x=side*stride;knee.rotation.x=moving?Math.max(0,-side*stride)*.24:0});
  arms.forEach(({arm,elbow,side})=>{arm.rotation.x=moving?-side*stride*.63:Math.sin(time*.4+side)*.035;arm.rotation.z=side*.095;elbow.rotation.x=-.06});
  head.rotation.y=Math.sin(time*.19)*.035;
  head.rotation.x=moving?.018*Math.sin(time*2):Math.sin(time*.37)*.012;
  body.position.y=moving?.028*Math.abs(Math.sin(time*1.12)):Math.sin(time*.45)*.013;
 };
 return {root,appearance:p,animate,dispose:()=>root.dispose(false,false)};
}
