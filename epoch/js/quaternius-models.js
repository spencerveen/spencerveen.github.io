// Real Quaternius Universal Base Characters (Standard, CC0).
// Mesh, skeleton, skin weights and textures are imported; no body geometry is
// synthesized here. Current procedural and sculpted versions are fallback only.
import {normalizeAppearance,HAIR_COLORS,SKIN_TONES} from "./characters.js?v=20261113d";
import {createModelHuman as createBackupHuman} from "./character-models.js?v=20261113d";

const B=globalThis.BABYLON;
const containers=new WeakMap();
let idCounter=0;
const hairFilenames=["simpleparted","buzzed","long","buns","buzzedfemale","buns"];
const sourceFor=(sex)=>"quaternius_"+sex+".glb";
function containerFor(scene,file){
 let existing=containers.get(scene);
 if(!existing){existing=new Map();containers.set(scene,existing)}
 if(!existing.has(file)){
  const load=B.SceneLoader.LoadAssetContainerAsync("./assets/characters/",file,scene)
   .catch(error=>{existing.delete(file);throw error});
  existing.set(file,load);
 }
 return existing.get(file);
}
function traverse(roots){
 const all=[],visit=node=>{all.push(node);for(const child of node.getChildren?.()||[])visit(child)};
 roots.forEach(visit);return all;
}
const tint=(scene,material,colorHex,weight=.65)=>{
 if(!material)return;
 const c=B.Color3.FromHexString(colorHex);
 const neutral=B.Color3.White();
 const newColor=B.Color3.Lerp(neutral,c,weight);
 if("albedoColor" in material)material.albedoColor=newColor;
 if("diffuseColor" in material)material.diffuseColor=newColor;
};
function applyBone(bone,origin,amount){
 if(!bone||!origin)return;
 try{
  const delta=B.Quaternion.RotationAxis(B.Axis.X,amount);
  bone.setRotationQuaternion(origin.multiply(delta),B.Space.LOCAL);
 }catch(e){
  // A future animation controller can provide alternate control for unusual rigs.
 }
}
export function createQuaterniusHuman(scene,appearance,parent=null,name="human"){
 const profile=normalizeAppearance(appearance),instanceId=++idCounter;
 const root=new B.TransformNode("quaternius-actor:"+name,scene);
 if(parent)root.parent=parent;
 root.scaling.x=profile.build*1.18;
 root.scaling.z=profile.build*1.18;
 root.scaling.y=profile.height*1.18;
 let model=null,hair=null,beard=null,backup=null,destroyed=false;
 const ownedMaterials=[],binds=new Map();
 const rig={
  root,appearance:profile,ready:null,
  animate(time,moving=false){
   if(destroyed)return;
   if(backup){backup.animate(time,moving);return;}
   if(!model)return;
   const swing=moving?Math.sin(time*1.12)*.43:0;
   const sequence=[
    ["thigh_l",swing],["thigh_r",-swing],
    ["calf_l",Math.max(0,-swing)*.48],["calf_r",Math.max(0,swing)*.48],
    ["upperarm_l",-swing*.5],["upperarm_r",swing*.5],
    ["lowerarm_l",-.04],["lowerarm_r",-.04],
    ["spine_01",moving?Math.sin(time*2.24)*.015:Math.sin(time*.65)*.009],
    ["Head",Math.sin(time*.28)*.01]
   ];
   for(const [name,angle] of sequence){const bound=binds.get(name);if(bound)applyBone(bound.bone,bound.rest,angle)}
  },
  dispose(){
   destroyed=true;
   for(const entry of [hair,beard,model])entry?.dispose();
   if(backup)backup.dispose();
   for(const mat of ownedMaterials)mat.dispose?.();
   root.dispose(false,false);
  }
 };
 const placeHair=async(filename,role)=>{
  const c=await containerFor(scene,"quaternius_hair_"+filename+".glb");
  if(destroyed)return null;
  const inst=c.instantiateModelsToScene(n=>"epoch_"+instanceId+"_"+role+"_"+n,true,{doNotInstantiate:true});
  if(destroyed){inst.dispose();return null}
  for(const part of inst.rootNodes)part.parent=root;
  const colors=HAIR_COLORS[profile.hairColor];
  for(const node of traverse(inst.rootNodes)){
   if(!node.material)continue;
   // The hair imports contain flat-material geometry, shared by all descendants.
   if(!ownedMaterials.includes(node.material))ownedMaterials.push(node.material);
   tint(scene,node.material,colors.hex,1);
  }
  return inst;
 };
 const setup=async()=>{
  const c=await containerFor(scene,sourceFor(profile.sex));
  if(destroyed)return false;
  model=c.instantiateModelsToScene(n=>"epoch_"+instanceId+"_"+n,true,{doNotInstantiate:true});
  if(destroyed){model.dispose();model=null;return false}
  for(const part of model.rootNodes)part.parent=root;
  for(const skin of model.skeletons||[]){
   for(const bone of skin.bones||[]){
    const name=bone.name.replace(/^epoch_\d+_/,"");
    if(!["thigh_l","thigh_r","calf_l","calf_r","upperarm_l","upperarm_r","lowerarm_l","lowerarm_r","spine_01","Head"].includes(name))continue;
    const base=bone.getRotationQuaternion(B.Space.LOCAL);
    if(base)binds.set(name,{bone,rest:base.clone()});
   }
  }
  for(const node of traverse(model.rootNodes)){
   const mat=node.material;
   if(!mat)continue;
   if(!ownedMaterials.includes(mat))ownedMaterials.push(mat);
   const materialName=(mat.name||"").toLowerCase();
   if(materialName.includes("superhero")){
    // Preserve original detailed skin textures. Only subtle color variation.
    tint(scene,mat,SKIN_TONES[profile.skin],.28);
   }
  }
  // Hair is a separately modeled Quaternius asset; no fake sphere-hair.
  const first=hairFilenames[profile.hairStyle]||"simpleparted";
  const variant=profile.sex==="female"&&first==="buzzed"?"buzzedfemale":first;
  try{hair=await placeHair(variant,"hair")}catch(error){console.warn("Epoch hair asset failed; body remains playable:",error)}
  if(profile.sex==="male"&&profile.beard>0){
   try{beard=await placeHair("beard","beard");if(beard)for(const rootNode of beard.rootNodes)rootNode.scaling.scaleInPlace(profile.beard===1?.78:profile.beard===2?.95:1.1)}
   catch(error){console.warn("Epoch beard failed to load:",error)}
  }
  return true;
 };
 rig.ready=setup().catch(error=>{
  if(destroyed)return false;
  console.error("Quaternius asset failed; restoring previous character model:",error);
  for(const entry of [beard,hair,model])entry?.dispose();
  model=null;hair=null;beard=null;
  backup=createBackupHuman(scene,profile,root,name+"_fallback");
  return backup.ready?.then(()=>false).catch(()=>false)??Promise.resolve(false);
 });
 return rig;
}
