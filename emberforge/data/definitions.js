'use strict';
const MOB_TRAITS=[{name:'Standard',hp:1,atk:1,speed:1},{name:'Swift',hp:.92,atk:.9,speed:.82},{name:'Standard',hp:1,atk:1,speed:1},{name:'Armored',hp:1.33,atk:.95,speed:1.06},{name:'Fierce',hp:1,atk:1.2,speed:.94},{name:'Standard',hp:1,atk:1,speed:1},{name:'Swift',hp:1,atk:1.11,speed:.85},{name:'Armored',hp:1.4,atk:1,speed:1.08},{name:'Elite',hp:1.28,atk:1.3,speed:.9}];
// Entry: name, equipment slot, placeholder symbol, base rating. Higher stages use stronger pools.
const LOOT_REGIONS=[
{early:[['Rusty Dagger','weapon','🗡️',3],['Chipped Short Sword','weapon','⚔️',4],['Frayed Cloth Vest','armor','🥋',2],['Cracked Copper Ring','charm','💍',2]],mid:[['Iron Dagger','weapon','🗡️',6],['Worn Soldier Sword','weapon','⚔️',8],['Scorched Leather Armor','armor','🛡️',6],['Ember Bead','charm','📿',5]],late:[['Forged Steel Longsword','weapon','⚔️',13],['Ashguard Breastplate','armor','🛡️',11],['Burnished War Axe','weapon','🪓',16],['Cinderstone Charm','charm','💎',10]],epic:[['Flameforged Saber','weapon','🔥',21],['Wardenscale Armor','armor','🛡️',19],['Heart of Cinders','charm','🔮',17]],legendary:[]},
{early:[['Briar Knife','weapon','🗡️',5],['Oakwood Staff','weapon','🪄',6],['Mossweave Vest','armor','🥋',4],['Acorn Talisman','charm','🌰',4]],mid:[['Thornblade','weapon','🗡️',10],['Ranger Longbow','weapon','🏹',12],['Barkhide Armor','armor','🛡️',9],['Amberroot Pendant','charm','📿',9]],late:[['Wildwood Greatsword','weapon','⚔️',18],['Ancient Bark Plate','armor','🛡️',17],['Vinefang Spear','weapon','🔱',20],['Heartwood Charm','charm','🌿',16]],epic:[['Entbreaker','weapon','🪓',28],['Livingwood Mantle','armor','🌲',26],['Seed of Renewal','charm','🌱',24]],legendary:[]},
{early:[['Frostbitten Dirk','weapon','🗡️',7],['Snowguard Blade','weapon','⚔️',9],['Frozen Hide','armor','🧥',6],['Iceflake Charm','charm','❄️',5]],mid:[['Rimeblade','weapon','🗡️',14],['Glacier Pike','weapon','🔱',17],['Frostbound Mail','armor','🛡️',13],['Winterglass Ring','charm','💍',12]],late:[['Icebreaker Greatsword','weapon','⚔️',24],['Everfrost Plate','armor','🧊',23],['Hailstorm Halberd','weapon','🪓',27],['Frostwyrm Idol','charm','❄️',20]],epic:[['Tyrant’s Shard','weapon','🗡️',37],['Permafrost Aegis','armor','🛡️',34],['Frozen Heart','charm','💠',32]],legendary:[]},
{early:[['Obsidian Shiv','weapon','🗡️',9],['Volcanic Steel Sword','weapon','⚔️',11],['Ashen Chainmail','armor','🥋',8],['Charcoal Medallion','charm','💍',7]],mid:[['Voidsteel Falchion','weapon','⚔️',18],['Molten Maul','weapon','🔨',21],['Blackglass Armor','armor','🛡️',17],['Sigil of Smoke','charm','🔮',14]],late:[['Drakefang Cleaver','weapon','🪓',30],['Obsidian Warlord Plate','armor','🛡️',27],['Volcanic Lance','weapon','🔱',34],['Burning Void Idol','charm','🔥',26]],epic:[['Dragonfire Reaver','weapon','⚔️',48],['Obsidian Scale Aegis','armor','🛡️',46],['Soul of the Volcano','charm','🔮',40]],legendary:[['Worldscar','weapon','⚔️',85,'bossDamage',.24],['Dragonheart Bulwark','armor','🛡️',79,'health',.26],['Eternal Ember','charm','🔥',75,'regen',.32]]},
{early:[['Stardust Knife','weapon','🗡️',12],['Astral Cutter','weapon','⚔️',15],['Cometweave Vest','armor','🥋',11],['Meteorite Talisman','charm','⭐',10]],mid:[['Nebula Glaive','weapon','🔱',25],['Eventide Sword','weapon','⚔️',28],['Eclipse Mail','armor','🛡️',24],['Lunar Prism','charm','🔮',21]],late:[['Cosmic Riftblade','weapon','⚔️',43],['Stellar Bulwark','armor','🛡️',39],['Starbreaker','weapon','🔨',46],['Oracle’s Eye','charm','👁️',35]],epic:[['Sunfall Edge','weapon','🌠',67],['Armor of the Eclipse','armor','🛡️',61],['Solar Nexus','charm','☀️',56]],legendary:[['Sunsunder','weapon','☀️',125,'bossDamage',.36],['Heavenfall Plate','armor','🛡️',113,'health',.37],['Astral Eternity','charm','🌌',106,'regen',.43]]},
{early:[['Royal Steel Knife','weapon','🗡️',17],['Citadel Bastard Sword','weapon','⚔️',19],['Sentinel Hauberk','armor','🛡️',15],['Golden Sigil','charm','💍',14]],mid:[['Throneguard Glaive','weapon','🔱',34],['Crownfire Claymore','weapon','⚔️',38],['Imperial Plate','armor','🛡️',32],['King’s Ward','charm','👑',28]],late:[['Kingslayer','weapon','🗡️',60],['Eternal Guardian Mail','armor','🛡️',55],['Dawnbringer','weapon','⚔️',67],['Eternity Charm','charm','🌟',52]],epic:[['Sword of the Lost Throne','weapon','⚔️',100],['Immortal Aegis','armor','🛡️',91],['Crown of Ages','charm','👑',82]],legendary:[['Ash King’s Ruin','weapon','⚔️',195,'bossDamage',.48],['Armor of Eternity','armor','🛡️',181,'health',.5],['Heart of Creation','charm','🌟',169,'regen',.55]]}
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
const LEGACY_EQUIPMENT_SLOTS={weapon:'mainHand',armor:'chest',charm:'charm'};
const equipmentSlotFor=item=>LEGACY_EQUIPMENT_SLOTS[item?.slot]||item?.slot;
const equipmentPowerType=slot=>slot==='mainHand'?'attack':slot==='chest'?'armor':slot==='charm'?'recovery':'bonus';
// Shared protection rules keep combat drops, merchant sales and bulk salvage consistent.
const equippedGearIds=()=>new Set(Object.values(s.equipped));
const isGearEquipped=(item,ids=equippedGearIds())=>ids.has(item.id);
const isGearTradeProtected=(item,ids=equippedGearIds())=>!!item.locked||isGearEquipped(item,ids);

const lootAbilityText=g=>!g.ability?'':({bossDamage:'Boss damage',health:'Max health',regen:'HP recovery'}[g.ability]+' +'+Math.round((g.abilityValue||0)*100)+'%');
const lootVisual=(id,size='lg')=>ICON_DATA[id]?iconHTML(id,size):`<span class="lootemoji ${size}" role="img" aria-label="Item">${esc(id||'🗡️')}</span>`;
const bossClearedAt=i=>!!s.bossCleared?.[i]||i<s.unlocked;
const maxSelectable=i=>Math.min(10,Math.max(1,s.stageUnlocked?.[i]|| (i<s.unlocked?10:1)));
const currentTrait=stage=>MOB_TRAITS[Math.max(0,Math.min(8,stage-1))];
const REALM_LEVELS=[1,10,23,40,60,84];
const REALM_ASCENSIONS=[0,0,1,2,3,5];
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
 ['mine',0,1],['barracks',0,1],['library',0,4],['roost',1,12],['watchtower',2,23],['vault',3,38]
];
const upgradeReq = u => {let g=GATE_UPGRADES.find(x=>x[0]===u[0]);return g||[u[0],0,1,1]};
const upgradeUnlocked = u => {let g=upgradeReq(u);return s.ascensions>=g[1]&&s.level>=g[2]&&s.combatLevel>=g[3]};
const workerReq=w=>GATE_WORKERS.find(x=>x[0]===w[0])||[w[0],0,1];
const workerUnlocked=w=>{let g=workerReq(w);return s.ascensions>=g[1]&&s.level>=g[2]};
const buildingReq=b=>GATE_BUILDINGS.find(x=>x[0]===b[0])||[b[0],0,1];
const buildingUnlocked=b=>{let g=buildingReq(b);return s.ascensions>=g[1]&&s.combatLevel>=g[2]};
const buildingCap=()=>Math.min(12,3+2*s.ascensions);
const activeBuild=id=>Math.min(s.build[id]||0,buildingCap());
const trainingCap=()=>Math.min(30,4+3*s.ascensions);
const skillCap=()=>Math.min(5,1+s.ascensions);
const activeSkill=id=>Math.min(s.skills[id]||0,skillCap());
const activeTraining=id=>Math.min(s.training[id]||0,trainingCap());
const ascendTarget=()=>Math.ceil(100000*Math.pow(2.3,s.ascensions));
const soulReward=()=>Math.min(5,Math.floor(Math.sqrt(s.runEarned/ascendTarget())));
const realmAccessible=i=>i<=s.unlocked&&s.combatLevel>=REALM_LEVELS[i]&&s.ascensions>=REALM_ASCENSIONS[i];
// Kingdom is a safe world-map destination, not a combat realm.
const atKingdom=()=>s.location==='kingdom';
const inExpedition=()=>s.location==='realm';
const reqText=(a,f,c)=>[a?'Asc '+a:'',f?'Forge '+f:'',c?'Combat '+c:''].filter(Boolean).join(' · ');
const requirementFor=u=>{let g=upgradeReq(u);return reqText(g[1],g[2],g[3])};
const TRAINING=[
['vitality','Vitality','soulfire','+17% maximum health per level',70],
['guard','Defense','guardian','Reduces incoming attack damage',95],
['blade','Technique','swords','+22% direct attack damage per level',110],
['regen','Recovery','gem','Faster health regeneration',90]
];
const XP_GAIN = (zone,stage,boss)=>Math.ceil(15*(stage+1)*Math.pow(5.4,zone)*(boss?5:1));
const nextCombatXP=level=>Math.ceil(55*Math.pow(1.125,Math.max(0,level-1)));
const bases=[['Rusty Blade','weapon','sword',3],['Runic Sword','weapon','swords',6],['Dragonfang','weapon','dragon',10],['Ember Plate','armor','guardian',2],['Frostplate','armor','barracks',5],['Celestial Mail','armor','castle',9],['Spark Ring','charm','gem',2],['Void Sigil','charm','soulfire',5],['Sunstone Band','charm','medal',9]];
const rarities=['common','rare','epic','legendary'], rarityScale=[1,2.2,4.8,12];
const honors=[['first','First Spark','Harvest Ember',x=>x.clicks>0],['work','First Hire','Own one worker',x=>Object.values(x.gens).some(v=>v>0)],['coin','Warm Hands','Earn 1K lifetime Ember',x=>x.lifetime>=1000],['rich','Ember Magnate','Earn 1M lifetime Ember',x=>x.lifetime>=1e6],['battle','First Blood','Defeat an enemy',x=>x.kills>0],['boss','Crown Breaker','Defeat a boss',x=>x.bosses>0],['builder','Foundations','Construct a building',x=>Object.values(x.build).some(v=>v>0)],['explorer','Wayfarer','Unlock a second region',x=>x.unlocked>=1],['loot','Lucky Find','Discover rare loot',x=>x.lootFound>0],['skilled','Wise Artisan','Unlock a skill',x=>Object.values(x.skills).some(v=>v>0)],['master','Forged Again','Ascend once',x=>x.ascensions>0],['legend','Realm Conqueror','Unlock every region',x=>x.unlocked>=5]];
// Workforce achievements live in the existing permanent honors ledger.
honors.push(
 ['crew25','Established Crew','Own 25 of one worker type in a single run',x=>workers.some(w=>(x.gens[w[0]]||0)>=25)],
 ['workforce100','Century of Hands','Own 100 workers across all types in one run',x=>workers.reduce((n,w)=>n+(x.gens[w[0]]||0),0)>=100],
 ['veterancrew','Master of the Guild','Own 100 of one worker type in a single run',x=>workers.some(w=>(x.gens[w[0]]||0)>=100)],
 ['allworkers','Full Muster','Own at least one of every worker type in one run',x=>workers.every(w=>(x.gens[w[0]]||0)>0)]
);
const encounterBook=()=>realms.flatMap((r,z)=>[
 ...MONSTER_LADDERS[z].map((m,i)=>({id:'mob-'+z+'-'+(i+1),realm:z,stage:i+1,name:m[0],icon:m[1],boss:false,desc:'Stage '+(i+1)+' · '+currentTrait(i+1).name+' encounter. Farm for '+(i<=2?'starter':i<=5?'intermediate':'advanced')+' equipment.'})),
 {id:r[5],realm:z,stage:10,name:r[4],icon:r[5],boss:true,desc:'Stage 10 Guardian. Guaranteed Rare+ chest, epic chance; Legendary exclusive to later realms.'}
]);
const fresh=()=>({version:8,location:'kingdom',kingdomVistaMax:0,pendingRelics:[],stageUnlocked:[1,0,0,0,0,0],bossCleared:[false,false,false,false,false,false],firstClears:[0,0,0,0,0,0],autoMode:'off',smartResting:false,upgradeView:'unlocked',showOwned:false,ember:0,lifetime:0,runEarned:0,clicks:0,gens:Object.fromEntries(workers.map(w=>[w[0],0])),ups:{},build:Object.fromEntries(buildings.map(b=>[b[0],0])),skills:{},skillPoints:0,level:1,souls:0,ascensions:0,zone:0,unlocked:0,stage:1,enemyHP:0,kills:0,bosses:0,lootFound:0,items:[],equipped:Object.fromEntries(EQUIPMENT_SLOT_KEYS.map(k=>[k,null])),avatarBody:'male',avatarName:'',auto:false,salvage:'common',autoProgress:0,claimed:[],ach:[],bounty:0,bountyStart:0,updated:Date.now(),journal:[],codex:{},lastBossLoot:null,combatLevel:1,combatXP:0,hp:null,training:{vitality:0,guard:0,blade:0,regen:0},enemyTimer:0,enemyHits:0,manualAt:0,engagedUntil:0,downUntil:0,potionReady:0,combatMessage:"Ready for battle"});

