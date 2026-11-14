/**
 * Epoch 4B.2 water model. Stable infinite-coordinate rivers and linked lakes.
 * Never use Math.random or per-chunk water endpoints: a river must continue
 * across all seams and survive save/reload without saving geometry.
 */
import {terrainHeight,STARTER_SEED} from "./forest-generation.js?v=20261114y";
export const WATER_MODEL_VERSION=1;
export const SHALLOW_LIMIT=.85;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
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
export function waterAt(x,z,seed=STARTER_SEED,protectedSites=[]){
 if(!Number.isFinite(x)||!Number.isFinite(z))return {kind:"land",depth:0,shore:Infinity};
 const phase=seedPhase(seed),approx=Math.round((z-72-42*Math.sin(phase*2.4))/195);
 let best=Infinity,kind="land",siteId=null;
 for(let channel=approx-2;channel<=approx+2;channel++){
  const riverZ=riverCenter(x,channel,seed);
  const d=Math.abs(z-riverZ)-riverWidth(x,channel,seed);
  if(d<best){best=d;kind="river";siteId="river:"+channel}
  const section=Math.floor(x/232);
  for(let ix=section-1;ix<=section+1;ix++){
   for(const lake of lakeSites(seed,channel,ix)){
    const ld=Math.hypot(x-lake.x,z-lake.z)-lake.radius;
    if(ld<best){best=ld;kind="lake";siteId=lake.id}
   }
  }
 }
 // The original starter area (including original resource sites and plots)
 // has always been dry. Retain that invariant for every existing world seed.
 let protection=smooth((Math.hypot(x+3,z+2)-58)/14);
 for(const site of protectedSites||[]){
  if(!site||!Number.isFinite(site.x)||!Number.isFinite(site.z))continue;
  const radius=Number.isFinite(site.radius)?site.radius:37;
  protection=Math.min(protection,smooth((Math.hypot(x-site.x,z-site.z)-radius)/11));
 }
 const inside=Math.max(0,-best);
 const raw=inside>0?(kind==="lake"?(.18+2.25*smooth(inside/5)):(.15+1.5*smooth(inside/2.8))):0;
 const depth=raw*protection;
 const base=terrainHeight(x,z,seed);
 return {kind:depth>.02?kind:"land",depth:depth>.02?depth:0,
  shore:Math.abs(best),id:depth>.02?siteId:null,
  surfaceY:base+.055,bedY:base-depth,
  shallow:depth>0&&depth<SHALLOW_LIMIT,
  passable:depth<SHALLOW_LIMIT};
}
export function waterTerrainHeight(x,z,seed=STARTER_SEED,protectedSites=[]){
 const sample=waterAt(x,z,seed,protectedSites);
 return sample.depth>0?sample.bedY:terrainHeight(x,z,seed);
}
