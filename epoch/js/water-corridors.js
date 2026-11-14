/**
 * Seed-only river/lake footprints, independent of terrain elevation.
 * Shared by water rendering and mountain uplift to avoid cyclic imports.
 * Keep the original channel coordinates so old worlds retain their rivers.
 */
import {STARTER_SEED} from "./forest-generation.js?v=20261114y";
const hash=(a,b,c)=>{
 let h=(a>>>0)^Math.imul(b|0,0x9e3779b1)^Math.imul(c|0,0x85ebca77);
 h=Math.imul(h^(h>>>16),0x7feb352d);
 h=Math.imul(h^(h>>>15),0x846ca68b);
 return (h^(h>>>16))>>>0;
};
const rand=(seed,channel,section,n)=>hash(seed^Math.imul(n+1,0x27d4eb2d),channel,section)/4294967296;
const seedPhase=seed=>((seed>>>0)%100000)*.0000712;
export function riverCenter(x,channel,seed=STARTER_SEED){
 const phase=seedPhase(seed),t=channel*1.73+phase;
 const offset=72+42*Math.sin(phase*2.4);
 return offset+channel*195+
  24*Math.sin(x/153+t)+11*Math.sin(x/57+phase*1.9+channel*.91);
}
export function riverWidth(x,channel,seed=STARTER_SEED){
 return 5.5+1.3*Math.sin(x/79+channel*1.41+seedPhase(seed)*3);
}
export function lakeSites(seed,channel,section){
 const r=rand(seed,channel,section,0);
 if(r>.37)return [];
 const x=section*232+112+(rand(seed,channel,section,1)-.5)*123;
 const z=riverCenter(x,channel,seed)+(rand(seed,channel,section,2)-.5)*27;
 const radius=14+rand(seed,channel,section,3)*17;
 return [{id:"lake:"+channel+":"+section,kind:"lake",x,z,radius}];
}
/** Signed distance to the closest original water boundary (negative = wet). */
export function nearestWaterCorridor(x,z,seed=STARTER_SEED){
 if(!Number.isFinite(x)||!Number.isFinite(z))
  return {distance:Infinity,kind:"land",id:null};
 const phase=seedPhase(seed);
 const approx=Math.round((z-72-42*Math.sin(phase*2.4))/195);
 let distance=Infinity,kind="land",id=null;
 for(let channel=approx-2;channel<=approx+2;channel++){
  const riverZ=riverCenter(x,channel,seed);
  const d=Math.abs(z-riverZ)-riverWidth(x,channel,seed);
  if(d<distance){distance=d;kind="river";id="river:"+channel;}
  const section=Math.floor(x/232);
  for(let ix=section-1;ix<=section+1;ix++){
   for(const lake of lakeSites(seed,channel,ix)){
    const ld=Math.hypot(x-lake.x,z-lake.z)-lake.radius;
    if(ld<distance){distance=ld;kind="lake";id=lake.id;}
   }
  }
 }
 return {distance,kind,id};
}
