/**
 * Epoch — Civic management belongs to a constructed Council Lodge.
 *
 * The council organizes people, work, homes, succession and traditions.
 * The stockpile owns materials/construction; huts own household details;
 * the Toolmaker's Shelter owns technology; the Hearth owns cooking.
 *
 * The saved building remains kind="council" across future ages, so stages
 * can evolve without migrating resident IDs, home links or culture progress.
 */
import {VILLAGER_JOBS} from "./villager-jobs.js?v=20261114jobs2";
import {cargoCount,cargoLabel} from "./villager-hauling.js?v=20261114haul1";
import {VILLAGE_UPGRADES,structureLevel} from "./village-development.js?v=20261114development1";
import {normalizedHunger,hungryStatus} from "./villager-nutrition.js?v=20261115food1";
import {normalizedEnergy,villagerActivityText,villagerDayPhase} from "./villager-routines.js?v=20261115life1";
import {councilLodge,councilStage} from "./council-evolution.js?v=20261115council1";
import {residentRelationships} from "./relationships.js?v=20261115relations1";

export const MANAGEMENT_SECTIONS=Object.freeze(["overview","people","traditions"]);
export const MANAGEMENT_SECTION_NAMES=Object.freeze({
 overview:"Overview",people:"People & Jobs",traditions:"Traditions & Leadership"
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
const navSection=(id,active)=>`<button type="button" class="sm-nav-btn ${id===active?"active":""}"
 data-action="settlement-section" data-section="${id}" aria-current="${id===active?"page":"false"}">
 <span class="sm-nav-icon" aria-hidden="true">${({overview:"◈",people:"♙",traditions:"❖"})[id]}</span>
 <span>${MANAGEMENT_SECTION_NAMES[id]}</span></button>`;
const kpi=(title,value,detail,tone="")=>`<article class="sm-kpi ${tone}">
 <span>${esc(title)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small>
 </article>`;
const action=(section,title,description,icon)=>`<button type="button" class="sm-action"
 data-action="settlement-section" data-section="${section}">
 <span aria-hidden="true">${icon}</span><strong>${esc(title)}</strong><small>${esc(description)}</small>
 </button>`;
const meter=(value,max)=>`<div class="sm-track" aria-hidden="true"><i style="width:${pct(value,max).toFixed(1)}%"></i></div>`;
const successorName=state=>state.data.village.residents.find(
 p=>p.id===state.data.successorId)?.name||null;

function overview(ui,lodge,stage){
 const state=ui.state,v=state.data.village,roster=v.residents||[];
 const food=state.villageFoodStatus(),housing=state.villageHousing();
 const employed=roster.filter(p=>p.job&&p.job!=="idle").length;
 const needs=roster.filter(managementNeedsAttention).length;
 const freeBeds=state.villageCapacity()-v.population;
 const shift=villagerDayPhase(state.clockInfo().hour);
 const social=state.villageRelationshipSummary();
 const alerts=[];
 if(food.critical)alerts.push(`<li class="sm-alert warn">${food.critical} villager${food.critical===1?" is":"s are"} critically hungry. Prepare food at the Cooking Hearth and deliver it to the stockpile.</li>`);
 if(needs)alerts.push(`<li class="sm-alert">${needs} villager${needs===1?" needs":"s need"} food or rest.</li>`);
 if(freeBeds<=0)alerts.push('<li class="sm-alert">All beds are occupied. Expand a Hut through the stockpile before recruiting more people.</li>');
 if(!employed&&roster.length)alerts.push('<li class="sm-alert">No residents have been assigned work. Use People & Jobs to assign villagers.</li>');
 const jobCounts=Object.entries(VILLAGER_JOBS).filter(([id])=>id!=="idle").map(([id,job])=>
  `<div class="sm-job-count"><span>${esc(job.name)}</span><strong>${roster.filter(p=>p.job===id).length}</strong></div>`).join("");
 return `<div class="sm-section-intro"><div><span class="sm-eyebrow">${esc(stage.era.toUpperCase())} · COUNCIL</span>
 <h3>Life in your tribe</h3><p>Organize villagers and carry your community into the next generation.</p></div>
 <span class="sm-shift">${shift==="night"?"Night rest":shift==="work"?"Workday":shift==="evening"?"Evening":"Morning"} · ${esc(state.clockInfo().label)}</span></div>
 <div class="sm-kpis">
 ${kpi("Population",v.population+" / "+state.villageCapacity(),freeBeds+" available beds",freeBeds<=0?"warning":"")}
 ${kpi("Assigned workers",employed+" / "+roster.length,roster.length-employed+" unassigned")}
 ${kpi("Ready meals",food.meals,food.hungry+" villagers hungry",food.critical?"warning":"")}
 ${kpi("Tribal Culture",state.data.culture,state.data.civics.length+" traditions established")}
 </div>
 <div class="sm-section-heading"><h3>Council duties</h3><span>Village leadership</span></div>
 <div class="sm-actions">
 ${action("people","Manage your people","Assign jobs, choose homes and name the next leader.","♙")}
 ${action("traditions","Guide the tribe","Develop civic traditions and plan succession.","❖")}
 <button type="button" class="sm-action" data-action="council-open-culture">
 <span aria-hidden="true">✦</span><strong>Culture tree</strong><small>Spend Culture on Stone Age traditions.</small></button>
 </div>
 ${alerts.length?`<div class="sm-section-heading"><h3>Needs attention</h3><span>${alerts.length} notices</span></div>
 <ul class="sm-alerts">${alerts.join("")}</ul>`:""}
 <div class="sm-split">
 <section class="sm-card"><div class="sm-card-heading"><h3>Workforce</h3><span>${employed} assigned</span></div>
 <div class="sm-work-grid">${jobCounts}</div>
 <button type="button" class="sm-link" data-action="settlement-section" data-section="people">Manage assignments</button></section>
 <section class="sm-card"><div class="sm-card-heading"><h3>Leadership</h3><span>Generation ${state.data.generation}</span></div>
 <p>Current leader · ${esc(state.data.hero.name)}</p>
 <p>Designated successor · ${esc(successorName(state)||"Not selected")}</p>
 <p>Home spaces · ${housing.reduce((sum,h)=>sum+h.capacity-h.occupied,0)} unoccupied</p>
 <p>Friendships · ${social.friendships} · Partnerships · ${social.partnerships}</p>
 <button type="button" class="sm-link" data-action="settlement-section" data-section="traditions">Plan succession & traditions</button></section></div>
 <div class="sm-footer-actions"><span>For building improvements and inventory, visit the Stockpile. Huts manage their own households; the Toolmaker and Hearth keep their original functions.</span></div>`;
}
function people(ui){
 const state=ui.state,v=state.data.village,roster=v.residents||[],homes=state.villageHousing();
 const busy=roster.filter(p=>p.job!=="idle").length,needs=roster.filter(managementNeedsAttention).length;
 const campers=roster.filter(p=>p.homeId==="camp").length;
 const freeHutBeds=homes.filter(h=>h.id!=="camp").reduce((n,h)=>n+Math.max(0,h.capacity-h.occupied),0);
 const filter=ui.settlementFilter||"all",query=(ui.settlementSearch||"").toLowerCase().trim();
 const jobOptions=current=>Object.entries(VILLAGER_JOBS).map(([id,job])=>
  `<option value="${id}" ${id===current?"selected":""}>${esc(job.name)}</option>`).join("");
 const homeOptions=person=>homes.map(h=>{
  const full=h.occupied>=h.capacity&&person.homeId!==h.id;
  return `<option value="${esc(h.id)}" ${person.homeId===h.id?"selected":""} ${full?"disabled":""}>${esc(h.label)} (${h.occupied}/${h.capacity})</option>`;
 }).join("");
 const rows=roster.map(p=>{
  const actor=ui.world.people.find(a=>a.id===p.id);
  const home=homes.find(h=>h.id===p.homeId);
  const status=villagerActivityText(actor?.work?.mode||"idle",
   villagerDayPhase(state.clockInfo().hour),p.resting,actor?.work?.leisure?.kind||null);
  const energy=Math.round(normalizedEnergy(p.energy)),hunger=Math.round(normalizedHunger(p.hunger));
  const critical=managementNeedsAttention(p),chosen=state.data.successorId===p.id;
  const match=(filter==="all"||filter==="needs"&&critical||filter==="workers"&&p.job!=="idle")&&
   manageSearchText(p,VILLAGER_JOBS[p.job]?.name,home?.label).includes(query);
  const cargo=cargoCount(p.cargo);
  const bonds=residentRelationships(v,p.id,state.data.hero);
  const partner=bonds.find(b=>b.stage==="Partner");
  const friendCount=bonds.filter(b=>b.affinity>=18).length;
  return `<article class="sm-person ${critical?"needs":""}" data-sm-person
   data-sm-search="${esc(manageSearchText(p,VILLAGER_JOBS[p.job]?.name,home?.label))}"
   data-sm-worker="${p.job!=="idle"?"true":"false"}" data-sm-needs="${critical?"true":"false"}"
   ${match?"":"hidden"}>
   <div class="sm-person-head"><div><strong>${esc(p.name)}</strong>
    <small>Age ${Number(p.age)||0}${p.age<18?" · Child":""} · ${esc(home?.label||"Communal camp")} · ${esc(status)}</small>
    <small>${partner?"Partner of "+esc(partner.name)+" · ":""}${friendCount} friend${friendCount===1?"":"s"}</small></div>
    <span class="sm-pill ${chosen?"complete":critical?"attention":""}">${chosen?"Successor":critical?esc(hungryStatus(p.hunger)==="Fed"?"Needs rest":hungryStatus(p.hunger)):"Settler"}</span></div>
   <div class="sm-person-vitals">
    <div><span>Energy</span><strong>${energy}%</strong>${meter(energy,100)}</div>
    <div><span>Hunger</span><strong>${hunger}%</strong>${meter(hunger,100)}</div>
   </div>
   <div class="sm-person-controls">
    <label>Occupation<select data-settlement-job="${esc(p.id)}" aria-label="Assign occupation for ${esc(p.name)}" ${p.age<18?"disabled title=\"Children cannot take adult professions until age 18\"":""}>${jobOptions(p.job)}</select></label>
    <label>Residence<select data-settlement-home="${esc(p.id)}" aria-label="Choose residence for ${esc(p.name)}">${homeOptions(p)}</select></label>
    <button type="button" class="sm-secondary" data-action="settlement-profile" data-id="${esc(p.id)}">Profile</button>
   </div>
   <div class="sm-person-footer">
   <button type="button" class="sm-link" data-action="council-successor" data-id="${esc(p.id)}">
   ${chosen?"✓ Clear successor designation":"Designate as successor"}</button>
   ${cargo?`<small class="sm-cargo">Carrying ${esc(cargoLabel(p.cargo))}; delivery remains scheduled</small>`:""}
   </div></article>`;
 }).join("");
 return `<div class="sm-section-intro"><div><span class="sm-eyebrow">PEOPLE & JOBS</span><h3>Everyone in the tribe</h3>
 <p>Assign jobs, move villagers into Huts, and designate your next leader. Changes save immediately.</p></div>
 <span class="sm-shift">${busy} assigned · ${needs} need attention</span></div>
 ${freeHutBeds>0&&campers>0?`<div class="sm-footer-actions sm-house-camp">
 <button type="button" class="sm-primary" data-action="council-house-camp">
 Move ${Math.min(campers,freeHutBeds)} camper${Math.min(campers,freeHutBeds)===1?"":"s"} into Huts</button>
 <span>Assign available real Hut beds in one step. Already housed families keep their rooms.</span>
 </div>`:""}
 <div class="sm-people-tools"><label class="sm-search-label">Find resident
 <input id="sm-search" type="search" placeholder="Search names, jobs, homes" autocomplete="off" value="${esc(query)}"></label>
 <div class="sm-filters" role="group" aria-label="Filter villagers">
 ${[["all","All"],["workers","Workers"],["needs","Needs attention"]].map(([id,label])=>
  `<button type="button" data-action="settlement-filter" data-filter="${id}" class="${filter===id?"active":""}" aria-pressed="${filter===id}">${label}</button>`).join("")}
 </div></div>
 <div class="sm-people-list">
 <div class="sm-person sm-leader"><div class="sm-person-head"><div><strong>${esc(state.data.hero.name)}</strong>
 <small>Village leader · Age ${state.data.hero.age} · Generation ${state.data.generation}</small></div><span class="sm-pill">You</span></div></div>
 ${rows||'<div class="sm-empty">No other residents yet. Befriend a neighboring tribe to invite new people.</div>'}
 <p class="sm-empty" id="sm-no-results" ${roster.length?"hidden":""}>No villagers match those filters.</p>
 </div>
 <p class="sm-muted">Work 8 AM–6 PM · Sleep 8 PM–5 AM. Assigning a new home respects available beds, and working villagers keep their carried resources.</p>`;
}
function traditions(ui,lodge,stage){
 const state=ui.state,v=state.data.village,successor=successorName(state);
 const complete=structureLevel(lodge)>=2;
 const upgrade=VILLAGE_UPGRADES.council;
 const can=complete?null:state.canUpgradeVillage(lodge.id,0,0,{fromSettlement:true});
 const pile=v.stockpile?.items||{};
 const cost=Object.entries(upgrade.cost).map(([item,count])=>
  `<span class="sm-cost ${(pile[item]||0)>=count?"ready":"short"}">${esc(item)} <b>${pile[item]||0} / ${count}</b></span>`).join("");
 const recent=(v.deceased||[]).slice(-5).reverse();
 return `<div class="sm-section-intro"><div><span class="sm-eyebrow">CULTURE & INHERITANCE</span>
 <h3>Traditions that endure</h3><p>The Council Lodge carries your village's identity through generations.</p></div>
 <span class="sm-shift">${esc(stage.name)} · Level ${structureLevel(lodge)}</span></div>
 <div class="sm-kpis sm-kpis-three">
 ${kpi("Culture available",state.data.culture,"Spend it on civic traditions")}
 ${kpi("Traditions",state.data.civics.length,"Unlocked for future generations")}
 ${kpi("Generation",state.data.generation,successor?"Successor chosen":"Succession not planned")}
 </div>
 <div class="sm-building-grid">
 <section class="sm-building"><div class="sm-building-head"><div><span class="sm-eyebrow">CULTURE</span>
 <h4>Tribal traditions</h4></div><span class="sm-pill">Inherited</span></div>
 <p>Establish customs and shared values that will outlast the current leader.</p>
 <p class="sm-benefit">Traditions already researched: ${state.data.civics.length}.</p>
 <div class="sm-building-actions"><button type="button" class="sm-primary"
 data-action="council-open-culture">Open Culture tree</button></div></section>
 <section class="sm-building"><div class="sm-building-head"><div><span class="sm-eyebrow">SUCCESSION</span>
 <h4>The next leader</h4></div><span class="sm-pill">Generation ${state.data.generation}</span></div>
 <p>Current leader: ${esc(state.data.hero.name)}</p>
 <p>Designated successor: <strong>${esc(successor||"Not selected")}</strong></p>
 <p class="sm-benefit">Without a designation, a surviving villager is chosen when the leader dies.</p>
 <div class="sm-building-actions"><button type="button" class="sm-secondary"
 data-action="settlement-section" data-section="people">Choose from residents</button></div></section>
 <section class="sm-building"><div class="sm-building-head"><div><span class="sm-eyebrow">COUNCIL DEVELOPMENT</span>
 <h4>${esc(upgrade.title)}</h4></div><span class="sm-pill ${complete?"complete":""}">Level ${structureLevel(lodge)} / 2</span></div>
 <p>${esc(upgrade.description)}</p><p class="sm-benefit">${esc(upgrade.benefit)}</p>
 ${complete?'<span class="sm-complete">✓ Council improvement completed</span>':
 `<div class="sm-costs">${cost}</div><div class="sm-building-actions"><button type="button" class="sm-primary"
 data-action="settlement-upgrade" data-id="${esc(lodge.id)}" ${!can?.ok?"disabled":""}>Improve Council Lodge</button></div>
 ${can&&!can.ok?`<small class="sm-muted">${esc(can.reason)}</small>`:""}`}
 </section>
 <section class="sm-building"><div class="sm-building-head"><div><span class="sm-eyebrow">TRIBAL HISTORY</span>
 <h4>Remember those before us</h4></div></div>
 ${recent.length?recent.map(p=>`<p>${esc(p.name)} · ${esc(p.cause||"Remembered by the tribe")}</p>`).join(""):
 '<p>Your tribe’s story is still unfolding.</p>'}</section></div>
 <div class="sm-footer-actions"><span>Future ages can develop this Lodge into more advanced civic institutions while keeping the same people, traditions and saved building identity.</span></div>`;
}
export function settlementManagementPage(ui,section="overview"){
 const active=MANAGEMENT_SECTIONS.includes(section)?section:"overview";
 const lodge=councilLodge(ui.state.data.village),stage=councilStage(lodge);
 if(!lodge)return `<div class="sm-unfounded"><span class="sm-eyebrow">COUNCIL NOT BUILT</span>
 <h3>Build a Council Lodge</h3><p>Construct a Council Lodge through your Stockpile to unlock tribal administration, professions and succession planning.</p></div>`;
 const v=ui.state.data.village;
 return `<div class="sm-layout"><nav class="sm-sidebar" aria-label="Council Lodge sections">
 <div class="sm-sidebar-heading"><strong>${esc(stage.name.toUpperCase())}</strong>
 <small>${esc(stage.era)} · Level ${structureLevel(lodge)}<br/>${v.population} villagers</small></div>
 ${MANAGEMENT_SECTIONS.map(id=>navSection(id,active)).join("")}
 <div class="sm-sidebar-bottom"><span>THE COUNCIL CONVENES</span>
 <strong>${esc(ui.state.clockInfo().label)}</strong><small>Time pauses while you organize your tribe.</small></div>
 </nav><section class="sm-content" aria-label="${MANAGEMENT_SECTION_NAMES[active]}">
 ${active==="overview"?overview(ui,lodge,stage):active==="people"?people(ui):traditions(ui,lodge,stage)}
 </section></div>`;
}
