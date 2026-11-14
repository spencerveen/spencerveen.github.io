/**
 * Seeded coastal biome sampling. Coordinates are in meters.
 * Sand, vegetation setbacks and beach flint use the same shoreline.
 * This helper contains no mesh or state dependencies.
 */
import {STARTER_SEED,CHUNK_SIZE,seededRandom} from "./forest-generation.js?v=20261114y";
import {coastlineX} from "./ocean-generation.js?v=20261114beaches1";
import {waterAt} from "./water-generation.js?v=20261114beaches1";
export const BEACH_MODEL_VERSION=1;
export const BEACH_TREE_BUFFER=12;
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
export function beachWidth(z,seed=STARTER_SEED){
 const phase=(seed>>>0)*.000013;
 return 90+12*Math.sin(z/132+phase)+7*Math.sin(z/47-phase*.7);
}
export function beachAt(x,z,seed=STARTER_SEED){
 const distance=x-coastlineX(z,seed),width=beachWidth(z,seed);
 // Dune-to-sand transition runs well inland. The last 15m nearest the
 // surf is full sand, fading to meadow and soil at the inland edge.
 const sand=distance<0?smooth((distance+width)/width):1;
 return {distance,width,sand,
  vegetationClear:distance>-(width+BEACH_TREE_BUFFER),
  flintZone:distance< -8&&distance>-(width-9)};
}
export function beachFlintSites(seed,cx,cz){
 const rng=seededRandom((seed^0x464c494e)>>>0,cx,cz);
 const result=[],target=(rng()<.60?1:0)+(rng()<.09?1:0);
 for(let i=0;i<15&&result.length<target;i++){
  const x=cx*CHUNK_SIZE+2+rng()*(CHUNK_SIZE-4);
  const z=cz*CHUNK_SIZE+2+rng()*(CHUNK_SIZE-4);
  const b=beachAt(x,z,seed);
  if(!b.flintZone||b.sand<.08)continue;
  // Mouths of rivers and their lake edges can cut across sandy beaches.
  // Spawn only on genuinely dry terrain, not in an overlapping waterway.
  if(waterAt(x,z,seed).depth>.025)continue;
  if(result.some(p=>Math.hypot(p.x-x,p.z-z)<7))continue;
  result.push({id:"flint:"+Math.round(x*100)+":"+Math.round(z*100),
   resource:"flint",label:"Beach Flint",shape:"flint",x,z});
 }
 return result;
}
