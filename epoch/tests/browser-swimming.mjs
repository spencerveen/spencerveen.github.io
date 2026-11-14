import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame} from "./browser-helpers.mjs";
import {riverCenter,waterAt} from "../js/water-generation.js";
import {chunkCoord} from "../js/forest-generation.js";
import {tribeAtChunk} from "../js/tribes.js";
const seed=12000;
const crossings=[];
for(let x=155;x<=420;x+=11){
 const z=riverCenter(x,0,seed),{cx,cz}=chunkCoord(x,z),sites=[];
 for(let dx=-5;dx<=5;dx++)for(let dz=-5;dz<=5;dz++){
  const t=tribeAtChunk(seed,cx+dx,cz+dz);
  if(t)sites.push({x:t.x,z:t.z,radius:10});
 }
 if(waterAt(x,z,seed,sites).depth>1.1&&
  waterAt(x,z-14,seed,sites).depth===0&&
  waterAt(x,z+14,seed,sites).depth===0)crossings.push({x,z});
}
assert(crossings.length>0,"a suitable river crossing exists");
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
 const crossed=await page.evaluate(crossings=>{
  const w=window.__epochTestWorld;
  // Forest props remain solid. Select a real bank-to-bank route clear of
  // trees/rocks so the test measures swimming, not colliding with a tree.
  let route=null;
  for(const candidate of crossings){
   const {x,z}=candidate;
   w.terrain.update(x,z);
   let clear=true;
   for(let dz=-14;dz<=14;dz+=.4){
    if(w.isBlocked(x,z+dz)){clear=false;break;}
   }
   if(clear){route=candidate;break;}
  }
  if(!route)return {problem:"No obstacle-free river crossing",count:crossings.length};
  const {x,z}=route;
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
   encounteredDeep,maxError,loaded:w.terrain.loaded.size,mode:w.waterMotion,
   route,blockedAtStart:w.isBlocked(x,z-14)};
 },crossings);
 assert(!crossed.problem,JSON.stringify(crossed));
 assert(crossed.encounteredDeep,"player enters river: "+JSON.stringify(crossed));
 assert(crossed.z>crossed.route.z+8,"WASD crosses deep water: "+JSON.stringify(crossed));
 assert(crossed.remaining<crossed.initial-2,"swimming consumes stamina");
 assert(crossed.maxError<.001,"character floats at sampled waterline");
 assert.equal(crossed.loaded,25);
 assert.deepEqual(errors,[]);
 console.log("PASS browser swimming: crossed river, spent stamina and floated at the waterline");
}finally{await browser.close()}
