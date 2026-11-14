import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame,clickWorldObject} from "./browser-helpers.mjs";
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},ignoreHTTPSErrors:true});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,hero:{name:"Hearth Tester",age:18},
   inventory:[{id:"animal_meat",qty:4},{id:"berries",qty:2},null,null,null,null,null,null,null,null],
   equipment:{weapon:null,body:null,ammo:null},
   technologies:["fire"],village:{population:1,plots:{},residents:[],
    buildings:[{id:"building_1",kind:"hearth",x:4,z:10,turn:0}],
    stockpile:{x:0,z:8,items:{wood:2,stone:5}}},
   survival:{health:65,stamina:24,hunger:12,foodSeconds:0,gameOver:false,deathCount:0}
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 });
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 await clickWorldObject(page,{buildingId:"building_1"});
 let info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.ui.context,"building","hearth uses its own building panel");
 const panel=await page.locator("#panel").innerText();
 assert(panel.includes("Roasted Meat")&&panel.includes("Berry-Roasted Meat"),"both recipes visible");
 const roast=page.locator('[data-action="cook-recipe"][data-recipe="roasted_meat"]');
 const berries=page.locator('[data-action="cook-recipe"][data-recipe="berry_roast"]');
 assert(await roast.isEnabled()&&await berries.isEnabled());
 await roast.click();
 info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.inventory.slots.find(s=>s?.id==="cooked_meat")?.qty,2);
 assert.equal(info.settlement.stockpile.items.wood,1);
 await berries.click();
 info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.inventory.slots.find(s=>s?.id==="berry_roast")?.qty,1);
 assert.equal(info.settlement.stockpile.items.wood,0);
 await page.locator("#scene").focus();
 await page.keyboard.press("e");
 info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.inventory.slots.find(s=>s?.id==="berry_roast"),undefined,"E consumes best cooked meal first");
 assert(info.survival.hunger>12&&info.survival.health>65);
 assert.equal(info.survival.maxStamina,120);
 await page.locator('[data-tab="pack"]').click();
 const slot=info.inventory.slots.findIndex(s=>s?.id==="cooked_meat");
 await page.locator('.pack-slot[data-slot="'+slot+'"]').click();
 const eat=page.locator('[data-action="eat-stack"]');
 assert(await eat.isEnabled());
 await eat.click();
 info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.inventory.slots.find(s=>s?.id==="cooked_meat")?.qty,1);
 assert.equal(info.inventory.slots.find(s=>s?.id==="animal_meat")?.qty,1,"raw meat remains unused");
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.inventory.slots.find(s=>s?.id==="cooked_meat")?.qty,1);
 assert.equal(info.settlement.stockpile.items.wood,0);
 assert.equal(info.survival.maxStamina,120);
 assert.deepEqual(errors,[],"cooking causes no browser runtime errors");
 console.log("PASS browser cooking: physical hearth, fuel, roasted recipes, E meal, Inventory Eat and reload");
}finally{await browser.close()}
