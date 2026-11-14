/**
 * Deterministic independent wilderness tribes, version 1.
 * Definitions are derived from the world seed, not serialized into saves.
 * Only discoveries and later outcomes need persistent records.
 */
import {CHUNK_SIZE,seededRandom,terrainHeight,chunkKey} from "./forest-generation.js?v=20261113k";

export const TRIBE_CLEARING_RADIUS=9.5;
export const TRIBE_DISCOVERY_RANGE=20;
export const TRIBE_INTERACT_RANGE=5.5;
export const TRIBE_STATUSES=Object.freeze(["active","relocated","razed"]);
const FIRST=["Ash","Dawn","Briar","Moss","Red","Stone","Wolf","Mist","Fern","River","Oak","Amber","Pine","Frost","Willow","Flint"];
const LAST=["wood","fell","brook","vale","thorn","ridge","haven","water","clan","heart","bough","crest"];
const NAMES=["Eira","Toran","Bren","Kira","Sela","Mara","Darin","Nessa","Oren","Kellan","Lina","Runa","Cai","Tala","Elowen","Roran","Asha","Fenn","Tavia","Halen","Yara","Borin"];
const DISPOSITIONS=["peaceful","neutral","territorial"];
const STARTER_RING=Object.freeze([[2,0],[-3,0],[0,2],[0,-3],[2,1],[-3,-1],[1,-3],[-1,2]]);

export function starterTribeChunk(seed){
 const rand=seededRandom((seed^0x436c616e)>>>0,0,0);
 return STARTER_RING[Math.floor(rand()*STARTER_RING.length)];
}

export function tribeAtChunk(seed,cx,cz){
 seed=Number(seed)>>>0;
 if(!Number.isInteger(cx)||!Number.isInteger(cz))return null;
 const [sx,sz]=starterTribeChunk(seed);
 const starter=cx===sx&&cz===sz;
 const rand=seededRandom((seed^0x6b1d8a53)>>>0,cx,cz);
 // Keep the opening forest free of NPC camps. One nearby tribe is guaranteed;
 // elsewhere tribes are scattered, not present in every other chunk.
 if(!starter && (Math.hypot((cx+.5)*CHUNK_SIZE,(cz+.5)*CHUNK_SIZE)<82||rand()>.12))return null;
 const x=cx*CHUNK_SIZE+8+rand()*16;
 const z=cz*CHUNK_SIZE+8+rand()*16;
 if(Math.hypot(x,z)<48)return null;
 // Favor level sites for recognizable shelters and a navigable clearing.
 const ground=terrainHeight(x,z,seed);
 const slope=Math.max(...[[6,0],[-6,0],[0,6],[0,-6]].map(([dx,dz])=>Math.abs(terrainHeight(x+dx,z+dz,seed)-ground)));
 if(!starter&&slope>1.5)return null;
 const id="tribe:"+chunkKey(cx,cz);
 const name=FIRST[Math.floor(rand()*FIRST.length)]+LAST[Math.floor(rand()*LAST.length)]+" Tribe";
 const disposition=DISPOSITIONS[Math.floor(rand()*DISPOSITIONS.length)];
 const count=2+Math.floor(rand()*4);
 const members=Array.from({length:count},(_,i)=>{
  const sex=rand()<.5?"female":"male";
  const person=NAMES[Math.floor(rand()*NAMES.length)];
  const angle=i*Math.PI*2/count+.65;
  const distance=i===0?2.1:3.4+(i%2)*.7;
  return {id:id+":member:"+i,name:person,sex,age:18+Math.floor(rand()*38),
   role:i===0?"leader":"resident",x:x+Math.cos(angle)*distance,z:z+Math.sin(angle)*distance};
 });
 return {id,cx,cz,x,z,name,disposition,members,population:count,starter};
}

export function normalizeTribeRecords(raw){
 const result={};
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return result;
 for(const [id,record] of Object.entries(raw)){
  if(!/^tribe:-?\d+,-?\d+$/.test(id)||!record||typeof record!=="object"||Array.isArray(record))continue;
  const status=TRIBE_STATUSES.includes(record.status)?record.status:"active";
  const discovered=record.discovered===true;
  const year=Number(record.discoveredYear);
  result[id]={status,discovered,discoveredYear:discovered&&Number.isInteger(year)?year:null};
 }
 return result;
}

export function tribeCampIsActive(tribe,records,stockpile=null){
 if(!tribe||records?.[tribe.id]?.status==="relocated"||records?.[tribe.id]?.status==="razed")return false;
 // Founding a village near a procedural camp must never overlap structures.
 if(stockpile&&Math.hypot(tribe.x-stockpile.x,tribe.z-stockpile.z)<36)return false;
 return true;
}
