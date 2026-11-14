/**
 * Persisted village resident identities, home assignments and life events.
 * Relationships in Phase 3 are factual shared histories, not invented kinship.
 */
import {BUILDINGS,VILLAGE_START_CAPACITY} from "./settlement.js?v=20261114u";

export const NATURAL_DEATH_AGE=100;
export const DECEASED_HISTORY_LIMIT=100;
export const CAMP_HOME="camp";
export const CAMP_RESIDENT_BEDS=VILLAGE_START_CAPACITY-1; // Founder uses one of five camp places.
const LEGACY=[["Tala","female"],["Bren","male"],["Kira","female"],["Oren","male"]];
const VALID_ID=/^(legacy:resident:\d+|tribe:-?\d+,-?\d+:member:\d+)$/;
const text=(value,max)=>String(value??"").trim().slice(0,max);
const safeYear=(value,fallback=-12000)=>{
 const n=Number(value);
 return Number.isFinite(n)&&Math.abs(n)<1000000?Math.trunc(n):fallback;
};
export function legacyResidents(count){
 const n=Math.max(0,Math.min(60,Math.floor(Number(count)||0)));
 return Array.from({length:n},(_,i)=>({
  id:"legacy:resident:"+i,
  name:LEGACY[i]?.[0]||"Settler "+(i+2),
  sex:LEGACY[i]?.[1]||(i%2?"male":"female"),
  age:24+i%18,originTribeId:null,recruitment:"legacy",role:"resident",
  joinedYear:-12000,homeId:null,memories:[]
 }));
}
export function normalizeResidents(raw,max=100){
 if(!Array.isArray(raw))return [];
 const used=new Set(),result=[];
 for(const resident of raw){
  if(!resident||typeof resident!=="object"||Array.isArray(resident))continue;
  const id=text(resident.id,110);
  if(!VALID_ID.test(id)||used.has(id))continue;
  const name=text(resident.name,60);
  if(!name)continue;
  used.add(id);
  const age=Number(resident.age),year=safeYear(resident.joinedYear);
  const fromTribe=id.startsWith("tribe:");
  const recruitment=fromTribe?"peaceful":"legacy";
  const memories=Array.isArray(resident.memories)?resident.memories.filter(m=>m&&typeof m==="object"&&!Array.isArray(m)).slice(-16)
    .map(m=>({year:safeYear(m.year,year),text:text(m.text,180)})).filter(m=>m.text):[];
  const rememberedHome=resident.homeId===CAMP_HOME?CAMP_HOME:
   typeof resident.homeId==="string"&&resident.homeId.length<=70?resident.homeId:null;
  result.push({
   id,name,sex:resident.sex==="female"?"female":"male",
   age:Number.isFinite(age)?Math.max(1,Math.min(120,Math.floor(age))):25,
   originTribeId:fromTribe?id.slice(0,id.indexOf(":member:")):null,
   originTribeName:fromTribe?text(resident.originTribeName,80):"",
   recruitment,role:fromTribe&&(resident.role==="leader"||id.endsWith(":member:0"))?"formerLeader":"resident",
   joinedYear:year,homeId:rememberedHome,memories
  });
  if(result.length>=Math.max(0,max))break;
 }
 return result;
}
export function housingUnits(village){
 const homes=[{id:CAMP_HOME,label:"Communal camp",capacity:CAMP_RESIDENT_BEDS}];
 let index=0;
 for(const building of village?.buildings||[]){
  if(building.kind!=="family")continue;
  index++;
  homes.push({id:building.id,label:"Hut "+index,capacity:BUILDINGS.family.capacity,
   x:building.x,z:building.z});
 }
 const residents=village?.residents||[];
 return homes.map(home=>({...home,occupied:residents.filter(r=>r.homeId===home.id).length}));
}
export function normalizeHomes(village){
 // Keep valid saved assignments first, then put unassigned or displaced people
 // into an available household. Arrival order is stable through every reload.
 const units=housingUnits({...village,residents:[]}),available=new Map(units.map(u=>[u.id,u.capacity]));
 const waiting=[];
 for(const person of village.residents||[]){
  if(person.homeId&&available.get(person.homeId)>0){
   available.set(person.homeId,available.get(person.homeId)-1);
  }else{person.homeId=null;waiting.push(person)}
 }
 for(const person of waiting){
  const unit=units.find(u=>available.get(u.id)>0);
  if(!unit)throw Error("Village capacity is smaller than its resident roster");
  person.homeId=unit.id;available.set(unit.id,available.get(unit.id)-1);
 }
}
export function moveResidentHome(village,id,newHomeId,year){
 const resident=(village?.residents||[]).find(r=>r.id===id);
 if(!resident||resident.homeId===newHomeId)return false;
 const unit=housingUnits(village).find(u=>u.id===newHomeId);
 if(!unit||unit.occupied>=unit.capacity)return false;
 const old=resident.homeId;
 resident.homeId=newHomeId;
 const oldName=housingUnits(village).find(u=>u.id===old)?.label||"Communal camp";
 const note="Moved from "+oldName+" to "+unit.label+".";
 resident.memories.push({year:safeYear(year),text:note});
 resident.memories=resident.memories.slice(-16);
 return true;
}
export function residentConnections(village,id){
 const person=(village?.residents||[]).find(r=>r.id===id);
 if(!person)return {clanmates:[],housemates:[]};
 const others=village.residents.filter(r=>r.id!==id);
 return {
  clanmates:person.originTribeId?others.filter(r=>r.originTribeId===person.originTribeId):[],
  housemates:others.filter(r=>r.homeId===person.homeId)
 };
}

/** Persist a bounded memorial without keeping deceased people in live housing. */
export function normalizeDeceasedResidents(raw){
 if(!Array.isArray(raw))return [];
 const seen=new Set(),result=[];
 for(const record of raw.slice(-DECEASED_HISTORY_LIMIT)){
  if(!record||typeof record!=="object"||Array.isArray(record))continue;
  const id=text(record.id,110),name=text(record.name,60);
  if(!VALID_ID.test(id)||!name||seen.has(id))continue;
  seen.add(id);
  result.push({id,name,age:NATURAL_DEATH_AGE,
   year:safeYear(record.year),cause:"old age"});
 }
 return result;
}
/** Advance everyone on the same calendar, vacating beds at their 100th year. */
export function ageVillageResidents(village,years,year){
 if(!village||!Array.isArray(village.residents)||!Number.isSafeInteger(years)||years<0)return [];
 const deceased=[],living=[];
 for(const person of village.residents){
  person.age=Math.max(1,Math.floor(person.age)+years);
  if(person.age>=NATURAL_DEATH_AGE){
   deceased.push({id:person.id,name:person.name,age:NATURAL_DEATH_AGE,
    year:safeYear(year),cause:"old age"});
  }else living.push(person);
 }
 village.residents=living;
 village.deceased=normalizeDeceasedResidents([...(village.deceased||[]),...deceased]);
 return deceased;
}
