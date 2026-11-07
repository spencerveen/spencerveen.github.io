'use strict';
const LEGACY_ICON_MAP={'✨':'sprite','⛏️':'miner','🔨':'smith','🧙':'broker','🗿':'golem','⚗️':'alchemist','🐉':'dragon','🤖':'engine','🌀':'portalworker','🔮':'foundry','☀️':'foundry','🌌':'engine','🧤':'tap','🪓':'pickaxe','🌙':'soulfire','🔆':'gem','🔥':'flame','🌋':'crystal','🚩':'badge','💪':'swordglow','⚙️':'gear','👑':'medal','🩸':'swordglow','🌠':'altar','🫴':'tap','❤️‍🔥':'dragon','🔱':'altar','🌑':'guardian','☄️':'altar','💎':'mine','⚔️':'barracks','📚':'library','🐲':'roost','🏹':'watchtower','🏛️':'vault','💰':'chest','🛡️':'guardian','👺':'imp','🐺':'beast','🌳':'beast','🥶':'beast','🧊':'guardian','👻':'imp','🌞':'guardian','🗡️':'sword','🥋':'guardian','👘':'castle','💍':'gem'};
const ICON_ALIASES={'sword':'swordglow','trophy':'medal','save':'saveglyph'};
function iconKey(id){return ICON_DATA[id]?id:(ICON_ALIASES[id]||LEGACY_ICON_MAP[id]||'crystal')}
function iconHTML(id,size='md'){let key=iconKey(id);return `<img class="ico ${size}" src="${ICON_DATA[key]}" alt="" draggable="false" decoding="async">`}
function setIcon(el,id,size='md'){let n=typeof el==='string'?$(el):el;if(!n)return;let key=iconKey(id),label=key+'|'+size;if(n.dataset.icon===label)return;n.dataset.icon=label;n.innerHTML=iconHTML(key,size)}
function monsterSpriteStyle(zone,stage){return '';}
function monsterSheetHTML(zone,stage,size='hero'){let src=MONSTER_PORTRAITS[zone]?.[stage-1];return src?`<img class="monster-sheet ${size}" src="${src}" alt="" aria-hidden="true" draggable="false" decoding="async">`:iconHTML('guardian',size==='hero'?'hero':'lg')}

