/**
 * Phase 6C.3: villager work shifts, fatigue, rest and sleep.
 * Every energy change is saved on the resident record; graphics are consumers,
 * never the authority for energy or the game calendar.
 *
 * One full year is 432 real seconds. Overnight sleep (20:00–05:00) restores
 * 100 energy from exhaustion even in the communal camp.
 */
import {leisureStatus} from "./village-life.js?v=20261115life1";
export const VILLAGER_MAX_ENERGY=100;
export const VILLAGER_EXHAUSTED_AT=15;
export const VILLAGER_RESTED_AT=65;
export const VILLAGER_ENERGY_RATES=Object.freeze({
 working:-.48,
 traveling:-.32,
 awakeRest:.19,
 eveningRest:.29,
 morningRest:.30,
 sleeping:.69,
 strandedRest:.08
});
export const VILLAGER_WORK_START=8;
export const VILLAGER_WORK_END=18;
export const VILLAGER_SLEEP_START=20;
export const VILLAGER_WAKE_HOUR=5;
export const normalizedEnergy=value=>
 typeof value==="number"&&Number.isFinite(value)?
 Math.max(0,Math.min(VILLAGER_MAX_ENERGY,value)):VILLAGER_MAX_ENERGY;
export const normalizedResting=(value,energy)=>
 energy<=VILLAGER_EXHAUSTED_AT?true:
 energy>=VILLAGER_RESTED_AT?false:value===true;
const clampHours=hour=>((Number.isFinite(hour)?hour:7)%24+24)%24;

/** The entire workday is deliberately only 3 real minutes. */
export function villagerDayPhase(hour){
 const h=clampHours(hour);
 if(h>=VILLAGER_WORK_START&&h<VILLAGER_WORK_END)return "work";
 if(h>=VILLAGER_WORK_END&&h<VILLAGER_SLEEP_START)return "evening";
 if(h>=VILLAGER_SLEEP_START||h<VILLAGER_WAKE_HOUR)return "night";
 return "morning";
}
export const villagerCanBeginWork=(hour,energy,resting,job,hunger=100)=>
 job&&job!=="idle"&&villagerDayPhase(hour)==="work"&&
 normalizedEnergy(energy)>VILLAGER_EXHAUSTED_AT&&!resting&&
 // A hungry forager must still be able to rescue a food-starved village.
 (hunger>15||job==="forager");

export const villagerActivityText=(mode,shift,resting=false,siteKind=null)=>{
 const leisure=leisureStatus(mode,siteKind);
 if(leisure)return leisure;
 if(mode==="sleeping")return "Sleeping";
 if(mode==="goingHome")return "Returning home";
 if(mode==="resting"||resting&&mode==="idle")return "Resting to recover";
 if(mode==="offDuty")return shift==="morning"?"Preparing for the day":"Off duty";
 return {
  outbound:"Traveling to work",working:"Gathering resources",
  returning:"Carrying supplies home",waiting:"Waiting to unload",
  toMeal:"Walking to village stores",eating:"Eating a meal",
  stuck:"Finding a safe route",idle:"At home"
 }[mode]||"At home";
};

/** Update exactly once per active calendar tick, not per render frame.
 * When the player is away from the settlement workers stop simulating:
 * preserve their energy rather than quietly draining workers who cannot move.
 */
export function advanceVillagerEnergy(person,activity,seconds,shift){
 const energy=normalizedEnergy(person.energy);
 let resting=normalizedResting(person.resting,energy);
 const dt=Math.max(0,Math.min(Number(seconds)||0,5));
 if(dt===0)return {energy,resting};
 const mode=activity?.mode||"idle",moving=activity?.moving===true;
 const home=activity?.atHome===true;
 const active=activity?.local!==false;
 let rate=0;
 if(!active)return {energy,resting};
 if(mode==="working")rate=VILLAGER_ENERGY_RATES.working;
 else if(["outbound","returning","goingHome","stuck","socialWalk","wandering"].includes(mode)&&moving)
  rate=VILLAGER_ENERGY_RATES.traveling;
 else if(home){
  if(shift==="night")rate=VILLAGER_ENERGY_RATES.sleeping;
  else if(shift==="morning")rate=VILLAGER_ENERGY_RATES.morningRest;
  else if(shift==="evening")rate=VILLAGER_ENERGY_RATES.eveningRest;
  else rate=VILLAGER_ENERGY_RATES.awakeRest;
 }else if(mode==="socializing")rate=.12;
 else if(mode==="stuck"||mode==="waiting")
  rate=VILLAGER_ENERGY_RATES.strandedRest;
 // Empty stomachs make sleep less restorative; starvation also saps
 // strength even when villagers aren't gathering.
 const hunger=typeof person.hunger==="number"&&Number.isFinite(person.hunger)?
  Math.max(0,Math.min(100,person.hunger)):100;
 if(rate>0)rate*=hunger===0?.22:hunger<25?.4:hunger<50?.72:1;
 if(hunger===0)rate-=.23;
 const next=normalizedEnergy(energy+rate*dt);
 resting=normalizedResting(resting,next);
 return {energy:next,resting};
}
