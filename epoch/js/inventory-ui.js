import {ITEMS,INVENTORY_SLOTS,STACK_LIMIT,ITEM_IDS} from "./inventory.js?v=20261114v";
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

// Keep this as an item attribute so future food, equipment and materials can
// add their own compact hover descriptions without growing a summary list.
const hint=id=>ITEMS[id]?.hint||ITEMS[id]?.name||"Item";

export function inventoryPanel(ui){
 const state=ui.state,slots=state.data.inventory,used=state.inventoryUsed();
 let html='<div class="pack-heading"><strong>Backpack</strong><small>'+
  used+' / '+INVENTORY_SLOTS+' slots</small></div>'+
  '<div class="pack-slot-grid" role="group" aria-label="Ten slot inventory">';
 for(let i=0;i<INVENTORY_SLOTS;i++){
  const slot=slots[i],item=slot&&ITEMS[slot.id];
  const open=!!slot&&ui.selectedSlot===i;
  const alignRight=i%5>=3?" align-right":"";
  const lastRow=i>=5?" menu-up tip-up":"";
  html+='<div class="pack-slot-shell'+(open?" menu-open":"")+alignRight+lastRow+'">'+
   '<button type="button" class="pack-slot '+(slot?"occupied":"empty")+(open?" selected":"")+
   '" data-action="pack-slot" data-slot="'+i+'" aria-haspopup="'+(slot?"menu":"false")+
   '" aria-expanded="'+open+'" aria-label="Slot '+(i+1)+': '+
   (item?esc(item.name)+' '+slot.qty+' of '+STACK_LIMIT:"Empty")+
   '" '+(item?'aria-describedby="pack-hint-'+i+'"':"")+'>'+
   (item?'<span class="pack-item-icon" aria-hidden="true">'+item.icon+'</span>'+
    '<span class="pack-quantity">'+slot.qty+'</span>':
    '<span class="pack-empty" aria-hidden="true">·</span>')+
   '<span class="pack-number">'+(i+1)+'</span></button>';
  if(item){
   html+='<span id="pack-hint-'+i+'" class="pack-item-tip" role="tooltip">'+
    '<strong>'+esc(item.name)+'</strong><span>'+esc(hint(slot.id))+'</span></span>';
   if(open){
    html+='<div class="pack-action-menu" role="menu" aria-label="Actions for '+esc(item.name)+'">'+
     '<div class="pack-action-heading">'+item.icon+' '+esc(item.name)+
     '<small>×'+slot.qty+'</small></div>';
    if(slot.id==="berries")
     html+='<button type="button" role="menuitem" class="pack-action-primary" data-action="eat-stack" data-slot="'+i+'">Eat</button>';
    html+='<button type="button" role="menuitem" class="pack-action-discard" data-action="drop-stack" data-slot="'+i+'">Discard stack</button></div>';
   }
  }
  html+='</div>';
 }
 html+='</div>';
 if(used>=INVENTORY_SLOTS)html+='<p class="pack-note">Backpack full. Deposit supplies at your village stockpile or discard a stack.</p>';
 const unpacked=state.inventoryUnpacked();
 if(unpacked){
  html+='<div class="pack-legacy-compact"><span>'+unpacked+' older saved supplies awaiting space</span>'+
   '<button type="button" data-action="retrieve-supplies">Retrieve</button></div>';
 }
 return html;
}
export function handlePackAction(ui,button){
 const action=button.dataset.action;
 if(!["pack-slot","eat-stack","drop-stack","retrieve-supplies"].includes(action))return false;
 if(action==="retrieve-supplies"){
  const recovered=ui.state.retrieveLegacySupplies();
  ui.toast(recovered?"Retrieved "+recovered+" saved supplies.":"No inventory space available.");
  return true;
 }
 const index=Number(button.dataset.slot);
 if(!Number.isInteger(index)||index<0||index>=INVENTORY_SLOTS)return true;
 const slot=ui.state.data.inventory[index];
 if(action==="pack-slot"){
  ui.selectedSlot=slot?(ui.selectedSlot===index?null:index):null;
  ui.render();
  return true;
 }
 if(!slot||ui.selectedSlot!==index)return true;
 const item=ITEMS[slot.id];
 if(action==="eat-stack"){
  if(slot.id!=="berries")return true;
  ui.selectedSlot=null;
  ui.toast(ui.state.eatBerries(index)?
   "Ate 1 berry. Hunger and stamina restored.":"Unable to eat those berries.");
  return true;
 }
 if(action==="drop-stack"){
  const quantity=slot.qty,name=item.name;
  ui.selectedSlot=null;
  if(ui.state.discardStack(index))ui.toast("Discarded "+quantity+" "+name+".");
  return true;
 }
 return false;
}
