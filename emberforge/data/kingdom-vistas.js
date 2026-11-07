'use strict';
// All six kingdom vistas and 52 icon portraits are separate cacheable WebP assets.
// Keep the original array/object lookup contracts so combat and HUD use the same artwork.
const KINGDOM_VISTAS = ["./art/kingdom/vista-0.webp","./art/kingdom/vista-1.webp","./art/kingdom/vista-2.webp","./art/kingdom/vista-3.webp","./art/kingdom/vista-4.webp","./art/kingdom/vista-5.webp"];
const KINGDOM_SCENES = [
 {name:'Frontier Forge',req:0,asc:0,desc:'A humble workshop, fledgling mines and the first watchtower'},
 {name:'Growing Settlement',req:4,asc:0,desc:'Expanded mines, new stone buildings and a busy forge'},
 {name:'Arcane Quarter',req:10,asc:0,desc:'Towering libraries, vaults and a larger industrial heart'},
 {name:'Twilight Enclave',req:18,asc:1,desc:'A magical capital illuminated by an ancient forge'},
 {name:'Mountain Stronghold',req:29,asc:2,desc:'Battlements, mountain mines and a fortified forge'},
 {name:'Ember Citadel',req:43,asc:3,desc:'The final capital, a monument to every kingdom project'}
];
let kingdomVistaPreview = null; // null = automatically follow permanent progression
const kingdomBuiltLevels=()=>buildings.reduce((sum,b)=>sum+(s.build[b[0]]||0),0);
function syncKingdomVistas(){
 let prior = Math.max(0,Math.min(5,Math.floor(Number(s.kingdomVistaMax)||0)));
 let current=0, buildingsBuilt=kingdomBuiltLevels();
 for(let i=1;i<KINGDOM_SCENES.length;i++){
   let req=KINGDOM_SCENES[i];
   if(buildingsBuilt>=req.req && s.ascensions>=req.asc)current=i;
 }
 // Preserve discovered scenery across Ascensions, even though buildings reset.
 s.kingdomVistaMax=Math.max(prior,current);
 return s.kingdomVistaMax;
}
function activeKingdomVista(){
 const unlocked=syncKingdomVistas();
 return kingdomVistaPreview===null?unlocked:Math.max(0,Math.min(5,kingdomVistaPreview));
}
function updateKingdomVistaUI(){
 const unlocked=syncKingdomVistas(), index=activeKingdomVista(), scene=KINGDOM_SCENES[index];
 const count=$('vistacount'),name=$('vistaname'),info=$('vistainfo'),auto=$('vistaauto');
 if(count)count.textContent=(index+1)+' / '+KINGDOM_SCENES.length;
 if(name)name.textContent=scene.name;
 if(info)info.textContent=(index>unlocked?'Gallery preview · ':'')+scene.desc;
 if(auto){auto.textContent=kingdomVistaPreview===null?'Following Progress':'Return to Progress';auto.classList.toggle('btn-gold',kingdomVistaPreview!==null)}
}

const BUILD_TIER_NAMES=['Dormant','Humble','Growing','Grand'];
const BUILD_TIER_NOTES={
 mine:['Not built yet','A starter mine shaft and work camp','Expanded galleries and ore lifts','A vast mine complex with blazing ore veins'],
 barracks:['No garrison yet','A wooden garrison and training yard','Stone barracks with drills and banners','A fortified war campus fit for champions'],
 library:['No archives yet','A simple reading hall and study shelves','An arcane wing with more tomes and runes','A luminous grand library tower complex'],
 roost:['No roost yet','A small perch and hatchery pen','A raised roost with carved archways','A majestic dragon roost perched over the realm'],
 watchtower:['No watchpost yet','A basic watchpost scanning the roads','A reinforced watchtower network','Sky-reaching towers guarding the kingdom'],
 vault:['No vault yet','A secure chamber for starter relics','A reinforced vault with layered locks','A royal vault of legendary treasure']
};
let battleBgVariant=Math.floor(Math.random()*4);
const buildTier=lv=>lv>=8?3:lv>=4?2:lv>=1?1:0;
const forgeTier=()=>Math.min(3,Math.floor(Math.max(0,s.level-1)/50));
const tierRoman=t=>['I','II','III','IV'][Math.max(0,Math.min(3,t))];
const spritePos2x2=n=>`${n%2?100:0}% ${n>1?100:0}%`;
const spritePos3x2=n=>`${n%3===0?0:n%3===1?50:100}% ${n<3?0:100}%`;
function setIllustratedBackground(id,url,size,pos){let el=$(id);if(!el)return;let key=url+'|'+size+'|'+pos;if(el.dataset.backgroundKey===key)return;el.dataset.backgroundKey=key;el.style.backgroundImage=`url(${url})`;el.style.backgroundSize=size;el.style.backgroundPosition=pos;}
function rollBattleBackground(){battleBgVariant=Math.floor(Math.random()*4)}
function updateIllustratedScenes(){
 let foe=enemy(),boss=foe.boss;
 setIllustratedBackground('battlebg',boss?BOSS_BG_SHEET:REG_BG_SHEETS[s.zone],boss?'300% 200%':'200% 200%',boss?spritePos3x2(s.zone):spritePos2x2(battleBgVariant));
 let tier=forgeTier();
 setIllustratedBackground('forgebg',HUB_BG_SHEET,'200% 200%',spritePos2x2(tier));
 let vista=activeKingdomVista();setIllustratedBackground('kingdombg',KINGDOM_VISTAS[vista],'cover','center center');updateKingdomVistaUI();
 let chips=[`<span class="chip">EMBERFORGE TIER ${tierRoman(tier)}</span>`,`<span class="chip">FORGE LV ${fmt(s.level)}</span>`,`<span class="chip">ASC ${fmt(s.ascensions)}</span>`];
 let fo=$('forgeoverlay'); if(fo)fo.innerHTML=chips.join('')+'<button type="button" class="chip" data-go="kingdom">View Kingdom →</button>';
 let ko=$('kingdomoverlay'); if(ko)ko.innerHTML=[`<span class="chip">KINGDOM ERA ${fmt(s.ascensions)}</span>`,`<span class="chip">COMBAT LV ${fmt(s.combatLevel)}</span>`,`<span class="chip">BUILD CAP ${buildingCap()}/12</span>`].join('');
 let kc=$('kingdomcallout');
 if(kc){
   let buildTotal=Object.values(s.build).reduce((a,b)=>a+b,0);
   let chosen=KINGDOM_SCENES[vista];
   kc.innerHTML=`<strong>${chosen.name.toUpperCase()}</strong><div class="hint" style="color:#f3e1c3">${chosen.desc}</div><div class="kingdom-level-line">${fmt(buildTotal)} built levels · Forge tier ${tierRoman(tier)} · ${s.kingdomVistaMax+1}/6 vistas unlocked</div>`;
 }
 let kt=$('kingdomtiers');
 if(kt){
   kt.innerHTML=buildings.map(b=>{let lv=s.build[b[0]]||0,t=buildTier(lv);return `<div class="tier-badge"><div class="label">${esc(b[1])}</div><strong>${BUILD_TIER_NAMES[t]}</strong><span>Lv ${fmt(lv)} / ${buildingCap()}</span></div>`}).join('');
 }
 let fs=$('forgetierstat'); if(fs)fs.textContent=tierRoman(tier);
 let bl=$('builtlevels'); if(bl)bl.textContent=fmt(Object.values(s.build).reduce((a,b)=>a+b,0));
 let bm=$('buildtiermax'); if(bm)bm.textContent=tierRoman(Math.max(0,...buildings.map(b=>buildTier(s.build[b[0]]||0))));
 let ks=$('kingdomsummary');
 if(ks){
   ks.innerHTML='<div class="section">Your six structures</div><div class="kingdom-quick-grid">'+buildings.map(b=>{let lv=s.build[b[0]]||0,t=buildTier(lv);return `<div class="kingdom-quick">${iconHTML(b[2],'sm')}<div style="min-width:0"><strong>${b[1]}</strong><small>Lv ${lv} · ${BUILD_TIER_NAMES[t]}</small></div></div>`}).join('')+'</div>';
 }

}

