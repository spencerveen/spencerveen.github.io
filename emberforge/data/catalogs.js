'use strict';
const root=document.getElementById('ef4');
if(!root)throw new Error('Emberforge game root #ef4 was not found');
root.dataset.ready='1';
const $=id=>root.querySelector('#ef4-'+id), $$=s=>root.querySelectorAll(s);
const workers=[
['spark','Spark Sprites','sprite',15,.18,'Tiny gatherers of cinders'],
['miner','Ember Miners','miner',85,1.2,'Dig glowing veins beneath the realm'],
['smith','Runic Smiths','smith',440,7,'Hammer warmth into magic'],
['acolyte','Flame Acolytes','broker',2400,40,'Channel the forge with rituals'],
['golem','Magma Golems','golem',12500,220,'Never-tiring stone guardians'],
['alchemist','Ash Alchemists','alchemist',65000,1250,'Distill the essence of fire'],
['dragon','Ashen Dragons','dragon',350000,7100,'Their breath turns rock to gold'],
['automaton','Clockwork Titans','engine',2e6,42000,'Automate entire foundries'],
['portal','Infernal Portals','portalworker',12e6,250000,'Siphon energy from distant worlds'],
['oracle','Star Oracles','foundry',75e6,1550000,'Pull power from future timelines'],
['sun','Star Foundries','foundry',475e6,9600000,'Harness the fire of suns'],
['cosmic','Reality Shapers','engine',3e9,60000000,'Rewrite the laws of creation']];
const upgrades=[
['glove','Reinforced Gloves','tap',60,'clickAdd',1,'+1 per click'],
['pick','Enchanted Pickaxe','pickaxe',300,'clickAdd',3,'+3 per click'],
['shift','Night Shift','soulfire',1100,'prodMult',2,'Improves all worker production'],
['hammer','Arcane Hammer','sword',2100,'clickAdd',12,'+12 per click'],
['rune','Golden Rune','gem',6500,'clickMult',2,'Improves click power'],
['bellows','Dragon Bellows','flame',16000,'prodMult',2,'Improves all worker production'],
['crit','Volcanic Touch','crystal',35000,'clickAdd',80,'+80 per click'],
['warbanner','War Banner','badge',70000,'attackMult',2,'Improves attack damage'],
['titan','Titan Grip','swordglow',180000,'clickAdd',650,'+650 per click'],
['engine','Eternal Engine','gear',400000,'prodMult',3,'Greatly improves worker production'],
['crown','Ember Crown','medal',950000,'clickMult',3,'Greatly improves click power'],
['bloodstone','Bloodstone Blade','swordglow',2200000,'attackMult',3,'Greatly improves attack damage'],
['starweave','Starweave Gears','engine',5500000,'prodMult',3,'Strong production enchantment'],
['echoes','Echoing Hands','tap',12000000,'clickMult',3,'Strong clicking enchantment'],
['dragonheart','Dragonheart','dragon',30000000,'attackMult',4,'Powerful attack enchantment'],
['transcend','Transcendent Forge','altar',80000000,'prodMult',4,'Mythic production enchantment'],
['voidhammer','Voidbreaker','swordglow',250000000,'clickAdd',180000,'+180K per click'],
['worldbreaker','Worldbreaker','altar',800000000,'attackMult',5,'Ultimate attack enchantment']];
const buildings=[
['mine','Crystal Mines','mine',140,.07,'+7% worker income per level'],
['barracks','Knight Barracks','barracks',450,.08,'+8% battle damage per level'],
['library','Arcane Libraries','library',1400,.07,'+7% click income per level'],
['roost','Dragon Roosts','roost',9000,.06,'+6% battle rewards per level'],
['watchtower','Watchtowers','watchtower',50000,.045,'Auto-Strike faster by 4.5% per level'],
['vault','Royal Vaults','vault',300000,.05,'+5% salvage value per level']];
const skills=[
['harvest','Ember Mastery','flame','+12% click income per level'],
['industry','Clockwork Insight','gear','+12% worker income per level'],
['blade','Swordcraft','swords','+14% attack damage per level'],
['fortune','Fortune Seeker','chest','+8% battle rewards per level'],
['aura','Soul Resonance','soulfire','+3% all income and damage per level'],
['veteran','Field Commander','badge','+8% auto-attack damage per level']];
const realms=[
['Ashen Wilds','crystal','Ash Imp','ashimp','Cinder Warden','cinderwarden',20,8],
['Whispering Forest','map','Thorn Stalker','thornstalker','Ancient Ent','ancientent',250,95],
['Frostspire Peaks','library','Ice Revenant','icerevenant','Frost Tyrant','frosttyrant',3100,1150],
['Obsidian Wastes','watchtower','Void Knight','voidknight','Obsidian Dragon','obsidiandragon',39000,15000],
['Celestial Rift','altar','Star Wraith','starwraith','The Fallen Sun','fallensun',510000,210000],
['Eternal Citadel','castle','Eternal Guardian','eternalguardian','The Ash King','ashking',6800000,2600000]];


// Nine independently repeatable monster encounters per realm. The original illustrated bosses remain at stage 10.
const MONSTER_LADDERS=[
[['Cinder Mite','🪲'],['Soot Rat','🐀'],['Ash Imp','👺'],['Charred Skeleton','💀'],['Ember Hound','🐺'],['Lava Scarab','🪲'],['Ashblade Marauder','🗡️'],['Magma Brute','🗿'],['Furnace Revenant','👹']],
[['Moss Slug','🐌'],['Briar Spider','🕷️'],['Root Sprite','🌱'],['Thornfang Wolf','🐺'],['Barkhide Boar','🐗'],['Spore Shaman','🍄'],['Vine Serpent','🐍'],['Hollow Dryad','🧝'],['Wildwood Stalker','🦌']],
[['Snow Crawler','🦀'],['Ice Bat','🦇'],['Frost Ghoul','💀'],['Rime Wolf','🐺'],['Shard Golem','🧊'],['Winter Witch','🧙'],['Glacial Knight','🛡️'],['Snowbound Wraith','👻'],['Blizzard Champion','🥶']],
[['Ember Scorpion','🦂'],['Glass Fang','🐍'],['Obsidian Bat','🦇'],['Ash Revenant','💀'],['Void Cultist','🧙'],['Basalt Sentinel','🗿'],['Shadowblade','🗡️'],['Lava Basilisk','🦎'],['Dread Knight','🛡️']],
[['Falling Spark','✨'],['Nebula Wisp','🌠'],['Stellar Manta','🦋'],['Eclipse Seer','🔮'],['Void Harbinger','👁️'],['Constellation Drake','🐉'],['Time Ripper','⏳'],['Astral Knight','⚔️'],['Starborn Seraph','🪽']],
[['Living Armor','🛡️'],['Gilded Watcher','👁️'],['Royal Executioner','🪓'],['Broken Paladin','⚔️'],['Eternity Mage','🧙'],['Crown Sentinel','👑'],['Celestial Reaper','💀'],['Ash Monarch','🗿'],['Thronebreaker','🗡️']]
];
