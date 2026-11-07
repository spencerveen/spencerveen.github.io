'use strict';
const MOB_TRAITS=[{name:'Standard',hp:1,atk:1,speed:1},{name:'Swift',hp:.92,atk:.9,speed:.82},{name:'Standard',hp:1,atk:1,speed:1},{name:'Armored',hp:1.33,atk:.95,speed:1.06},{name:'Fierce',hp:1,atk:1.2,speed:.94},{name:'Standard',hp:1,atk:1,speed:1},{name:'Swift',hp:1,atk:1.11,speed:.85},{name:'Armored',hp:1.4,atk:1,speed:1.08},{name:'Elite',hp:1.28,atk:1.3,speed:.9}];
// Consumables share the 30-slot backpack with equipment. The merchant sells only basic supplies.
const HEALING_POTIONS=[
 {id:'minor',name:'Minor Healing Potion',heal:0.10,maxStack:10,price:150,dropChance:0.003, bossDropChance:0.008,icon:'gem'}
];
const potionDefinition=id=>HEALING_POTIONS.find(p=>p.id===id);
// Starter gear is sold only by the Kingdom merchant and never appears in monster loot.
const KINGDOM_STARTER_GEAR=[
 {name:'Starter Sword',slot:'mainHand',icon:'swordglow',power:2,price:180},
 {name:'Starter Shield',slot:'offHand',icon:'guardian',power:1,price:160},
 {name:'Starter Helmet',slot:'helmet',icon:'medal',power:1,price:120},
 {name:'Starter Chestplate',slot:'chest',icon:'guardian',power:2,price:240},
 {name:'Starter Gloves',slot:'gloves',icon:'tap',power:1,price:100},
 {name:'Starter Greaves',slot:'legs',icon:'guardian',power:1,price:180},
 {name:'Starter Boots',slot:'boots',icon:'guardian',power:1,price:110},
 {name:'Traveler\'s Blade',slot:'mainHand',icon:'swordglow',power:3,price:420,ascension:1}
];
const MERCHANT_GEAR_BY_NAME=new Map(KINGDOM_STARTER_GEAR.map(g=>[g.name,g]));
// Ashen Wilds is the ONLY realm with active equipment drops.
const ASHEN_LOOT=[
 {
  "name": "Rusty Iron Helmet",
  "slot": "helmet",
  "icon": "medal",
  "power": 2,
  "weight": 2,
  "min": 3
 },
 {
  "name": "Iron Helmet",
  "slot": "helmet",
  "icon": "medal",
  "power": 5,
  "weight": 1,
  "min": 6
 },
 {
  "name": "Rusty Iron Chestplate",
  "slot": "chest",
  "icon": "guardian",
  "power": 4,
  "weight": 2,
  "min": 7
 },
 {
  "name": "Iron Chestplate",
  "slot": "chest",
  "icon": "guardian",
  "power": 9,
  "weight": 1,
  "min": 8
 },
 {
  "name": "Rusty Iron Gauntlets",
  "slot": "gloves",
  "icon": "tap",
  "power": 1,
  "weight": 4,
  "min": 1
 },
 {
  "name": "Iron Gauntlets",
  "slot": "gloves",
  "icon": "tap",
  "power": 3,
  "weight": 1,
  "min": 4
 },
 {
  "name": "Rusty Iron Greaves",
  "slot": "legs",
  "icon": "guardian",
  "power": 2,
  "weight": 2,
  "min": 3
 },
 {
  "name": "Iron Greaves",
  "slot": "legs",
  "icon": "guardian",
  "power": 5,
  "weight": 1,
  "min": 6
 },
 {
  "name": "Rusty Iron Boots",
  "slot": "boots",
  "icon": "guardian",
  "power": 1,
  "weight": 4,
  "min": 1
 },
 {
  "name": "Iron Boots",
  "slot": "boots",
  "icon": "guardian",
  "power": 3,
  "weight": 1,
  "min": 4
 },
 {
  "name": "Rusty Iron Shield",
  "slot": "offHand",
  "icon": "guardian",
  "power": 2,
  "weight": 2,
  "min": 5
 },
 {
  "name": "Iron Shield",
  "slot": "offHand",
  "icon": "guardian",
  "power": 5,
  "weight": 1,
  "min": 8
 },
 {
  "name": "Rusty Iron Sword",
  "slot": "mainHand",
  "icon": "swordglow",
  "power": 3,
  "weight": 2,
  "min": 5
 },
 {
  "name": "Iron Sword",
  "slot": "mainHand",
  "icon": "swordglow",
  "power": 7,
  "weight": 1,
  "min": 8
 },
 {
  "name": "Torn Cape",
  "slot": "back",
  "icon": "backpack",
  "power": 0,
  "weight": 3,
  "min": 2,
  "ability": "protection",
  "abilityValue": 1
 },
 {
  "name": "Tattered Cape",
  "slot": "back",
  "icon": "backpack",
  "power": 0,
  "weight": 2,
  "min": 5,
  "ability": "attack",
  "abilityValue": 1
 },
 {
  "name": "Bronze Ring of Vitality",
  "slot": "ring1",
  "icon": "gem",
  "power": 0,
  "weight": 2,
  "min": 5,
  "ability": "regen",
  "abilityValue": 0.0006
 },
 {
  "name": "Bronze Ring of Protection",
  "slot": "ring1",
  "icon": "gem",
  "power": 0,
  "weight": 2,
  "min": 5,
  "ability": "protection",
  "abilityValue": 2
 },
 {
  "name": "Small Charm of Vitality",
  "slot": "charm",
  "icon": "gem",
  "power": 0,
  "weight": 1,
  "min": 7,
  "ability": "regen",
  "abilityValue": 0.00025
 },
 {
  "name": "Small Charm of Protection",
  "slot": "charm",
  "icon": "gem",
  "power": 0,
  "weight": 1,
  "min": 7,
  "ability": "protection",
  "abilityValue": 1
 },
 {
  "name": "Bronze Necklace of Vitality",
  "slot": "necklace",
  "icon": "gem",
  "power": 0,
  "weight": 1,
  "min": 8,
  "ability": "regen",
  "abilityValue": 0.0005
 },
 {
  "name": "Bronze Necklace of Protection",
  "slot": "necklace",
  "icon": "gem",
  "power": 0,
  "weight": 1,
  "min": 8,
  "ability": "protection",
  "abilityValue": 1
 }
];
// Future-proof equipment layout. Today's loot keeps its legacy weapon/armor/charm types.
const EQUIPMENT_SLOTS=[
 ['helmet','Helmet','medal','head'],['necklace','Necklace','gem','jewelry'],
 ['mainHand','Main Hand','swordglow','hands'],['chest','Chestplate','guardian','body'],
 ['offHand','Off-Hand','guardian','hands'],['gloves','Gauntlets','tap','hands'],
 ['legs','Greaves / Platelegs','guardian','body'],['boots','Boots','guardian','body'],
 ['ring1','Ring I','gem','jewelry'],['ring2','Ring II','gem','jewelry'],
 ['ring3','Ring III','gem','jewelry'],['ring4','Ring IV','gem','jewelry'],
 ['charm','Charm','crystal','jewelry'],['back','Back / Cape','backpack','body']
];
const EQUIPMENT_SLOT_KEYS=EQUIPMENT_SLOTS.map(slot=>slot[0]);
// Base storage capacity; a future equipped backpack can expand this without changing slot rendering.
const INVENTORY_CAPACITY=30;
const inventoryCapacity=()=>INVENTORY_CAPACITY;
// Each consumable stack takes one backpack slot. A partly filled stack can be topped up.
const potionSlotsUsed=()=>HEALING_POTIONS.reduce((total,p)=>{
 const quantity=Math.max(0,Math.floor(Number(s.potions?.[p.id])||0));
 return total+Math.ceil(quantity/p.maxStack);
},0);
const inventoryUsedSlots=()=>s.items.length+potionSlotsUsed();
const LEGACY_EQUIPMENT_SLOTS={weapon:'mainHand',armor:'chest',charm:'charm'};
const equipmentSlotFor=item=>LEGACY_EQUIPMENT_SLOTS[item?.slot]||item?.slot;
const equipmentPowerType=slot=>slot==='mainHand'?'attack':slot==='back'?'bonus':slot==='charm'||slot==='necklace'||slot.startsWith('ring')?'effect':'defense';
// Shared protection rules keep combat drops, merchant sales and bulk salvage consistent.
const equippedGearIds=()=>new Set(Object.values(s.equipped));
const isGearEquipped=(item,ids=equippedGearIds())=>ids.has(item.id);
const isGearTradeProtected=(item,ids=equippedGearIds())=>!!item.locked||isGearEquipped(item,ids);

