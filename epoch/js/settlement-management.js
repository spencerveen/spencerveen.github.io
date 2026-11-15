/**
 * Epoch — Settlement Management.
 * Large, first-class management screen; intentionally independent of the
 * cramped in-world stockpile and building context panels.
 *
 * Read-only view helpers never debit supplies. All mutations are delegated
 * to the existing GameState transactions.
 */
import {ITEMS,STOCKPILE_ITEM_IDS,itemCapacity} from "./inventory.js?v=20261114fish1";
import {VILLAGER_JOBS} from "./villager-jobs.js?v=20261114jobs2";
import {cargoCount,cargoLabel} from "./villager-hauling.js?v=20261114haul1";
import {VILLAGE_UPGRADES,structureLevel,stockpileLevel} from "./village-development.js?v=20261114development1";
import {nearStockpile} from "./stockpile.js?v=20261114development1";
import {BUILDINGS} from "./settlement.js?v=20261114development1";
import {normalizedHunger,hungryStatus} from "./villager-nutrition.js?v=20261115food1";
import {normalizedEnergy,villagerActivityText,villagerDayPhase} from "./villager-routines.js?v=20261115life1";

export const MANAGEMENT_SECTIONS=Object.freeze(["overview","people","buildings","supplies"]);
export const MANAGEMENT_SECTION_NAMES=Object.freeze({
 overview:"Overview",people:"People & Jobs",buildings:"Development",supplies:"Supplies"
});
export const manageSearchText=(person,jobName,homeName)=>
 [person?.name,person?.job,jobName,homeName].filter(Boolean).join(" ").toLowerCase();
