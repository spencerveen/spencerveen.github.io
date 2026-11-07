'use strict';
function note(t){s.journal.unshift(t);s.journal=s.journal.slice(0,8)}
function toast(t){let el=$('toast');el.textContent=t;el.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.style.display='none',2100)}
function showBossLoot(item){if(!item)return;let scene=$('battlescene');if(!scene)return;scene.querySelectorAll('.chestflash').forEach(n=>n.remove());let box=document.createElement('div');box.className='chestflash';box.innerHTML='<div style="font-size:10px;letter-spacing:1px;opacity:.9">BOSS EQUIPMENT DROP</div><div style="margin-top:4px"><strong class="rarity-'+item.rarity+'">'+item.rarity.toUpperCase()+'</strong> · '+esc(item.name)+'</div><div style="margin-top:2px;color:#ffe1b9">+'+fmt(item.power)+' '+equipmentPowerType(equipmentSlotFor(item))+'</div>';scene.appendChild(box);setTimeout(()=>box.remove(),4200)}
const soulfactor=()=>1+.24*Math.sqrt(s.souls);
const skillfactor=()=>1+.03*activeSkill('aura');
const totalWorkers=()=>workers.reduce((v,w)=>v+(s.gens[w[0]]||0),0);
const multiplier=type=>1+upgrades.reduce((v,u)=>v+(u[4]===type&&s.ups[u[0]]&&upgradeUnlocked(u)?Math.max(0,u[5]-1)*.68:0),0);
const clicks=()=> (1+upgrades.reduce((v,u)=>v+(u[4]==='clickAdd'&&s.ups[u[0]]&&upgradeUnlocked(u)?u[5]:0),0))*multiplier('clickMult')*(1+.07*activeBuild('library'))*(1+.12*activeSkill('harvest'))*soulfactor()*skillfactor();
// Workforce milestones apply only to the current run; they reset with workers on Ascension.
const WORKER_MILESTONES=[[10,.05],[25,.10],[50,.15],[100,.20]];
const workerMilestoneBonus=count=>WORKER_MILESTONES.reduce((sum,m)=>sum+(count>=m[0]?m[1]:0),0);
const workerSharedFactor=()=>multiplier('prodMult')*(1+.07*activeBuild('mine'))*(1+.12*activeSkill('industry'))*soulfactor()*skillfactor();
const workerBaseOutput=(w,count=s.gens[w[0]]||0)=>count*w[4]*(1+workerMilestoneBonus(count));
const workerProduction=w=>workerUnlocked(w)?workerBaseOutput(w)*workerSharedFactor():0;
const workerMarginalProduction=(w,count=1)=>{let owned=s.gens[w[0]]||0;return (workerBaseOutput(w,owned+count)-workerBaseOutput(w,owned))*workerSharedFactor();};
const income=()=>workers.reduce((v,w)=>v+workerProduction(w),0);
const equippedItem=slot=>s.items.find(g=>g.id===s.equipped[LEGACY_EQUIPMENT_SLOTS[slot]||slot]);
const gearPower=slot=>equippedItem(slot)?.power||0;
const gearTotal=slots=>slots.reduce((sum,slot)=>sum+gearPower(slot),0);
const gearAbility=type=>EQUIPMENT_SLOT_KEYS.reduce((n,slot)=>{let g=equippedItem(slot);return n+(g&&g.ability===type?(g.abilityValue||0):0)},0);
const maxHealth=()=>Math.ceil(Math.min(1e15,105*Math.pow(1.10,Math.max(0,s.combatLevel-1))*(1+.06*activeTraining('vitality'))*(1+gearAbility('health'))));
const defense=()=>1+gearTotal(['helmet','chest','gloves','legs','boots','offHand'])*1.65+gearAbility('protection');
const recovery=(fighting)=>fighting?0:maxHealth()*(.005+gearAbility('regen'));
const realRecovery=(fighting)=>recovery(fighting);
const potionCount=(id='minor')=>Math.max(0,Math.floor(s.potions?.[id]||0));
const isDown=()=>Date.now()<s.downUntil||s.hp<=0;
const activeFight=()=>inExpedition()&&!isDown()&&((s.auto&&!s.smartResting)||Date.now()<s.engagedUntil);
const foeAttackInterval=()=>foeAttackIntervalFor(enemy());
const foeRawDamage=()=>foeRawDamageFor(enemy());
const trainCost=t=>{let lv=s.training[t[0]]||0;return Math.ceil(t[4]*Math.pow(2.2,lv)*(1+.1*s.zone))};
function earnCombatXP(amount){amount=Math.ceil(amount*(1+.05*activeTraining('guard')+.06*activeSkill('blade')+.04*activeBuild('barracks')));s.combatXP+=amount;let gained=0;while(s.combatXP>=nextCombatXP(s.combatLevel)&&s.combatLevel<140){s.combatXP-=nextCombatXP(s.combatLevel);s.combatLevel++;gained++}if(gained){let oldHP=s.hp;s.hp=Math.min(maxHealth(),oldHP+maxHealth()*.2);s.combatMessage='Combat level '+s.combatLevel+'! Maximum health increased.';note('Combat level '+s.combatLevel+' reached');toast('Combat level '+s.combatLevel+'!');needsMain=true}}

