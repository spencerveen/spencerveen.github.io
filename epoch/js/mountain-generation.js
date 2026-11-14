/**
 * Epoch terrain phase 1: seeded, continuous mountain ranges and foothills.
 * No random chunk endpoints or stored geometry. The existing forest height
 * stays unchanged; this module adds smooth nonnegative uplift.
 */
import {terrainHeight,STARTER_SEED} from "./forest-generation.js?v=20261114y";
import {nearestWaterCorridor} from "./water-corridors.js?v=20261114ecology2";
export const MOUNTAIN_MODEL_VERSION=1;
export const MOUNTAIN_START_RADIUS=150;
export const RIVER_VALLEY_SHOULDER=68;
/** 0 inside the river/lake and 1 outside the broad, smooth valley floor. */
export function riverValleyFactor(signedDistance){
 const t=Math.max(0,Math.min(1,(signedDistance+3)/RIVER_VALLEY_SHOULDER));
 return t*t*(3-2*t);
}
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const hash=(x,z,seed)=>{
 let h=(seed>>>0)^Math.imul(x|0,0x9e3779b1)^Math.imul(z|0,0x85ebca77);
 h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);
 return ((h^(h>>>16))>>>0)/4294967295;
};
const lerp=(a,b,t)=>a+(b-a)*t;
function noise(x,z,seed){
 const ix=Math.floor(x),iz=Math.floor(z),fx=smooth(x-ix),fz=smooth(z-iz);
 return lerp(lerp(hash(ix,iz,seed),hash(ix+1,iz,seed),fx),
  lerp(hash(ix,iz+1,seed),hash(ix+1,iz+1,seed),fx),fz);
}
/** Broad mountain clusters with long curving ridges and gradual foothills. */
export function mountainAt(x,z,seed=STARTER_SEED,protectedSites=[],corridorDistance=null){
 if(!Number.isFinite(x)||!Number.isFinite(z))return {uplift:0,strength:0,ridge:0};
 // Every save retains its original opening clearing and nearby forest.
 const starter=smooth((Math.hypot(x+3,z+2)-MOUNTAIN_START_RADIUS)/130);
 if(!starter)return {uplift:0,strength:0,ridge:0};
 const angle=((seed>>>0)%997)/997*Math.PI*.85+.17;
 const ca=Math.cos(angle),sa=Math.sin(angle);
 const across=-x*sa+z*ca,along=x*ca+z*sa;
 const region=noise((across*.85+along*.18)/380,(along*.91-across*.12)/380,
  (seed^0x4d4f554e)>>>0);
 const mass=smooth((region-.535)/.205);
 if(!mass)return {uplift:0,strength:0,ridge:0};
 let protection=starter;
 for(const site of protectedSites||[]){
  if(!site||!Number.isFinite(site.x)||!Number.isFinite(site.z))continue;
  const r=Number.isFinite(site.radius)?Math.max(0,site.radius):20;
  protection=Math.min(protection,smooth((Math.hypot(x-site.x,z-site.z)-r)/42));
  if(!protection)break;
 }
 if(!protection)return {uplift:0,strength:0,ridge:0};
 const bend=24*Math.sin(along/155+(seed%311)*.018);
 const ridge=Math.pow(1-Math.abs(Math.sin((across+bend)/87)),3);
 const detail=.78+.22*noise(x/115,z/115,(seed^0x4c41594f)>>>0);
 // The old river footprint is preserved. Instead of draping blue water over
 // a mountainside, suppress mountain uplift through a wide rounded valley.
 // Passing the already-calculated corridor distance avoids duplicate searches
 // in the very dense terrain/water mesh samplers.
 const shore=Number.isFinite(corridorDistance)?corridorDistance:
  nearestWaterCorridor(x,z,seed).distance;
 const valley=riverValleyFactor(shore);
 const strength=mass*protection*valley;
 return {uplift:strength*(5+31*ridge)*detail,strength,ridge};
}
export function mountainTerrainHeight(x,z,seed=STARTER_SEED,protectedSites=[],corridorDistance=null){
 return terrainHeight(x,z,seed)+mountainAt(x,z,seed,protectedSites,corridorDistance).uplift;
}
