import assert from "node:assert/strict";
import {SKY_FADE_SECONDS,SKY_TWILIGHT,skyTwilightWeight,
 skyEnvironmentAt,smoothSkyStep,createSkyPreviewTransition} from "../js/sky-transitions.js";
import {SKY_LIGHTING} from "../js/sky-atmosphere.js";

const near=(a,b,epsilon=1e-8)=>Math.abs(a-b)<epsilon;
const env=(mix,phase)=>skyEnvironmentAt(mix,phase,SKY_LIGHTING.day,SKY_LIGHTING.night);
assert.equal(SKY_FADE_SECONDS,16);
assert(near(smoothSkyStep(0),0));
assert(near(smoothSkyStep(1),1));
assert(near(smoothSkyStep(.5),.5));
assert(near(smoothSkyStep(-100),0));
assert(near(smoothSkyStep(100),1));
for(let i=1;i<=100;i++)
 assert(smoothSkyStep(i/100)>=smoothSkyStep((i-1)/100),"easing remains monotonic");
assert.equal(skyTwilightWeight(0),0);
assert.equal(skyTwilightWeight(1),0);
assert.equal(skyTwilightWeight(.5),1);
assert(skyTwilightWeight(.25)<skyTwilightWeight(.5));
assert.deepEqual(env(0,"dusk"),SKY_LIGHTING.day,"day endpoint exactly preserved");
assert.deepEqual(env(1,"dawn"),SKY_LIGHTING.night,"night endpoint exactly preserved");
assert.notDeepEqual(env(.5,"dawn").fog,env(.5,"dusk").fog,
 "sunrise and sunset must have distinct atmospheric colors");
assert(env(.5,"dawn").sunIntensity>SKY_LIGHTING.night.sunIntensity);
assert(env(.5,"dusk").sunIntensity<SKY_LIGHTING.day.sunIntensity);
for(const phase of ["dawn","dusk"]){
 let prev=SKY_LIGHTING.day.terrainBrightness;
 for(let step=0;step<=100;step++){
  const v=env(step/100,phase);
  for(const key of Object.keys(SKY_LIGHTING.day)){
   const value=v[key];
   if(Array.isArray(value))value.forEach(x=>assert(Number.isFinite(x)));
   else assert(Number.isFinite(value));
  }
  assert(v.hemiIntensity>=0&&v.terrainBrightness>0);
  if(step>0&&step<100)assert(v.terrainBrightness<=1);
  prev=v.terrainBrightness;
 }
}
const fade=createSkyPreviewTransition(0);
assert.equal(fade.transitioning,false);
assert.equal(fade.mix,0);
fade.setTarget(1);
assert(fade.transitioning);
assert.equal(fade.phase,"dusk");
assert.equal(fade.remaining,SKY_FADE_SECONDS);
fade.advance(SKY_FADE_SECONDS/4);
const quarter=fade.mix;
assert(quarter>0&&quarter<.5);
fade.advance(SKY_FADE_SECONDS/4);
assert(near(fade.mix,.5));
assert(near(fade.remaining,8));
fade.setTarget(0);
assert.equal(fade.phase,"dawn");
assert(near(fade.mix,.5),"reversal never snaps");
assert(near(fade.remaining,8),"reverse fade scales with remaining distance");
fade.advance(4);
assert(near(fade.mix,.25),"reverse fade follows continuous midpoint");
fade.advance(4);
assert(near(fade.mix,0));
assert.equal(fade.transitioning,false);
fade.setTarget(1);
fade.advance(16);
assert.equal(fade.mix,1);
assert.equal(fade.remaining,0);
fade.setTarget(0,true);
assert.equal(fade.mix,0,"immediate reset is supported for initial scene setup");
assert.equal(fade.transitioning,false);
assert.equal(fade.setTarget(1),0);
fade.advance(-5);
assert.equal(fade.mix,0);
console.log("PASS twilight: deterministic dusk/sunrise colors, monotonic smooth easing and reversible fades");
