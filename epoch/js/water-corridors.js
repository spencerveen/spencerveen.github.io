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
const lakeCache=new Map();
const LAKE_CACHE_LIMIT=2048;
// A small bounded cache avoids rebuilding lake descriptors millions of times
// while terrain/water vertices are sampled. No geography is saved or mutated.
function cachedLakes(seed,channel,section,make){
 const key=(seed>>>0)+":"+channel+":"+section;
 if(lakeCache.has(key))return lakeCache.get(key);
 const value=make();
 if(lakeCache.size>=LAKE_CACHE_LIMIT)lakeCache.clear();
 lakeCache.set(key,value);
 return value;
}

export function riverCenter(x,channel,seed=STARTER_SEED){
 const phase=seedPhase(seed),t=channel*1.73+phase;
 const offset=72+42*Math.sin(phase*2.4);
 return offset+channel*195+
  24*Math.sin(x/153+t)+11*Math.sin(x/57+phase*1.9+channel*.91);
}
export function riverWidth(x,channel,seed=STARTER_SEED){
 const phase=seedPhase(seed);
 // Broad depth changes with small, seed-stable bank irregularities; the
 // original channel centerline and the river's identity remain unchanged.
 return 6.15+1.25*Math.sin(x/92+channel*1.41+phase*3)+
  .56*Math.sin(x/37+channel*.77-phase*1.8)+
  .25*Math.sin(x/19+channel*2.3+phase);
}
export function lakeSites(seed,channel,section){
 return cachedLakes(seed,channel,section,()=>{
  const r=rand(seed,channel,section,0);
  if(r>.37)return [];
  // Preserve seeded lake coordinates/IDs, expand their basins rather than
  // replacing lake positions and unexpectedly changing saved place names.
  const x=section*232+112+(rand(seed,channel,section,1)-.5)*123;
  const z=riverCenter(x,channel,seed)+(rand(seed,channel,section,2)-.5)*27;
  const radius=23+rand(seed,channel,section,3)*24;
  const angle=(rand(seed,channel,section,4)-.5)*1.2;
  const phase=rand(seed,channel,section,5)*Math.PI*2;
  return [{id:"lake:"+channel+":"+section,kind:"lake",x,z,radius,angle,phase}];
 });
}
/** An elongated basin with gentle, uneven banks rather than a perfect disc. */
export function lakeShoreDistance(x,z,lake){
 const dx=x-lake.x,dz=z-lake.z;
 // Outside the whole mountain-valley influence, the precise winding
 // shoreline is unnecessary. Keep the inexpensive far-distance shortcut far
 // enough away that it cannot create a visible ridge/valley discontinuity.
 if(Math.abs(dx)>lake.radius+120||Math.abs(dz)>lake.radius+120)
  return Math.hypot(dx,dz)-lake.radius;
 const ca=Math.cos(lake.angle),sa=Math.sin(lake.angle);
 const along=dx*ca+dz*sa,across=-dx*sa+dz*ca;
 const theta=Math.atan2(across,along);
 const radius=lake.radius*(1+.075*Math.sin(theta*3+lake.phase)+
  .045*Math.cos(theta*5-lake.phase*.7));
 // Elongated along the valley, with rounded, irregular inlets.
 return Math.hypot(along*.82,across*1.18)-radius;
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
    const ld=lakeShoreDistance(x,z,lake);
    if(ld<distance){distance=ld;kind="lake";id=lake.id;}
   }
  }
 }
 return {distance,kind,id};
}
