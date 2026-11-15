import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame,clickWorldObject} from "./browser-helpers.mjs";
import {legacyResidents} from "../js/residents.js";
import {progressAtHour} from "../js/game-clock.js";

const browser=await launchBrowser();
try{
 for(const hearth of [true,false]){
  const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const people=legacyResidents(3);
  for(const p of people){p.job="idle";p.energy=95;p.hunger=95}
  await page.addInitScript(({residents,progress,hearth})=>{
   if(localStorage.getItem("epoch.stoneage.slot.1"))return;
   localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
    version:1,worldSeed:12000,year:-12000,calendarProgress:progress,
    hero:{name:"Village Founder",age:25},
    technologies:hearth?["fire"]:[],
    village:{population:4,plots:{},buildings:hearth?
     [{id:"building_1",kind:"hearth",x:4,z:10,turn:0}]:[],
     residents,stockpile:{x:0,z:8,items:{wood:5,stone:5,berries:0,vines:0}}},
    survival:{health:100,stamina:100,hunger:100,gameOver:false},
    lastSavedAt:Date.now()
   }));
   localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
  },{residents:people,progress:progressAtHour(18.2),hearth});
  await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
  await continueGame(page);
  await page.waitForFunction(()=>window.epochDebug()?.settlement?.people?.length===3);
  const result=await page.evaluate(()=>{
   const w=window.__epochTestWorld;
   const seen=new Set(),sites=new Set();
   let chatting=false,conversationVisible=false,walked=false;
   let unsafe=0;
   const initial=w.people.map(p=>({x:p.x,z:p.z}));
   for(let i=0;i<700;i++){
    w.updateVillagerJobs(.13);
    w.updateVillagerSleepMarkers();
    for(let k=0;k<w.people.length;k++){
     const p=w.people[k],mode=p.work?.mode;
     seen.add(mode);
     if(p.work?.leisure?.spot)sites.add(p.work.leisure.spot.kind);
     if(mode==="socializing"){
      chatting=true;
      conversationVisible||=!!p.socialMarker?.isEnabled();
     }
     if(mode==="socialWalk"||mode==="wandering"||mode==="socializing"){
      if(w.terrain.waterAt(p.x,p.z).depth>.11)unsafe++;
     }
     if(Math.hypot(p.x-initial[k].x,p.z-initial[k].z)>1.2)walked=true;
    }
   }
   return {hearth:w.hearthBuilt,flame:!!w.flame?.isEnabled(),
    seen:[...seen],sites:[...sites],chatting,conversationVisible,walked,unsafe,
    active:w.people.map(p=>({mode:p.work.mode,marker:!!p.socialMarker?.isEnabled()})),
    stockpile:window.epochDebug().settlement.stockpile.items};
  });
  assert.equal(result.hearth,hearth,"built fire site remains build-dependent");
  assert.equal(result.flame,hearth,"the fire cannot appear in an empty village");
  assert(result.seen.includes("socialWalk"),"villagers actually walk during their free time");
  assert(result.chatting,"at least one resident gathers to talk after work");
  assert(result.conversationVisible,"conversations show a visible non-pickable icon");
  assert(result.walked,"residents move away from their starting positions");
  assert.equal(result.unsafe,0,"villagers stay on dry land during leisure");
  assert.equal(result.stockpile.wood,5,"no imaginary resource transactions");
  assert(result.sites.includes(hearth?"hearth":"gather")||
   result.sites.includes("wander"),"the location is grounded in built village structures");
  const markers=await page.evaluate(()=>{
   const w=window.__epochTestWorld;
   return w.people.map(p=>({clickable:p.socialMarker?.isPickable,
    name:p.socialMarker?.name}));
  });
  assert(markers.every(m=>m.clickable===false&&m.name.includes("chatting")));

  await clickWorldObject(page,{stockpile:true});
  await page.locator('nav.section-tabs [data-action="village-section"][data-section="people"]').click();
  const panel=await page.locator("#panel").innerText();
  assert(panel.includes("Village conversations"),"People tab explains social gatherings");
  assert.equal(await page.locator("[data-resident-activity]").count(),3);
  assert.equal(await page.locator("[data-village-social-count]").count(),1);
  await page.locator("#close-panel").click();

  const bedtime=await page.evaluate(async()=>{
   const w=window.__epochTestWorld;
   const {progressAtHour}=await import("./js/game-clock.js?v=20261115life1");
   w.getClockReading=()=>({progress:progressAtHour(22),paused:true});
   for(let i=0;i<560;i++){
    w.updateVillagerJobs(.13);
    w.updateVillagerSleepMarkers();
   }
   return w.people.map(p=>({mode:p.work.mode,
    social:p.socialMarker?.isEnabled(),sleep:p.sleepMarker?.isEnabled(),
    cargo:p.cargo}));
  });
  assert(bedtime.every(p=>!["socialWalk","socializing","wandering"].includes(p.mode)),
   "bedtime always cancels conversations and wandering");
  assert(bedtime.every(p=>p.social===false),"conversation signs disappear at night");
  assert(bedtime.some(p=>p.sleep),"villagers return to their sleep schedule");
  assert.deepEqual(errors,[],"ambient village routines produce no browser runtime errors");
  console.log("PASS browser village life "+(hearth?"hearth":"communal")+
   ": walking, social chats, dry navigation, no free campfire, midnight sleep");
  await page.close();
 }
}finally{await browser.close()}
