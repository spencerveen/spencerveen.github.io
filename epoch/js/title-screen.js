import {MAX_SAVE_SLOTS,allSaveSummaries,mostRecentSave,removeSlot,migrateLegacySave} from "./save-slots.js?v=20261114r";
import {HAIR_STYLES,HAIR_COLORS,SKIN_TONES,normalizeAppearance,founderAppearance} from "./characters.js?v=20261113m";
const esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const yearText=n=>Number(n)<0?Math.abs(n).toLocaleString()+" BCE":(Number(n)+1)+" CE";
const dateText=stamp=>stamp?new Date(stamp).toLocaleString(undefined,{month:"short",day:"numeric",year:"numeric"}):"Previously saved";
const noun=(num,word)=>num===1?word:word+"s";

export class TitleScreen {
 constructor({onStart}){
  this.root=document.getElementById("start-screen");
  this.onStart=onStart;
  this.view="title";
  this.busy=false;
  this.error="";
  this.slot=null;
  this.name="Aren";
  this.appearance=founderAppearance();
  this.backgroundInert=new Map([...document.body.children].filter(node=>node!==this.root&&node.id!=="loading").map(node=>[node,node.inert]));
  this.imported=migrateLegacySave();
  this.root.addEventListener("click",e=>this.click(e));
  this.root.addEventListener("input",e=>{
   if(e.target?.id==="founder-name")this.name=e.target.value;
  });
  this.render();
 }
 showError(message){
  this.busy=false;this.error=String(message||"Could not open your save.");
  this.render();
 }
 hide(){
  this.root.classList.add("hidden");
  this.root.setAttribute("aria-hidden","true");
  this.root.inert=true;
  for(const [node,inert] of this.backgroundInert)node.inert=inert;
  document.getElementById("scene")?.focus({preventScroll:true});
 }
 render(){
  const active=document.activeElement,focus=this.root.contains(active)?{id:active.id,...active.dataset}:null;
  for(const node of this.backgroundInert.keys())node.inert=true;
  this.root.inert=false;
  this.root.classList.remove("hidden");
  this.root.removeAttribute("aria-hidden");
  const body=this.view==="creator"?this.creator():this.view==="choose"?this.choose():this.title();
  this.root.innerHTML=`<div class="epoch-opening-glow"></div><div class="epoch-opening-card" role="dialog" aria-modal="true" aria-label="Epoch start screen">
   <div class="epoch-opening-header"><span class="epoch-crest">E</span><span><strong>EPOCH</strong><small>DAWN OF THE FIRST TRIBE</small></span></div>
   ${body}
   ${this.error?`<p class="epoch-title-error" role="alert">${esc(this.error)}</p>`:""}
   <p class="epoch-local-notice">Pre-alpha · Saves are stored in this browser on this device. Clearing site data or using another browser will not transfer your progress.</p>
   </div>`;
  const targets=[...this.root.querySelectorAll("button:not(:disabled),input")];
  const restored=focus&&targets.find(node=>focus.id?node.id===focus.id:Object.entries(focus).filter(([key])=>key!=="id").every(([key,value])=>node.dataset[key]===value));
  (restored||targets[0])?.focus({preventScroll:true});
 }
 title(){
  const latest=mostRecentSave(),saves=allSaveSummaries();
  return `<div class="epoch-title-heading"><span class="kicker">THE FIRST CHAPTER</span><h1>Before the Dawn</h1>
   <p>The story of civilization starts with one life. What will your people become?</p></div>
   <div class="epoch-title-buttons">
    <button data-menu="continue" class="epoch-title-primary" ${latest?"":"disabled"}>Continue${latest?" · "+esc(latest.hero)+(latest.ended?" (Ended)":""):""}</button>
    <button data-menu="new" class="epoch-title-secondary">New Game</button>
   </div>
   <section class="epoch-save-section" aria-label="Saved games"><div class="epoch-save-heading"><h2>Saved Worlds</h2><span>${saves.filter(s=>!s.empty).length} / ${MAX_SAVE_SLOTS} slots</span></div>
    <div class="epoch-save-list">${saves.map(s=>this.slotCard(s)).join("")}</div>
   </section>
   ${this.imported?'<p class="epoch-import-note">✓ Your original Epoch save has been safely imported into Slot 1.</p>':""}`;
 }
 slotCard(s,choose=false){
  if(s.empty)return `<div class="epoch-save-card empty">
    <div><b>Slot ${s.slot}</b><small>Empty · Ready for a new lineage</small></div>
    ${choose?`<button data-menu="pick-new" data-slot="${s.slot}">Create</button>`:""}
   </div>`;
  return `<div class="epoch-save-card"><div><b>Slot ${s.slot} · ${esc(s.hero)}</b>
   <small>Generation ${s.generation} · ${yearText(s.year)} · ${s.houses} ${noun(s.houses,"structure")}</small>
   <small>Saved ${esc(dateText(s.lastSavedAt))}${s.ended?" · Civilization ended":""}</small></div>
   <div class="epoch-save-actions">${choose?`<button data-menu="pick-new" data-slot="${s.slot}">Replace</button>`:
     `<button data-menu="load" data-slot="${s.slot}">${s.ended?"View Ending":"Load"}</button><button class="epoch-delete" data-menu="delete" data-slot="${s.slot}" aria-label="Delete slot ${s.slot}">Delete</button>`}</div>
   </div>`;
 }
 choose(){
  const summaries=allSaveSummaries();
  return `<div class="epoch-title-heading"><span class="kicker">NEW GAME</span><h1>Choose a Save Slot</h1>
   <p>Your new lineage will live in its own world. Replacing an existing slot permanently overwrites that slot's progress.</p></div>
   <div class="epoch-save-list">${summaries.map(s=>this.slotCard(s,true)).join("")}</div>
   <button class="epoch-title-back" data-menu="back">← Back to title</button>`;
 }
 creator(){
  const p=this.appearance;
  const pickers=[
   ["sex","Body template",p.sex==="male"?"Male":"Female"],
   ["hairStyle","Hairstyle",HAIR_STYLES[p.hairStyle].name],
   ["hairColor","Hair color",HAIR_COLORS[p.hairColor].name],
   ["skin","Skin tone","Tone "+(p.skin+1)],
   ...(p.sex==="male"?[["beard","Facial hair",p.beard?"Beard":"None"]]:[]),
   ["height","Height",Math.round(p.height*100)+"%"],
   ["build","Build",Math.round(p.build*100)+"%"]
  ];
  return `<div class="epoch-title-heading"><span class="kicker">SLOT ${this.slot} · GENERATION I</span>
   <h1>Create Your Founder</h1>
   <p>Choose your first adventurer's identity. Once you begin, this character's appearance is permanent. Descendants inherit traits naturally.</p></div>
   <div class="epoch-creator-layout">
    <div class="epoch-founder-preview">
     <div class="epoch-portrait" aria-label="Stylized portrait preview">
      <div class="epoch-portrait-hair" style="background:${HAIR_COLORS[p.hairColor].hex}"></div>
      <div class="epoch-portrait-face" style="background:${SKIN_TONES[p.skin]}">
       ${p.sex==="male"&&p.beard?'<span class="epoch-portrait-beard" style="background:'+HAIR_COLORS[p.hairColor].hex+'"></span>':""}
      </div>
      <div class="epoch-portrait-body" style="background:${SKIN_TONES[p.skin]};transform:scaleX(${p.build})"></div>
     </div>
     <strong>${esc(this.name.trim()||"Your Founder")}</strong><small>Age 18 · Generation I</small>
     <p>Stylized reference portrait. Your appearance choices use Epoch's 3D character models in the world.</p>
    </div>
    <div class="epoch-creator-options">
     <label for="founder-name">Adventurer's name</label>
     <input id="founder-name" maxlength="24" autocomplete="off" placeholder="Name your founder" value="${esc(this.name)}" />
     ${pickers.map(([field,label,value])=>`<div class="epoch-creator-picker">
      <span>${label}</span><div><button data-menu="appearance" data-field="${field}" data-dir="-1" aria-label="Previous ${label}">‹</button>
       <b>${field==="hairColor"||field==="skin"?`<i class="swatch" style="background:${field==="skin"?SKIN_TONES[p.skin]:HAIR_COLORS[p.hairColor].hex}"></i>`:""}${esc(value)}</b>
       <button data-menu="appearance" data-field="${field}" data-dir="1" aria-label="Next ${label}">›</button></div></div>`).join("")}
    </div>
   </div>
   <div class="epoch-title-buttons"><button data-menu="begin" class="epoch-title-primary" ${this.busy?"disabled":""}>Begin Your Story</button>
    <button data-menu="back" class="epoch-title-secondary">Back to Save Slots</button></div>`;
 }
 async click(event){
  const button=event.target.closest("button[data-menu]");
  if(!button||this.busy)return;
  const action=button.dataset.menu,slot=Number(button.dataset.slot);
  this.error="";
  if(action==="new"){this.view="choose";this.render();return}
  if(action==="back"){this.view=this.view==="creator"?"choose":"title";this.render();return}
  if(action==="delete"){
   const summary=allSaveSummaries().find(s=>s.slot===slot);
   if(!summary||summary.empty)return;
   if(!window.confirm("Permanently delete Slot "+slot+" ("+summary.hero+")? This cannot be undone."))return;
   if(!removeSlot(slot))this.error="Unable to delete this local save.";
   this.render();return;
  }
  if(action==="pick-new"){
   const found=allSaveSummaries().find(s=>s.slot===slot);
   if(!found)return;
   if(!found.empty&&!window.confirm("Replace Slot "+slot+" ("+found.hero+") with a new game? Existing progress in that slot will be permanently lost when you begin."))return;
   this.slot=slot;this.name="Aren";this.appearance=founderAppearance();
   this.view="creator";this.render();
   document.getElementById("founder-name")?.focus();return;
  }
  if(action==="appearance"){
   const field=button.dataset.field,dir=Number(button.dataset.dir)===-1?-1:1,p=this.appearance;
   const counts={hairStyle:HAIR_STYLES.length,hairColor:HAIR_COLORS.length,skin:SKIN_TONES.length};
   if(field==="sex")p.sex=p.sex==="male"?"female":"male";
   else if(field==="beard")p.beard=p.beard?0:1;
   else if(field==="height"||field==="build")p[field]=Math.max(field==="height"?.87:.84,Math.min(field==="height"?1.13:1.18,Math.round((p[field]+dir*.03)*100)/100));
   else if(counts[field])p[field]=(p[field]+dir+counts[field])%counts[field];
   this.appearance=normalizeAppearance(p);
   this.render();return;
  }
  let selectedSlot=null,newGame=false;
  if(action==="continue")selectedSlot=mostRecentSave()?.slot;
  if(action==="load")selectedSlot=slot;
  if(action==="begin"){
   const name=this.name.trim().replace(/[<>]/g,"").slice(0,24);
   if(!name){this.error="Give your founder a name before starting.";this.render();return}
   selectedSlot=this.slot;newGame=true;
  }
  if(!selectedSlot)return;
  this.busy=true;
  button.disabled=true;
  try{
   await this.onStart({slot:selectedSlot,newGame,founder:newGame?{name:this.name.trim().slice(0,24),appearance:normalizeAppearance(this.appearance)}:null});
   this.hide();
  }catch(error){this.showError(error?.message||"The game could not start.")}
 }
}
