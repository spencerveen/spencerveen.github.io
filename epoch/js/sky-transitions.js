/**
 * Epoch 6C.1C — deterministic day, twilight and night atmosphere.
 * Pure interpolation helpers are used by the preview today and by
 * the saved clock in the next milestone.
 */
export const SKY_FADE_SECONDS=16;
export const SKY_TWILIGHT=Object.freeze({
 dawn:Object.freeze({
  background:[.55,.46,.45],fog:[.53,.42,.39],
  hemiIntensity:.45,ground:[.23,.19,.19],
  sunIntensity:.40,sunColor:[1,.74,.53],sunDirection:[-.80,-.26,.20],
  terrainBrightness:.71,waterColor:[.75,.67,.71]
 }),
 dusk:Object.freeze({
  background:[.62,.40,.37],fog:[.57,.37,.32],
  hemiIntensity:.40,ground:[.25,.18,.16],
  sunIntensity:.44,sunColor:[1,.59,.35],sunDirection:[-.85,-.22,.32],
  terrainBrightness:.64,waterColor:[.79,.57,.61]
 })
});
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
const lerp=(a,b,t)=>a+(b-a)*t;
const linear=(a,b,t)=>Array.isArray(a)?a.map((v,i)=>lerp(v,b[i],t)):lerp(a,b,t);
export const smoothSkyStep=t=>{
 const x=clamp(t);
 return x*x*(3-2*x);
};
export const skyTwilightWeight=mix=>Math.pow(
 Math.max(0,1-Math.abs(clamp(mix)*2-1)),1.5);

/** All visual values have a single continuous source of truth, including the
 * terrain's custom shader (which ignores Babylon's native directional light).
 */
export function skyEnvironmentAt(mix,phase,day,night){
 const x=clamp(mix);
 const weight=skyTwilightWeight(x);
 const accent=SKY_TWILIGHT[phase==="dawn"?"dawn":"dusk"];
 const out={};
 for(const key of Object.keys(day)){
  const base=linear(day[key],night[key],x);
  out[key]=linear(base,accent[key],weight*.78);
 }
 return out;
}

/** Transition duration scales with distance so interrupting a fade reverses
 * from its exact current brightness rather than snapping to an endpoint.
 */
export function createSkyPreviewTransition(initial=0,duration=SKY_FADE_SECONDS){
 let mix=clamp(initial),goal=mix,from=mix,elapsed=0,span=0;
 let phase=mix>=.5?"dawn":"dusk";
 return {
  get mix(){return mix},
  get target(){return goal},
  get phase(){return phase},
  get transitioning(){return span>0},
  get remaining(){return span?Math.max(0,span-elapsed):0},
  setTarget(target,immediate=false){
   const next=clamp(target);
   goal=next;
   if(immediate||Math.abs(next-mix)<1e-6){
    mix=goal;from=goal;elapsed=0;span=0;
    return mix;
   }
   from=mix;elapsed=0;span=duration*Math.abs(goal-from);
   phase=goal>from?"dusk":"dawn";
   return mix;
  },
  advance(seconds){
   if(span<=0)return mix;
   elapsed=Math.min(span,elapsed+Math.max(0,Number(seconds)||0));
   mix=lerp(from,goal,smoothSkyStep(elapsed/span));
   if(elapsed>=span){mix=goal;from=goal;span=0;elapsed=0}
   return mix;
  }
 };
}
