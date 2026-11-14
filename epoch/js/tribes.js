/**
 * Deterministic independent wilderness tribes, version 1.
 * Definitions are derived from the world seed, not serialized into saves.
 * Only discoveries and later outcomes need persistent records.
 */
import {CHUNK_SIZE,seededRandom,terrainHeight,chunkKey} from "./forest-generation.js?v=20261113k";
import {waterAt} from "./water-generation.js?v=20261114ecology2";
import {mountainAt} from "./mountain-generation.js?v=20261114valleys1";

export const TRIBE_CLEARING_RADIUS=9.5;
export const TRIBE_MIN_SPACING=132;
export const TRIBE_TERRITORY_CHUNKS=5;
export const TRIBE_SITE_BUFFER=15;
export const TRIBE_DISCOVERY_RANGE=20;
export const TRIBE_INTERACT_RANGE=5.5;
export const TRIBE_STATUSES=Object.freeze(["active","relocated","razed"]);
export const TRIBE_TRUST_GOAL=100;
export const TRIBE_AID_TRUST=35;
// These first requests intentionally fit a ten-slot backpack and use carried
// materials only: you must bring the actual supplies to the tribal leader.
export const TRIBE_AID_REQUESTS=Object.freeze([
 Object.freeze({name:"Share wild food",description:"The camp needs berries to feed its people.",cost:Object.freeze({berries:8})}),
 Object.freeze({name:"Help repair shelters",description:"The tribe needs timber to reinforce its huts.",cost:Object.freeze({wood:8})}),
 Object.freeze({name:"Supply their toolmaker",description:"Bring stone and berries for their tools and meals.",cost:Object.freeze({stone:5,berries:4})})
]);
export function tribeBaseTrust(tribe){
 return tribe?.disposition==="peaceful"?20:tribe?.disposition==="neutral"?10:0;
}
export function tribeTrust(tribe,record){
 const score=Number(record?.trust);
 return Math.max(0,Math.min(TRIBE_TRUST_GOAL,Number.isFinite(score)&&record?.trust!==null?score:tribeBaseTrust(tribe)));
}
export function tribeAidRequest(tribe,record){
 const completed=Math.max(0,Math.min(TRIBE_AID_REQUESTS.length,Number(record?.completed)||0));
 if(completed===TRIBE_AID_REQUESTS.length)return null;
 const shift=(((((tribe?.cx||0)*11+(tribe?.cz||0)*7)%TRIBE_AID_REQUESTS.length)+TRIBE_AID_REQUESTS.length)%TRIBE_AID_REQUESTS.length);
 return TRIBE_AID_REQUESTS[(completed+shift)%TRIBE_AID_REQUESTS.length];
}

const FIRST=["Ash","Dawn","Briar","Moss","Red","Stone","Wolf","Mist","Fern","River","Oak","Amber","Pine","Frost","Willow","Flint"];
const LAST=["wood","fell","brook","vale","thorn","ridge","haven","water","clan","heart","bough","crest"];
const NAMES=["Eira","Toran","Bren","Kira","Sela","Mara","Darin","Nessa","Oren","Kellan","Lina","Runa","Cai","Tala","Elowen","Roran","Asha","Fenn","Tavia","Halen","Yara","Borin"];
const DISPOSITIONS=["peaceful","neutral","territorial"];
const STARTER_RING=Object.freeze([[2,0],[-3,0],[0,2],[0,-3],[2,1],[-3,-1],[1,-3],[-1,2]]);

function legacyStarterTribeChunk(seed){
 const rand=seededRandom((seed^0x436c616e)>>>0,0,0);
 return STARTER_RING[Math.floor(rand()*STARTER_RING.length)];
}

export function legacyTribeAtChunk(seed,cx,cz){
 seed=Number(seed)>>>0;
 if(!Number.isInteger(cx)||!Number.isInteger(cz))return null;
 const [sx,sz]=legacyStarterTribeChunk(seed);
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
 return {id,cx,cz,x,z,name,disposition,members,population:count,starter,placementVersion:1};
}

