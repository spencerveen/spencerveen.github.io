/**
 * Epoch's browser-local save slot directory.
 * Preserve epoch.stoneage.v1 as a read-only migration source. Never silently
 * overwrite existing progress, and never share data between slots.
 */
export const MAX_SAVE_SLOTS=3;
export const LEGACY_KEY="epoch.stoneage.v1";
export const MIGRATION_KEY="epoch.stoneage.legacy.migrated";
export function saveSlotKey(slot){
 if(!Number.isInteger(slot)||slot<1||slot>MAX_SAVE_SLOTS)
  throw new RangeError("Save slot must be between 1 and "+MAX_SAVE_SLOTS);
 return "epoch.stoneage.slot."+slot;
}
export function readSlot(slot){
 const key=saveSlotKey(slot);
 try{
  const raw=localStorage.getItem(key);
  if(!raw)return null;
  const data=JSON.parse(raw);
  return data?.version===1&&data?.hero&&typeof data.hero==="object"?data:null;
 }catch{return null}
}
export function saveSummary(slot){
 const data=readSlot(slot);
 if(!data)return {slot,empty:true};
 const lastSavedAt=Number.isFinite(data.lastSavedAt)?data.lastSavedAt:null;
 return {slot,empty:false,hero:typeof data.hero.name==="string"?data.hero.name:"Unnamed",
  generation:Number(data.generation)||1,year:Number(data.year)||-12000,
  lastSavedAt,worldSeed:data.worldSeed??null,
  ended:data.survival?.gameOver===true,
  houses:Object.keys(data.village?.plots||{}).length};
}
export function allSaveSummaries(){
 return Array.from({length:MAX_SAVE_SLOTS},(_,i)=>saveSummary(i+1));
}
export function mostRecentSave(){
 const saves=allSaveSummaries().filter(s=>!s.empty);
 saves.sort((a,b)=>(b.lastSavedAt||0)-(a.lastSavedAt||0)||a.slot-b.slot);
 return saves[0]||null;
}
export function removeSlot(slot){
 try{localStorage.removeItem(saveSlotKey(slot));return true}
 catch{return false}
}
export function migrateLegacySave(){
 // Even if a slot gets erased later, old progress should not resurrect.
 try{
  if(localStorage.getItem(MIGRATION_KEY))return false;
  const original=localStorage.getItem(LEGACY_KEY);
  if(!original){localStorage.setItem(MIGRATION_KEY,"no-legacy");return false}
  const data=JSON.parse(original);
  if(data?.version!==1||!data.hero){
   localStorage.setItem(MIGRATION_KEY,"invalid");return false;
  }
  if(!localStorage.getItem(saveSlotKey(1))){
   const migrated={...data,lastSavedAt:Date.now()};
   localStorage.setItem(saveSlotKey(1),JSON.stringify(migrated));
  }
  localStorage.setItem(MIGRATION_KEY,"imported");
  return true;
 }catch(error){
  console.warn("Epoch legacy save import unavailable",error);
  return false;
 }
}
