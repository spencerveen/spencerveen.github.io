'use strict';
// A scalable paper-doll scene. Future equipment artwork should be inserted into the
// corresponding SVG layer, not painted onto the base character silhouette.
// The slot names mirror EQUIPMENT_SLOT_KEYS and the saved equipment schema.
const ADVENTURER_VISUAL_SLOTS=[
 ['back',150,179,'back'],
 ['boots',152,364,'lower'],
 ['legs',150,291,'lower'],
 ['chest',150,192,'torso'],
 ['gloves',77,235,'arms'],
 ['offHand',241,255,'hands'],
 ['mainHand',59,255,'hands'],
 ['necklace',150,150,'jewelry'],
 ['ring1',60,267,'jewelry'],['ring2',69,272,'jewelry'],
 ['ring3',239,267,'jewelry'],['ring4',231,272,'jewelry'],
 ['charm',150,220,'jewelry'],
 ['helmet',150,90,'head']
];
// Each equipment slot keeps a hidden SVG mounting group for future gear artwork.
// No placeholder symbols are drawn over the adventurer, even when gear is equipped.
function renderAdventurerPaperDoll(){
 const gender=s.avatarBody==='female'?'female':'male';
 const occupied=new Set(EQUIPMENT_SLOT_KEYS.filter(k=>!!s.equipped[k]));
 const layers=ADVENTURER_VISUAL_SLOTS.map(([slot,x,y,group])=>
   `<g class="efg-visual-layer ${occupied.has(slot)?'has-gear':''}" data-visual-slot="${slot}" data-layer-group="${group}" transform="translate(${x} ${y})"></g>`).join('');
 return `<div class="efg-paperdoll" aria-label="${gender==='female'?'Female':'Male'} adventurer preview">
   <svg class="efg-paperdoll-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 430" role="img" aria-label="Dark fantasy ${gender} adventurer starting in worn peasant clothing">
     <defs><radialGradient id="efg-portrait-vignette"><stop offset="0" stop-color="#654238" stop-opacity=".15"/><stop offset="1" stop-color="#0b1424" stop-opacity="0"/></radialGradient></defs>
     <g class="efg-rune-stage"><rect x="0" y="0" width="300" height="430" fill="url(#efg-portrait-vignette)"/></g>
     <image class="efg-character-base" href="./art/adventurer-${gender}.webp?v=2" x="0" y="15" width="300" height="400" preserveAspectRatio="xMidYMid meet"/>
     <g class="efg-equipment-overlays" aria-hidden="true">${layers}</g>
   </svg>
 </div>`;
}
