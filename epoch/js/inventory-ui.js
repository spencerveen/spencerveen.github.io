import {ITEMS,INVENTORY_SLOTS,STACK_LIMIT,ITEM_IDS} from "./inventory.js?v=20261113i";
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
export function inventoryPanel(ui){
 const state=ui.state,d=state.data;
 const used=state.inventoryUsed(),unpacked=state.inventoryUnpacked();
 let html=`<div class="panel-title"><h2>Wayfarer's Pack</h2><small>${used} / ${INVENTORY_SLOTS} slots used</small></div>`;
 html+=`<p class="info">Your starting pack has <b>10 spaces</b>. Wood, stone, wild berries and vines stack to <b>${STACK_LIMIT} per space</b>. More than ${STACK_LIMIT} of one item starts another stack.</p>`;
 html+=`<div class="pack-capacity"><span>Carried stacks</span><strong>${used} / ${INVENTORY_SLOTS}</strong></div>`;
 html+=`<div class="pack-slot-grid" role="group" aria-label="Ten slot inventory">`;
 for(let i=0;i<INVENTORY_SLOTS;i++){
  const slot=d.inventory[i],item=slot&&ITEMS[slot.id];
  const chosen=ui.selectedSlot===i;
  html+=`<button type="button" class="pack-slot ${slot?"occupied":"empty"} ${chosen?"selected":""}" data-action="pack-slot" data-slot="${i}" aria-label="Slot ${i+1}: ${item?item.name+" "+slot.qty+" of "+STACK_LIMIT:"Empty"}" title="${item?esc(item.name)+" ("+slot.qty+"/"+STACK_LIMIT+")":"Empty slot"}">
   ${item?`<span class="pack-item-icon">${item.icon}</span><span class="pack-quantity">${slot.qty}</span>`:`<span class="pack-empty">+</span>`}
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
 if(used>=INVENTORY_SLOTS)html+=`<p class="info pack-warning">Pack full. Spend resources or discard a stack to make room for more.</p>`;
 if(unpacked){
  html+=`<div class="entry pack-legacy"><h3>Unpacked supplies from your old save</h3><p>${unpacked} previously collected resources could not fit inside your new ten-slot pack. None were deleted. Free some slots, then retrieve them.</p><small>${ITEM_IDS.filter(id=>d.unpacked[id]>0).map(id=>esc(ITEMS[id].name)+": "+d.unpacked[id]).join(" · ")}</small><button type="button" data-action="retrieve-supplies" ${used===INVENTORY_SLOTS?"disabled":""}>Retrieve available supplies</button></div>`;
 }
 html+=`<p class="info">Gather resources by clicking trees, stones or berry bushes in the world. Trees and berry bushes can also give vines.</p>`;
 html+=`<div class="entry"><h3>🪓 Stone Axe</h3><p>${d.axe?"Equipped. Harvest 3 wood rather than 2 per tree interaction.":"A better tool for woodcutting. Requires the Stone Toolmaking technology."}</p><small>2 wood · 3 stone</small><button data-action="axe" ${d.axe||!d.technologies.includes("tools")||!state.enough({wood:2,stone:3})?"disabled":""}>${d.axe?"Already crafted":"Craft axe"}</button></div>`;
 html+=`<div class="entry"><h3>🏕 Village Construction</h3><p>Build Family Huts, a Cooking Hearth, the Toolmaker’s Shelter and a Council Lodge using carried resources.</p><button data-action="open-village">Open Village →</button></div>`;
 return html;
}
export function handlePackAction(ui,button){
 const action=button.dataset.action;
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
   ui.toast(`Dropped ${slot.qty} ${item.name}.`);
  }
  return true;
 }
 if(action==="retrieve-supplies"){
  const recovered=ui.state.retrieveLegacySupplies();
  ui.toast(recovered?`Retrieved ${recovered} supplies into your pack.`:"No pack space available.");
  return true;
 }
 return false;
}
