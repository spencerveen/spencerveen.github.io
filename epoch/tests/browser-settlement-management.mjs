import assert from "node:assert/strict";
import {mkdirSync} from "node:fs";
import path from "node:path";
import {launchBrowser,gameUrl,continueGame} from "./browser-helpers.mjs";
import {legacyResidents} from "../js/residents.js";
import {progressAtHour} from "../js/game-clock.js";

const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1300,height:900},ignoreHTTPSErrors:true});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 const people=legacyResidents(2);
 people[0].hunger=24;people[1].energy=38;
 const buildings=[{id:"building_1",kind:"family",x:10,z:8,turn:0,level:1},
  {id:"building_2",kind:"lore",x:0,z:19,turn:0,level:1}];
 await page.addInitScript(({residents,buildings,progress})=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,year:-12000,calendarProgress:progress,
   hero:{name:"Village Founder",age:25},
   village:{population:3,plots:{},nextBuildingNumber:3,buildings,residents,
    stockpile:{x:0,z:8,level:1,items:{
     wood:64,stone:49,vines:12,flint:3,berries:5,animal_meat:6}}},
   survival:{health:100,stamina:100,hunger:100,gameOver:false},
   lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 },{residents:people,buildings,progress:progressAtHour(10)});
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const open=page.locator("[data-open-settlement]");
 assert.equal(await open.count(),1,"Settlement has a persistent navigation button");
 await open.click();
 await page.locator("#modal.is-settlement .sm-layout").waitFor({timeout:15000});
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.modal,"settlement");
 assert((await page.locator("#guide").innerText()).includes("Life in your settlement"));
 assert.equal(await page.locator("#guide .sm-kpi").count(),4);
 const beforeClock=(await page.evaluate(()=>window.epochDebug())).clock.progress;
 await page.waitForTimeout(1200);
 const afterClock=(await page.evaluate(()=>window.epochDebug())).clock.progress;
 assert.equal(afterClock,beforeClock,"game time must pause while managing villagers");
 await page.locator('[data-action="settlement-section"][data-section="people"]').first().click();
 assert.equal(await page.locator("[data-sm-person]").count(),2);
 const first=people[0],second=people[1];
 const job=page.locator('[data-settlement-job="'+first.id+'"]');
 await job.selectOption("forager");
 await page.waitForFunction(id=>window.epochDebug().settlement.residents
  .find(r=>r.id===id)?.job==="forager",first.id);
 assert.equal(await page.locator("[data-sm-person]").count(),2);
 const home=page.locator('[data-settlement-home="'+first.id+'"]');
 await home.selectOption("building_1");
 await page.waitForFunction(id=>window.epochDebug().settlement.residents
  .find(r=>r.id===id)?.homeId==="building_1",first.id);
 const search=page.locator("#sm-search");
 await search.fill(first.name.toLowerCase());
 assert(await page.locator('[data-sm-person] [data-settlement-job="'+first.id+'"]').isVisible());
 assert(await page.locator('[data-sm-person] [data-settlement-job="'+second.id+'"]').isHidden(),
  "search must filter the roster without losing underlying residents");
 await search.fill("");
 await page.locator('[data-action="settlement-filter"][data-filter="workers"]').click();
 assert(await page.locator('[data-settlement-job="'+first.id+'"]').isVisible());
 assert(await page.locator('[data-settlement-job="'+second.id+'"]').isHidden());
 await page.locator('[data-action="settlement-filter"][data-filter="all"]').click();
 assert(await page.locator('[data-settlement-job="'+second.id+'"]').isVisible());
 await page.locator('[data-action="settlement-profile"][data-id="'+first.id+'"]').click();
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.modal,"resident");
 assert(await page.locator('[data-action="settlement-back"]').isVisible());
 await page.locator('[data-action="settlement-back"]').click();
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.modal,"settlement");
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.settlementSection,"people");
 // Moving the founder away should not disable village-wide orders, while
 // physically moving inventory still requires an actual stockpile visit.
 await page.evaluate(()=>{
  const w=window.__epochTestWorld;
  w.player.position.x=70;w.player.position.z=70;
 });
 await page.locator('.sm-sidebar [data-action="settlement-section"][data-section="buildings"]').click();
 assert.equal(await page.locator(".sm-building").count(),3);
 const upgrade=page.locator('[data-action="settlement-upgrade"][data-id="stockpile"]');
 assert(await upgrade.isEnabled(),"administrative upgrades work without walking back to stockpile");
 const woodBefore=(await page.evaluate(()=>window.epochDebug())).settlement.stockpile.items.wood;
 await upgrade.click();
 await page.waitForFunction(()=>window.epochDebug().settlement.stockpile.capacity===720);
 assert.equal(await upgrade.count(),0,"completed upgrades can't be charged twice");
 const current=await page.evaluate(()=>window.epochDebug());
 assert.equal(current.settlement.stockpile.items.wood,woodBefore-18);
 assert.equal(current.settlement.stockpile.level,2);
 await page.locator('.sm-sidebar [data-action="settlement-section"][data-section="supplies"]').click();
 assert((await page.locator(".sm-stock-table").innerText()).includes("Wood"));
 assert(await page.locator('[data-action="settlement-find-stockpile"]').isVisible());
 const withdraw=page.locator('[data-action="settlement-transfer"][data-direction="withdraw"][data-item="wood"]');
 assert(await withdraw.isDisabled(),"remote inventory transfers must remain physical");
 await page.setViewportSize({width:390,height:820});
 const mobile=await page.evaluate(()=>{
  const panel=document.querySelector("#modal.is-settlement .modal");
  const sm=document.querySelector(".sm-layout");
  const nav=document.querySelector(".sm-sidebar");
  return {width:panel.getBoundingClientRect().width,viewport:innerWidth,
   pageOverflow:document.documentElement.scrollWidth>innerWidth+1,
   navHeight:nav.getBoundingClientRect().height,
   sectionWidth:sm.getBoundingClientRect().width};
 });
 assert(mobile.width<=mobile.viewport+1&&!mobile.pageOverflow,
  "management screen fits on a phone without horizontal page scrolling");
 assert(mobile.navHeight<140,"mobile navigation becomes a compact row of tabs");
 const artifacts=path.join("epoch","tests","artifacts");
 mkdirSync(artifacts,{recursive:true});
 await page.screenshot({path:path.join(artifacts,"epoch-settlement-mobile.png"),animations:"disabled"});
 await page.setViewportSize({width:1300,height:900});
 await page.screenshot({path:path.join(artifacts,"epoch-settlement-management.png"),animations:"disabled"});
 await page.keyboard.press("Escape");
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.modal,null);
 await page.keyboard.press("v");
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.modal,"settlement",
  "V opens the village manager without targeting the 3D stockpile");
 await page.keyboard.press("v");
 assert.equal((await page.evaluate(()=>window.epochDebug())).ui.modal,null);
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const saved=await page.evaluate(()=>window.epochDebug());
 assert.equal(saved.settlement.stockpile.capacity,720);
 assert.equal(saved.settlement.residents[0].job,"forager");
 assert.equal(saved.settlement.residents[0].homeId,"building_1");
 assert.deepEqual(errors,[],"no errors after upgrades, search, profiles, jobs and reload");
 console.log("PASS browser settlement manager: overview, V/HUD, pause, jobs, housing, search, filters, profiles, remote orders, transfers, mobile and save reload");
}finally{await browser.close()}
