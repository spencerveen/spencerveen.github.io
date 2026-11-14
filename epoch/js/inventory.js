/**
 * Shared Stone Age item catalog and ten-slot carried inventory.
 * In Phase 4B.1 only existing wood/stone/berries/vines have world sources.
 * New material drops, weapon crafting and combat are later phases.
 */
export const INVENTORY_SLOTS=10;
export const STACK_LIMIT=12;
export const ITEM_CATEGORIES=Object.freeze(["material","food","weapon","armor","ammo"]);
export const ITEMS=Object.freeze({
 wood:{name:"Wood",icon:"🪵",category:"material",description:"Gathered from forest trees.",hint:"Material for buildings and tools."},
 stone:{name:"Stone",icon:"🪨",category:"material",description:"Gathered from rocky deposits.",hint:"Material for tools and construction."},
 berries:{name:"Wild Berries",icon:"🫐",category:"food",description:"Foraged from berry bushes.",hint:"Restores 24 Hunger and 12 Stamina."},
 vines:{name:"Vines",icon:"🌿",category:"material",description:"Gathered from trees and berry bushes.",hint:"Flexible material for binding."},
 animal_meat:{name:"Animal Meat",icon:"🥩",category:"food",description:"Raw meat from hunting (future).",hint:"Raw food; cooking planned."},
 fur:{name:"Fur",icon:"🦬",category:"material",description:"Gathered from hunted animals (future).",hint:"Warm clothing and protection."},
 flint:{name:"Flint",icon:"💎",category:"material",description:"Collected as small flint flakes from sandy ocean beaches.",hint:"Sharp edges and weapon tips."},
 fish_meat:{name:"Fish Meat",icon:"🐟",category:"food",description:"Caught in rivers and lakes (future).",hint:"Raw fish; cooking planned."},
 feathers:{name:"Feathers",icon:"🪶",category:"material",description:"Obtained from birds (future).",hint:"Arrows and decoration."},
 raw_hide:{name:"Raw Hide",icon:"🟫",category:"material",description:"Unworked hide from hunted animals (future).",hint:"Can be processed into leather."},
 leather:{name:"Leather",icon:"🧵",category:"material",description:"Processed hide (future).",hint:"Protective clothing and gear."},
 bone:{name:"Bone",icon:"🦴",category:"material",description:"Hunting byproduct (future).",hint:"Tools, needles and fishing hooks."},
 wood_club:{name:"Wooden Club",icon:"🪵",category:"weapon",equipSlot:"weapon",stackLimit:1,
  description:"Primitive wooden melee weapon (future).",hint:"Simple close-range weapon.",combat:{damage:7,stamina:9,reach:1.7}},
 stone_axe:{name:"Stone Axe",icon:"🪓",category:"weapon",equipSlot:"weapon",stackLimit:1,
  description:"Useful for woodcutting; future melee weapon.",hint:"Gather 3 wood when equipped.",combat:{damage:10,stamina:12,reach:1.6}},
 stone_spear:{name:"Stone Spear",icon:"🔱",category:"weapon",equipSlot:"weapon",stackLimit:1,
  description:"Flint-tipped spear (future).",hint:"Longer-reach melee weapon.",combat:{damage:8,stamina:10,reach:2.7}},
 sling:{name:"Sling",icon:"🪢",category:"weapon",equipSlot:"weapon",stackLimit:1,
  description:"Primitive stone-hurling weapon (future).",hint:"Ranged weapon; uses stones.",combat:{damage:5,stamina:6,reach:12}},
 bow:{name:"Primitive Bow",icon:"🏹",category:"weapon",equipSlot:"weapon",stackLimit:1,
  description:"Early hunting bow (future).",hint:"Ranged weapon; uses arrows.",combat:{damage:7,stamina:9,reach:20}},
 arrows:{name:"Stone-Tipped Arrows",icon:"➶",category:"ammo",equipSlot:"ammo",
  description:"Flint tipped projectiles (future).",hint:"Ammunition for a bow."},
 fur_armor:{name:"Fur Armor",icon:"🧥",category:"armor",equipSlot:"body",stackLimit:1,
  description:"Basic protective fur clothing (future).",hint:"Warmth and modest protection.",protection:{armor:2,warmth:5}},
 leather_armor:{name:"Leather Armor",icon:"🥋",category:"armor",equipSlot:"body",stackLimit:1,
  description:"Early stitched leather armor (future).",hint:"Durable body protection.",protection:{armor:4,warmth:2}}
});
export const ITEM_IDS=Object.freeze(Object.keys(ITEMS));
export const STOCKPILE_ITEM_IDS=Object.freeze(ITEM_IDS.filter(id=>
 ["material","food","ammo"].includes(ITEMS[id].category)));
export function canonicalItem(id){return id==="food"?"berries":id}
export function itemStackLimit(id){return ITEMS[canonicalItem(id)]?.stackLimit||STACK_LIMIT}
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
  if(ITEMS[id]&&qty>0)slots[i]={id,qty:Math.min(itemStackLimit(id),qty)};
 }
 return slots;
}
export function countItem(slots,id){
 id=canonicalItem(id);
 return (slots||[]).reduce((sum,s)=>sum+(s?.id===id?s.qty:0),0);
}
export function occupiedSlots(slots){return (slots||[]).filter(Boolean).length}
export function freeSlots(slots){return INVENTORY_SLOTS-occupiedSlots(slots)}
/** Available quantity for this item, respecting its own stack limit. */
export function itemCapacity(slots,id){
 id=canonicalItem(id);
 if(!ITEMS[id])return 0;
 const limit=itemStackLimit(id);
 return (slots||[]).reduce((total,slot)=>total+
  (!slot?limit:slot.id===id?Math.max(0,limit-slot.qty):0),0);
}
export function addItems(slots,id,amount){
 id=canonicalItem(id);
 if(!ITEMS[id])return 0;
 const limit=itemStackLimit(id);
 let left=sane(amount);
 if(!left)return 0;
 for(const slot of slots){
  if(slot?.id!==id||slot.qty>=limit)continue;
  const move=Math.min(limit-slot.qty,left);
  slot.qty+=move;left-=move;
  if(!left)return sane(amount);
 }
 for(let i=0;i<INVENTORY_SLOTS&&left;i++){
  if(slots[i])continue;
  const move=Math.min(limit,left);
  slots[i]={id,qty:move};left-=move;
 }
 return sane(amount)-left;
}
export function removeItems(slots,id,amount){
 id=canonicalItem(id);const total=sane(amount);
 if(!ITEMS[id]||countItem(slots,id)<total)return false;
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
