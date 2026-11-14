/**
 * Pure Stone Age wildlife rules. World meshes, state persistence and
 * rendering call these functions but never change their seeded definitions.
 */
export const HUNTING_VERSION=1;
export const WILDLIFE=Object.freeze({
 deer:Object.freeze({name:"Deer",health:16,detect:8.5,speed:4.7,
  scale:1,loot:Object.freeze({animal_meat:3,fur:2,raw_hide:1})}),
 boar:Object.freeze({name:"Wild Boar",health:22,detect:6.5,speed:3.7,
  scale:.78,hostile:true,contactDamage:9,loot:Object.freeze({animal_meat:4,raw_hide:1,bone:1})}),
 rabbit:Object.freeze({name:"Rabbit",health:8,detect:5.5,speed:5.5,
  scale:.38,loot:Object.freeze({animal_meat:1,fur:1})})
});
export const WILDLIFE_ATTACK_COOLDOWN=.65;
export const BOAR_ATTACK_COOLDOWN=2.7;
export const HUNT_DISTANCE_BUFFER=.28;
export function animalDefinition(species){return WILDLIFE[species]||null}
export function normalizeWildlife(raw){
 const out={};
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return out;
 for(const [id,value] of Object.entries(raw).slice(0,10000)){
  if(!/^wildlife:[-\w:,]+$/.test(id)||!value||!WILDLIFE[value.species])continue;
  const def=WILDLIFE[value.species];
  const health=Number.isFinite(value.health)?
   Math.max(0,Math.min(def.health,value.health)):def.health;
  const dead=value.dead===true||health===0;
  out[id]={species:value.species,health:dead?0:health,dead,
   looted:dead&&value.looted===true};
 }
 return out;
}
export function animalCombatStats(id,combat){
 if(!["wood_club","stone_axe","stone_spear"].includes(id)||!combat)return null;
 const {damage,stamina,reach}=combat;
 if(![damage,stamina,reach].every(Number.isFinite))return null;
 return {damage,stamina,reach};
}
export function animalMotion(species,x,z,originX,originZ,playerX,playerZ,time,dt,provoked=false){
 const def=WILDLIFE[species];if(!def)return {x,z,heading:0,mode:"idle"};
 const dx=x-playerX,dz=z-playerZ,dist=Math.hypot(dx,dz);
 const home=Math.hypot(x-originX,z-originZ);
 const alarm=dist<def.detect||provoked;
 let mx=0,mz=0,mode="wander",speed=.45;
 if(alarm){
  mode=def.hostile&&provoked?"charge":"flee";
  speed=def.speed;
  const toward=mode==="charge"?-1:1;
  mx=dist>.01?toward*dx/dist:1;
  mz=dist>.01?toward*dz/dist:0;
 }else{
  const phase=originX*.17+originZ*.31;
  mx=Math.sin(time*.33+phase);
  mz=Math.cos(time*.25+phase);
  const length=Math.hypot(mx,mz)||1;mx/=length;mz/=length;
 }
 // Herd animals stay in their source chunk's neighborhood, and avoid
 // sprinting endlessly into unloaded terrain beyond the detailed radius.
 if(home>12&&mode!=="charge"){
  mx=(originX-x)/(home||1);mz=(originZ-z)/(home||1);
  mode="return";speed=def.speed*.55;
 }
 return {x:x+mx*speed*dt,z:z+mz*speed*dt,
  heading:Math.atan2(mx,mz),mode};
}
