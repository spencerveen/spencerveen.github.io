import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame,clickWorldObject} from "./browser-helpers.mjs";

const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];
 page.on("pageerror",e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,year:-12000,calendarProgress:.9995,generation:1,
   hero:{name:"Elder Mira",age:99},
   village:{population:3,plots:{},buildings:[],deceased:[],
    stockpile:{x:0,z:8,items:{wood:1,stone:0,berries:0,vines:0}},
    residents:[
     {id:"legacy:resident:0",name:"Tala",sex:"female",age:99,joinedYear:-12000,homeId:"camp"},
     {id:"legacy:resident:1",name:"Bren",sex:"male",age:50,joinedYear:-12000,homeId:"camp"}
    ]},
   successorId:"legacy:resident:1",
   survival:{health:100,stamina:100,hunger:90,foodSeconds:0,gameOver:false,deathCount:0},
   lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 });
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 await page.locator("#modal:not(.hidden)").waitFor({timeout:15000});
 assert.equal(await page.locator("#dialog-title").innerText(),"A New Leader Rises","natural death activates the same succession dialog as combat");
 const first=await page.evaluate(()=>window.epochDebug());
 assert.equal(first.heroName,"Bren");
 assert.equal(first.heroAge,51,"new leader takes their own annual age");
 assert.equal(first.generation,2);
 assert.equal(first.settlement.population,1,"the old villager and the predecessor died, leaving the new leader");
 assert.equal(first.settlement.residents.length,0);
 assert.equal(first.settlement.deceased.length,1,"old-age death is recorded separately");
 assert.equal(first.settlement.deceased[0].name,"Tala");
 assert.equal(first.settlement.deceased[0].age,100);
 assert.equal(first.lastDeath.reason,"old age");
 assert.equal(first.lastDeath.successorName,"Bren");
 assert.equal(await page.locator("#food-effect,#ancestor-name,#ancestor-age,#settlement-status").count(),0,
  "HUD contains no name, village counts or food explanation");
 assert.equal(await page.locator("#survival-hud .survival-stat").count(),3);
 assert(await page.locator("#objective-guide").isHidden(),"the chapter prompt is gone for founded villages");
 await page.locator('[data-action="resume"]').click();
 await clickWorldObject(page,{stockpile:true});
 await page.waitForFunction(()=>window.epochDebug().ui.context==="village",null,{timeout:8000});
 await page.locator('nav.section-tabs [data-section="people"]').click();
 const roster=await page.locator("#panel").innerText();
 assert(roster.includes("Bren")&&roster.includes("Age 51"),"founder name and age now appear in the People tab");
 assert(roster.includes("Remembered villagers (1)"),"deceased villagers have a memorial in People");
 await page.locator(".resident-memorial summary").click();
 assert((await page.locator(".resident-memorial").innerText()).includes("Tala"));
 assert((await page.locator(".resident-memorial").innerText()).includes("100"));
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const saved=await page.evaluate(()=>window.epochDebug());
 assert.equal(saved.heroName,"Bren");
 assert.equal(saved.heroAge,51);
 assert.equal(saved.settlement.deceased.length,1,"natural deaths persist across reload");
 assert.equal(saved.settlement.population,1);
 assert.deepEqual(errors,[],"natural death and the clean survival HUD produce no browser errors");
 console.log("PASS browser aging: age-100 natural death, named successor, archived villager, clean HUD and reload");
}finally{
 await browser.close();
}
