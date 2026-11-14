/**
 * Gentle swim-cycle accents, added on top of anatomical Quaternius
 * RUN (swimming) or IDLE (treading) clips. Never animate from bind/T pose.
 * Source animation retains bent elbows, natural shoulders and leg pivots.
 */
export const SWIM_STROKE_VERSION=2;
export const SWIM_CYCLE=1.34;
export const FLOAT_CYCLE=3.6;
const TAU=2*Math.PI;
const sin=Math.sin,cos=Math.cos;
// Small joint-local offsets; authored clips provide the actual joint pose.
export function swimJointPose(name,phase,mode){
 if(mode!=="swim"&&mode!=="float")return null;
 const swimming=mode==="swim";
 const t=phase*TAU/(swimming?SWIM_CYCLE:FLOAT_CYCLE);
 const opposite=t+Math.PI;
 const arm=(a,side)=>swimming?{
  yaw:side*(.05+.055*sin(a)),pitch:-.14-.25*cos(a),
  roll:side*(.035+.045*sin(a)),weight:.70
 }:{
  yaw:side*(.08+.035*sin(a)),pitch:.06+.09*cos(a),
  roll:side*.035,weight:.60
 };
 const elbow=a=>swimming?{yaw:0,pitch:-.12-.15*Math.max(0,sin(a)),roll:0,weight:.68}:
  {yaw:0,pitch:.05+.07*sin(a),roll:0,weight:.55};
 const leg=a=>swimming?{yaw:0,pitch:.08+.13*sin(a),roll:0,weight:.65}:
  {yaw:0,pitch:.03+.07*sin(a),roll:0,weight:.48};
 const knee=a=>swimming?{yaw:0,pitch:-.09-.09*Math.max(0,sin(a)),roll:0,weight:.58}:
  {yaw:0,pitch:.04*sin(a),roll:0,weight:.45};
 switch(name){
  case "upperarm_l":return arm(t,-1);
  case "upperarm_r":return arm(opposite,1);
  case "lowerarm_l":return elbow(t-.5);
  case "lowerarm_r":return elbow(opposite-.5);
  case "thigh_l":return leg(t+Math.PI/2);
  case "thigh_r":return leg(opposite+Math.PI/2);
  case "calf_l":return knee(t);
  case "calf_r":return knee(opposite);
  case "foot_l":return {yaw:0,pitch:.07*sin(t),roll:0,weight:.6};
  case "foot_r":return {yaw:0,pitch:.07*sin(opposite),roll:0,weight:.6};
  case "spine_02":return {yaw:0,pitch:0,roll:(swimming?.045:.02)*sin(t),weight:.55};
  case "spine_03":return {yaw:0,pitch:0,roll:(swimming?-.04:-.015)*sin(t),weight:.52};
  case "neck_01":return {yaw:0,pitch:-.04,roll:0,weight:.5};
  case "Head":return {yaw:.025*sin(t),pitch:swimming?-.07:.025,
   roll:.025*sin(t),weight:.55};
  default:return null;
 }
}
