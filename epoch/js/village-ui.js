import {BUILDINGS} from "./settlement.js?v=20261115council1";
import {VILLAGE_UPGRADES,structureLevel,stockpileLevel} from "./village-development.js?v=20261114development1";
import {nearStockpile,VILLAGE_RADIUS,STOCKPILE_INTERACT_RANGE} from "./stockpile.js?v=20261114development1";
import {STOCKPILE_ITEM_IDS,ITEMS,itemCapacity,toolMaxDurability,toolCondition} from "./inventory.js?v=20261114fish1";
import {CRAFTING_PLANS} from "./equipment.js?v=20261114craft1";
import {UNIQUE_BUILDINGS} from "./village-placement.js?v=20261114b";
import {VILLAGER_JOBS} from "./villager-jobs.js?v=20261114jobs2";
import {cargoLabel} from "./villager-hauling.js?v=20261114haul1";
import {villagerDayPhase,villagerActivityText,normalizedEnergy} from "./villager-routines.js?v=20261115life1";
import {normalizedHunger,hungryStatus} from "./villager-nutrition.js?v=20261115food1";
const esc=x=>String(x).replace(/[&<>"']/g,v=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[v]));
const prereq=id=>({fire:"Control of Fire",tools:"Stone Toolmaking",community:"Tribal Community"}[id]||id);
const near=ui=>nearStockpile(ui.state.data.village.stockpile,ui.world.player.position.x,ui.world.player.position.z);
const kindIcon={family:"⌂",hearth:"♨",lore:"✦",council:"❖"};
const destination={family:"Housing",lore:"Technology",council:"Council Lodge",hearth:"Hearth"};
const purpose={
 family:"A home for three villagers. Open it to see who lives here and check available beds.",
 lore:"Your place of discovery. Open it to research technologies for your people.",
 council:"Your tribal leadership hall. Click to assign jobs, manage housing, name a successor and develop traditions.",
 hearth:"A communal fire for roasting hunted meat into nourishing food."
};
const itemName=id=>ITEMS[id]?.name||id;
const requiredMaterials=(cost,items)=>`<div class="cost-list" aria-label="Materials in village storage">${Object.entries(cost).map(([id,need])=>{
 const have=items?.[id]||0;
 return `<span class="cost-chip ${have>=need?"met":"missing"}">${ITEMS[id]?.icon||""} ${esc(itemName(id))} <b>${have} / ${need}</b></span>`;
}).join("")}</div>`;
const shortages=(cost,items)=>Object.entries(cost).filter(([id,need])=>(items?.[id]||0)<need).map(([id,need])=>`${need-(items?.[id]||0)} ${itemName(id)}`).join(" · ");
const arrows=(rotate=false)=>`<div class="village-placement-controls" role="group" aria-label="Move preview on the two meter grid">
 <button type="button" data-action="grid-nudge" data-dx="0" data-dz="-1" aria-label="Move north two meters">↑</button>
 <div class="village-control-middle">
  <button type="button" data-action="grid-nudge" data-dx="-1" data-dz="0" aria-label="Move west two meters">←</button>
  ${rotate?"":'<span>2 m grid</span>'}
  <button type="button" data-action="grid-nudge" data-dx="1" data-dz="0" aria-label="Move east two meters">→</button>
 </div>
 <button type="button" data-action="grid-nudge" data-dx="0" data-dz="1" aria-label="Move south two meters">↓</button>
 ${rotate?'<button type="button" class="placement-rotate-inline" data-action="grid-rotate" aria-label="Rotate building 90 degrees" title="Rotate 90° (R)">↻</button>':""}
 </div>`;
const placementPanel=(candidate,stockpile,ui)=>{
 const definition=BUILDINGS[ui.world.placingBuilding];
 const name=stockpile?"Village Stockpile":definition?.name||"Building";
 let valid=!!candidate?.ok,reason=candidate?.reason||"Choose clear ground for your village.";
 if(!stockpile&&candidate){
  const checked=ui.state.canPlaceVillageBuilding(candidate.kind,candidate.x,candidate.z,candidate.turn,ui.world);
  valid=valid&&checked.ok;
  if(candidate.ok&&!checked.ok){
   const missing=shortages(definition.cost,ui.state.data.village.stockpile?.items);
   reason=missing?"Store "+missing+" more before building.":checked.reason;
  }
 }
 return `<div class="village-placement-panel">
  <div class="research-heading"><h3>${esc(name)}</h3><span class="tag">${ui.world.placementPinned?"Position pinned":"Choose a position"}</span></div>
  <p class="context-note">Click terrain to pin the preview. Adjust with arrows${stockpile?"":" or rotate"}, then confirm.</p>
  ${arrows(!stockpile)}
  <div class="village-placement-result ${valid?"valid":"invalid"}" role="status">
   <strong>${valid?"✓ Ready to place":"Choose another location or add supplies"}</strong>
   <small>${esc(reason)}</small>
   <small>X ${candidate?.x??"—"} · Z ${candidate?.z??"—"}${stockpile?"":" · "+((candidate?.turn||0)*90)+"°"}</small>
  </div>
  <div class="village-placement-buttons">
   <button type="button" data-action="${stockpile?"confirm-stockpile":"confirm-building"}" ${!valid?"disabled":""}>${stockpile?"Found village":"Confirm placement"}</button>
   <button type="button" class="game-button alt" data-action="${stockpile?"cancel-stockpile":"cancel-building"}">Cancel</button>
  </div>
  <small class="context-note">Enter confirms · Escape cancels</small>
 </div>`;
};
function storagePanel(ui){
 const state=ui.state,pile=state.data.village.stockpile,storage=state.stockpileInfo(),atHome=near(ui);
 const hauling=state.villageHaulingStatus(),food=state.villageFoodStatus();
 let html=`<div class="pack-capacity"><span>Village storage</span><strong>${storage.used} / ${storage.capacity}</strong></div>
  <p class="context-note">Only delivered materials can be used for construction. Workers physically haul harvested supplies back to this store. <b>Granary level ${storage.level} / 2</b>.</p>
  <p class="context-note">People and leadership are managed at a constructed Council Lodge. The Stockpile handles storage, tools and construction.</p>
  <button type="button" class="game-button alt" data-action="village-section" data-section="buildings">Improve village buildings &amp; storage</button>
  <div class="haul-snapshot"><span>Worker cargo in transit</span><strong>${hauling.inTransit} items</strong></div>
  <div class="haul-snapshot"><span>Villager meals in storage</span><strong>${food.meals} ready</strong></div>
  ${food.critical?`<p class="context-note" role="status">⚠ ${food.critical} villager${food.critical===1?"":"s"} critically hungry. Add berries or roasted meals to village storage.</p>`:""}
  ${hauling.carriers.length?'<p class="context-note">'+hauling.carriers.map(p=>esc(p.name)+": "+esc(cargoLabel(p.items))).join(" · ")+'</p>':""}
  <div class="stockpile-primary-actions">
   <button type="button" data-action="deposit-all-stockpile" ${!atHome||state.inventoryUsed()===0||storage.used>=storage.capacity?"disabled":""}>Deposit all materials</button>
   ${!atHome?'<p class="context-note">Move closer with WASD to use storage.</p>':""}
  </div>
  <div class="stockpile-resource-list">`;
 for(const id of STOCKPILE_ITEM_IDS.filter(id=>
  ["wood","stone","berries","vines"].includes(id)||
  state.inventoryCount(id)>0||(storage.items[id]||0)>0||(hauling.byItem[id]||0)>0)){
  const carried=state.inventoryCount(id),stored=storage.items[id]||0;
  const deposit=Math.min(12,carried,storage.capacity-storage.used);
  const take=Math.min(12,stored,itemCapacity(state.data.inventory,id));
  html+=`<div class="stockpile-resource-row"><span>${ITEMS[id].icon} ${esc(ITEMS[id].name)}</span>
   <span class="stockpile-balance">Stored <b>${stored}</b> · Workers carrying <b>${hauling.byItem[id]||0}</b> · Your pack <b>${carried}</b></span>
   <div class="stockpile-actions">
    <button type="button" data-action="deposit-stockpile" data-item="${id}" ${!atHome||deposit<=0?"disabled":""}>Deposit ${deposit>0?deposit:12}</button>
    <button type="button" class="game-button alt" data-action="withdraw-stockpile" data-item="${id}" ${!atHome||take<=0?"disabled":""}>Take ${take>0?take:12}</button>
   </div></div>`;
 }
 html+=`</div><p class="context-note">${atHome?"Within reach · transfers available":"Move within "+STOCKPILE_INTERACT_RANGE+" m to transfer supplies."}</p>
 <div class="village-population"><div><small>VILLAGERS</small><strong>${state.data.village.population} / ${state.villageCapacity()}</strong></div><span>${state.data.village.buildings.length} buildings · ${VILLAGE_RADIUS} m territory</span></div>`;
 html+='<div class="entry"><h3>Your people</h3><p>'+
  (state.data.village.residents.length?
   state.data.village.residents.length+" other villagers call this settlement home.":"You are still the only resident of this village.")+
  '</p>'+(state.data.village.buildings.some(b=>b.kind==="council")?
   '<button type="button" data-action="find-council">Find Council Lodge · Manage villagers →</button>':
   '<button type="button" data-action="village-section" data-section="build">Build a Council Lodge to manage your people →</button>')+'</div>';
 return html;
}
function peoplePanel(ui){
 const state=ui.state,people=state.data.village.residents||[],homes=state.villageHousing();
 const chatting=ui.world.people.filter(p=>p.work?.mode==="socializing").length;
 let html='<div class="village-population"><div><small>SETTLEMENT POPULATION</small><strong>'+
  state.data.village.population+' / '+state.villageCapacity()+
  '</strong></div><span>'+people.length+' other residents · '+people.filter(p=>p.job&&p.job!=="idle").length+' workers</span></div>'+
  '<p class="context-note">Work 8 AM–6 PM · Sleep 8 PM–5 AM. In free time villagers gather by the built Cooking Hearth, visit the communal stockpile clearing, or explore local footpaths. Meals, deliveries and sleep take priority.</p>'+ 
  '<div class="haul-snapshot"><span>Village conversations</span><strong data-village-social-count>'+chatting+' socializing</strong></div>'+  
  '<div class="haul-snapshot"><span>Village meals · Hungry residents</span><strong>'+state.villageFoodStatus().meals+' available · '+state.villageFoodStatus().hungry+' hungry</strong></div>'+ 
  '<h3 class="section-heading">Housing</h3>';
 for(const h of homes){
  html+='<div class="timeline"><b>'+esc(h.label)+'</b><span>'+
   (h.id==="camp"?"Founder + ":"")+h.occupied+' / '+h.capacity+
   ' resident beds occupied</span></div>';
 }
 html+='<h3 class="section-heading">Village residents</h3>'+
  '<div class="entry resident-row"><div><h3>'+esc(state.data.hero.name)+'</h3><p>Age '+
  state.data.hero.age+' · Village leader · Generation '+state.data.generation+
  '</p><small>Communal camp · The character you control</small></div><span class="tag">You</span></div>';
 if(!people.length)html+='<p class="context-note">Your founder is alone. Befriend a wilderness tribe to invite your first neighbors.</p>';
 for(const person of people){
  const home=homes.find(h=>h.id===person.homeId);
  const source=person.originTribeName||"Original settler";
  const actor=ui.world.people.find(p=>p.id===person.id);
  const mode=actor?.work?.mode||"idle";
  const status=villagerActivityText(mode,villagerDayPhase(state.clockInfo().hour),person.resting,
   actor?.work?.leisure?.kind||null);
  const load=cargoLabel(person.cargo);
  const workNote=load?" · Carrying "+esc(load):"";
  const energy=Math.round(normalizedEnergy(person.energy));
  const hunger=Math.round(normalizedHunger(person.hunger));
  const hungerLabel=hungryStatus(person.hunger);
  html+='<div class="entry resident-row"><div><h3>'+esc(person.name)+'</h3><p>Age '+person.age+
   ' · '+esc(home?.label||"Communal camp")+'</p><small>'+esc(VILLAGER_JOBS[person.job]?.name||"Unassigned")+workNote+' · '+
   (person.recruitment==="peaceful"?"Welcomed from "+esc(source):"Longtime villager")+
   '</small><small class="resident-live-activity" data-resident-activity="'+esc(person.id)+'">'+esc(status)+'</small><div class="resident-energy-meter" data-resident-energy="'+esc(person.id)+'" role="progressbar" aria-label="'+esc(person.name)+' energy" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+energy+'"><span class="resident-energy-track"><span class="resident-energy-fill" style="width:'+energy+'%"></span></span><span class="resident-energy-value">'+energy+'% energy</span></div>'+
   '<div class="resident-hunger-meter" data-resident-hunger="'+esc(person.id)+'" role="progressbar" aria-label="'+esc(person.name)+' hunger" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+hunger+'"><span class="resident-hunger-track"><span class="resident-hunger-fill" style="width:'+hunger+'%"></span></span><span class="resident-hunger-value">'+hunger+'% · '+esc(hungerLabel)+'</span></div>'+
   '</div><button type="button" data-action="view-resident" data-id="'+esc(person.id)+'">View profile</button></div>';
 }
 const remembered=(state.data.village.deceased||[]);
 if(remembered.length){
  html+='<details class="resident-memorial"><summary>Remembered villagers ('+remembered.length+')</summary>';
  for(const person of remembered.slice(-5).reverse())
   html+='<div class="timeline"><b>'+esc(person.name)+'</b><span>Died of old age at 100 · '+
    (person.year<0?Math.abs(person.year).toLocaleString()+" BCE":(person.year+1)+" CE")+
    '</span></div>';
  html+='</details>';
 }
 return html;
}
function craftPanel(ui){
 const state=ui.state,stored=state.data.village.stockpile?.items||{};
 const atHome=near(ui);
 let html='<p class="context-note">Craft primitive tools using materials stored at your village stockpile. Deposit supplies in Storage, then return here.</p><div class="village-build-catalog">';
 for(const id of ["wood_club","stone_axe","stone_spear"]){
  const plan=CRAFTING_PLANS[id],def=ITEMS[id];
  const owned=state.inventoryCount(id)>0||state.data.equipment.weapon===id;
  const ready=Object.entries(plan.materials).every(([material,n])=>(stored[material]||0)>=n);
  const researched=plan.requires.every(req=>state.data.technologies.includes(req));
  const equipped=state.data.equipment.weapon===id;
  const room=state.data.equipment.weapon===null||state.data.inventory.some(slot=>slot===null);
  const condition=equipped?state.equippedToolCondition()?.remaining:
   state.data.inventory.find(slot=>slot?.id===id)?.durability;
  html+='<div class="entry village-build-card"><div class="research-heading"><h3>'+
   def.icon+' '+esc(def.name)+'</h3><span class="tag">'+
   (owned?'Owned':!researched?'Research needed':'Stone Age')+'</span></div>'+
   '<p>'+esc(def.description)+'</p>'+
   '<small class="building-purpose">'+(id==="stone_axe"?
    'Gather 3 wood per tree visit · loses 1 durability each use':
    id==="stone_spear"?'Long reach · hunting and combat planned':
    'Basic melee weapon · hunting and combat planned')+'</small>';
  if(owned){
   html+='<p class="context-note">'+esc(def.name)+' owned. '+
    (equipped?'crafted and equipped in Main Hand.':'Equip it from your backpack.')+
    (toolMaxDurability(id)?' Durability '+toolCondition(id,condition)+
     ' / '+toolMaxDurability(id)+'.':'')+'</p>';
  }else{
   html+=requiredMaterials(plan.materials,stored);
   if(!researched)html+='<p class="context-note">Research Stone Toolmaking at the Toolmaker\'s Shelter first.</p>';
   else if(!atHome)html+='<p class="context-note">Move near your stockpile with WASD to craft.</p>';
   else if(!ready)html+='<p class="context-note">Deposit the required '+
    (id==="stone_axe"?'wood and stone':'materials')+' in village storage.</p>';
   else if(!room)html+='<p class="context-note">Make room in your backpack first.</p>';
   html+='<button type="button" data-action="'+(id==="stone_axe"?
    'village-craft-axe':'village-craft-tool')+'" data-item="'+id+'" '+
    (!researched||!atHome||!ready||!room?'disabled':'')+
    '>Craft '+esc(def.name)+'</button>';
  }
  html+='</div>';
 }
 return html+'</div>';
}
function buildPanel(ui){
 const state=ui.state,village=state.data.village,items=village.stockpile.items;
 let html='<p class="context-note">Give each part of village life a place in the world. Select a blueprint, choose its location, and build using village storage.</p><div class="village-build-catalog">';
 for(const kind of ["lore","council","family","hearth"]){
  const definition=BUILDINGS[kind],existing=village.buildings.filter(b=>b.kind===kind);
  const already=UNIQUE_BUILDINGS.includes(kind)&&existing.length>0;
  const locked=definition.requires.filter(req=>!state.data.technologies.includes(req)&&!state.data.civics.includes(req));
  const missing=shortages(definition.cost,items);
  html+=`<div class="entry village-build-card"><div class="research-heading"><h3>${kindIcon[kind]} ${esc(definition.name)}</h3>${existing.length?`<span class="tag">${existing.length} built</span>`:""}</div>
   <p>${esc(purpose[kind])}</p>
   <small class="building-purpose">${kind==="family"?"View residents · +3 housing capacity":kind==="hearth"?"Cooking · roasted meat and meals":"Opens "+destination[kind]}</small>
   ${!already?requiredMaterials(definition.cost,items):""}
   ${already?`<button type="button" data-action="select-building" data-id="${esc(existing[0].id)}">Open ${destination[kind]}</button>`:
    `<button type="button" data-action="start-building" data-kind="${kind}" ${locked.length?"disabled":""}>${locked.length?"Requires "+esc(prereq(locked[0])):"Place "+esc(definition.name)}</button>`}
   ${!already&&missing?`<small class="context-note">Need ${esc(missing)} more in storage.</small>`:""}
  </div>`;
 }
 return html+"</div>";
}
/** An individual saved structure costs real supplies to improve. The action
 * is always revalidated by GameState, even when the button was enabled.
 */
function improvementCard(ui,id,kind,level){
 const def=VILLAGE_UPGRADES[kind];
 if(!def)return "";
 const state=ui.state,items=state.data.village.stockpile?.items||{};
 const pos=ui.world.player.position;
 const complete=level>=2;
 const result=complete?{ok:false,reason:"Maximum level reached."}:
  state.canUpgradeVillage(id,pos.x,pos.z);
 const needs=complete?"":requiredMaterials(def.cost,items);
 return `<div class="village-improvement" data-upgrade-id="${esc(id)}">
  <div class="research-heading"><h3>${esc(def.title)}</h3><span class="tag">Level ${level} / 2</span></div>
  <p>${esc(def.description)}</p>
  <small class="building-purpose">${esc(def.benefit)}</small>
  ${needs}
  ${complete?'<small class="context-note">✓ Improvement complete</small>':
   `<button type="button" data-action="upgrade-structure" data-id="${esc(id)}"
    ${!result.ok?"disabled":""}>Improve ${esc(kind==="stockpile"?"Stockpile":BUILDINGS[kind].name)}</button>
    ${!result.ok?`<small class="context-note">${esc(result.reason)}</small>`:""}`}
 </div>`;
}
function buildingsPanel(ui){
 const state=ui.state,village=state.data.village;
 const buildings=village.buildings;
 let html='<p class="context-note">Build new structures in Build. Improve existing ones here with supplies already delivered to the stockpile. Each upgrade has a real gameplay effect, lasts through save files and costs materials only once.</p>';
 html+='<h3 class="section-heading">Village storage</h3><div class="entry village-built-item">'+
  improvementCard(ui,"stockpile","stockpile",stockpileLevel(village.stockpile))+
  '</div>';
 if(!buildings.length)html+='<p class="context-note">Build a Hut, Cooking Hearth, Toolmaker’s Shelter or Council Lodge to unlock their development improvements.</p>';
 for(const building of buildings){
  const definition=BUILDINGS[building.kind];
  if(!definition)continue;
  html+=`<div class="entry village-built-item ${ui.selectedBuildingId===building.id?"chosen":""}">
   <div class="research-heading"><strong>${kindIcon[building.kind]} ${esc(definition.name)}</strong>
   <span class="tag">Level ${structureLevel(building)} / 2</span></div>
   <small>X ${building.x} · Z ${building.z} · ${building.turn*90}°</small>
   ${improvementCard(ui,building.id,building.kind,structureLevel(building))}
   <button type="button" class="game-button alt" data-action="select-building" data-id="${esc(building.id)}">Open ${destination[building.kind]}</button>
  </div>`;
 }
 return html;
}
export function villagePanel(ui){
 const world=ui.world,pile=ui.state.data.village.stockpile;
 if(world.placingStockpile)return placementPanel(world.stockpileCandidate,true,ui);
 if(world.placingBuilding)return placementPanel(world.buildingCandidate,false,ui);
 if(!pile)return `<div class="entry village-home"><span class="kicker">A PLACE TO CALL HOME</span><h3>Establish your camp</h3>
  <p>Place a free stockpile on clear ground. This becomes the center of your village and the place to store supplies and plan buildings.</p>
  <small>Free to place · 2 m grid · Clear, level ground</small>
  <button type="button" data-action="place-stockpile">Choose a location</button>
  <button type="button" class="game-button alt" data-action="found-nearby-stockpile">Use a nearby clearing</button></div>`;
 const section=["storage","build","craft","buildings"].includes(ui.villageSection)?ui.villageSection:"storage";
 return `<nav class="section-tabs" aria-label="Village activities">${[["storage","Storage"],["build","Build"],["craft","Craft"],["buildings","Buildings"]].map(([id,label])=>`<button type="button" data-action="village-section" data-section="${id}" class="${section===id?"active":""}" aria-pressed="${section===id}">${label}</button>`).join("")}</nav>`+
  (section==="build"?buildPanel(ui):section==="craft"?craftPanel(ui):section==="buildings"?buildingsPanel(ui):storagePanel(ui));
}
export function selectVillageBuilding(ui,id){return ui.openBuildingPanel(id)}
export function openStockpile(ui){
 ui.villageSection="storage";
 return ui.openPanel("village");
}
export function handleVillageAction(ui,btn){
 const action=btn.dataset.action,world=ui.world,state=ui.state;
 if(action==="find-council"){
  const lodge=state.data.village.buildings.find(b=>b.kind==="council");
  if(lodge){
   ui.closePanel();
   world.focusBuilding?.(lodge.id);
   ui.toast("Click your Council Lodge to manage the tribe.");
  }else ui.toast("Build a Council Lodge to organize villagers.");
  return true;
 }
 if(action==="open-village"){
  if(!state.data.village.stockpile)ui.openFounding();
  else{world.focusStockpile?.();ui.toast("Walk to your stockpile with WASD, then click it to manage the village.");}
  return true;
 }
 if(action==="village-section"){
  if(["storage","build","craft","buildings"].includes(btn.dataset.section))ui.villageSection=btn.dataset.section;
  ui.resetScroll=true;
  ui.render();return true;
 }
 if(action==="view-resident"){
  ui.openResident(btn.dataset.id);return true;
 }
 if(action==="village-craft-axe"||action==="village-craft-tool"){
  if(!near(ui)){ui.toast("Walk near your stockpile to craft.");return true}
  const id=action==="village-craft-axe"?"stone_axe":btn.dataset.item;
  const plan=CRAFTING_PLANS[id];
  if(!plan?.available)return true;
  const pos=world.player.position;
  const ok=state.craftTool(id,pos.x,pos.z);
  ui.toast(ok?ITEMS[id].name+" crafted. "+(id==="stone_axe"?
   "Equip it to gather more wood per interaction.":"Equip it from Inventory.") :
   "Cannot craft "+ITEMS[id].name+". Check research, stored materials and backpack space.");
  return true;
 }
 if(action==="place-stockpile"){
  if(world.beginStockpilePlacement())ui.toast("Choose clear ground, then confirm your stockpile.");
  ui.render();return true;
 }
 if(action==="found-nearby-stockpile"){
  const placed=world.foundSuggestedStockpile();
  if(placed)ui.villageSection="storage";
  ui.toast(placed?"Your village is founded. Click the stockpile to return here.":"No clear ground nearby. Move to a clearing and try again.");
  ui.render();return true;
 }
 if(action==="cancel-stockpile"){world.cancelStockpilePlacement();ui.render();return true}
 if(action==="cancel-building"){world.cancelBuildingPlacement();ui.render();return true}
 if(action==="grid-nudge"){
  const dx=Number(btn.dataset.dx),dz=Number(btn.dataset.dz);
  if(!Number.isInteger(dx)||!Number.isInteger(dz)||Math.abs(dx)+Math.abs(dz)!==1)return true;
  if(world.placingStockpile)world.nudgeStockpile(dx,dz);
  else if(world.placingBuilding)world.nudgeBuilding(dx,dz);
  ui.render();return true;
 }
 if(action==="grid-rotate"){world.rotateBuilding();ui.render();return true}
 if(action==="confirm-stockpile"){
  const result=world.confirmStockpilePlacement();
  if(result.ok)ui.villageSection="storage";
  ui.toast(result.ok?"Village founded. Your stockpile is ready.":result.reason);
  ui.render();return true;
 }
 if(action==="start-building"){
  const kind=btn.dataset.kind;
  ui.villageSection="build";
  if(BUILDINGS[kind]&&world.beginBuildingPlacement(kind,state.data.village))ui.toast("Click terrain to position the "+BUILDINGS[kind].name+".");
  ui.render();return true;
 }
 if(action==="confirm-building"){
  const result=world.confirmBuildingPlacement();
  ui.toast(result.ok?BUILDINGS[result.building.kind].name+" built. Click it to open "+destination[result.building.kind]+".":result.reason);
  ui.render();return true;
 }
 if(action==="upgrade-structure"){
  const p=world.player.position;
  const result=state.upgradeVillage(btn.dataset.id,p.x,p.z);
  ui.toast(result.reason);
  ui.render();
  return true;
 }
 if(action==="select-building"){selectVillageBuilding(ui,btn.dataset.id);return true}
 if(["deposit-all-stockpile","deposit-stockpile","withdraw-stockpile"].includes(action)){
  if(!near(ui)){ui.toast("Move closer to your stockpile to transfer materials.");return true}
  const p=world.player.position;let qty=0;
  if(action==="deposit-all-stockpile")qty=state.depositAllToStockpile(p.x,p.z);
  else if(action==="deposit-stockpile")qty=state.depositToStockpile(btn.dataset.item,12,p.x,p.z);
  else qty=state.withdrawFromStockpile(btn.dataset.item,12,p.x,p.z);
  ui.toast(qty?(action==="withdraw-stockpile"?"Took ":"Deposited ")+qty+
   (action==="deposit-all-stockpile"?" materials.":" "+ITEMS[btn.dataset.item].name+"."):
   "Nothing transferred. Check inventory space and stockpile capacity.");
  return true;
 }
 return false;
}
