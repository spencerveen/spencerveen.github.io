import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";
import {forestObjects} from "../js/forest-generation.js";

const output=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"artifacts");
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({
 channel:"chrome",headless:true,
 args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--disable-dev-shm-usage"]
});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
 // Fix the browser-test forest seed so navigation checks do not change with
 // random terrain. Do not overwrite a save on subsequent reloads.
 await page.addInitScript(()=>{
  if(!localStorage.getItem("epoch.stoneage.v1"))
   localStorage.setItem("epoch.stoneage.v1",JSON.stringify({version:1,worldSeed:1095757445,hero:{name:"Test Founder"}}));
 });
 const errors=[],warnings=[];
 page.on("pageerror",error=>errors.push(error.stack||String(error)));
 page.on("console",msg=>{if(msg.type()==="error")warnings.push(msg.text())});
 page.on("requestfailed",request=>warnings.push(request.url()+" "+request.failure()?.errorText));
 await page.goto("http://127.0.0.1:8765/epoch/?browser-test=20261113n",{waitUntil:"domcontentloaded",timeout:45000});
 await page.locator('[data-menu="continue"]').waitFor({timeout:45000});
 assert(await page.locator("#start-screen").isVisible(),"title screen appears before world loads");
 assert.equal(await page.locator('[data-tab="appearance"]').count(),0,"no in-game character customization tab");
 assert.equal(await page.evaluate(()=>typeof window.epochDebug),"undefined","3D world is deferred until loading a save");
 assert((await page.locator("#start-screen").innerText()).includes("Legacy Ada")===false,"title uses actual migrated save data");
 await page.locator('[data-menu="continue"]').click();
 await page.waitForFunction(()=>typeof window.epochDebug==="function",{timeout:45000});
 await page.waitForFunction(()=>window.epochDebug()?.movement?.loaded===true,{timeout:45000});
 await page.waitForFunction(()=>document.querySelector("#loading")?.classList.contains("hidden"),{timeout:45000});
 await page.waitForFunction(()=>{
  const s=window.epochDebug();
  return !!s?.hairAttachment?.hairAttached
   && !!s.hairAttachment.beardAttached
   && s.npcAttachments?.length===4
   && s.npcAttachments.every(n=>n?.headFound && (!n.hairExpected||n.hairAttached) && (!n.beardExpected||n.beardAttached));
 },{timeout:45000});
 const idle=await page.evaluate(()=>window.epochDebug());
 assert.equal(idle.forest.loaded,25,"25 terrain chunks surround the player");
 assert.equal(idle.forest.detailed,9,"only nine nearby chunks contain forest meshes");
 assert(idle.forest.resources>=12,"the forest should provide gathering resources");
 assert(idle.forest.animals>=1,"deer still inhabit the forest");
 assert(Number.isInteger(idle.forest.seed),"the world seed is part of game state");
 assert.equal(idle.inventory.slots.length,10,"new player starts with ten slots");
 assert.equal(idle.inventory.used,0,"new player's inventory is empty");
 assert(idle.movement.matchedBones>=60,"should animate at least 60 Quaternius joints");
 assert(idle.hairAttachment.headFound && idle.hairAttachment.hairAttached,"player hair must be parented to the animated Head");
 assert(idle.hairAttachment.beardAttached,"player beard must follow the Head");
 assert(idle.npcAttachments.every(n=>n.headFound && (!n.hairExpected||n.hairAttached) && (!n.beardExpected||n.beardAttached)),"villager hair must attach to their own Head");
 assert.equal(idle.movement.mode,"idle","should start in idle stance");
 await page.screenshot({path:path.join(output,"epoch-idle.png")});
 await page.keyboard.down("w");
 await page.waitForFunction(()=>window.epochDebug()?.movement?.mode==="walk",{timeout:7000});
 await page.waitForTimeout(650);
 const walk=await page.evaluate(()=>window.epochDebug());
 assert(walk.hairAttachment.hairAttached && walk.hairAttachment.beardAttached,"hair and beard must stay head-attached while walking");
 await page.screenshot({path:path.join(output,"epoch-walk.png")});
 assert(Math.hypot(walk.position.x-idle.position.x,walk.position.z-idle.position.z)>.25,"player should physically move in world");
 await page.keyboard.down("Shift");
 await page.waitForFunction(()=>window.epochDebug()?.movement?.mode==="run",{timeout:7000});
 await page.waitForTimeout(300);
 const run=await page.evaluate(()=>window.epochDebug());
 assert(run.hairAttachment.hairAttached && run.hairAttachment.beardAttached,"hair and beard must remain attached during jogging");
 await page.screenshot({path:path.join(output,"epoch-jog.png")});
 await page.keyboard.up("Shift");await page.keyboard.up("w");
 await page.waitForFunction(()=>window.epochDebug()?.movement?.mode==="idle",{timeout:7000});
 await page.screenshot({path:path.join(output,"epoch-idle-after-walk.png")});
 // Exercise the inventory UI, including ten real clickable slots.
 await page.locator('[data-tab="pack"]').click();
 assert.equal(await page.locator(".pack-slot").count(),10,"pack shows ten slots");
 assert((await page.locator("#panel").innerText()).includes("12 per space"),"stack limit explained");
 await page.screenshot({path:path.join(output,"epoch-inventory-empty.png")});
 // Exercise the new settlement UI in a real GPU-backed Babylon scene.
 const status=await page.evaluate(()=>window.epochDebug());
 assert.equal(status.settlement.worldPlots,5,"all five village plots must exist in the world");
 assert.equal(status.settlement.capacity,5,"starting village holds five people");
 await page.locator('[data-tab="village"]').click();
 assert.equal((await page.evaluate(()=>window.epochDebug().settlement.stockpile.placed)),false,"new game starts without a founded home");
 assert.equal(await page.locator('[data-action="place-stockpile"]').count(),1,"players can choose home placement");
 await page.locator('[data-action="found-nearby-stockpile"]').click();
 await page.waitForFunction(()=>window.epochDebug()?.settlement?.stockpile?.placed===true,null,{timeout:6000});
 const founding=await page.evaluate(()=>window.epochDebug().settlement);
 assert.equal(founding.stockpile.used,0,"new founding stockpile starts empty");
 assert.equal(founding.worldPlotCenters.family_1.x,-8,"starter blueprint anchors to founding home");
 assert.equal(founding.worldPlotCenters.family_1.z,4,"old clearing template remains in place for nearby founding");
 await page.screenshot({path:path.join(output,"epoch-stockpile-founded.png")});
 assert.equal(await page.locator('[data-action="select-plot"]').count(),5,"five sites around stockpile");
 await page.locator('[data-action="select-plot"][data-plot="council_1"]').click();
 assert((await page.locator("#panel").innerText()).includes("Council Lodge"),"Council Lodge shows its details");
 await page.screenshot({path:path.join(output,"epoch-village-plots.png")});
 // Test actual construction through the public UI and click-to-walk workflow.
 // Before a reload, Epoch's pagehide handler saves the old in-memory state.
 // Seed the fresh document on its next load instead of writing too early.
 const starterObjects=Array.from({length:9},(_,i)=>forestObjects(idle.forest.seed,i%3-1,Math.floor(i/3)-1)).flat();
 const removedTree=starterObjects.find(o=>o.resource==="wood");
 const removedStone=starterObjects.find(o=>o.resource==="stone");
 const emptyBush=starterObjects.find(o=>o.resource==="food");
 assert(removedTree&&removedStone&&emptyBush,"test forest contains all three node types");
 await page.addInitScript(({treeId,stoneId,bushId})=>{
  const key="epoch.stoneage.slot.1",saved=JSON.parse(localStorage.getItem(key)||"{}");
  saved.version=1;
  saved.resourceNodes={
   [treeId]:{remaining:0,removed:true,regrowAt:0},
   [stoneId]:{remaining:0,removed:true,regrowAt:0},
   [bushId]:{remaining:0,removed:false,regrowAt:Date.now()+120000}
  };
  saved.inventory=Array.from({length:10},()=>null);
  saved.inventory[0]={id:"wood",qty:12};
  saved.inventory[1]={id:"wood",qty:12};
  saved.inventory[2]={id:"wood",qty:12};
  saved.inventory[3]={id:"wood",qty:8};
  saved.inventory[4]={id:"stone",qty:12};
  saved.inventory[5]={id:"stone",qty:12};
  saved.inventory[6]={id:"stone",qty:6};
  saved.inventory[7]={id:"berries",qty:2};
  saved.inventory[8]={id:"vines",qty:1};
  saved.unpacked={wood:0,stone:0,berries:0,vines:0};
  saved.resources={wood:44,stone:30,food:2,vines:1};
  localStorage.setItem(key,JSON.stringify(saved));
 },{treeId:removedTree.id,stoneId:removedStone.id,bushId:emptyBush.id});
 await page.reload({waitUntil:"domcontentloaded"});
 await page.locator('[data-menu="continue"]').waitFor({timeout:45000});
 assert(await page.locator("#start-screen").isVisible(),"reloading returns to title");
 await page.locator('[data-menu="continue"]').click();
 await page.waitForFunction(()=>window.epochDebug()?.settlement?.worldPlots===5,null,{timeout:45000});
 const reloadedForest=await page.evaluate(()=>window.epochDebug().forest);
 assert.equal(reloadedForest.seed,idle.forest.seed,"reloading must preserve the world seed");
 assert.equal(reloadedForest.loaded,25,"reload recreates exactly 25 visible terrain chunks");
 assert.equal(reloadedForest.detailed,9,"reload keeps detailed forest meshes bounded");
 assert.equal(reloadedForest.resources,idle.forest.resources-7,"felled tree and exhausted rock meshes do not respawn after reload");
 const nodes=await page.evaluate(()=>window.epochDebug().resourceNodes);
 assert.equal(nodes.removed,2,"two persistently removed resource nodes");
 assert.equal(nodes.depletedBerries,1,"depleted berry bush remains and awaits regrowth");
 const loadedResources=await page.evaluate(()=>window.epochDebug().resources);
 assert.equal(loadedResources.wood,44,"seeded wood stacks load");
 assert.equal(loadedResources.stone,30,"seeded stone stacks load");
 assert.equal(loadedResources.food,2,"berry stacks count as food");
 assert.equal(loadedResources.vines,1,"vines persist");
 await page.locator('[data-tab="pack"]').click();
 assert.equal(await page.locator(".pack-slot.occupied").count(),9,"nine distinct stacks visible after load");
 await page.screenshot({path:path.join(output,"epoch-inventory-filled.png")});
 await page.waitForFunction(()=>document.querySelector("#loading")?.classList.contains("hidden"),null,{timeout:45000});
 await page.locator('[data-tab="village"]').click();
 const stockpileBefore=await page.evaluate(()=>window.epochDebug().settlement.stockpile);
 assert.equal(stockpileBefore.used,0,"stored resources are independent of backpack");
 await page.locator('[data-action="return-stockpile"]').click();
 await page.waitForFunction(()=>{
  const s=window.epochDebug();
  return s?.settlement?.stockpile?.placed&&Math.hypot(s.position.x-s.settlement.stockpile.x,s.position.z-s.settlement.stockpile.z)<5;
 },null,{timeout:16000});
 await page.waitForFunction(()=>!document.querySelector('[data-action="deposit-all-stockpile"]')?.disabled,null,{timeout:8000});
 await page.locator('[data-action="deposit-all-stockpile"]').click();
 await page.waitForFunction(()=>window.epochDebug()?.settlement?.stockpile?.items?.wood===44,null,{timeout:7000});
 const stored=await page.evaluate(()=>window.epochDebug());
 assert.equal(stored.settlement.stockpile.items.stone,30);
 assert.equal(stored.settlement.stockpile.items.berries,2);
 assert.equal(stored.settlement.stockpile.items.vines,1);
 assert.equal(stored.inventory.used,0,"backpack empties after dropping supplies at home");
 await page.screenshot({path:path.join(output,"epoch-stockpile-filled.png")});
 await page.locator('[data-action="select-plot"][data-plot="family_1"]').click();
 await page.locator('[data-action="visit-plot"][data-plot="family_1"]').click();
 // The build UI accepts any point 2.65–5m from the plot; its walking
 // destination is allowed to stop at the outer edge of that range.
 const withinBuildRange=()=>page.waitForFunction(()=>{
  const pos=window.epochDebug()?.position;
  if(!pos)return false;
  const distance=Math.hypot(pos.x+8,pos.z-4);
  return distance>=2.65 && distance<=5;
 },null,{timeout:16000});
 try{await withinBuildRange()}catch{
  console.log("Replanning approach to hut from",await page.evaluate(()=>window.epochDebug()?.position));
  await page.locator('[data-action="visit-plot"][data-plot="family_1"]').click();
  await withinBuildRange();
 }
 await page.locator('[data-action="build-plot"][data-plot="family_1"]').click();
 await page.waitForFunction(()=>window.epochDebug()?.settlement?.capacity===8,null,{timeout:5000});
 const settlement=await page.evaluate(()=>window.epochDebug().settlement);
 assert.equal(settlement.plots.family_1,"family","the house must be saved to the chosen plot");
 assert.equal(settlement.capacity,8,"family hut adds 3 population capacity");
 const afterBuild=await page.evaluate(()=>window.epochDebug());
 assert.equal(afterBuild.resources.wood,0,"building does not magically recreate carried wood");
 assert.equal(afterBuild.resources.stone,0,"building does not use invisible carried stone");
 assert.equal(afterBuild.settlement.stockpile.items.wood,34,"building consumes stockpiled wood");
 assert.equal(afterBuild.settlement.stockpile.items.stone,24,"building consumes stockpiled stone");
 assert(afterBuild.inventory.slots.every(s=>!s||s.qty<=12),"all stacks remain at or below 12");
 await page.screenshot({path:path.join(output,"epoch-first-family-hut.png")});
 // Responsive regression: the nav header cannot collapse under long content,
 // and switching tabs must never dismiss the mobile drawer.
 await page.locator("#right").evaluate(el=>el.classList.remove("open"));
 await page.locator("#toggle").evaluate(el=>el.setAttribute("aria-expanded","false"));
 for(const [width,height] of [[600,850],[390,740],[320,640]]){
  await page.setViewportSize({width,height});
  await page.locator("#toggle").click();
  assert(await page.locator("#right").evaluate(el=>el.classList.contains("open")),
   "menu must open at "+width+"px");
  for(const tab of ["pack","village","skills","tech","culture","dynasty"]){
   await page.locator('[data-tab="'+tab+'"]').click();
   const layout=await page.evaluate(()=>{
    const right=document.querySelector("#right");
    const nav=right.querySelector(".tabs");
    const panel=right.querySelector("#panel");
    const aside=right.getBoundingClientRect(),n=nav.getBoundingClientRect(),p=panel.getBoundingClientRect();
    const buttons=[...nav.querySelectorAll("button")].map(b=>{
     const r=b.getBoundingClientRect();
     return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}
    });
    return {open:right.classList.contains("open"),visible:getComputedStyle(right).display!=="none",
     nav:{top:n.top,bottom:n.bottom,left:n.left,right:n.right,height:n.height},
     panel:{top:p.top,bottom:p.bottom},aside:{top:aside.top,bottom:aside.bottom},
     buttons,active:nav.querySelector("button.active")?.dataset.tab};
   });
   assert(layout.open&&layout.visible,"switching to "+tab+" must keep menu open at "+width+"px");
   assert.equal(layout.active,tab,"active tab updates");
   assert(layout.nav.height>=78,"all tabs must occupy a stable two-row header");
   assert(layout.nav.top>=layout.aside.top-1&&layout.nav.bottom<=layout.aside.bottom+1,
    "tab header remains inside sidebar");
   assert(layout.panel.top>=layout.nav.bottom-1,"scrolling content starts below all tabs");
   assert(layout.buttons.every(b=>b.top>=layout.nav.top-1&&b.bottom<=layout.nav.bottom+1
     &&b.left>=layout.nav.left-1&&b.right<=layout.nav.right+1),
    "every tab button fits within visible navigation");
  }
  await page.locator('[data-tab="pack"]').click();
  const fixedHeader=await page.evaluate(()=>{
   const nav=document.querySelector("#right .tabs"),panel=document.querySelector("#panel");
   const top=nav.getBoundingClientRect().top;
   panel.scrollTop=panel.scrollHeight;
   return {top,after:nav.getBoundingClientRect().top,scrolled:panel.scrollTop};
  });
  assert.equal(fixedHeader.top,fixedHeader.after,"scrolling Pack must not hide the tabs");
  await page.screenshot({path:path.join(output,"epoch-tabs-"+width+".png")});
  await page.locator("#toggle").click();
  assert(!(await page.locator("#right").evaluate(el=>el.classList.contains("open"))),
   "menu toggle still closes the sidebar");
 }
 // The old ambient campfire must never exist. Researching Fire alone
 // unlocks construction, not an instant campfire in the world.
 assert.equal(idle.hearth.built,false,"no Cooking Hearth exists at game start");
 assert.equal(idle.hearth.visible,false,"unbuilt hearth geometry stays hidden");
 assert.equal(idle.hearth.lit,false,"no free flame appears before construction");
 assert.equal(idle.hearth.glow,0,"no ambient hearth glow before construction");
 assert.equal(idle.hearth.freeCampfires,0,"the free-standing old campfire is gone");
 await page.evaluate(()=>sessionStorage.setItem("epoch.hearthFixture","research"));
 await page.addInitScript(()=>{
  const mode=sessionStorage.getItem("epoch.hearthFixture");
  if(!mode)return;
  const key="epoch.stoneage.slot.1";
  const saved=JSON.parse(localStorage.getItem(key)||"{}");
  saved.technologies=[...new Set([...(saved.technologies||[]),"fire"])];
  saved.village=saved.village||{plots:{},population:5};
  saved.village.plots={...(saved.village.plots||{})};
  if(mode==="built")saved.village.plots.hearth_1="hearth";
  else delete saved.village.plots.hearth_1;
  localStorage.setItem(key,JSON.stringify(saved));
 });
 const loadHeathFixture=async ()=>{
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator('[data-menu="continue"]').click();
  await page.waitForFunction(()=>!!window.epochDebug()?.hearth,null,{timeout:45000});
  await page.waitForFunction(()=>document.querySelector("#loading")?.classList.contains("hidden"),null,{timeout:45000});
  return page.evaluate(()=>window.epochDebug());
 };
 const researched=await loadHeathFixture();
 assert(researched.technologies.includes("fire"),"fire research is available for hearth construction");
 assert.equal(researched.hearth.built,false,"researching fire does not automatically build the hearth");
 assert.equal(researched.hearth.visible,false,"empty Cooking Hearth plot has no built firepit");
 assert.equal(researched.hearth.lit,false,"researching fire does not ignite a free campfire");
 assert.equal(researched.hearth.glow,0,"research alone produces no firelight");
 await page.evaluate(()=>sessionStorage.setItem("epoch.hearthFixture","built"));
 const builtHearth=await loadHeathFixture();
 assert.equal(builtHearth.settlement.plots.hearth_1,"hearth","constructed hearth is persisted in village plots");
 assert.equal(builtHearth.hearth.built,true,"Cooking Hearth construction activates the building");
 assert.equal(builtHearth.hearth.visible,true,"completed Cooking Hearth geometry becomes visible");
 assert.equal(builtHearth.hearth.lit,true,"constructed hearth flame lights after fire research");
 assert(builtHearth.hearth.glow>0,"constructed Cooking Hearth produces firelight");
 assert.equal(builtHearth.hearth.freeCampfires,0,"no duplicate legacy campfire after construction");
 assert(Math.abs(builtHearth.hearth.position.x-builtHearth.settlement.worldPlotCenters.hearth_1.x)<.01,
   "firelight is at the stockpile-relative Cooking Hearth plot, not the old clearing");
 assert(Math.abs(builtHearth.hearth.position.z-builtHearth.settlement.worldPlotCenters.hearth_1.z)<.01,
   "firelight follows the placed village plot");
 await page.screenshot({path:path.join(output,"epoch-built-cooking-hearth.png")});
 // Separate clean browser context: test New Game > founder creation > Save > Continue.
 const newContext=await browser.newContext({viewport:{width:390,height:780},deviceScaleFactor:1});
 const newPage=await newContext.newPage();
 const creatorErrors=[];
 newPage.on("pageerror",error=>creatorErrors.push(String(error)));
 await newPage.goto("http://127.0.0.1:8765/epoch/?browser-test=20261113n-new",{waitUntil:"domcontentloaded",timeout:45000});
 await newPage.locator('[data-menu="new"]').waitFor({timeout:45000});
 assert(await newPage.locator('[data-menu="continue"]').isDisabled(),"clean browser has no Continue game");
 assert.equal(await newPage.locator(".epoch-save-card").count(),3,"three slots in title menu");
 await newPage.screenshot({path:path.join(output,"epoch-title-screen.png")});
 await newPage.locator('[data-menu="new"]').click();
 assert.equal(await newPage.locator(".epoch-save-card").count(),3,"new game chooses among three save slots");
 await newPage.locator('[data-menu="pick-new"][data-slot="2"]').click();
 assert(await newPage.locator("#founder-name").isVisible(),"character creator appears for New Game");
 await newPage.locator("#founder-name").fill("Mira");
 await newPage.locator('[data-menu="appearance"][data-field="sex"][data-dir="1"]').click();
 await newPage.locator('[data-menu="appearance"][data-field="hairStyle"][data-dir="1"]').click();
 await newPage.locator('[data-menu="appearance"][data-field="skin"][data-dir="1"]').click();
 assert.equal(await newPage.locator("#founder-name").inputValue(),"Mira","name survives picker updates");
 await newPage.screenshot({path:path.join(output,"epoch-founder-creator.png")});
 await newPage.locator('[data-menu="begin"]').click();
 await newPage.waitForFunction(()=>window.epochDebug()?.slot===2,null,{timeout:45000});
 const created=await newPage.evaluate(()=>window.epochDebug());
 assert.equal(created.heroName,"Mira");
 assert.equal(created.appearance.sex,"female");
 assert.equal(created.appearance.hairStyle,1);
 assert.equal(created.appearance.skin,3);
 assert.equal(await newPage.locator('[data-tab="appearance"]').count(),0,"no mid-life appearance editor");
 const saved=await newPage.evaluate(()=>JSON.parse(localStorage.getItem("epoch.stoneage.slot.2")));
 assert.equal(saved.hero.name,"Mira","founder saved correctly");
 assert.equal(saved.lineage[0].name,"Mira","founder name also appears in family chronicle");
 // New-game QA uses a narrow mobile viewport: open the game drawer first.
 await newPage.locator("#toggle").click();
 await newPage.locator('[data-tab="dynasty"]').click();
 await newPage.locator('[data-action="save"]').click();
 assert((await newPage.locator("#toasts").innerText()).includes("Slot 2"),"save feedback identifies slot");
 await newPage.locator('[data-action="title"]').click();
 await newPage.locator('[data-menu="continue"]').waitFor({timeout:45000});
 assert(await newPage.locator("#start-screen").isVisible(),"Save & Return opens title screen");
 await newPage.locator('[data-menu="continue"]').click();
 await newPage.waitForFunction(()=>window.epochDebug()?.heroName==="Mira",null,{timeout:45000});
 assert.equal((await newPage.evaluate(()=>window.epochDebug())).slot,2,"Continue resumes most recent slot");
 assert.equal(await newPage.locator('[data-tab="appearance"]').count(),0);
 assert.deepEqual(creatorErrors,[],"new-game and Continue flows have no script errors");
 await newContext.close();
 if(errors.length)throw new Error("Page errors: "+errors.join("\n"));
 console.log("BROWSER PASS",JSON.stringify({
  seed:idle.forest.seed,
  forestChunks:idle.forest.loaded,
  detailedForestChunks:idle.forest.detailed,
  forestResources:idle.forest.resources,
  removedResourcesAfterReload:nodes.removed,
  stockpile:afterBuild.settlement.stockpile,
  inventorySlots:idle.inventory.slots.length,
  inventoryAfterBuild:afterBuild.inventory.used,
  rigBones:idle.movement.matchedBones,
  start:idle.movement.mode,
  walking:walk.movement.mode,
  jogging:run.movement.mode,
  stopped:"idle",
  delta:Math.hypot(walk.position.x-idle.position.x,walk.position.z-idle.position.z).toFixed(2),
  hair:idle.hairAttachment,
  npcHair:idle.npcAttachments,
  warnings
 },null,2));
}catch(error){
 console.error("Browser movement smoke test failed:",error);
 throw error;
}finally{
 await browser.close();
}
