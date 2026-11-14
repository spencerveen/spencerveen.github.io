/** Persistent equipped gear and primitive crafting recipes.
 * Each crafted weapon has a separate condition tracked across equipment swaps.
 */
import {ITEMS,itemStackLimit} from "./inventory.js?v=20261114x";
export const EQUIPMENT_SLOTS=Object.freeze({
 weapon:{name:"Main Hand",accepts:"weapon"},
 body:{name:"Body Armor",accepts:"armor"},
 ammo:{name:"Ammunition",accepts:"ammo"}
});
export const CRAFTING_PLANS=Object.freeze({
 wood_club:{station:"stockpile",materials:{wood:3},output:{id:"wood_club",qty:1},available:true,requires:[],xp:12},
 stone_axe:{station:"stockpile",materials:{wood:2,stone:3},output:{id:"stone_axe",qty:1},available:true,requires:["tools"],xp:28},
 stone_spear:{station:"stockpile",materials:{wood:2,flint:1,vines:1},output:{id:"stone_spear",qty:1},available:true,requires:["tools"],xp:24},
 sling:{station:"hideworking",materials:{raw_hide:1,vines:2},output:{id:"sling",qty:1},available:false},
 bow:{station:"fletching",materials:{wood:3,vines:2,raw_hide:1},output:{id:"bow",qty:1},available:false},
 arrows:{station:"fletching",materials:{wood:1,flint:1,feathers:2},output:{id:"arrows",qty:4},available:false},
 fur_armor:{station:"hideworking",materials:{fur:3,vines:2},output:{id:"fur_armor",qty:1},available:false},
 leather_armor:{station:"hideworking",materials:{leather:3,vines:2},output:{id:"leather_armor",qty:1},available:false}
});
export function emptyEquipment(){return {weapon:null,body:null,ammo:null}}
export function normalizeEquipment(raw,legacyAxe=false){
 const equipment=emptyEquipment(),from=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
 for(const slot of ["weapon","body"]){
  const id=from[slot];
  if(typeof id==="string"&&ITEMS[id]?.equipSlot===slot)equipment[slot]=id;
 }
 const ammo=from.ammo;
 if(ammo&&typeof ammo==="object"&&!Array.isArray(ammo)&&
    ITEMS[ammo.id]?.equipSlot==="ammo"){
  const qty=Math.trunc(Number(ammo.qty));
  if(Number.isFinite(qty)&&qty>0)equipment.ammo={id:ammo.id,qty:Math.min(itemStackLimit(ammo.id),qty)};
 }
 // Migrate the pre-equipment boolean exactly once. Never restore discarded
 // axes in later saves that already possess an equipment record.
 if(raw===undefined&&legacyAxe)equipment.weapon="stone_axe";
 return equipment;
}
export function equippedItem(equipment,slot){
 if(!(slot in EQUIPMENT_SLOTS))return null;
 const item=equipment?.[slot];
 if(!item)return null;
 return typeof item==="string"?{id:item,qty:1}:({...item});
}
export function equipFromBackpack(slots,equipment,index){
 if(!Number.isInteger(index)||index<0||index>=slots.length)return false;
 const item=slots[index];if(!item)return false;
 const slot=ITEMS[item.id]?.equipSlot;
 if(!slot||!(slot in EQUIPMENT_SLOTS))return false;
 if((slot==="weapon"||slot==="body")&&item.qty!==1)return false;
 const previous=equippedItem(equipment,slot);
 // Replacing equipment puts the old item directly into the newly emptied
 // backpack slot. No capacity check or intermediate item creation needed.
 equipment[slot]=slot==="ammo"?{id:item.id,qty:item.qty}:item.id;
 slots[index]=previous?{...previous}:null;
 return true;
}
export function unequipToBackpack(slots,equipment,slot){
 if(!(slot in EQUIPMENT_SLOTS))return false;
 const previous=equippedItem(equipment,slot);
 if(!previous)return false;
 const index=slots.findIndex(item=>item===null);
 if(index<0)return false;
 slots[index]=previous;
 equipment[slot]=null;
 return true;
}
