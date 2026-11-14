/**
 * Sparse collectable flint flakes on rocky mountain foothills and highlands.
 * Like beach flint, spawns are deterministic per world seed and chunk.
 * Terrain and water samplers come from the active chunk manager so historic
 * settlement protections and valley carve-outs are respected.
 */
import {CHUNK_SIZE,seededRandom} from "./forest-generation.js?v=20261114view2";
import {mountainAt} from "./mountain-generation.js?v=20261114watershed3";
import {beachAt} from "./beach-generation.js?v=20261114beaches1";

export function mountainFlintSites(seed,cx,cz,waterAt,protectedSites=[],occupied=[]){
 const rng=seededRandom(((seed>>>0)^0x4d464c54)>>>0,cx,cz);
 const result=[],target=(rng()<.68?1:0)+(rng()<.16?1:0);
 for(let trial=0;trial<28&&result.length<target;trial++){
  const x=cx*CHUNK_SIZE+2+rng()*(CHUNK_SIZE-4);
  const z=cz*CHUNK_SIZE+2+rng()*(CHUNK_SIZE-4);
  // Keep the coastal flint habitat separate from mountain scree.
  if(beachAt(x,z,seed).vegetationClear)continue;
  const water=waterAt(x,z);
  if(!water||water.depth>.025)continue;
  // Rocky foothills count, not just summit peaks. Mountain uplift already
  // includes river-valley and preserved-settlement protections.
  const uplift=mountainAt(x,z,seed,protectedSites,water.corridorDistance).uplift;
  if(uplift<4.5)continue;
  if(occupied.some(p=>Math.hypot(p.x-x,p.z-z)<3))continue;
  if(result.some(p=>Math.hypot(p.x-x,p.z-z)<6))continue;
  result.push({id:"flint:"+Math.round(x*100)+":"+Math.round(z*100),
   resource:"flint",label:"Mountain Flint",shape:"flint",habitat:"mountain",x,z});
 }
 return result;
}
