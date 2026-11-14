import {GameState} from "./state.js?v=20261114j";
import {World} from "./world.js?v=20261114j";
import {UI} from "./ui.js?v=20261114k";
import {TitleScreen} from "./title-screen.js?v=20261114b";
import {readSlot} from "./save-slots.js?v=20261113m";
const loading=document.getElementById("loading");
// Load the 3D game ONLY when a save is selected or a new founder is created.
// The title screen and character creator therefore appear before gameplay.
let sessionStarted=false;
async function startEpoch({slot,newGame=false,founder=null}){
 if(sessionStarted)throw new Error("A game is already running.");
 if(!newGame&&!readSlot(slot))throw new Error("That save slot is empty or unavailable.");
 if(!globalThis.BABYLON)throw new Error("Babylon.js failed to load. Check your connection.");
 loading.classList.remove("hidden");
 try{
  const canvas=document.getElementById("scene");
  const state=new GameState({slot,newGame,founder});
  if(newGame&&!state.save())throw new Error("Could not save your new game in browser storage.");
  let ui;
  const world=new World(canvas,
    (resource,action)=>{const result=state.harvestResource(resource,action);if(result)ui?.toast(result.label);return result},
    (title,details)=>ui?.status(title,details),
    id=>ui?.selectBuilding(id),state.data.worldSeed,meta=>state.resourceStatus(meta),
    (x,z)=>state.foundStockpile(x,z),
    ()=>ui?.openStockpile(),
    (kind,x,z,turn,world)=>state.placeVillageBuilding(kind,x,z,turn,world),
    (kind,x,z,turn,world)=>state.canPlaceVillageBuilding(kind,x,z,turn,world),
    ()=>ui?.render());
  ui=new UI(state,world);
  sessionStarted=true;
  state.save();
  window.setInterval(()=>state.advance(1),1000);
  window.addEventListener("pagehide",()=>state.save());
  let revealed=false;
  const reveal=()=>{if(revealed)return;revealed=true;loading.classList.add("hidden");};
  Promise.race([
    world.character.ready,
    new Promise(resolve=>window.setTimeout(()=>resolve(false),8000))
  ]).then(result=>{
    reveal();
    ui.toast(result?"Your story begins.":"Epoch opened. Character art may still be loading.");
  }).catch(error=>{console.error("Epoch character load error:",error);reveal();});
  // Expose a read-only inspection aid for development without exposing mutation methods.
  Object.defineProperty(globalThis,"epochDebug",{value:()=>({
    slot:state.slot,heroName:state.data.hero.name,year:state.formatYear(),generation:state.data.generation,
    ui:{panelOpen:ui.panelOpen,context:ui.tab,sourceBuildingId:ui.sourceBuildingId,villageSection:ui.villageSection,modal:ui.modal},
    forest:world.terrain.status,
    resourceNodes:state.resourceStatistics(),
    resourceStates:Object.fromEntries(Object.entries(state.data.resourceNodes).slice(0,30).map(([id,v])=>[id,{...v}])),
    skills:{...state.data.skills},resources:{...state.data.resources},inventory:{slots:state.data.inventory.map(slot=>slot?{...slot}:null),used:state.inventoryUsed(),unpacked:{...state.data.unpacked}},appearance:{...state.data.hero.appearance},villagerCount:world.people.length,
    technologies:[...state.data.technologies],civics:[...state.data.civics],
    hearth:{built:!!world.hearthBuilt,visible:[...world.villageBuildings.values()].some(item=>item.entry.kind==="hearth"&&item.root.isEnabled()),
      lit:!!world.flame?.isEnabled(),glow:world.fireLight?.intensity||0,
      freeCampfires:world.scene.transformNodes.filter(n=>n.name==="campfire").length,
      position:world.fireLight?{x:world.fireLight.position.x,z:world.fireLight.position.z}:null},
    settlement:{plots:{...state.data.village.plots},population:state.data.village.population,capacity:state.villageCapacity(),
      buildings:state.data.village.buildings.map(b=>({...b})),
      renderedBuildings:world.villageBuildings.size,
      stockpile:state.stockpileInfo(),
      placingStockpile:world.placingStockpile,placementPinned:!!world.placementPinned,stockpileCandidate:world.stockpileCandidate?{...world.stockpileCandidate}:null,
      placingBuilding:world.placingBuilding,buildingCandidate:world.buildingCandidate?{...world.buildingCandidate}:null,
      hasGrid:!!world.villageGrid,gridVisible:!!world.villageGrid?.isEnabled()},
    movement:world.character?.animationStatus?.()||null,
    hairAttachment:world.character?.attachmentStatus?.()||null,
    npcAttachments:world.people.map(person=>person.human.attachmentStatus?.()||null),
    position:{x:world.player.position.x,z:world.player.position.z}

  }),configurable:true});
 }catch(error){
  loading.classList.add("hidden");
  console.error("Epoch failed to initialize:",error);
  throw error;
 }
}
new TitleScreen({onStart:startEpoch});
