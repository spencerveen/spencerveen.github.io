// Each village member is a saved person, not just a population counter.
// The founder remains in hero/lineage and is not duplicated in this roster.
const LEGACY=[
 ["Tala","female"],["Bren","male"],["Kira","female"],["Oren","male"]
];
export function legacyResidents(count){
 const n=Math.max(0,Math.min(60,Math.floor(Number(count)||0)));
 return Array.from({length:n},(_,i)=>({
  id:"legacy:resident:"+i,
  name:LEGACY[i]?.[0]||"Settler "+(i+2),
  sex:LEGACY[i]?.[1]||(i%2?"male":"female"),
  age:24+i%18,originTribeId:null,recruitment:"legacy",joinedYear:-12000
 }));
}
export function normalizeResidents(raw,max=100){
 if(!Array.isArray(raw))return [];
 const used=new Set(),result=[];
 for(const resident of raw){
  if(!resident||typeof resident!=="object"||Array.isArray(resident))continue;
  const id=String(resident.id||"");
  if(!/^(legacy:resident:\d+|tribe:-?\d+,-?\d+:member:\d+)$/.test(id)||used.has(id))continue;
  const name=String(resident.name||"").trim().slice(0,60);
  if(!name)continue;
  used.add(id);
  const age=Number(resident.age),year=Number(resident.joinedYear);
  result.push({
   id,name,sex:resident.sex==="female"?"female":"male",
   age:Number.isFinite(age)?Math.max(1,Math.min(120,Math.floor(age))):25,
   originTribeId:id.startsWith("tribe:")?id.slice(0,id.indexOf(":member:")):null,
   recruitment:resident.recruitment==="peaceful"?"peaceful":"legacy",
   joinedYear:Number.isFinite(year)?Math.floor(year):-12000
  });
  if(result.length>=Math.max(0,max))break;
 }
 return result;
}
