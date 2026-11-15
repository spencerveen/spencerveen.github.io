/**
 * Phase 7A.1: persistent, reciprocal resident relationships.
 *
 * Only actual nearby socializing actors produce conversation time. Shared
 * constructed Hut living adds a small yearly affinity bonus; communal camp
 * proximity alone never creates a relationship. No births or family links yet.
 */
export const FRIENDSHIP_AT=18;
export const CLOSE_FRIEND_AT=38;
export const PARTNERSHIP_AT=48;
export const PARTNERSHIP_SOCIAL_POINTS=32;
export const SOCIAL_SECONDS_PER_POINT=6;
export const SOCIAL_DISTANCE=5.5;
const MAX_RELATIONSHIPS=2000;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const safeYear=(value,fallback=-12000)=>
 Number.isFinite(value)&&Math.abs(value)<1e6?Math.trunc(value):fallback;
const number=(value,max)=>Number.isFinite(value)?clamp(value,0,max):0;
export function relationshipKey(a,b){
 if(typeof a!=="string"||typeof b!=="string"||!a||!b||a===b||
    a.includes("|")||b.includes("|"))return null;
 return a<b?a+"|"+b:b+"|"+a;
}
const aliveIds=(village,leaderId=null)=>
 new Set([...(village?.residents||[]).map(r=>r.id),...(leaderId?[leaderId]:[])]);
const rosterMap=(village)=>new Map((village?.residents||[]).map(r=>[r.id,r]));
const emptyRecord=(a,b)=>({a,b,affinity:0,socialPoints:0,talkSeconds:0,
 sharedYears:0,friendYear:null,partnerYear:null});
const socialRecord=(a,b,village)=>{
 const key=relationshipKey(a,b);
 if(!key)return null;
 village.relationships??={};
 const [first,second]=key.split("|");
 return village.relationships[key]??=emptyRecord(first,second);
};
const memory=(person,year,text)=>{
 if(!person)return;
 person.memories??=[];
 person.memories.push({year:safeYear(year),text});
 person.memories=person.memories.slice(-16);
};
const partnerOccupied=(village,id)=>Object.values(village.relationships||{}).some(
 r=>r.partnerYear!==null&&(r.a===id||r.b===id));
