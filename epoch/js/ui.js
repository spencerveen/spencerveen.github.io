import {SKILLS,TECH,CIVICS,skillLevel} from "./state.js?v=20261114j";
import {BUILDINGS} from "./settlement.js?v=20261114b";
import {villagePanel,selectVillageBuilding,openStockpile,handleVillageAction} from "./village-ui.js?v=20261114b";
import {inventoryPanel,handlePackAction} from "./inventory-ui.js?v=20261114b";
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const roman=n=>n<=12?["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][n]:String(n);
const names={wood:"Wood",stone:"Stone",food:"Berries",vines:"Vines",knowledge:"Knowledge",culture:"Culture"};
const contexts={lore:"tech",council:"culture",family:"dynasty",hearth:"building"};
const titles={pack:["YOUR ADVENTURER","Inventory"],skills:["LEARN BY DOING","Skills"],village:["YOUR HOME BASE","Village stockpile"],tech:["TOOLMAKER'S SHELTER","Technology"],culture:["COUNCIL LODGE","Culture"],dynasty:["FAMILY HUT","Your dynasty"],building:["AROUND THE HEARTH","Cooking Hearth"]};
const skillNotes={woodcutting:"Practice by gathering wood from trees.",mining:"Practice by gathering stone from deposits.",foraging:"Practice by picking wild berries.",crafting:"Practice by crafting equipment.",construction:"Practice by constructing village buildings.",survival:"Grow through gathering and life in the wilderness."};
export class UI{
 constructor(state,world){
  this.state=state;this.world=world;this.tab="pack";this.panelOpen=false;this.villageSection="storage";this.sourceBuildingId=null;this.selectedBuildingId=null;this.selectedSlot=null;this.modal=null;this.panelMarkup=null;
  document.querySelectorAll("[data-tab]").forEach(button=>button.addEventListener("click",()=>{if(this.panelOpen&&this.tab===button.dataset.tab)this.closePanel();else this.openPanel(button.dataset.tab)}));
  $("toggle").addEventListener("click",()=>this.modal?this.close():this.menu());
  $("close-panel").addEventListener("click",()=>this.closePanel());
  $("objective-action").addEventListener("click",()=>this.followObjective());
  $("close-modal").addEventListener("click",()=>this.close());
  $("modal").addEventListener("click",e=>{if(e.target===$("modal"))this.close()});
  $("panel").addEventListener("click",e=>this.handleAction(e));$("guide").addEventListener("click",e=>this.handleAction(e));
  window.addEventListener("keydown",e=>this.keydown(e));
  state.onChange=()=>{world.setDiscovery(state.data.technologies.includes("fire"));world.syncVillage(state.data.village);world.applyAppearance(state.data.hero.appearance);this.render()};
  world.onInteractionRangeChange=()=>{if(this.panelOpen&&this.tab==="village")this.render()};
  world.setDiscovery(state.data.technologies.includes("fire"));world.syncVillage(state.data.village);world.applyAppearance(state.data.hero.appearance);this.render();
 }
 toast(message){const n=document.createElement("div");n.className="toast";n.textContent=message;$("toasts").prepend(n);while($("toasts").children.length>3)$("toasts").lastElementChild.remove();setTimeout(()=>{n.classList.add("fade");setTimeout(()=>n.remove(),350)},3500)}
 status(title,detail){$("action").textContent=title;$("details").textContent=detail}
 hasBuilding(kind){return this.state.data.village.buildings.some(b=>b.kind===kind)}
 contextBuilding(){return this.state.data.village.buildings.find(b=>b.id===this.sourceBuildingId)||null}
 canUseContext(tab){return this.panelOpen&&this.tab===tab&&contexts[this.contextBuilding()?.kind]===tab}
 selectBuilding(id){return selectVillageBuilding(this,id)}
 openBuildingPanel(id){const b=this.state.data.village.buildings.find(b=>b.id===id);if(!b||!contexts[b.kind])return false;this.selectedBuildingId=id;return this.openPanel(contexts[b.kind],{buildingId:id})}
 openStockpile(){return openStockpile(this)}
 openFounding(){return !this.state.data.village.stockpile&&this.openPanel("village")}
 openPanel(tab,{buildingId=null}={}){
  if(!titles[tab])return false;
  if(["tech","culture","dynasty","building"].includes(tab)){const b=this.state.data.village.buildings.find(b=>b.id===buildingId);if(!b||contexts[b.kind]!==tab)return false}
  if(this.modal)this.close();if(tab!=="village")this.cancelPlacement();
  this.tab=tab;this.sourceBuildingId=buildingId;this.panelOpen=true;this.resetScroll=true;this.render();$("panel").focus({preventScroll:true});return true;
 }
 cancelPlacement(){if(this.world.placingStockpile)this.world.cancelStockpilePlacement();if(this.world.placingBuilding)this.world.cancelBuildingPlacement()}
 closePanel(){this.panelOpen=false;this.cancelPlacement();this.render();(document.querySelector('[data-tab="'+this.tab+'"]')||$("scene")).focus({preventScroll:true})}
 objective(){
  const d=this.state.data,r=d.resources,p=d.village.stockpile,have=id=>this.state.researchResourceCount(id);
  if(!p)return {title:"A place to begin",description:"Choose a clearing. Your stockpile will be the heart of your village.",progress:"First stockpile · free to establish",action:"Establish camp",target:"found"};
  if(!this.hasBuilding("lore"))return {title:"Make room for discovery",description:"Deposit supplies, then build a Toolmaker's Shelter at your stockpile.",progress:p.items.wood+"/12 stored wood · "+p.items.stone+"/8 stored stone",action:"Find stockpile",target:"stockpile"};
  if(!d.technologies.includes("fire"))return {title:"Discover the first flame",description:"Click your Toolmaker's Shelter to research Control of Fire.",progress:have("wood")+"/4 wood · "+have("stone")+"/2 stone · "+d.knowledge+"/3 knowledge",action:"Find toolmaker",target:"lore"};
  if(!d.technologies.includes("tools"))return {title:"Shape your first tools",description:"Research Stone Toolmaking at your Toolmaker's Shelter.",progress:have("wood")+"/5 wood · "+have("stone")+"/6 stone · "+d.knowledge+"/7 knowledge",action:"Find toolmaker",target:"lore"};
  if(!d.axe)return {title:"A sharper start",description:"Craft a stone axe in Inventory to gather wood more efficiently.",progress:r.wood+"/2 wood · "+r.stone+"/3 stone",action:"Open Inventory",target:"pack"};
  if(!this.hasBuilding("family"))return {title:"A home for your family",description:"Build a Family Hut through your stockpile. Click the hut to open your dynasty.",progress:p.items.wood+"/10 stored wood · "+p.items.stone+"/6 stored stone",action:"Find stockpile",target:"stockpile"};
  if(!this.hasBuilding("council"))return {title:"A place for your people",description:"Build a Council Lodge through your stockpile to begin your culture.",progress:p.items.wood+"/14 stored wood · "+p.items.stone+"/8 stored stone",action:"Find stockpile",target:"stockpile"};
  if(!d.civics.includes("community"))return {title:"Become a community",description:"Click the Council Lodge to establish Tribal Community.",progress:have("wood")+"/8 wood · "+have("food")+"/6 berries · "+d.culture+"/5 culture",action:"Find council",target:"council"};
  return {title:"What will you leave behind?",description:"Explore, shape your village, and visit a Family Hut to plan your legacy.",progress:"Your next chapter is yours to choose",action:"Find family hut",target:"family"};
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
  let html='<div class="building-context"><span class="stat-pill">'+(tech?d.knowledge+" knowledge":d.culture+" culture")+'</span><p>'+(tech?"Discoveries your whole civilization will inherit.":"Traditions that connect one generation to the next.")+'</p></div><p class="context-note">'+(tech?"Gain Knowledge by founding a village, constructing new building types and reaching building milestones. Your Toolmaker\'s Shelter also generates 1 Knowledge per minute of active play. Gathering earns skill XP, not Knowledge. ":"Culture progression is unchanged while future population mechanics are developed. ")+'Material costs use Inventory first, then your village stockpile.</p><div class="research-grid">';
  const nodes=Object.entries(data).sort(([a],[b])=>{const rank=key=>owned.includes(key)?2:this.state.eligible(kind,key)?0:1;return rank(a)-rank(b)});
  for(const [key,node] of nodes){
   const done=owned.includes(key),eligible=this.state.eligible(kind,key),can=eligible&&this.state.enoughResearch(node.cost);
   const req=[...node.needs,...(node.culture||[])].map(x=>TECH[x]?.name||CIVICS[x]?.name||x);
   const missing=Object.entries(node.cost).filter(([id,n])=>this.state.researchResourceCount(id)<n).map(([id,n])=>(n-this.state.researchResourceCount(id))+" "+names[id].toLowerCase());
   html+='<article class="research-card entry '+(done?"unlocked":can?"available":"locked")+'"><div class="research-heading"><h3>'+esc(node.name)+'</h3><span class="tag">'+(done?"Discovered":eligible?"Available":"Locked")+'</span></div><p>'+esc(node.description)+'</p>';
   if(!done){if(req.length)html+='<small class="requirement-list">Requires '+esc(req.join(" · "))+'</small>';html+='<div class="research-costs cost-list">'+this.costChips(node.cost)+'</div>';if(eligible&&missing.length)html+='<small>Need '+esc(missing.join(" and "))+'</small>';html+='<button type="button" data-action="unlock" data-kind="'+kind+'" data-key="'+key+'" '+(!can?"disabled":"")+'>'+(can?(tech?"Research discovery":"Establish tradition"):!eligible?"Complete prerequisites":"More supplies needed")+'</button>'}html+='</article>';
  }return html+"</div>";
 }
 dynasty(){
  const d=this.state.data,retained=d.civics.includes("apprenticeship")?25:d.civics.includes("oral")?15:8;
  let html='<div class="dynasty-summary"><span class="kicker">YOUR FAMILY, YOUR LEGACY</span><h3>'+esc(d.hero.name)+'</h3><p>Age '+d.hero.age+' · Generation '+roman(d.generation)+'</p><span class="stat-pill">'+retained+'% skill XP inherited</span></div><div class="entry"><h3>The next generation</h3><p>Your descendant inherits this world, its buildings, supplies, discoveries and traditions. Personal skills begin with '+retained+'% of your experience.</p><button type="button" data-action="next">Plan succession →</button><small>You will review the change before continuing.</small></div><h3 class="section-heading">Family chronicle</h3>';
  for(const g of [...d.lineage].reverse())html+='<div class="timeline"><b>'+esc(g.name)+' · Generation '+roman(g.gen)+'</b><span>'+esc(g.role)+' · '+Math.abs(g.start).toLocaleString()+' '+(g.start<0?"BCE":"CE")+'</span></div>';
  html+='<h3 class="section-heading">Recent history</h3>';for(const item of d.history.slice(0,6))html+='<div class="timeline"><span>'+esc(item)+'</span></div>';return html;
 }
 building(){const def=BUILDINGS[this.contextBuilding()?.kind];return '<div class="building-context"><span class="stat-pill">Village gathering place</span><h3>'+esc(def?.name||"Village building")+'</h3><p>'+esc(def?.description||"")+'</p></div><p class="context-note">Cooking recipes are a future milestone. Your built hearth and fire are saved with this village.</p>'}
 render(){
  const d=this.state.data,o=this.objective(),placing=!!(this.world.placingStockpile||this.world.placingBuilding);
  $("year").textContent=this.state.formatYear();$("generation").textContent="GEN "+roman(d.generation);$("ancestor-name").textContent=d.hero.name;$("ancestor-age").textContent="Age "+d.hero.age+" · "+(d.generation===1?"Founder":"Descendant");$("settlement-status").textContent=d.village.stockpile?d.village.population+"/"+this.state.villageCapacity()+" villagers · "+d.village.buildings.length+" buildings":"The beginning of your story";
  $("science").textContent=d.knowledge;$("culture").textContent=d.culture;$("objective-title").textContent=o.title;$("objective-description").textContent=o.description;$("objective-progress").textContent=o.progress;$("objective-action").textContent=o.action;
  document.body.classList.toggle("is-panel-open",this.panelOpen);document.body.classList.toggle("is-placing",placing);
  const right=$("right");right.classList.toggle("open",this.panelOpen);right.classList.toggle("placing",placing);right.dataset.context=this.tab;right.setAttribute("aria-hidden",String(!this.panelOpen));right.inert=!this.panelOpen||!!this.modal;
  const title=placing?["SHAPE YOUR VILLAGE",this.world.placingStockpile?"Establish camp":"Construction"]:titles[this.tab];$("context-eyebrow").textContent=title[0];$("context-title").textContent=title[1];right.setAttribute("aria-label",title[1]);
  document.querySelectorAll("[data-tab]").forEach(n=>{const active=this.panelOpen&&n.dataset.tab===this.tab;n.classList.toggle("active",active);n.setAttribute("aria-expanded",String(active))});
  const modeChanged=placing!==this.lastPlacing;this.lastPlacing=placing;
  const panel=$("panel"),active=document.activeElement,hadFocus=panel.contains(active),focusData=hadFocus&&active!==panel?{...active.dataset}:null;
  const html=this.tab==="pack"?this.pack():this.tab==="skills"?this.skills():this.tab==="village"?villagePanel(this):this.tab==="tech"?this.trees("tech"):this.tab==="culture"?this.trees("civic"):this.tab==="dynasty"?this.dynasty():this.building();
  if(this.panelMarkup!==html){const scroll=this.resetScroll||modeChanged?0:panel.scrollTop;panel.innerHTML=html;this.panelMarkup=html;panel.scrollTop=scroll;if(hadFocus){const candidate=focusData&&[...panel.querySelectorAll("button,input,select")].find(n=>Object.entries(focusData).every(([k,v])=>n.dataset[k]===v));(candidate&&!candidate.disabled?candidate:panel).focus({preventScroll:true})}}else if(this.resetScroll||modeChanged)panel.scrollTop=0;this.resetScroll=false;
 }
 handleAction(e){
  const btn=e.target.closest("[data-action]");if(!btn||btn.disabled)return;const action=btn.dataset.action;let message="";
  if(handlePackAction(this,btn)||handleVillageAction(this,btn))return;
  if(action==="axe")message=this.state.craftAxe()?"Stone axe crafted. More wood with every swing.":"You need the technology and carried supplies.";
  else if(action==="unlock"){if(!this.canUseContext(btn.dataset.kind==="tech"?"tech":"culture")){this.toast("Visit the appropriate village building to continue.");return}message=this.state.unlock(btn.dataset.kind,btn.dataset.key)?"A new chapter of knowledge begins.":"Check prerequisites, inventory and stockpile supplies."}
  else if(action==="next"){
   if(!this.canUseContext("dynasty"))return;const d=this.state.data,retained=d.civics.includes("apprenticeship")?25:d.civics.includes("oral")?15:8;
   this.showDialog("succession","Pass on your legacy",'<div class="confirm-summary"><p>'+esc(d.hero.name)+' will pass control to an 18-year-old descendant. The calendar advances 24 years.</p><p><strong>'+retained+'% of personal skill XP</strong> is retained. Your village, inventory, discoveries, traditions and world changes remain.</p></div><div class="dialog-actions"><button type="button" class="game-button alt" data-action="cancel-dialog">Keep playing</button><button type="button" data-action="confirm-next">Continue as descendant</button></div>');
  }else if(action==="confirm-next"){if(this.modal!=="succession"||!this.canUseContext("dynasty"))return;const name=this.state.nextGeneration();this.close();message="Your legacy continues with "+name+"."}
  else if(action==="cancel-dialog"||action==="resume"){this.close();return}
  else if(action==="help"){this.help();return}
  else if(action==="save"){message=this.state.save()?"Saved in Slot "+(this.state.slot||1)+".":"Unable to save. Check this browser's storage.";if(this.modal==="menu"&&$("save-status"))$("save-status").textContent=message}
  else if(action==="title"){if(this.state.save())window.location.reload();else message="Unable to save. Your game remains open."}
  if(message)this.toast(message);
 }
 showDialog(kind,title,html){
  if(!this.modal)this.dialogReturnFocus=document.activeElement;this.modal=kind;this.world.inputBlocked=true;
  $("dialog-title").textContent=title;$("dialog-eyebrow").textContent=kind==="succession"?"ONE GENERATION TO THE NEXT":kind==="help"?"FIELD NOTES":"A MOMENT BY THE FIRE";$("guide").innerHTML=html;$("modal").classList.remove("hidden");
  for(const id of ["scene","left","hud-tools","right","toggle"])$(id).inert=true;$("toggle").setAttribute("aria-expanded","true");
  ($("guide").querySelector("button:not(:disabled)")||$("close-modal")).focus({preventScroll:true});
 }
 menu(){this.showDialog("menu","A moment to pause",'<p class="context-note">Slot '+(this.state.slot||1)+' · '+esc(this.state.data.hero.name)+' · Browser-local world</p><div class="menu-grid"><button type="button" class="menu-button" data-action="resume">Return to the world <span>Esc</span></button><button type="button" class="menu-button" data-action="save">Save game <span>↓</span></button><button type="button" class="menu-button" data-action="help">Controls & field notes <span>?</span></button><button type="button" class="menu-button" data-action="title">Save & return to title <span>↗</span></button></div><p id="save-status" class="save-indicator">Progress is saved in this browser. Keep this device’s site data to retain your worlds.</p>')}
 help(){this.showDialog("help","Find your way",'<div class="entry"><h3>Move through the world</h3><p>WASD to walk, Shift to sprint. Click the ground to walk there. Hold arrow keys to smoothly rotate or tilt the camera; right-drag also works. Scroll to zoom. I opens Inventory, K opens Skills.</p></div><div class="entry"><h3>Let your village guide you</h3><p><strong>Stockpile → Village.</strong> Deposit supplies and place buildings.</p><p><strong>Toolmaker’s Shelter → Technology.</strong> Research discoveries.</p><p><strong>Council Lodge → Culture.</strong> Establish traditions.</p><p><strong>Family Hut → Dynasty.</strong> Follow your lineage and plan succession.</p></div><div class="entry"><h3>Gather and build</h3><p>Click a tree, rock or berry bush to gather; E gathers nearby. Trees and stone are finite; berries regrow after two minutes. Shift-click a bush to clear it for vines.</p><p>Place a free stockpile using Establish camp. Deposit gathered supplies there. During construction, click to pin a location, use arrows to adjust, R to rotate, Enter to confirm or Escape to cancel.</p></div><button type="button" class="game-button" data-action="resume">Back to the world</button>')}
 close(){
  if(!this.modal)return;this.modal=null;$("modal").classList.add("hidden");for(const id of ["scene","left","hud-tools","toggle"])$(id).inert=false;$("right").inert=!this.panelOpen;this.world.inputBlocked=false;$("toggle").setAttribute("aria-expanded","false");
  const target=this.dialogReturnFocus;(target?.isConnected&&!target.closest("[inert]")?target:$("toggle")).focus({preventScroll:true});
 }
 keydown(e){
  if(!$("start-screen").classList.contains("hidden"))return;
  if(this.modal){
   if(e.key==="Escape"){e.preventDefault();this.close();return}
   if(e.key==="Tab"){const items=[...$("modal").querySelectorAll("button:not(:disabled),a,input,select,[tabindex='0']")].filter(n=>!n.hidden),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}return;
  }
  if(e.defaultPrevented||["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName))return;const key=e.key.toLowerCase();
  if(key==="i"||key==="k"){e.preventDefault();const tab=key==="i"?"pack":"skills";if(this.panelOpen&&this.tab===tab)this.closePanel();else this.openPanel(tab)}else if(key==="escape"){e.preventDefault();if(this.panelOpen)this.closePanel();else this.menu()}
 }
}
