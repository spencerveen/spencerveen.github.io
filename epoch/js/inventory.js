/**
 * Epoch's first physical inventory: exactly ten unexpanded pack slots.
 * Items (including wood, stone, berries and vines) stack to 12 PER SLOT.
 * This module is UI-free and keeps inventory deterministic and saveable.
 */
export const INVENTORY_SLOTS=10;
export const STACK_LIMIT=12;
export const ITEMS=Object.freeze({
 wood:{name:"Wood",icon:"🪵",description:"Gathered from forest trees."},
 stone:{name:"Stone",icon:"🪨",description:"Gathered from rocky deposits."},
 berries:{name:"Wild Berries",icon:"🫐",description:"Foraged from berry bushes. Counts as food for early recipes and research."},
 vines:{name:"Vines",icon:"🌿",description:"Gathered from trees and berry bushes. Useful for future tools and shelters."}
});
export const ITEM_IDS=Object.freeze(Object.keys(ITEMS));
export function canonicalItem(id){return id==="food"?"berries":id}
export function emptyInventory(){return Array.from({length:INVENTORY_SLOTS},()=>null)}
export function emptyUnpacked(){return Object.fromEntries(ITEM_IDS.map(id=>[id,0]))}
const sane=n=>Number.isFinite(Number(n))?Math.max(0,Math.floor(Number(n))):0;
export function normalizeInventory(raw){
 const slots=emptyInventory();
 if(!Array.isArray(raw))return slots;
 for(let i=0;i<INVENTORY_SLOTS;i++){
  const item=raw[i];if(!item)continue;
  const id=canonicalItem(item.id);
  const qty=sane(item.qty);
  if(ITEMS[id]&&qty>0)slots[i]={id,qty:Math.min(STACK_LIMIT,qty)};
 }
 return slots;
}
export function countItem(slots,id){
 id=canonicalItem(id);
 return (slots||[]).reduce((sum,s)=>sum+(s?.id===id?s.qty:0),0);
}
export function occupiedSlots(slots){return (slots||[]).filter(Boolean).length}
export function freeSlots(slots){return INVENTORY_SLOTS-occupiedSlots(slots)}
export function addItems(slots,id,amount){
 id=canonicalItem(id);
 if(!ITEMS[id])return 0;
 let left=sane(amount);
 if(!left)return 0;
 for(const slot of slots){
  if(slot?.id!==id||slot.qty>=STACK_LIMIT)continue;
  const move=Math.min(STACK_LIMIT-slot.qty,left);
  slot.qty+=move;left-=move;
  if(!left)return sane(amount);
 }
 for(let i=0;i<INVENTORY_SLOTS&&left;i++){
  if(slots[i])continue;
  const move=Math.min(STACK_LIMIT,left);
  slots[i]={id,qty:move};left-=move;
 }
 return sane(amount)-left;
}
export function removeItems(slots,id,amount){
 id=canonicalItem(id);const total=sane(amount);
 if(!ITEMS[id]||countItem(slots,id)<total)return false;
 // Consume partial stacks first, then full stacks; keeps the pack compact.
 const indices=slots.map((s,i)=>({s,i})).filter(x=>x.s?.id===id)
   .sort((a,b)=>a.s.qty-b.s.qty||a.i-b.i);
 let left=total;
 for(const {i} of indices){
  if(!left)break;
  const move=Math.min(left,slots[i].qty);
  slots[i].qty-=move;left-=move;
  if(slots[i].qty===0)slots[i]=null;
 }
 return true;
}
export function resourceTotals(slots){
 return {wood:countItem(slots,"wood"),stone:countItem(slots,"stone"),
  food:countItem(slots,"berries"),vines:countItem(slots,"vines")};
}
export function migrateResources(legacy){
 const slots=emptyInventory(),unpacked=emptyUnpacked();
 for(const id of ITEM_IDS){
  const legacyKey=id==="berries"?"food":id;
  const amount=sane((legacy?.[legacyKey]||0)+(id==="berries"?(legacy?.berries||0):0));
  const placed=addItems(slots,id,amount);
  unpacked[id]=amount-placed;
 }
 return {slots,unpacked};
}
export function normalizeUnpacked(raw){
 const unpacked=emptyUnpacked();
 for(const id of ITEM_IDS)unpacked[id]=sane(raw?.[id]);
 return unpacked;
}
export function unpackedCount(unpacked){
 return ITEM_IDS.reduce((total,id)=>total+sane(unpacked?.[id]),0);
}
export function retrieveUnpacked(slots,unpacked){
 let recovered=0;
 for(const id of ITEM_IDS){
  const amount=sane(unpacked[id]),moved=addItems(slots,id,amount);
  unpacked[id]=amount-moved;
  recovered+=moved;
 }
 return recovered;
}
