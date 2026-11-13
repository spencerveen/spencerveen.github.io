import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../assets/animations");
const data=JSON.parse(fs.readFileSync(path.join(dir,"quaternius-locomotion.json"),"utf8"));

class Quaternion{
 constructor(x=0,y=0,z=0,w=1){Object.assign(this,{x,y,z,w})}
 clone(){return new Quaternion(this.x,this.y,this.z,this.w)}
 normalize(){const n=Math.hypot(this.x,this.y,this.z,this.w)||1;this.x/=n;this.y/=n;this.z/=n;this.w/=n;return this}
 multiply(b){
  const a=this;
  return new Quaternion(
   a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,
   a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,
   a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,
   a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z);
 }
 copyFrom(q){Object.assign(this,{x:q.x,y:q.y,z:q.z,w:q.w});return this}
 static Inverse(q){const n=q.x*q.x+q.y*q.y+q.z*q.z+q.w*q.w||1;return new Quaternion(-q.x/n,-q.y/n,-q.z/n,q.w/n)}
 static Identity(){return new Quaternion()}
 static FromEulerVector(){return new Quaternion()}
 static Slerp(a,b,t){
  let bq=b.clone(),dot=a.x*bq.x+a.y*bq.y+a.z*bq.z+a.w*bq.w;
  if(dot<0){bq=new Quaternion(-bq.x,-bq.y,-bq.z,-bq.w);dot=-dot}
  if(dot>.9995){
   return new Quaternion(a.x+(bq.x-a.x)*t,a.y+(bq.y-a.y)*t,a.z+(bq.z-a.z)*t,a.w+(bq.w-a.w)*t).normalize();
  }
  const theta=Math.acos(Math.min(1,dot)),s=Math.sin(theta);
  const x=Math.sin((1-t)*theta)/s,y=Math.sin(t*theta)/s;
  return new Quaternion(a.x*x+bq.x*y,a.y*x+bq.y*y,a.z*x+bq.z*y,a.w*x+bq.w*y);
 }
}
class Vector3{
 constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z})}
 clone(){return new Vector3(this.x,this.y,this.z)}
 add(b){return new Vector3(this.x+b.x,this.y+b.y,this.z+b.z)}
 copyFrom(b){Object.assign(this,{x:b.x,y:b.y,z:b.z});return this}
 static Lerp(a,b,t){return new Vector3(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t)}
}
globalThis.BABYLON={Quaternion,Vector3};
const {createLocomotionPlayer}=await import("../js/locomotion.js");
const names=[...new Set(data.clips.walk.tracks.map(t=>t.name))];
const linked=new Map();
const bones=names.map(name=>{
 const node={name:"epoch_1_"+name,position:new Vector3(0,1,0),rotationQuaternion:Quaternion.Identity()};
 linked.set(name,node);
 return {name:"epoch_1_"+name,getTransformNode(){return node}};
});
const model={rootNodes:[],skeletons:[{bones}]};
const controller=createLocomotionPlayer({},model,data);
assert(controller.matchedBones>=60,"animation should match the real Quaternius rig");
const upper=linked.get("upperarm_l");
const leg=linked.get("thigh_l");
const root=linked.get("root");
const prior=root.rotationQuaternion.clone();
controller.update(100,"idle");
const changed=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+Math.abs(a.z-b.z)+Math.abs(a.w-b.w);
assert(changed(upper.rotationQuaternion,Quaternion.Identity())>.04,"idle must exit T-pose");
assert(changed(root.rotationQuaternion,prior)<.00001,"root glTF coordinate conversion must remain unchanged");
const idleArm=upper.rotationQuaternion.clone();
controller.update(100.1,"walk");controller.update(100.35,"walk");controller.update(100.65,"walk");
const walkingArm=upper.rotationQuaternion.clone();
assert(changed(idleArm,walkingArm)>.04,"walk cycle should move shoulder/arms");
const walkingLeg=leg.rotationQuaternion.clone();
controller.update(100.85,"run");controller.update(101.1,"run");
assert(changed(leg.rotationQuaternion,walkingLeg)>.04,"jog clip should move legs");
controller.update(101.32,"idle");controller.update(101.7,"idle");
const stopped=upper.rotationQuaternion.clone();
assert(changed(stopped,walkingArm)>.04,"character must return to idle after stopping");
controller.reset();
assert(changed(upper.rotationQuaternion,Quaternion.Identity())<.00001,"reset restores model pose");
console.log("PASS movement controller: idle pose, walk cycle, jogging, transitions, reset and unchanged glTF root");
