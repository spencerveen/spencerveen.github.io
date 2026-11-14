import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame} from "./browser-helpers.mjs";
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},ignoreHTTPSErrors:true});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,hero:{name:"Spear Fisher",age:18},
   inventory:[{id:"fish_meat",qty:1},null,null,null,null,null,null,null,null,null],
   equipment:{weapon:"stone_spear",body:null,ammo:null},weaponCondition:48,
   technologies:["fire"],village:{population:1,plots:{},residents:[],
    buildings:[{id:"building_1",kind:"hearth",x:4,z:10,turn:0}],
    stockpile:{x:0,z:8,items:{wood:1,stone:5}}},
   survival:{health:63,stamina:100,hunger:24,foodSeconds:0,gameOver:false,deathCount:0}
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 });
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const target=await page.evaluate(()=>{
  const w=window.__epochTestWorld;
  let fish=null;
  for(const z of [-18,0,18]){
   if(fish)break;
   for(let x=550;x<710;x+=11){
    const water=w.terrain.waterAt(x,z);
    if(water.kind!=="ocean"||water.depth<.3||water.depth>1.1)continue;
    w.player.position.x=x;w.player.position.z=z;
    w.player.position.y=w.groundY(x,z);
    w.terrain.update(x,z);
    fish=w.fish.find(f=>f.site.kind==="ocean")||null;
    if(fish)break;
   }
  }
  if(!fish)return {ok:false,visible:w.fish.map(f=>f.id)};
  w.player.position.x=fish.site.x+.35;
  w.player.position.z=fish.site.z+.35;
  w.player.position.y=w.groundY(w.player.position.x,w.player.position.z);
  return {ok:true,id:fish.id,kind:fish.site.kind};
 });
 assert(target.ok,"live coastal fish appear in water: "+JSON.stringify(target));
 await page.locator("#scene").focus();
 await page.keyboard.press("h");
 let info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.inventory.slots.find(s=>s?.id==="fish_meat")?.qty,2);
 assert.equal(info.equipment.weaponCondition.remaining,47);
 assert.equal(info.caughtFishCount,1);
 assert(!info.fish.some(f=>f.id===target.id),"caught fish vanishes");
 await page.evaluate(()=>{
  const w=window.__epochTestWorld;
  w.player.position.x=4.1;w.player.position.z=10.1;
  w.player.position.y=w.groundY(4.1,10.1);
  w.terrain.update(4.1,10.1);
  w.onPlot("building_1");
 });
 info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.ui.context,"building");
 const recipe=page.locator('[data-action="cook-recipe"][data-recipe="cooked_fish"]');
 assert(await recipe.isEnabled());
 await recipe.click();
 info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.inventory.slots.find(s=>s?.id==="cooked_fish")?.qty,2);
 assert(!info.inventory.slots.some(s=>s?.id==="fish_meat"));
 await page.locator("#scene").focus();
 await page.keyboard.press("e");
 info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.inventory.slots.find(s=>s?.id==="cooked_fish")?.qty,1);
 assert(info.survival.hunger>24&&info.survival.health>63);
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 info=await page.evaluate(()=>window.epochDebug());
 assert.equal(info.caughtFishCount,1);
 assert.equal(info.inventory.slots.find(s=>s?.id==="cooked_fish")?.qty,1);
 assert.equal(info.equipment.weaponCondition.remaining,47);
 assert.deepEqual(errors,[],"fishing causes no browser errors");
 console.log("PASS browser fishing: real coastal fish, H spear catch, fire-roasted fish, E eating and save reload");
}finally{await browser.close()}
