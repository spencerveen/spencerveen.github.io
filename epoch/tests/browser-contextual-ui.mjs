import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {forestObjects} from "../js/forest-generation.js";
import {launchBrowser,gameUrl,continueGame,clickWorldObject} from "./browser-helpers.mjs";

const output=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"artifacts");
fs.mkdirSync(output,{recursive:true});
const seed=12000;
const removed=Object.fromEntries(Array.from({length:9},(_,i)=>forestObjects(seed,i%3-1,Math.floor(i/3)-1)).flat().map(o=>[o.id,{remaining:0,removed:true,regrowAt:0}]));
const fixture={version:1,worldSeed:seed,hero:{name:"Context Founder"},knowledge:40,culture:30,
 technologies:["fire"],civics:[],skills:{woodcutting:500},resourceNodes:removed,
 inventory:[{id:"wood",qty:12},{id:"wood",qty:12},{id:"stone",qty:12},{id:"stone",qty:12},{id:"berries",qty:12},{id:"vines",qty:2},null,null,null,null],
 village:{population:5,plots:{},stockpile:{x:0,z:8,items:{wood:120,stone:120,berries:60,vines:20}},buildings:[
  {id:"test_home",kind:"family",x:-10,z:4,turn:0},
  {id:"test_lore",kind:"lore",x:8,z:4,turn:1},
  {id:"test_council",kind:"council",x:-2,z:-10,turn:2},
  {id:"test_hearth",kind:"hearth",x:-12,z:-10,turn:0}
 ]}};

