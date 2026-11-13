import {PLOTS,PLOT_BY_ID,BUILDINGS} from "./settlement.js?v=20261113k";
import {nearStockpile,STOCKPILE_CAPACITY,VILLAGE_RADIUS,STOCKPILE_INTERACT_RANGE} from "./stockpile.js?v=20261113k";
import {ITEM_IDS,ITEMS} from "./inventory.js?v=20261113k";
const esc=x=>String(x).replace(/[&<>"']/g,v=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[v]));
const cost=items=>Object.entries(items).map(([k,v])=>v+" "+k).join(" · ");
const prereq=name=>({fire:"Control of Fire",tools:"Stone Toolmaking",community:"Tribal Community"}[name]||name);
const near=(ui)=>nearStockpile(ui.state.data.village.stockpile,ui.world.player.position.x,ui.world.player.position.z);
const villageName=id=>BUILDINGS[PLOT_BY_ID[id]?.kind]?.name||"Building";

export function villagePanel(ui){
 const state=ui.state,world=ui.world,d=state.data,village=d.village,pile=village.stockpile;
 const selected=PLOT_BY_ID[ui.selectedPlot]||PLOTS[0],building=BUILDINGS[selected.kind];
 const occupied=!!village.plots[selected.id];
 const checked=state.canBuildPlot(selected.id);
 const site=world.canBuildOnPlot(selected.id);
 const distance=world.distanceToPlot(selected.id);
 const close=distance>=2.65&&distance<=5;
 let html='<div class="panel-title"><h2>Our Village</h2><small>Stone Age</small></div>';
 html+=`<div class="village-population"><div><small>VILLAGE POPULATION</small><strong>${village.population} / ${state.villageCapacity()}</strong></div><span>${PLOTS.filter(p=>village.plots[p.id]).length} / ${PLOTS.length} buildings</span></div>`;
 if(!pile){
  html+='<div class="entry village-home"><h3>🏕 Found Your Village</h3>';
  html+='<p>Choose a place in the procedural forest to make your home. A free wooden stockpile becomes the center of your village, and future structures appear in a building area around it.</p>';
  html+='<small>Placement: 2m grid · Level, cleared ground · Within 18m of your adventurer</small>';
  html+='<small>No resources required to found your first stockpile.</small>';
  html+=world.placingStockpile?
   '<button type="button" data-action="cancel-stockpile">Cancel placement</button><p class="info">Move your cursor over open ground and left-click to place the stockpile. Green is valid, red is blocked.</p>':
   '<button type="button" data-action="place-stockpile">Choose stockpile location</button><button type="button" class="game-button alt" data-action="found-nearby-stockpile">Use nearby clearing</button>';
  html+='</div>';
  html+='<p class="info">You can still gather resources now. Once you establish your home, bring your wood, stone, berries and vines back here.</p>';
  return html;
 }
 const isNear=near(ui),storage=state.stockpileInfo();
 html+=`<div class="entry village-home"><h3>🏕 Village Stockpile <span class="tag">Home base</span></h3>
  <p>Your permanent supply yard anchors this settlement. Bring resources here from the forest. Houses, workshops and hearths are built with <b>stockpiled</b> materials, not items in your backpack.</p>
  <small>Location: ${pile.x}, ${pile.z} · Village building radius: ${VILLAGE_RADIUS}m</small>
  <div class="pack-capacity"><span>Stored village resources</span><strong>${storage.used} / ${STOCKPILE_CAPACITY}</strong></div>`;
 html+=`<div class="stockpile-resource-list">`;
 for(const id of ITEM_IDS){
  html+=`<div class="stockpile-resource-row"><span>${ITEMS[id].icon} ${esc(ITEMS[id].name)}</span>
  <span class="stockpile-balance">Pack <b>${state.inventoryCount(id)}</b> · Stored <b>${storage.items[id]}</b></span>
  <div class="stockpile-actions">
   <button type="button" data-action="deposit-stockpile" data-item="${id}" ${!isNear||!state.inventoryCount(id)||storage.used>=STOCKPILE_CAPACITY?"disabled":""}>Deposit 12</button>
   <button type="button" data-action="withdraw-stockpile" data-item="${id}" ${!isNear||!storage.items[id]?"disabled":""}>Take 12</button>
  </div></div>`;
 }
 html+=`</div><div class="stockpile-primary-actions">
 <button type="button" data-action="return-stockpile">${isNear?"At stockpile ✓":"Walk to stockpile"}</button>
 <button type="button" data-action="deposit-all-stockpile" ${!isNear||state.inventoryUsed()===0||storage.used>=STOCKPILE_CAPACITY?"disabled":""}>Deposit all backpack resources</button></div>
 <small>${isNear?"Close enough to transfer materials.":"You must return to within "+STOCKPILE_INTERACT_RANGE+"m of your stockpile to deposit or withdraw."}</small>
 </div>`;
 html+=`<p class="info">The village's five starter construction sites are laid out around your stockpile. They move with your chosen home. Clear trees or rocks from a site before building.</p>`;
 html+='<div class="village-site-grid">';
 for(const plot of PLOTS){
  const type=BUILDINGS[plot.kind],built=!!village.plots[plot.id];
  html+=`<button type="button" data-action="select-plot" data-plot="${plot.id}" class="${ui.selectedPlot===plot.id?"chosen":""}"><span>${esc(type.short)}</span><small>${built?"✓ Built":"◇ Empty"}</small></button>`;
 }
 html+='</div>';
 html+=`<div class="entry"><h3>${esc(building.name)} ${occupied?'<span class="tag">Built</span>':""}</h3>
 <p>${esc(building.description)}</p>`;
 if(building.capacity)html+=`<small>Housing bonus: +${building.capacity} population capacity</small>`;
 html+=`<small>From stockpile: ${esc(cost(building.cost))}</small>`;
 if(building.requires.length)html+=`<small>Requires: ${esc(building.requires.map(prereq).join(", "))}</small>`;
 const buildStatus=checked.ok&&!site.ok?site.reason:checked.reason;
 html+=`<small>${distance.toFixed(1)}m away · ${occupied?"Completed":esc(buildStatus)}</small>`;
 html+=`<button type="button" class="game-button alt" data-action="visit-plot" data-plot="${selected.id}">Walk to site</button>`;
 if(!occupied)html+=`<button type="button" data-action="build-plot" data-plot="${selected.id}" ${checked.ok&&site.ok?"":"disabled"}>${close?"Construct "+esc(building.name):"Approach site to build"}</button>`;
 html+='</div>';
 html+='<p class="info">This is our first movable village blueprint. Freely positioning every individual hut within the village grid will be a later building-system upgrade.</p>';
 return html;
}
export function selectVillagePlot(ui,id){
 if(!PLOT_BY_ID[id])return;
 ui.selectedPlot=id;ui.tab="village";
 ui.world.highlightPlot(id);ui.render();
 document.getElementById("right")?.classList.add("open");
}
export function openStockpile(ui){
 ui.tab="village";ui.render();
 document.getElementById("right")?.classList.add("open");
}
export function handleVillageAction(ui,btn){
 const action=btn.dataset.action,id=btn.dataset.plot;
 if(action==="open-village"){openStockpile(ui);return true}
 if(action==="place-stockpile"){
  if(ui.world.beginStockpilePlacement()){
   ui.toast("Move the preview over clear ground, then click to found your village.");
   ui.render();
  }
  return true;
 }
 if(action==="found-nearby-stockpile"){
  const okay=ui.world.foundSuggestedStockpile();
  ui.toast(okay?"Village founded! Stockpile is ready for deliveries.":"No clear place nearby. Move to another clearing.");
  ui.render();return true;
 }
 if(action==="cancel-stockpile"){
  ui.world.cancelStockpilePlacement();ui.render();return true;
 }
 if(action==="return-stockpile"){
  if(!near(ui))ui.world.walkToStockpile();
  else ui.toast("You're standing at your village stockpile.");
  return true;
 }
 if(["deposit-all-stockpile","deposit-stockpile","withdraw-stockpile"].includes(action)){
  if(!near(ui)){ui.toast("Walk back to your stockpile before transferring goods.");return true}
  const p=ui.world.player.position,s=ui.state;
  let quantity=0;
  if(action==="deposit-all-stockpile")quantity=s.depositAllToStockpile(p.x,p.z);
  else if(action==="deposit-stockpile")quantity=s.depositToStockpile(btn.dataset.item,12,p.x,p.z);
  else quantity=s.withdrawFromStockpile(btn.dataset.item,12,p.x,p.z);
  ui.toast(quantity?
   (action==="withdraw-stockpile"?"Took ":"Deposited ")+quantity+
   (action==="deposit-all-stockpile"?" resources.":" "+ITEMS[btn.dataset.item].name+"."):
   "Nothing transferred. Check your pack or remaining stockpile space.");
  return true;
 }
 if(!PLOT_BY_ID[id])return false;
 if(action==="select-plot"){selectVillagePlot(ui,id);return true}
 if(action==="visit-plot"){selectVillagePlot(ui,id);ui.world.walkToPlot(id);return true}
 if(action!=="build-plot")return false;
 selectVillagePlot(ui,id);
 const check=ui.state.canBuildPlot(id),site=ui.world.canBuildOnPlot(id);
 if(!check.ok||!site.ok){ui.toast(check.ok?site.reason:check.reason);return true}
 const distance=ui.world.distanceToPlot(id);
 if(distance>5||distance<2.65){
  const reachable=ui.world.walkToPlot(id);
  ui.toast(reachable?"Move to the site, then press Construct again.":"The site is unreachable.");
 }else{
  const built=ui.state.buildVillagePlot(id);
  ui.toast(built?villageName(id)+" constructed with village stockpile supplies!":ui.state.canBuildPlot(id).reason);
 }
 return true;
}
