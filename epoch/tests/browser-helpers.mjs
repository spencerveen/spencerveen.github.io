import {createRequire} from "node:module";
const {chromium}=createRequire(import.meta.url)("playwright");

export const gameUrl=process.env.EPOCH_TEST_URL||"http://127.0.0.1:8765/epoch/";
export function launchBrowser(){
 return chromium.launch({
  ...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:"chrome"}),
  headless:true,
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--disable-dev-shm-usage"]
 });
}

// The probe belongs to the isolated test document, never to application code.
// It lets tests advance the same world update used by the render loop when
// software-rendered Chromium has a low frame rate.
export async function observeWorld(page){
 await page.evaluate(async()=>{
  if(window.__epochTestProbe)return;
  const entry=document.querySelector('script[type="module"][src]');
  const text=await (await fetch(entry.src)).text();
  const match=text.match(/import\s*\{\s*World\s*\}\s*from\s*["']([^"']+)/);
  if(!match)throw new Error("World entry import not found");
  const {World}=await import(new URL(match[1],entry.src).href);
  const original=World.prototype.update;
  World.prototype.update=function(dt){window.__epochTestWorld=this;return original.call(this,dt)};
  window.__epochTestProbe=true;
 });
}

export async function continueGame(page,{model=false}={}){
 await page.locator('[data-menu="continue"]').waitFor({timeout:45000});
 await observeWorld(page);
 await page.locator('[data-menu="continue"]').click();
 await page.waitForFunction(()=>typeof window.epochDebug==="function"&&window.__epochTestWorld,null,{timeout:45000});
 await page.waitForFunction(()=>document.querySelector("#loading")?.classList.contains("hidden"),null,{timeout:45000});
 if(model)await page.waitForFunction(()=>window.epochDebug()?.movement?.loaded,null,{timeout:45000});
}

export async function finishWalking(page){
 await page.evaluate(()=>{
  const w=window.__epochTestWorld;
  for(let i=0;i<1500&&w.path.length;i++)w.update(.045);
 });
}

export async function clickWorldObject(page,{stockpile=false,buildingId=null,tribeId=null,residentId=null,beforeClick=null}={}){
 await page.evaluate(({stockpile,buildingId,tribeId,residentId})=>{
  const w=window.__epochTestWorld;
  // Browser tests deliberately stage the player beside the object to model
  // having walked up with WASD. The game itself never teleports or auto-walks.
  const target=stockpile?w.stockpile:
   tribeId?[...w.tribeCamps.values()].find(c=>c.tribe.id===tribeId)?.leader:
   residentId?w.people.find(p=>p.id===residentId):
   w.currentVillage?.buildings?.find(b=>b.id===buildingId);
  if(target){
   w.player.position.x=target.x+2.9;
   w.player.position.z=target.z+2.9;
   w.player.position.y=w.groundY(w.player.position.x,w.player.position.z);
   w.terrain.update(w.player.position.x,w.player.position.z);
  }
  if(stockpile)w.focusStockpile?.();
  else if(tribeId)w.focusTribe?.(tribeId);
  else if(residentId)w.focusResident?.(residentId);
  else w.focusBuilding?.(buildingId);
  w.engine.resize();
  w.camera.alpha=-Math.PI/2;w.camera.beta=.8;w.camera.radius=24;
  w.camera.inertialAlphaOffset=0;w.camera.inertialBetaOffset=0;w.camera.inertialRadiusOffset=0;
  for(let i=0;i<60;i++)w.update(1/60);
  w.camera.getViewMatrix(true);w.camera.getProjectionMatrix(true);w.scene.updateTransformMatrix(true);
 },{stockpile,buildingId,tribeId,residentId});
 await page.waitForTimeout(180);
 const point=await page.evaluate(({stockpile,buildingId,tribeId,residentId})=>{
  const w=window.__epochTestWorld,B=window.BABYLON,scene=w.scene,engine=w.engine;
  const canvas=scene.getEngine().getRenderingCanvas(),rect=canvas.getBoundingClientRect();
  const matches=mesh=>stockpile?!!mesh?.metadata?.stockpile:
   tribeId?mesh?.metadata?.tribeId===tribeId:
   residentId?mesh?.metadata?.residentId===residentId:
   mesh?.metadata?.buildingId===buildingId;
  const meshes=scene.meshes.filter(m=>m.isEnabled()&&m.isVisible&&m.isPickable&&matches(m));
  const project=position=>B.Vector3.Project(position,B.Matrix.Identity(),scene.getTransformMatrix(),scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight()));
  for(const mesh of meshes){
   mesh.computeWorldMatrix(true);
   const center=mesh.getBoundingInfo().boundingBox.centerWorld;
   const p=project(center),x=rect.left+p.x*rect.width/engine.getRenderWidth(),y=rect.top+p.y*rect.height/engine.getRenderHeight();
   if(p.z<0||p.z>1||x<rect.left+2||x>rect.right-2||y<rect.top+2||y>rect.bottom-2)continue;
   if(document.elementFromPoint(x,y)!==canvas)continue;
   const pick=scene.pick(x-rect.left,y-rect.top);
   if(pick?.hit&&matches(pick.pickedMesh))return {x,y};
  }
  return null;
 },{stockpile,buildingId,tribeId,residentId});
 if(!point){
  const state=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},ui:window.epochDebug().ui,camera:{alpha:window.__epochTestWorld.camera.alpha,beta:window.__epochTestWorld.camera.beta}}));
  throw new Error("No unobstructed screen position for "+(stockpile?"stockpile":tribeId||residentId||buildingId)+" "+JSON.stringify(state));
 }
 if(beforeClick)await beforeClick(page);
 await page.mouse.click(point.x,point.y);
 if(stockpile)await finishWalking(page);
}
