import {SKILLS,TECH,CIVICS,skillLevel} from "./state.js?v=20261115life1";
import {COOKING_RECIPES} from "./cooking.js?v=20261114fish2";
import {ITEMS} from "./inventory.js?v=20261114fish1";
import {FOOD_EFFECTS} from "./survival.js?v=20261114fish1";
import {TRIBE_INTERACT_RANGE,TRIBE_TRUST_GOAL} from "./tribes.js?v=20261114m";
import {BUILDINGS} from "./settlement.js?v=20261114cook1";
import {villagePanel,selectVillageBuilding,openStockpile,handleVillageAction} from "./village-ui.js?v=20261114development2";
import {VILLAGER_JOBS} from "./villager-jobs.js?v=20261114jobs2";
import {cargoLabel,cargoCount} from "./villager-hauling.js?v=20261114haul1";
import {villagerDayPhase,villagerActivityText,normalizedEnergy} from "./villager-routines.js?v=20261115life1";
import {normalizedHunger,hungryStatus,VILLAGER_FOOD_PRIORITY} from "./villager-nutrition.js?v=20261115food1";
import {inventoryPanel,handlePackAction} from "./inventory-ui.js?v=20261114fish1";
import {DEV_CHEATS} from "./dev-cheats.js?v=20261114devpanel1";
import {structureLevel,hearthExtraServing} from "./village-development.js?v=20261114development1";
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const roman=n=>n<=12?["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][n]:String(n);
const names={wood:"Wood",stone:"Stone",food:"Berries",vines:"Vines",knowledge:"Knowledge",culture:"Culture"};
const contexts={lore:"tech",council:"culture",family:"hut",hearth:"building"};
const titles={pack:["YOUR ADVENTURER","Inventory"],skills:["LEARN BY DOING","Skills"],village:["YOUR HOME BASE","Village stockpile"],tech:["TOOLMAKER'S SHELTER","Technology"],culture:["COUNCIL LODGE","Culture"],hut:["HUT","Household"],building:["AROUND THE HEARTH","Cooking Hearth"]};
const skillNotes={woodcutting:"Practice by gathering wood from trees.",mining:"Practice by gathering stone from deposits.",foraging:"Practice by picking wild berries.",crafting:"Practice by crafting equipment.",cooking:"Prepare nourishing meals at a built Cooking Hearth.",construction:"Practice by constructing village buildings.",fishing:"Spear fish in shallow rivers, lakes and coastal waters.",survival:"Grow through gathering and life in the wilderness."};
export class UI{
 constructor(state,world){
  this.state=state;this.world=world;this.tab="pack";this.panelOpen=false;this.villageSection="storage";this.sourceBuildingId=null;this.selectedBuildingId=null;this.selectedSlot=null;this.modal=null;this.activeTribeId=null;this.activeResidentId=null;this.panelMarkup=null;
  this.lastSeenDeath=state.data.lastDeath?.id||0;
  document.querySelectorAll("[data-tab]").forEach(button=>button.addEventListener("click",()=>{if(this.panelOpen&&this.tab===button.dataset.tab)this.closePanel();else this.openPanel(button.dataset.tab)}));
  $("toggle").addEventListener("click",()=>this.modal?this.close():this.menu());
  $("close-panel").addEventListener("click",()=>this.closePanel());
  $("objective-action").addEventListener("click",()=>this.followObjective());
  $("close-modal").addEventListener("click",()=>this.close());
  $("modal").addEventListener("click",e=>{if(e.target===$("modal"))this.close()});
  $("panel").addEventListener("click",e=>this.handleAction(e));$("guide").addEventListener("click",e=>this.handleAction(e));
  document.addEventListener("click",e=>{
   if(this.panelOpen&&this.tab==="pack"&&this.selectedSlot!==null&&!e.target.closest(".pack-slot-shell")){
    this.selectedSlot=null;this.render();
   }
  });
  window.addEventListener("keydown",e=>this.keydown(e));
  state.onChange=()=>{
   world.setDiscovery(state.data.technologies.includes("fire"));
   world.syncVillage(state.data.village);world.applyAppearance(state.data.hero.appearance);
   this.render();
   const death=state.data.lastDeath;
   if(death&&death.id!==this.lastSeenDeath){
    this.lastSeenDeath=death.id;
    if(!death.gameOver)world.respawnAtHome();
    this.showDeathResult();
   }
  };
  state.onVitals=()=>this.renderVitals();
  // Refresh only small energy/hunger indicators, not entire village panels or
  // 3D settlement meshes every second.
  state.onVillagerNeeds=()=>{
   if(!this.panelOpen||this.tab!=="village"||this.villageSection!=="people")return;
   const residents=new Map(state.data.village.residents.map(p=>[p.id,p]));
   for(const meter of $("panel").querySelectorAll("[data-resident-energy]")){
    const person=residents.get(meter.dataset.residentEnergy);
    if(!person)continue;
    const energy=Math.round(normalizedEnergy(person.energy));
    meter.setAttribute("aria-valuenow",String(energy));
    const fill=meter.querySelector(".resident-energy-fill");
    if(fill)fill.style.width=energy+"%";
    const value=meter.querySelector(".resident-energy-value");
    if(value)value.textContent=energy+"% energy";
   }
   for(const meter of $("panel").querySelectorAll("[data-resident-hunger]")){
    const person=residents.get(meter.dataset.residentHunger);
    if(!person)continue;
    const hunger=Math.round(normalizedHunger(person.hunger));
    meter.setAttribute("aria-valuenow",String(hunger));
    const fill=meter.querySelector(".resident-hunger-fill");
    if(fill)fill.style.width=hunger+"%";
    const value=meter.querySelector(".resident-hunger-value");
    if(value)value.textContent=hunger+"% · "+hungryStatus(person.hunger);
   }
   const socialCount=$("panel").querySelector("[data-village-social-count]");
   if(socialCount)socialCount.textContent=
    world.people.filter(p=>p.work?.mode==="socializing").length+" socializing";
   for(const el of $("panel").querySelectorAll("[data-resident-activity]")){
    const actor=world.people.find(p=>p.id===el.dataset.residentActivity);
    const resident=residents.get(el.dataset.residentActivity);
    if(!resident)continue;
    el.textContent=villagerActivityText(actor?.work?.mode||"idle",
     villagerDayPhase(state.clockInfo().hour),resident.resting,
     actor?.work?.leisure?.kind||null);
   }
  };
  world.onWaterModeChange=()=>this.renderVitals();
  world.onInteractionRangeChange=()=>{if(this.panelOpen&&this.tab==="village")this.render()};
  world.setDiscovery(state.data.technologies.includes("fire"));world.syncVillage(state.data.village);world.applyAppearance(state.data.hero.appearance);this.render();
  if(state.data.survival.gameOver)this.showDeathResult();
 }
 renderVitals(){
  const s=this.state.survivalStatus();
  const meter=(name,value,max,label)=>{
   document.getElementById(name+"-value").textContent=label;
   document.getElementById(name+"-bar").style.width=(Math.min(100,Math.max(0,value/max*100)))+"%";
  };
  meter("health",s.health,100,Math.ceil(s.health)+" / 100");
  meter("stamina",s.stamina,s.maxStamina,Math.floor(s.stamina)+" / "+s.maxStamina);
  meter("hunger",s.hunger,100,Math.ceil(s.hunger)+"%");
  // Food buffs remain accessible on hover, without clutter beneath Hunger.
  const water=this.world.waterMotion;
  document.getElementById("stamina-value").title=
   water==="swimming"?"Swimming drains stamina. Release movement to float and recover.":
   water==="exhausted"?"Exhausted in deep water: float to recover stamina before swimming again.":
   water==="floating"?"Floating in deep water: stamina recovers while you rest.":
   s.foodSeconds>0?"Berry boost: +20 maximum Stamina for "+Math.ceil(s.foodSeconds)+" more seconds.":
   s.hunger<=0?"Starving: maximum Stamina reduced to 45.":"";
  document.getElementById("hunger-value").title=s.hunger<=0?
   "Starving: stamina regenerates slowly. Eat berries to recover.":
   s.hunger<25?"Hungry: stamina regeneration is reduced.":"";
  document.body.classList.toggle("survival-critical",s.health<25);
  document.body.classList.toggle("survival-starving",s.hunger<=0);
  document.body.classList.toggle("epoch-game-over",s.gameOver);
 }
 showDeathResult(){
  const death=this.state.data.lastDeath;
  if(!death)return;
  if(death.gameOver){
   this.showDialog("gameover","Your Civilization Has Fallen",
    '<div class="entry"><h3>The last life has ended</h3><p>'+
    esc(death.oldName)+' died from '+esc(death.reason)+
    '. No living villagers remain to continue the settlement.</p>'+
    '<p class="context-note">This world is now ended. Your history remains saved in this slot, but you cannot continue playing. Start a new game to begin another civilization.</p></div>'+
    '<button type="button" data-action="gameover-title">Save and return to title</button>');
  }else{
   this.showDialog("death","A New Leader Rises",
    '<div class="entry"><h3>'+esc(death.oldName)+' has died</h3>'+
    '<p>Cause: '+esc(death.reason)+'.</p><p>'+
    esc(death.successorName)+' now leads your settlement. The village, people, discoveries and buildings survive.</p>'+
    '<p class="context-note">Control has passed to a surviving villager and you have returned home. Designate a successor through People to choose the next leader.</p></div>'+
    '<button type="button" data-action="resume">Continue as '+esc(death.successorName)+'</button>');
  }
 }
 toast(message){const n=document.createElement("div");n.className="toast";n.textContent=message;$("toasts").prepend(n);while($("toasts").children.length>3)$("toasts").lastElementChild.remove();setTimeout(()=>{n.classList.add("fade");setTimeout(()=>n.remove(),350)},3500)}
 status(title,detail){$("action").textContent=title;$("details").textContent=detail}
 hasBuilding(kind){return this.state.data.village.buildings.some(b=>b.kind===kind)}
 contextBuilding(){return this.state.data.village.buildings.find(b=>b.id===this.sourceBuildingId)||null}
 canUseContext(tab){return this.panelOpen&&this.tab===tab&&contexts[this.contextBuilding()?.kind]===tab}
 selectBuilding(id){return selectVillageBuilding(this,id)}
 openBuildingPanel(id){const b=this.state.data.village.buildings.find(b=>b.id===id);if(!b||!contexts[b.kind])return false;this.selectedBuildingId=id;return this.openPanel(contexts[b.kind],{buildingId:id})}
 openResident(id){
  const profile=this.state.residentProfile(id);
  if(!profile)return false;
  this.activeResidentId=id;
  this.activeTribeId=null;
  return this.renderResidentProfile(profile);
 }
 renderResidentProfile(profile){
  if(!profile)return false;
  const {resident,home,homes,connections}=profile;
  const year=y=>y<0?Math.abs(y).toLocaleString()+" BCE":(y+1)+" CE";
  const origin=resident.originTribeName||"the original settlement";
  const arrival=resident.recruitment==="peaceful"?
   "Joined peacefully from "+esc(origin):"Resident of the original settlement";
  const role=resident.role==="formerLeader"?"Former tribal leader":"Villager";
  const selected=this.state.data.successorId===resident.id;
  const worker=this.world.people.find(p=>p.id===resident.id);
  const workStatus=villagerActivityText(worker?.work?.mode||"idle",
   villagerDayPhase(this.state.clockInfo().hour),resident.resting,
   worker?.work?.leisure?.kind||null);
  const energy=Math.round(normalizedEnergy(resident.energy));
  const hunger=Math.round(normalizedHunger(resident.hunger));
  const meal=VILLAGER_FOOD_PRIORITY.find(food=>food.id===resident.lastMeal)?.label||"None yet";
  const load=cargoLabel(resident.cargo);
  const homeLabel=home?.label||"Communal camp";
  const homesHtml=homes.map(unit=>{
   const isCurrent=unit.id===resident.homeId,full=unit.occupied>=unit.capacity;
   return '<div class="resident-home-choice"><span><strong>'+esc(unit.label)+'</strong><small>'+
    unit.occupied+' / '+unit.capacity+' beds occupied</small></span>'+
    '<button type="button" data-action="resident-home" data-id="'+esc(resident.id)+
    '" data-home="'+esc(unit.id)+'" '+(isCurrent||full?'disabled':'')+'>'+
    (isCurrent?'Current home':full?'Full':'Move here')+'</button></div>';
  }).join("");
  const connectionList=(people,empty)=>people.length?people.map(person=>
   '<button type="button" class="resident-link" data-action="view-resident" data-id="'+esc(person.id)+'">'+
   esc(person.name)+'</button>').join(""):'<span class="context-note">'+empty+'</span>';
  const story=resident.memories.length?resident.memories.map(m=>
   '<div class="timeline"><b>'+year(m.year)+'</b><span>'+esc(m.text)+'</span></div>').join(""):
   '<p class="context-note">Their personal chronicle starts here.</p>';
  const html='<div class="building-context"><span class="stat-pill">'+esc(role)+
   '</span><h3>'+esc(resident.name)+'</h3><p>Age '+resident.age+' · '+arrival+'</p></div>'+
   '<div class="entry"><h3>Life in the village</h3>'+
   '<p><strong>Home:</strong> '+esc(homeLabel)+'</p>'+
   '<p><strong>Job:</strong> '+esc(VILLAGER_JOBS[resident.job]?.name||"Unassigned")+'.</p>'+
   '<p><strong>Activity:</strong> '+esc(workStatus)+'</p>'+
   '<p><strong>Energy:</strong> '+energy+' / 100'+(resident.resting?' · Exhausted, recovering':'')+'</p>'+
   '<div class="resident-energy-meter resident-energy-detail" role="progressbar" aria-label="Energy for '+esc(resident.name)+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+energy+'"><span class="resident-energy-track"><span class="resident-energy-fill" style="width:'+energy+'%"></span></span><span class="resident-energy-value">'+energy+'%</span></div>'+ 
   '<p><strong>Hunger:</strong> '+hunger+' / 100 · '+esc(hungryStatus(resident.hunger))+'</p>'+
   '<div class="resident-hunger-meter resident-hunger-detail" role="progressbar" aria-label="Hunger for '+esc(resident.name)+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+hunger+'"><span class="resident-hunger-track"><span class="resident-hunger-fill" style="width:'+hunger+'%"></span></span><span class="resident-hunger-value">'+hunger+'%</span></div>'+
   '<p><strong>Last meal:</strong> '+esc(meal)+'</p>'+
   '<p><strong>Personal cargo:</strong> '+(load?esc(load)+' ('+cargoCount(resident.cargo)+' / 8)':"Empty (0 / 8)")+'</p>'+ 
   '<p><strong>Joined:</strong> '+year(resident.joinedYear)+'</p>'+
   '<p class="context-note">Villagers collect food from village storage when hungry. In free time they visit a constructed Cooking Hearth, gather near the communal clearing, or stroll around the settlement. Meals, work, fatigue, cargo deliveries and sleep always take priority.</p></div>'+  
   '<h3 class="section-heading">Work assignment</h3>'+
   '<p class="context-note">Choose a Stone Age profession. Unassigned villagers remain at home.</p>'+
   '<div class="resident-job-options">'+Object.entries(VILLAGER_JOBS).map(([id,job])=>
    '<button type="button" data-action="resident-job" data-id="'+esc(resident.id)+
    '" data-job="'+id+'" class="'+(resident.job===id?"active":"")+'" '+
    (resident.job===id?'aria-pressed="true"':'aria-pressed="false"')+'>'+esc(job.name)+'</button>').join("")+'</div>'+
   '<div class="entry"><h3>Leadership</h3><p>'+
   (selected?esc(resident.name)+' is your designated successor.':
    'If your character dies, a named successor takes control. Without one, a surviving villager is chosen randomly.')+'</p>'+
   '<button type="button" data-action="name-successor" data-id="'+esc(resident.id)+'">'+
   (selected?'Clear successor':'Name as successor')+'</button></div>'+
   '<h3 class="section-heading">Housing assignment</h3>'+
   '<p class="context-note">Move this resident to an available place without exceeding its bed capacity. The founder occupies one communal camp bed.</p>'+
   '<div class="resident-home-options">'+homesHtml+'</div>'+
   '<h3 class="section-heading">People they know</h3>'+
   '<div class="entry"><h3>Former clanmates</h3>'+
   connectionList(connections.clanmates,"No other villagers from the same tribe.")+
   '<h3>Housemates</h3>'+
   connectionList(connections.housemates,"No other named residents share this home.")+
   '<p class="context-note">These are known shared connections, not confirmed family relationships.</p></div>'+
   '<h3 class="section-heading">Personal chronicle</h3>'+story+
   '<button type="button" class="game-button alt" data-action="resume">Return to the village</button>';
  this.showDialog("resident",resident.name,html);
  return true;
 }
 openStockpile(){return openStockpile(this)}
 openTribe(tribe){
  if(!tribe||!tribe.members?.length)return false;
  this.state.discoverTribe(tribe);
  this.activeTribeId=tribe.id;
  return this.renderTribeEncounter(tribe);
 }
 renderTribeEncounter(tribe){
  const progress=this.state.tribeProgress(tribe.id);
  if(!progress||progress.record.status!=="active")return false;
  const leader=tribe.members.find(m=>m.role==="leader")||tribe.members[0];
  const members=tribe.members.map(member=>
   '<div class="timeline"><b>'+esc(member.name)+'</b><span>'+esc(member.role==="leader"?"Tribal leader":"Tribesperson")+' · Age '+member.age+'</span></div>').join("");
  const disposition=tribe.disposition[0].toUpperCase()+tribe.disposition.slice(1);
  const trust=progress.trust,space=progress.space;
  let interaction="";
  if(!progress.ready && progress.request){
   const request=progress.request;
   const supplies=Object.entries(request.cost).map(([id,need])=>{
    const have=this.state.inventoryCount(id);
    return '<span class="cost-chip '+(have>=need?"met":"missing")+'">'+
     esc(id==="berries"?"Berries":id[0].toUpperCase()+id.slice(1))+
     ' <b>'+have+' / '+need+'</b></span>';
   }).join("");
   interaction='<div class="entry"><h3>'+esc(request.name)+'</h3><p>'+esc(request.description)+
    '</p><div class="research-costs cost-list">'+supplies+'</div>'+
    '<p class="context-note">Bring these supplies in your backpack to this tribal leader. Stored village supplies must be withdrawn first.</p>'+
    '<button type="button" data-action="tribe-aid" data-stage="'+(progress.record.completed||0)+'" '+
    (!this.state.enough(request.cost)?"disabled":"")+
    '>Offer supplies · +35 Trust</button></div>';
  }else if(progress.ready){
   const housing=space>=tribe.population;
   interaction='<div class="entry"><h3>Invite the tribe to settle with you</h3>'+
    '<p>'+esc(leader.name)+' now trusts you enough to relocate their entire tribe. The old camp will be dismantled and its people will become permanent residents.</p>'+
    '<p class="context-note">Free housing '+space+' · Arriving '+tribe.population+'. '+
    (!this.state.data.village.stockpile?"Establish your village stockpile before inviting anyone.":
     !housing?"Build more Huts to make room for the entire tribe.":"Your village has room for everyone.")+'</p>'+
    '<button type="button" data-action="tribe-invite" '+
    (!housing||!this.state.data.village.stockpile?"disabled":"")+
    '>Welcome '+tribe.population+' villagers</button></div>';
  }else{
   interaction='<div class="entry"><p>This tribe has no further requests at present.</p></div>';
  }
  const html='<div class="building-context"><span class="stat-pill">'+esc(disposition)+
   ' tribe · '+tribe.population+' residents</span><p>Meet '+esc(leader.name)+
   ', the leader of this wilderness settlement.</p></div>'+
   '<div class="entry"><div class="research-heading"><h3>Trust</h3><strong>'+trust+
   ' / '+TRIBE_TRUST_GOAL+'</strong></div>'+
   '<div class="bar" role="progressbar" aria-label="Tribal trust" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+trust+
   '"><span style="width:'+trust+'%"></span></div>'+
   '<small>Helping the tribe earns trust. Three unique requests can establish a peaceful alliance.</small></div>'+
   interaction+'<h3 class="section-heading">People of '+esc(tribe.name)+'</h3>'+members+
   '<p class="context-note">Peaceful recruitment only. Invited villagers can be given jobs through Village → People.</p>'+
   '<button type="button" class="game-button alt" data-action="resume">Return to the wilderness</button>';
  this.showDialog("tribe",tribe.name,html);
  return true;
 }
 tribeInReach(){
  if(this.modal!=="tribe"||!this.activeTribeId)return null;
  const camp=[...this.world.tribeCamps.values()].find(c=>c.tribe.id===this.activeTribeId);
  if(!camp)return null;
  const p=this.world.player.position;
  return Math.hypot(p.x-camp.leader.x,p.z-camp.leader.z)<TRIBE_INTERACT_RANGE+.3?camp.tribe:null;
 }
 openFounding(){return !this.state.data.village.stockpile&&this.openPanel("village")}
 openPanel(tab,{buildingId=null}={}){
  if(!titles[tab])return false;
  if(["tech","culture","hut","building"].includes(tab)){const b=this.state.data.village.buildings.find(b=>b.id===buildingId);if(!b||contexts[b.kind]!==tab)return false}
  if(this.modal)this.close();if(tab!=="village")this.cancelPlacement();
  this.selectedSlot=null;this.tab=tab;this.sourceBuildingId=buildingId;this.panelOpen=true;this.resetScroll=true;this.render();$("panel").focus({preventScroll:true});return true;
 }
 cancelPlacement(){if(this.world.placingStockpile)this.world.cancelStockpilePlacement();if(this.world.placingBuilding)this.world.cancelBuildingPlacement()}
 closePanel(){this.selectedSlot=null;this.panelOpen=false;this.cancelPlacement();this.render();(document.querySelector('[data-tab="'+this.tab+'"]')||$("scene")).focus({preventScroll:true})}
 objective(){
  const d=this.state.data,r=d.resources,p=d.village.stockpile,have=id=>this.state.researchResourceCount(id);
  if(!p)return {title:"A place to begin",description:"Choose a clearing. Your stockpile will be the heart of your village.",progress:"First stockpile · free to establish",action:"Establish camp",target:"found"};
  if(!this.hasBuilding("lore"))return {title:"Make room for discovery",description:"Deposit supplies, then build a Toolmaker's Shelter at your stockpile.",progress:p.items.wood+"/12 stored wood · "+p.items.stone+"/8 stored stone",action:"Find stockpile",target:"stockpile"};
  if(!d.technologies.includes("fire"))return {title:"Discover the first flame",description:"Click your Toolmaker's Shelter to research Control of Fire.",progress:have("wood")+"/4 wood · "+have("stone")+"/2 stone · "+d.knowledge+"/3 knowledge",action:"Find toolmaker",target:"lore"};
  if(!d.technologies.includes("tools"))return {title:"Shape your first tools",description:"Research Stone Toolmaking at your Toolmaker's Shelter.",progress:have("wood")+"/5 wood · "+have("stone")+"/6 stone · "+d.knowledge+"/7 knowledge",action:"Find toolmaker",target:"lore"};
  if(!this.hasBuilding("family"))return {title:"Homes for your people",description:"Build a Hut through your stockpile. Click it to inspect the household.",progress:p.items.wood+"/10 stored wood · "+p.items.stone+"/6 stored stone",action:"Find stockpile",target:"stockpile"};
  if(!this.hasBuilding("council"))return {title:"A place for your people",description:"Build a Council Lodge through your stockpile to begin your culture.",progress:p.items.wood+"/14 stored wood · "+p.items.stone+"/8 stored stone",action:"Find stockpile",target:"stockpile"};
  if(!d.civics.includes("community"))return {title:"Become a community",description:"Click the Council Lodge to establish Tribal Community.",progress:have("wood")+"/8 wood · "+have("food")+"/6 berries · "+d.culture+"/5 culture",action:"Find council",target:"council"};
  return {title:"A village worth building",description:"Explore the wilderness, welcome new people, and build Huts for your growing community.",progress:"Your next chapter is yours to choose",action:"Find hut",target:"family"};
 }
 followObjective(){
  const target=this.objective().target;if(target==="found"){this.openFounding();return}if(target==="pack"){this.openPanel("pack");return}
  this.closePanel();if(target==="stockpile"){if(this.world.focusStockpile?.())this.status("Your village stockpile","Click the stockpile to open storage and construction.");return}
  const b=this.state.data.village.buildings.find(b=>b.kind===target);if(b&&this.world.focusBuilding?.(b.id))this.status(BUILDINGS[target].name,"Click the building to open "+titles[contexts[target]][1].toLowerCase()+".");
 }
 pack(){return inventoryPanel(this)}
 skills(){
  let html='<p class="context-note">Your own experience, earned in the world. Traditions help you pass a portion to your descendants.</p>';
  for(const [key,name] of SKILLS){const v=skillLevel(this.state.data.skills[key]||0);html+='<div class="skill"><div class="skill-name"><span>'+name+'</span><b>Level '+v.level+'</b></div><p>'+skillNotes[key]+'</p><div class="bar" role="progressbar" aria-label="'+name+' experience" aria-valuemin="0" aria-valuemax="'+v.next+'" aria-valuenow="'+v.remaining+'"><span style="width:'+(100*v.remaining/v.next).toFixed(2)+'%"></span></div><small>'+v.remaining+' / '+v.next+' XP to next level</small></div>'}return html;
 }
 costChips(cost){return Object.entries(cost).map(([id,need])=>{const have=this.state.researchResourceCount(id);return '<span class="cost-chip '+(have>=need?"met":"missing")+'">'+names[id]+' <b>'+have+' / '+need+'</b></span>'}).join("")}
 trees(kind){
  const d=this.state.data,tech=kind==="tech",data=tech?TECH:CIVICS,owned=tech?d.technologies:d.civics;
  let html='<div class="building-context"><span class="stat-pill">'+(tech?d.knowledge+" knowledge":d.culture+" culture")+'</span><p>'+(tech?"Discoveries your whole civilization will inherit.":"Traditions that connect one generation to the next.")+'</p></div><p class="context-note">'+(tech?"Gain Knowledge by founding a village, constructing new building types and reaching building milestones. Your Toolmaker\'s Shelter produces Knowledge during active play; upgrading its workshop raises production by 50% and speeds villager gathering. Gathering earns skill XP, not Knowledge. ":"An upgraded Council Lodge grants +2 Culture at each new game year. ")+'Material costs use Inventory first, then your village stockpile.</p><div class="research-grid">';
  const nodes=Object.entries(data).sort(([a],[b])=>{const rank=key=>owned.includes(key)?2:this.state.eligible(kind,key)?0:1;return rank(a)-rank(b)});
  for(const [key,node] of nodes){
   const done=owned.includes(key),eligible=this.state.eligible(kind,key),can=eligible&&this.state.enoughResearch(node.cost);
   const req=[...node.needs,...(node.culture||[])].map(x=>TECH[x]?.name||CIVICS[x]?.name||x);
   const missing=Object.entries(node.cost).filter(([id,n])=>this.state.researchResourceCount(id)<n).map(([id,n])=>(n-this.state.researchResourceCount(id))+" "+names[id].toLowerCase());
   html+='<article class="research-card entry '+(done?"unlocked":can?"available":"locked")+'"><div class="research-heading"><h3>'+esc(node.name)+'</h3><span class="tag">'+(done?"Discovered":eligible?"Available":"Locked")+'</span></div><p>'+esc(node.description)+'</p>';
   if(!done){if(req.length)html+='<small class="requirement-list">Requires '+esc(req.join(" · "))+'</small>';html+='<div class="research-costs cost-list">'+this.costChips(node.cost)+'</div>';if(eligible&&missing.length)html+='<small>Need '+esc(missing.join(" and "))+'</small>';html+='<button type="button" data-action="unlock" data-kind="'+kind+'" data-key="'+key+'" '+(!can?"disabled":"")+'>'+(can?(tech?"Research discovery":"Establish tradition"):!eligible?"Complete prerequisites":"More supplies needed")+'</button>'}html+='</article>';
  }return html+"</div>";
 }
 hut(){
  const building=this.contextBuilding();
  if(!building||building.kind!=="family")return '<p class="context-note">This Hut is unavailable.</p>';
  const unit=this.state.villageHousing().find(home=>home.id===building.id);
  if(!unit)return '<p class="context-note">This Hut has no housing record.</p>';
  const residents=(this.state.data.village.residents||[]).filter(p=>p.homeId===building.id);
  let html='<div class="building-context"><span class="stat-pill">Village housing · Level '+structureLevel(building)+' / 2</span>'+
   '<h3>'+esc(unit.label)+'</h3><p>A home for up to '+unit.capacity+' villagers.</p></div>'+
   '<div class="village-population"><div><small>OCCUPIED BEDS</small><strong>'+
   unit.occupied+' / '+unit.capacity+'</strong></div><span>'+
   (unit.capacity-unit.occupied)+' available</span></div>'+
   '<h3 class="section-heading">Who lives here?</h3>';
  if(!residents.length)html+='<div class="entry"><h3>Unoccupied Hut</h3><p>No one has moved into this home yet. Assign villagers from the People section of your village stockpile.</p></div>';
  for(const person of residents){
   const description=person.originTribeName?
    'From '+esc(person.originTribeName):'Longtime village resident';
   html+='<div class="entry resident-row"><div><h3>'+esc(person.name)+'</h3>'+
    '<p>Age '+person.age+' · '+(person.role==="formerLeader"?'Former tribal leader':'Villager')+
    '</p><small>'+description+'</small></div>'+
    '<button type="button" data-action="view-resident" data-id="'+esc(person.id)+
    '">View profile</button></div>';
  }
  html+='<p class="context-note">Upgrade this Hut in Stockpile → Buildings to expand its beds. To assign or move someone into this Hut, open Stockpile → People and select their profile. Designate future leaders from villager profiles; leadership changes happen when the current character dies.</p>';
  return html;
 }
 building(){
  const station=this.contextBuilding();
  if(!station||station.kind!=="hearth")
   return '<p class="context-note">Return to your constructed Cooking Hearth to prepare food.</p>';
  const pos=this.world.player.position,state=this.state;
  const close=Math.hypot(pos.x-station.x,pos.z-station.z)<=6;
  let html='<div class="building-context"><span class="stat-pill">Stone Age cooking · Level '+structureLevel(station)+' / 2 · '+(close?"Fire ready":"Move closer")+
   '</span><h3>Cooking Hearth</h3><p>Roast hunted meat using Wood for fuel. Ingredients are taken from your backpack first, then village storage.</p></div>'+
   '<p class="context-note">Prepared food goes into your backpack. Raw meat and raw fish cannot be eaten. Cooking is immediate for now.</p>'+
   '<div class="village-build-catalog">';
  for(const [id,recipe] of Object.entries(COOKING_RECIPES)){
   const ready=state.cookingPreview(id,pos.x,pos.z),effect=FOOD_EFFECTS[recipe.output.id];
   const servings=recipe.output.qty+hearthExtraServing(state.data.village);
   const cost=Object.entries(recipe.cost).map(([item,n])=>{
    const have=state.inventoryCount(item)+(state.data.village.stockpile?.items?.[item]||0);
    return '<span class="cost-chip '+(have>=n?"met":"missing")+'">'+
     ITEMS[item].icon+' '+esc(ITEMS[item].name)+' <b>'+have+' / '+n+'</b></span>';
   }).join("");
   html+='<div class="entry village-build-card"><div class="research-heading"><h3>'+
    ITEMS[recipe.output.id].icon+' '+esc(recipe.name)+'</h3><span class="tag">×'+
    servings+'</span></div><p>'+esc(recipe.description)+'</p>'+
    '<small class="building-purpose">Per serving: +'+effect.hunger+' Hunger · +'+effect.stamina+
    ' Stamina · +'+effect.health+' Health'+(effect.berryBoost?' · Berry stamina boost':'')+
    '</small><div class="cost-list">'+cost+'</div>'+
    (!close?'<p class="context-note">Move within 6m of the hearth.</p>':
     !ready.ok?'<p class="context-note">'+esc(ready.reason)+'</p>':'')+
    '<button type="button" data-action="cook-recipe" data-recipe="'+id+'" '+
    (!ready.ok?'disabled':'')+'>Cook '+esc(recipe.name)+'</button></div>';
  }
  html+='<p class="context-note">'+(hearthExtraServing(state.data.village)?
   'Improved hearth: +1 extra serving from the same recipe ingredients.':
   'Expand your Cooking Hearth at Stockpile → Buildings for an extra serving per recipe.')+'</p>';
  return html+'</div>';
 }
 render(){
  const d=this.state.data,o=this.objective(),placing=!!(this.world.placingStockpile||this.world.placingBuilding);
  // After founding, the top-left surface becomes a simple survival-only HUD.
  $("objective-guide").hidden=!!d.village.stockpile;
  document.body.classList.toggle("village-established",!!d.village.stockpile);
  this.renderVitals();
  $("year").textContent=this.state.formatYear();$("generation").textContent="GEN "+roman(d.generation);
  $("science").textContent=d.knowledge;$("culture").textContent=d.culture;$("objective-title").textContent=o.title;$("objective-description").textContent=o.description;$("objective-progress").textContent=o.progress;$("objective-action").textContent=o.action;
  document.body.classList.toggle("is-panel-open",this.panelOpen);document.body.classList.toggle("is-placing",placing);
  const right=$("right");right.classList.toggle("open",this.panelOpen);right.classList.toggle("placing",placing);right.dataset.context=this.tab;right.setAttribute("aria-hidden",String(!this.panelOpen));right.inert=!this.panelOpen||!!this.modal;
  const title=placing?["SHAPE YOUR VILLAGE",this.world.placingStockpile?"Establish camp":"Construction"]:titles[this.tab];$("context-eyebrow").textContent=title[0];$("context-title").textContent=title[1];right.setAttribute("aria-label",title[1]);
  document.querySelectorAll("[data-tab]").forEach(n=>{const active=this.panelOpen&&n.dataset.tab===this.tab;n.classList.toggle("active",active);n.setAttribute("aria-expanded",String(active))});
  const modeChanged=placing!==this.lastPlacing;this.lastPlacing=placing;
  const panel=$("panel"),active=document.activeElement,hadFocus=panel.contains(active),focusData=hadFocus&&active!==panel?{...active.dataset}:null;
  const html=this.tab==="pack"?this.pack():this.tab==="skills"?this.skills():this.tab==="village"?villagePanel(this):this.tab==="tech"?this.trees("tech"):this.tab==="culture"?this.trees("civic"):this.tab==="hut"?this.hut():this.building();
  if(this.panelMarkup!==html){const scroll=this.resetScroll||modeChanged?0:panel.scrollTop;panel.innerHTML=html;this.panelMarkup=html;panel.scrollTop=scroll;if(hadFocus){const candidate=focusData&&[...panel.querySelectorAll("button,input,select")].find(n=>Object.entries(focusData).every(([k,v])=>n.dataset[k]===v));(candidate&&!candidate.disabled?candidate:panel).focus({preventScroll:true})}}else if(this.resetScroll||modeChanged)panel.scrollTop=0;this.resetScroll=false;
 }
 handleAction(e){
  const btn=e.target.closest("[data-action]");if(!btn||btn.disabled)return;const action=btn.dataset.action;let message="";
  if(this.state.data.survival.gameOver){
   if(action==="gameover-title"){this.state.save();window.location.reload()}
   return;
  }
  if(action==="dev-cheat"){
   if(this.modal!=="developer")return;
   const key=btn.dataset.cheat,enabled=!this.state.devCheats[key];
   if(this.state.setDevCheat(key,enabled)){
    this.developerPanel(key);
    this.toast(DEV_CHEATS.find(c=>c.key===key).label+(enabled?" enabled.":" disabled."));
   }
   return;
  }
  if(handlePackAction(this,btn)||handleVillageAction(this,btn))return;
  if(action==="cook-recipe"){
   if(!this.canUseContext("building")||this.contextBuilding()?.kind!=="hearth"){
    this.toast("Visit your built Cooking Hearth to prepare meals.");return;
   }
   const p=this.world.player.position;
   this.toast(this.state.cookRecipe(btn.dataset.recipe,p.x,p.z).reason);
   return;
  }
  if(action==="name-successor"){
   if(this.modal!=="resident"||this.activeResidentId!==btn.dataset.id)return;
   const id=this.state.data.successorId===this.activeResidentId?null:this.activeResidentId;
   if(this.state.chooseSuccessor(id)){
    this.openResident(this.activeResidentId);
    this.toast(id?"A successor has been named.":"Successor designation cleared.");
   }
   return;
  }
  if(action==="resident-job"){
   if(this.modal!=="resident"||btn.dataset.id!==this.activeResidentId)return;
   if(this.state.assignResidentJob(this.activeResidentId,btn.dataset.job)){
    this.openResident(this.activeResidentId);
    this.toast("Work assignment saved.");
   }else this.toast("That assignment could not be changed.");
   return;
  }
  if(action==="resident-home"){
   if(this.modal!=="resident"||btn.dataset.id!==this.activeResidentId)return;
   if(this.state.assignResidentHome(this.activeResidentId,btn.dataset.home)){
    this.openResident(this.activeResidentId);
    this.toast("Home assignment saved.");
   }else this.toast("That home has no available bed.");
   return;
  }
  if(action==="tribe-aid"||action==="tribe-invite"){
   const tribe=this.tribeInReach();
   if(!tribe){this.toast("Speak with the tribal leader to continue.");return}
   if(action==="tribe-aid"){
    if(this.state.aidTribe(tribe.id,Number(btn.dataset.stage))){
     this.renderTribeEncounter(tribe);
     this.toast("Your gift was accepted. Tribal trust increased.");
    }else this.toast("You need the requested supplies in your backpack.");
   }else if(this.state.inviteTribe(tribe.id)){
    const people=tribe.members.map(m=>esc(m.name)).join(", ");
    this.showDialog("arrival","A new chapter for your village",
     '<div class="entry"><h3>'+esc(tribe.name)+' has joined your settlement!</h3>'+
     '<p>'+tribe.population+' villagers have settled peacefully at your home. Their former camp has been dismantled.</p>'+
     '<p>'+people+'</p>'+
     '<p class="context-note">These individuals now belong to your permanent village population and will remain after saving and reloading.</p></div>'+
     '<button type="button" data-action="resume">Return to the world</button>');
    this.activeTribeId=null;
   }else this.toast("You need enough housing and full tribal trust to invite everyone.");
   return;
  }
  if(action==="unlock"){if(!this.canUseContext(btn.dataset.kind==="tech"?"tech":"culture")){this.toast("Visit the appropriate village building to continue.");return}message=this.state.unlock(btn.dataset.kind,btn.dataset.key)?"A new chapter of knowledge begins.":"Check prerequisites, inventory and stockpile supplies."}
  else if(action==="cancel-dialog"||action==="resume"){this.close();return}
  else if(action==="help"){this.help();return}
  else if(action==="save"){message=this.state.save()?"Saved in Slot "+(this.state.slot||1)+".":"Unable to save. Check this browser's storage.";if(this.modal==="menu"&&$("save-status"))$("save-status").textContent=message}
  else if(action==="title"){if(this.state.save())window.location.reload();else message="Unable to save. Your game remains open."}
  if(message)this.toast(message);
 }
 showDialog(kind,title,html){
  if(!this.modal)this.dialogReturnFocus=document.activeElement;this.modal=kind;this.world.inputBlocked=true;
  $("dialog-title").textContent=title;$("dialog-eyebrow").textContent=kind==="developer"?"DEVELOPMENT ONLY":kind==="help"?"FIELD NOTES":kind==="tribe"?"ENCOUNTER IN THE WILDERNESS":kind==="resident"?"PEOPLE OF YOUR VILLAGE":kind==="death"?"A LIFE ENDS, A LEADER RISES":kind==="gameover"?"THE END OF A CIVILIZATION":"A MOMENT BY THE FIRE";$("guide").innerHTML=html;$("modal").classList.remove("hidden");
  $("modal").classList.toggle("is-game-over",kind==="gameover");
  for(const id of ["scene","left","hud-tools","right","toggle"])$(id).inert=true;$("toggle").setAttribute("aria-expanded","true");
  ($("guide").querySelector("button:not(:disabled)")||$("close-modal")).focus({preventScroll:true});
 }
 developerPanel(focusKey=null){
  if(this.state.data.survival.gameOver)return;
  const list=DEV_CHEATS.map(({key,label,note})=>{
   const enabled=this.state.devCheats[key];
   return '<button type="button" class="dev-cheat-toggle'+(enabled?' active':'')+
    '" data-action="dev-cheat" data-cheat="'+key+
    '" role="switch" aria-checked="'+String(enabled)+'"><span class="dev-cheat-info"><strong>'+
    esc(label)+'</strong><small>'+esc(note)+'</small></span><span class="dev-cheat-state">'+
    (enabled?'ON':'OFF')+'</span></button>';
  }).join('');
  this.showDialog("developer","Developer Panel",
   '<p class="context-note">Temporary testing tools · Press L or Escape to close. Switches reset when you reload the game.</p>'+
   '<div class="dev-cheat-list">'+list+'</div>'+
   '<p class="dev-cheat-warning">Unlimited Health blocks damage, but only Never Die blocks death at age 100. Cheats cannot revive an ended save.</p>'+
   '<button type="button" class="game-button" data-action="resume">Back to the world</button>');
  if(focusKey)$("guide").querySelector('[data-cheat="'+focusKey+'"]')?.focus({preventScroll:true});
 }
 menu(){this.showDialog("menu","A moment to pause",'<p class="context-note">Slot '+(this.state.slot||1)+' · '+esc(this.state.data.hero.name)+' · Browser-local world</p><div class="menu-grid"><button type="button" class="menu-button" data-action="resume">Return to the world <span>Esc</span></button><button type="button" class="menu-button" data-action="save">Save game <span>↓</span></button><button type="button" class="menu-button" data-action="help">Controls & field notes <span>?</span></button><button type="button" class="menu-button" data-action="title">Save & return to title <span>↗</span></button></div><p id="save-status" class="save-indicator">Progress is saved in this browser. Keep this device’s site data to retain your worlds.</p>')}
 help(){this.showDialog("help","Find your way",'<div class="entry"><h3>Move through the world</h3><p>WASD to walk, Shift to sprint. Swim through deep rivers, lakes and oceans with WASD; Shift swims faster at a greater stamina cost. Stop moving to float and recover when tired. Use WASD to move; clicking terrain does not move your character. Hold arrow keys to smoothly rotate or tilt the camera; right-drag also works. Scroll to zoom. I opens Inventory, K opens Skills. Click inventory items for actions and hover for a short description. Press E to eat one cooked meal or berry from your backpack (berry-roasted meat, roasted meat, roasted fish, then berries). Press F to gather or interact nearby, or collect a carcass; Shift+F clears berry bushes for vines. Press H beside wildlife to hunt or beside visible fish in shallow water to catch them with a Stone Spear. Deer and rabbits flee, and cornered boars can hurt you. Craft Wooden Clubs, Stone Axes, and Stone Spears under Village → Craft. Equipped axes lose durability when chopping wood.</p></div><div class="entry"><h3>Let your village guide you</h3><p><strong>Stockpile → Village.</strong> Deposit supplies, construct buildings, and open People to manage named residents and housing.</p><p><strong>Village residents.</strong> Click their 3D character or nameplate to inspect a profile, assign a Stone Age job, or move them between homes. Woodcutters, Stone Gatherers, Foragers, Hunters, and Fishers visit nearby work sites and return with supplies. Workers carry visible loads, return home at sunset and sleep overnight. Personal energy and hunger affect their ability to work. Villagers walk to stockpile for berries or cooked meals, gather near a built Cooking Hearth and stroll around the settlement during free time, then head home for sleep.</p><p><strong>Toolmaker’s Shelter → Technology.</strong> Research discoveries.</p><p><strong>Council Lodge → Culture.</strong> Establish traditions.</p><p><strong>Cooking Hearth → Cooking.</strong> Roast hunted meat with Wood for fuel. Combine meat with berries for richer meals. Raw meat cannot be eaten.</p><p><strong>Hut → Housing.</strong> See its current residents and available beds. Assign successors from the People profiles.</p><p><strong>Wilderness tribes.</strong> Explore beyond your village to find independent camps. Walk up using WASD, then click a tribal leader, resident, hut or sign (or press F near the leader) to interact.</p></div><div class="entry"><h3>Gather and build</h3><p>Walk close to a tree, rock or berry bush, then click or press F to gather. Trees and stone are finite; berries regrow after two minutes. Shift-click a bush to clear it for vines.</p><p>Place a free stockpile using Establish camp. Deposit gathered supplies there. During construction, click to pin a location, use arrows to adjust, R to rotate, Enter to confirm or Escape to cancel.</p></div><button type="button" class="game-button" data-action="resume">Back to the world</button>')}
 close(){
  if(!this.modal||this.modal==="gameover")return;this.modal=null;this.activeTribeId=null;this.activeResidentId=null;$("modal").classList.add("hidden");for(const id of ["scene","left","hud-tools","toggle"])$(id).inert=false;$("right").inert=!this.panelOpen;this.world.inputBlocked=false;$("toggle").setAttribute("aria-expanded","false");
  const target=this.dialogReturnFocus;(target?.isConnected&&!target.closest("[inert]")?target:$("toggle")).focus({preventScroll:true});
 }
 keydown(e){
  if(!$("start-screen").classList.contains("hidden"))return;
  if(this.modal){
   if(this.modal==="developer"&&e.key.toLowerCase()==="l"&&!e.repeat){
    e.preventDefault();this.close();return;
   }
   if(e.key==="Escape"){e.preventDefault();this.close();return}
   if(e.key==="Tab"){const items=[...$("modal").querySelectorAll("button:not(:disabled),a,input,select,[tabindex='0']")].filter(n=>!n.hidden),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}return;
  }
  if(e.defaultPrevented||["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)||
     document.activeElement?.isContentEditable)return;const key=e.key.toLowerCase();
  if(key==="e"&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey){
   e.preventDefault();
   const eaten=this.state.quickEat();
   this.toast(eaten?(eaten==="berries"?"Ate 1 wild berry. Hunger and stamina restored.":
    "Ate 1 "+ITEMS[eaten].name.toLowerCase()+". Hunger and stamina restored."):
    "No ready-to-eat food in your backpack.");
   return;
  }
  if(key==="l"&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
   e.preventDefault();this.developerPanel();return;
  }
  if(key==="i"||key==="k"){e.preventDefault();const tab=key==="i"?"pack":"skills";if(this.panelOpen&&this.tab===tab)this.closePanel();else this.openPanel(tab)}else if(key==="escape"){e.preventDefault();if(this.panelOpen)this.closePanel();else this.menu()}
 }
}
