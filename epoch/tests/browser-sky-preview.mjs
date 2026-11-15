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
   version:1,worldSeed:12000,hero:{name:"Sky Explorer",age:25},
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
  const w=window.__epochTestWorld;
  const sky=w.skyAtmosphere;
  return {
   mode:sky.mode,loaded:sky.status().loaded,error:sky.status().shaderError,
   meshCount:w.scene.meshes.filter(m=>m.metadata?.skybox).length,
   domePickable:sky.dome.isPickable,domeEnabled:sky.dome.isEnabled(),
   intensity:w.skySun.intensity,ambient:w.skyHemi.intensity,
   fog:[w.scene.fogColor.r,w.scene.fogColor.g,w.scene.fogColor.b],
   radius:sky.dome.getBoundingInfo().boundingSphere.radius,
   activeTerrain:!!w.m.terrainSurface?.setFloat
  };
 });
 assert.equal(initial.mode,"day");
 assert.deepEqual(initial.loaded,{day:true,night:true},"both sky panoramas load locally");
 assert.equal(initial.error,"","sky shader compiles without errors");
 assert.equal(initial.meshCount,1,"only one sky dome is created");
 assert.equal(initial.domePickable,false,"sky cannot block picking resources/buildings");
 assert.equal(initial.domeEnabled,true);
 assert(initial.radius>300&&initial.radius<1000,"sky dome has a world-sized bounding sphere");
 assert(initial.activeTerrain,"custom terrain shader is retained");
 const preview=page.locator("#sky-preview");
 assert.equal(await preview.getAttribute("aria-pressed"),"false");
 const folder=path.join("epoch","tests","artifacts");
 mkdirSync(folder,{recursive:true});
 await page.screenshot({path:path.join(folder,"epoch-sky-day.png"),animations:"disabled"});
 await preview.click();
 await page.waitForFunction(()=>window.epochDebug()?.sky?.mode==="night");
 const night=await page.evaluate(()=>{
  const w=window.__epochTestWorld,sky=w.skyAtmosphere;
  return {mode:sky.mode,loaded:sky.status().loaded,error:sky.status().shaderError,
   intensity:w.skySun.intensity,ambient:w.skyHemi.intensity,
   fog:[w.scene.fogColor.r,w.scene.fogColor.g,w.scene.fogColor.b],
   displayed:sky.dome.metadata.preview,activeMeshes:w.scene.meshes.filter(m=>m.metadata?.skybox).length,
   skyBrightness:w.m.terrainSurface._floats?.skyBrightness??null};
 });
 assert.equal(night.mode,"night");
 assert.equal(night.displayed,"night");
 assert.equal(night.activeMeshes,1,"toggle must reuse the same sky dome");
 assert(night.intensity<initial.intensity&&night.ambient<initial.ambient,
  "night lighting must be dimmer");
 assert(night.fog[0]<initial.fog[0],"night fog must match the dark sky");
 assert.equal(await preview.getAttribute("aria-pressed"),"true");
 assert.equal(night.error,"");
 await page.screenshot({path:path.join(folder,"epoch-sky-night.png"),animations:"disabled"});
 await preview.click();
 await page.waitForFunction(()=>window.epochDebug()?.sky?.mode==="day");
 const reset=await page.evaluate(()=>{
  const w=window.__epochTestWorld;
  return {mode:w.skyMode,brightness:w.skyAtmosphere?.mode==="day",
   intensity:w.skySun.intensity,meshCount:w.scene.meshes.filter(m=>m.metadata?.skybox).length};
 });
 assert.equal(reset.mode,"day");
 assert.equal(reset.intensity,initial.intensity);
 assert.equal(reset.meshCount,1);
 assert.deepEqual(errors,[],"preview must not generate browser errors");
 console.log("PASS browser skyboxes: local panoramas, day/night preview, lighting/fog and one non-pickable dome");
}finally{await browser.close()}
