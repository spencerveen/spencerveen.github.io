import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame} from "./browser-helpers.mjs";
import {riverCenter,waterAt} from "../js/water-generation.js";
import {chunkCoord} from "../js/forest-generation.js";
import {tribeAtChunk} from "../js/tribes.js";
const seed=12000;
let crossing=null;
for(let x=155;x<=420&&!crossing;x+=23){
 const z=riverCenter(x,0,seed),{cx,cz}=chunkCoord(x,z),sites=[];
 for(let dx=-5;dx<=5;dx++)for(let dz=-5;dz<=5;dz++){
  const t=tribeAtChunk(seed,cx+dx,cz+dz);
  if(t)sites.push({x:t.x,z:t.z,radius:10});
 }
 if(waterAt(x,z,seed,sites).depth>1.1&&
  waterAt(x,z-14,seed,sites).depth===0&&
  waterAt(x,z+14,seed,sites).depth===0)crossing={x,z};
}
assert(crossing,"a suitable river crossing exists");
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,hero:{name:"Swimmer",age:18},
   waterProtectedSites:[],mountainProtectedSites:[],oceanProtectedSites:[],
   village:{population:1,buildings:[],plots:{},residents:[]},
   survival:{health:100,stamina:100,hunger:100,gameOver:false,deathCount:0},
   lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 });
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const crossed=await page.evaluate(({x,z})=>{
  const w=window.__epochTestWorld;
  w.player.position.x=x;w.player.position.z=z-14;
  w.player.position.y=w.groundY(x,z-14);
  w.terrain.update(x,z-14);
  w.camera.alpha=-Math.PI/2;w.keys.w=true;w.keys.shift=false;
  const initial=w.getVitals().stamina;
  let encounteredDeep=false,maxError=0;
  for(let i=0;i<450&&w.player.position.z<z+14;i++){
   w.update(.045);
   const water=w.terrain.waterAt(w.player.position.x,w.player.position.z);
   if(water.depth>=.85){
    encounteredDeep=true;
    maxError=Math.max(maxError,Math.abs(w.player.position.y-
     Math.max(w.groundY(w.player.position.x,w.player.position.z),water.surfaceY-1.04)));
   }
  }
  w.keys.w=false;
  return {initial,remaining:w.getVitals().stamina,z:w.player.position.z,
   encounteredDeep,maxError,loaded:w.terrain.loaded.size,mode:w.waterMotion};
 },crossing);
 assert(crossed.encounteredDeep,"player enters river");
 assert(crossed.z>crossing.z+8,"WASD lets character cross deep water");
 assert(crossed.remaining<crossed.initial-2,"swimming consumes stamina");
 assert(crossed.maxError<.001,"character floats at sampled waterline");
 assert.equal(crossed.loaded,25);
 assert.deepEqual(errors,[]);
 console.log("PASS browser swimming: crossed river, spent stamina and floated at the waterline");
}finally{await browser.close()}