const lootAbilityText=g=>!g.ability?'':g.ability==='regen'?'Resting healing +'+((g.abilityValue||0)*100).toFixed(3)+'% max HP/s':g.ability==='protection'?'Protection +'+(g.abilityValue||0):g.ability==='attack'?'Attack +'+(g.abilityValue||0):'';
const lootVisual=(id,size='lg')=>ICON_DATA[id]?iconHTML(id,size):`<span class="lootemoji ${size}" role="img" aria-label="Item">${esc(id||'🗡️')}</span>`;
const bossClearedAt=i=>!!s.bossCleared?.[i]||i<s.unlocked;
const maxSelectable=i=>Math.min(10,Math.max(1,s.stageUnlocked?.[i]|| (i<s.unlocked?10:1)));
const currentTrait=stage=>MOB_TRAITS[Math.max(0,Math.min(8,stage-1))];
// Display-only suggested combat levels. Realm gates are earned by defeating bosses.
const REALM_LEVELS=[1,10,23,40,60,84];
const REALM_ASCENSIONS=[0,0,1,2,3,5];
const bossesDefeated=()=>realms.reduce((n,_realm,i)=>n+(bossClearedAt(i)?1:0),0);
// Building tiers follow completed area bosses; the sixth boss crowns the final era.
const KINGDOM_BUILDING_CAPS=[3,6,9,11,12];
const kingdomBossTier=()=>Math.min(5,bossesDefeated());
const GATE_UPGRADES=[
  ['glove',0,1,1],['pick',0,2,2],['shift',0,3,2],['hammer',0,4,4],
  ['rune',0,5,5],['bellows',0,7,6],['crit',0,8,7],['warbanner',0,10,8],
  ['titan',1,11,13],['engine',1,13,15],['crown',1,15,19],['bloodstone',2,17,28],
  ['starweave',2,19,35],['echoes',2,21,39],['dragonheart',3,24,52],
  ['transcend',3,28,57],['voidhammer',4,31,70],['worldbreaker',5,34,87]
];
const GATE_WORKERS=[
 ['spark',0,1],['miner',0,2],['smith',0,4],['acolyte',0,6],['golem',0,9],
 ['alchemist',1,12],['dragon',1,15],['automaton',2,19],['portal',2,23],
 ['oracle',3,28],['sun',4,32],['cosmic',5,37]
];
const GATE_BUILDINGS=[
 ['mine',0,1],['barracks',0,1],['library',0,1],['roost',0,1],['watchtower',0,1],['vault',0,1]
];
const upgradeReq = u => {let g=GATE_UPGRADES.find(x=>x[0]===u[0]);return g||[u[0],0,1,1]};
const upgradeUnlocked = u => {let g=upgradeReq(u);return kingdomBossTier()>=g[1]&&s.level>=g[2]&&s.combatLevel>=g[3]};
const workerReq=w=>GATE_WORKERS.find(x=>x[0]===w[0])||[w[0],0,1];
const workerUnlocked=w=>{let g=workerReq(w);return kingdomBossTier()>=g[1]&&s.level>=g[2]};
const buildingReq=b=>GATE_BUILDINGS.find(x=>x[0]===b[0])||[b[0],0,1];
const buildingUnlocked=b=>{let g=buildingReq(b);return kingdomBossTier()>=g[1]&&s.combatLevel>=g[2]};
const buildingCap=()=>KINGDOM_BUILDING_CAPS[Math.min(KINGDOM_BUILDING_CAPS.length-1,kingdomBossTier())];
const activeBuild=id=>Math.min(s.build[id]||0,buildingCap());
const trainingCap=()=>Math.min(30,4+3*kingdomBossTier());
const skillCap=()=>Math.min(5,1+kingdomBossTier());
const activeSkill=id=>Math.min(s.skills[id]||0,skillCap());
const activeTraining=id=>Math.min(s.training[id]||0,trainingCap());
const ascendTarget=()=>Math.ceil(100000*Math.pow(2.3,s.ascensions));
const soulReward=()=>Math.min(5,Math.floor(Math.sqrt(s.runEarned/ascendTarget())));
const realmAccessible=i=>Number.isInteger(i)&&i>=0&&i<realms.length&&i<=s.unlocked&&(i===0||bossClearedAt(i-1));
// Kingdom is a safe world-map destination, not a combat realm.
const atKingdom=()=>s.location==='kingdom';
const inExpedition=()=>s.location==='realm';
const reqText=(a,f,c)=>[a?'Boss clears '+a:'',f?'Forge '+f:'',c?'Combat '+c:''].filter(Boolean).join(' · ');
const requirementFor=u=>{let g=upgradeReq(u);return reqText(g[1],g[2],g[3])};
const TRAINING=[
['vitality','Vitality','soulfire','+6% maximum health per level',70],
['guard','Battle Experience','guardian','+5% combat XP per level',95],
['blade','Scavenging','swords','+4% Ember rewards from enemies per level',110],
['regen','Potioncraft','gem','+2% maximum HP restored by potions per level',90]
];
const XP_GAIN = (zone,stage,boss)=>Math.ceil(15*(stage+1)*Math.pow(5.4,zone)*(boss?5:1));
const nextCombatXP=level=>Math.ceil(55*Math.pow(1.125,Math.max(0,level-1)));
const rarities=['common'], rarityScale=[1];
const honors=[['first','First Spark','Harvest Ember',x=>x.clicks>0],['work','First Hire','Own one worker',x=>Object.values(x.gens).some(v=>v>0)],['coin','Warm Hands','Earn 1K lifetime Ember',x=>x.lifetime>=1000],['rich','Ember Magnate','Earn 1M lifetime Ember',x=>x.lifetime>=1e6],['battle','First Blood','Defeat an enemy',x=>x.kills>0],['boss','Crown Breaker','Defeat a boss',x=>x.bosses>0],['builder','Foundations','Construct a building',x=>Object.values(x.build).some(v=>v>0)],['explorer','Wayfarer','Unlock a second region',x=>x.unlocked>=1],['loot','Lucky Find','Discover equipment',x=>x.lootFound>0],['skilled','Wise Artisan','Unlock a skill',x=>Object.values(x.skills).some(v=>v>0)],['master','Forged Again','Ascend once',x=>x.ascensions>0],['legend','Realm Conqueror','Unlock every region',x=>x.unlocked>=5]];
// Workforce achievements live in the existing permanent honors ledger.
honors.push(
 ['crew25','Established Crew','Own 25 of one worker type in a single run',x=>workers.some(w=>(x.gens[w[0]]||0)>=25)],
 ['workforce100','Century of Hands','Own 100 workers across all types in one run',x=>workers.reduce((n,w)=>n+(x.gens[w[0]]||0),0)>=100],
 ['veterancrew','Master of the Guild','Own 100 of one worker type in a single run',x=>workers.some(w=>(x.gens[w[0]]||0)>=100)],
 ['allworkers','Full Muster','Own at least one of every worker type in one run',x=>workers.every(w=>(x.gens[w[0]]||0)>0)]
);
const encounterBook=()=>realms.flatMap((r,z)=>[
 ...MONSTER_LADDERS[z].map((m,i)=>({id:'mob-'+z+'-'+(i+1),realm:z,stage:i+1,name:m[0],icon:m[1],boss:false,desc:'Stage '+(i+1)+' · '+currentTrait(i+1).name+' encounter. Ashen Wilds can drop stage-appropriate gear.'})),
 {id:r[5],realm:z,stage:10,name:r[4],icon:r[5],boss:true,desc:'Stage 10 Guardian. Low chance to drop any Ashen Wilds equipment; other realms have no drops yet.'}
]);
const fresh=()=>({version:11,potions:{minor:0},location:'kingdom',kingdomVistaMax:0,kingdomVistaMilestone:0,pendingRelics:[],stageUnlocked:[1,0,0,0,0,0],bossCleared:[false,false,false,false,false,false],firstClears:[0,0,0,0,0,0],autoMode:'off',smartResting:false,upgradeView:'unlocked',showOwned:false,ember:0,lifetime:0,runEarned:0,clicks:0,gens:Object.fromEntries(workers.map(w=>[w[0],0])),ups:{},build:Object.fromEntries(buildings.map(b=>[b[0],0])),skills:{},skillPoints:0,level:1,souls:0,ascensions:0,zone:0,unlocked:0,stage:1,enemyHP:0,kills:0,bosses:0,lootFound:0,items:[],equipped:Object.fromEntries(EQUIPMENT_SLOT_KEYS.map(k=>[k,null])),avatarBody:'male',avatarName:'',auto:false,salvage:'off',autoProgress:0,claimed:[],ach:[],bounty:0,bountyStart:0,updated:Date.now(),journal:[],codex:{},lastBossLoot:null,combatLevel:1,combatXP:0,hp:null,training:{vitality:0,guard:0,blade:0,regen:0},enemyTimer:0,enemyHits:0,manualAt:0,engagedUntil:0,downUntil:0,potionReady:0,combatMessage:"Ready for battle"});

