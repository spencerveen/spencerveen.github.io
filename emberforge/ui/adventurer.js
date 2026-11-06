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
// This is deliberately one illustration with independent overlay mounting points.
// Empty layers render nothing. Equipped slots receive a subdued glimmer as a
// temporary visual cue; later item silhouettes/sprites can replace that cue.
function renderAdventurerPaperDoll(){
 const occupied=new Set(EQUIPMENT_SLOT_KEYS.filter(k=>!!s.equipped[k]));
 const layers=ADVENTURER_VISUAL_SLOTS.map(([slot,x,y,group])=>
   `<g class="efg-visual-layer ${occupied.has(slot)?'has-gear':''}" data-visual-slot="${slot}" data-layer-group="${group}" transform="translate(${x} ${y})"><circle class="efg-anchor-aura" r="13"/><path class="efg-anchor-mark" d="M0 -7 L7 0 L0 7 L-7 0 Z"/></g>`).join('');
 return `<div class="efg-paperdoll" aria-label="Adventurer character preview">
   <svg class="efg-paperdoll-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 430" role="img" aria-label="Neutral fantasy adventurer with a hood, tunic, gloves and boots; equipment visual layers are ready for future artwork">
     <defs>
       <radialGradient id="efg-rune-glow"><stop offset="0" stop-color="#c77d50" stop-opacity=".2"/><stop offset=".7" stop-color="#8c5473" stop-opacity=".06"/><stop offset="1" stop-color="#0b1425" stop-opacity="0"/></radialGradient>
       <linearGradient id="efg-cloth" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#485976"/><stop offset=".5" stop-color="#253750"/><stop offset="1" stop-color="#142337"/></linearGradient>
       <linearGradient id="efg-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b28c68"/><stop offset=".5" stop-color="#554b50"/><stop offset="1" stop-color="#25364a"/></linearGradient>
       <linearGradient id="efg-leather" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#6a4a42"/><stop offset=".5" stop-color="#3f3440"/><stop offset="1" stop-color="#1b2738"/></linearGradient>
       <radialGradient id="efg-face"><stop stop-color="#73665b"/><stop offset=".65" stop-color="#524a4b"/><stop offset="1" stop-color="#2b3040"/></radialGradient>
       <filter id="efg-softlight"><feGaussianBlur stdDeviation="5"/></filter>
     </defs>
     <g class="efg-rune-stage" aria-hidden="true">
       <circle cx="150" cy="196" r="135" fill="url(#efg-rune-glow)"/>
       <circle cx="150" cy="195" r="122" fill="none" stroke="#bf8657" stroke-opacity=".36" stroke-width="1"/>
       <circle cx="150" cy="195" r="114" fill="none" stroke="#c4a273" stroke-opacity=".18" stroke-width="1" stroke-dasharray="3 9"/>
       <circle cx="150" cy="195" r="100" fill="none" stroke="#9a6d53" stroke-opacity=".18"/>
       <path d="M150 62 L158 82 L150 102 L142 82 Z M150 290 L158 310 L150 330 L142 310 Z M17 195 L38 187 L57 195 L38 203 Z M243 195 L262 187 L283 195 L262 203 Z" fill="none" stroke="#dda064" stroke-opacity=".52"/>
       <path d="M64 108 L83 127 M217 263 L236 282 M64 282 L83 263 M217 127 L236 108" stroke="#bd865d" stroke-opacity=".32" stroke-width="2"/>
     </g>
     <ellipse cx="150" cy="403" rx="88" ry="11" fill="#e49b59" opacity=".14" filter="url(#efg-softlight)"/>
     <ellipse cx="150" cy="402" rx="78" ry="5" fill="#0a111e" opacity=".8"/>
     <g class="efg-character-base" stroke-linejoin="round" stroke-linecap="round">
       <!-- A back mantle and cowl sit behind the figure. -->
       <path d="M118 137 Q89 143 78 187 L72 319 Q150 337 228 319 L222 187 Q211 143 182 137 Z" fill="#1c2436" stroke="#8e6757" stroke-width="2"/>
       <path d="M111 141 Q86 165 84 240 L86 302 M189 141 Q214 165 216 240 L214 302" fill="none" stroke="#a57458" stroke-opacity=".5" stroke-width="2"/>
       <!-- Legs emerge from one continuous waistline. -->
       <path d="M116 251 L149 256 L143 358 L131 382 L105 374 L102 325 Z" fill="url(#efg-cloth)" stroke="#9d795e" stroke-width="2"/>
       <path d="M151 256 L184 251 L198 325 L195 374 L169 382 L157 358 Z" fill="url(#efg-cloth)" stroke="#9d795e" stroke-width="2"/>
       <path d="M107 346 L142 352 L138 383 Q125 394 95 388 L94 374 Z" fill="url(#efg-leather)" stroke="#96735d" stroke-width="2"/>
       <path d="M158 352 L193 346 L206 374 L205 388 Q175 394 162 383 Z" fill="url(#efg-leather)" stroke="#96735d" stroke-width="2"/>
       <path d="M95 382 Q97 395 132 393 M168 393 Q203 395 205 382" fill="none" stroke="#d9a268" stroke-width="2" opacity=".6"/>
       <!-- Natural sloped shoulders and arms overlap the connected torso. -->
       <path d="M108 135 Q86 132 82 160 L66 226 Q57 257 67 280 Q76 288 87 280 L106 225 L120 163 Z" fill="url(#efg-cloth)" stroke="#9d795e" stroke-width="2.5"/>
       <path d="M192 135 Q214 132 218 160 L234 226 Q243 257 233 280 Q224 288 213 280 L194 225 L180 163 Z" fill="url(#efg-cloth)" stroke="#9d795e" stroke-width="2.5"/>
       <path d="M70 239 L93 242 L85 267 L65 264 Z M230 239 L207 242 L215 267 L235 264 Z" fill="url(#efg-leather)" stroke="#b28a65" stroke-width="1.8"/>
       <path d="M70 272 Q73 287 82 286 L89 268 L66 264 Z M230 272 Q227 287 218 286 L211 268 L234 264 Z" fill="#75605a" stroke="#a98466" stroke-width="1.7"/>
       <!-- A single layered torso, leather belt and long tabard. -->
       <path d="M120 132 Q150 126 180 132 L202 153 L192 215 L186 264 Q150 277 114 264 L108 215 L98 153 Z" fill="url(#efg-cloth)" stroke="#bc9673" stroke-width="2.5"/>
       <path d="M118 142 L150 153 L182 142 L177 222 L150 243 L123 222 Z" fill="#526078" opacity=".4"/>
       <path d="M111 240 Q150 250 189 240 L187 256 Q150 267 113 256 Z" fill="url(#efg-leather)" stroke="#bf8f64" stroke-width="2"/>
       <path d="M144 244 L156 244 L157 258 L143 258 Z" fill="url(#efg-metal)" stroke="#edbd74" stroke-width="1.5"/>
       <path d="M135 262 L165 262 L169 316 L151 331 L131 316 Z" fill="#29364e" stroke="#a98062" stroke-width="2"/>
       <path d="M151 268 L151 317" stroke="#d9a46f" stroke-opacity=".6" stroke-width="2"/>
       <!-- Shoulder protection is understated so later equipment can cover it. -->
       <path d="M105 142 Q109 132 122 135 L128 151 L111 171 L89 167 Z" fill="url(#efg-metal)" stroke="#d0a06b" stroke-width="2"/>
       <path d="M195 142 Q191 132 178 135 L172 151 L189 171 L211 167 Z" fill="url(#efg-metal)" stroke="#d0a06b" stroke-width="2"/>
       <path d="M104 153 L115 158 M196 153 L185 158" stroke="#f4c17a" stroke-width="2" opacity=".65"/>
       <!-- Neck joins face and body. Hood hangs around the face rather than floating. -->
       <path d="M137 114 L163 114 L167 148 L150 157 L133 148 Z" fill="#594f51" stroke="#a58265" stroke-width="1.5"/>
       <path d="M111 100 Q108 58 131 46 Q150 35 169 46 Q192 59 189 100 L179 132 Q150 146 121 132 Z" fill="#202a3d" stroke="#9a775e" stroke-width="2.5"/>
       <path d="M120 86 Q123 58 150 53 Q178 59 180 86 L176 116 Q169 137 150 140 Q131 137 124 116 Z" fill="url(#efg-face)" stroke="#9c7c6c" stroke-width="2"/>
       <path d="M112 95 Q107 67 121 52 Q149 27 176 51 Q192 67 188 95 Q176 75 164 66 Q148 79 117 85 Z" fill="url(#efg-cloth)" stroke="#c09a73" stroke-width="2.5"/>
       <path d="M122 107 Q133 95 145 102 M155 102 Q167 95 178 107" stroke="#212637" stroke-opacity=".76" stroke-width="5"/>
       <path d="M144 122 Q150 126 156 122" fill="none" stroke="#473c42" stroke-width="2"/>
       <path d="M120 132 Q135 152 150 156 Q165 152 180 132" fill="none" stroke="#d9ac79" stroke-width="3" opacity=".7"/>
       <path d="M150 158 L150 229" stroke="#d8a46f" stroke-opacity=".6" stroke-width="2"/>
       <path d="M145 187 L150 180 L155 187 L150 194 Z" fill="#efae63" opacity=".78"/>
     </g>
     <g class="efg-equipment-overlays" aria-hidden="true">${layers}</g>
   </svg>
 </div>`;
}
