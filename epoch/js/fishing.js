/**
 * Phase 5D. Deterministic fish habitats generated from the actual water
 * surface, so rivers, lakes and coastal shallows all host fish, never land.
 * Catch records are sparse and saved: unfished waters need no saved entries.
 */
import {CHUNK_SIZE,seededRandom,chunkKey} from "./forest-generation.js?v=20261114fish1";
export const FISHING_VERSION=1;
export const FISH_SPEAR_REACH=3.0;
export const FISH_STAMINA_COST=8;
export const FISH_CATCH_AMOUNT=1;
export const FISH_SPOTS_PER_CHUNK=2;
export function fishHabitat(sample){
 if(!sample||!["river","lake","ocean"].includes(sample.kind))return false;
 if(!Number.isFinite(sample.depth)||sample.depth<.24||sample.depth>2.15)return false;
 // The deep sea has no spear-fishing sites; its coastline does.
 if(sample.kind==="ocean"&&(sample.shore>45||sample.depth>1.65))return false;
 return true;
}
export function fishSites(seed,cx,cz,sampleAt){
 if(!Number.isInteger(cx)||!Number.isInteger(cz)||typeof sampleAt!=="function")return [];
 const rand=seededRandom((seed>>>0)^0x1f157a19,cx,cz);
 const sites=[];
 const used=[];
 for(let attempt=0;attempt<40&&sites.length<FISH_SPOTS_PER_CHUNK;attempt++){
  const x=cx*CHUNK_SIZE+1.5+rand()*(CHUNK_SIZE-3);
  const z=cz*CHUNK_SIZE+1.5+rand()*(CHUNK_SIZE-3);
  const water=sampleAt(x,z);
  if(!fishHabitat(water))continue;
  if(used.some(p=>Math.hypot(p.x-x,p.z-z)<7.5))continue;
  const site={id:"fish:"+chunkKey(cx,cz)+":"+sites.length,
   x,z,kind:water.kind,surfaceY:water.surfaceY,depth:water.depth};
  sites.push(site);used.push(site);
 }
 return sites;
}
export function normalizeFishCatches(raw){
 const out={};
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return out;
 for(const [id,v] of Object.entries(raw).slice(0,15000))
  if(/^fish:-?\d+,-?\d+:\d+$/.test(id)&&v===true)out[id]=true;
 return out;
}
