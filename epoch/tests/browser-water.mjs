import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame} from "./browser-helpers.mjs";
import {riverCenter,waterAt} from "../js/water-generation.js";
import {chunkCoord} from "../js/forest-generation.js";
import {tribeAtChunk} from "../js/tribes.js";
const seed=12000;
const options=[];
for(let x=155;x<=420;x+=23)for(const channel of [-2,-1,0,1,2]){
 const z=riverCenter(x,channel,seed);
 const {cx,cz}=chunkCoord(x,z);
 const campSites=[];
 for(let dx=-5;dx<=5;dx++)for(let dz=-5;dz<=5;dz++){
  const tribe=tribeAtChunk(seed,cx+dx,cz+dz);
  if(tribe)campSites.push({x:tribe.x,z:tribe.z,radius:10});
 }
 // Streaming protects historic tribal camps from flooding. Choose water
 // that stays deep after those protection sites are loaded for the chunk.
 if(waterAt(x,z,seed,campSites).depth>1.1)options.push({x,z});
}
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,waterProtectedSites:[],year:-12000,
   hero:{name:"River Explorer",age:18},village:{population:1,plots:{},buildings:[]},
   survival:{health:100,stamina:100,hunger:100,foodSeconds:0,gameOver:false,deathCount:0},
   lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 });
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const initial=await page.evaluate(()=>({
  origin:window.__epochTestWorld.terrain.waterAt(0,0),
  chunkCount:window.__epochTestWorld.terrain.loaded.size,
  seed:window.epochDebug().forest.seed
 }));
 assert.equal(initial.seed,seed);
 assert.equal(initial.origin.depth,0,"original settlement clearing is still dry");
 assert.equal(initial.chunkCount,25);
 const check=await page.evaluate(options=>{
  const w=window.__epochTestWorld;
  const deep=options.find(p=>w.terrain.waterAt(p.x,p.z).depth>1);
  if(!deep)return {problem:"No unprotected deep river found"};
  const sample=w.terrain.waterAt(deep.x,deep.z);
  w.player.position.x=deep.x;w.player.position.z=deep.z;
  w.player.position.y=w.groundY(deep.x,deep.z);
  w.terrain.update(deep.x,deep.z);
  const status=w.terrain.status;
  const water=[...w.terrain.loaded.values()].filter(c=>c.waterMesh);
  const colors=water.flatMap(c=>Array.from(c.waterMesh.getVerticesData(BABYLON.VertexBuffer.ColorKind)||[]));
  return {deep,sample,status,waterMeshes:water.length,
   waterPickable:water.some(c=>c.waterMesh.isPickable),
   waterLayerCorrect:water.every(c=>c.waterMesh.renderingGroupId===0),
   hasWaterAlpha:colors.some((v,i)=>i%4===3&&v>.3),
   blocked:w.isBlocked(deep.x,deep.z),
   renderWaterCount:w.scene.meshes.filter(m=>m.name.startsWith("Water [")).length};
 },options);
 assert(!check.problem,JSON.stringify(check));
 assert(check.sample.depth>1&&check.sample.kind!=="land");
 assert.equal(check.blocked,false,"deep water no longer forms an invisible movement wall");
 assert.equal(check.status.loaded,81);
 assert(check.waterMeshes>0,"some streamed chunks contain visible water");
 assert.equal(check.waterPickable,false,"water does not intercept world object interactions");
 assert.equal(check.waterLayerCorrect,true,"water shares the depth buffer with trees and characters");
 assert(check.hasWaterAlpha,"water mesh uses nonzero transparency colors");
 assert.equal(check.renderWaterCount,check.waterMeshes,"water meshes do not multiply in a chunk");

 const reload=await page.evaluate(pos=>{
  const w=window.__epochTestWorld;
  const original=w.terrain.waterAt(pos.x,pos.z);
  const firstKey=w.terrain.center.cx+","+w.terrain.center.cz;
  w.player.position.x=pos.x+195;w.player.position.z=pos.z+30;
  w.player.position.y=w.groundY(w.player.position.x,w.player.position.z);
  w.terrain.update(w.player.position.x,w.player.position.z);
  const far=w.terrain.status;
  w.player.position.x=pos.x;w.player.position.z=pos.z;
  w.player.position.y=w.groundY(pos.x,pos.z);
  w.terrain.update(pos.x,pos.z);
  const returned=w.terrain.status;
  return {original,after:w.terrain.waterAt(pos.x,pos.z),far,returned,
   waterCount:w.scene.meshes.filter(m=>m.name.startsWith("Water [")).length};
 },check.deep);
 assert.deepEqual(reload.after,reload.original,"water remains exactly where it was after streaming away and back");
 assert.equal(reload.far.loaded,81);
 assert.equal(reload.returned.loaded,81);
 assert.equal(reload.waterCount,reload.returned.waterChunks,"water meshes are correctly disposed on streaming");
 assert.deepEqual(errors,[],"rivers render without JavaScript errors");
 console.log("PASS browser 4B.2: rendered river mesh, deep-water collision, dry starter, seamless streaming and cleanup");
}finally{
 await browser.close();
}
