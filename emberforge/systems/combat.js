'use strict';
function note(t){s.journal.unshift(t);s.journal=s.journal.slice(0,8)}
function toast(t){let el=$('toast');el.textContent=t;el.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.style.display='none',2100)}
function showBossLoot(item){if(!item)return;let scene=$('battlescene');if(!scene)return;scene.querySelectorAll('.chestflash').forEach(n=>n.remove());let box=document.createElement('div');box.className='chestflash';box.innerHTML='<div style="font-size:10px;letter-spacing:1px;opacity:.9">BOSS CHEST OPENED</div><div style="margin-top:4px"><strong class="rarity-'+item.rarity+'">'+item.rarity.toUpperCase()+'</strong> · '+esc(item.name)+'</div><div style="margin-top:2px;color:#ffe1b9">+'+fmt(item.power)+' '+(item.slot==='weapon'?'attack':item.slot==='armor'?'armor':'recovery')+'</div>';scene.appendChild(box);setTimeout(()=>box.remove(),4200)}
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
const gearAbility=type=>EQUIPMENT_SLOT_KEYS.reduce((n,slot)=>{let g=equippedItem(slot);return n+(g&&g.ability===type?(g.abilityValue||0):0)},0);
const maxHealth=()=>Math.ceil(Math.min(1e15,(105*Math.pow(1.14,Math.max(0,s.combatLevel-1))+gearPower('armor')*5)*(1+.17*activeTraining('vitality'))*(1+gearAbility('health'))));
const defense=()=>6+s.combatLevel*1.6+activeTraining('guard')*10+gearPower('armor')*1.65;
const recovery=(fighting)=>maxHealth()*((fighting?.0035:.047)+activeTraining('regen')*.0025)+gearPower('charm')*.22;
const realRecovery=(fighting)=>recovery(fighting)*(1+gearAbility('regen'));
const potionCost=()=>Math.ceil(70*Math.pow(4.2,s.zone)*(1+s.combatLevel*.12));
const isDown=()=>Date.now()<s.downUntil||s.hp<=0;
const activeFight=()=>!isDown()&&((s.auto&&!s.smartResting)||Date.now()<s.engagedUntil);
const foeAttackInterval=()=>foeAttackIntervalFor(enemy());
const foeRawDamage=()=>foeRawDamageFor(enemy());
const trainCost=t=>{let lv=s.training[t[0]]||0;return Math.ceil(t[4]*Math.pow(2.2,lv)*(1+.1*s.zone))};
function earnCombatXP(amount){s.combatXP+=amount;let gained=0;while(s.combatXP>=nextCombatXP(s.combatLevel)&&s.combatLevel<140){s.combatXP-=nextCombatXP(s.combatLevel);s.combatLevel++;gained++}if(gained){let oldHP=s.hp;s.hp=Math.min(maxHealth(),oldHP+maxHealth()*.2);s.combatMessage='Combat level '+s.combatLevel+'! Health and attack increased.';note('Combat level '+s.combatLevel+' reached');toast('Combat level '+s.combatLevel+'!');needsMain=true}}

