import {GameState} from "./state.js?v=20261113l";
import {World} from "./world.js?v=20261113l";
import {UI} from "./ui.js?v=20261113l";
const loading=document.getElementById("loading");
try{
  if(!globalThis.BABYLON)throw new Error("Babylon.js failed to load. Check your internet connection.");
  const canvas=document.getElementById("scene");
  const state=new GameState();
  let ui;
  const world=new World(canvas,
    (resource,action)=>{const result=state.harvestResource(resource,action);if(result)ui.toast(result.label);return result},
    (title,details)=>ui?.status(title,details),
    id=>ui?.selectPlot(id),state.data.worldSeed,meta=>state.resourceStatus(meta),
    (x,z)=>state.foundStockpile(x,z),
    ()=>ui?.openStockpile());
  ui=new UI(state,world);
  window.setInterval(()=>state.advance(1),1000);
  window.addEventListener("pagehide",()=>state.save());
  // Keep the loading screen until the actual player model is in the scene.
  // A timeout ensures the game remains playable if the asset network stalls.
  let loaded=false;
  const reveal=()=>{if(loaded)return;loaded=true;loading.classList.add("hidden");};
  Promise.race([
    world.character.ready,
    new Promise(resolve=>window.setTimeout(()=>resolve(false),8000))
  ]).then(result=>{
    reveal();
    ui.toast(result?"The new adventurer models are ready.":"Epoch opened. Character art may still be loading.");
  }).catch(error=>{console.error("Epoch character load error:",error);reveal();});
  // Expose a read-only inspection aid for development without exposing mutation methods.
  Object.defineProperty(globalThis,"epochDebug",{value:()=>({
    year:state.formatYear(),generation:state.data.generation,
    forest:world.terrain.status,
    resourceNodes:state.resourceStatistics(),
    resourceStates:Object.fromEntries(Object.entries(state.data.resourceNodes).slice(0,30).map(([id,v])=>[id,{...v}])),
    skills:{...state.data.skills},resources:{...state.data.resources},inventory:{slots:state.data.inventory.map(slot=>slot?{...slot}:null),used:state.inventoryUsed(),unpacked:{...state.data.unpacked}},appearance:{...state.data.hero.appearance},villagerCount:world.people.length,
    technologies:[...state.data.technologies],civics:[...state.data.civics],
    settlement:{plots:{...state.data.village.plots},population:state.data.village.population,capacity:state.villageCapacity(),
      selectedPlot:ui.selectedPlot,worldPlots:world.villagePlots.size,
      stockpile:state.stockpileInfo(),
      placingStockpile:world.placingStockpile,
      worldPlotCenters:Object.fromEntries([...world.villagePlots].map(([id,item])=>[id,{x:item.plot.x,z:item.plot.z}]))},
    movement:world.character?.animationStatus?.()||null,
    hairAttachment:world.character?.attachmentStatus?.()||null,
    npcAttachments:world.people.map(person=>person.human.attachmentStatus?.()||null),
    position:{x:world.player.position.x,z:world.player.position.z}
  }),configurable:true});
}catch(error){
  console.error("Epoch failed to initialize:",error);
  const report=[
    "Epoch build 20261113l",
    error?.stack || String(error),
    "Browser: "+navigator.userAgent
  ].join("\n\n");
  loading.querySelector("h2").textContent="Unable to open Epoch";
  loading.querySelector("p").textContent=String(error?.message||error);
  const code=document.createElement("pre");
  code.className="startup-diagnostics";
  code.textContent=report;
  loading.append(code);
  const copy=document.createElement("button");
  copy.className="diagnostics-copy";
  copy.textContent="Copy error details";
  copy.addEventListener("click",()=>navigator.clipboard?.writeText(report).catch(()=>{}));
  loading.append(copy);
}
