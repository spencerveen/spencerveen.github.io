import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame,clickWorldObject} from "./browser-helpers.mjs";
import {tribeAtChunk,starterTribeChunk} from "../js/tribes.js";

let chosen=null;
for(let seed=12000;seed<12050&&!chosen;seed++){
 const tribe=tribeAtChunk(seed,...starterTribeChunk(seed));
 if(tribe?.members.some(p=>p.familyRole==="child"))
  chosen={seed,tribe};
}
assert(chosen,"one nearby tribe should have a deterministic parent-child household");
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 await page.addInitScript(({seed})=>{
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:seed,year:-12000,
   hero:{name:"Explorer",age:25},
   village:{population:1,plots:{},buildings:[],residents:[],
    stockpile:{x:0,z:8,items:{wood:0,stone:0,vines:0,berries:0}}},
   survival:{health:100,stamina:100,hunger:100,gameOver:false},
   tribes:{},lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 },{seed:chosen.seed});
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 await page.evaluate(site=>{
  const w=window.__epochTestWorld;
  w.player.position.x=site.x+9;w.player.position.z=site.z+9;
  w.terrain.update(w.player.position.x,w.player.position.z);
  for(let i=0;i<35;i++)w.update(1/60);
 },chosen.tribe);
 await page.waitForFunction(id=>window.epochDebug()?.tribes?.loaded?.some(t=>t.id===id),
  chosen.tribe.id,{timeout:15000});
 const visible=await page.evaluate(id=>{
  const camp=[...window.__epochTestWorld.tribeCamps.values()]
   .find(c=>c.tribe.id===id);
  return {population:camp.tribe.population,
   familyVersion:camp.tribe.familyVersion,
   members:camp.tribe.members.map((m,i)=>({
    age:m.age,parents:m.parentIds||[],isChild:m.familyRole==="child",
    rootHeight:camp.humans[i].root.scaling.y
   }))};
 },chosen.tribe.id);
 assert.equal(visible.familyVersion,1);
 assert.equal(visible.members.length,visible.population);
 assert(visible.members.some(m=>m.isChild&&m.age<18));
 assert(visible.members.filter(m=>m.isChild).every(m=>m.parents.length>=1),
  "the rendered young characters have real saved family IDs");
 assert(visible.members.filter(m=>m.isChild).every(m=>m.rootHeight<1),
  "child actors appear smaller than ordinary adult-sized models");
 await clickWorldObject(page,{tribeId:chosen.tribe.id});
 await page.evaluate(()=>{
  const w=window.__epochTestWorld;
  for(let i=0;i<350&&!document.querySelector("#modal:not(.hidden)");i++)w.update(.045);
 });
 await page.locator("#modal:not(.hidden)").waitFor({timeout:9000});
 const intro=await page.locator("#guide").innerText();
 assert(intro.includes("Families in this tribe"));
 assert(intro.includes("child")||intro.includes("children"));
 assert(intro.includes("daughter of")||intro.includes("son of"));
 assert.deepEqual(errors,[],"family appearances and UI must not throw browser errors");
 console.log("PASS browser 7A.2A: visible child scaling, actual family members, parentage and tribal encounter UI");
}finally{await browser.close()}