export function managementNeedsAttention(person){
 return normalizedHunger(person?.hunger)<=48||
  normalizedEnergy(person?.energy)<=25||person?.resting===true;
}
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({
 "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[c]);
const pct=(value,max)=>max>0?Math.min(100,Math.max(0,100*value/max)):0;
const itemName=id=>ITEMS[id]?.name||id.replaceAll("_"," ");
const itemText=id=>`${ITEMS[id]?.icon||"•"} ${esc(itemName(id))}`;
const navSection=(id,active)=>`<button type="button" class="sm-nav-btn ${id===active?"active":""}"
 data-action="settlement-section" data-section="${id}" aria-current="${id===active?"page":"false"}">
 <span class="sm-nav-icon" aria-hidden="true">${({overview:"◈",people:"♙",buildings:"⌂",supplies:"▤"})[id]}</span>
 <span>${MANAGEMENT_SECTION_NAMES[id]}</span></button>`;
const kpi=(title,value,detail,tone="")=>`<article class="sm-kpi ${tone}">
 <span>${esc(title)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small>
 </article>`;
const action=(section,title,description,icon)=>`<button type="button" class="sm-action"
 data-action="settlement-section" data-section="${section}">
 <span aria-hidden="true">${icon}</span><strong>${esc(title)}</strong><small>${esc(description)}</small>
 </button>`;
const meter=(value,max)=>`<div class="sm-track" aria-hidden="true"><i style="width:${pct(value,max).toFixed(1)}%"></i></div>`;
function overview(ui){
 const state=ui.state,v=state.data.village,roster=v.residents||[];
 const hauling=state.villageHaulingStatus(),food=state.villageFoodStatus(),
  storage=state.stockpileInfo(),housing=state.villageHousing();
 const employed=roster.filter(p=>p.job&&p.job!=="idle").length;
 const underfed=roster.filter(managementNeedsAttention);
 const freeBeds=state.villageCapacity()-v.population;
 const stocks=storage.items||{},shift=villagerDayPhase(state.clockInfo().hour);
 const actions=[
  action("people","Manage workers","Assign professions and homes without opening profiles.","♙"),
  action("buildings","Develop buildings","Order improvements and compare their exact costs.","⌂"),
  action("supplies","Inspect supplies","See stock levels, food reserves and items in transit.","▤")
 ].join("");
 const alerts=[];
 if(food.critical)alerts.push(`<li class="sm-alert warn">${food.critical} villager${food.critical===1?" is":"s are"} critically hungry. Stock prepared meals or assign a forager.</li>`);
 else if(food.hungry>food.meals)alerts.push(`<li class="sm-alert warn">${food.hungry} residents need meals but only ${food.meals} edible items are stored.</li>`);
 if(storage.used>=storage.capacity)alerts.push('<li class="sm-alert warn">Stockpile is full. Deliveries will stop until space is available.</li>');
 else if(storage.used>storage.capacity*.85)alerts.push('<li class="sm-alert">Stockpile is nearly full. Consider expanding the granary.</li>');
 if(freeBeds<=0)alerts.push('<li class="sm-alert">All beds are occupied. Improve a hut before recruiting a larger tribe.</li>');
 if(!employed&&roster.length)alerts.push('<li class="sm-alert">No residents are assigned to work yet. You can assign jobs in People.</li>');
 const jobs=Object.entries(VILLAGER_JOBS).filter(([id])=>id!=="idle").map(([id,job])=>{
  const count=roster.filter(p=>p.job===id).length;
  return `<div class="sm-job-count"><span>${esc(job.name)}</span><strong>${count}</strong></div>`;
 }).join("");
 return `<div class="sm-section-intro"><div><span class="sm-eyebrow">AT A GLANCE</span>
 <h3>Life in your settlement</h3><p>The whole village, without walking between every hut and workshop.</p></div>
 <span class="sm-shift">Current shift · ${shift==="night"?"Night rest":shift==="work"?"Workday":shift==="evening"?"Evening":"Morning"}</span></div>
 <div class="sm-kpis">
 ${kpi("Population",v.population+" / "+state.villageCapacity(),freeBeds+" available beds",freeBeds===0?"warning":"")}
 ${kpi("Workers",employed+" / "+roster.length,roster.length-employed+" unassigned")}
 ${kpi("Ready meals",food.meals,food.hungry+" hungry villagers",food.critical?"warning":"")}
 ${kpi("Storage",storage.used+" / "+storage.capacity,hauling.inTransit+" items being carried",storage.used>=storage.capacity?"warning":"")}
 </div>
 <div class="sm-section-heading"><h3>Quick management</h3><span>One stop for the village</span></div>
 <div class="sm-actions">${actions}</div>
 ${alerts.length?`<div class="sm-section-heading"><h3>Needs attention</h3><span>${alerts.length} notices</span></div><ul class="sm-alerts">${alerts.join("")}</ul>`:""}
 <div class="sm-split">
 <section class="sm-card"><div class="sm-card-heading"><h3>Workforce</h3><span>${employed} assigned</span></div>
 <div class="sm-work-grid">${jobs}</div>
 <button type="button" class="sm-link" data-action="settlement-section" data-section="people">Review all residents</button></section>
 <section class="sm-card"><div class="sm-card-heading"><h3>Village readiness</h3><span>${v.buildings.length} built structures</span></div>
 <p>Housing · ${v.population} / ${state.villageCapacity()}</p>${meter(v.population,state.villageCapacity())}
 <p>Storage · ${storage.used} / ${storage.capacity}</p>${meter(storage.used,storage.capacity)}
 <p class="sm-muted">Wood ${stocks.wood||0} · Stone ${stocks.stone||0} · Vines ${stocks.vines||0} · Berries ${stocks.berries||0}</p>
 <button type="button" class="sm-link" data-action="settlement-section" data-section="buildings">Inspect upgrades</button></section>
 </div>
 <div class="sm-footer-actions">
 <button type="button" data-action="settlement-start-building" class="sm-primary">+ Plan a new structure in the world</button>
 <span>Placement remains a physical village-building action.</span></div>`;
}
function people(ui){
 const state=ui.state,v=state.data.village,roster=v.residents||[],homes=state.villageHousing();
 const busy=roster.filter(p=>p.job!=="idle").length,needs=roster.filter(managementNeedsAttention).length;
 const filter=ui.settlementFilter||"all",query=ui.settlementSearch||"";
 const jobOptions=(current)=>Object.entries(VILLAGER_JOBS).map(([id,job])=>
  `<option value="${id}" ${id===current?"selected":""}>${esc(job.name)}</option>`).join("");
 const homeOptions=(person)=>homes.map(h=>{
  const full=h.occupied>=h.capacity&&person.homeId!==h.id;
  return `<option value="${esc(h.id)}" ${person.homeId===h.id?"selected":""} ${full?"disabled":""}>${esc(h.label)} (${h.occupied}/${h.capacity})</option>`;
 }).join("");
 const rows=roster.map(p=>{
  const actor=ui.world.people.find(a=>a.id===p.id);
  const home=homes.find(h=>h.id===p.homeId);
  const status=villagerActivityText(actor?.work?.mode||"idle",
   villagerDayPhase(state.clockInfo().hour),p.resting,actor?.work?.leisure?.kind||null);
  const energy=Math.round(normalizedEnergy(p.energy)),hunger=Math.round(normalizedHunger(p.hunger));
  const critical=managementNeedsAttention(p);
  const match=(filter==="all"||filter==="needs"&&critical||filter==="workers"&&p.job!=="idle")&&
   manageSearchText(p,VILLAGER_JOBS[p.job]?.name,home?.label).includes(query.toLowerCase().trim());
  const cargo=cargoCount(p.cargo);
  return `<article class="sm-person ${critical?"needs":""}" data-sm-person
   data-sm-search="${esc(manageSearchText(p,VILLAGER_JOBS[p.job]?.name,home?.label))}"
   data-sm-worker="${p.job!=="idle"?"true":"false"}" data-sm-needs="${critical?"true":"false"}"
   ${match?"":"hidden"}>
   <div class="sm-person-head">
    <div><strong>${esc(p.name)}</strong><small>Age ${Number(p.age)||0} · ${esc(home?.label||"Communal camp")} · ${esc(status)}</small></div>
    <span class="sm-pill ${critical?"attention":""}">${critical?esc(hungryStatus(p.hunger)==="Fed"?"Needs rest":hungryStatus(p.hunger)):"Settler"}</span>
   </div>
   <div class="sm-person-vitals">
    <div><span>Energy</span><strong>${energy}%</strong>${meter(energy,100)}</div>
    <div><span>Hunger</span><strong>${hunger}%</strong>${meter(hunger,100)}</div>
   </div>
   <div class="sm-person-controls">
    <label>Occupation<select data-settlement-job="${esc(p.id)}" aria-label="Assign occupation for ${esc(p.name)}">${jobOptions(p.job)}</select></label>
    <label>Residence<select data-settlement-home="${esc(p.id)}" aria-label="Choose residence for ${esc(p.name)}">${homeOptions(p)}</select></label>
    <button type="button" class="sm-secondary" data-action="settlement-profile" data-id="${esc(p.id)}">Profile</button>
   </div>
   ${cargo?`<small class="sm-cargo">Carrying ${esc(cargoLabel(p.cargo))}; delivery remains scheduled</small>`:""}
  </article>`;
 }).join("");
 return `<div class="sm-section-intro"><div><span class="sm-eyebrow">PEOPLE & JOBS</span><h3>Everyone in one place</h3>
 <p>Change jobs or housing directly. Assignments save immediately and keep carried materials intact.</p></div>
 <span class="sm-shift">${busy} working · ${needs} need attention</span></div>
 <div class="sm-people-tools"><label class="sm-search-label">Find resident
 <input id="sm-search" type="search" placeholder="Search names, jobs, homes" autocomplete="off" value="${esc(query)}"></label>
 <div class="sm-filters" role="group" aria-label="Filter villagers">
 ${[["all","All"],["workers","Workers"],["needs","Needs attention"]].map(([id,label])=>
  `<button type="button" data-action="settlement-filter" data-filter="${id}" class="${filter===id?"active":""}" aria-pressed="${filter===id}">${label}</button>`).join("")}
 </div></div>
 <div class="sm-people-list">
 <div class="sm-person sm-leader"><div class="sm-person-head"><div><strong>${esc(state.data.hero.name)}</strong>
 <small>Village leader · Age ${state.data.hero.age} · Generation ${state.data.generation}</small></div><span class="sm-pill">You</span></div></div>
 ${rows||'<div class="sm-empty">No other residents yet. Invite members of nearby tribes to expand the village.</div>'}
 <p class="sm-empty" id="sm-no-results" ${roster.length?"hidden":""}>No villagers match those filters.</p>
 </div>
 <p class="sm-muted">Work shifts: 8 AM–6 PM · Sleep: 8 PM–5 AM. Housing assignments respect available beds.</p>`;
}
function buildingCard(ui,id,kind,level,displayName){
 const definition=VILLAGE_UPGRADES[kind];
 if(!definition)return "";
 const pile=ui.state.data.village.stockpile,items=pile?.items||{};
 const complete=level>=2;
 const check=complete?null:ui.state.canUpgradeVillage(id,0,0,{fromSettlement:true});
 const costs=Object.entries(definition.cost).map(([mat,need])=>
  `<span class="sm-cost ${(items[mat]||0)>=need?"ready":"short"}">${itemText(mat)} <b>${items[mat]||0} / ${need}</b></span>`).join("");
 return `<article class="sm-building">
 <div class="sm-building-head"><div><span class="sm-eyebrow">${esc(displayName)}</span>
 <h4>${esc(definition.title)}</h4></div><span class="sm-pill ${complete?"complete":""}">Level ${level} / 2</span></div>
 <p>${esc(definition.description)}</p>
 <p class="sm-benefit">${esc(definition.benefit)}</p>
 ${!complete?`<div class="sm-costs">${costs}</div>`:""}
 <div class="sm-building-actions">
 ${complete?'<span class="sm-complete">✓ Improvement complete</span>':
 `<button type="button" class="sm-primary" data-action="settlement-upgrade" data-id="${esc(id)}"
 ${!check?.ok?"disabled":""}>Order improvement</button>`}
 ${id!=="stockpile"?`<button type="button" class="sm-secondary" data-action="settlement-building" data-id="${esc(id)}">Open building</button>`:""}
 </div>
 ${check&&!check.ok?`<small class="sm-muted">${esc(check.reason)}</small>`:""}
 </article>`;
}
function buildings(ui){
 const village=ui.state.data.village;
 const structures=village.buildings||[];
 const complete=structures.filter(b=>structureLevel(b)===2).length+(stockpileLevel(village.stockpile)===2?1:0);
 return `<div class="sm-section-intro"><div><span class="sm-eyebrow">DEVELOPMENT</span><h3>Improve the village</h3>
 <p>Order upgrades centrally using materials already delivered into village storage.</p></div>
 <span class="sm-shift">${complete} / ${structures.length+1} improvements completed</span></div>
 <div class="sm-building-grid">
 ${buildingCard(ui,"stockpile","stockpile",stockpileLevel(village.stockpile),"Village stockpile")}
 ${structures.map((b,i)=>buildingCard(ui,b.id,b.kind,structureLevel(b),
 b.kind==="family"?"Hut "+(structures.filter((x,j)=>j<=i&&x.kind==="family").length):BUILDINGS[b.kind]?.name||b.kind)).join("")}
 </div>
 <div class="sm-footer-actions"><button class="sm-primary" data-action="settlement-start-building">+ Place new building</button>
 <span>Building placement takes place in the 3D world. You can return here afterward.</span></div>`;
}
function supplies(ui){
 const state=ui.state,storage=state.stockpileInfo(),v=state.data.village;
 const haul=state.villageHaulingStatus(),food=state.villageFoodStatus();
 const pos=ui.world.player.position,pile=v.stockpile;
 const inRange=nearStockpile(pile,pos.x,pos.z);
 const items=storage.items||{};
 const relevant=STOCKPILE_ITEM_IDS.filter(id=>
  (items[id]||0)>0||state.inventoryCount(id)>0||(haul.byItem[id]||0)>0||
   ["wood","stone","vines","berries","flint","animal_meat","fish_meat"].includes(id));
 const rows=relevant.map(id=>{
  const stored=items[id]||0,backpack=state.inventoryCount(id),carried=haul.byItem[id]||0;
  const take=Math.min(12,stored,itemCapacity(state.data.inventory,id));
  const deposit=Math.min(12,backpack,Math.max(0,storage.capacity-storage.used));
  return `<div class="sm-stock-row"><div class="sm-stock-item"><strong>${itemText(id)}</strong>
   <small>${carried?"Workers carrying "+carried:"No shipments en route"}</small></div>
   <strong class="sm-stock-num">${stored}</strong>
   <span class="sm-stock-backpack">${backpack} in pack</span>
   <div class="sm-stock-buttons"><button type="button" data-action="settlement-transfer"
    data-direction="deposit" data-item="${esc(id)}" ${!inRange||!deposit?"disabled":""}>Deposit ${deposit||12}</button>
    <button type="button" data-action="settlement-transfer" data-direction="withdraw"
    data-item="${esc(id)}" ${!inRange||!take?"disabled":""}>Take ${take||12}</button></div>
   </div>`;
 }).join("");
 return `<div class="sm-section-intro"><div><span class="sm-eyebrow">STORAGE & FOOD</span><h3>Everything in reserve</h3>
 <p>Review village supplies and incoming deliveries without opening individual resource menus.</p></div>
 <span class="sm-shift">${storage.used} / ${storage.capacity} stored</span></div>
 <div class="sm-kpis sm-kpis-three">
 ${kpi("Ready meals",food.meals,food.hungry+" hungry residents",food.critical?"warning":"")}
 ${kpi("In transit",haul.inTransit,"Carried by "+haul.carriers.length+" villagers")}
 ${kpi("Free capacity",storage.capacity-storage.used,"Level "+storage.level+" granary")}
 </div>
 <div class="sm-supplies-bar">${meter(storage.used,storage.capacity)}</div>
 <div class="sm-section-heading"><h3>Stockpile inventory</h3><span>${inRange?"You are close enough to transfer":"Read-only · Visit stockpile for transfers"}</span></div>
 <div class="sm-stock-table">
 <div class="sm-stock-header"><span>Material</span><span>Stored</span><span>Backpack</span><span>Transfer</span></div>
 ${rows}
 </div>
 ${inRange?`<div class="sm-footer-actions"><button type="button" class="sm-primary"
 data-action="settlement-deposit-all" ${state.inventoryUsed()===0||storage.used>=storage.capacity?"disabled":""}>Deposit all carried materials</button>
 <span>Deposits and withdrawals still use physical inventory and capacity.</span></div>`:
 `<div class="sm-footer-actions"><button type="button" class="sm-primary"
 data-action="settlement-find-stockpile">Locate stockpile in the world</button>
 <span>Material transfers require standing within 5 metres of the actual stockpile.</span></div>`}
 ${haul.carriers.length?`<div class="sm-card"><h3>Active deliveries</h3><p>${haul.carriers.map(v=>esc(v.name)+" · "+esc(cargoLabel(v.items))).join(" · ")}</p></div>`:""}`;
}
export function settlementManagementPage(ui,section="overview"){
 const active=MANAGEMENT_SECTIONS.includes(section)?section:"overview";
 const village=ui.state.data.village;
 if(!village.stockpile)return `<div class="sm-unfounded">
 <span class="sm-eyebrow">A SETTLEMENT BEGINS HERE</span><h3>Establish a home for your people</h3>
 <p>Find a safe clearing to establish the village stockpile. Once founded, this screen will show your people, resources, homes and buildings in one place.</p>
 <button type="button" data-action="settlement-found" class="sm-primary">Choose a location for the village</button></div>`;
 const residents=village.residents||[];
 return `<div class="sm-layout">
 <nav class="sm-sidebar" aria-label="Settlement management sections">
 <div class="sm-sidebar-heading"><strong>YOUR SETTLEMENT</strong><small>${village.population} villagers · ${village.buildings.length} buildings</small></div>
 ${MANAGEMENT_SECTIONS.map(id=>navSection(id,active)).join("")}
 <div class="sm-sidebar-bottom"><span>DAILY LIFE</span><strong>${esc(ui.state.clockInfo().label)}</strong>
 <small>Time pauses while you organize the village.</small></div></nav>
 <section class="sm-content" aria-label="${MANAGEMENT_SECTION_NAMES[active]}">
 ${active==="overview"?overview(ui):active==="people"?people(ui):active==="buildings"?buildings(ui):supplies(ui)}
 </section></div>`;
}
