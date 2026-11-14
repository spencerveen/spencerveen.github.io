import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame} from "./browser-helpers.mjs";
import {chunkCoord} from "../js/forest-generation.js";
import {mountainAt} from "../js/mountain-generation.js";
import {mountainOutcropSites} from "../js/mountain-appearance.js";
import {waterAt,waterTerrainHeight} from "../js/water-generation.js";
const seed=12000;
const candidates=[];
const height=(x,z)=>waterTerrainHeight(x,z,seed);
const water=(x,z)=>waterAt(x,z,seed);
for(let x=-900;x<=900;x+=104)for(let z=-900;z<=900;z+=104){
 const mountain=mountainAt(x,z,seed);
 if(mountain.uplift<17||water(x,z).depth>.02)continue;
 const {cx,cz}=chunkCoord(x,z);
 let expected=0;
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)
  expected+=mountainOutcropSites(seed,cx+dx,cz+dz,height,water,[]).length;
 if(expected>=2)candidates.push({x,z,expected,uplift:mountain.uplift});
}
candidates.sort((a,b)=>b.expected-a.expected||b.uplift-a.uplift);
assert(candidates.length>0,"seed has rocky highlands to explore");
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];
 page.on("pageerror",error=>errors.push(String(error)));
 await page.addInitScript(()=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,waterProtectedSites:[],mountainProtectedSites:[],
   hero:{name:"Highland Explorer",age:18},village:{population:1,plots:{},buildings:[]},
   survival:{health:100,stamina:100,hunger:100,gameOver:false},lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 });
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const result=await page.evaluate(candidates=>{
  const w=window.__epochTestWorld,B=window.BABYLON;
  const seen=[];
  for(const site of candidates.slice(0,6)){
   w.player.position.x=site.x;
   w.player.position.z=site.z;
   w.player.position.y=w.groundY(site.x,site.z);
   w.terrain.update(site.x,site.z);
   const terrain=[...w.terrain.loaded.values()].map(c=>c.mesh);
   const rocks=w.scene.meshes.filter(m=>m.name.startsWith("Mountain outcrop ["));
   const palettes=terrain.flatMap(mesh=>Array.from(mesh.getVerticesData(B.VertexBuffer.ColorKind)||[]));
   const highlighted=palettes.some((v,i)=>i%4===0&&v>.43);
   if(rocks.length&&highlighted){
    const firstRock=rocks[0];
    const rockName=firstRock.name;
    const originName=firstRock.name;
    const firstChunk=[...w.terrain.loaded.values()].find(c=>c.vegetation.includes(firstRock));
    const originKey=firstChunk?.key;
    const rockReference=firstRock;
    w.player.position.x=site.x+600;w.player.position.z=site.z+600;
    w.player.position.y=w.groundY(w.player.position.x,w.player.position.z);
    w.terrain.update(w.player.position.x,w.player.position.z);
    return {site,rockCount:rocks.length,highlighted,rockUnpickable:rocks.every(m=>!m.isPickable),
     usesLayeredMaterial:terrain.every(mesh=>mesh.material===w.m.terrainSurface),
     loaded:w.terrain.status.loaded,originalRockDisposed:rockReference.isDisposed(),
     originalChunkUnloaded:originKey?!w.terrain.loaded.has(originKey):false,
     rockName,originName};
   }
   seen.push({x:site.x,z:site.z,rocks:rocks.length,highlighted});
  }
  return {problem:"No visibly rocky detailed highland found",seen};
 },candidates);
 assert(!result.problem,JSON.stringify(result));
 assert(result.rockCount>0&&result.highlighted);
 assert.equal(result.rockUnpickable,true,"stone formations are decoration, not harvestable resources");
 assert.equal(result.usesLayeredMaterial,true,"terrain uses the new rocky vertex palette");
 assert.equal(result.loaded,81,"streaming stays bounded");
 assert.equal(result.originalRockDisposed,true,"outcrops dispose on chunk unload");
 assert.equal(result.originalChunkUnloaded,true);
 assert.deepEqual(errors,[],"mountain meshes render without browser JavaScript exceptions");
 console.log("PASS browser mountain visuals: exposed rock palette, seeded stone outcrops and streaming disposal");
}finally{await browser.close();}
