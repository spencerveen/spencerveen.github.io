import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame,clickWorldObject} from "./browser-helpers.mjs";
import {tribeAtChunk,starterTribeChunk} from "../js/tribes.js";

const seed=12000;
const [cx,cz]=starterTribeChunk(seed);
const tribe=tribeAtChunk(seed,cx,cz);
assert(tribe,"the seeded wilderness must contain an accessible starter tribe");
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];
 page.on("pageerror",err=>errors.push(String(err)));
 await page.addInitScript(data=>{
  if(!localStorage.getItem("epoch.stoneage.slot.1")){
   localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({...data,lastSavedAt:Date.now()}));
   localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
  }
 },{version:1,worldSeed:seed,hero:{name:"Tribe Explorer"},village:{population:1,
  plots:{},buildings:[],stockpile:{x:0,z:8,items:{wood:0,stone:0,berries:0,vines:0}}},tribes:{}});
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page,{model:true});
 assert.equal((await page.evaluate(()=>window.epochDebug())).villagerCount,0,"the founding village is still just the player");
 await page.evaluate(site=>{
  const w=window.__epochTestWorld;
  // Fast-forward walking for test coverage while exercising the real chunk
  // streamer, render graph and state discovery logic.
  w.player.position.x=site.x+9;w.player.position.z=site.z+9;
  w.terrain.update(w.player.position.x,w.player.position.z);
  for(let i=0;i<45;i++)w.update(1/60);
 },tribe);
 await page.waitForFunction(id=>window.epochDebug()?.tribes?.discovered?.includes(id),tribe.id,{timeout:12000});
 const discovered=await page.evaluate(()=>window.epochDebug());
 assert.equal(discovered.tribes.discovered.filter(id=>id===tribe.id).length,1);
 assert(discovered.tribes.loaded.some(t=>t.id===tribe.id),"the same seeded camp renders in its forest chunk");
 assert(discovered.tribes.renderedCharacters>=tribe.population,"all generated people exist as world actors");
 const save=await page.evaluate(id=>JSON.parse(localStorage.getItem("epoch.stoneage.slot.1")).tribes[id],tribe.id);
 assert.equal(save.status,"active");
 assert.equal(save.discovered,true);
 assert.equal(save.discoveredYear,-12000);
 // A real canvas click on the leader sign/huts should initiate approach.
 await clickWorldObject(page,{tribeId:tribe.id});
 await page.evaluate(()=>{
  const w=window.__epochTestWorld;
  for(let i=0;i<350 && !document.querySelector("#modal:not(.hidden)");i++)w.update(.045);
 });
 await page.locator("#modal:not(.hidden)").waitFor({timeout:9000});
 const title=await page.locator("#dialog-title").innerText();
 const text=await page.locator("#guide").innerText();
 assert.equal(title,tribe.name,"the clicked camp opens the correct encounter");
 assert(text.includes(tribe.members[0].name),"the tribal leader has a persistent identity");
 assert(text.includes(String(tribe.population)),"encounter lists the tribe's real population");
 assert(text.includes("exploration only"),"phase-one encounters do not pretend to enable recruiting or combat");
 assert.equal((await page.evaluate(()=>window.epochDebug())).settlement.population,1,"meeting outsiders does not recruit anyone");
 await page.locator('[data-action="resume"]').click();
 assert.equal(await page.locator("#modal").isVisible(),false);
 // Moving far away unloads the camp, including its skinned NPC instances.
 await page.evaluate(site=>{
  const w=window.__epochTestWorld;
  w.player.position.x=site.x+200;w.player.position.z=site.z+200;
  w.terrain.update(w.player.position.x,w.player.position.z);
  w.update(1/60);
 },tribe);
 assert(!(await page.evaluate(id=>window.epochDebug().tribes.loaded.some(t=>t.id===id),tribe.id)),
  "streaming away disposes the tribal settlement");
 await page.evaluate(site=>{
  const w=window.__epochTestWorld;
  w.player.position.x=site.x+10;w.player.position.z=site.z+10;
  w.terrain.update(w.player.position.x,w.player.position.z);w.update(1/60);
 },tribe);
 assert((await page.evaluate(id=>window.epochDebug().tribes.loaded.find(t=>t.id===id),tribe.id)).members===tribe.population,
  "re-entering a forest chunk recreates the same tribe, not a duplicate");
 assert.equal((await page.evaluate(()=>window.epochDebug())).tribes.discovered.filter(id=>id===tribe.id).length,1);
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const restored=await page.evaluate(()=>window.epochDebug());
 assert(restored.tribes.discovered.includes(tribe.id),"discovered tribe stays discovered after reopening the save");
 assert.deepEqual(restored.tribes.records[tribe.id],save,"save/reload preserves discovery and status");
 await page.evaluate(site=>{
  const w=window.__epochTestWorld;
  w.player.position.x=site.x+9;w.player.position.z=site.z+9;
  w.terrain.update(w.player.position.x,w.player.position.z);w.update(1/60);
 },tribe);
 const afterReload=await page.evaluate(id=>window.epochDebug().tribes.loaded.find(t=>t.id===id),tribe.id);
 assert.equal(afterReload.name,tribe.name);
 assert.equal(afterReload.members,tribe.population);
 assert.deepEqual(errors,[],"tribe exploration produces no browser runtime errors");
 console.log("PASS browser tribes: seeded visible people, click-to-meet leader, persistent discovery, no recruitment, chunk unloading and reload");
}finally{await browser.close()}
