import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame} from "./browser-helpers.mjs";
import {coastlineX} from "../js/ocean-generation.js";
const seed=12000,shore=coastlineX(0,seed);
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,hero:{name:"Sea Explorer",age:18},
   waterProtectedSites:[],mountainProtectedSites:[],oceanProtectedSites:[],
   village:{population:1,buildings:[],plots:{},residents:[]},
   survival:{health:100,stamina:100,hunger:100,gameOver:false,deathCount:0},
   lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 });
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const test=await page.evaluate(shore=>{
  const w=window.__epochTestWorld,B=window.BABYLON;
  const start=w.terrain.waterAt(0,0);
  const shallow=w.terrain.waterAt(shore+2,0),deep=w.terrain.waterAt(shore+55,0);
  w.player.position.x=shore+14;w.player.position.z=0;
  w.player.position.y=w.groundY(shore+14,0);
  w.terrain.update(shore+14,0);
  const first=w.terrain.status;
  const oceanMeshes=[...w.terrain.loaded.values()].filter(c=>c.hasOcean&&c.waterMesh);
  const seaColor=oceanMeshes.flatMap(c=>Array.from(c.waterMesh.getVerticesData(B.VertexBuffer.ColorKind)||[]));
  const underWaterResources=w.entities.filter(e=>w.terrain.waterAt(e.x,e.z).depth>.12).length;
  w.player.position.x=shore+350;w.player.position.z=0;
  w.player.position.y=w.groundY(shore+350,0);
  w.terrain.update(shore+350,0);
  const offshore=w.terrain.status;
  const distant=[...w.terrain.loaded.values()].filter(c=>c.waterMesh);
  return {start,shallow,deep,first,offshore,oceanMeshes:oceanMeshes.length,
   hasMarineBlue:seaColor.some((n,i)=>i%4===2&&n>1.06),
   underWaterResources,offshoreMeshes:distant.length,
   someLowRes:distant.some(c=>c.waterMesh.getIndices().length<600),
   deepBlocked:w.isBlocked(shore+55,0),
   shallowBlocked:w.isBlocked(shore+2,0)};
 },shore);
 assert.equal(test.start.depth,0);
 assert.equal(test.shallow.kind,"ocean");
 assert(test.shallow.passable&&!test.shallowBlocked);
 assert.equal(test.deep.kind,"ocean");
 assert(test.deepBlocked&&!test.deep.passable);
 assert(test.oceanMeshes>0&&test.hasMarineBlue,"ocean uses the marine color palette");
 assert.equal(test.underWaterResources,0);
 assert.equal(test.first.loaded,25);
 assert.equal(test.offshore.loaded,25);
 assert(test.offshore.oceanChunks>=20,"farther east should become entirely open sea");
 assert(test.offshoreMeshes>0&&test.someLowRes,
  "offshore water uses reduced-complexity meshes");
 assert.deepEqual(errors,[],"ocean exploration must not trigger runtime errors");
 console.log("PASS browser ocean: eastern coastline, coastal wading, sea collision, marine colors and streaming");
}finally{await browser.close()}
