// Real Quaternius Universal Base Characters (Standard, CC0).
// Mesh, skeleton, skin weights and textures are imported; no body geometry is
// synthesized here. Current procedural and sculpted versions are fallback only.
import {normalizeAppearance,HAIR_COLORS,SKIN_TONES} from "./characters.js?v=20261113j";
import {createModelHuman as createBackupHuman} from "./character-models.js?v=20261113j";
import {loadLocomotion,createLocomotionPlayer} from "./locomotion.js?v=20261113j";

const B=globalThis.BABYLON;
const containers=new WeakMap();
let idCounter=0;
const hairFilenames=["simpleparted","buzzed","long","buns","buzzedfemale",null];
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
// Babylon attaches glTF skin bones to animated TransformNodes. Accessories
// must follow the Head transform, not the model's unmoving actor root.
function findHeadNode(model){
 const withoutPrefix=name=>String(name||"").replace(/^epoch_\d+_/,"");
 for(const skeleton of model.skeletons||[]){
  for(const bone of skeleton.bones||[]){
   if(withoutPrefix(bone.name)==="Head"){
    const linked=bone.getTransformNode?.();
    if(linked)return linked;
   }
  }
 }
 return traverse(model.rootNodes||[]).find(node=>withoutPrefix(node.name)==="Head")||null;
}

const tint=(scene,material,colorHex,weight=.65)=>{
 if(!material)return;
 const c=B.Color3.FromHexString(colorHex);
 const neutral=B.Color3.White();
 const newColor=B.Color3.Lerp(neutral,c,weight);
 if("albedoColor" in material)material.albedoColor=newColor;
 if("diffuseColor" in material)material.diffuseColor=newColor;
};
export function createQuaterniusHuman(scene,appearance,parent=null,name="human"){
 const profile=normalizeAppearance(appearance),instanceId=++idCounter;
 const root=new B.TransformNode("quaternius-actor:"+name,scene);
 if(parent)root.parent=parent;
 root.scaling.x=profile.build*1.18;
 root.scaling.z=profile.build*1.18;
 root.scaling.y=profile.height*1.18;
 let model=null,hair=null,beard=null,backup=null,destroyed=false,headNode=null;
 const ownedMaterials=[];
 let locomotion=null;
 const rig={
  root,appearance:profile,ready:null,
  animationStatus(){return {loaded:!!locomotion,matchedBones:locomotion?.matchedBones||0,mode:locomotion?.mode||null}},
  attachmentStatus(){
   return {
    headFound:!!headNode,
    hairExpected:!!hairFilenames[profile.hairStyle],
    hairAttached:!!hair && hair.rootNodes.every(node=>node.parent===headNode),
    beardExpected:profile.sex==="male"&&profile.beard>0,
    beardAttached:!!beard && beard.rootNodes.every(node=>node.parent===headNode)
   };
  },
  animate(time,moving=false,running=false){
   if(destroyed)return;
   if(backup){backup.animate(time,moving);return;}
   if(!model)return;
   // Play actual authored Quaternius skeleton keyframes on the glTF-linked
   // TransformNodes. Bone-only animation would be overwritten each frame.
   locomotion?.update(time,moving?(running?"run":"walk"):"idle");
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
  for(const part of inst.rootNodes){
   // Original Quaternius hair geometry already uses the humanoid's rest
   // coordinate system (head is about 1.7 model units above the ground).
   // First place it under the actor, then setParent() retains that exact
   // world-space placement while changing the animation pivot to Head.
   // A raw "part.parent=headNode" would double-apply the head offset.
   part.parent=root;
   part.computeWorldMatrix(true);
   headNode.computeWorldMatrix(true);
   part.setParent(headNode);
  }
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
  headNode=findHeadNode(model);
  if(!headNode)throw new Error("Quaternius Head joint not found; cannot safely attach hair.");
  // Attach accessories BEFORE the first animated pose. Quaternius hairstyles
  // are modeled in the body's rest coordinates. Binding after an idle/jog
  // frame would bake an incorrect offset into the attachment.

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
  const variant=hairFilenames[profile.hairStyle];
  if(variant)try{hair=await placeHair(variant,"hair")}catch(error){console.warn("Epoch hair asset failed; body remains playable:",error)}
  if(profile.sex==="male"&&profile.beard>0){
   try{beard=await placeHair("beard","beard")}
   catch(error){console.warn("Epoch beard failed to load:",error)}
  }
  // Start the animation only after both the hair and beard have been
  // positioned relative to the character's neutral/rest Head joint.
  try{
   locomotion=createLocomotionPlayer(scene,model,await loadLocomotion(scene));
   locomotion.update(performance.now()/1000,"idle");
  }catch(error){
   console.error("Epoch locomotion initialization failed:",error);
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
