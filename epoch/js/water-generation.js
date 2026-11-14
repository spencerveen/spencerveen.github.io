/**
 * Epoch 4B.2 water model. Stable infinite-coordinate rivers and linked lakes.
 * Never use Math.random or per-chunk water endpoints: a river must continue
 * across all seams and survive save/reload without saving geometry.
 */
import {STARTER_SEED} from "./forest-generation.js?v=20261114y";
import {mountainTerrainHeight} from "./mountain-generation.js?v=20261114valleys1";
import {nearestWaterCorridor} from "./water-corridors.js?v=20261114ecology2";
import {oceanAt,SEA_LEVEL} from "./ocean-generation.js?v=20261114ocean1";
export {riverCenter,riverWidth,lakeSites} from "./water-corridors.js?v=20261114ecology2";
export const WATER_MODEL_VERSION=1;
export const SHALLOW_LIMIT=.85;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
export function waterAt(x,z,seed=STARTER_SEED,protectedSites=[],mountainProtectedSites=[],oceanProtectedSites=[]){
 if(!Number.isFinite(x)||!Number.isFinite(z))return {kind:"land",depth:0,shore:Infinity};
 const ocean=oceanAt(x,z,seed,oceanProtectedSites,mountainProtectedSites);
 if(ocean?.depth>.025)return {
  kind:"ocean",id:"ocean:eastern-sea",depth:ocean.depth,
  shore:ocean.shore,coastDistance:ocean.distance,coastBeach:ocean.beach,
  surfaceY:SEA_LEVEL,bedY:ocean.bedY,
  shallow:ocean.depth<SHALLOW_LIMIT,passable:ocean.depth<SHALLOW_LIMIT
 };
 const {distance:best,kind,id:siteId}=nearestWaterCorridor(x,z,seed);
 // The original starter area (including original resource sites and plots)
 // has always been dry. Retain that invariant for every existing world seed.
 let protection=smooth((Math.hypot(x+3,z+2)-58)/14);
 for(const site of protectedSites||[]){
  if(!site||!Number.isFinite(site.x)||!Number.isFinite(site.z))continue;
  const radius=Number.isFinite(site.radius)?site.radius:37;
  protection=Math.min(protection,smooth((Math.hypot(x-site.x,z-site.z)-radius)/11));
 }
 const inside=Math.max(0,-best);
 const raw=inside>0?(kind==="lake"?(.15+2.5*smooth(inside/7.2)):(.12+1.65*smooth(inside/3.7))):0;
 const depth=raw*protection;
 const base=ocean?ocean.groundY:mountainTerrainHeight(x,z,seed,mountainProtectedSites,best);
 return {kind:depth>.02?kind:"land",depth:depth>.02?depth:0,
  shore:Math.abs(best),id:depth>.02?siteId:null,
  corridorDistance:best,
  coastDistance:ocean?.distance??-Infinity,coastBeach:ocean?.beach||0,
  surfaceY:base+.055,bedY:base-depth,
  shallow:depth>0&&depth<SHALLOW_LIMIT,
  passable:depth<SHALLOW_LIMIT};
}
export function waterTerrainHeight(x,z,seed=STARTER_SEED,protectedSites=[],mountainProtectedSites=[],oceanProtectedSites=[]){
 const sample=waterAt(x,z,seed,protectedSites,mountainProtectedSites,oceanProtectedSites);
 return sample.depth>0?sample.bedY:sample.surfaceY-.055;
}
