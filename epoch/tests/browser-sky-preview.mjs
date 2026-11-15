import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
import path from "node:path";
import {launchBrowser,gameUrl,continueGame} from "./browser-helpers.mjs";

const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];
 page.on("pageerror",error=>errors.push(String(error)));
 await page.addInitScript(()=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,year:-12000,calendarProgress:0,
   hero:{name:"Sky Explorer",age:25},
   village:{population:1,plots:{},buildings:[]},
   survival:{health:100,stamina:100,hunger:100,gameOver:false},
   lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 });
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page,{model:true});
 await page.waitForFunction(()=>{
  const sky=window.epochDebug()?.sky;
  return sky?.loaded?.day&&sky?.loaded?.night;
 },null,{timeout:45000});
 const initial=await page.evaluate(()=>{
  const w=window.__epochTestWorld,sky=w.skyAtmosphere;
  return {clock:window.epochDebug().clock,mode:sky.mode,loaded:sky.status().loaded,
   error:sky.status().shaderError,meshCount:w.scene.meshes.filter(m=>m.metadata?.skybox).length,
   domePickable:sky.dome.isPickable,domeEnabled:sky.dome.isEnabled(),
   intensity:w.skySun.intensity,ambient:w.skyHemi.intensity,
   fog:[w.scene.fogColor.r,w.scene.fogColor.g,w.scene.fogColor.b],
   radius:sky.dome.getBoundingInfo().boundingSphere.radius,
   activeTerrain:!!w.m.terrainSurface?.setFloat};
 });
 assert.equal(initial.clock.label,"7:00 AM");
 assert.equal(initial.clock.phase,"day");
 assert.equal(initial.mode,"day");
 assert.deepEqual(initial.loaded,{day:true,night:true},"both sky panoramas loaded locally");
 assert.equal(initial.error,"","sky shader compiles without errors");
 assert.equal(initial.meshCount,1);
 assert.equal(initial.domePickable,false);
 assert.equal(initial.domeEnabled,true);
 assert(initial.radius>300&&initial.radius<1000);
 assert(initial.activeTerrain);
 assert.equal(await page.locator("#game-clock .game-clock-time").innerText(),"7:00 AM");
 assert.equal(await page.locator("#sky-preview").count(),0,
  "manual sky preview control replaced with a real clock");
 const folder=path.join("epoch","tests","artifacts");
 mkdirSync(folder,{recursive:true});
 await page.screenshot({path:path.join(folder,"epoch-clock-day.png"),animations:"disabled"});
 const phases=[];
 for(const [hour,phase,expectedMix] of [[19,"sunset",.5],[22,"night",1],
  [6,"sunrise",.5],[7,"day",0]]){
  const state=await page.evaluate(hour=>{
   const w=window.__epochTestWorld;
   const progress=((((hour-7)%24)+24)%24)/24;
   w.getClockReading=()=>({progress,paused:true});
   w.updateClockSky(.016);
   const sky=w.skyAtmosphere;
   return {phase:sky.status().phase,mix:sky.nightMix,
    intensity:w.skySun.intensity,ambient:w.skyHemi.intensity,
    fog:[w.scene.fogColor.r,w.scene.fogColor.g,w.scene.fogColor.b],
    meshCount:w.scene.meshes.filter(m=>m.metadata?.skybox).length,
    error:sky.status().shaderError};
  },hour);
  assert.equal(state.phase,phase,phase+" should match the saved clock");
  assert(Math.abs(state.mix-expectedMix)<1e-5,phase+" blend is clock-driven");
  assert.equal(state.meshCount,1,"sky reuses the same dome across all hours");
  assert.equal(state.error,"");
  phases.push(state);
  await page.screenshot({path:path.join(folder,"epoch-clock-"+phase+".png"),animations:"disabled"});
 }
 assert(phases[0].intensity<initial.intensity&&phases[0].intensity>phases[1].intensity);
 assert(phases[1].ambient<initial.ambient);
 assert(phases[1].fog[0]<initial.fog[0]);
 assert.notDeepEqual(phases[0].fog,phases[2].fog,
  "dawn and dusk have distinct atmospheric colors");
 assert.equal(phases[3].intensity,initial.intensity);
 // Test an actual saved fractional year, not a volatile visual override.
 await page.evaluate(()=>{
  const key="epoch.stoneage.slot.1";
  const saved=JSON.parse(localStorage.getItem(key));
  saved.calendarProgress=.5;
  localStorage.setItem(key,JSON.stringify(saved));
 });
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 await page.waitForFunction(()=>window.epochDebug()?.clock?.phase==="sunset",null,{timeout:15000});
 const persisted=await page.evaluate(()=>window.epochDebug());
 assert.equal(persisted.clock.phase,"sunset");
 assert.equal(persisted.clock.hour24,19);
 assert.equal(persisted.clock.nightMix,.5);
 assert.equal(persisted.year,"12,000 BCE","previewing sky must not age the character");
 assert.equal(persisted.heroAge,25);
 assert.equal(await page.locator("#game-clock").getAttribute("data-phase"),"sunset");
 assert.equal(await page.locator("#game-clock .game-clock-time").innerText(),"7:00 PM");
 assert.deepEqual(errors,[],"automatic sky and clock should create no browser errors");
 console.log("PASS browser 6C.1D: local sky, automatic hourly phases, lighting, live clock HUD and fractional-year reload");
}finally{await browser.close()}
