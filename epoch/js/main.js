import {GameState} from "./state.js?v=20261114development1";
import {ITEMS} from "./inventory.js?v=20261114fish1";
import {World} from "./world.js?v=20261114development1";
import {UI} from "./ui.js?v=20261114development1";
import {TitleScreen} from "./title-screen.js?v=20261114r";
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
  let revealed=false;
  const world=new World(canvas,
    (resource,action)=>{const result=state.harvestResource(resource,action);if(result)ui?.toast(result.label);return result},
    (title,details)=>ui?.status(title,details),
    id=>ui?.selectBuilding(id),state.data.worldSeed,meta=>state.resourceStatus(meta),
    (x,z)=>state.foundStockpile(x,z),
    ()=>ui?.openStockpile(),
    (kind,x,z,turn,world)=>state.placeVillageBuilding(kind,x,z,turn,world),
    (kind,x,z,turn,world)=>state.canPlaceVillageBuilding(kind,x,z,turn,world),
    ()=>ui?.render(),
    {
     onDiscover:tribe=>{if(state.discoverTribe(tribe))ui?.toast("Discovered "+tribe.name);},
     onInteract:tribe=>ui?.openTribe(tribe),
     getRecord:id=>state.tribeRecord(id),
     getHome:()=>state.data.village.stockpile,
     getWaterSafeSites:()=>[...state.data.waterProtectedSites,
      ...state.data.watershedProtectedSites],
     getMountainSafeSites:()=>state.data.mountainProtectedSites,
     getOceanSafeSites:()=>state.data.oceanProtectedSites,
     onResidentSelect:id=>ui?.openResident(id),
     onVillagerCollect:(id,task,x,z)=>state.collectVillagerCargo(id,task,x,z),
     onVillagerDeliver:id=>state.deliverVillagerCargo(id),
     onVillagerEat:id=>state.feedVillager(id),
     getVillagerEnergy:id=>{
      const person=state.data.village.residents.find(v=>v.id===id);
      return person?{energy:person.energy,resting:person.resting,hunger:person.hunger}:
       {energy:100,resting:false,hunger:100};
     },
     spendSprint:amount=>state.spendStamina(amount,"sprint"),
     spendSwim:amount=>state.spendStamina(amount,"swim"),
     getVitals:()=>({...state.survivalStatus(),
      weapon:state.data.equipment.weapon?{
       id:state.data.equipment.weapon,
       reach:ITEMS[state.data.equipment.weapon]?.combat?.reach||0}:null}),
     getWildlifeStatus:animal=>state.wildlifeStatus(animal),
     onWildlifeHunt:animal=>state.huntAnimal(animal),
     onWildlifeHarvest:animal=>state.harvestAnimal(animal),
     onWildlifeDamage:(damage,reason)=>state.damageHero(damage,reason),
     getFishCaught:id=>state.fishCaught(id),
     onFishCatch:site=>state.catchFish(site)
    });
  // One saved annual clock controls both the sky and the HUD. One cycle
  // contains a whole 24-hour day and advances character ages by one year.
  state.getVillagerActivity=id=>{
   const person=world.people.find(p=>p.id===id);
   if(!person)return null;
   const pile=world.currentVillage?.stockpile;
   return {
    mode:person.work?.mode||"idle",
    moving:person.work?.moving===true,
    atHome:Math.hypot(person.x-person.homeX,person.z-person.homeZ)<=1.5,
    local:!pile||Math.hypot(world.player.position.x-pile.x,
     world.player.position.z-pile.z)<=100
   };
  };
  world.getClockReading=()=>({
   progress:state.data.calendarProgress,
   paused:!revealed||!!ui?.modal||state.data.survival.gameOver
  });
  const clockHUD=document.getElementById("game-clock");
  const syncClockHUD=()=>{
   if(!clockHUD)return;
   const clock=state.clockInfo();
   const symbol=clock.phase==="night"?"☾":
    clock.phase==="sunrise"?"◑":clock.phase==="sunset"?"◐":"☀";
   clockHUD.dataset.phase=clock.phase;
   clockHUD.querySelector(".game-clock-icon").textContent=symbol;
   clockHUD.querySelector(".game-clock-time").textContent=clock.label;
   clockHUD.setAttribute("aria-label",clock.label+", "+clock.phase+
    ". One day and night cycle equals one in-game year.");
  };
  syncClockHUD();
  ui=new UI(state,world);
  sessionStarted=true;
  state.save();
  window.setInterval(()=>{
   if(revealed&&!ui?.modal)state.advance(1);
   syncClockHUD();
  },1000);
  window.addEventListener("pagehide",()=>state.save());
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
    slot:state.slot,heroName:state.data.hero.name,heroAge:state.data.hero.age,year:state.formatYear(),generation:state.data.generation,
    survival:state.survivalStatus(),successorId:state.data.successorId,
    lastDeath:state.data.lastDeath?{...state.data.lastDeath}:null,
    ui:{panelOpen:ui.panelOpen,context:ui.tab,sourceBuildingId:ui.sourceBuildingId,villageSection:ui.villageSection,modal:ui.modal,activeResidentId:ui.activeResidentId},
    forest:world.terrain.status,
    sky:world.skyAtmosphere?.status()||null,
    clock:state.clockInfo(),
    resourceNodes:state.resourceStatistics(),
    wildlife:world.animals.map(a=>({id:a.id,species:a.species,dead:a.dead,
     status:state.wildlifeStatus(a.definition),
     x:a.node.position.x,z:a.node.position.z})),
    fish:world.fish.map(f=>({id:f.id,kind:f.site.kind,x:f.site.x,z:f.site.z,
     depth:f.site.depth,waterSurface:f.site.surfaceY})),
    caughtFishCount:Object.keys(state.data.fishCatches).length,
    resourceStates:Object.fromEntries(Object.entries(state.data.resourceNodes).slice(0,30).map(([id,v])=>[id,{...v}])),
    skills:{...state.data.skills},resources:{...state.data.resources},inventory:{slots:state.data.inventory.map(slot=>slot?{...slot}:null),used:state.inventoryUsed(),unpacked:{...state.data.unpacked}},
    equipment:{weapon:state.data.equipment.weapon,weaponCondition:state.equippedToolCondition(),body:state.data.equipment.body,
      ammo:state.data.equipment.ammo?{...state.data.equipment.ammo}:null},appearance:{...state.data.hero.appearance},villagerCount:world.people.length,
    technologies:[...state.data.technologies],civics:[...state.data.civics],
    tribes:{discovered:Object.entries(state.data.tribes).filter(([,r])=>r.discovered).map(([id])=>id),
      records:Object.fromEntries(Object.entries(state.data.tribes).map(([id,r])=>[id,{...r}])),
      loaded:[...world.tribeCamps.values()].map(c=>({id:c.tribe.id,name:c.tribe.name,
        members:c.tribe.population,x:c.tribe.x,z:c.tribe.z})),
      renderedCharacters:[...world.tribeCamps.values()].reduce((sum,c)=>sum+c.humans.length,0)},
    hearth:{built:!!world.hearthBuilt,visible:[...world.villageBuildings.values()].some(item=>item.entry.kind==="hearth"&&item.root.isEnabled()),
      lit:!!world.flame?.isEnabled(),glow:world.fireLight?.intensity||0,
      freeCampfires:world.scene.transformNodes.filter(n=>n.name==="campfire").length,
      position:world.fireLight?{x:world.fireLight.position.x,z:world.fireLight.position.z}:null},
    settlement:{plots:{...state.data.village.plots},population:state.data.village.population,capacity:state.villageCapacity(),
      development:state.villageDevelopment(),
      residents:(state.data.village.residents||[]).map(v=>({...v})),
      deceased:(state.data.village.deceased||[]).map(v=>({...v})),
      housing:state.villageHousing(),
      people:world.people.map(p=>({id:p.id,name:p.name,homeId:p.homeId,job:p.job,
       work:p.work?.mode||"idle",target:p.work?.task?.id||null,x:p.x,z:p.z,
       leisure:p.work?.leisure?{kind:p.work.leisure.kind,
        spot:p.work.leisure.spot?{x:p.work.leisure.spot.x,z:p.work.leisure.spot.z}:null}:null,
       socializing:!!p.socialMarker?.isEnabled(),
       energy:state.data.village.residents.find(v=>v.id===p.id)?.energy??100,
       resting:state.data.village.residents.find(v=>v.id===p.id)?.resting??false,
       hunger:state.data.village.residents.find(v=>v.id===p.id)?.hunger??100,
       sleeping:!!p.sleepMarker?.isEnabled(),
       cargo:{...p.cargo},cargoVisible:!!p.cargoVisual?.isEnabled(),
       routeLength:p.work?.route?.length||0})),
      hauling:state.villageHaulingStatus(),
      food:state.villageFoodStatus(),
      buildings:state.data.village.buildings.map(b=>({...b})),
      renderedBuildings:world.villageBuildings.size,
      stockpile:state.stockpileInfo(),
      placingStockpile:world.placingStockpile,placementPinned:!!world.placementPinned,stockpileCandidate:world.stockpileCandidate?{...world.stockpileCandidate}:null,
      placingBuilding:world.placingBuilding,buildingCandidate:world.buildingCandidate?{...world.buildingCandidate}:null,
      hasGrid:!!world.villageGrid,gridVisible:!!world.villageGrid?.isEnabled()},
    movement:world.character?.animationStatus?.()||null,
    hairAttachment:world.character?.attachmentStatus?.()||null,
    npcAttachments:world.people.map(person=>person.human.attachmentStatus?.()||null),
    position:{x:world.player.position.x,y:world.player.position.y,z:world.player.position.z},
    swimming:{mode:world.waterMotion,exhausted:world.swimExhausted,
      depth:world.terrain.waterAt(world.player.position.x,world.player.position.z).depth}

  }),configurable:true});
 }catch(error){
  loading.classList.add("hidden");
  console.error("Epoch failed to initialize:",error);
  throw error;
 }
}
new TitleScreen({onStart:startEpoch});
