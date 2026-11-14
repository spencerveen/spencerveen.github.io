import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame} from "./browser-helpers.mjs";
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,hero:{name:"Hunter",age:18},
   equipment:{weapon:"stone_spear",body:null,ammo:null},weaponCondition:48,
   inventory:[null,null,null,null,null,null,null,null,null,null],
   village:{population:1,plots:{},buildings:[]},
   survival:{health:100,stamina:100,hunger:98,foodSeconds:0,gameOver:false,deathCount:0}
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 });
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const staged=await page.evaluate(()=>{
  const w=window.__epochTestWorld;
  const rabbit=w.animals.find(a=>a.species==="rabbit"&&!a.dead);
  if(!rabbit)return {found:false,types:w.animals.map(a=>a.species)};
  w.player.position.x=rabbit.node.position.x+.35;
  w.player.position.z=rabbit.node.position.z+.35;
  w.player.position.y=w.groundY(w.player.position.x,w.player.position.z);
  return {found:true,id:rabbit.id,x:rabbit.node.position.x,z:rabbit.node.position.z};
 });
 assert(staged.found,"there is a rabbit in the initial visible chunks: "+JSON.stringify(staged));
 await page.locator("#scene").focus();
 await page.keyboard.press("h");
 const after=await page.evaluate(()=>window.epochDebug());
 assert(after.wildlife.some(a=>a.id===staged.id&&a.dead),
  "H attacks and kills the 8-health rabbit with the spear");
 assert.equal(after.equipment.weaponCondition.remaining,47,"spear wears after a strike");
 // F prioritizes a nearby carcass, rather than a berry bush or flint.
 await page.keyboard.press("f");
 const loot=await page.evaluate(()=>window.epochDebug());
 assert.equal(loot.inventory.slots.find(s=>s?.id==="animal_meat")?.qty,1);
 assert.equal(loot.inventory.slots.find(s=>s?.id==="fur")?.qty,1);
 assert(!loot.wildlife.some(a=>a.id===staged.id),"collected corpse disappears");
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const reloaded=await page.evaluate(()=>window.epochDebug());
 assert(!reloaded.wildlife.some(a=>a.id===staged.id),
  "previously harvested animal remains gone after reload");
 assert.equal(reloaded.inventory.slots.find(s=>s?.id==="animal_meat")?.qty,1);
 assert.equal(reloaded.inventory.slots.find(s=>s?.id==="fur")?.qty,1);
 assert.deepEqual(errors,[],"hunting and carcass loot must not cause browser errors");
 console.log("PASS browser Phase 5B: H spear hunt, F collect rabbit meat/fur and save reload");
}finally{await browser.close()}
