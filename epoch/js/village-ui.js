import {BUILDINGS} from "./settlement.js?v=20261114u";
import {nearStockpile,STOCKPILE_CAPACITY,VILLAGE_RADIUS,STOCKPILE_INTERACT_RANGE} from "./stockpile.js?v=20261114a";
import {ITEM_IDS,ITEMS,itemCapacity} from "./inventory.js?v=20261114a";
import {UNIQUE_BUILDINGS} from "./village-placement.js?v=20261114b";
const esc=x=>String(x).replace(/[&<>"']/g,v=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[v]));
const prereq=id=>({fire:"Control of Fire",tools:"Stone Toolmaking",community:"Tribal Community"}[id]||id);
const near=ui=>nearStockpile(ui.state.data.village.stockpile,ui.world.player.position.x,ui.world.player.position.z);
const kindIcon={family:"⌂",hearth:"♨",lore:"✦",council:"❖"};
const destination={family:"Housing",lore:"Technology",council:"Culture",hearth:"Hearth"};
const purpose={
 family:"A home for three villagers. Open it to see who lives here and check available beds.",
 lore:"Your place of discovery. Open it to research technologies for your people.",
 council:"The heart of shared tradition. Open it to develop culture and inheritance.",
 hearth:"A communal fire for your village. Cooking recipes will arrive in a later update."
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
 let html=`<div class="pack-capacity"><span>Village storage</span><strong>${storage.used} / ${STOCKPILE_CAPACITY}</strong></div>
  <p class="context-note">Bring gathered materials here. All village buildings use these stored supplies.</p>
  <div class="stockpile-primary-actions">
   <button type="button" data-action="deposit-all-stockpile" ${!atHome||state.inventoryUsed()===0||storage.used>=STOCKPILE_CAPACITY?"disabled":""}>Deposit all materials</button>
   ${!atHome?'<p class="context-note">Move closer with WASD to use storage.</p>':""}
  </div>
  <div class="stockpile-resource-list">`;
 for(const id of ITEM_IDS){
  const carried=state.inventoryCount(id),stored=storage.items[id]||0;
  const deposit=Math.min(12,carried,STOCKPILE_CAPACITY-storage.used);
  const take=Math.min(12,stored,itemCapacity(state.data.inventory,id));
  html+=`<div class="stockpile-resource-row"><span>${ITEMS[id].icon} ${esc(ITEMS[id].name)}</span>
   <span class="stockpile-balance">Stored <b>${stored}</b> · Carried <b>${carried}</b></span>
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
  '</p><button type="button" data-action="village-section" data-section="people">Meet your people →</button></div>';
 return html;
}
function peoplePanel(ui){
 const state=ui.state,people=state.data.village.residents||[],homes=state.villageHousing();
 let html='<div class="village-population"><div><small>SETTLEMENT POPULATION</small><strong>'+
  state.data.village.population+' / '+state.villageCapacity()+
  '</strong></div><span>'+people.length+' other residents</span></div>'+
  '<p class="context-note">Each villager has their own identity, story and place to live. Select someone to learn about them or move them between available homes.</p>'+
  '<h3 class="section-heading">Housing</h3>';
 for(const h of homes){
  html+='<div class="timeline"><b>'+esc(h.label)+'</b><span>'+
   (h.id==="camp"?"Founder + ":"")+h.occupied+' / '+h.capacity+
   ' resident beds occupied</span></div>';
 }
 html+='<h3 class="section-heading">Village residents</h3>'+
  '<div class="entry"><h3>'+esc(state.data.hero.name)+'</h3><p>Village leader · Generation '+
  state.data.generation+' · Communal camp</p><small>The active character you control.</small></div>';
 if(!people.length)html+='<p class="context-note">Your founder is alone. Befriend a wilderness tribe to invite your first neighbors.</p>';
 for(const person of people){
  const home=homes.find(h=>h.id===person.homeId);
  const source=person.originTribeName||"Original settler";
  html+='<div class="entry resident-row"><div><h3>'+esc(person.name)+'</h3><p>Age '+person.age+
   ' · '+esc(home?.label||"Communal camp")+'</p><small>'+
   (person.recruitment==="peaceful"?"Welcomed from "+esc(source):"Longtime villager")+
   '</small></div><button type="button" data-action="view-resident" data-id="'+esc(person.id)+'">View profile</button></div>';
 }
 return html;
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
   <small class="building-purpose">${kind==="family"?"View residents · +3 housing capacity":kind==="hearth"?"Visible village fire":"Opens "+destination[kind]}</small>
   ${!already?requiredMaterials(definition.cost,items):""}
   ${already?`<button type="button" data-action="select-building" data-id="${esc(existing[0].id)}">Open ${destination[kind]}</button>`:
    `<button type="button" data-action="start-building" data-kind="${kind}" ${locked.length?"disabled":""}>${locked.length?"Requires "+esc(prereq(locked[0])):"Place "+esc(definition.name)}</button>`}
   ${!already&&missing?`<small class="context-note">Need ${esc(missing)} more in storage.</small>`:""}
  </div>`;
 }
 return html+"</div>";
}
function buildingsPanel(ui){
 const buildings=ui.state.data.village.buildings;
 if(!buildings.length)return '<div class="empty-state"><h3>Your village begins here</h3><p>Build a shelter for discovery, a lodge for culture, or more homes for your people.</p><button type="button" data-action="village-section" data-section="build">Browse blueprints</button></div>';
 let html='<p class="context-note">Click these buildings in the world to return to their activities.</p>';
 for(const building of buildings){
  const definition=BUILDINGS[building.kind];
  if(!definition)continue;
  html+=`<div class="entry village-built-item ${ui.selectedBuildingId===building.id?"chosen":""}">
   <strong>${kindIcon[building.kind]} ${esc(definition.name)}</strong><span class="tag">${destination[building.kind]}</span>
   <small>X ${building.x} · Z ${building.z} · ${building.turn*90}°</small>
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
 const section=["storage","build","buildings","people"].includes(ui.villageSection)?ui.villageSection:"storage";
 return `<nav class="section-tabs" aria-label="Village activities">${[["storage","Storage"],["build","Build"],["buildings","Buildings"],["people","People"]].map(([id,label])=>`<button type="button" data-action="village-section" data-section="${id}" class="${section===id?"active":""}" aria-pressed="${section===id}">${label}</button>`).join("")}</nav>`+
  (section==="build"?buildPanel(ui):section==="buildings"?buildingsPanel(ui):section==="people"?peoplePanel(ui):storagePanel(ui));
}
export function selectVillageBuilding(ui,id){return ui.openBuildingPanel(id)}
export function openStockpile(ui){
 ui.villageSection="storage";
 return ui.openPanel("village");
}
export function handleVillageAction(ui,btn){
 const action=btn.dataset.action,world=ui.world,state=ui.state;
 if(action==="open-village"){
  if(!state.data.village.stockpile)ui.openFounding();
  else{world.focusStockpile?.();ui.toast("Walk to your stockpile with WASD, then click it to manage the village.");}
  return true;
 }
 if(action==="village-section"){
  if(["storage","build","buildings","people"].includes(btn.dataset.section))ui.villageSection=btn.dataset.section;
  ui.resetScroll=true;
  ui.render();return true;
 }
 if(action==="view-resident"){
  ui.openResident(btn.dataset.id);return true;
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
