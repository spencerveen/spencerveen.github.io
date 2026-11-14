import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame} from "./browser-helpers.mjs";

const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  if(!localStorage.getItem("epoch.stoneage.slot.1")){
   localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
    version:1,worldSeed:12000,hero:{name:"Forager"},year:-12000,generation:1,
    inventory:[{id:"berries",qty:3},null,null,null,null,null,null,null,null,null],
    village:{population:1,buildings:[],plots:{},residents:[]},
    survival:{health:70,stamina:20,hunger:35,foodSeconds:0,gameOver:false,deathCount:0},
    lastSavedAt:Date.now()
   }));
   localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
  }
 });
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const start=await page.evaluate(()=>window.epochDebug());
 assert(start.survival.health>=70&&start.survival.health<=75);
 assert(start.survival.hunger<=35&&start.survival.hunger>=30);
 assert.equal(start.survival.maxStamina,100);
 assert((await page.locator("#health-value").innerText()).includes("/ 100"));
 assert((await page.locator("#stamina-value").innerText()).includes("/ 100"));
 assert((await page.locator("#hunger-value").innerText()).includes("%"));
 await page.locator('[data-tab="pack"]').click();
 const eat=page.locator('[data-action="eat-berries"]');
 assert(await eat.isEnabled());
 const before=await page.evaluate(()=>window.epochDebug());
 await eat.click();
 const after=await page.evaluate(()=>window.epochDebug());
 assert.equal(after.inventory.slots[0].qty,2,"eating consumes one carried berry");
 assert(after.survival.hunger>before.survival.hunger,"berries satisfy hunger");
 assert(after.survival.stamina>before.survival.stamina,"berries replenish stamina");
 assert.equal(after.survival.maxStamina,120,"berries temporarily increase stamina capacity");
 assert((await page.locator("#food-effect").innerText()).includes("Berry boost"));
 assert((await page.locator("#stamina-value").innerText()).includes("/ 120"));
 await page.locator('[data-tab="pack"]').click();
 // Shift + W in the live world spends stamina for as long as sprint is held.
 const stamina=await page.evaluate(()=>{
  const w=window.__epochTestWorld,old=w.getVitals().stamina;
  w.keys.w=true;w.keys.shift=true;
  for(let i=0;i<30;i++)w.update(.045);
  w.keys.w=false;w.keys.shift=false;
  return {old,now:w.getVitals().stamina};
 });
 assert(stamina.now<stamina.old,"sprinting spends stamina");
 await page.waitForTimeout(1500);
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const persisted=await page.evaluate(()=>window.epochDebug());
 assert.equal(persisted.inventory.slots[0].qty,2,"berry consumption survives reload");
 assert(persisted.survival.foodSeconds>0,"temporary food effect survives reload without offline simulation");
 assert.equal(persisted.survival.maxStamina,120);
 assert.deepEqual(errors,[],"the survival HUD and eating produce no browser errors");
 await page.close();

 const dead=await browser.newPage({viewport:{width:1000,height:740},ignoreHTTPSErrors:true});
 const deathErrors=[];dead.on("pageerror",e=>deathErrors.push(String(e)));
 await dead.addInitScript(()=>{
  if(!localStorage.getItem("epoch.stoneage.slot.1")){
   localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
    version:1,worldSeed:12000,hero:{name:"Last Founder"},year:-12000,
    village:{population:0,plots:{},buildings:[],residents:[]},
    survival:{health:0,stamina:0,hunger:15,foodSeconds:0,gameOver:true,deathCount:1},
    lastDeath:{id:1,oldName:"Last Founder",successorName:"",reason:"a fatal injury",gameOver:true,year:-12000},
    lastSavedAt:Date.now()
   }));
   localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
  }
 });
 await dead.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(dead);
 await dead.locator("#modal:not(.hidden)").waitFor({timeout:10000});
 assert.equal(await dead.locator("#dialog-title").innerText(),"Your Civilization Has Fallen");
 assert.equal((await dead.evaluate(()=>window.epochDebug())).settlement.population,0,"a deceased founder never respawns after reload");
 assert((await dead.locator("#guide").innerText()).includes("No living villagers"));
 assert(!(await dead.locator("#close-modal").isVisible()),"game-over screen cannot be dismissed");
 await dead.keyboard.press("Escape");
 assert(await dead.locator("#modal").isVisible(),"Escape cannot resume an ended game");
 await dead.locator('[data-action="gameover-title"]').click();
 await dead.locator('[data-menu="new"]').waitFor({timeout:15000});
 assert.deepEqual(deathErrors,[],"loading a completed run produces no browser runtime errors");
 console.log("PASS browser survival: persistent HUD, berry eating/boost, sprint cost and permanent game over");
}finally{await browser.close()}