const browser=await launchBrowser();
try{
 const titlePage=await browser.newPage({viewport:{width:1280,height:900},ignoreHTTPSErrors:true});
 await titlePage.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await titlePage.locator('[data-menu="new"]').waitFor({timeout:45000});
 assert(await titlePage.evaluate(()=>document.activeElement.dataset.menu==="new"),"a fresh title screen focuses its first available action");
 assert(await titlePage.evaluate(()=>["scene","left","hud-tools","right","toggle"].every(id=>!!document.getElementById(id).closest("[inert]"))),"title screen makes background game controls inert");
 await titlePage.keyboard.press("Tab");
 assert(await titlePage.evaluate(()=>!document.activeElement.closest("header,#hud-tools,#left,#right,#scene")),"Tab cannot enter the title screen's background controls");
 await titlePage.locator('[data-menu="new"]').click();
 await titlePage.locator('[data-menu="pick-new"][data-slot="2"]').click();
 await titlePage.locator("#founder-name").fill("Keyboard Founder");
 const hairArrow=titlePage.locator('[data-menu="appearance"][data-field="hairStyle"][data-dir="1"]');
 const initialHair=await hairArrow.locator("..").locator("b").innerText();
 await hairArrow.focus();
 await titlePage.keyboard.press("Enter");
 assert(await hairArrow.evaluate(n=>document.activeElement===n),"changing appearance restores focus to the same arrow");
 assert.notEqual(await hairArrow.locator("..").locator("b").innerText(),initialHair,"the focused creator arrow updates its option");
 assert.equal(await titlePage.locator("#founder-name").inputValue(),"Keyboard Founder");
 await titlePage.keyboard.press("Enter");
 assert(await hairArrow.evaluate(n=>document.activeElement===n),"repeated keyboard appearance changes retain focus");
 await titlePage.close();

 const page=await browser.newPage({viewport:{width:1280,height:900},ignoreHTTPSErrors:true});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 await page.addInitScript(data=>{
  if(!localStorage.getItem("epoch.stoneage.slot.1")){
   localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({...data,lastSavedAt:Date.now()}));
   localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
  }
 },fixture);
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page,{model:true});
 await page.waitForFunction(()=>!!window.epochDebug().ui,null,{timeout:10000});
 assert.equal((await page.evaluate(()=>window.epochDebug().ui)).panelOpen,false,"exploration begins without an open panel");
 assert.deepEqual(await page.locator("[data-tab]").evaluateAll(nodes=>nodes.map(n=>n.dataset.tab)),["pack","skills"],"only Inventory and Skills are global tabs");

 // The HUD must not steal mouse orbit, zoom or keyboard camera input.
 await page.locator("#scene").focus();
 const readCamera=()=>page.evaluate(()=>{const c=window.__epochTestWorld.camera;return {alpha:c.alpha,beta:c.beta,radius:c.radius}});
 const orbitStart=await readCamera();
 await page.mouse.move(630,460);
 await page.mouse.down({button:"right"});
 await page.mouse.move(730,500,{steps:8});
 await page.mouse.up({button:"right"});
 await page.waitForTimeout(160);
 const orbitEnd=await readCamera();
 assert(Math.abs(orbitEnd.alpha-orbitStart.alpha)>.03,"right mouse drag orbits the camera");
 await page.evaluate(()=>window.__epochTestWorld.update(1/30));
 assert(Math.abs((await readCamera()).alpha-orbitEnd.alpha)<.005,"following the player must not reset camera rotation");
 await page.mouse.wheel(0,450);
 await page.waitForTimeout(160);
 assert(Math.abs((await readCamera()).radius-orbitEnd.radius)>.1,"mouse wheel zooms the camera");
 const arrowStart=await readCamera();
 await page.keyboard.press("ArrowRight");
 assert(Math.abs((await readCamera()).alpha-arrowStart.alpha)>.05,"arrow key orbit remains available outside build mode");

 await page.locator('[data-tab="pack"]').click();
 assert.equal(await page.locator(".pack-slot").count(),10);
 assert.equal(await page.locator('[data-action="chop-bush"]').count(),0,"no bush-cut control in Inventory");
 assert.equal(await page.locator('[data-action="open-village"]').count(),0,"Inventory does not bypass the stockpile");
 await page.locator("#close-panel").click();

 // Click actual world meshes: no UI method or mutation hook opens these panels.
 await clickWorldObject(page,{buildingId:"test_lore",beforeClick:async current=>{
  const queued=await current.evaluate(()=>{
   const w=window.__epochTestWorld,p=w.player.position;
   w.plan(p.x+12,p.z+12);
   w.target={resource:"wood",label:"Previous gathering target",x:p.x+12,z:p.z+12,resourceId:"previous-target"};
   return {path:w.path.length,hasTarget:!!w.target};
  });
  assert(queued.path>0&&queued.hasTarget,"precondition: travel and a gather target are queued before clicking the building");
 }});
 await page.waitForFunction(()=>window.epochDebug().ui.context==="tech",null,{timeout:5000});
 assert.deepEqual(await page.evaluate(()=>({path:window.__epochTestWorld.path.length,target:window.__epochTestWorld.target})),{path:0,target:null},"opening a building cancels the previous travel and gather intent");
 assert.equal((await page.evaluate(()=>window.epochDebug().ui)).sourceBuildingId,"test_lore");
 await page.locator('[data-action="unlock"][data-kind="tech"][data-key="tools"]').click();
 assert((await page.evaluate(()=>window.epochDebug().technologies)).includes("tools"),"Technology opens from the Toolmaker and researches normally");
 await page.screenshot({animations:"disabled",path:path.join(output,"epoch-context-technology.png")});
 await page.locator("#close-panel").click();

 await clickWorldObject(page,{buildingId:"test_council"});
 await page.waitForFunction(()=>window.epochDebug().ui.context==="culture",null,{timeout:5000});
 await page.locator('[data-action="unlock"][data-kind="civic"][data-key="community"]').click();
 assert((await page.evaluate(()=>window.epochDebug().civics)).includes("community"),"Council Lodge opens Culture and unlocks the first civic");
 await page.screenshot({animations:"disabled",path:path.join(output,"epoch-context-culture.png")});
 await page.locator("#close-panel").click();

 await clickWorldObject(page,{buildingId:"test_home"});
 await page.waitForFunction(()=>window.epochDebug().ui.context==="dynasty",null,{timeout:5000});
 const generation=await page.evaluate(()=>window.epochDebug().generation);
 await page.locator('[data-action="next"]').click();
 assert(await page.locator("#modal").isVisible(),"succession asks before replacing the character");
 assert.equal(await page.evaluate(()=>window.epochDebug().generation),generation);
 await page.locator('[data-action="cancel-dialog"]').click();
 assert.equal(await page.evaluate(()=>window.epochDebug().generation),generation,"cancel preserves the current generation");
 await page.locator('[data-action="next"]').click();
 await page.locator('[data-action="confirm-next"]').click();
 assert.equal(await page.evaluate(()=>window.epochDebug().generation),generation+1,"confirm advances the dynasty once");
 assert.equal((await page.evaluate(()=>window.epochDebug().settlement.buildings)).length,4,"succession preserves the physical village");
 await page.screenshot({animations:"disabled",path:path.join(output,"epoch-context-dynasty.png")});
 await page.locator("#close-panel").click();

 // Help and menu are available independently of the village buildings.
 await page.locator("#toggle").click();
 assert(await page.locator('[data-action="save"]').isVisible());
 assert(await page.locator('[data-action="title"]').isVisible());
 await page.locator('[data-action="help"]').click();
 const positionBefore=await page.evaluate(()=>window.epochDebug().position);
 await page.keyboard.down("w");
 await page.evaluate(()=>{const w=window.__epochTestWorld;for(let i=0;i<40;i++)w.update(.045)});
 await page.keyboard.up("w");
 assert.deepEqual(await page.evaluate(()=>window.epochDebug().position),positionBefore,"Help suppresses world movement keys");
 await page.keyboard.press("Tab");
 assert(await page.evaluate(()=>!!document.activeElement.closest("#modal")),"keyboard focus stays inside the open dialog");
 await page.locator("#close-modal").click();
 // The menu's input isolation must not leave the camera disconnected.
 const afterMenuBefore=await readCamera();
 await page.mouse.move(640,460);
 await page.mouse.down({button:"right"});
 await page.mouse.move(730,460,{steps:7});
 await page.mouse.up({button:"right"});
 await page.waitForTimeout(160);
 assert(Math.abs((await readCamera()).alpha-afterMenuBefore.alpha)>.03,"camera orbit resumes after closing the game dialog");

 await clickWorldObject(page,{stockpile:true});
 await page.waitForFunction(()=>window.epochDebug().ui.context==="village",null,{timeout:5000});
 const deposit=page.locator('[data-action="deposit-stockpile"][data-item="wood"]');
 assert.equal(await deposit.isDisabled(),false,"stockpile opens with working resource transfers");
 await page.locator("#panel").focus();
 await page.evaluate(()=>{const w=window.__epochTestWorld;w.keys.s=true;for(let i=0;i<65;i++)w.update(1/60);w.keys.s=false});
 assert.equal(await deposit.isDisabled(),true,"leaving stockpile range disables transfer without changing tabs");
 assert(await page.locator("#panel").evaluate(n=>document.activeElement===n),"proximity refresh keeps focus on the panel instead of selecting an arbitrary action");
 await page.evaluate(()=>{const w=window.__epochTestWorld;w.keys.w=true;for(let i=0;i<65;i++)w.update(1/60);w.keys.w=false});
 assert.equal(await deposit.isDisabled(),false,"walking back into range refreshes transfer controls");
 assert(await page.locator("#panel").evaluate(n=>document.activeElement===n),"returning into range preserves panel focus too");

 await page.locator('[data-action="village-section"][data-section="build"]').click();
 await page.locator('[data-action="start-building"][data-kind="family"]').click();
 await page.mouse.click(450,650);
 const pinned=await page.evaluate(()=>({candidate:{...window.epochDebug().settlement.buildingCandidate},pinned:window.__epochTestWorld.placementPinned}));
 assert(pinned.pinned,"a terrain click pins the selected placement");
 await page.mouse.move(550,700);
 assert.deepEqual(await page.evaluate(()=>window.epochDebug().settlement.buildingCandidate),pinned.candidate,"moving toward controls preserves the clicked location");
 await page.mouse.down({button:"right"});await page.mouse.move(620,620,{steps:5});await page.mouse.up({button:"right"});
 assert.deepEqual(await page.evaluate(()=>window.epochDebug().settlement.buildingCandidate),pinned.candidate,"orbiting the camera preserves placement");
 await page.locator('[data-tab="pack"]').click();
 assert.equal(await page.evaluate(()=>window.epochDebug().settlement.placingBuilding),null,"personal tabs cancel the previous construction mode");
 assert.equal(await page.evaluate(()=>window.__epochTestWorld.focusTarget),null,"leaving construction restores the follow-camera target");
 await page.locator("#close-panel").click();

 for(const [width,height] of [[768,1024],[390,844],[320,640]]){
  await page.setViewportSize({width,height});
  await clickWorldObject(page,{stockpile:true});
  await page.locator('[data-action="village-section"][data-section="build"]').click();
  await page.locator("#panel").evaluate(n=>n.scrollTop=n.scrollHeight);
  await page.locator('[data-action="start-building"][data-kind="family"]').click();
  assert.equal(await page.locator("#panel").evaluate(n=>n.scrollTop),0,"entering placement starts at the controls rather than the old catalog scroll position");
  const layout=await page.evaluate(()=>{
   const panel=document.querySelector("#right").getBoundingClientRect();
   const buttons=[...document.querySelectorAll("#hud-tools button")].map(n=>n.getBoundingClientRect());
   const placement=[...document.querySelectorAll(".village-placement-controls button")].map(n=>n.getBoundingClientRect());
   return {panel:{top:panel.top,bottom:panel.bottom,left:panel.left,right:panel.right,height:panel.height},buttons:buttons.map(r=>({width:r.width,height:r.height,bottom:r.bottom})),placement:placement.map(r=>({left:r.left,right:r.right,width:r.width})),width:innerWidth,height:innerHeight};
  });
  assert(layout.panel.left>=0&&layout.panel.right<=width+1,"construction sheet fits "+width+"px viewport");
  if(width<=600)assert(layout.panel.height<=height*.46,"mobile placement leaves most terrain visible");
  assert(layout.buttons.every(b=>b.width>=44&&b.height>=44&&b.bottom<=height),"personal controls remain touchable");
  assert.equal(new Set(layout.placement.map(r=>Math.round(r.left))).size,5,"four direction controls and rotation occupy distinct columns");
  assert(layout.placement.every(r=>r.width>=44&&r.left>=layout.panel.left&&r.right<=layout.panel.right),"all placement controls fit inside the sheet");
  await page.screenshot({animations:"disabled",path:path.join(output,"epoch-context-build-"+width+".png")});
  await page.locator('[data-action="cancel-building"]').click();
  await page.locator("#close-panel").click();
 }
 assert.deepEqual(errors,[],"contextual UI flows have no page errors");
 console.log("BROWSER CONTEXT PASS",JSON.stringify({globalTabs:2,buildingInterfaces:["technology","culture","dynasty"],stockpileTransfers:true,successionConfirmation:true,modalInputIsolation:true,pinnedPlacement:true,titleFocus:true,creatorFocus:true,panelFocus:true,queuedTravelCancelled:true,mobileWidths:[768,390,320]}));
}catch(error){console.error("Contextual UI regression failed:",error);throw error}
finally{await browser.close()}
