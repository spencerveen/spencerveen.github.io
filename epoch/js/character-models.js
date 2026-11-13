// Epoch sculpted GLB character adapter.
// Source models are original glTF 2.0 mesh assets that can be opened in Blender.
// One cached asset container per sex; live characters are independently cloned.
// This adapter intentionally uses the existing appearance schema and keeps the
// game loop synchronous while models load asynchronously.
import {
  normalizeAppearance, HAIR_COLORS, SKIN_TONES, EYE_COLORS, createHuman as createFallbackHuman
} from "./characters.js?v=20261113f";

const B=globalThis.BABYLON;
const containers=new WeakMap();
let sequence=0;
const names=["Skin","Hair","Eye","Tunic","Leather","Fur","Trim","Boots"];
const PALETTES={
  Tunic:["#74503a","#604334","#80634a"],
  Fur:["#b6a383","#c7b392","#aaa18a"],
  Leather:["#463125","#503526","#483428"],
  Boots:["#4b3829","#544032","#3e3228"]
};
function paletteFor(profile,name){
  if(name==="Skin")return SKIN_TONES[profile.skin];
  if(name==="Hair")return HAIR_COLORS[profile.hairColor].hex;
  if(name==="Eye")return EYE_COLORS[profile.eyes];
  if(PALETTES[name])return PALETTES[name][profile.outfit];
  return null;
}
async function source(scene,sex){
  let bySex=containers.get(scene);
  if(!bySex){bySex=new Map();containers.set(scene,bySex);}
  if(!bySex.has(sex)){
    const promise=B.SceneLoader.LoadAssetContainerAsync(
      "./assets/characters/","human_"+sex+".glb",scene
    ).catch(error=>{bySex.delete(sex);throw error;});
    bySex.set(sex,promise);
  }
  return bySex.get(sex);
}
function allChildren(entries){
  const nodes=[],visit=node=>{
    nodes.push(node);
    for(const child of node.getChildren?.()||[])visit(child);
  };
  entries.rootNodes.forEach(visit);
  return nodes;
}
function rotateX(node,angle){
  if(!node)return;
  if(node.rotationQuaternion)node.rotationQuaternion=B.Quaternion.RotationAxis(B.Axis.X,angle);
  else node.rotation.x=angle;
}
function rotateY(node,angle){
  if(!node)return;
  if(node.rotationQuaternion)node.rotationQuaternion=B.Quaternion.RotationAxis(B.Axis.Y,angle);
  else node.rotation.y=angle;
}
export function createModelHuman(scene,appearance,parent=null,name="human"){
  const profile=normalizeAppearance(appearance),id=++sequence;
  const root=new B.TransformNode("epoch-humanoid:"+name,scene);
  if(parent)root.parent=parent;
  root.scaling.setAll?.(1);
  // Adjust height and body shape while preserving identical skeletal attachments.
  root.scaling.y=profile.height;
  root.scaling.x=profile.build;root.scaling.z=profile.build;
  let destroyed=false,instance=null,fallback=null,joints={},localMats=[];
  const rig={root,appearance:profile,ready:null,
    animate(time,moving=false){
      if(destroyed)return;
      if(!instance){fallback?.animate(time,moving);return;}
      const cycle=moving?Math.sin(time*1.12)*.51:0;
      const breathe=moving?.017*Math.sin(time*2.1):.012*Math.sin(time*.55);
      const moveArm=(side)=>{const s=side==="L"?-1:1;
        rotateX(joints["UpperArm_"+side],-s*cycle*.8+(moving?0:.02*Math.sin(time*.47+s)));
        rotateX(joints["LowerArm_"+side],-.12-Math.max(0,cycle*s)*.18);
        rotateX(joints["UpperLeg_"+side],s*cycle);
        rotateX(joints["LowerLeg_"+side],Math.max(0,s*cycle)*.36);
      };
      moveArm("L");moveArm("R");
      rotateY(joints.Head,Math.sin(time*.32)*.035);
      if(joints.Spine)joints.Spine.position.y=.47+breathe;
    },
    dispose(){
      destroyed=true;
      if(instance){instance.dispose();instance=null;}
      if(fallback){fallback.dispose();fallback=null;}
      for(const mat of localMats)mat.dispose();
      localMats=[];
      root.dispose(false,false);
    }
  };
  rig.ready=source(scene,profile.sex).then(container=>{
    if(destroyed)return false;
    // Clone both nodes and materials so hair and skin variation never recolors
    // another NPC's appearance.
    instance=container.instantiateModelsToScene(
      sourceName=>"epoch_"+id+"_"+sourceName,
      true,
      {doNotInstantiate:true}
    );
    const nested=allChildren(instance);
    for(const node of instance.rootNodes)node.parent=root;
    const strip=name=>name.replace(/^epoch_\d+_/,"").replace(/^Clone of /,"");
    const groups=new Map();
    for(const n of nested){
      const label=strip(n.name||"");
      if(["Hips","Spine","Head","UpperArm_L","UpperArm_R","LowerArm_L","LowerArm_R","UpperLeg_L","UpperLeg_R","LowerLeg_L","LowerLeg_R","Foot_L","Foot_R"].includes(label)){
        joints[label]=n;
      }
      const hairMatch=label.match(/^Hair_([0-5])$/);
      if(hairMatch)n.setEnabled(Number(hairMatch[1])===profile.hairStyle);
      const beardMatch=label.match(/^Beard_([1-3])$/);
      if(beardMatch)n.setEnabled(profile.sex==="male" && Number(beardMatch[1])===profile.beard);
      if(!n.material)continue;
      const mat=n.material;
      // Babylon may prepend imported material names. Retain only the last
      // source component to classify the dynamic palette.
      const matName=(mat.name||"").replace(/^epoch_\d+_/,"").replace(/^Clone of /,"");
      const kind=names.find(k=>matName===k||matName.endsWith("."+k)||matName.endsWith(":"+k));
      if(kind){
        if(!groups.has(mat)){
          const hex=paletteFor(profile,kind);
          if(hex){
            // instantiateModelsToScene(..., true) already owns distinct materials.
            mat.albedoColor=B.Color3.FromHexString(hex);
            mat.diffuseColor=B.Color3.FromHexString(hex);
            if(kind==="Hair")mat.roughness=.94;
          }
          groups.set(mat,true);
          localMats.push(mat);
        }
      }
    }
    // Hide the invisible geometry of unselected hairstyle via parent state.
    return true;
  }).catch(error=>{
    if(!destroyed){
      console.error("Epoch GLB character failed to load; using backup mesh:",name,error);
      fallback=createFallbackHuman(scene,profile,root,name+"_backup");
    }
    return false;
  });
  return rig;
}
