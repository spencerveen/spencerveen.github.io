import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
import path from "node:path";
import {launchBrowser,gameUrl,continueGame,clickWorldObject} from "./browser-helpers.mjs";
import {progressAtHour} from "../js/game-clock.js";
import {VILLAGE_UPGRADES} from "../js/village-development.js";

const structures=[
 {id:"building_1",kind:"family",x:10,z:8,turn:0,level:1},
 {id:"building_2",kind:"hearth",x:-10,z:8,turn:0,level:1},
 {id:"building_3",kind:"lore",x:0,z:19,turn:0,level:1},
 {id:"building_4",kind:"council",x:0,z:-8,turn:0,level:1}
];
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];
 page.on("pageerror",error=>errors.push(String(error)));
 await page.addInitScript(({buildings,progress})=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,year:-12000,calendarProgress:progress,
   hero:{name:"Village Founder",age:25},
   technologies:["fire"],village:{
    population:1,plots:{},nextBuildingNumber:5,buildings,residents:[],
    stockpile:{x:0,z:8,level:1,items:{
     wood:190,stone:180,vines:20,flint:5,animal_meat:8,berries:12
    }}
   },
   survival:{health:100,stamina:100,hunger:100,gameOver:false},
   lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 },{buildings:structures,progress:progressAtHour(10)});
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 await clickWorldObject(page,{stockpile:true});
 const original=await page.evaluate(()=>window.epochDebug());
 assert.equal(original.settlement.stockpile.capacity,480);
 assert.equal(original.settlement.capacity,8);
 assert(original.settlement.buildings.every(b=>b.level===1));
 const openBuildings=page.locator('nav.section-tabs [data-action="village-section"][data-section="buildings"]');
 await openBuildings.click();
 assert.equal(await page.locator("[data-upgrade-id]").count(),5,
  "stockpile and each built structure are independently upgradeable");
 const before=original.settlement.stockpile.items;
 for(const [id,kind] of [
  ["stockpile","stockpile"],
  ["building_1","family"],
  ["building_2","hearth"],
  ["building_3","lore"],
  ["building_4","council"]
 ]){
  const btn=page.locator('[data-action="upgrade-structure"][data-id="'+id+'"]');
  assert.equal(await btn.count(),1,id+" has an upgrade action");
  assert(await btn.isEnabled(),id+" can be improved from real stored supplies");
  await btn.click();
  await page.waitForFunction(id=>{
   const d=window.epochDebug().settlement;
   return id==="stockpile"?d.stockpile.level===2:
    d.buildings.find(b=>b.id===id)?.level===2;
  },id);
  assert.equal(await btn.count(),0,"upgraded structure no longer offers a repeat purchase");
  assert((await page.locator('[data-upgrade-id="'+id+'"]').innerText())
   .includes("Improvement complete"));
  const after=await page.evaluate(()=>window.epochDebug());
  assert(after.settlement.stockpile.items.wood<before.wood);
  if(kind==="stockpile"){
   assert.equal(after.settlement.stockpile.capacity,720,
    "stockpile UI and saved game honor expanded capacity");
   const extra=await page.evaluate(()=>{
    const meshes=window.__epochTestWorld.stockpileWorld.extension;
    return meshes.length>0&&meshes.every(m=>m.isEnabled()&&!m.isPickable);
   });
   assert(extra,"raised storage racks render but do not intercept clicks");
  }
  if(kind==="family")
   assert.equal(after.settlement.capacity,10,
    "an upgraded hut creates two actual resident spaces");
  if(kind!=="stockpile"){
   const built=await page.evaluate(id=>{
    const v=window.__epochTestWorld.villageBuildings.get(id);
    return {improved:!!v?.improvement,
     details:v?.root.getChildMeshes().filter(m=>
      m.name.includes("Upgraded")||m.name.includes("Reinforced")||
      m.name.includes("Elders")||m.name.includes("Toolmaker upgraded")).length};
   },id);
   assert(built.improved&&built.details>0,
    "level-two structure should have visible architectural improvements");
  }
 }
 const advanced=await page.evaluate(()=>window.epochDebug());
 const expected={...before};
 for(const upgrade of Object.values(VILLAGE_UPGRADES))
  for(const [id,qty] of Object.entries(upgrade.cost))expected[id]-=qty;
 for(const [id,qty] of Object.entries(expected))
  assert.equal(advanced.settlement.stockpile.items[id]||0,qty,
   "each material is charged exactly once: "+id);
 assert.equal(advanced.settlement.capacity,10);
 assert.equal(advanced.settlement.stockpile.capacity,720);
 assert(advanced.settlement.buildings.every(b=>b.level===2));
 const artifacts=path.join("epoch","tests","artifacts");
 mkdirSync(artifacts,{recursive:true});
 await page.screenshot({path:path.join(artifacts,"epoch-village-development.png"),animations:"disabled"});
 await page.locator("#close-panel").click();
 await clickWorldObject(page,{buildingId:"building_2"});
 const hearthText=await page.locator("#panel").innerText();
 assert(hearthText.includes("Level 2 / 2"));
 assert(hearthText.includes("extra serving"));
 const meatCard=page.locator(".village-build-card").filter({hasText:"Roasted Meat"}).first();
 assert((await meatCard.innerText()).includes("×3"),
  "improved hearth advertises actual extra cooking yield");
 await page.locator("#close-panel").click();
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const reloaded=await page.evaluate(()=>window.epochDebug());
 assert.equal(reloaded.settlement.stockpile.capacity,720);
 assert.equal(reloaded.settlement.capacity,10);
 assert(reloaded.settlement.buildings.every(b=>b.level===2));
 assert.deepEqual(reloaded.settlement.stockpile.items,advanced.settlement.stockpile.items);
 assert.deepEqual(errors,[],"upgrading buildings must not introduce runtime errors");
 console.log("PASS browser 6D: five functional upgrades, visible decorations, exact costs, cooking UI and persistent tiers");
}finally{await browser.close()}
