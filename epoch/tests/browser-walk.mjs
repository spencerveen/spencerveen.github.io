import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const output=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"artifacts");
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({
 channel:"chrome",headless:true,
 args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--disable-dev-shm-usage"]
});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
 const errors=[],warnings=[];
 page.on("pageerror",error=>errors.push(error.stack||String(error)));
 page.on("console",msg=>{if(msg.type()==="error")warnings.push(msg.text())});
 page.on("requestfailed",request=>warnings.push(request.url()+" "+request.failure()?.errorText));
 await page.goto("http://127.0.0.1:8765/epoch/?browser-test=20261113e",{waitUntil:"domcontentloaded",timeout:45000});
 await page.waitForFunction(()=>typeof window.epochDebug==="function",{timeout:45000});
 await page.waitForFunction(()=>window.epochDebug()?.movement?.loaded===true,{timeout:45000});
 await page.waitForFunction(()=>document.querySelector("#loading")?.classList.contains("hidden"),{timeout:45000});
 await page.waitForFunction(()=>{
  const s=window.epochDebug();
  return !!s?.hairAttachment?.hairAttached
   && !!s.hairAttachment.beardAttached
   && s.npcAttachments?.length===4
   && s.npcAttachments.every(n=>n?.headFound && (!n.hairExpected||n.hairAttached) && (!n.beardExpected||n.beardAttached));
 },{timeout:45000});
 const idle=await page.evaluate(()=>window.epochDebug());
 assert(idle.movement.matchedBones>=60,"should animate at least 60 Quaternius joints");
 assert(idle.hairAttachment.headFound && idle.hairAttachment.hairAttached,"player hair must be parented to the animated Head");
 assert(idle.hairAttachment.beardAttached,"player beard must follow the Head");
 assert(idle.npcAttachments.every(n=>n.headFound && (!n.hairExpected||n.hairAttached) && (!n.beardExpected||n.beardAttached)),"villager hair must attach to their own Head");
 assert.equal(idle.movement.mode,"idle","should start in idle stance");
 await page.screenshot({path:path.join(output,"epoch-idle.png")});
 await page.keyboard.down("w");
 await page.waitForFunction(()=>window.epochDebug()?.movement?.mode==="walk",{timeout:7000});
 await page.waitForTimeout(650);
 const walk=await page.evaluate(()=>window.epochDebug());
 assert(walk.hairAttachment.hairAttached && walk.hairAttachment.beardAttached,"hair and beard must stay head-attached while walking");
 await page.screenshot({path:path.join(output,"epoch-walk.png")});
 assert(Math.hypot(walk.position.x-idle.position.x,walk.position.z-idle.position.z)>.25,"player should physically move in world");
 await page.keyboard.down("Shift");
 await page.waitForFunction(()=>window.epochDebug()?.movement?.mode==="run",{timeout:7000});
 await page.waitForTimeout(300);
 const run=await page.evaluate(()=>window.epochDebug());
 assert(run.hairAttachment.hairAttached && run.hairAttachment.beardAttached,"hair and beard must remain attached during jogging");
 await page.screenshot({path:path.join(output,"epoch-jog.png")});
 await page.keyboard.up("Shift");await page.keyboard.up("w");
 await page.waitForFunction(()=>window.epochDebug()?.movement?.mode==="idle",{timeout:7000});
 await page.screenshot({path:path.join(output,"epoch-idle-after-walk.png")});
 if(errors.length)throw new Error("Page errors: "+errors.join("\n"));
 console.log("BROWSER PASS",JSON.stringify({
  rigBones:idle.movement.matchedBones,
  start:idle.movement.mode,
  walking:walk.movement.mode,
  jogging:run.movement.mode,
  stopped:"idle",
  delta:Math.hypot(walk.position.x-idle.position.x,walk.position.z-idle.position.z).toFixed(2),
  hair:idle.hairAttachment,
  npcHair:idle.npcAttachments,
  warnings
 },null,2));
}catch(error){
 console.error("Browser movement smoke test failed:",error);
 throw error;
}finally{
 await browser.close();
}