function milestones(village,record,year,events){
 const people=rosterMap(village),a=people.get(record.a),b=people.get(record.b);
 if(!a||!b)return;
 if(record.affinity>=FRIENDSHIP_AT&&record.friendYear===null){
  record.friendYear=safeYear(year);
  memory(a,year,"Became friends with "+b.name+".");
  memory(b,year,"Became friends with "+a.name+".");
  events.push(a.name+" and "+b.name+" became friends.");
 }
 if(record.partnerYear===null&&record.affinity>=PARTNERSHIP_AT&&
    record.socialPoints>=PARTNERSHIP_SOCIAL_POINTS&&a.age>=18&&b.age>=18&&
    !partnerOccupied(village,a.id)&&!partnerOccupied(village,b.id)){
  record.partnerYear=safeYear(year);
  memory(a,year,"Began a partnership with "+b.name+".");
  memory(b,year,"Began a partnership with "+a.name+".");
  events.push(a.name+" and "+b.name+" became partners.");
 }
}
/** Discard invalid, duplicate and departed people without inventing bonds. */
export function normalizeRelationships(raw,village,leaderId=null){
 const out={},live=aliveIds(village,leaderId),taken=new Set();
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return out;
 for(const [key,entry] of Object.entries(raw).sort(([a],[b])=>a.localeCompare(b))){
  if(Object.keys(out).length>=MAX_RELATIONSHIPS)break;
  if(!entry||typeof entry!=="object"||Array.isArray(entry))continue;
  const [a,b,...extra]=key.split("|");
  if(extra.length||relationshipKey(a,b)!==key||!live.has(a)||!live.has(b))continue;
  const record={
   a,b,
   affinity:Math.floor(number(entry.affinity,100)),
   socialPoints:Math.floor(number(entry.socialPoints,100000)),
   talkSeconds:number(entry.talkSeconds,SOCIAL_SECONDS_PER_POINT-.000001),
   sharedYears:Math.floor(number(entry.sharedYears,10000)),
   friendYear:entry.friendYear===null||entry.friendYear===undefined?null:safeYear(entry.friendYear),
   partnerYear:entry.partnerYear===null||entry.partnerYear===undefined?null:safeYear(entry.partnerYear)
  };
  if(record.affinity<FRIENDSHIP_AT)record.friendYear=null;
  if(record.partnerYear!==null){
   if(taken.has(a)||taken.has(b)||record.affinity<PARTNERSHIP_AT){
    record.partnerYear=null;
   }else{taken.add(a);taken.add(b)}
  }
  out[key]=record;
 }
 return out;
}
/** Compare only NPCs actively chatting and standing near each other. */
export function nearbySocialPairs(actors){
 const talking=(actors||[]).filter(p=>typeof p?.id==="string"&&
  p.work?.mode==="socializing"&&Number.isFinite(p.x)&&Number.isFinite(p.z));
 const pairs=[];
 for(let i=0;i<talking.length;i++)for(let j=i+1;j<talking.length;j++){
  const a=talking[i],b=talking[j];
  if(Math.hypot(a.x-b.x,a.z-b.z)<=SOCIAL_DISTANCE) {
   const key=relationshipKey(a.id,b.id);
   if(key)pairs.push(key.split("|"));
  }
 }
 return pairs.slice(0,MAX_RELATIONSHIPS);
}
/** Called on the single active game clock, never once per render frame. */
export function advanceSocialRelationships(village,pairs,seconds,year){
 const events=[],live=aliveIds(village),seen=new Set();
 const dt=clamp(Number(seconds)||0,0,5);
 let changed=false;
 if(!dt||!Array.isArray(pairs))return {changed,events};
 for(const pair of pairs.slice(0,MAX_RELATIONSHIPS)){
  if(!Array.isArray(pair)||pair.length!==2)continue;
  const key=relationshipKey(pair[0],pair[1]);
  if(!key||seen.has(key)||!live.has(pair[0])||!live.has(pair[1]))continue;
  seen.add(key);
  const record=socialRecord(pair[0],pair[1],village);
  record.talkSeconds+=dt;
  const points=Math.floor((record.talkSeconds+1e-9)/SOCIAL_SECONDS_PER_POINT);
  if(points){
   record.talkSeconds=Math.max(0,record.talkSeconds-points*SOCIAL_SECONDS_PER_POINT);
   record.socialPoints+=points;
   record.affinity=Math.min(100,record.affinity+points);
   milestones(village,record,year,events);
  }
  changed=true;
 }
 return {changed,events};
}
/** A modest once-per-year bonus for living together in actual built Huts. */
export function advanceHouseholdRelationships(village,year){
 const events=[],groups=new Map();
 for(const p of village?.residents||[]){
  if(!p.homeId||p.homeId==="camp")continue;
  if(!groups.has(p.homeId))groups.set(p.homeId,[]);
  groups.get(p.homeId).push(p);
 }
 for(const occupants of groups.values())for(let i=0;i<occupants.length;i++)
  for(let j=i+1;j<occupants.length;j++){
   const record=socialRecord(occupants[i].id,occupants[j].id,village);
   record.sharedYears++;
   record.affinity=Math.min(100,record.affinity+1);
   milestones(village,record,year,events);
  }
 return events;
}
/** Keep existing leader's bonds through succession; mourn removed partners. */
export function pruneRelationships(village,year,leaderId=null,extraNames={}){
 const live=aliveIds(village,leaderId);
 const names=new Map([...(village?.residents||[]).map(p=>[p.id,p.name]),
  ...(village?.deceased||[]).map(p=>[p.id,p.name]),
  ...Object.entries(extraNames)]);
 const people=rosterMap(village);
 for(const [key,rel] of Object.entries(village?.relationships||{})){
  if(live.has(rel.a)&&live.has(rel.b))continue;
  if(rel.partnerYear!==null){
   const survivor=people.get(live.has(rel.a)?rel.a:rel.b);
   const lost=live.has(rel.a)?rel.b:rel.a;
   if(survivor)memory(survivor,year,"Mourned the loss of partner "+(names.get(lost)||"a loved one")+".");
  }
  delete village.relationships[key];
 }
}
export function residentRelationships(village,id,hero=null){
 const people=rosterMap(village);
 if(hero?.sourceResidentId)people.set(hero.sourceResidentId,{
  id:hero.sourceResidentId,name:hero.name,age:hero.age,isLeader:true});
 const items=[];
 for(const record of Object.values(village?.relationships||{})){
  const otherId=record.a===id?record.b:record.b===id?record.a:null;
  const other=people.get(otherId);
  if(!other)continue;
  const stage=record.partnerYear!==null?"Partner":
   record.affinity>=CLOSE_FRIEND_AT?"Close friend":
   record.affinity>=FRIENDSHIP_AT?"Friend":"Acquaintance";
  items.push({id:other.id,name:other.name,isLeader:!!other.isLeader,
   affinity:record.affinity,stage,sharedYears:record.sharedYears,
   socialPoints:record.socialPoints,partnerYear:record.partnerYear});
 }
 return items.sort((a,b)=>Number(b.stage==="Partner")-Number(a.stage==="Partner")||
  b.affinity-a.affinity||a.name.localeCompare(b.name));
}
export function relationshipSummary(village){
 const rels=Object.values(village?.relationships||{});
 return {friendships:rels.filter(r=>r.affinity>=FRIENDSHIP_AT).length,
  partnerships:rels.filter(r=>r.partnerYear!==null).length};
}
