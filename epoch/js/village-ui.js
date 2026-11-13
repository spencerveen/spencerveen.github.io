import {PLOTS,PLOT_BY_ID,BUILDINGS} from "./settlement.js?v=20261113j";
const escapeHTML=x=>String(x).replace(/[&<>"']/g,v=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[v]));
const cost=items=>Object.entries(items).map(([k,v])=>v+" "+k).join(" · ");
const prereq=name=>({fire:"Control of Fire",tools:"Stone Toolmaking",community:"Tribal Community"}[name]||name);

export function villagePanel(ui){
 const state=ui.state,world=ui.world,d=state.data,village=d.village;
 const selected=PLOT_BY_ID[ui.selectedPlot]||PLOTS[0];
 const building=BUILDINGS[selected.kind],occupied=!!village.plots[selected.id],check=state.canBuildPlot(selected.id);
 const distance=world.distanceToPlot(selected.id),near=distance>=2.65&&distance<=5;
 const capacity=state.villageCapacity();
 let html=`<div class="panel-title"><h2>Our Village</h2><small>Stone Age</small></div>`;
 html+=`<div class="village-population"><div><small>VILLAGE POPULATION</small><strong>${village.population} / ${capacity}</strong></div><span>${PLOTS.filter(p=>village.plots[p.id]).length} / ${PLOTS.length} plots built</span></div>`;
 html+=`<p class="info">Each Family Hut adds space for <b>3 more villagers</b>. Population growth and villager jobs will arrive later. Select a plot in the world to begin construction.</p>`;
 html+=`<div class="village-site-grid">`;
 for(const plot of PLOTS){
  const type=BUILDINGS[plot.kind],built=!!village.plots[plot.id];
  html+=`<button type="button" data-action="select-plot" data-plot="${plot.id}" class="${ui.selectedPlot===plot.id?"chosen":""}"><span>${escapeHTML(type.short)}</span><small>${built?"✓ Built":"◇ Empty"}</small></button>`;
 }
 html+=`</div>`;
 html+=`<div class="entry"><h3>${escapeHTML(building.name)} ${occupied?'<span class="tag">Built</span>':""}</h3><p>${escapeHTML(building.description)}</p>`;
 if(building.capacity)html+=`<small>Housing: +${building.capacity} population capacity</small>`;
 html+=`<small>Materials: ${escapeHTML(cost(building.cost))}</small>`;
 if(building.requires.length)html+=`<small>Requires: ${escapeHTML(building.requires.map(prereq).join(", "))}</small>`;
 html+=`<small>${distance.toFixed(1)}m away · ${occupied?"This site is complete.":check.reason}</small>`;
 html+=`<button class="game-button alt" data-action="visit-plot" data-plot="${selected.id}">Walk to construction site</button>`;
 if(!occupied)html+=`<button data-action="build-plot" data-plot="${selected.id}" ${check.ok?"":"disabled"}>${near?"Construct "+escapeHTML(building.name):"Approach plot to build"}</button>`;
 html+=`</div>`;
 html+=`<p class="info">Cooking, technology production and cultural bonuses are reserved for the next milestone. These structures currently establish the village layout.</p>`;
 return html;
}
export function selectVillagePlot(ui,id){
 if(!PLOT_BY_ID[id])return;
 ui.selectedPlot=id;ui.tab="village";
 ui.world.highlightPlot(id);
 ui.render();
 document.getElementById("right")?.classList.add("open");
}
export function handleVillageAction(ui,btn){
 const action=btn.dataset.action,id=btn.dataset.plot;
 if(action==="open-village"){selectVillagePlot(ui,ui.selectedPlot);return true}
 if(!PLOT_BY_ID[id])return false;
 if(action==="select-plot"){selectVillagePlot(ui,id);return true}
 if(action==="visit-plot"){selectVillagePlot(ui,id);ui.world.walkToPlot(id);return true}
 if(action!=="build-plot")return false;
 selectVillagePlot(ui,id);
 const check=ui.state.canBuildPlot(id);
 if(!check.ok){ui.toast(check.reason);return true}
 const distance=ui.world.distanceToPlot(id);
 if(distance>5||distance<2.65){
  const reachable=ui.world.walkToPlot(id);
  ui.toast(reachable?"Approach the plot, then press Construct again.":"The plot is unreachable from here.");
 }else{
  const built=ui.state.buildVillagePlot(id);
  ui.toast(built?BUILDINGS[PLOT_BY_ID[id].kind].name+" constructed!":ui.state.canBuildPlot(id).reason);
 }
 return true;
}
