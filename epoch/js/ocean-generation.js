/**
 * Epoch coastal biome. The mainland's eastern shoreline curves with the
 * world seed; positive X continues into the open ocean indefinitely.
 * Geometry remains a deterministic function of absolute world coordinates.
 */
import {STARTER_SEED} from "./forest-generation.js?v=20261114y";
import {mountainTerrainHeight} from "./mountain-generation.js?v=20261114watershed3";
export const OCEAN_MODEL_VERSION=2;
export const SEA_LEVEL=.15;
export const COAST_BASE_X=565;
export const COAST_SHELF=166;
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*t;
/** Positive distance is seaward. This never depends on loaded chunks. */
export function coastlineX(z,seed=STARTER_SEED){
 const phase=((seed>>>0)%100003)*.0000432;
 return COAST_BASE_X+58*Math.sin(z/217+phase*2.1)+
  30*Math.sin(z/67+phase*3.8)+11*Math.sin(z/28-phase*1.9)+
  3.5*Math.sin(z/13.7+phase*4.2)+1.35*Math.sin(z/6.5-phase*3.4);
}
/** Preserve the exact historical stockpile and buildings as dry land. */
function landSanctuary(x,z,sites=[]){
 let protect=0;
 for(const site of sites||[]){
  if(!site||!Number.isFinite(site.x)||!Number.isFinite(site.z))continue;
  const radius=Number.isFinite(site.radius)?Math.max(3,Math.min(90,site.radius)):18;
  const radiusDist=Math.hypot(x-site.x,z-site.z)-radius;
  protect=Math.max(protect,1-smooth(radiusDist/52));
  if(protect>=1)break;
 }
 return protect;
}
export function oceanAt(x,z,seed=STARTER_SEED,protectedSites=[],mountainSites=[]){
 if(!Number.isFinite(x)||!Number.isFinite(z))return null;
 const coast=coastlineX(z,seed),distance=x-coast;
 // Skip costly mountain math in the vast, unchanged continental interior.
 if(distance < -COAST_SHELF-2)return null;
 const protectedFraction=landSanctuary(x,z,protectedSites);
 const exposure=1-protectedFraction;
 const outToSea=Math.max(0,distance);
 // Walkable sandy shallows now extend ~20m seaward before the sea floor
 // gets gradually deeper. No abrupt cliff just past the surf.
 const rawDepth=Math.min(14,Math.min(outToSea,20)*.04+
  Math.max(0,outToSea-20)*.105);
 const depth=rawDepth*exposure;
 const openBed=SEA_LEVEL-rawDepth;
 // Most ocean chunks have no land and require no expensive inland river or
 // mountain queries. This fast path keeps exploration fast far offshore.
 if(distance>0&&exposure===1)return {distance,coastX:coast,
  groundY:openBed,beach:0,depth:depth>.025?depth:0,
  bedY:openBed,surfaceY:SEA_LEVEL,shore:Math.abs(distance),
  protectedFraction};
 const land=mountainTerrainHeight(x,z,seed,mountainSites);
 const dryDistance=Math.max(0,-distance);
 const shoreApproach=smooth(dryDistance/COAST_SHELF);
 const coastalLand=mix(SEA_LEVEL,Math.max(land,SEA_LEVEL+.18),shoreApproach);
 // An existing village over what would become ocean rises smoothly into a
 // permanent island of its old land rather than being moved or submerged.
 const groundY=distance<=0?mix(land,coastalLand,exposure):
  mix(land,openBed,exposure);
 // The actual dry sand width and vegetation setback are shared with the
 // seeded beach biome; evaluate the lightweight formula here to avoid an
 // ocean-generation <-> beach-generation circular dependency.
 const phase=(seed>>>0)*.000013;
 const width=90+12*Math.sin(z/132+phase)+7*Math.sin(z/47-phase*.7);
 const beach=distance<0?smooth((width+distance)/width)*exposure:0;
 return {distance,coastX:coast,groundY,beach,
  depth:depth>.025?depth:0,
  bedY:groundY,surfaceY:SEA_LEVEL,
  shore:Math.abs(distance),protectedFraction};
}
