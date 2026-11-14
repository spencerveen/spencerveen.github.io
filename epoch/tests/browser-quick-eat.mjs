import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame} from "./browser-helpers.mjs";
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];
 page.on("pageerror",e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,hero:{name:"Quick Eat Tester"},year:-12000,
   inventory:[{id:"berries",qty:3},null,null,null,null,null,null,null,null,null],
   village:{population:1,plots:{},buildings:[],residents:[]},
   survival:{health:80,stamina:18,hunger:30,foodSeconds:0,gameOver:false,deathCount:0}
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 });
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 await page.locator("#scene").focus();
 let before=await page.evaluate(()=>window.epochDebug());
 await page.keyboard.press("e");
 let after=await page.evaluate(()=>window.epochDebug());
 assert.equal(after.inventory.slots[0].qty,2,"E consumes exactly one berry");
 assert(after.survival.hunger>before.survival.hunger);
 assert(after.survival.stamina>before.survival.stamina);
 assert.equal(after.survival.maxStamina,120);
 assert((await page.locator("#toasts").innerText()).includes("Ate 1 wild berry"));

 await page.evaluate(()=>window.dispatchEvent(
  new KeyboardEvent("keydown",{key:"e",repeat:true,bubbles:true,cancelable:true})));
 assert.equal((await page.evaluate(()=>window.epochDebug())).inventory.slots[0].qty,2,
  "held-key repeat must not consume food");
 await page.keyboard.press("l");
 assert((await page.locator("#dialog-title").innerText()).includes("Developer"));
 await page.keyboard.press("e");
 assert.equal((await page.evaluate(()=>window.epochDebug())).inventory.slots[0].qty,2,
  "shortcut must not fire in modal dialogs");
 await page.keyboard.press("l");
 await page.keyboard.press("i");
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.context,"pack");
 await page.keyboard.press("e");
 assert.equal((await page.evaluate(()=>window.epochDebug())).inventory.slots[0].qty,1,
  "quick eating works while inventory is open");
 await page.keyboard.press("e");
 assert.equal((await page.evaluate(()=>window.epochDebug())).inventory.slots[0],null);
 const hunger=(await page.evaluate(()=>window.epochDebug())).survival.hunger;
 await page.keyboard.press("e");
 assert.equal((await page.evaluate(()=>window.epochDebug())).inventory.used,0);
 assert.equal((await page.evaluate(()=>window.epochDebug())).survival.hunger,hunger);
 assert((await page.locator("#toasts").innerText()).includes("No berries in your backpack"));
 await page.keyboard.press("i");
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.panelOpen,false);

 const target=await page.evaluate(()=>{
  const w=window.__epochTestWorld;
  const tree=w.entities.find(e=>e.resource==="wood"&&e.resourceId);
  if(!tree)return null;
  w.player.position.x=tree.x+.85;w.player.position.z=tree.z+.85;
  w.player.position.y=w.groundY(w.player.position.x,w.player.position.z);
  w.terrain.update(w.player.position.x,w.player.position.z);
  w.cooldown=0;
  return {x:tree.x,z:tree.z};
 });
 assert(target,"a nearby procedural tree should be available");
 await page.locator("#scene").focus();
 await page.keyboard.press("f");
 after=await page.evaluate(()=>window.epochDebug());
 assert(after.inventory.slots.some(s=>s?.id==="wood"),
  "F must still gather nearby resources instead of eating");
 assert(after.inventory.slots.every(s=>s?.id!=="berries"));
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 assert((await page.evaluate(()=>window.epochDebug())).inventory.slots.every(s=>s?.id!=="berries"),
  "quick eating must save consumed food");
 assert.deepEqual(errors,[],"shortcut interactions do not throw browser errors");
 console.log("PASS browser shortcuts: E eats exactly one carried berry; modal/repeat guards; F gathers");
}finally{
 await browser.close();
}
