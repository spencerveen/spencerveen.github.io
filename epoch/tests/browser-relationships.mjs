import assert from "node:assert/strict";
import {launchBrowser,gameUrl,continueGame,clickWorldObject} from "./browser-helpers.mjs";
import {legacyResidents} from "../js/residents.js";
import {relationshipKey} from "../js/relationships.js";

const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850},ignoreHTTPSErrors:true});
 const errors=[];page.on("pageerror",error=>errors.push(String(error)));
 const people=legacyResidents(2);
 people[0].age=32;people[1].age=30;
 const key=relationshipKey(people[0].id,people[1].id);
 const relationships={
  [key]:{a:people[0].id,b:people[1].id,affinity:58,
   socialPoints:42,talkSeconds:2,sharedYears:3,
   friendYear:-11998,partnerYear:-11996}
 };
 await page.addInitScript(({people,relationships})=>{
  localStorage.setItem("epoch.stoneage.slot.1",JSON.stringify({
   version:1,year:-11995,worldSeed:12000,
   hero:{name:"Aren",age:27},
   village:{population:3,plots:{},buildings:[
    {id:"test_council",kind:"council",x:-10,z:10,turn:0}],
    residents:people,relationships,stockpile:{
     x:0,z:8,items:{wood:10,stone:10,berries:10,vines:10}}},
   survival:{health:100,stamina:100,hunger:100,gameOver:false},
   lastSavedAt:Date.now()
  }));
  localStorage.setItem("epoch.stoneage.legacy.migrated","no-legacy");
 },{people,relationships});
 await page.goto(gameUrl,{waitUntil:"domcontentloaded",timeout:45000});
 await continueGame(page);
 await clickWorldObject(page,{buildingId:"test_council"});
 const overview=await page.locator("#guide").innerText();
 assert(overview.includes("Friendships · 1 · Partnerships · 1"),
  "Council summary displays persisted social connections");
 await page.locator('.sm-sidebar [data-section="people"]').click();
 const list=await page.locator("#guide").innerText();
 assert(list.includes("Partner of "+people[1].name),
  "Council roster shows the correct partner");
 await page.locator('[data-action="settlement-profile"][data-id="'+people[0].id+'"]').click();
 const profile=await page.locator("#guide").innerText();
 assert(profile.includes("Friendships & partnerships"));
 assert(profile.includes("Partner · 58/100"));
 assert(profile.includes(people[1].name));
 assert(profile.includes("3 shared Hut years"),"shared household history is visible");
 await page.locator('.resident-link[data-id="'+people[1].id+'"]').click();
 assert((await page.locator("#dialog-title").innerText()).includes(people[1].name),
  "reciprocal relationship links open the other resident's profile");
 assert((await page.locator("#guide").innerText()).includes(people[0].name),
  "the other profile sees the same partner");
 assert.deepEqual(errors,[],"relationship UI introduces no browser errors");
 console.log("PASS 7A.1 browser: reciprocal partnerships, Council summary, profile navigation");
}finally{await browser.close()}
