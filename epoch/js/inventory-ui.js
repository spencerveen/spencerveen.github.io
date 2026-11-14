import {ITEMS,INVENTORY_SLOTS,STACK_LIMIT,ITEM_IDS} from "./inventory.js?v=20261113j";
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
export function inventoryPanel(ui){
 const state=ui.state,d=state.data;
 const used=state.inventoryUsed(),unpacked=state.inventoryUnpacked();
 let html=`<div class="inventory-toolbar"><span>Carried supplies</span><small>${STACK_LIMIT} items per stack</small></div>`;
 html+=`<div class="pack-capacity"><span>Inventory space</span><strong>${used} / ${INVENTORY_SLOTS}</strong></div>`;
 html+=`<div class="pack-slot-grid" role="group" aria-label="Ten slot inventory">`;
 for(let i=0;i<INVENTORY_SLOTS;i++){
  const slot=d.inventory[i],item=slot&&ITEMS[slot.id];
  const chosen=ui.selectedSlot===i;
  html+=`<button type="button" class="pack-slot ${slot?"occupied":"empty"} ${chosen?"selected":""}" data-action="pack-slot" data-slot="${i}" aria-pressed="${chosen}" aria-label="Slot ${i+1}: ${item?item.name+" "+slot.qty+" of "+STACK_LIMIT:"Empty"}" title="${item?esc(item.name)+" ("+slot.qty+"/"+STACK_LIMIT+")":"Empty slot"}">
   ${item?`<span class="pack-item-icon">${item.icon}</span><span class="pack-quantity">${slot.qty}</span>`:`<span class="pack-empty" aria-hidden="true">·</span>`}
   <span class="pack-number">${i+1}</span>
  </button>`;
 }
 html+=`</div>`;
 const slot=d.inventory[ui.selectedSlot];
 if(slot){
  const item=ITEMS[slot.id];
  html+=`<div class="pack-selected"><strong>${item.icon} ${esc(item.name)}</strong><span>${slot.qty} / ${STACK_LIMIT} in this stack</span><p>${esc(item.description)}</p><button type="button" class="game-button alt" data-action="drop-stack" data-slot="${ui.selectedSlot}">Discard selected stack</button></div>`;
 }
 html+=`<div class="pack-summary">`;
 for(const id of ITEM_IDS)html+=`<span>${ITEMS[id].icon} ${esc(ITEMS[id].name)} <b>${state.inventoryCount(id)}</b></span>`;
 html+=`</div>`;
 if(used>=INVENTORY_SLOTS)html+=`<p class="info pack-warning">Inventory full. Deposit supplies at your stockpile or discard a stack to free space.</p>`;
 if(unpacked){
  html+=`<div class="entry pack-legacy"><h3>Saved supplies</h3><p>${unpacked} items from your earlier save are safely stored outside this inventory. Free a slot to retrieve them.</p><small>${ITEM_IDS.filter(id=>d.unpacked[id]>0).map(id=>esc(ITEMS[id].name)+": "+d.unpacked[id]).join(" · ")}</small><button type="button" data-action="retrieve-supplies">Retrieve supplies</button></div>`;
 }
 const vitals=state.survivalStatus();
 html+='<div class="panel-title"><h3>Food & Survival</h3><small>Eating from your backpack</small></div>';
 html+='<div class="entry"><h3>🫐 Wild Berries</h3>'+
  '<p>Berries restore 24 Hunger and 12 Stamina, and temporarily increase your maximum Stamina by 20 for 2 minutes. Bonuses refresh but do not stack. Hunger alone never kills your character.</p>'+
  '<p class="context-note">Carried berries: '+state.inventoryCount("berries")+' · Hunger: '+Math.round(vitals.hunger)+' / 100 · Stamina: '+
  Math.floor(vitals.stamina)+' / '+vitals.maxStamina+'</p>'+
  '<button type="button" data-action="eat-berries" '+
  (!state.inventoryCount("berries")||vitals.gameOver?'disabled':'')+'>Eat 1 berry</button></div>';
 const toolsKnown=d.technologies.includes("tools"),axeCost={wood:2,stone:3};
 const missing=Object.entries(axeCost).filter(([id,needed])=>state.inventoryCount(id)<needed);
 html+=`<div class="panel-title"><h3>Crafting</h3><small>Uses carried supplies</small></div>`;
 html+=`<div class="entry"><h3>🪓 Stone Axe ${d.axe?'<span class="tag">Equipped</span>':""}</h3><p>Gather 3 wood per interaction instead of 2.</p>`;
 if(!d.axe){
  html+='<div class="cost-list" aria-label="Stone axe inventory requirements">';
  for(const [id,needed] of Object.entries(axeCost)){
   const have=state.inventoryCount(id);
   html+=`<span class="cost-chip ${have>=needed?"met":"missing"}">${ITEMS[id].icon} ${esc(ITEMS[id].name)} <b>${have} / ${needed}</b></span>`;
  }
  html+='</div>';
  if(!toolsKnown)html+='<p class="context-note">Research Stone Toolmaking at your Toolmaker’s Shelter first.</p>';
  else if(missing.length)html+=`<p class="context-note">Need ${missing.map(([id,needed])=>(needed-state.inventoryCount(id))+" more "+ITEMS[id].name.toLowerCase()).join(" and ")} in your inventory.</p>`;
  html+=`<button type="button" data-action="axe" ${!toolsKnown||missing.length?"disabled":""}>${!toolsKnown?"Stone Toolmaking required":"Craft stone axe"}</button>`;
 }
 html+='</div><p class="context-note">Village construction uses supplies stored at your stockpile.</p>';
 return html;
}
export function handlePackAction(ui,button){
 const action=button.dataset.action;
 if(action==="eat-berries"){
  ui.toast(ui.state.eatBerries()?"You ate wild berries. Stamina and hunger restored.":"No berries available to eat.");
  return true;
 }
 if(action==="pack-slot"){
  const idx=Number(button.dataset.slot);
  if(!Number.isInteger(idx)||idx<0||idx>=INVENTORY_SLOTS)return true;
  ui.selectedSlot=ui.selectedSlot===idx?null:idx;
  ui.render();
  return true;
 }
 if(action==="drop-stack"){
  const idx=Number(button.dataset.slot);
  if(!Number.isInteger(idx)||idx<0||idx>=INVENTORY_SLOTS)return true;
  const slot=ui.state.data.inventory[idx];
  if(!slot)return true;
  const item=ITEMS[slot.id];
  if(!window.confirm(`Discard ${slot.qty} ${item.name}? You cannot undo this.`))return true;
  if(ui.state.discardStack(idx)){
   ui.selectedSlot=null;
   ui.toast(`Discarded ${slot.qty} ${item.name}.`);
  }
  return true;
 }
 if(action==="retrieve-supplies"){
  const recovered=ui.state.retrieveLegacySupplies();
  ui.toast(recovered?`Retrieved ${recovered} supplies into your inventory.`:"No inventory space available.");
  return true;
 }
 return false;
}
