import assert from "node:assert/strict";
import {SWIM_STROKE_VERSION,SWIM_CYCLE,FLOAT_CYCLE,swimJointPose} from "../js/swim-animation.js";
assert.equal(SWIM_STROKE_VERSION,1);
assert(SWIM_CYCLE<FLOAT_CYCLE);
assert.equal(swimJointPose("upperarm_l",0,"idle"),null);
assert.equal(swimJointPose("irrelevant",0,"swim"),null);
const joints=["upperarm_l","upperarm_r","lowerarm_l","lowerarm_r",
 "thigh_l","thigh_r","calf_l","calf_r","spine_02","Head"];
for(const mode of ["swim","float"]){
 for(const name of joints){
  const a=swimJointPose(name,0,mode),b=swimJointPose(name,.3,mode);
  assert(a&&b,name+" must be animated in "+mode);
  for(const key of ["yaw","pitch","roll","weight"])
   assert(Number.isFinite(a[key])&&Number.isFinite(b[key]));
  assert(a.weight>0&&a.weight<=1);
 }
}
const arm=(name,t)=>swimJointPose(name,t,"swim");
const left0=arm("upperarm_l",0),leftHalf=arm("upperarm_l",SWIM_CYCLE/2);
const right0=arm("upperarm_r",0);
assert(Math.abs(left0.pitch-leftHalf.pitch)>.6,"arm reaches and pulls through the water");
assert(Math.abs(left0.pitch-right0.pitch)>.6,"front crawl shoulders alternate, not mirror stroke");
assert(Math.abs(swimJointPose("thigh_l",0,"swim").pitch-
 swimJointPose("thigh_l",SWIM_CYCLE/4,"swim").pitch)>.12,"legs kick");
assert.notDeepEqual(swimJointPose("upperarm_l",0,"float"),
 swimJointPose("upperarm_l",0,"swim"),"floating is distinct from moving strokes");
const first=swimJointPose("upperarm_l",0,"swim");
const loop=swimJointPose("upperarm_l",SWIM_CYCLE,"swim");
for(const key of ["yaw","pitch","roll","weight"])
 assert(Math.abs(first[key]-loop[key])<1e-12,"swim strokes loop smoothly without a seam");
console.log("PASS procedural water clips: alternate strokes, kick, float, numeric joints and loops");
