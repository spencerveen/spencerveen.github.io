/**
 * Grid-snapped, individually placed Stone Age structures.
 * Saved structures are data, not predetermined buildable plot markers.
 */
import {BUILDINGS,PLOTS} from "./settlement.js?v=20261114b";
import {BUILD_GRID,VILLAGE_RADIUS,LEGACY_HOME,snapGrid} from "./stockpile.js?v=20261114a";
export const BUILDING_RADIUS=Object.freeze({family:2.6,hearth:2.2,lore:2.5,council:3.3});
export const UNIQUE_BUILDINGS=Object.freeze(["hearth","lore","council"]);
export const normalizeTurn=n=>((Math.round(Number(n)||0)%4)+4)%4;
export const footprint=kind=>BUILDING_RADIUS[kind]||2.6;
export function normalizeBuildings(raw,plots={},home=null){
 const result=[];
 const usedIds=new Set();
 if(Array.isArray(raw)){
  for(const data of raw){
   if(!data||!BUILDINGS[data.kind]||!Number.isFinite(Number(data.x))||!Number.isFinite(Number(data.z)))continue;
   const id=String(data.id||"").slice(0,60);
   if(!id||usedIds.has(id))continue;
   usedIds.add(id);
   result.push({id,kind:data.kind,x:Number(data.x),
    z:Number(data.z),turn:normalizeTurn(data.turn)});
  }
 }
 // Existing village saves store five fixed plot IDs, including free huts.
 // Convert the *built* ones to world-coordinate structures, once only.
 for(const plot of PLOTS){
  if(plots?.[plot.id]!==plot.kind||usedIds.has(plot.id))continue;
  const dx=home?home.x-LEGACY_HOME.x:0,dz=home?home.z-LEGACY_HOME.z:0;
  result.push({id:plot.id,kind:plot.kind,
    x:plot.x+dx,z:plot.z+dz,
    turn:normalizeTurn(plot.rotation*2/Math.PI)});
  usedIds.add(plot.id);
 }
 return result;
}
export function placementCheck({village,world,kind,x,z,turn=0,ignoreId=null}){
 if(!BUILDINGS[kind])return {ok:false,reason:"Unknown building type."};
 const pile=village?.stockpile;
 if(!pile)return {ok:false,reason:"Place a village stockpile first."};
 if(!Number.isFinite(Number(x))||!Number.isFinite(Number(z)))
  return {ok:false,reason:"Choose a point on the ground."};
 x=snapGrid(Number(x));z=snapGrid(Number(z));
 const radius=footprint(kind);
 const answer={kind,x,z,turn:normalizeTurn(turn)};
 if(Math.hypot(x-pile.x,z-pile.z)+radius>VILLAGE_RADIUS)
  return {...answer,ok:false,reason:"Outside the stockpile's 24m building radius."};
 if(Math.hypot(x-pile.x,z-pile.z)<radius+2.3)
  return {...answer,ok:false,reason:"Too close to the stockpile."};
 if((village.buildings||[]).some(b=>b.id!==ignoreId&&Math.hypot(x-b.x,z-b.z)<radius+footprint(b.kind)+.6))
  return {...answer,ok:false,reason:"Overlaps another building."};
 // A four-direction terrain sample catches slope before spending materials.
 if(world?.groundY){
  const center=world.groundY(x,z);
  for(const [dx,dz] of [[radius,0],[-radius,0],[0,radius],[0,-radius]]){
   if(Math.abs(world.groundY(x+dx,z+dz)-center)>.72)
    return {...answer,ok:false,reason:"Ground is too steep here."};
  }
 }
 if(world?.obstacles?.some(o=>!o.plotId&&!o.stockpile&&
   Math.hypot(o.x-x,o.z-z)<radius+(Number(o.r)||0)+.3))
  return {...answer,ok:false,reason:"Clear nearby trees or rocks first."};
 return {...answer,ok:true,reason:"Clear ground. Ready to construct."};
}
export function choosePlacement(village,world,kind,aroundX=null,aroundZ=null){
 if(!village?.stockpile)return null;
 const centerX=Number.isFinite(aroundX)?aroundX:village.stockpile.x;
 const centerZ=Number.isFinite(aroundZ)?aroundZ:village.stockpile.z;
 const candidates=[];
 for(let r=6;r<=VILLAGE_RADIUS-2;r+=BUILD_GRID)
  for(let k=0;k<24;k++){
   const a=k*Math.PI/12;
   candidates.push([snapGrid(centerX+Math.cos(a)*r),snapGrid(centerZ+Math.sin(a)*r)]);
  }
 // Prefer a site near the player/camera but keep the village radius valid.
 for(const [x,z] of candidates){
  const check=placementCheck({village,world,kind,x,z});
  if(check.ok)return check;
 }
 return placementCheck({village,world,kind,x:centerX+8,z:centerZ+8});
}
