import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame} from "./browser-helpers.mjs";
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,hero:{name:"Cheat Tester",age:18},
   village:{population:1,plots:{},buildings:[],residents:[]},
   survival:{health:50,stamina:40,hunger:25,foodSeconds:0,gameOver:false,deathCount:0},
   lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 });
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 await page.keyboard.press("l");
 await page.locator("#dialog-title").getByText("Developer Panel").waitFor({timeout:10000});
 const switches=page.locator('#guide [data-action="dev-cheat"]');
 assert.equal(await switches.count(),4);
 const cheat=key=>page.locator('#guide [data-cheat="'+key+'"]');
 assert.equal(await cheat("unlimitedSprint").getAttribute("aria-checked"),"false");
 await cheat("unlimitedSprint").click();
 await cheat("unlimitedHealth").click();
 await cheat("unlimitedHunger").click();
 await cheat("neverDie").click();
 for(const key of ["unlimitedSprint","unlimitedHealth","unlimitedHunger","neverDie"])
  assert.equal(await cheat(key).getAttribute("aria-checked"),"true");
 let before=await page.evaluate(()=>({
  flags:{...window.__epochTestWorld.getVitals()},
  slot:JSON.parse(localStorage.getItem("epoch.stoneage.slot.1"))
 }));
 assert.equal(before.flags.health,100);
 assert.equal(before.flags.hunger,100);
 assert.equal("devCheats" in before.slot,false);
 await page.keyboard.press("l");
 assert(await page.locator("#modal").evaluate(el=>el.classList.contains("hidden")));
 const sprint=await page.evaluate(()=>{
  const w=window.__epochTestWorld,start=w.getVitals().stamina;
  w.keys.w=true;w.keys.shift=true;
  for(let i=0;i<30;i++)w.update(.045);
  w.keys.w=false;w.keys.shift=false;
  return {start,now:w.getVitals().stamina};
 });
 assert.equal(sprint.now,sprint.start,"unlimited sprint costs no stamina while holding Shift");
 await page.keyboard.press("l");
 await cheat("unlimitedSprint").click();
 assert.equal(await cheat("unlimitedSprint").getAttribute("aria-checked"),"false");
 await page.keyboard.press("Escape");
 const regular=await page.evaluate(()=>{
  const w=window.__epochTestWorld,start=w.getVitals().stamina;
  w.keys.w=true;w.keys.shift=true;
  for(let i=0;i<20;i++)w.update(.045);
  w.keys.w=false;w.keys.shift=false;
  return {start,now:w.getVitals().stamina};
 });
 assert(regular.now<regular.start,"sprint immediately costs stamina when turned off");
 await page.keyboard.press("l");
 await cheat("unlimitedHealth").click();
 await cheat("unlimitedHunger").click();
 await cheat("neverDie").click();
 await page.keyboard.press("l");
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 await page.keyboard.press("l");
 for(const key of ["unlimitedSprint","unlimitedHealth","unlimitedHunger","neverDie"])
  assert.equal(await cheat(key).getAttribute("aria-checked"),"false","cheats reset after reload");
 assert.deepEqual(errors,[],"developer panel loads without runtime errors");
 console.log("PASS browser dev panel: L toggle, independent switches, live sprint, Escape, session reset");
}finally{await browser.close()}
