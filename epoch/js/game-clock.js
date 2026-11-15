/**
 * Epoch 6C.1D — the annual day/night clock.
 * One complete 24-hour cycle equals one game year. Each new year begins at
 * 07:00 with the sunrise complete, so players spawn into a visible morning.
 *
 * 432 real seconds/year = 7m12s. Age 25 -> 100 lasts 9 hours
 * (75 years x 432 sec), excluding manual skips and paused time.
 */
export const REAL_SECONDS_PER_YEAR=432;
export const GAME_START_HOUR=7;
export const GAME_HOURS_PER_YEAR=24;
export const REAL_SECONDS_PER_GAME_HOUR=REAL_SECONDS_PER_YEAR/GAME_HOURS_PER_YEAR;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
const smooth=t=>{const x=clamp(t);return x*x*(3-2*x)};
/** Sunset should read as evening well before the clock reaches 7 PM.
 * Front-load the first half of the dusk blend, while preserving the
 * midpoint at 7 PM and full darkness at 8 PM.
 */
export const sunsetBlend=t=>{
 const x=clamp(t);
 return x<=.5?.5*Math.sin(Math.PI*x):
  .5+.5*(1-Math.cos(Math.PI*(x-.5)));
};
export function normalizeCalendarProgress(value){
 return Number.isFinite(value)?clamp(value,0,1-Number.EPSILON):0;
}
export function hourAtProgress(progress){
 return (GAME_START_HOUR+normalizeCalendarProgress(progress)*GAME_HOURS_PER_YEAR)%24;
}
export function progressAtHour(hour){
 return (((((hour-GAME_START_HOUR)%24)+24)%24)/24);
}
/**
 * 05–07 sunrise, 07–18 day, 18–20 sunset, 20–05 night.
 * Smoothstep endpoints ensure derivatives meet at the boundaries.
 */
export function skyAtHour(hour){
 const h=(((Number.isFinite(hour)?hour:GAME_START_HOUR)%24)+24)%24;
 if(h>=5&&h<7)
  return {phase:"sunrise",arc:"dawn",nightMix:1-smooth((h-5)/2)};
 if(h>=7&&h<18)return {phase:"day",arc:"dawn",nightMix:0};
 if(h>=18&&h<20)
  return {phase:"sunset",arc:"dusk",nightMix:sunsetBlend((h-18)/2)};
 return {phase:"night",arc:"dusk",nightMix:1};
}
export function clockAtProgress(progress){
 const p=normalizeCalendarProgress(progress),hour=hourAtProgress(p);
 const h=Math.floor(hour),minute=Math.floor((hour-h)*60+1e-7);
 const sky=skyAtHour(hour);
 return {
  progress:p,hour,minute,hour24:h,
  hour12:h%12||12,period:h<12?"AM":"PM",
  label:`${h%12||12}:${String(minute).padStart(2,"0")} ${h<12?"AM":"PM"}`,
  phase:sky.phase,arc:sky.arc,nightMix:sky.nightMix,
  secondsToNewYear:(1-p)*REAL_SECONDS_PER_YEAR
 };
}