const power=()=>Math.max(1,((1+Math.sqrt(clicks())*.85)+gearPower('weapon'))*(1+(s.combatLevel-1)*.14)*(1+activeTraining('blade')*.22)*(1+.08*activeBuild('barracks'))*(1+.14*activeSkill('blade'))*multiplier('attackMult')*(enemy().boss?1+gearAbility('bossDamage'):1)*soulfactor()*skillfactor());
const autoInterval=()=>Math.max(.38,1.15/(1+.045*activeBuild('watchtower')));
const autoPower=()=>power()*(1+.08*activeSkill('veteran'));
const enemyAt=(zone,stage)=>{let r=realms[zone],boss=stage===10,trait=currentTrait(stage),mob=boss?null:MONSTER_LADDERS[zone][stage-1];let hp=Math.ceil(r[6]*Math.pow(1.33,stage-1)*(boss?4.35:trait.hp)*(1+.12*Math.max(0,s.ascensions-REALM_ASCENSIONS[zone])));let reward=Math.ceil(r[7]*Math.pow(1.28,stage-1)*(boss?5.2:1)*(1+.06*activeBuild('roost'))*(1+.08*activeSkill('fortune'))*soulfactor());return {name:boss?r[4]:mob[0],icon:boss?r[5]:mob[1],boss,trait:boss?'Boss':trait.name,traitData:trait,zone,stage,hp,reward,xp:XP_GAIN(zone,stage,boss)};};
const enemy=()=>enemyAt(s.zone,s.stage);
const foeAttackIntervalFor=e=>e.boss?1.55:2.1*e.traitData.speed;
const foeRawDamageFor=e=>Math.ceil((8+e.stage*2.45)*Math.pow(4.95,e.zone)*(e.boss?2.25:e.traitData.atk));
const expectedFoeHit=e=>{let raw=foeRawDamageFor(e);return Math.max(1,Math.ceil(raw*(1-defense()/(defense()+105+raw*.6))));};
const predictedFight=e=>{let factor=1+gearAbility('bossDamage');let actualPower=autoPower()*(e.boss?factor:1)/(enemy().boss?factor:1);let dps=actualPower/Math.max(.38,autoInterval());let seconds=e.hp/Math.max(1,dps);let hits=Math.max(0,Math.ceil(seconds/foeAttackIntervalFor(e)));let loss=hits*expectedFoeHit(e)*(e.boss?1.18:1)-realRecovery(true)*seconds;return {seconds,loss:Math.max(0,loss),hits};};
function canAutoFarm(stage){if(stage>maxSelectable(s.zone))return false;if(stage===10&&!bossClearedAt(s.zone))return false;let e=enemyAt(s.zone,stage),v=predictedFight(e);return v.seconds<=(e.boss?46:30)&&v.loss<Math.max(20,Math.min(maxHealth()*.74,s.hp*.79));}
function bestFarmStage(){for(let stage=maxSelectable(s.zone);stage>=1;stage--)if(canAutoFarm(stage))return stage;return 0;}
function setTarget(stage,{keepAuto=true,quiet=false}={}){stage=Math.floor(stage);if(stage<1||stage>maxSelectable(s.zone))return false;if(!keepAuto){s.autoMode='off';s.auto=false;}s.stage=stage;rollBattleBackground();s.enemyHP=enemy().hp;s.enemyTimer=0;s.enemyHits=0;s.autoProgress=0;s.engagedUntil=0;s.smartResting=false;s.combatMessage='Target selected: '+enemy().name+'. '+(stage===10?'Boss encounter. Prepare before attacking.':'Repeat this stage to farm XP and equipment.');if(!quiet){toast('Hunting '+enemy().name);renderPage()}return true;}
function chooseSmartTarget(){if(s.autoMode!=='smart')return;let best=bestFarmStage();if(!best){s.smartResting=true;s.engagedUntil=0;s.autoProgress=0;s.combatMessage='Smart Hunt: resting until strong enough to survive.';return;}if(best!==s.stage)setTarget(best,{quiet:true});s.smartResting=false;}
function gain(n){if(!Number.isFinite(n)||n<=0)return;s.ember+=n;s.lifetime+=n;s.runEarned+=n;let lv=1+Math.floor(Math.log10(s.lifetime/100+1)*4);if(lv>s.level){let earned=Math.floor((lv-1)/4)-Math.floor((s.level-1)/4);s.level=lv;if(earned>0){s.skillPoints+=earned;toast('Level up! +'+earned+' skill points')}}}
const rarityValue={common:0,rare:1,epic:2,legendary:3};
const sellValue=g=>Math.max(6,Math.round(g.power*(5+activeBuild('vault')*.25)));
function createLoot(boss){
 let chance=boss?1:(.07+.011*s.stage+.006*s.zone);
 
 if(Math.random()>chance)return null;
 const table=LOOT_REGIONS[s.zone];let quality=Math.random(),rarity;
 if(boss){let legendaryRate=s.zone<3?0:[0,0,0,.003,.006,.012][s.zone];let epicRate=.055+.018*s.zone;rarity=quality<legendaryRate?'legendary':quality<legendaryRate+epicRate?'epic':'rare';}
 else rarity=quality<(.08+.008*s.zone+.006*Math.floor(s.stage/3))?'rare':'common';
 let group=rarity==='legendary'?table.legendary:rarity==='epic'?table.epic:(boss?table.late:s.stage<=3?table.early:s.stage<=6?table.mid:table.late);
 if(!group.length){rarity='epic';group=table.epic;}
 let base=group[Math.floor(Math.random()*group.length)],rank=rarityValue[rarity],mod=[1,1.8,3.5,8.5][rank];
 let scaling=Math.pow(4.0,s.zone)*(1+.12*Math.max(0,s.stage-1));
 let obj={id:'g'+Date.now().toString(36)+Math.floor(Math.random()*1e8).toString(36),name:base[0],slot:base[1],icon:base[2],rarity,origin:s.zone,tier:s.stage,locked:false,power:Math.ceil(base[3]*mod*scaling*(.91+.18*Math.random())),ability:rarity==='legendary'?base[4]:null,abilityValue:rarity==='legendary'?base[5]:0};
 s.lootFound++;
 if(s.salvage!=='off'&&rarity!=='legendary'&&rank<=rarityValue[s.salvage]){let value=sellValue(obj);gain(value);if(boss)note('Boss chest: '+obj.name+' automatically salvaged for '+fmt(value)+' Ember');return {salvaged:true,rarity,name:obj.name,power:obj.power};}
 if(s.items.length>=inventoryCapacity()){let candidates=s.items.filter(g=>!g.locked&&g.rarity!=='legendary'&&!Object.values(s.equipped).includes(g.id)).sort((a,b)=>rarityValue[a.rarity]-rarityValue[b.rarity]||a.power-b.power);let weakest=candidates[0];
   if(weakest&& (rank>rarityValue[weakest.rarity]||rank===rarityValue[weakest.rarity]&&obj.power>weakest.power)){s.items=s.items.filter(g=>g.id!==weakest.id);gain(sellValue(weakest));}
   else {if(obj.rarity==='legendary'){obj.locked=true;s.pendingRelics.push(obj);s.lastBossLoot={name:obj.name,rarity:obj.rarity,power:obj.power,time:Date.now()};note('Legendary '+obj.name+' saved to Relic Vault.');return {stored:true,rarity,name:obj.name,power:obj.power};}let payout=sellValue(obj);gain(payout);note('Backpack full: '+obj.name+' sold for '+fmt(payout)+' Ember');return {salvaged:true,rarity,name:obj.name,power:obj.power};}
 }
 s.items.unshift(obj);
 if(boss){s.lastBossLoot={name:obj.name,rarity:obj.rarity,power:obj.power,time:Date.now()};showBossLoot(obj);note(rarity.toUpperCase()+' boss chest: '+obj.name);}
 needsMain=true;return obj;
}
function honorCheck(){for(let a of honors)if(!s.ach.includes(a[0])&&a[3](s)){s.ach.push(a[0]);note(a[1]+' achieved')}}
function defeat(){
 let e=enemy(),firstClear=s.stage>s.firstClears[s.zone];s.kills++;let key=e.boss?e.icon:'mob-'+s.zone+'-'+s.stage;s.codex[key]=(s.codex[key]||0)+1;
 gain(e.reward*(firstClear?1.45:1));earnCombatXP(Math.ceil(e.xp*(firstClear?1.45:.72)));
 s.enemyTimer=0;s.enemyHits=0;
 if(firstClear){s.firstClears[s.zone]=Math.max(s.stage,s.firstClears[s.zone]);if(s.stage<10){s.stageUnlocked[s.zone]=Math.max(s.stageUnlocked[s.zone],s.stage+1);note('New stage unlocked: '+(s.stage+1));}else{s.bossCleared[s.zone]=true;}}
 if(e.boss){s.bosses++;s.bossCleared[s.zone]=true;note('Boss defeated: '+e.name);if(s.zone===s.unlocked&&s.unlocked<5){s.unlocked++;s.stageUnlocked[s.unlocked]=Math.max(1,s.stageUnlocked[s.unlocked]);toast(realms[s.unlocked][0]+' discovered!')}}
 let drop=createLoot(e.boss);if(e.boss&&drop&&!drop.salvaged)toast('Boss chest: '+drop.rarity.toUpperCase()+' '+drop.name+'!');
 rollBattleBackground();
 s.enemyHP=e.hp;if(s.autoMode==='off')s.engagedUntil=0;
 s.combatMessage=(firstClear?'First victory! ':'')+e.name+' defeated. +'+fmt(Math.ceil(e.xp*(firstClear?1.45:.72)))+' combat XP.';
 if(s.autoMode==='smart')chooseSmartTarget();
 honorCheck();needsMain=true;
}
function damage(v){if(!Number.isFinite(v)||v<=0||isDown())return;if(s.enemyHP>v){s.enemyHP-=v}else{defeat()}}
function spawnPop(parent,text,kind){let p=document.createElement('span');p.className='floatpop';p.textContent=text;p.style.left=(32+Math.random()*36)+'%';p.style.top=(27+Math.random()*25)+'%';if(kind==='battle')p.style.color='#ffc5a0';if(kind==='enemy')p.style.color='#ff667e';parent.appendChild(p);setTimeout(()=>p.remove(),750)}
function mine(){let v=clicks();gain(v);s.clicks++;spawnPop($('crystal').parentNode,'+'+fmt(v),'mine');honorCheck();stats();}
function manualAttack(){let now=Date.now();if(isDown()){toast('Defeated — recover before fighting');return}if(now<s.manualAt)return;s.manualAt=now+650;s.engagedUntil=now+5500;s.smartResting=false;let v=power();s.combatMessage='You strike for '+fmt(v)+' damage.';damage(v);spawnPop($('battlescene'),'-'+fmt(v),'battle');let art=$('enemyart');art.classList.remove('shake');void art.offsetWidth;art.classList.add('shake');stats();if(needsMain){renderPage();needsMain=false}}
function takeHit(){if(isDown())return;let e=enemy(),raw=foeRawDamage();s.enemyHits++;let crit=e.boss&&s.enemyHits%4===0;let actual=Math.max(1,Math.ceil(raw*(crit?1.8:1)*(1-defense()/(defense()+105+raw*.6))));s.hp=Math.max(0,s.hp-actual);s.combatMessage=(crit?'BOSS SPECIAL ATTACK! ':'')+e.name+' ('+e.trait+') hits for '+fmt(actual)+' HP.';spawnPop($('battlescene'),'-'+fmt(actual)+' HP','enemy');if(s.hp<=0){let loss=Math.min(s.ember*.04,e.reward*1.5);s.ember-=loss;s.auto=false;s.autoMode='off';s.smartResting=false;s.engagedUntil=0;s.downUntil=Date.now()+7000;s.enemyHP=e.hp;s.enemyTimer=0;s.enemyHits=0;s.combatMessage='You were knocked out. Recover in 7s; enemy HP has reset. '+(loss?'Lost '+fmt(loss)+' Ember.':'');note('Knocked out by '+e.name);toast('You were defeated by '+e.name+'!')}else if(crit){toast('Boss special attack: -'+fmt(actual)+' HP')}}
function retreat(){s.auto=false;s.autoMode='off';s.smartResting=false;s.engagedUntil=0;s.enemyTimer=0;s.enemyHits=0;s.enemyHP=enemy().hp;s.combatMessage='Retreated safely. Enemy health reset; health will regenerate while resting.';toast('Retreated to safety');stats()}
function usePotion(){let now=Date.now();if(isDown()||now<s.potionReady)return;let c=potionCost();if(s.ember<c){toast('Need '+fmt(c)+' Ember for a healing potion');return}if(s.hp>=maxHealth())return;s.ember-=c;s.hp=Math.min(maxHealth(),s.hp+maxHealth()*.45);s.potionReady=now+18000;s.combatMessage='Healing potion restored 45% HP. Next potion in 18 seconds.';toast('Restored health');stats()}

const costWorker=(w,n)=>{let owned=s.gens[w[0]]||0;if(n==='max'){let cnt=0,sum=0;while(cnt<10000){let price=Math.ceil(w[3]*1.23**(owned+cnt));if(!isFinite(price)||sum+price>s.ember+1e-8)break;sum+=price;cnt++}return {price:sum,count:cnt}}let q=Number(n),price=0;for(let i=0;i<q;i++)price+=Math.ceil(w[3]*1.23**(owned+i));return {price,count:q}};
const costBuild=b=>Math.ceil(b[3]*2.72**s.build[b[0]]);
const short=u=>fmt(u)+' Ember';