function clean(obj){let f=fresh();if(!obj||typeof obj!=='object')return f;let x={...f,...obj,gens:{...f.gens,...(obj.gens||{})},ups:{...(obj.ups||{})},build:{...f.build,...(obj.build||{})},skills:{...(obj.skills||{})},codex:{...f.codex,...(obj.codex||{})},training:{...f.training,...(obj.training||{})}};
for(let k of ['ember','lifetime','runEarned','clicks','souls','ascensions','kills','bosses','lootFound','skillPoints'])x[k]=Math.max(0,Number.isFinite(+x[k])?+x[k]:0);
for(let k of Object.keys(x.gens))x.gens[k]=Math.floor(clamp(x.gens[k],0,100000));for(let k of Object.keys(x.build))x.build[k]=Math.floor(clamp(x.build[k],0,12));for(let k of Object.keys(x.skills))x.skills[k]=Math.floor(clamp(x.skills[k],0,5));
// Epic salvage is now deliberately supported.
let oldZone=Math.floor(clamp(obj.zone??obj.realm??0,0,5));
x.combatLevel=Math.floor(clamp(obj.combatLevel??Math.max(1,REALM_LEVELS[oldZone],Math.floor(Math.sqrt(x.kills/2))+1),1,140));
x.combatXP=clamp(x.combatXP,0,1e15);
// Potion amounts are validated after equipment, so shared backpack capacity is enforced.
x.hp=Object.prototype.hasOwnProperty.call(obj,'hp')&&obj.version>=5?clamp(obj.hp,0,1e15):null;
for(let k of Object.keys(f.training))x.training[k]=Math.floor(clamp(x.training[k],0,30));
x.enemyTimer=0;x.enemyHits=0;x.manualAt=0;x.engagedUntil=0;x.downUntil=0;x.potionReady=0;x.combatMessage='Battle ready';x.zone=Math.floor(clamp(obj.zone??obj.realm??0,0,5));x.unlocked=Math.floor(clamp(x.unlocked,0,5));x.zone=Math.min(x.zone,x.unlocked);while(x.zone>0&&!(x.combatLevel>=REALM_LEVELS[x.zone]&&x.ascensions>=REALM_ASCENSIONS[x.zone])){x.zone--;obj={...obj,stage:1,enemyHP:0}}x.stage=Math.floor(clamp(obj.stage??obj.wave??1,1,10));x.enemyHP=clamp(obj.enemyHP??obj.hp??0,0,1e99);if(oldZone!==x.zone||Number(obj.stage??obj.wave??1)!==x.stage)x.enemyHP=0;x.level=Math.max(1,Math.floor(clamp(x.level,1,999999)));
x.stageUnlocked=Array.from({length:6},(_,i)=>i<x.unlocked?10:Math.max(i===0?1:0,Math.floor(clamp(Array.isArray(obj.stageUnlocked)?obj.stageUnlocked[i]:(i===x.zone?x.stage:(i<=x.unlocked?1:0)),0,10))));
x.firstClears=Array.from({length:6},(_,i)=>Math.floor(clamp(Array.isArray(obj.firstClears)?obj.firstClears[i]:(i<x.unlocked?10:(i===x.zone?Math.max(0,x.stage-1):0)),0,10)));
x.bossCleared=Array.from({length:6},(_,i)=>!!(Array.isArray(obj.bossCleared)?obj.bossCleared[i]:i<x.unlocked||(x.codex?.[realms[i][5]]||0)>0));
for(let i=0;i<6;i++){if(x.bossCleared[i])x.stageUnlocked[i]=10;if(i<x.unlocked)x.stageUnlocked[i]=10;}
x.stageUnlocked[x.zone]=Math.max(1,x.stageUnlocked[x.zone]);x.stage=Math.min(x.stage,x.stageUnlocked[x.zone]);
x.autoMode=['off','selected','smart'].includes(obj.autoMode)?obj.autoMode:(obj.auto?'selected':'off');x.auto=x.autoMode!=='off';x.smartResting=false;
// Equipment reset in v9: preserve player progression but retire every old drop.
if((Number(obj.version)||0)<9){
 x.items=[];x.pendingRelics=[];x.lastBossLoot=null;
 x.lootFound=0;x.salvage='off';
}else{
 const catalog=new Map([...ASHEN_LOOT,...KINGDOM_STARTER_GEAR].map(item=>[item.name,item]));
 x.items=(Array.isArray(obj.items)?obj.items:[]).filter(g=>g&&catalog.has(g.name)&&g.slot===catalog.get(g.name).slot).slice(0,inventoryCapacity()).map((g,i)=>{
  const item=catalog.get(g.name);return {...item,id:String(g.id||('loot'+i)).slice(0,90),rarity:'common',locked:!!g.locked,origin:0,tier:Math.floor(clamp(g.tier,1,10))};
 });
 x.pendingRelics=[];x.salvage='off';
}
// Keep as many saved potions as available backpack slots allow; older ten-item stacks
// migrate automatically. Equipment is preserved first when loading existing saves.
let openSlots=Math.max(0,inventoryCapacity()-x.items.length);
x.potions={};
for(const p of HEALING_POTIONS){
 const count=Math.floor(clamp(obj.potions?.[p.id]??0,0,openSlots*p.maxStack));
 x.potions[p.id]=count;
 openSlots-=Math.ceil(count/p.maxStack);
}
// Migrate existing equipped legacy slots to the new character equipment grid.
const savedEquip=obj.equipped&&typeof obj.equipped==='object'?obj.equipped:{};
x.equipped={...f.equipped};
for(const slot of EQUIPMENT_SLOT_KEYS){
 const id=savedEquip[slot];
 if(typeof id==='string'&&x.items.some(g=>g.id===id&&equipmentSlotFor(g)===slot))x.equipped[slot]=id;
}
for(const [legacy,slot] of Object.entries(LEGACY_EQUIPMENT_SLOTS)){
 const id=savedEquip[legacy]||(legacy==='charm'?savedEquip.ring:null);
 if(!x.equipped[slot]&&typeof id==='string'&&x.items.some(g=>g.id===id&&equipmentSlotFor(g)===slot))x.equipped[slot]=id;
}
const equippedIds=new Set();
for(const slot of EQUIPMENT_SLOT_KEYS){
 if(equippedIds.has(x.equipped[slot]))x.equipped[slot]=null;
 if(x.equipped[slot])equippedIds.add(x.equipped[slot]);
}
// Legacy saves did not track location: preserve their last active expedition.
x.location=['kingdom','realm'].includes(obj.location)?obj.location:'realm';
x.avatarBody=['male','female'].includes(obj.avatarBody)?obj.avatarBody:'male';x.avatarName=typeof obj.avatarName==='string'?obj.avatarName.trim().slice(0,32):'';
x.claimed=Array.isArray(obj.claimed)?obj.claimed.filter(z=>typeof z==='string').slice(0,30):[];x.ach=Array.isArray(obj.ach)?obj.ach.filter(z=>typeof z==='string').slice(0,20):[];x.journal=Array.isArray(obj.journal)?obj.journal.filter(z=>typeof z==='string').slice(0,8):[];
x.bounty=Math.max(0,Math.floor(clamp(x.bounty,0,1e5)));x.bountyStart=Math.max(0,Math.floor(clamp(x.bountyStart,0,1e12)));x.auto=!!x.auto;x.autoProgress=clamp(x.autoProgress,0,1);x.upgradeView=['unlocked','affordable','all'].includes(x.upgradeView)?x.upgradeView:'unlocked';x.showOwned=!!x.showOwned;x.kingdomVistaMax=Math.floor(clamp(x.kingdomVistaMax??0,0,5));if(x.location==='kingdom'){x.autoMode='off';x.auto=false;x.engagedUntil=0;x.enemyTimer=0;}
x.version=11;x.updated=Number.isFinite(+x.updated)?+x.updated:Date.now();delete x.event;delete x.eventEnd;delete x.nextEvent;return x;}
