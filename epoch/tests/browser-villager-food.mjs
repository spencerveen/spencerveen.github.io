import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame,clickWorldObject} from "./browser-helpers.mjs";
import {legacyResidents} from "../js/residents.js";
import {progressAtHour} from "../js/game-clock.js";

const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];
 page.on("pageerror",error=>errors.push(String(error)));
 const people=legacyResidents(2);
 people[0].job="woodcutter";people[0].hunger=40;
 people[1].job="idle";people[1].hunger=40;
 await page.addInitScript(({residents,progress})=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,year:-12000,calendarProgress:progress,
   hero:{name:"Village Founder",age:25},
   village:{population:3,plots:{},buildings:[],residents,
    stockpile:{x:0,z:8,items:{wood:0,stone:0,berries:1,cooked_meat:1,
     animal_meat:5,fish_meat:3,vines:0}}},
   survival:{health:100,stamina:100,hunger:100,gameOver:false},
   lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 },{residents:people,progress:progressAtHour(21)});
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const initial=await page.evaluate(()=>window.epochDebug());
 assert.equal(initial.settlement.food.meals,2);
 assert.equal(initial.settlement.food.hungry,2);
 assert.equal(initial.settlement.stockpile.items.animal_meat,5);
 assert.equal(initial.settlement.stockpile.items.fish_meat,3);
 const outcome=await page.evaluate(()=>{
  const w=window.__epochTestWorld;
  let seenTrip=false,seenEating=false,steps=0;
  for(let i=0;i<860;i++){
   w.update(.12);
   const d=window.epochDebug();
   const first=w.people[0],second=w.people[1];
   seenTrip ||= first.work.mode==="toMeal"||second.work.mode==="toMeal";
   seenEating ||= first.work.mode==="eating"||second.work.mode==="eating";
   steps++;
   if(d.settlement.food.meals===0)break;
  }
  return {steps,seenTrip,seenEating,debug:window.epochDebug()};
 });
 assert(outcome.seenTrip,"hungry villagers should travel to the actual stockpile");
 assert(outcome.seenEating,"the villagers should stop and eat at the store");
 assert.equal(outcome.debug.settlement.food.meals,0,
  "two hungry villagers should consume the two available meals");
 assert.equal(outcome.debug.settlement.stockpile.items.cooked_meat,0);
 assert.equal(outcome.debug.settlement.stockpile.items.berries,0);
 assert.equal(outcome.debug.settlement.stockpile.items.animal_meat,5,
  "uncooked meat is never consumed");
 assert.equal(outcome.debug.settlement.stockpile.items.fish_meat,3,
  "uncooked fish is never consumed");
 assert(outcome.debug.settlement.residents.every(v=>v.hunger>60));
 assert.deepEqual(outcome.debug.settlement.residents.map(v=>v.lastMeal).sort(),
  ["berries","cooked_meat"]);
 assert.equal(outcome.debug.settlement.hauling.inTransit,0);
 // Ticking additional frames cannot serve the same depleted meal twice.
 await page.evaluate(()=>{
  const w=window.__epochTestWorld;
  for(let i=0;i<100;i++)w.update(.12);
 });
 assert.equal((await page.evaluate(()=>window.epochDebug())).settlement.food.meals,0);
 await clickWorldObject(page,{stockpile:true});
 await page.locator('nav.section-tabs [data-action="village-section"][data-section="people"]').click();
 for(const p of people){
  const meter=page.locator('[data-resident-hunger="'+p.id+'"]');
  assert.equal(await meter.count(),1,"People panel has a hunger bar per resident");
  assert(Number(await meter.getAttribute("aria-valuenow"))>60);
 }
 const panel=await page.locator("#panel").innerText();
 assert(panel.includes("Village meals")&&panel.includes("Hungry"));
 await page.locator('[data-action="view-resident"][data-id="'+people[0].id+'"]').click();
 const profile=await page.locator("#guide").innerText();
 assert(profile.includes("Hunger:")&&profile.includes("Last meal:"));
 await page.locator("#close-modal").click();
 await page.locator("#close-panel").click();
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const after=await page.evaluate(()=>window.epochDebug());
 assert.equal(after.settlement.food.meals,0,"saved meals cannot reappear after reload");
 assert.equal(after.settlement.stockpile.items.animal_meat,5);
 assert(after.settlement.residents.every(v=>v.hunger>60));
 assert.deepEqual(after.settlement.residents.map(v=>v.lastMeal).sort(),
  ["berries","cooked_meat"]);
 assert.deepEqual(errors,[],"eating villagers should not produce browser runtime errors");
 console.log("PASS browser 6C.4: real food trips, eating, stockpile debit, hunger UI and save/reload");
}finally{await browser.close()}
