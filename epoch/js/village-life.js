/**
 * Epoch 6C.5 — lightweight, reproducible village leisure choices.
 *
 * Social behavior is scene-local ambience, not a saved resource producer.
 * Workers and food/cargo/sleep systems always have priority over leisure.
 */
export const VILLAGE_SOCIAL_ENERGY_MIN=36;
export const VILLAGE_SOCIAL_HUNGER_MIN=53;
export const VILLAGE_GATHER_RADIUS=3.6;
export const VILLAGE_WANDER_RADIUS=10;
export const LEISURE_MODES=Object.freeze(["socialWalk","socializing","wandering"]);
export const isLeisureMode=mode=>LEISURE_MODES.includes(mode);
const hash=(value)=>{
 let result=2166136261;
 for(const ch of String(value||"")){
  result=Math.imul(result^ch.charCodeAt(0),16777619);
 }
 return result>>>0;
};
export const villagerLeisureSeed=(id,session)=>hash(id+":"+session);
export function villagerMaySocialize({shift,job,energy,hunger,resting,carrying}){
 return !carrying&&!resting&&Number.isFinite(energy)&&energy>=VILLAGE_SOCIAL_ENERGY_MIN&&
  Number.isFinite(hunger)&&hunger>=VILLAGE_SOCIAL_HUNGER_MIN&&
  (shift==="morning"||shift==="evening"||(shift==="work"&&job==="idle"));
}
/** Different residents choose staggered, reproducible activities instead of
 * doing exactly the same motion at once. A session changes on each daypart.
 */
export function villagerLeisureChoice(id,session,hasHearth){
 const seed=villagerLeisureSeed(id,session);
 const wander=seed%5===0;
 return {
  kind:wander?"wander":hasHearth?"hearth":"gather",
  duration:5+(seed%7),
  pause:4+((seed>>>6)%7),
  angle:(((seed>>>4)%12)*Math.PI/6)+(session%2)*Math.PI/12,
  ring:seed%3,
  offset:(seed>>>9)%16
 };
}
export function villageGatherCenter(village){
 const hearth=(village?.buildings||[]).find(b=>b.kind==="hearth");
 if(hearth)return {x:hearth.x,z:hearth.z,kind:"hearth"};
 const pile=village?.stockpile;
 return pile?{x:pile.x,z:pile.z,kind:"gather"}:null;
}
export function leisureStatus(mode,siteKind){
 if(mode==="socialWalk")
  return siteKind==="hearth"?"Walking to the hearth":
   siteKind==="wander"?"Taking a village stroll":"Meeting villagers";
 if(mode==="socializing")
  return siteKind==="hearth"?"Gathering around the fire":"Socializing";
 if(mode==="wandering")return "Exploring the village";
 return null;
}