const KEY='emberforge-kingdoms-v3';let s=fresh(),page='forge',sub='skills',buyMode='1',last=performance.now(),elapsedUI=0,elapsedAutoSave=0,elapsedShop=0,toastTimer=null,needsMain=false,modalOpen=false;
const fmt=n=>{if(!isFinite(n))return '∞';if(n<1000)return n<10&&n%1?n.toFixed(1):Math.floor(n).toLocaleString('en-US');const u=['K','M','B','T','Qa','Qi','Sx','Sp','Oc'];let i=Math.min(u.length-1,Math.floor(Math.log10(n)/3)-1),v=n/1000**(i+1);return v.toFixed(v<10?2:1).replace(/\.0+$/,'')+u[i]};
const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,Number.isFinite(+n)?+n:lo));
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICON_DATA={"crystal":"./art/icons/crystal.webp","swords":"./art/icons/swords.webp","pickaxe":"./art/icons/pickaxe.webp","bolt":"./art/icons/bolt.webp","backpack":"./art/icons/backpack.webp","castle":"./art/icons/castle.webp","map":"./art/icons/map.webp","badge":"./art/icons/badge.webp","flame":"./art/icons/flame.webp","gear":"./art/icons/gear.webp","tap":"./art/icons/tap.webp","swordglow":"./art/icons/swordglow.webp","soulfire":"./art/icons/soulfire.webp","gem":"./art/icons/gem.webp","chest":"./art/icons/chest.webp","scroll":"./art/icons/scroll.webp","medal":"./art/icons/medal.webp","altar":"./art/icons/altar.webp","saveglyph":"./art/icons/saveglyph.webp","portalglyph":"./art/icons/portalglyph.webp","mine":"./art/icons/mine.webp","barracks":"./art/icons/barracks.webp","library":"./art/icons/library.webp","roost":"./art/icons/roost.webp","watchtower":"./art/icons/watchtower.webp","vault":"./art/icons/vault.webp","sprite":"./art/icons/sprite.webp","miner":"./art/icons/miner.webp","smith":"./art/icons/smith.webp","golem":"./art/icons/golem.webp","dragon":"./art/icons/dragon.webp","portalworker":"./art/icons/portalworker.webp","foundry":"./art/icons/foundry.webp","alchemist":"./art/icons/alchemist.webp","phoenix":"./art/icons/phoenix.webp","broker":"./art/icons/broker.webp","engine":"./art/icons/engine.webp","imp":"./art/icons/imp.webp","beast":"./art/icons/beast.webp","guardian":"./art/icons/guardian.webp","ashimp":"./art/icons/ashimp.webp","cinderwarden":"./art/icons/cinderwarden.webp","thornstalker":"./art/icons/thornstalker.webp","ancientent":"./art/icons/ancientent.webp","icerevenant":"./art/icons/icerevenant.webp","frosttyrant":"./art/icons/frosttyrant.webp","voidknight":"./art/icons/voidknight.webp","obsidiandragon":"./art/icons/obsidiandragon.webp","starwraith":"./art/icons/starwraith.webp","fallensun":"./art/icons/fallensun.webp","eternalguardian":"./art/icons/eternalguardian.webp","ashking":"./art/icons/ashking.webp"};
