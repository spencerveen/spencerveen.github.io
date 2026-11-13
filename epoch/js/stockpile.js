/**
 * Stone Age village home base. The first Stockpile is free to found.
 * Its inventory is village-only and cannot be used to bypass the player's
 * personal ten-slot carry limit. Materials for hut construction come from here.
 */
import {ITEM_IDS,canonicalItem,addItems,countItem,removeItems,itemCapacity} from "./inventory.js?v=20261113k";
export const STOCKPILE_CAPACITY=480; // Total individual items, not stacks.
export const STOCKPILE_INTERACT_RANGE=5;
export const VILLAGE_RADIUS=24;
export const BUILD_GRID=2;
export const LEGACY_HOME=Object.freeze({x:-2,z:-8});
export const STOCKPILE_FOOTPRINT=2.15;
export const canonicalStockpileItem=canonicalItem;
const safe=n=>Number.isFinite(Number(n))?Math.max(0,Math.floor(Number(n))):0;
export const snapGrid=n=>Math.round(Number(n)/BUILD_GRID)*BUILD_GRID;
export function normalStockpile(raw){
 if(!raw||!Number.isFinite(Number(raw.x))||!Number.isFinite(Number(raw.z)))return null;
 const items={};
 for(const id of ITEM_IDS)items[id]=safe(raw.items?.[id]??(id==="berries"?raw.items?.food:0));
 return {x:snapGrid(Number(raw.x)),z:snapGrid(Number(raw.z)),items};
}
export function createStockpile(x,z){
 return normalStockpile({x,z,items:{}});
}
export function stockpileCount(stockpile,id){
 return safe(stockpile?.items?.[canonicalItem(id)]);
}
export function stockpileUsed(stockpile){
 return stockpile?ITEM_IDS.reduce((sum,id)=>sum+stockpileCount(stockpile,id),0):0;
}
export function stockpileSpace(stockpile){
 return stockpile?Math.max(0,STOCKPILE_CAPACITY-stockpileUsed(stockpile)):0;
}
export function stockpileHas(stockpile,cost){
 return !!stockpile&&Object.entries(cost).every(([id,n])=>stockpileCount(stockpile,id)>=n);
}
export function payStockpile(stockpile,cost){
 if(!stockpileHas(stockpile,cost))return false;
 for(const [id,n] of Object.entries(cost))stockpile.items[canonicalItem(id)]-=n;
 return true;
}
export function nearStockpile(stockpile,x,z,range=STOCKPILE_INTERACT_RANGE){
 return !!stockpile&&Number.isFinite(Number(x))&&Number.isFinite(Number(z))
  &&Math.hypot(stockpile.x-Number(x),stockpile.z-Number(z))<=range;
}
export function withinVillage(stockpile,x,z,radius=VILLAGE_RADIUS){
 return !!stockpile&&Math.hypot(stockpile.x-x,stockpile.z-z)<=radius;
}
export function depositStockpile(slots,stockpile,id,requested){
 id=canonicalItem(id);
 if(!stockpile||!ITEM_IDS.includes(id))return 0;
 const moved=Math.min(stockpileSpace(stockpile),countItem(slots,id),safe(requested));
 if(!moved)return 0;
 if(!removeItems(slots,id,moved))return 0;
 stockpile.items[id]+=moved;
 return moved;
}
export function depositAllStockpile(slots,stockpile){
 if(!stockpile)return 0;
 let total=0;
 for(const id of ITEM_IDS)total+=depositStockpile(slots,stockpile,id,countItem(slots,id));
 return total;
}
export function withdrawStockpile(slots,stockpile,id,requested){
 id=canonicalItem(id);
 if(!stockpile||!ITEM_IDS.includes(id))return 0;
 const move=Math.min(stockpileCount(stockpile,id),itemCapacity(slots,id),safe(requested));
 if(!move)return 0;
 const added=addItems(slots,id,move);
 stockpile.items[id]-=added;
 return added;
}
export function stockpileValidation(world,x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))return {ok:false,reason:"Select a location on the ground."};
 const sx=snapGrid(x),sz=snapGrid(z);
 const player=world.player?.position;
 if(player&&Math.hypot(player.x-sx,player.z-sz)<2.8)
  return {ok:false,reason:"Place the stockpile a few paces away from your character.",x:sx,z:sz};
 if(!player||Math.hypot(player.x-sx,player.z-sz)>18)
  return {ok:false,reason:"Choose ground within 18m of your adventurer.",x:sx,z:sz};
 const height=world.groundY(sx,sz);
 for(const [dx,dz] of [[0,0],[2,0],[-2,0],[0,2],[0,-2],[2,2],[-2,2],[-2,-2],[2,-2]]){
  if(Math.abs(world.groundY(sx+dx,sz+dz)-height)>.62)
   return {ok:false,reason:"Find a flatter spot for the stockpile.",x:sx,z:sz};
 }
 // Ignore an existing free village template until the stockpile is founded.
 if(world.obstacles?.some(o=>!o.plotId&&Math.hypot(o.x-sx,o.z-sz)<(o.r||0)+STOCKPILE_FOOTPRINT+.45))
  return {ok:false,reason:"Clear nearby trees or rocks first.",x:sx,z:sz};
 if(Math.hypot(sx+5,sz+3)<2.1)
  return {ok:false,reason:"Choose a spot away from the existing campfire.",x:sx,z:sz};
 return {ok:true,reason:"Place village stockpile",x:sx,z:sz};
}
