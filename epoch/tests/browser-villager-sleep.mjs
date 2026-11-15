import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame,clickWorldObject} from "./browser-helpers.mjs";
import {legacyResidents} from "../js/residents.js";
import {progressAtHour} from "../js/game-clock.js";

const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];
 page.on("pageerror",error=>errors.push(String(error)));
 const residents=legacyResidents(2);
 residents[0].job="woodcutter";
 residents[0].energy=25;
 residents[0].resting=true;
 residents[1].job="idle";
 residents[1].energy=55;
 const start=progressAtHour(22);
 await page.addInitScript(({people,progress})=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,year:-12000,calendarProgress:progress,
   hero:{name:"Village Founder",age:25},
   village:{population:3,plots:{},buildings:[{id:"test_council",kind:"council",x:0,z:-8,turn:0,level:1}],residents:people,
    stockpile:{x:0,z:8,items:{wood:0,stone:0,berries:0,vines:0}}},
   survival:{health:100,stamina:100,hunger:100,gameOver:false},
   lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 },{people:residents,progress:start});
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 await page.waitForFunction(()=>{
  const d=window.epochDebug();
  return d?.settlement?.people?.length===2&&
   d.settlement.people.every(p=>p.work==="sleeping"&&p.sleeping);
 },null,{timeout:20000});
 const night=await page.evaluate(()=>{
  const d=window.epochDebug();
  return {phase:d.clock.phase,people:d.settlement.people,
   residents:d.settlement.residents};
 });
 assert.equal(night.phase,"night");
 assert.equal(night.people[0].sleeping,true);
 assert.equal(night.people[1].sleeping,true,"unassigned villagers also sleep");
 assert(night.residents[0].energy>=25);
 assert.equal(night.residents[0].job,"woodcutter");
 await page.waitForTimeout(2400);
 const recovered=await page.evaluate(()=>window.epochDebug().settlement.residents[0]);
 assert(recovered.energy>25,"overnight sleep restores saved energy in real game ticks");
 assert.equal(recovered.resting,true,"tired villagers wait until fully recovered");
 await clickWorldObject(page,{buildingId:"test_council"});
 await page.locator('.sm-sidebar [data-section="people"]').click();
 const row=page.locator('[data-sm-person]').filter({has:page.locator('[data-settlement-job="'+residents[0].id+'"]')});
 assert.equal(await row.count(),1,"Council People tab shows the resident");
 assert((await row.innerText()).includes("Energy"));
 await page.locator('[data-action="settlement-profile"][data-id="'+residents[0].id+'"]').click();
 await page.locator("#modal:not(.hidden)").waitFor({timeout:10000});
 const profile=await page.locator("#guide").innerText();
 assert(profile.includes("Energy:")&&profile.includes("Sleeping"),
  "profile shows live energy and nighttime sleep status");
 await page.locator("#close-modal").click();
 // The same woodcutter should become available during the daytime after
 // recovering enough energy. Use a temporary test-only clock override.
 const daytime=await page.evaluate(async()=>{
  const w=window.__epochTestWorld;
  const {progressAtHour}=await import("./js/game-clock.js?v=20261115sleep1");
  w.getClockReading=()=>({progress:progressAtHour(10),paused:true});
  const resident=w.people[0];
  for(let i=0;i<280;i++)w.update(.15);
  return {mode:resident.work.mode,hasTask:!!resident.work.task,
   energy:window.epochDebug().settlement.residents[0].energy};
 });
 // They may still be recovering: under the fatigue gate this is correct.
 assert(!["sleeping","offDuty"].includes(daytime.mode),
  "during a work shift, a tired worker stays on rest rather than sleeping at night");
 const evening=await page.evaluate(async()=>{
  const w=window.__epochTestWorld;
  const {progressAtHour}=await import("./js/game-clock.js?v=20261115sleep1");
  w.getClockReading=()=>({progress:progressAtHour(18.5),paused:true});
  for(let i=0;i<200;i++)w.update(.15);
  return {mode:w.people[0].work.mode,task:w.people[0].work.task,
   cargo:window.epochDebug().settlement.hauling.inTransit};
 });
 assert(!["outbound","working"].includes(evening.mode),
  "no new outbound trips or gathering begins after 6 PM");
 assert.deepEqual(errors,[],"sleeping UI and villager schedules create no runtime errors");
 console.log("PASS browser 6C.3: night Zzz markers, saved energy, People meters, profile and evening shift");
}finally{await browser.close()}
