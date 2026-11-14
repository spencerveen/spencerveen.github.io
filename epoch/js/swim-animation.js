/**
 * Epoch procedural animation curves for the existing Quaternius rig.
 * Named skeletal joints get shoulder paddles, bent elbows, counter-kicks
 * and small torso rolls. All output is local joint rotation, not a second
 * mesh or an unlicensed external clip.
 */
export const SWIM_STROKE_VERSION=1;
export const SWIM_CYCLE=1.24;
export const FLOAT_CYCLE=3.4;
const TAU=2*Math.PI;
const sin=Math.sin,cos=Math.cos;
// Euler offsets are joint-local yaw, pitch and roll, in radians.
export function swimJointPose(name,phase,mode){
 if(mode!=="swim"&&mode!=="float")return null;
 const swimming=mode==="swim";
 const angle=phase*TAU/(swimming?SWIM_CYCLE:FLOAT_CYCLE);
 const left=angle,right=angle+Math.PI;
 const arm=(t,side)=>{
  if(swimming)return {yaw:side*(.19+.12*sin(t)),
   pitch:-.60-.78*cos(t),roll:side*(-.22+.12*sin(t)),weight:1};
  return {yaw:side*(.23+.13*sin(t)),
   pitch:-.27-.14*cos(t),roll:side*(-.16+.10*sin(t)),weight:.92};
 };
 const elbow=t=>swimming?{yaw:0,pitch:-.37-.56*Math.max(0,sin(t)),roll:0,weight:1}:
  {yaw:0,pitch:-.26-.18*Math.max(0,sin(t)),roll:0,weight:.9};
 const leg=(t,side)=>swimming?{yaw:side*.045,pitch:.09+.28*sin(t),roll:side*.035,weight:.95}:
  {yaw:side*.025,pitch:.12+.12*sin(t),roll:0,weight:.82};
 const knee=t=>swimming?{yaw:0,pitch:-.22-.27*Math.max(0,sin(t)),roll:0,weight:.9}:
  {yaw:0,pitch:-.15-.09*Math.max(0,sin(t)),roll:0,weight:.8};
 switch(name){
  case "upperarm_l":return arm(left,-1);
  case "upperarm_r":return arm(right,1);
  case "lowerarm_l":return elbow(left-.65);
  case "lowerarm_r":return elbow(right-.65);
  case "thigh_l":return leg(left+Math.PI/2,-1);
  case "thigh_r":return leg(right+Math.PI/2,1);
  case "calf_l":return knee(left-.3);
  case "calf_r":return knee(right-.3);
  case "foot_l":return {yaw:0,pitch:.12+.12*sin(left),roll:0,weight:.78};
  case "foot_r":return {yaw:0,pitch:.12+.12*sin(right),roll:0,weight:.78};
  case "spine_02":return {yaw:0,pitch:-.04+.055*sin(angle),
   roll:(swimming?.075:.035)*sin(angle),weight:.85};
  case "spine_03":return {yaw:0,pitch:.04,roll:(swimming?-.065:-.02)*sin(angle),weight:.8};
  case "neck_01":return {yaw:0,pitch:-.10,roll:0,weight:.75};
  case "Head":return {yaw:.04*sin(angle),pitch:-.12,
   roll:.03*sin(angle),weight:.75};
  default:return null;
 }
}
