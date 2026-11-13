import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const output=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"artifacts");
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({
 channel:"chrome",headless:true,
 args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--disable-dev-shm-usage"]
});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
 const errors=[],warnings=[];
 page.on("pageerror",error=>errors.push(error.stack||String(error)));
 page.on("console",msg=>{if(msg.type()==="error")warnings.push(msg.text())});
 page.on("requestfailed",request=>warnings.push(request.url()+" "+request.failure()?.errorText));
 await page.goto("http://127.0.0.1:8765/epoch/?browser-test=20261113h",{waitUntil:"domcontentloaded",timeout:45000});
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
 // Exercise the new settlement UI in a real GPU-backed Babylon scene.
 const status=await page.evaluate(()=>window.epochDebug());
 assert.equal(status.settlement.worldPlots,5,"all five village plots must exist in the world");
 assert.equal(status.settlement.capacity,5,"starting village holds five people");
 await page.locator('[data-tab="village"]').click();
 assert.equal(await page.locator('[data-action="select-plot"]').count(),5,"five plot selectors");
 await page.locator('[data-action="select-plot"][data-plot="council_1"]').click();
 assert((await page.locator("#panel").innerText()).includes("Council Lodge"),"Council Lodge shows its details");
 await page.screenshot({path:path.join(output,"epoch-village-plots.png")});
 // Test actual construction through the public UI and click-to-walk workflow.
 // Before a reload, Epoch's pagehide handler saves the old in-memory state.
 // Seed the fresh document on its next load instead of writing too early.
 await page.addInitScript(()=>{
  const key="epoch.stoneage.v1",saved=JSON.parse(localStorage.getItem(key)||"{}");
  saved.version=1;
  saved.resources={...saved.resources,wood:100,stone:100};
  localStorage.setItem(key,JSON.stringify(saved));
 });
 await page.reload({waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.epochDebug()?.settlement?.worldPlots===5,null,{timeout:45000});
 const reloadedForest=await page.evaluate(()=>window.epochDebug().forest);
 assert.equal(reloadedForest.seed,idle.forest.seed,"reloading must preserve the world seed");
 assert.equal(reloadedForest.loaded,25,"reload recreates exactly 25 visible terrain chunks");
 assert.equal(reloadedForest.detailed,9,"reload keeps detailed forest meshes bounded");
 const loadedResources=await page.evaluate(()=>window.epochDebug().resources);
 assert(loadedResources.wood>=100 && loadedResources.stone>=100,"test save resources must be present after reload");
 await page.waitForFunction(()=>document.querySelector("#loading")?.classList.contains("hidden"),null,{timeout:45000});
 await page.locator('[data-tab="village"]').click();
 await page.locator('[data-action="select-plot"][data-plot="family_1"]').click();
 await page.locator('[data-action="visit-plot"][data-plot="family_1"]').click();
 await page.waitForFunction(()=>{
  const pos=window.epochDebug()?.position;
  return pos&&Math.hypot(pos.x+8,pos.z-4)<4.2;
 },null,{timeout:16000});
 await page.locator('[data-action="build-plot"][data-plot="family_1"]').click();
 await page.waitForFunction(()=>window.epochDebug()?.settlement?.capacity===8,null,{timeout:5000});
 const settlement=await page.evaluate(()=>window.epochDebug().settlement);
 assert.equal(settlement.plots.family_1,"family","the house must be saved to the chosen plot");
 assert.equal(settlement.capacity,8,"family hut adds 3 population capacity");
 await page.screenshot({path:path.join(output,"epoch-first-family-hut.png")});
 if(errors.length)throw new Error("Page errors: "+errors.join("\n"));
 console.log("BROWSER PASS",JSON.stringify({
  seed:idle.forest.seed,
  forestChunks:idle.forest.loaded,
  detailedForestChunks:idle.forest.detailed,
  forestResources:idle.forest.resources,
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