const power=()=>Math.max(1,1.85+gearPower('mainHand')+gearAbility('attack'));
const autoInterval=()=>Math.max(.55,1.15/(1+.025*activeBuild('watchtower')));
const autoPower=()=>power();
// Combat accuracy, evasion, critical hits and shields are shared by manual and auto combat.
// All chances use [0, 1], with a minimum chance to hit to avoid endless fights.
const combatClamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const playerHitChance=e=>{
 const weapon=equippedItem('mainHand');
 // An unarmed novice misses most swings. Levels, weapon skill and future equipment matter.
 const skill=0; // Accuracy comes from equipment, not character levels.
 const weaponBonus=weapon?.slot==='mainHand'?.10+Math.min(.10,(weapon.power||0)*.005):0;
 return combatClamp(.30+skill+weaponBonus-.007*(e.stage-1)-.03*e.zone-(e.trait==='Swift'?.06:0)-(e.boss?.05:0),.20,.95);
};
const enemyHitChance=e=>combatClamp(.95+.004*(e.stage-1)+.005*e.zone-(e.trait==='Swift'?.03:0)-gearPower('boots')*.015,.55,.97);
const playerCritChance=()=>combatClamp(.05+gearPower('mainHand')*.005,.05,.12);
const enemyCritChance=e=>e.boss?.07:.04;
const blockChance=()=>equippedItem('offHand')?.slot==='offHand'?(gearPower('offHand')>=5?.22:.13):0;
const blockReduction=()=>equippedItem('offHand')?.slot==='offHand'?(gearPower('offHand')>=5?.50:.35):0;
const criticalMultiplier=1.6;
function playerAttack(auto=false){
 if(!inExpedition()||isDown())return {kind:'invalid',damage:0};
 const e=enemy();
 if(Math.random()>=playerHitChance(e)){
   s.combatMessage='Miss! '+e.name+' evaded your '+(auto?'automatic attack.':'strike.');
   spawnPop($('battlescene'),'MISS','battle');
   return {kind:'miss',damage:0};
 }
 const critical=Math.random()<playerCritChance();
 const value=(auto?autoPower():power())*(critical?criticalMultiplier:1);
 s.combatMessage=critical?'CRITICAL HIT! '+fmt(value)+' damage to '+e.name+'.':'You strike '+e.name+' for '+fmt(value)+' damage.';
 damage(value);
 spawnPop($('battlescene'),critical?'CRIT -'+fmt(value):'-'+fmt(value),'battle');
 return {kind:critical?'critical':'hit',damage:value};
}
const enemyAt=(zone,stage)=>{let r=realms[zone],boss=stage===10,trait=currentTrait(stage),mob=boss?null:MONSTER_LADDERS[zone][stage-1];let hp=Math.ceil(r[6]*Math.pow(1.24,stage-1)*(boss?1.8:trait.hp)*(1+.12*Math.max(0,s.ascensions-REALM_ASCENSIONS[zone])));let reward=Math.ceil(r[7]*Math.pow(1.28,stage-1)*(boss?5.2:1)*(1+.06*activeBuild('roost'))*(1+.08*activeSkill('fortune')));return {name:boss?r[4]:mob[0],icon:boss?r[5]:mob[1],boss,trait:boss?'Boss':trait.name,traitData:trait,zone,stage,hp,reward,xp:XP_GAIN(zone,stage,boss)};};
const enemy=()=>enemyAt(s.zone,s.stage);
const foeAttackIntervalFor=e=>e.boss?2.1:2.1*e.traitData.speed;
const foeRawDamageFor=e=>Math.ceil((4+e.stage*1.65)*Math.pow(4.95,e.zone)*(e.boss?1.4:e.traitData.atk));
const expectedFoeHit=e=>{let raw=foeRawDamageFor(e);return Math.max(1,Math.ceil(raw*(1-defense()/(defense()+105+raw*.6))));};
const predictedFight=e=>{let actualPower=autoPower();let dps=actualPower*playerHitChance(e)*(1+playerCritChance()*(criticalMultiplier-1))/Math.max(.38,autoInterval());let seconds=e.hp/Math.max(1,dps);let hits=Math.max(0,Math.ceil(seconds/foeAttackIntervalFor(e)));let loss=hits*expectedFoeHit(e)*enemyHitChance(e)*(1+enemyCritChance(e)*(criticalMultiplier-1))*(1-blockChance()*blockReduction())*(e.boss?1.18:1)-realRecovery(true)*seconds;return {seconds,loss:Math.max(0,loss),hits};};
function canAutoFarm(stage){if(stage>maxSelectable(s.zone))return false;if(stage===10&&!bossClearedAt(s.zone))return false;let e=enemyAt(s.zone,stage),v=predictedFight(e);return v.seconds<=(e.boss?46:30)&&v.loss<Math.max(20,Math.min(maxHealth()*.74,s.hp*.79));}
function bestFarmStage(){for(let stage=maxSelectable(s.zone);stage>=1;stage--)if(canAutoFarm(stage))return stage;return 0;}
function setTarget(stage,{keepAuto=true,quiet=false}={}){if(!inExpedition())return false;stage=Math.floor(stage);if(stage<1||stage>maxSelectable(s.zone))return false;if(!keepAuto){s.autoMode='off';s.auto=false;}s.stage=stage;rollBattleBackground();s.enemyHP=enemy().hp;s.enemyTimer=0;s.enemyHits=0;s.autoProgress=0;s.engagedUntil=0;s.smartResting=false;s.combatMessage='Target selected: '+enemy().name+'. '+(stage===10?'Boss encounter. Prepare before attacking.':'Repeat this stage to farm XP and equipment.');if(!quiet){toast('Hunting '+enemy().name);renderPage()}return true;}
function chooseSmartTarget(){if(s.autoMode!=='smart')return;let best=bestFarmStage();if(!best){s.smartResting=true;s.engagedUntil=0;s.autoProgress=0;s.combatMessage='Smart Hunt: resting until strong enough to survive.';return;}if(best!==s.stage)setTarget(best,{quiet:true});s.smartResting=false;}
function gain(n){if(!Number.isFinite(n)||n<=0)return;s.ember+=n;s.lifetime+=n;s.runEarned+=n;let lv=1+Math.floor(Math.log10(s.lifetime/100+1)*4);if(lv>s.level){let earned=Math.floor((lv-1)/4)-Math.floor((s.level-1)/4);s.level=lv;if(earned>0){s.skillPoints+=earned;toast('Level up! +'+earned+' skill points')}}}
const rarityValue={common:0,rare:1,epic:2,legendary:3};
const sellValue=g=>Math.max(6,Math.round(g.power*(5+activeBuild('vault')*.25)));
function createLoot(boss){
 if(s.zone!==0)return null; // No drops outside Ashen Wilds during rebuild.
 const dropRate=boss?.055:s.stage<=3?.012:s.stage<=6?.016:.020;
 if(Math.random()>=dropRate)return null;
 const eligible=ASHEN_LOOT.filter(item=>boss||s.stage>=item.min);
 const total=eligible.reduce((sum,item)=>sum+item.weight,0);
 let roll=Math.random()*total;
 const base=eligible.find(item=>(roll-=item.weight)<0)||eligible[eligible.length-1];
 const obj={id:'g'+Date.now().toString(36)+Math.floor(Math.random()*1e8).toString(36),name:base.name,slot:base.slot,icon:base.icon,rarity:'common',origin:0,tier:s.stage,locked:false,power:base.power,ability:base.ability||null,abilityValue:base.abilityValue||0};
 s.lootFound++;
 if(s.items.length>=inventoryCapacity()){
   note('Backpack full: '+obj.name+' could not be collected.');
   return {lost:true,name:obj.name,rarity:'common'};
 }
 s.items.unshift(obj);
 if(boss){s.lastBossLoot={name:obj.name,rarity:'common',power:obj.power,time:Date.now()};showBossLoot(obj);note('Boss dropped '+obj.name);}
 else note('Equipment found: '+obj.name);
 needsMain=true;return obj;
}
function rollPotionDrop(boss){
 if(s.zone!==0)return null;
 const potion=potionDefinition('minor');
 if(!potion||Math.random()>=(boss?potion.bossDropChance:potion.dropChance))return null;
 if(!s.potions||typeof s.potions!=='object')s.potions={minor:0};
 s.potions[potion.id]=Math.min(9999,potionCount(potion.id)+1);
 note('Found '+potion.name+' ('+potionCount(potion.id)+' stored)');
 toast('Potion drop: '+potion.name+'!');
 needsMain=true;
 return potion;
}
function honorCheck(){for(let a of honors)if(!s.ach.includes(a[0])&&a[3](s)){s.ach.push(a[0]);note(a[1]+' achieved')}}
function defeat(){
 let e=enemy(),firstClear=s.stage>s.firstClears[s.zone];s.kills++;let key=e.boss?e.icon:'mob-'+s.zone+'-'+s.stage;s.codex[key]=(s.codex[key]||0)+1;
 gain(e.reward*(firstClear?1.45:1)*(1+.04*activeTraining('blade')+.05*activeSkill('veteran'))*multiplier('battleReward'));earnCombatXP(Math.ceil(e.xp*(firstClear?1.45:.72)));
 s.enemyTimer=0;s.enemyHits=0;
 if(firstClear){s.firstClears[s.zone]=Math.max(s.stage,s.firstClears[s.zone]);if(s.stage<10){s.stageUnlocked[s.zone]=Math.max(s.stageUnlocked[s.zone],s.stage+1);note('New stage unlocked: '+(s.stage+1));}else{s.bossCleared[s.zone]=true;}}
 if(e.boss){s.bosses++;s.bossCleared[s.zone]=true;note('Boss defeated: '+e.name);if(s.zone===s.unlocked&&s.unlocked<5){s.unlocked++;s.stageUnlocked[s.unlocked]=Math.max(1,s.stageUnlocked[s.unlocked]);toast(realms[s.unlocked][0]+' discovered!')}}
 let drop=createLoot(e.boss);if(e.boss&&drop&&!drop.lost)toast('Boss drop: '+drop.name+'!');
 rollPotionDrop(e.boss);
 rollBattleBackground();
 s.enemyHP=e.hp;if(s.autoMode==='off')s.engagedUntil=0;
 s.combatMessage=(firstClear?'First victory! ':'')+e.name+' defeated. +'+fmt(Math.ceil(e.xp*(firstClear?1.45:.72)))+' combat XP.';
 if(s.autoMode==='smart')chooseSmartTarget();
 honorCheck();needsMain=true;
}
function damage(v){if(!inExpedition()||!Number.isFinite(v)||v<=0||isDown())return;if(s.enemyHP>v){s.enemyHP-=v}else{defeat()}}
function spawnPop(parent,text,kind){let p=document.createElement('span');p.className='floatpop';p.textContent=text;p.style.left=(32+Math.random()*36)+'%';p.style.top=(27+Math.random()*25)+'%';if(kind==='battle')p.style.color='#ffc5a0';if(kind==='enemy')p.style.color='#ff667e';parent.appendChild(p);setTimeout(()=>p.remove(),750)}
function mine(){let v=clicks();gain(v);s.clicks++;spawnPop($('crystal').parentNode,'+'+fmt(v),'mine');honorCheck();stats();}
function manualAttack(){if(!inExpedition())return;let now=Date.now();if(isDown()){toast('Defeated — recover before fighting');return}if(now<s.manualAt)return;s.manualAt=now+650;s.engagedUntil=now+5500;s.smartResting=false;let result=playerAttack(false);if(result.kind!=='miss'){let art=$('enemyart');art.classList.remove('shake');void art.offsetWidth;art.classList.add('shake');}stats();if(needsMain){renderPage();needsMain=false}}
function takeHit(){
 if(!inExpedition()||isDown())return;
 const e=enemy(),raw=foeRawDamage();
 s.enemyHits++;
 if(Math.random()>=enemyHitChance(e)){
   s.combatMessage='DODGE! You evaded '+e.name+'\'s attack.';
   spawnPop($('battlescene'),'DODGE','enemy');
   return;
 }
 // The guardian's special swing is still every fourth attempted attack; it cannot bypass evasion.
 const special=e.boss&&s.enemyHits%4===0;
 const critical=!special&&Math.random()<enemyCritChance(e);
 const blocked=Math.random()<blockChance();
 const multiplier=special?1.8:critical?criticalMultiplier:1;
 let actual=Math.max(1,Math.ceil(raw*multiplier*(1-defense()/(defense()+105+raw*.6))*(blocked?1-blockReduction():1)));
 s.hp=Math.max(0,s.hp-actual);
 s.combatMessage=(special?'BOSS SPECIAL! ':critical?'ENEMY CRITICAL! ':'')+(blocked?'BLOCKED! ':'')+e.name+' hits for '+fmt(actual)+' HP.';
 spawnPop($('battlescene'),(blocked?'BLOCK ':'')+'-'+fmt(actual)+' HP','enemy');
 if(s.hp<=0){
   let loss=Math.min(s.ember*.04,e.reward*1.5);s.ember-=loss;s.auto=false;s.autoMode='off';s.smartResting=false;s.engagedUntil=0;s.downUntil=Date.now()+7000;s.enemyHP=e.hp;s.enemyTimer=0;s.enemyHits=0;
   s.combatMessage='You were knocked out. Recover in 7s; enemy HP has reset. '+(loss?'Lost '+fmt(loss)+' Ember.':'');
   note('Knocked out by '+e.name);toast('You were defeated by '+e.name+'!');
 }
}
function retreat(){s.auto=false;s.autoMode='off';s.smartResting=false;s.engagedUntil=0;s.enemyTimer=0;s.enemyHits=0;s.enemyHP=enemy().hp;s.combatMessage='Retreated safely. Enemy health reset; health will regenerate while resting.';toast('Retreated to safety');stats()}
function usePotion(id='minor'){
 const potion=potionDefinition(id),now=Date.now();
 if(!potion||isDown()||now<s.potionReady||s.hp>=maxHealth())return false;
 if(!potionCount(id)){toast('No '+potion.name+' in your supplies');return false}
 const restored=Math.min(maxHealth()-s.hp,maxHealth()*(potion.heal+.02*activeTraining('regen')));
 s.potions[id]--;
 s.hp=Math.min(maxHealth(),s.hp+restored);
 s.potionReady=now+18000;
 s.combatMessage='Used '+potion.name+'. Restored '+fmt(restored)+' HP.';
 toast(potion.name+' used!');
 stats();save();
 return true;
}

const costWorker=(w,n)=>{let owned=s.gens[w[0]]||0;if(n==='max'){let cnt=0,sum=0;while(cnt<10000){let price=Math.ceil(w[3]*1.23**(owned+cnt));if(!isFinite(price)||sum+price>s.ember+1e-8)break;sum+=price;cnt++}return {price:sum,count:cnt}}let q=Number(n),price=0;for(let i=0;i<q;i++)price+=Math.ceil(w[3]*1.23**(owned+i));return {price,count:q}};
const costBuild=b=>Math.ceil(b[3]*2.72**s.build[b[0]]);
const short=u=>fmt(u)+' Ember';
