import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame} from "./browser-helpers.mjs";
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];page.on("pageerror",error=>errors.push(String(error)));
 await page.addInitScript(()=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,hero:{name:"Gear Tester"},year:-12000,generation:1,
   inventory:[
    {id:"wood_club",qty:1},{id:"fur_armor",qty:1},{id:"arrows",qty:6},
    {id:"stone_spear",qty:1},{id:"wood",qty:3},null,null,null,null,null
   ],
   equipment:{weapon:null,body:null,ammo:null},
   village:{population:1,plots:{},buildings:[]},
   survival:{health:100,stamina:100,hunger:95,foodSeconds:0,gameOver:false,deathCount:0},
   lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 });
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 await page.locator('[data-tab="pack"]').click();
 assert.equal(await page.locator(".pack-slot").count(),10);
 assert.equal(await page.locator(".equipment-slot").count(),3,"three independent equipment slots");
 assert((await page.locator(".equipment-slot").first().innerText()).includes("Main Hand"));
 assert((await page.locator(".equipment-slot").nth(1).innerText()).includes("Body Armor"));
 assert((await page.locator(".equipment-slot").nth(2).innerText()).includes("Ammunition"));
 async function equip(slot){
  await page.locator('.pack-slot[data-slot="'+slot+'"]').click();
  await page.locator('.pack-action-menu [data-action="equip-stack"]').click();
 }
 await equip(0);
 let info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.equipment.weapon,"wood_club");
 assert.equal(info.inventory.slots[0],null);
 assert.equal(info.inventory.used,4,"equipped gear leaves the backpack");
 await equip(1);
 await equip(2);
 info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.equipment.body,"fur_armor");
 assert.deepEqual(info.equipment.ammo,{id:"arrows",qty:6});
 assert.equal(info.inventory.used,2);
 await equip(3);
 info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.equipment.weapon,"stone_spear","swapped weapon is now held");
 assert.deepEqual(info.inventory.slots[3],{id:"wood_club",qty:1,durability:36},"previous weapon appears in the freed slot");
 assert.equal(info.inventory.used,2,"swapping weapons does not change backpack slot count");
 assert((await page.locator(".equipment-slot").first().innerText()).includes("Stone Spear"));
 await page.locator('[data-action="unequip-item"][data-equipment-slot="body"]').click();
 await page.locator('[data-action="unequip-item"][data-equipment-slot="ammo"]').click();
 info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.equipment.body,null);
 assert.equal(info.equipment.ammo,null);
 assert(info.inventory.slots.some(s=>s?.id==="fur_armor"));
 assert(info.inventory.slots.some(s=>s?.id==="arrows"&&s.qty===6));
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const after=await page.evaluate(()=>window.epochDebug());
 assert.equal(after.equipment.weapon,"stone_spear","the equipped weapon survives reload");
 assert.equal(after.equipment.body,null);
 assert.equal(after.equipment.ammo,null);
 assert(after.inventory.slots.some(s=>s?.id==="wood_club"));
 assert.deepEqual(errors,[],"equipment actions must not throw browser errors");
 console.log("PASS browser 4B.1: backpack equip, main-hand swap, armor and ammo slots, unequip and save/reload");
}finally{
 await browser.close();
}
