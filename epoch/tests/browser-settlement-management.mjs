import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
import path from "node:path";
import {launchBrowser,gameUrl,continueGame,clickWorldObject} from "./browser-helpers.mjs";
import {legacyResidents} from "../js/residents.js";
import {progressAtHour} from "../js/game-clock.js";

const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1300,height:900},ignoreHTTPSErrors:true});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 const people=legacyResidents(2);people[0].hunger=24;people[1].energy=38;
 await page.addInitScript(({residents,progress})=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,year:-12000,calendarProgress:progress,
   hero:{name:"Village Founder",age:25},
   village:{population:3,plots:{},nextBuildingNumber:3,
    buildings:[{id:"building_1",kind:"family",x:10,z:8,turn:0,level:1},
     {id:"building_2",kind:"council",x:0,z:-8,turn:0,level:1}],
    residents,stockpile:{x:0,z:8,level:1,items:{
     wood:64,stone:49,vines:12,flint:3,berries:5,animal_meat:6}}},
   survival:{health:100,stamina:100,hunger:100,gameOver:false},
   lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 },{residents:people,progress:progressAtHour(10)});
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 assert.equal(await page.locator("[data-open-settlement]").count(),0,
  "no omnipresent Settlement HUD button");
 await page.keyboard.press("v");
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.modal,null,
  "V should not open settlement management");
 await clickWorldObject(page,{buildingId:"building_2"});
 await page.locator("#modal.is-settlement .sm-layout").waitFor({timeout:15000});
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.modal,"settlement");
 assert((await page.locator("#guide").innerText()).includes("Life in your tribe"));
 assert.equal(await page.locator("#guide .sm-kpi").count(),4);
 const beforeClock=(await page.evaluate(()=>window.epochDebug())).clock.progress;
 await page.waitForTimeout(1200);
 assert.equal((await page.evaluate(()=>window.epochDebug())).clock.progress,beforeClock,
  "time pauses while Council Lodge is open");
 await page.locator('.sm-sidebar [data-section="people"]').click();
 assert.equal(await page.locator("[data-sm-person]").count(),2);
 const first=people[0],second=people[1];
 await page.locator('[data-settlement-job="'+first.id+'"]').selectOption("forager");
 await page.waitForFunction(id=>window.epochDebug().settlement.residents
  .find(r=>r.id===id)?.job==="forager",first.id);
 await page.locator('[data-settlement-home="'+first.id+'"]').selectOption("building_1");
 await page.waitForFunction(id=>window.epochDebug().settlement.residents
  .find(r=>r.id===id)?.homeId==="building_1",first.id);
 const search=page.locator("#sm-search");
 await search.fill(first.name.toLowerCase());
 assert(await page.locator('[data-settlement-job="'+first.id+'"]').isVisible());
 assert(await page.locator('[data-settlement-job="'+second.id+'"]').isHidden());
 await search.fill("");
 await page.locator('[data-action="settlement-filter"][data-filter="workers"]').click();
 assert(await page.locator('[data-settlement-job="'+first.id+'"]').isVisible());
 assert(await page.locator('[data-settlement-job="'+second.id+'"]').isHidden());
 await page.locator('[data-action="settlement-filter"][data-filter="all"]').click();
 await page.locator('[data-action="council-successor"][data-id="'+second.id+'"]').click();
 assert.equal((await page.evaluate(()=>window.epochDebug())).successorId,second.id);
 assert((await page.locator("#guide").innerText()).includes("Successor"));
 await page.locator('[data-action="settlement-profile"][data-id="'+first.id+'"]').click();
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.modal,"resident");
 assert(await page.locator('[data-action="settlement-back"]').isVisible());
 await page.locator('[data-action="settlement-back"]').click();
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.settlementSection,"people");
 await page.locator('.sm-sidebar [data-section="traditions"]').click();
 assert((await page.locator("#guide").innerText()).includes(second.name));
 assert((await page.locator("#guide").innerText()).includes("Elders"));
 await page.locator('[data-action="council-open-culture"]').click();
 await page.waitForFunction(()=>window.epochDebug().ui.context==="culture");
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.modal,null);
 assert(await page.locator('[data-action="unlock"][data-kind="civic"]').count()>0,
  "Council Lodge still grants access to the original Culture tree");
 await page.locator('[data-action="council-return"]').click();
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.modal,"settlement");
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.settlementSection,"traditions");
 const upgrade=page.locator('[data-action="settlement-upgrade"][data-id="building_2"]');
 assert(await upgrade.isEnabled(),"Council improvement costs real village materials");
 const woodBefore=(await page.evaluate(()=>window.epochDebug())).settlement.stockpile.items.wood;
 await upgrade.click();
 await page.waitForFunction(()=>
  window.epochDebug().settlement.buildings.find(b=>b.kind==="council")?.level===2);
 const upgraded=await page.evaluate(()=>window.epochDebug());
 assert.equal(upgraded.settlement.stockpile.items.wood,woodBefore-16);
 assert.equal(upgraded.settlement.development.culturePerYear,2);
 assert.equal(await upgrade.count(),0,"upgraded Council cannot be charged twice");
 assert((await page.locator("#dialog-title").innerText()).includes("Council Lodge")||
  (await page.locator("#dialog-title").innerText()).includes("Elders"));
 await page.setViewportSize({width:390,height:820});
 const mobile=await page.evaluate(()=>{
  const panel=document.querySelector("#modal.is-settlement .modal");
  const nav=document.querySelector(".sm-sidebar");
  return {width:panel.getBoundingClientRect().width,viewport:innerWidth,
   pageOverflow:document.documentElement.scrollWidth>innerWidth+1,
   navHeight:nav.getBoundingClientRect().height};
 });
 assert(mobile.width<=mobile.viewport+1&&!mobile.pageOverflow);
 assert(mobile.navHeight<140,"mobile council tabs are compact");
 const artifacts=path.join("epoch","tests","artifacts");
 mkdirSync(artifacts,{recursive:true});
 await page.screenshot({path:path.join(artifacts,"epoch-council-lodge-mobile.png"),animations:"disabled"});
 await page.setViewportSize({width:1300,height:900});
 await page.screenshot({path:path.join(artifacts,"epoch-council-lodge.png"),animations:"disabled"});
 await page.keyboard.press("Escape");
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.modal,null);
 await clickWorldObject(page,{stockpile:true});
 assert.equal(await page.locator('nav.section-tabs [data-section="people"]').count(),0,
  "stockpile no longer provides a duplicate People tab");
 assert(await page.locator('[data-action="find-council"]').isVisible());
 assert(await page.locator('[data-action="deposit-stockpile"][data-item="wood"]').count()===1,
  "stockpile retains physical resource transfers");
 await page.locator("#close-panel").click();
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const saved=await page.evaluate(()=>window.epochDebug());
 assert.equal(saved.settlement.buildings.find(b=>b.kind==="council").level,2);
 assert.equal(saved.settlement.residents[0].job,"forager");
 assert.equal(saved.settlement.residents[0].homeId,"building_1");
 assert.equal(saved.successorId,second.id);
 await clickWorldObject(page,{buildingId:"building_2"});
 assert.equal(await page.locator("#dialog-title").innerText(),"Elders' Council",
  "upgraded Council remains the same building with an evolved title");
 assert.deepEqual(errors,[],"Council Lodge administration has no browser errors");
 console.log("PASS browser Council Lodge: built structure access, jobs, housing, succession, Culture, upgrade, mobile, saving");
}finally{await browser.close()}
