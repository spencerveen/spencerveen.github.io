import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame,clickWorldObject} from "./browser-helpers.mjs";
import {legacyResidents} from "../js/residents.js";
import {progressAtHour} from "../js/game-clock.js";

const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];
 page.on("pageerror",error=>errors.push(String(error)));
 await page.addInitScript(({residents,progress})=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,calendarProgress:progress,hero:{name:"Village Founder",age:25},
   village:{population:3,plots:{},buildings:[{id:"test_council",kind:"council",x:0,z:-8,turn:0,level:1}],residents,
    stockpile:{x:0,z:8,items:{wood:0,stone:0,berries:0,vines:0}}},
   survival:{health:100,stamina:100,hunger:100,gameOver:false},
   lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 },{residents:legacyResidents(2),progress:progressAtHour(10)});
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page,{model:true});
 assert.equal(windowIsDefined(await page.evaluate(()=>window.epochDebug().villagerCount)),true);
 const starting=await page.evaluate(()=>{
  const w=window.__epochTestWorld,p=w.people[0];
  return {id:p.id,job:p.job,x:p.x,z:p.z};
 });
 assert.equal(starting.job,"idle");
 await clickWorldObject(page,{buildingId:"test_council"});
 await page.locator("#modal.is-settlement .sm-layout").waitFor({timeout:10000});
 await page.locator('.sm-sidebar [data-section="people"]').click();
 assert((await page.locator("#guide").innerText()).includes("Unassigned"));
 const job=page.locator('[data-settlement-job="'+starting.id+'"]');
 await job.selectOption("woodcutter");
 assert.equal((await page.evaluate(id=>
  window.epochDebug().settlement.residents.find(p=>p.id===id).job,starting.id)),"woodcutter");
 await page.locator("#close-modal").click();
 const motion=await page.evaluate(()=>{
  const w=window.__epochTestWorld,p=w.people[0],first={x:p.x,z:p.z};
  let traveled=0,usedTarget=false;
  for(let i=0;i<270;i++){
   w.update(.17);
   const now=w.people[0];
   traveled=Math.max(traveled,Math.hypot(now.x-first.x,now.z-first.z));
   if(now.work.task)usedTarget=true;
  }
  return {traveled,usedTarget,
   job:w.people[0].job,work:w.people[0].work.mode,
   wood:window.epochDebug().settlement.stockpile.items.wood};
 });
 assert(motion.usedTarget,"worker discovers a real local work site");
 assert(motion.traveled>1,"worker must visibly move away from home");
 assert.equal(motion.job,"woodcutter");
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 assert.equal((await page.evaluate(id=>
  window.epochDebug().settlement.residents.find(p=>p.id===id).job,starting.id)),"woodcutter",
  "job assignment survives a save and reload");
 assert.deepEqual(errors,[],"6A work should not create browser runtime errors");
 console.log("PASS browser phase 6A: assign job through Council Lodge, gather from forest and persist on reload");
}finally{await browser.close()}
function windowIsDefined(value){return Number.isInteger(value)&&value>=2}
