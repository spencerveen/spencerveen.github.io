import {SKILLS,TECH,CIVICS,skillLevel} from "./state.js?v=20261113h";
import {HAIR_STYLES,HAIR_COLORS,SKIN_TONES,EYE_COLORS,OUTFITS} from "./characters.js?v=20261113h";
import {villagePanel,selectVillagePlot,handleVillageAction} from "./village-ui.js?v=20261113h";
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const roman=n=>n<=12?["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][n]:String(n);
const icons={wood:"🌲",stone:"🪨",food:"🫐"};
const names={wood:"Wood",stone:"Stone",food:"Food",knowledge:"Knowledge",culture:"Culture"};
export class UI{
 constructor(state,world){
  this.state=state;this.world=world;this.tab="pack";this.selectedPlot="family_1";
  document.querySelectorAll("[data-tab]").forEach(button=>button.addEventListener("click",()=>{
   this.tab=button.dataset.tab;this.render();
   $("right").classList.remove("open");
  }));
  $("toggle").addEventListener("click",()=>{const open=$("right").classList.toggle("open");$("toggle").setAttribute("aria-expanded",String(open))});
  $("help").addEventListener("click",()=>this.help());
  $("close-modal").addEventListener("click",()=>this.close());
  $("modal").addEventListener("click",e=>{if(e.target===$("modal"))this.close()});
  window.addEventListener("keydown",e=>{if(e.key==="Escape")this.close()});
  $("panel").addEventListener("click",e=>this.handleAction(e));
  state.onChange=()=>{this.world.setDiscovery(state.data.technologies.includes("fire"));this.world.syncVillage(state.data.village);this.world.highlightPlot(this.selectedPlot);this.world.applyAppearance(state.data.hero.appearance);this.render()};
  this.world.setDiscovery(state.data.technologies.includes("fire"));this.world.syncVillage(state.data.village);this.world.highlightPlot(this.selectedPlot);
  this.world.applyAppearance(state.data.hero.appearance);
  this.render();
 }
 toast(message){
  const n=document.createElement("div");n.className="toast";n.textContent=message;$("toasts").prepend(n);
  setTimeout(()=>{n.classList.add("fade");setTimeout(()=>n.remove(),500)},3000);
 }
 status(title,detail){$("action").textContent=title;$("details").textContent=detail}
 selectPlot(id){selectVillagePlot(this,id)}
 objective(){
  const d=this.state.data,r=d.resources;
  if(!d.technologies.includes("fire"))return {title:"Discover the first flame",description:"Gather wood and stone, earn knowledge through gathering, then research Control of Fire.",progress:`${r.wood}/4 wood · ${r.stone}/2 stone · ${d.knowledge}/3 knowledge`};
  if(!d.technologies.includes("tools"))return {title:"Shape your first tools",description:"Gather resources, then research Stone Toolmaking in the Tech tab.",progress:`${r.wood}/5 wood · ${r.stone}/6 stone · ${d.knowledge}/7 knowledge`};
  if(!d.axe)return {title:"Craft a stone axe",description:"Open your Pack and craft a stone axe. Woodcutting will become more efficient.",progress:`${r.wood}/2 wood · ${r.stone}/3 stone`};
  if(!d.shelter)return {title:"Raise your first Family Hut",description:"Open Village, travel to a Family Hut plot, and build housing for three more people.",progress:`${r.wood}/10 wood · ${r.stone}/6 stone`};
  if(!d.civics.includes("community"))return {title:"Found a tribal community",description:"Gather food and accumulate culture, then unlock Tribal Community.",progress:`${r.wood}/8 wood · ${r.food}/6 food · ${d.culture}/5 culture`};
  return {title:"Leave a legacy",description:"Develop your skills, explore culture and research, then use the Dynasty tab to continue as your descendant.",progress:"Stone Age foundation achieved"};
 }
 cost(cost){
  return Object.entries(cost).map(([name,n])=>`${names[name]||name}: ${n}`).join(" · ");
 }
 pack(){
  const d=this.state.data;
  let html=`<div class="panel-title"><h2>Wayfarer's Pack</h2><small>Resources</small></div>`;
  for(const [key,count] of Object.entries(d.resources))html+=`<div class="resource"><span><i>${icons[key]}</i>${names[key]}</span><b>${count}</b></div>`;
  html+=`<p class="info">Click resources in the world to approach and gather them. Press E to interact with nearby resources.</p>`;
  html+=`<div class="entry"><h3>🪓 Stone Axe</h3><p>${d.axe?"Equipped. Harvest 3 wood rather than 2 per tree interaction.":"A better tool for woodcutting. Requires the Stone Toolmaking technology."}</p><small>2 wood · 3 stone</small><button data-action="axe" ${d.axe||!d.technologies.includes("tools")||!this.state.enough({wood:2,stone:3})?"disabled":""}>${d.axe?"Already crafted":"Craft axe"}</button></div>`;
  html+=`<div class="entry"><h3>🏕 Village Construction</h3><p>Build Family Huts, a Cooking Hearth, the Toolmaker’s Shelter and a Council Lodge.</p><button data-action="open-village">Open Village →</button></div>`;
  return html;
 }
 appearance(){
  const d=this.state.data,p=d.hero.appearance;
  const choices=[
   ["sex","Body template",p.sex==="male"?"Male":"Female"],
   ["hairStyle","Hairstyle",HAIR_STYLES[p.hairStyle].name],
   ["hairColor","Hair color",HAIR_COLORS[p.hairColor].name],
   ["skin","Skin tone","Tone "+(p.skin+1)],
   ["beard","Facial hair",p.beard>0?"Beard":"None"],
   ["height","Height",Math.round(p.height*100)+"%"],
   ["build","Build",Math.round(p.build*100)+"%"]
  ];
  let html=`<div class="panel-title"><h2>Appearance</h2><small>${esc(d.hero.name)}</small></div>`;
  html+=`<p class="info">Every descendant and villager is generated from the same modular human model. Change your adventurer's appearance here and watch the 3D world update instantly.</p>`;
  for(const [field,label,value] of choices){
   if(field==="beard"&&p.sex==="female")continue;
   const color=field==="hairColor"?HAIR_COLORS[p.hairColor].hex:field==="skin"?SKIN_TONES[p.skin]:field==="eyes"?EYE_COLORS[p.eyes]:null;
   html+=`<div class="appearance-picker"><span>${label}</span><div><button data-action="looks" data-field="${field}" data-dir="-1" aria-label="Previous ${label}">‹</button><b>${color?`<i class="swatch" style="background:${color}"></i>`:""}${esc(value)}</b><button data-action="looks" data-field="${field}" data-dir="1" aria-label="Next ${label}">›</button></div></div>`;
  }
  html+=`<p class="info">Real Quaternius rigged meshes are used for characters and hair. Body size, selected hair and skin colors carry into descendants with some variation. More outfit and eye-color choices will arrive with the clothing system.</p>`;
  return html;
 }
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
  html+=`<button class="game-button alt" data-action="reset">Reset demo save</button>`;
  return html;
 }
 render(){
  const d=this.state.data,o=this.objective();
  $("year").textContent=this.state.formatYear();$("generation").textContent="GEN "+roman(d.generation);
  $("ancestor-name").textContent=d.hero.name;$("ancestor-age").textContent="Age "+d.hero.age+" · "+(d.generation===1?"Founder":"Descendant");
  $("settlement-status").textContent=`${d.village.population}/${this.state.villageCapacity()} villagers · ${Object.keys(d.village.plots).length} built`;
  $("science").textContent=d.knowledge;$("culture").textContent=d.culture;
  $("objective-title").textContent=o.title;$("objective-description").textContent=o.description;$("objective-progress").textContent=o.progress;
  document.querySelectorAll("[data-tab]").forEach(node=>{const active=node.dataset.tab===this.tab;node.classList.toggle("active",active);node.setAttribute("aria-selected",String(active))});
  $("panel").innerHTML=this.tab==="pack"?this.pack():this.tab==="village"?villagePanel(this):this.tab==="appearance"?this.appearance():this.tab==="skills"?this.skills():this.tab==="tech"?this.trees("tech"):this.tab==="culture"?this.trees("civic"):this.dynasty();
 }
 handleAction(e){
  const btn=e.target.closest("[data-action]");if(!btn)return;
  const action=btn.dataset.action;let message="";
  if(handleVillageAction(this,btn))return;
  if(action==="looks"){
   const p=this.state.data.hero.appearance,f=btn.dataset.field,dir=Number(btn.dataset.dir)===-1?-1:1;
   const count={hairStyle:HAIR_STYLES.length,hairColor:HAIR_COLORS.length,skin:SKIN_TONES.length,eyes:EYE_COLORS.length,beard:4,outfit:OUTFITS.length};
   if(f==="sex")this.state.setAppearance({sex:p.sex==="male"?"female":"male"});
   else if(f==="beard")this.state.setAppearance({beard:p.beard>0?0:1});
   else if(f==="height"||f==="build")this.state.setAppearance({[f]:Math.max(f==="height"?.87:.84,Math.min(f==="height"?1.13:1.18,Math.round((p[f]+dir*.03)*100)/100))});
   else if(Object.hasOwn(count,f))this.state.setAppearance({[f]:(p[f]+dir+count[f])%count[f]});
  }
  else if(action==="axe")message=this.state.craftAxe()?"Stone axe crafted! Woodcutting is faster.":"Not enough resources.";
  else if(action==="unlock"){const ok=this.state.unlock(btn.dataset.kind,btn.dataset.key);message=ok?"Discovery completed!":"Discovery requirements are not met."}
  else if(action==="next"){const name=this.state.nextGeneration();message="A new generation begins: "+name;}
  else if(action==="reset"){
   if(window.confirm("Reset all Epoch Stone Age prototype progress? This cannot be undone.")){this.state.reset();this.world.player.position.x=0;this.world.player.position.z=0;this.world.setWorldSeed(this.state.data.worldSeed);this.world.path=[];this.world.target=null;this.world.plotTarget=null;message="A new world and history begin."}
  }
  if(message)this.toast(message);
 }
 help(){
  $("guide").innerHTML=`<p><strong>Explore:</strong> WASD to walk, Shift to sprint, right-click and drag to orbit the camera, and scroll to zoom. Left-click the ground for automatic pathfinding.</p>
  <p><strong>Gather:</strong> Left-click a tree, rock, or berry bush. Your adventurer approaches the resource and gathers it. Press E to interact with a nearby resource. Keep gathering to earn personal skill XP, knowledge and culture.</p>
  <p><strong>Progress:</strong> Unlock Fire and Stone Toolmaking under Tech, then craft an axe in the Pack. Use the Village tab to build your first huts.</p>
  <p><strong>Village:</strong> Click a marked construction plot, walk into range, then select Construct. Each Family Hut adds space for 3 more villagers.</p>
  <p><strong>Character:</strong> Open the Character tab to change the base body, hair, colors, clothing, and facial hair. NPCs use the same modular system, and descendants inherit traits with variation.</p>
  <p><strong>Descendants:</strong> In the Dynasty tab, continue as a new generation. Civilization-wide achievements and buildings remain, while personal skills partly transfer.</p>
  <p><strong>Saving:</strong> Your progress is stored locally in this browser. No account or online multiplayer is included in this prototype.</p>
  <p><strong>Prototype limitations:</strong> Wildlife is ambient; combat, NPC diplomacy, realistic family relationships, additional ages and advanced animations are planned for later milestones.</p>`;
  $("modal").classList.remove("hidden");
 }
 close(){$("modal").classList.add("hidden")}
}