// Territory centers sit 160m apart, with candidates confined to the
// central 16m of each 32m chunk, creating >=144m separation between cells.
const territoryChunk=(cx,cz)=>((cx%5+5)%5===2)&&((cz%5+5)%5===2);
const siteCache=new Map(),starterCache=new Map();
function safeSite(seed,cx,cz){
 const key=seed+":"+cx+":"+cz;
 if(siteCache.has(key))return siteCache.get(key);
 const rand=seededRandom((seed^0x53495445)>>>0,cx,cz);
 let chosen=null;
 for(let n=0;n<7&&!chosen;n++){
  const x=cx*CHUNK_SIZE+8+rand()*16,z=cz*CHUNK_SIZE+8+rand()*16;
  if(Math.hypot(x+3,z+2)<52)continue;
  let baseline=0,valid=true;
  for(const radius of [0,10,TRIBE_SITE_BUFFER]){
   for(let i=0;i<(radius?8:1);i++){
    const a=i*Math.PI/4,px=x+Math.cos(a)*radius,pz=z+Math.sin(a)*radius;
    const water=waterAt(px,pz,seed);
    if(water.depth>.025||water.kind==="ocean"||
      mountainAt(px,pz,seed,[],water.corridorDistance).uplift>5.5){valid=false;break}
    const height=water.surfaceY-.055;
    if(radius===0)baseline=height;
    else if(Math.abs(height-baseline)>1.9){valid=false;break}
   }
   if(!valid)break;
  }
  if(valid)chosen={x,z};
 }
 if(siteCache.size>1500)siteCache.clear();
 siteCache.set(key,chosen);
 return chosen;
}
export function starterTribeChunk(seed){
 seed=Number(seed)>>>0;
 if(starterCache.has(seed))return starterCache.get(seed);
 const rand=seededRandom((seed^0x436c616e)>>>0,0,0);
 const index=Math.floor(rand()*STARTER_RING.length);
 const candidates=[...STARTER_RING.slice(index),...STARTER_RING.slice(0,index)];
 for(let radius=2;radius<=5;radius++)
  for(let x=-radius;x<=radius;x++)for(let z=-radius;z<=radius;z++)
   if(Math.max(Math.abs(x),Math.abs(z))===radius)candidates.push([x,z]);
 const found=candidates.find(([cx,cz])=>safeSite(seed,cx,cz));
 // The scan covers hundreds of locations; keep the old starter as an
 // extreme fallback for an unusual seed with no suitable nearby land.
 const result=found||legacyStarterTribeChunk(seed);
 if(starterCache.size>64)starterCache.clear();
 starterCache.set(seed,result);
 return result;
}
export function tribeAtChunk(seed,cx,cz,retainLegacy=false){
 seed=Number(seed)>>>0;
 if(!Number.isInteger(cx)||!Number.isInteger(cz))return null;
 if(retainLegacy)return legacyTribeAtChunk(seed,cx,cz);
 const [sx,sz]=starterTribeChunk(seed),starter=cx===sx&&cz===sz;
 if(!starter&&!territoryChunk(cx,cz))return null;
 const site=safeSite(seed,cx,cz);
 if(!site)return null;
 if(!starter){
  const first=safeSite(seed,sx,sz);
  if(first&&Math.hypot(site.x-first.x,site.z-first.z)<TRIBE_MIN_SPACING)return null;
 }
 const rand=seededRandom((seed^0x6b1d8a53)>>>0,cx,cz);
 const {x,z}=site,id="tribe:"+chunkKey(cx,cz);
 const name=FIRST[Math.floor(rand()*FIRST.length)]+LAST[Math.floor(rand()*LAST.length)]+" Tribe";
 const disposition=DISPOSITIONS[Math.floor(rand()*DISPOSITIONS.length)];
 const count=2+Math.floor(rand()*4);
 const members=Array.from({length:count},(_,i)=>{
  const sex=rand()<.5?"female":"male";
  const person=NAMES[Math.floor(rand()*NAMES.length)];
  const a=i*Math.PI*2/count+.65;
  const d=i===0?2.1:3.4+(i%2)*.7;
  return {id:id+":member:"+i,name:person,sex,age:18+Math.floor(rand()*38),
    role:i===0?"leader":"resident",x:x+Math.cos(a)*d,z:z+Math.sin(a)*d};
 });
 return {id,cx,cz,x,z,name,disposition,members,population:count,starter,placementVersion:2};
}

export function normalizeTribeRecords(raw){
 const result={};
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return result;
 for(const [id,record] of Object.entries(raw)){
  if(!/^tribe:-?\d+,-?\d+$/.test(id)||!record||typeof record!=="object"||Array.isArray(record))continue;
  const status=TRIBE_STATUSES.includes(record.status)?record.status:"active";
  const discovered=record.discovered===true;
  const year=Number(record.discoveredYear);
  const trust=record.trust===null||record.trust===undefined?null:Number(record.trust);
  const completed=Number(record.completed);
  result[id]={status,discovered,discoveredYear:discovered&&Number.isInteger(year)?year:null,
   trust:trust===null||!Number.isFinite(trust)?null:Math.max(0,Math.min(100,Math.floor(trust))),
   completed:Number.isInteger(completed)?Math.max(0,Math.min(TRIBE_AID_REQUESTS.length,completed)):0,
   placementVersion:record.placementVersion===2?2:1};
 }
 return result;
}

export function tribeCampIsActive(tribe,records,stockpile=null){
 if(!tribe||records?.[tribe.id]?.status==="relocated"||records?.[tribe.id]?.status==="razed")return false;
 // Founding a village near a procedural camp must never overlap structures.
 if(stockpile&&Math.hypot(tribe.x-stockpile.x,tribe.z-stockpile.z)<36)return false;
 return true;
}
