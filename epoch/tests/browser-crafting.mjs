import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame,clickWorldObject} from "./browser-helpers.mjs";
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},ignoreHTTPSErrors:true});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,hero:{name:"Crafting Tester",age:18},
   inventory:Array.from({length:10},()=>null),
   equipment:{weapon:null,body:null,ammo:null},
   technologies:["fire","tools"],village:{population:1,plots:{},buildings:[],
    stockpile:{x:0,z:8,items:{wood:12,stone:10,flint:4,vines:6}}},
   survival:{health:100,stamina:100,hunger:100,gameOver:false,deathCount:0}
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 });
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 await clickWorldObject(page,{stockpile:true});
 await page.locator('nav.section-tabs [data-section="craft"]').click();
 const text=await page.locator("#panel").innerText();
 for(const name of ["Wooden Club","Stone Axe","Stone Spear"])
  assert(text.includes(name),"all 5A recipes appear in Craft");
 await page.locator('[data-action="village-craft-tool"][data-item="wood_club"]').click();
 let info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.equipment.weapon,"wood_club");
 assert.equal(info.equipment.weaponCondition?.remaining,36);
 await page.locator('[data-action="village-craft-axe"]').click();
 info=await page.evaluate(()=>window.epochDebug());
 assert(info.inventory.slots.some(s=>s?.id==="stone_axe"));
 await page.locator('[data-action="village-craft-tool"][data-item="stone_spear"]').click();
 info=await page.evaluate(()=>window.epochDebug());
 assert(info.inventory.slots.some(s=>s?.id==="stone_spear"));
 await page.locator('[data-tab="pack"]').click();
 const axeIndex=info.inventory.slots.findIndex(s=>s?.id==="stone_axe");
 await page.locator('.pack-slot[data-slot="'+axeIndex+'"]').click();
 await page.locator('[data-action="equip-stack"]').click();
 info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.equipment.weapon,"stone_axe");
 assert.equal(info.equipment.weaponCondition?.remaining,45);
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.equipment.weapon,"stone_axe");
 assert.equal(info.equipment.weaponCondition?.remaining,45);
 assert.deepEqual(errors,[]);
 console.log("PASS browser Phase 5A: village crafting 3 tools, equip, durability and reload");
}finally{await browser.close()}
