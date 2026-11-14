import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame} from "./browser-helpers.mjs";
import {legacyResidents} from "../js/residents.js";

const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];
 page.on("pageerror",error=>errors.push(String(error)));
 const residents=legacyResidents(2);
 residents[0].job="idle";
 residents[0].cargo={wood:2,stone:1};
 residents[0].haulPosition={x:24,z:14};
 await page.addInitScript(people=>{
  if(localStorage.getItem("epoch.stoneage.slot.1"))return;
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,worldSeed:12000,hero:{name:"Caravan Founder",age:25},
   village:{population:3,plots:{},buildings:[],residents:people,
    stockpile:{x:0,z:8,items:{wood:0,stone:0,berries:0,vines:0}}},
   survival:{health:100,stamina:100,hunger:100,gameOver:false},
   lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 },residents);
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const first=await page.evaluate(()=>{
  const w=window.__epochTestWorld,p=w.people[0];
  return {cargo:window.epochDebug().settlement.hauling,
   actor:window.epochDebug().settlement.people[0],
   packExists:!!p.cargoVisual};
 });
 assert(first.packExists,"a worker with saved supplies receives visible 3D cargo");
 assert(first.actor.job==="idle","reassigned worker must deliver their existing cargo");
 assert(first.cargo.inTransit<=3);
 const result=await page.evaluate(()=>{
  const w=window.__epochTestWorld;
  let visible=false,carried=false,delivered=false,maxTrip=0;
  for(let i=0;i<820;i++){
   w.update(.12);
   const d=window.epochDebug(),p=w.people[0];
   if((d.settlement.hauling.inTransit||0)>0){
    carried=true;
    if(p.cargoVisual?.isEnabled())visible=true;
   }
   maxTrip=Math.max(maxTrip,Math.hypot(p.x-w.stockpile.x,p.z-w.stockpile.z));
   if(d.settlement.stockpile.items.wood>=2&&d.settlement.stockpile.items.stone>=1){
    delivered=true;break;
   }
  }
  return {delivered,visible,carried,maxTrip,
   hauling:window.epochDebug().settlement.hauling,
   storage:window.epochDebug().settlement.stockpile,
   worker:window.epochDebug().settlement.people[0]};
 });
 assert(result.delivered,"worker must carry the saved load to the physical stockpile");
 assert.equal(result.storage.items.wood,2);
 assert.equal(result.storage.items.stone,1);
 assert.equal(result.hauling.inTransit,0);
 assert.equal(result.worker.cargoVisible,false,"empty cargo pack becomes invisible after delivery");
 await page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 const after=await page.evaluate(()=>window.epochDebug());
 assert.equal(after.settlement.stockpile.items.wood,2,
  "delivered wood persists exactly once");
 assert.equal(after.settlement.stockpile.items.stone,1,
  "delivered stone persists exactly once");
 assert.equal(after.settlement.hauling.inTransit,0,
  "no phantom load is recreated on reload");
 assert.deepEqual(errors,[],"hauling produces no browser runtime errors");
 console.log("PASS browser phase 6B: loaded 3D cargo, return journey, real stockpile delivery and reload");
}finally{await browser.close()}
