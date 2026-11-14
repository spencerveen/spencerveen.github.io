import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame} from "./browser-helpers.mjs";
import {coastlineX} from "../js/ocean-generation.js";
import {beachAt,beachFlintSites} from "../js/beach-generation.js";
import {chunkCoord} from "../js/forest-generation.js";
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
 assert(!test.deepBlocked&&!test.deep.passable,
  "deep sea uses swimming instead of blocking player movement");
 assert(test.oceanMeshes>0&&test.hasMarineBlue,"ocean uses the marine color palette");
 assert.equal(test.underWaterResources,0);
 assert.equal(test.first.loaded,81);
 assert.equal(test.offshore.loaded,81);
 assert(test.offshore.oceanChunks>=20,"farther east should become entirely open sea");
 assert(test.offshoreMeshes>0&&test.someLowRes,
  "offshore water uses reduced-complexity meshes");
 // Shared image tiles must load, animate and cover both terrain and water.
 const textureCheck=await page.evaluate(()=>{
  const w=window.__epochTestWorld,B=window.BABYLON;
  const map=[...w.terrain.loaded.values()];
  const ground=map[0].mesh,sea=map.find(c=>c.waterMesh)?.waterMesh;
  const uv=ground.getVerticesData(B.VertexBuffer.UVKind);
  const biome=ground.getVerticesData(B.VertexBuffer.UV2Kind);
  const waterUV=sea?.getVerticesData(B.VertexBuffer.UVKind);
  const start=w.m.waterTexture.uOffset;
  w.update(.045);
  return {grass:w.m.grassTexture.isReady(),sand:w.m.sandTexture.isReady(),
   water:w.m.waterTexture.isReady(),
   groundShader:ground.material===w.m.terrainSurface&&
    w.m.terrainSurface.getClassName()==="ShaderMaterial",
   groundEffect:w.m.terrainSurface.getEffect()?.isReady()||false,
   waterMapped:sea?.material===w.m.river,
   groundUV:uv?.length,biomeUV:biome?.length,waterUV:waterUV?.length,
   drift:w.m.waterTexture.uOffset-start,
   images:[w.m.grassTexture.url,w.m.sandTexture.url,w.m.waterTexture.url]};
 });
 assert(textureCheck.grass&&textureCheck.sand&&textureCheck.water,
  "generated grass/sand/water tiles must load: "+JSON.stringify(textureCheck));
 assert(textureCheck.groundShader&&textureCheck.groundEffect&&textureCheck.waterMapped,
  "terrain shader and water material must render with textures: "+JSON.stringify(textureCheck));
 assert(textureCheck.groundUV>0&&textureCheck.biomeUV>0&&textureCheck.waterUV>0);
 assert(textureCheck.drift>0,"water UV texture drifts over time");
 // Go to a deterministic beach-flint shard and check the actual rendered
 // chunk, harvestable meshes and absence of trunks/canopies over sandy dunes.
 let piece=null;
 for(let z=-330;z<=330&&!piece;z+=20){
  const at=chunkCoord(coastlineX(z,seed)-45,z);
  for(let dx=-2;dx<=2&&!piece;dx++)for(let dz=-2;dz<=2&&!piece;dz++){
   piece=beachFlintSites(seed,at.cx+dx,at.cz+dz)[0]||null;
  }
 }
 assert(piece,"seeded starter coast should have at least one piece of flint");
 const shoreScene=await page.evaluate(({x,z,id})=>{
  const w=window.__epochTestWorld;
  w.player.position.x=x;w.player.position.z=z;
  w.player.position.y=w.groundY(x,z);
  w.terrain.update(x,z);
  const flint=w.entities.find(e=>e.resource==="flint"&&e.resourceId===id);
  const trees=w.entities.filter(e=>e.shape==="tree")
   .map(e=>({x:e.x,z:e.z}));
  const berries=w.entities.filter(e=>e.shape==="bush")
   .map(e=>({x:e.x,z:e.z}));
  const remaining=flint?w.getResourceStatus(flint)?.remaining:null;
  let after=null;
  if(flint){
   w.cooldown=0;
   w.collect(flint);
   after=w.getResourceStatus(flint)?.remaining;
  }
  return {found:!!flint,pickable:flint?.mesh?.isPickable,
   remaining,after,trees,berries};
 },piece);
 assert(shoreScene.found&&shoreScene.pickable,"flint must appear as a clickable 3D world resource");
 assert.equal(shoreScene.remaining,2);
 assert.equal(shoreScene.after,1,"beach flint gathering enters the real survival and inventory system");
 for(const obj of [...shoreScene.trees,...shoreScene.berries])
  assert(!beachAt(obj.x,obj.z,seed).vegetationClear,
   "trees and bushes must stay behind the full dune buffer");
 assert.deepEqual(errors,[],"ocean and beach exploration must not trigger runtime errors");
 console.log("PASS browser ocean: seawater, broad treeless beaches, clickable flint collection and streamed terrain");
}finally{await browser.close()}
