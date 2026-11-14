import {SKILLS,TECH,CIVICS,skillLevel} from "./state.js?v=20261113n";
import {villagePanel,selectVillageBuilding,openStockpile,handleVillageAction} from "./village-ui.js?v=20261114a";
import {inventoryPanel,handlePackAction} from "./inventory-ui.js?v=20261113m";
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const roman=n=>n<=12?["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][n]:String(n);
const icons={wood:"🪵",stone:"🪨",food:"🫐",vines:"🌿"};
const names={wood:"Wood",stone:"Stone",food:"Wild Berries",vines:"Vines",knowledge:"Knowledge",culture:"Culture"};
export class UI{
 constructor(state,world){
  this.state=state;this.world=world;this.tab="pack";this.selectedBuildingId=null;this.selectedSlot=null;
  document.querySelectorAll("[data-tab]").forEach(button=>button.addEventListener("click",()=>{
   this.tab=button.dataset.tab;
   this.render();
   // Switching tabs should never dismiss the panel on small screens.
   // Only the menu toggle itself can hide or show it.
   $("panel").scrollTop=0;
  }));
  $("toggle").addEventListener("click",()=>{const open=$("right").classList.toggle("open");$("toggle").setAttribute("aria-expanded",String(open))});
  $("help").addEventListener("click",()=>this.help());
  $("close-modal").addEventListener("click",()=>this.close());
  $("modal").addEventListener("click",e=>{if(e.target===$("modal"))this.close()});
  window.addEventListener("keydown",e=>{if(e.key==="Escape")this.close()});
  $("panel").addEventListener("click",e=>this.handleAction(e));
  state.onChange=()=>{this.world.setDiscovery(state.data.technologies.includes("fire"));this.world.syncVillage(state.data.village);this.world.applyAppearance(state.data.hero.appearance);this.render()};
  this.world.setDiscovery(state.data.technologies.includes("fire"));this.world.syncVillage(state.data.village);
  this.world.applyAppearance(state.data.hero.appearance);
  this.render();
 }
 toast(message){
  const n=document.createElement("div");n.className="toast";n.textContent=message;$("toasts").prepend(n);
  setTimeout(()=>{n.classList.add("fade");setTimeout(()=>n.remove(),500)},3000);
 }
 status(title,detail){$("action").textContent=title;$("details").textContent=detail}
 selectBuilding(id){selectVillageBuilding(this,id)}
 openStockpile(){openStockpile(this)}
 objective(){
  const d=this.state.data,r=d.resources;
  if(!d.village.stockpile)return {title:"Found your first village",description:"Open Village, choose a stockpile location and place your home base on clear ground.",progress:"Place the founding stockpile · no materials needed"};
  if(!d.technologies.includes("fire"))return {title:"Discover the first flame",description:"Gather wood and stone, earn knowledge through gathering, then research Control of Fire.",progress:`${r.wood}/4 wood · ${r.stone}/2 stone · ${d.knowledge}/3 knowledge`};
  if(!d.technologies.includes("tools"))return {title:"Shape your first tools",description:"Gather resources, then research Stone Toolmaking in the Tech tab.",progress:`${r.wood}/5 wood · ${r.stone}/6 stone · ${d.knowledge}/7 knowledge`};
  if(!d.axe)return {title:"Craft a stone axe",description:"Open your Pack and craft a stone axe. Woodcutting will become more efficient.",progress:`${r.wood}/2 wood · ${r.stone}/3 stone`};
  if(!d.shelter)return {title:"Raise your first Family Hut",description:"Bring wood and stone to your stockpile. Buildings use stored supplies; build a Family Hut near your home.",progress:`${d.village.stockpile.items.wood}/10 stored wood · ${d.village.stockpile.items.stone}/6 stored stone`};
  if(!d.civics.includes("community"))return {title:"Found a tribal community",description:"Gather food and accumulate culture, then unlock Tribal Community.",progress:`${r.wood}/8 wood · ${r.food}/6 food · ${d.culture}/5 culture`};
  return {title:"Leave a legacy",description:"Develop your skills, explore culture and research, then use the Dynasty tab to continue as your descendant.",progress:"Stone Age foundation achieved"};
 }
 cost(cost){
  return Object.entries(cost).map(([name,n])=>`${names[name]||name}: ${n}`).join(" · ");
 }
 pack(){return inventoryPanel(this)}
 skills(){
  const d=this.state.data;let html=`<div class="panel-title"><h2>Skills</h2><small>Learn by doing</small></div><p class="info">Personal skills grow with practice. A portion of experience is passed to each descendant through mentorship.</p>`;
  for(const [key,name] of SKILLS){
   const xp=d.skills[key]||0,v=skillLevel(xp),percent=100*v.remaining/v.next;
   html+=`<div class="skill"><div class="skill-name"><span>${name}</span><b>Lv. ${v.level}</b></div><div class="bar"><span style="width:${percent.toFixed(2)}%"></span></div><small>${v.remaining} / ${v.next} XP to next level</small></div>`;
  }
  return html;
 }
 trees(kind){
  const d=this.state.data,tech=kind==="tech",data=tech?TECH:CIVICS,owned=tech?d.technologies:d.civics;
  let html=`<div class="panel-title"><h2>${tech?"Technology":"Culture"}</h2><small>${tech?d.knowledge+" knowledge":d.culture+" culture"}</small></div><p class="info">${tech?"Civilization-wide scientific discoveries carry across every generation.":"Social traditions shape inheritance and prepare your settlement for future eras."}</p>`;
  for(const [key,node] of Object.entries(data)){
   const done=owned.includes(key),prereq=this.state.eligible(kind,key),can=prereq&&this.state.enough(node.cost);
   const req=[...node.needs,...(node.culture||[])].map(x=>data[x]?.name||CIVICS[x]?.name||TECH[x]?.name||x);
   html+=`<div class="entry"><h3>${esc(node.name)} ${done?'<span class="tag">Unlocked</span>':""}</h3><p>${esc(node.description)}</p>`;
   if(req.length)html+=`<small>Requires: ${req.map(esc).join(", ")}</small>`;
   html+=`<small>Cost: ${esc(this.cost(node.cost))}</small>`;
   html+=`<button data-action="unlock" data-kind="${kind}" data-key="${key}" ${!can?"disabled":""}>${done?"Discovered":!prereq?"Prerequisites locked":can?"Unlock discovery":"Gather more resources"}</button></div>`;
  }
  return html;
 }
 dynasty(){
  const d=this.state.data;
  let html=`<div class="panel-title"><h2>Your Lineage</h2><small>Generation ${roman(d.generation)}</small></div><p class="info">This is a first-pass succession demo. Characters change, but technology, culture, resources, buildings and world history persist.</p>`;
  html+=`<div class="entry"><h3>Legacy inheritance</h3><p>Your next descendant retains ${d.civics.includes("apprenticeship")?25:d.civics.includes("oral")?15:8}% of personal skill XP. Oral Tradition and Apprenticeship improve this inheritance.</p><button data-action="next">Continue as descendant →</button></div>`;
  html+=`<h3 style="font:500 20px Georgia,serif">Family Chronicle</h3>`;
  for(const g of [...d.lineage].reverse()){
   html+=`<div class="timeline"><b>${esc(g.name)} · Generation ${roman(g.gen)}</b><span>${esc(g.role)} · ${Math.abs(g.start).toLocaleString()} ${g.start<0?"BCE":"CE"}</span></div>`;
  }
  html+=`<h3 style="font:500 20px Georgia,serif">Recorded History</h3>`;
  for(const item of d.history.slice(0,9))html+=`<div class="timeline"><span>${esc(item)}</span></div>`;
  html+=`<div class="entry"><h3>Current Adventurer</h3>
   <p><strong>${esc(d.hero.name)}</strong> · Age ${d.hero.age} · ${d.generation===1?"Founder":"Descendant"}.</p>
   <p>Appearance is chosen when the game begins. Your character's body and features cannot be changed after birth; descendants inherit traits with variation.</p></div>`;
  html+=`<div class="entry"><h3>Save &amp; Exit</h3><p>Slot ${this.state.slot||1} · Your world is saved automatically as you play. Return to the title screen to continue or manage your saves.</p>
   <button data-action="save">Save Game</button>
   <button class="game-button alt" data-action="title">Save &amp; Return to Title</button></div>`;
  return html;
 }
 render(){
  const d=this.state.data,o=this.objective();
  $("year").textContent=this.state.formatYear();$("generation").textContent="GEN "+roman(d.generation);
  $("ancestor-name").textContent=d.hero.name;$("ancestor-age").textContent="Age "+d.hero.age+" · "+(d.generation===1?"Founder":"Descendant");
  $("settlement-status").textContent=d.village.stockpile?`${d.village.population}/${this.state.villageCapacity()} villagers · ${d.village.buildings.length} built · Stockpile ${this.state.stockpileInfo().used}`:"Unfounded village · Choose a stockpile location";
  $("science").textContent=d.knowledge;$("culture").textContent=d.culture;
  $("objective-title").textContent=o.title;$("objective-description").textContent=o.description;$("objective-progress").textContent=o.progress;
  document.querySelectorAll("[data-tab]").forEach(node=>{const active=node.dataset.tab===this.tab;node.classList.toggle("active",active);node.setAttribute("aria-selected",String(active))});
  $("panel").innerHTML=this.tab==="pack"?this.pack():this.tab==="village"?villagePanel(this):this.tab==="skills"?this.skills():this.tab==="tech"?this.trees("tech"):this.tab==="culture"?this.trees("civic"):this.dynasty();
 }
 handleAction(e){
  const btn=e.target.closest("[data-action]");if(!btn)return;
  const action=btn.dataset.action;let message="";
  if(handlePackAction(this,btn))return;
  if(handleVillageAction(this,btn))return;
  if(action==="axe")message=this.state.craftAxe()?"Stone axe crafted! Woodcutting is faster.":"Not enough resources.";
  else if(action==="unlock"){const ok=this.state.unlock(btn.dataset.kind,btn.dataset.key);message=ok?"Discovery completed!":"Discovery requirements are not met."}
  else if(action==="next"){const name=this.state.nextGeneration();message="A new generation begins: "+name;}
  else if(action==="save")message=this.state.save()?"Game saved to Slot "+(this.state.slot||1)+".":"Unable to save. Check browser storage permissions.";
  else if(action==="title"){
   if(this.state.save())window.location.reload();
   else message="Unable to save. Staying in your current game.";
  }
  if(message)this.toast(message);
 }
 help(){
  $("guide").innerHTML=`<p><strong>Explore:</strong> WASD to walk, Shift to sprint, right-click and drag to orbit the camera, and scroll to zoom. Left-click the ground for automatic pathfinding.</p>
  <p><strong>Gather:</strong> Trees run out of wood and fall. Stone deposits disappear after being mined out. Berry bushes grow back their fruit two minutes after they have been harvested clean. You can permanently cut a bush down for three vines with <strong>Shift+click</strong>, <strong>Shift+E</strong> near it, or the Pack button. All resources remain limited by your ten-slot inventory (12 per stack).</p>
  <p><strong>Progress:</strong> Unlock Fire and Stone Toolmaking under Tech, then craft an axe in the Pack. Use the Village tab to build your first huts.</p>
  <p><strong>Village:</strong> Open Village and move the first Stockpile preview with on-screen arrows or by clicking the ground. Confirm its location to found your village. Deposit resources there, then choose any building from the Construction catalog. Move its preview along the 2-meter grid with arrow keys or the on-screen arrows, rotate with R, and confirm. No preset building plots exist. Family Huts each add room for three people.</p>
  <p><strong>Character:</strong> Choose your founder’s name and appearance only when starting a New Game. Existing characters cannot be edited. Descendants are generated naturally.</p>
  <p><strong>Descendants:</strong> In the Dynasty tab, continue as a new generation. Civilization-wide achievements and buildings remain, while personal skills partly transfer.</p>
  <p><strong>Saving:</strong> Three browser-local save slots are available from the title screen. Progress autosaves, and Save &amp; Return to Title is available in the Dynasty tab. Existing progress is imported to Slot 1.</p>
  <p><strong>Prototype limitations:</strong> Wildlife is ambient; combat, NPC diplomacy, realistic family relationships, additional ages and advanced animations are planned for later milestones.</p>`;
  $("modal").classList.remove("hidden");
 }
 close(){$("modal").classList.add("hidden")}
}
