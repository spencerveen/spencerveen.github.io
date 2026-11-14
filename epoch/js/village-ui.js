import {BUILDINGS} from "./settlement.js?v=20261114a";
import {nearStockpile,STOCKPILE_CAPACITY,VILLAGE_RADIUS,STOCKPILE_INTERACT_RANGE} from "./stockpile.js?v=20261114a";
import {ITEM_IDS,ITEMS} from "./inventory.js?v=20261114a";
import {UNIQUE_BUILDINGS} from "./village-placement.js?v=20261114a";
const esc=x=>String(x).replace(/[&<>"']/g,v=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[v]));
const cost=items=>Object.entries(items).map(([k,v])=>v+" "+k).join(" · ");
const prereq=id=>({fire:"Control of Fire",tools:"Stone Toolmaking",community:"Tribal Community"}[id]||id);
const near=ui=>nearStockpile(ui.state.data.village.stockpile,ui.world.player.position.x,ui.world.player.position.z);
const kindIcon={family:"🏠",hearth:"🔥",lore:"🪓",council:"🪶"};
const arrows=()=>`<div class="village-placement-controls" role="group" aria-label="Move building preview by 2 meters">
 <button type="button" data-action="grid-nudge" data-dx="0" data-dz="-1" aria-label="Move forward two meters">↑</button>
 <div class="village-control-middle">
  <button type="button" data-action="grid-nudge" data-dx="-1" data-dz="0" aria-label="Move left two meters">←</button>
  <span>2m grid</span>
  <button type="button" data-action="grid-nudge" data-dx="1" data-dz="0" aria-label="Move right two meters">→</button>
 </div>
 <button type="button" data-action="grid-nudge" data-dx="0" data-dz="1" aria-label="Move backward two meters">↓</button>
 </div>`;
const placementPanel=(candidate,stockpile=false,ui)=>{
 const name=stockpile?"Founding Stockpile":BUILDINGS[ui.world.placingBuilding]?.name||"Building";
 let valid=!!candidate?.ok,reason=candidate?.reason||"Move preview over clear ground.";
 if(!stockpile&&candidate){
  const checked=ui.state.canPlaceVillageBuilding(candidate.kind,candidate.x,candidate.z,candidate.turn,ui.world);
  valid=valid&&checked.ok;
  if(!checked.ok)reason=checked.reason;
 }
 return `<div class="entry village-placement-panel">
  <h3>◇ Position: ${esc(name)}</h3>
  <p>Move the preview by clicking terrain, using the arrow controls, or pressing the keyboard arrow keys. The gold grid appears only during building mode.</p>
  ${arrows()}
  ${stockpile?"":'<button type="button" class="game-button alt" data-action="grid-rotate">↻ Rotate 90° (R)</button>'}
  <div class="village-placement-result ${valid?"valid":"invalid"}">
   ${valid?"✓ Valid location":"✕ Cannot build here"} · X ${candidate?.x??"—"}, Z ${candidate?.z??"—"}${stockpile?"":" · "+((candidate?.turn||0)*90)+"°"}
   <small>${esc(reason)}</small>
  </div>
  <div class="village-placement-buttons">
   <button type="button" data-action="${stockpile?"confirm-stockpile":"confirm-building"}" ${!valid?"disabled":""}>✓ Confirm Placement</button>
   <button type="button" class="game-button alt" data-action="${stockpile?"cancel-stockpile":"cancel-building"}">Cancel</button>
  </div>
  <small>Keyboard: arrow keys to move, Enter to confirm, Escape to cancel${stockpile?"":", R to rotate"}.</small>
 </div>`;
};
export function villagePanel(ui){
 const state=ui.state,world=ui.world,village=state.data.village,pile=village.stockpile;
 const buildings=village.buildings||[];
 let html='<div class="panel-title"><h2>Our Village</h2><small>Free build grid</small></div>';
 html+=`<div class="village-population"><div><small>VILLAGE POPULATION</small><strong>${village.population} / ${state.villageCapacity()}</strong></div><span>${buildings.length} constructed</span></div>`;
 if(!pile){
  html+='<div class="entry village-home"><h3>🏕 Found Your Village</h3>';
  html+='<p>Your first Stockpile defines your village center. Place it on clear ground, then return with gathered resources. No huts or construction slots appear until you choose what to build.</p>';
  html+='<small>Free first stockpile · 2m snapping · Clear, level ground</small>';
  if(world.placingStockpile)html+=placementPanel(world.stockpileCandidate,true,ui);
  else html+='<button type="button" data-action="place-stockpile">Choose stockpile location</button><button type="button" class="game-button alt" data-action="found-nearby-stockpile">Found at nearby clearing</button>';
  html+='</div>';
  return html;
 }
 const atHome=near(ui),storage=state.stockpileInfo();
 html+=`<div class="entry village-home"><h3>🏕 Village Stockpile <span class="tag">Home base</span></h3>
 <p>Resources collected in your Pack must be brought home. Village construction costs come from this stockpile.</p>
 <small>Center X ${pile.x}, Z ${pile.z} · Building radius ${VILLAGE_RADIUS}m · Grid 2m</small>
 <div class="pack-capacity"><span>Stored materials</span><strong>${storage.used} / ${STOCKPILE_CAPACITY}</strong></div>`;
 html+='<div class="stockpile-resource-list">';
 for(const id of ITEM_IDS){
  html+=`<div class="stockpile-resource-row"><span>${ITEMS[id].icon} ${esc(ITEMS[id].name)}</span>
  <span class="stockpile-balance">Pack <b>${state.inventoryCount(id)}</b> · Stored <b>${storage.items[id]}</b></span>
  <div class="stockpile-actions">
   <button type="button" data-action="deposit-stockpile" data-item="${id}" ${!atHome||!state.inventoryCount(id)||storage.used>=STOCKPILE_CAPACITY?"disabled":""}>Deposit 12</button>
   <button type="button" data-action="withdraw-stockpile" data-item="${id}" ${!atHome||!storage.items[id]?"disabled":""}>Take 12</button>
  </div></div>`;
 }
 html+=`</div><div class="stockpile-primary-actions">
 <button type="button" data-action="return-stockpile">${atHome?"At stockpile ✓":"Walk to stockpile"}</button>
 <button type="button" data-action="deposit-all-stockpile" ${!atHome||state.inventoryUsed()===0||storage.used>=STOCKPILE_CAPACITY?"disabled":""}>Deposit all backpack resources</button></div>
 <small>${atHome?"You are close enough to transfer resources.":"Move within "+STOCKPILE_INTERACT_RANGE+"m to transfer materials."}</small></div>`;
 html+='<div class="panel-title"><h2>Construction</h2><small>Place each structure yourself</small></div>';
 html+='<p class="info">No preset construction circles. Choose a building to open the 2-meter grid, move its preview wherever you like within village territory, then confirm. Trees, rocks, steep ground and other buildings can block a location.</p>';
 if(world.placingBuilding)html+=placementPanel(world.buildingCandidate,false,ui);
 html+='<div class="village-build-catalog">';
 for(const [kind,building] of Object.entries(BUILDINGS)){
  const already=UNIQUE_BUILDINGS.includes(kind)&&buildings.some(b=>b.kind===kind);
  const locked=building.requires.filter(req=>!state.data.technologies.includes(req)&&!state.data.civics.includes(req));
  const missing=Object.entries(building.cost).filter(([id,n])=>(storage.items[id]||0)<n);
  html+=`<div class="entry village-build-card"><h3>${kindIcon[kind]} ${esc(building.name)}${already?' <span class="tag">Built</span>':""}</h3>
   <p>${esc(building.description)}</p>
   ${building.capacity?"<small>+3 housing capacity per hut</small>":""}
   <small>From stockpile: ${esc(cost(building.cost))}</small>
   ${building.requires.length?'<small>Requires '+esc(building.requires.map(prereq).join(", "))+'</small>':""}
   <button type="button" data-action="start-building" data-kind="${kind}" ${already||locked.length?"disabled":""}>
    ${already?"Already built":locked.length?"Unlock "+esc(prereq(locked[0])):world.placingBuilding===kind?"Change placement":"Place "+esc(building.name)}
   </button>
   ${missing.length&&!already?'<small>Gather and deposit more '+esc(missing.map(([id])=>id).join(" and "))+' before confirming.</small>':""}
  </div>`;
 }
 html+='</div>';
 if(buildings.length){
  html+='<div class="panel-title"><h2>Constructed Buildings</h2><small>Saved in your village</small></div>';
  for(const building of buildings){
   const def=BUILDINGS[building.kind];
   html+=`<div class="entry village-built-item ${ui.selectedBuildingId===building.id?"chosen":""}">
    <strong>${kindIcon[building.kind]} ${esc(def.name)}</strong>
    <small>X ${building.x}, Z ${building.z} · ${building.turn*90}°</small>
    <button type="button" class="game-button alt" data-action="select-building" data-id="${esc(building.id)}">View building</button>
   </div>`;
  }
 }
 return html;
}
export function selectVillageBuilding(ui,id){
 ui.selectedBuildingId=id;ui.tab="village";ui.render();
 document.getElementById("right")?.classList.add("open");
}
export function openStockpile(ui){
 ui.tab="village";ui.render();document.getElementById("right")?.classList.add("open");
}
export function handleVillageAction(ui,btn){
 const action=btn.dataset.action,world=ui.world,state=ui.state;
 if(action==="open-village"){openStockpile(ui);return true}
 if(action==="place-stockpile"){
  if(world.beginStockpilePlacement())ui.toast("Move your stockpile preview, then confirm its position.");
  ui.render();return true;
 }
 if(action==="found-nearby-stockpile"){
  ui.toast(world.foundSuggestedStockpile()?"Village stockpile established!":"No clear ground nearby; move to a clearing.");
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
  ui.toast(result.ok?"Village founded! Your Stockpile is ready.":result.reason);
  ui.render();return true;
 }
 if(action==="start-building"){
  const kind=btn.dataset.kind;
  if(BUILDINGS[kind]&&world.beginBuildingPlacement(kind,state.data.village))
   ui.toast("Move the "+BUILDINGS[kind].name+" preview using arrows or the ground.");
  ui.render();return true;
 }
 if(action==="confirm-building"){
  const result=world.confirmBuildingPlacement();
  ui.toast(result.ok?BUILDINGS[result.building.kind].name+" constructed!":result.reason);
  ui.render();return true;
 }
 if(action==="select-building"){selectVillageBuilding(ui,btn.dataset.id);return true}
 if(action==="return-stockpile"){
  if(!near(ui))world.walkToStockpile();
  else ui.toast("You're standing at your village stockpile.");
  return true;
 }
 if(["deposit-all-stockpile","deposit-stockpile","withdraw-stockpile"].includes(action)){
  if(!near(ui)){ui.toast("Return to your stockpile before transferring resources.");return true}
  const p=world.player.position;let qty=0;
  if(action==="deposit-all-stockpile")qty=state.depositAllToStockpile(p.x,p.z);
  else if(action==="deposit-stockpile")qty=state.depositToStockpile(btn.dataset.item,12,p.x,p.z);
  else qty=state.withdrawFromStockpile(btn.dataset.item,12,p.x,p.z);
  ui.toast(qty?(action==="withdraw-stockpile"?"Took ":"Deposited ")+qty+
   (action==="deposit-all-stockpile"?" resources.":" "+ITEMS[btn.dataset.item].name+"."):
   "Nothing transferred. Check pack space or stockpile capacity.");
  return true;
 }
 return false;
}
