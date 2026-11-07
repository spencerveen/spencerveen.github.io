'use strict';
function currencyStats(){ $('ember').textContent=fmt(s.ember);$('eps').textContent=fmt(income());$('click').textContent=fmt(clicks());$('power').textContent=fmt(power());$('souls').textContent=fmt(s.souls);$('sp').textContent=fmt(s.skillPoints);$('navlevel').textContent='Forge Lv '+s.level+' · Asc '+s.ascensions;}
let lastHuntSignature='';
function updateHuntBoard(){
 let max=maxSelectable(s.zone),cleared=s.firstClears[s.zone]||0,signature=[s.zone,s.stage,max,cleared,s.autoMode,Math.floor(s.combatLevel/3),Math.floor(s.hp/maxHealth()*4)].join('|');
 $('huntprogress').textContent='Cleared '+Math.min(9,cleared)+'/9 · '+(s.bossCleared[s.zone]?'Boss slain':'Boss locked until 9');
 $('huntmode').textContent=s.autoMode==='smart'?(s.smartResting?'Smart · recovering':'Smart Hunt'):s.autoMode==='selected'?'Auto · target':'Manual';
 $('huntstatus').textContent=s.autoMode==='smart'?'Automatically chooses a target predicted to be survivable. Bosses enter Smart Hunt after your first victory.':'Win on a stage to unlock the next (+45% first-clear XP and Ember). Earlier stages remain farmable.';
 $('hunttip').textContent= max<10?'Stage '+Math.min(10,max+1)+' unlocks after your first win on stage '+max+'.':'Boss unlocked · select stage 10 to challenge or farm earlier stages.';
 $('farmforecast').textContent='Safe target: '+(bestFarmStage()||'rest')+' · Equipment: '+(s.zone!==0?'None (loot not yet implemented)':s.stage===10?'5.5% chance · any Ashen Wilds equipment':s.stage<=3?'1.2% chance · early gear':s.stage<=6?'1.6% chance · mid-tier gear':'2% chance · late gear');
 if(signature===lastHuntSignature)return;
 lastHuntSignature=signature;
 $('huntsteps').innerHTML=Array.from({length:10},(_,n)=>{let stage=n+1,open=stage<=max,mob=enemyAt(s.zone,stage),current=s.stage===stage,first=(s.firstClears[s.zone]||0)>=stage,art=stage===10?iconHTML(mob.icon,'lg'):monsterSheetHTML(s.zone,stage,'hunt');return `<button class="hunt-stage ${current?'current ':''}${stage===10?'boss ':''}${!open?'locked':''}" data-target="${stage}" ${!open?'disabled':''} title="${open?mob.name+' · '+mob.trait+' · '+fmt(mob.hp)+' HP':'Defeat the previous stage to unlock'}"><span class="hunt-num">${stage===10?'BOSS':'#'+stage}</span><span class="hunt-art">${art}</span><span class="hunt-name">${stage===10?'BOSS · ':''}${esc(mob.name)}</span><span class="hunt-badge">${!open?'🔒':first?'✓ Farm':'New'}</span></button>`}).join('');
}
function stats(){
 currencyStats();let e=enemy(),boss=e.boss,now=Date.now();
 let hpMax=maxHealth();s.hp=Math.min(hpMax,Math.max(0,s.hp??hpMax));
 $('tophealth').textContent=fmt(s.hp)+'/'+fmt(hpMax);$('topcombat').textContent=s.combatLevel;
 $('level').textContent='Level '+s.level;$('lifetime').textContent=fmt(s.lifetime);
 let low=100*(10**((s.level-1)/4)-1),high=100*(10**(s.level/4)-1);
 $('levelbar').style.width=100*Math.min(1,Math.max(0,(s.lifetime-low)/(high-low)))+'%';$('levelinfo').textContent='Next level at '+fmt(high)+' lifetime Ember';
 $('homeenemy').textContent=e.name;$('homewave').textContent=realms[s.zone][0]+' · '+(e.boss?'BOSS':'Stage '+s.stage+'/10')+' · '+e.trait;
 $('homecombat').textContent='Combat Lv '+s.combatLevel+' · '+fmt(s.hp)+' / '+fmt(hpMax)+' HP';
 $('homebossnote').textContent=boss?'Boss encounter · extra damage and a low Ashen Wilds equipment drop chance.':'Choose and repeat any unlocked stage. New stages unlock after first victories.';
 $('homebattle').textContent=boss?'Enter Boss Battle →':'Enter Battle →';if(boss)setIcon('homeicon',e.icon,'xl');else{let art=$('homeicon'),k='homemob-'+s.zone+'-'+s.stage;if(art.dataset.icon!==k){art.dataset.icon=k;art.innerHTML=monsterSheetHTML(s.zone,s.stage,'home');}}
 let pct=100*s.enemyHP/e.hp;$('homehp').style.width=pct+'%';
 $('battleregion').textContent=realms[s.zone][0]+' · '+(boss?'BOSS · ':'')+'Stage '+s.stage+' / 10';
 $('bosstag').textContent=boss?'BOSS BATTLE · Stage 10':'Stage '+s.stage+' encounter';$('bosstag').classList.toggle('boss-pill',boss);
 $('bossbanner').style.display=boss?'block':'none';$('enemylabel').textContent=boss?'Realm Boss':'Current enemy';if(boss)setIcon('enemyart',e.icon,'hero');else{let art=$('enemyart'),k='mob-'+s.zone+'-'+s.stage;if(art.dataset.icon!==k){art.dataset.icon=k;art.innerHTML=monsterSheetHTML(s.zone,s.stage,'hero');}}$('enemyname').textContent=e.name+' · '+e.trait;
 $('hpbar').style.width=pct+'%';$('hptext').textContent=fmt(s.enemyHP)+' / '+fmt(e.hp)+' HP';$('stage').textContent=s.stage+' / 10';
 $('killreward').textContent='+'+fmt(e.reward)+' Ember';$('xpreward').textContent='+'+fmt(e.xp)+' XP';
 $('battlesub').textContent=(boss?'BOSS BATTLE · ':'')+realms[s.zone][0].toUpperCase();
 updateIllustratedScenes();
 $('attackstat').textContent=fmt(power());$('killstat').textContent=fmt(s.kills);$('bossstat').textContent=fmt(s.bosses);
 $('playerlevel').textContent=' · Combat Lv '+s.combatLevel;$('hpplayer').textContent=fmt(s.hp)+' / '+fmt(hpMax)+' HP';
 $('playerhpbar').style.width=Math.max(0,100*s.hp/hpMax)+'%';$('playerhpbar').parentNode.classList.toggle('low',s.hp/hpMax<=.30);
 $('xplabel').textContent='Combat XP: '+fmt(s.combatXP)+' / '+fmt(nextCombatXP(s.combatLevel));
 $('combatxpbar').style.width=Math.min(100,100*s.combatXP/nextCombatXP(s.combatLevel))+'%';
 $('defense').textContent='Defense '+fmt(defense());
 let active=activeFight(),down=isDown();
 $('combatstate').textContent=down?(now<s.downUntil?'Knocked out · '+Math.ceil((s.downUntil-now)/1000)+'s':'Knocked out'):active?'In combat':'Resting';
 $('combatstate').style.borderColor=down?'#ee657e':active?'#e1a46a':'#3d9475';
 $('regen').textContent=active?'No regeneration during combat':'Resting regen +'+fmt(realRecovery(false))+' HP/s';
 $('enemyattack').textContent='Enemy hit '+fmt(foeRawDamage())+' · Every '+foeAttackInterval().toFixed(2)+'s';$('combatodds').textContent='Hit '+Math.round(playerHitChance(e)*100)+'% · Crit '+(playerCritChance()*100).toFixed(1)+'% · Evade '+Math.round((1-enemyHitChance(e))*100)+'% · Block '+Math.round(blockChance()*100)+'%';
 $('enemytimerbar').style.width=(active?Math.min(100,s.enemyTimer/foeAttackInterval()*100):0)+'%';
 $('strike').textContent=down?'Recovering...':boss?'Strike Boss':'Strike';$('strike').disabled=down||now<s.manualAt;
 $('manualbar').style.width=(down?0:Math.min(100,100*(1-Math.max(0,s.manualAt-now)/650)))+'%';
 $('auto').textContent=s.autoMode==='smart'?'Smart Hunt':s.autoMode==='selected'?'Farm Target':'Auto OFF';$('auto').disabled=down;$('auto').classList.toggle('btn-gold',s.auto);
 $('potion').textContent='Use Potion ('+potionCount()+')'+(now<s.potionReady?' · '+Math.ceil((s.potionReady-now)/1000)+'s':'');
 $('potion').disabled=down||s.hp>=hpMax||now<s.potionReady||potionCount()===0;
 $('retreat').disabled=down||(!active&&s.enemyHP===e.hp);
 $('combatmessage').textContent=s.combatMessage||'Ready for battle';$('combatmessage').classList.toggle('danger',down||s.hp/hpMax<.2);$('combatmessage').classList.toggle('warning',!down&&s.hp/hpMax<.4);
 $('autodesc').textContent=s.autoMode==='smart'?(s.smartResting?'Smart Hunt is resting to recover HP.':'Smart Hunt targets the highest predicted survivable encounter. Proven bosses are eligible.') :s.autoMode==='selected'?'Auto-Farm repeats stage '+s.stage+'. Enemies fight back; retreat or change the target anytime.':'Manual mode · Attack cooldown 0.65s. Select a stage, then strike. Auto cycles OFF → Farm → Smart.';
 $('battlescene').className='scene illustrated zone'+s.zone+(boss?' bosswave':'');$('bosslootnote').style.display=boss?'block':'none';
 $('combattip').textContent=boss?'Bosses strike hard with a special every fourth hit. Ashen Wilds bosses have a small chance to drop any gear. Other realms have no loot yet.':'Each stage can be farmed repeatedly. New stages unlock one at a time after first victories. A safe farming target improves XP and loot.';
 updateHuntBoard();
 let next=s.zone<5?s.zone+1:5;
 $('nextgate').textContent=s.zone<5?'Next realm: '+realms[next][0]+' · defeat '+realms[s.zone][4]+' for the first time.':'Final region · defeat its guardian to complete your conquest.';
 setIcon('crystalicon','crystal','crystalHero');setIcon('forgecrest','altar','lg');setIcon('expeditionicon','swords','sm');
 setIcon('card-workers','pickaxe','lg');setIcon('card-gear','backpack','lg');setIcon('card-mastery','altar','lg');
 setIcon('cur-ember','flame','sm');setIcon('cur-eps','gear','sm');setIcon('cur-click','tap','sm');setIcon('cur-power','swordglow','sm');setIcon('cur-souls','soulfire','sm');setIcon('cur-sp','gem','sm');
 setIcon('cur-health','soulfire','sm');setIcon('cur-combat','swords','sm');
 setIcon('nav-forge','crystal','sm');setIcon('nav-battle','swords','sm');setIcon('nav-workers','pickaxe','sm');setIcon('nav-upgrades','bolt','sm');setIcon('nav-gear','backpack','sm');setIcon('nav-kingdom','castle','sm');setIcon('nav-world','map','sm');setIcon('nav-mastery','altar','sm');
}
function renderTraining(){let box=$('traininglist'),cap=trainingCap();box.innerHTML=TRAINING.map(t=>{let lv=s.training[t[0]]||0,c=trainCost(t),maxed=lv>=cap;return `<div class="train-item"><div class="smalltop"><strong>${t[1]}</strong><span class="pill">Lv ${lv}/${cap}</span></div><div class="hint">${t[3]}${lv>cap?' · extra ranks dormant until Ascension':''}</div><div class="space" style="margin-top:auto"><span class="price">${maxed?(cap>=30?'MAX':'Next cap: Ascension') :fmt(c)+' Ember'}</span><button class="btn" data-train="${t[0]}" data-price="${c}" ${maxed||s.ember<c?'disabled':''}>Train</button></div></div>`}).join('')}
function shopButton(action,id,price,disabled,text='Buy'){return `<button class="btn btn-gold" data-${action}="${esc(id)}" data-price="${price}" ${disabled?'disabled':''}>${text}</button>`}
function renderWorkerSummary(){
 const summary=$('worker-summary');if(!summary)return;
 const owned=totalWorkers(),production=income();
 const top=workers.filter(workerUnlocked).map(w=>({name:w[1],output:workerProduction(w)})).sort((a,b)=>b.output-a.output)[0];
 summary.innerHTML=`<div class="efw-summary-item"><span>Workforce production</span><strong>${fmt(production)} <small>Ember/sec</small></strong></div>
 <div class="efw-summary-item"><span>Workers employed</span><strong>${fmt(owned)}</strong></div>
 <div class="efw-summary-item"><span>Top producer</span><strong>${top&&top.output>0?esc(top.name):'None yet'}</strong></div>`;
}
function renderWorkers(){
 const visible=workers.filter(workerUnlocked),total=income();
 $('workerlist').innerHTML=visible.map(w=>{
   const c=costWorker(w,buyMode),owned=s.gens[w[0]]||0;
   const unit=fmt(w[4]),batch=fmt(w[4]*c.count);
   const label=c.count?'Hire '+(buyMode==='max'?'×'+fmt(c.count):'×'+c.count):'Unavailable';
   const output=workerProduction(w),share=total>0?Math.min(100,100*output/total):0;
   const marginal=workerMarginalProduction(w),price=costWorker(w,1).price;
   const efficiency=marginal>0?fmt(price/marginal):'—';
   return `<article class="efw-worker shopitem">
     <div class="efw-portrait" aria-hidden="true"><span class="efw-portrait-glow"></span>${iconHTML(w[2],'xl')}</div>
     <div class="efw-worker-info">
       <div class="efw-title-row"><div class="efw-worker-title"><strong>${esc(w[1])}</strong><p>${esc(w[5])}</p></div><span class="efw-owned pill">Owned <b>${fmt(owned)}</b></span></div>
       <div class="efw-output"><span class="efw-flame" aria-hidden="true">✦</span><span><strong>+${unit}</strong> /sec each</span><span class="efw-output-divider" aria-hidden="true"></span><span><strong>+${batch}</strong> base /sec</span></div>
       <div class="efw-metrics">
         <div class="efw-metric"><span class="efw-metric-label"><span aria-hidden="true">✦</span> Total production</span><div class="efw-metric-value">${fmt(output)} <small>Ember/sec</small></div></div>
         <div class="efw-metric"><span class="efw-metric-label"><span aria-hidden="true">◈</span> Workforce share</span><div class="efw-metric-value">${share.toFixed(1)}<small>%</small></div><div class="efw-share-track" aria-hidden="true"><span style="width:${share}%"></span></div></div>
       </div>
       <div class="efw-efficiency" title="Ember cost per additional 1 Ember/sec from buying the next single worker"><span class="efw-efficiency-label"><span aria-hidden="true">◆</span> Next hire efficiency</span><span class="efw-efficiency-amount"><strong>${efficiency}</strong> Ember / +1 per sec</span></div>
       <div class="efw-bottom shopbottom"><span class="efw-price price"><span aria-hidden="true">◆</span> ${c.count?short(c.price):'MAXED'}</span>${shopButton('worker',w[0],c.price,c.count===0||s.ember<c.price,label)}</div>
     </div>
   </article>`;
 }).join('');
 renderWorkerSummary();
}
function renderUpgrades(){
 const view=['unlocked','affordable','all'].includes(s.upgradeView)?s.upgradeView:'unlocked',showOwned=!!s.showOwned;
 $$('[data-upgrade-filter]').forEach(button=>{
   const active=button.dataset.upgradeFilter===view;
   button.classList.toggle('on',active);button.setAttribute('aria-pressed',String(active));
 });
 $('showowned').checked=showOwned;
 const unlocked=upgrades.filter(upgradeUnlocked);
 const unowned=unlocked.filter(u=>!s.ups[u[0]]);
 const affordable=unowned.filter(u=>u[3]<=s.ember);
 const visible=upgrades.filter(u=>(view==='all'||upgradeUnlocked(u))&&(showOwned||!s.ups[u[0]])&&(view!=='affordable'||!s.ups[u[0]]&&s.ember>=u[3]));
 $('upgradeinfo').innerHTML=`<div class="efa-metric"><span>Available powers</span><strong>${unowned.length}</strong></div>
 <div class="efa-metric"><span>Affordable now</span><strong>${affordable.length}</strong></div>
 <div class="efa-metric"><span>Bosses defeated</span><strong>${bossesDefeated()} / 6</strong></div>`;
 $('upgradehint').textContent=view==='all'?'Future powers are previews; unlock their requirements before purchasing.':'Higher-tier powers reveal themselves after boss victories and Forge or Combat milestones.';
 $('upgradelist').innerHTML=visible.map(u=>{
   const owned=!!s.ups[u[0]],unlocked=upgradeUnlocked(u),enabled=unlocked&&!owned&&s.ember>=u[3];
   const state=owned?'owned':!unlocked?'locked':enabled?'affordable':'available';
   const category=u[4]==='prodMult'?'Workers':u[4]==='attackMult'?'Combat':'Forge';
   const requirement=requirementFor(u);
   return `<article class="efa-card shopitem ${state}">
     <div class="efa-art" aria-hidden="true">${iconHTML(u[2],'xl')}</div>
     <div class="efa-content">
       <div class="efa-card-head"><div class="efa-card-heading"><span class="efa-category">${category} power</span><strong>${esc(u[1])}</strong></div><span class="efa-status ${state}">${owned?'Owned':!unlocked?'Locked':enabled?'Affordable':'Available'}</span></div>
       <div class="efa-effect"><span class="efa-effect-glyph" aria-hidden="true">✦</span><div><span class="efa-effect-caption">Upgrade Effect</span><strong>${esc(u[6])}</strong></div></div>
       <div class="efa-requirements"><span aria-hidden="true">◇</span> ${owned&&!unlocked?'Dormant until ':unlocked?'Requires ':'Locked · Requires '}${esc(requirement)}</div>
       <div class="efa-purchase"><div class="efa-price"><span class="efa-price-label">${owned?'Already acquired':'Cost to unlock'}</span><strong>${owned?'Purchased':short(u[3])+' Ember'}</strong></div>${shopButton('upgrade',u[0],u[3],!enabled,owned?'Owned':!unlocked?'Locked':'Unlock')}</div>
     </div>
   </article>`;
 }).join('');
 if(!visible.length){
   const upcoming=upgrades.filter(u=>!s.ups[u[0]]&&!upgradeUnlocked(u)).slice(0,2);
   $('upgradelist').innerHTML=`<div class="efa-empty"><strong>${view==='affordable'?'No affordable upgrades right now.':'No upgrades match this view.'}</strong><div>${upcoming.length?'Coming next: '+upcoming.map(u=>esc(u[1])+' ('+esc(requirementFor(u))+')').join(' · '):'All upgrade tiers revealed. Ascend to restore temporary upgrades.'}</div></div>`;
 }
}
// Kingdom hub keeps its workspace selection while the player shops or builds.
let kingdomTab='buildings';
let merchantTab='buy';
function setKingdomTab(tab){
 if(!['buildings','merchant','blacksmith'].includes(tab))return;
 if(tab==='blacksmith'&&!bossClearedAt(0))return;
 kingdomTab=tab;
 $$('[data-kingdom-tab]').forEach(button=>{
  const active=button.dataset.kingdomTab===tab;
  button.classList.toggle('on',active);button.setAttribute('aria-pressed',String(active));
 });
 $$('[data-kingdom-panel]').forEach(panel=>{panel.hidden=panel.dataset.kingdomPanel!==tab});
}
function setMerchantTab(tab){
 if(!['buy','sell'].includes(tab))return;
 merchantTab=tab;
 $$('[data-merchant-tab]').forEach(button=>{
  const active=button.dataset.merchantTab===tab;
  button.classList.toggle('on',active);button.setAttribute('aria-pressed',String(active));
 });
 $$('[data-merchant-panel]').forEach(panel=>{panel.hidden=panel.dataset.merchantPanel!==tab});
}
// Every structure must reach the threshold before the Kingdom evolves.
// The vista index persists across Ascension, even when buildings reset.
// A new landscape requires the corresponding first-time boss defeat AND
// every Kingdom building completed to the prior tier's cap. Milestones persist
// between runs, even though Ascension resets the current buildings.
const KINGDOM_VISTA_MILESTONES=[
 {levels:0,boss:-1},
 {levels:3,boss:0},
 {levels:6,boss:1},
 {levels:9,boss:2},
 {levels:11,boss:3},
 {levels:12,boss:4}
];
function earnedKingdomVista(){
 let unlocked=Math.min(5,s.kingdomVistaMilestone||0);
 for(let i=unlocked+1;i<KINGDOM_VISTA_MILESTONES.length;i++){
  const milestone=KINGDOM_VISTA_MILESTONES[i];
  if(!bossClearedAt(milestone.boss)||!buildings.every(b=>(s.build[b[0]]||0)>=milestone.levels))break;
  unlocked=i;
 }
 return unlocked;
}
function renderKingdom(){
 const cap=buildingCap();
 const earned=earnedKingdomVista();
 if(earned>(s.kingdomVistaMilestone||0)){s.kingdomVistaMilestone=earned;save();}
 // Override legacy combined-level previews with the actual earned vista.
 kingdomVistaPreview=Math.min(KINGDOM_VISTAS.length-1,earned);
 updateIllustratedScenes();
 const owned=Object.values(s.build).reduce((n,x)=>n+x,0);
 $('kingdominfo').textContent='Bosses '+bossesDefeated()+'/6 · '+owned+' built levels';
 $('kingdomcap').textContent='Current cap '+cap+' / 12';
 $('kingdombuildcount').textContent=owned?String(owned):'';
 $('blacksmithtab').hidden=!bossClearedAt(0);
 if(kingdomTab==='blacksmith'&&!bossClearedAt(0))kingdomTab='buildings';
 const visible=buildings.filter(b=>buildingUnlocked(b)||s.build[b[0]]>0);
 $('buildlist').innerHTML=visible.map(b=>{
  const lv=s.build[b[0]],cost=costBuild(b),unlocked=buildingUnlocked(b),maxed=lv>=cap;
  return `<article class="efk-building ${unlocked?'':'efk-building-locked'}">
    <div class="efk-building-top"><span class="efk-building-art">${iconHTML(b[2],'lg')}</span><div class="efk-building-name"><strong>${esc(b[1])}</strong><span>${esc(b[5])}</span></div><span class="efk-building-level">Lv ${lv}/${cap}</span></div>
    <div class="efk-building-track"><span style="width:${100*Math.min(cap,lv)/cap}%"></span></div>
    <div class="efk-building-bottom"><span class="efk-building-price">${maxed?'Max level':unlocked?short(cost):'Unavailable'}</span>${shopButton('build',b[0],cost,maxed||!unlocked||s.ember<cost,maxed?'Maxed':!unlocked?'Unavailable':'Upgrade')}</div>
   </article>`;
 }).join('');
 renderKingdomMerchant();
 setKingdomTab(kingdomTab);
 setMerchantTab(merchantTab);
}
function renderKingdomMerchant(){
 const merchantStock=$('merchantstock');
 const full=inventoryUsedSlots()>=inventoryCapacity();
 const gear=KINGDOM_STARTER_GEAR.filter(g=>(g.ascension||0)<=kingdomBossTier()).map(g=>{
   const unavailable=full||s.ember<g.price;
   return `<div class="efk-merchant-item common-gear">
     <div class="efk-merchant-item-art">${lootVisual(g.icon,'lg')}</div>
     <div class="efk-merchant-item-info"><strong>${esc(g.name)}</strong><span>+${fmt(g.power)} ${equipmentPowerType(g.slot)}</span></div>
     <div class="efk-merchant-trade"><span>${fmt(g.price)} Ember</span><button class="btn" data-merchant-gear="${esc(g.name)}" data-price="${g.price}" ${unavailable?'disabled':''}>Buy</button></div>
   </div>`;
 }).join('');
 const potions=HEALING_POTIONS.map(p=>{
   const count=potionCount(p.id);
   const needsSlot=count%p.maxStack===0;
   const unavailable=(needsSlot&&full)||s.ember<p.price;
   return `<div class="efk-merchant-item common-gear">
     <div class="efk-merchant-item-art">${lootVisual(p.icon,'lg')}</div>
     <div class="efk-merchant-item-info"><strong>${esc(p.name)}</strong><span>Restores ${Math.round(p.heal*100)}% HP · ${count} carried · stacks of ${p.maxStack}</span></div>
     <div class="efk-merchant-trade"><span>${fmt(p.price)} Ember</span><button class="btn" data-merchant-potion="${p.id}" data-price="${p.price}" ${unavailable?'disabled':''}>Buy</button></div>
   </div>`;
 }).join('');
 merchantStock.innerHTML=gear+potions;
 const items=[...s.items].sort((a,b)=>rarityValue[b.rarity]-rarityValue[a.rarity]||b.power-a.power);
 const equippedIds=equippedGearIds();
 $('merchantlist').innerHTML=items.length?items.map(g=>{
  const protectedGear=isGearTradeProtected(g,equippedIds);
  return `<div class="efk-merchant-item ${g.rarity}-gear"><div class="efk-merchant-item-art">${lootVisual(g.icon,'lg')}</div><div class="efk-merchant-item-info"><strong class="rarity-${g.rarity}">${esc(g.name)}</strong><span>${g.power?`+${fmt(g.power)} ${equipmentPowerType(equipmentSlotFor(g))}`:'Special effect'}${protectedGear?' · Protected':''}</span></div><div class="efk-merchant-trade"><span>${fmt(sellValue(g))} Ember</span><button class="btn btn-quiet" data-sell="${esc(g.id)}" ${protectedGear?'disabled title="Unlock and unequip this item first"':''}>Sell</button></div></div>`;
 }).join(''):'<div class="efk-merchant-empty">No unwanted equipment to sell.</div>';
 const potionTrades=HEALING_POTIONS.filter(p=>potionCount(p.id)>0).map(p=>{
   const price=Math.max(1,Math.floor(p.price*.25));
   return `<div class="efk-merchant-item"><div class="efk-merchant-item-art">${lootVisual(p.icon,'lg')}</div><div class="efk-merchant-item-info"><strong>${esc(p.name)}</strong><span>${potionCount(p.id)} in backpack</span></div><div class="efk-merchant-trade"><span>+${price} Ember</span><button class="btn btn-quiet" data-merchant-sell-potion="${p.id}">Sell 1</button></div></div>`;
 }).join('');
 $('merchantlist').insertAdjacentHTML('beforeend',potionTrades);
 // A blacksmith arrives silently after the first Ascension. Crafting is a later feature.
 $('craftsman').hidden=!bossClearedAt(0);
 $('craftsman').style.display=bossClearedAt(0)?'':'none';
}
function buyMerchantGear(name){
 if(!atKingdom())return false;
 const base=MERCHANT_GEAR_BY_NAME.get(name);
 if(!base||(base.ascension||0)>kingdomBossTier()||s.ember<base.price||inventoryUsedSlots()>=inventoryCapacity())return false;
 const item={...base,id:'m'+Date.now().toString(36)+Math.floor(Math.random()*1e8).toString(36),
 rarity:'common',origin:0,tier:1,locked:false,ability:null,abilityValue:0};
 s.ember-=base.price;s.items.unshift(item);
 note('Purchased '+base.name);toast(base.name+' purchased');
 save();renderGear();renderKingdomMerchant();currencyStats();return true;
}
function sellMerchantPotion(id){
 if(!atKingdom())return false;
 const potion=potionDefinition(id);
 if(!potion||potionCount(id)<1)return false;
 s.potions[id]--;gain(Math.max(1,Math.floor(potion.price*.25)));
 note('Sold '+potion.name);save();renderGear();renderKingdomMerchant();currencyStats();return true;
}
function buyMerchantPotion(id){
 if(!atKingdom())return false;
 const potion=potionDefinition(id);
 if(!potion||s.ember<potion.price)return false;
 const count=potionCount(id);
 if(count%potion.maxStack===0&&inventoryUsedSlots()>=inventoryCapacity())return false;
 if(!s.potions)s.potions={};
 s.ember-=potion.price;s.potions[id]=count+1;
 note('Purchased '+potion.name);toast(potion.name+' purchased');
 save();renderGear();renderKingdomMerchant();currencyStats();return true;
}
function renderGear(){
 const jewelryEmptyArt={necklace:'necklace',ring1:'ring',ring2:'ring',ring3:'ring',ring4:'ring',charm:'charm'};
 const equippedEmptyArt={helmet:0,chest:1,gloves:2,legs:3,boots:4,mainHand:5,offHand:6,back:7};
 const makeSlot=(key)=>{
   const def=EQUIPMENT_SLOTS.find(x=>x[0]===key);
   if(!def)return '';
   const g=equippedItem(key),label=def[1],type=equipmentPowerType(key);
   return `<div class="efg-slot ${g?'filled '+g.rarity+'-gear':'empty'}" data-slot="${key}" aria-label="${esc(label)} equipment slot">
     <div class="efg-slot-badge" aria-hidden="true">${g?lootVisual(g.icon,'lg'):jewelryEmptyArt[key]?`<img class="efg-slot-placeholder-art" src="./art/armory-slot-${jewelryEmptyArt[key]}.webp" alt="" loading="lazy" decoding="async">`:Object.prototype.hasOwnProperty.call(equippedEmptyArt,key)?`<span class="efg-equipped-placeholder efg-equipped-placeholder-${equippedEmptyArt[key]}"></span>`:iconHTML(def[2],'lg')}</div>
     <div class="efg-slot-copy">
       <span class="efg-slot-label">${esc(label)}</span>
       <strong class="efg-slot-main ${g?'filled rarity-'+g.rarity:'empty'}">${g?esc(g.name):'Empty slot'}</strong>
       <span class="efg-slot-sub">${g?`+${fmt(g.power)} ${type}${g.ability?' · '+lootAbilityText(g):''}`:'No gear equipped'}</span>
     </div>
     ${g?`<button class="efg-remove btn btn-quiet" data-unequip="${key}" aria-label="Unequip ${esc(label)}">Remove</button>`:`<span class="efg-slot-empty-pill" aria-hidden="true">Open</span>`}
   </div>`;
 };
 const equippedSlots=['helmet','chest','gloves','legs','boots','mainHand','offHand','back'];
 const jewels=['necklace','ring1','ring2','ring3','ring4','charm'];
 $('equipped').innerHTML=`<div class="efg-character-layout">
   <div class="efg-slot-column efg-armor"><div class="efg-group-heading">Equipped</div>${equippedSlots.map(makeSlot).join('')}</div>
   <div class="efg-character-center">
     <label class="efg-visually-hidden" for="ef4-adventurer-name">Adventurer name</label>
     <input id="ef4-adventurer-name" class="efg-name-input" type="text" maxlength="32" value="${esc(s.avatarName||'')}" placeholder="Your Adventurer" aria-label="Adventurer name" autocomplete="off" spellcheck="false">
     <div class="efg-gender-switch" role="group" aria-label="Choose your adventurer">
       <button type="button" data-avatar-gender="male" class="${s.avatarBody==='female'?'':'on'}" aria-pressed="${s.avatarBody!=='female'}">Male</button>
       <button type="button" data-avatar-gender="female" class="${s.avatarBody==='female'?'on':''}" aria-pressed="${s.avatarBody==='female'}">Female</button>
     </div>
     ${renderAdventurerPaperDoll()}
     <div class="efg-placeholder">Every legend starts somewhere · equipment appearances coming soon</div>
   </div>
   <div class="efg-slot-column efg-jewelry"><div class="efg-group-heading">Jewelry</div>${jewels.map(makeSlot).join('')}</div>
 </div>`;
 const capacity=inventoryCapacity(),count=inventoryUsedSlots();
 $('bagtitle').textContent='Backpack ('+count+' / '+capacity+')';
 $('bagcapacity').textContent=count+' / '+capacity;
 $('bagprogress').style.width=Math.min(100,100*count/capacity)+'%';
 $('bagprogress').classList.toggle('full',count>=capacity);
 const sorted=[...s.items].sort((a,b)=>rarityValue[b.rarity]-rarityValue[a.rarity]||b.power-a.power);
 const equippedIds=equippedGearIds();
 // Render one backpack tile per potion stack, including the final partial stack.
 const potionTiles=HEALING_POTIONS.flatMap(p=>Array.from({length:Math.ceil(potionCount(p.id)/p.maxStack)},(_,i)=>({
   kind:'potion',definition:p,count:Math.min(p.maxStack,potionCount(p.id)-i*p.maxStack)
 })));
 const slots=[...sorted,...potionTiles];
 $('baglist').innerHTML=Array.from({length:capacity},(_,index)=>{
   const g=slots[index];
   if(!g)return `<div class="efg-bag-slot efg-bag-empty" aria-label="Empty backpack slot ${index+1}"><span class="efg-bag-slot-index">${String(index+1).padStart(2,'0')}</span><span class="efg-bag-empty-symbol" aria-hidden="true">✧</span><span class="efg-bag-empty-label">Empty</span></div>`;
   if(g.kind==='potion'){
     const p=g.definition;
     return `<article class="efg-bag-slot efg-bag-filled" aria-label="Backpack slot ${index+1}: ${esc(p.name)}, stack of ${g.count}">
       <span class="efg-bag-slot-index">${String(index+1).padStart(2,'0')}</span>
       <div class="efg-bag-art">${lootVisual(p.icon,'lg')}</div>
       <div class="efg-bag-name">${esc(p.name)}</div>
       <div class="efg-bag-details">Stack ${g.count} / ${p.maxStack}</div>
       <div class="efg-bag-ability">Restores ${Math.round(p.heal*100)}% max HP · Consumable</div>
       <div class="efg-bag-actions"><span class="pill">×${g.count}</span></div>
     </article>`;
   }
   const equipped=isGearEquipped(g,equippedIds);
   return `<article class="efg-bag-slot efg-bag-filled ${g.rarity}-gear" aria-label="Backpack slot ${index+1}: ${esc(g.name)}">
     <span class="efg-bag-slot-index">${String(index+1).padStart(2,'0')}</span>
     <div class="efg-bag-art">${lootVisual(g.icon,'lg')}</div>
     <div class="efg-bag-name rarity-${g.rarity}">${esc(g.name)}</div>
     <div class="efg-bag-details">${g.power?`+${fmt(g.power)} ${equipmentPowerType(equipmentSlotFor(g))}`:'Special effect'}</div>
     ${g.ability?`<div class="efg-bag-ability">${lootAbilityText(g)}</div>`:''}
     <div class="efg-bag-actions"><button class="item-lock ${g.locked?'locked':''}" data-lock="${esc(g.id)}" aria-label="${g.locked?'Unlock':'Lock'} ${esc(g.name)}" title="${g.locked?'Unlock item':'Protect item'}">${g.locked?'🔒':'🔓'}</button><button class="btn" data-equip="${esc(g.id)}" ${equipped?'disabled':''}>${equipped?'Equipped':'Equip'}</button></div>
   </article>`;
 }).join('');
 root.querySelector('#ef4-relic-vault')?.remove();


}
// Overlay positions follow the illustrated route from home to the Eternal Citadel.
// All buttons are real DOM controls: no interaction is painted into the image.
let caladrynMapSignature='';
const CALADRYN_MAP_PREFERENCE='emberforge-caladryn-map-collapsed';
let caladrynMapCollapsed=false;
try{caladrynMapCollapsed=window.localStorage.getItem(CALADRYN_MAP_PREFERENCE)==='1'}catch(_){}
function updateCaladrynMapVisibility(){
 $('mapregion').hidden=caladrynMapCollapsed;
 const toggle=$('maptoggle');
 toggle.setAttribute('aria-expanded',String(!caladrynMapCollapsed));
 toggle.textContent=caladrynMapCollapsed?'Show Map':'Minimize Map';
 toggle.closest('.caladryn-header')?.classList.toggle('map-collapsed',caladrynMapCollapsed);
}
const CALADRYN_STOPS=[
 {name:'Kingdom',x:9.5,y:68.3,symbol:'⌂'},
 {name:'Ashen Wilds',x:22.5,y:58.7,symbol:'✦'},
 {name:'Whispering Forest',x:36.3,y:52.0,symbol:'❧'},
 {name:'Frostspire Peaks',x:49.1,y:43.9,symbol:'❄'},
 {name:'Obsidian Wastes',x:64.1,y:42.1,symbol:'◆'},
 {name:'Celestial Rift',x:77.0,y:33.8,symbol:'✧'},
 {name:'Eternal Citadel',x:90.8,y:26.3,symbol:'✴'}
];
function renderWorld(){
 const home=atKingdom(),location=home?'The Kingdom':realms[s.zone][0];
 $('worldlocation').textContent=home?'At Kingdom':'Exploring '+location;
 $('returnhome').hidden=home;
 $('kingdominterior').hidden=!home;
 $('worldbattle').hidden=home;
 $('worldbattle').classList.toggle('active',!home&&page==='world');
 updateCaladrynMapVisibility();
 const mapSignature=[s.location,s.zone,s.unlocked,s.bossCleared.join('|')].join('|');
 if(mapSignature!==caladrynMapSignature){
 const stops=CALADRYN_STOPS.map((stop,i)=>{
  const kingdom=i===0,z=i-1,available=kingdom||realmAccessible(z),current=kingdom?home:!home&&s.zone===z;
  const requirement=kingdom?'Safe home base':z===0?'Starting realm':'Defeat '+realms[z-1][4]+' to unlock';
  const status=current?'Current location':available?'Travel available':'Locked';
  const attr=kingdom?'data-return-home':`data-zone="${z}"`;
  return { ...stop,kingdom,z,available,current,requirement,status,attr};
 });
 $('mapmarkers').innerHTML=stops.map(p=>`<button class="caladryn-map-pin ${p.current?'current':''} ${p.available?'open':'locked'}" style="--mx:${p.x}%;--my:${p.y}%" type="button" ${p.attr} ${!p.available?'disabled':''} title="${esc(p.name)} · ${esc(p.requirement)}" aria-label="${esc(p.name)}: ${p.status}"><span class="caladryn-pin-glyph" aria-hidden="true">${p.available?p.symbol:'×'}</span></button>`).join('');
  caladrynMapSignature=mapSignature;
 }
 if(home)renderKingdom();else renderTraining();
}
const quests=()=>[
 ['q1','Spark Collector','Tap 30 times',s.clicks,30,120],
 ['q2','A Growing Workforce','Hire 15 workers',totalWorkers(),15,700],
 ['q3','Warrior Initiate','Defeat 25 enemies',s.kills,25,1600],
 ['q4','Break Ground','Build 5 kingdom levels',Object.values(s.build).reduce((a,b)=>a+b,0),5,2600],
 ['q5','Warden Slayer','Defeat 2 guardians',s.bosses,2,5000],
 ['q6','Beyond the Wilds','Unlock 3 realms',s.unlocked+1,3,15000],
 ['q7','Fortune Smiles','Discover 10 equipment drops',s.lootFound,10,22000],
 ['q8','Reborn of Fire','Ascend once',s.ascensions,1,6500],
 ['q9','Battle Hardened','Reach combat level 10',s.combatLevel,10,4000],
 ['q10','Trial of Endurance','Reach combat level 25',s.combatLevel,25,30000],
 ['q11','Second Ascension','Ascend twice',s.ascensions,2,50000],
 ['q12','Into the Rift','Reach Celestial Rift',s.unlocked,4,90000],
 ['q13','Realm Sovereign','Complete five Ascensions',s.ascensions,5,150000]
];
function renderMastery(){ $('legacy').textContent=s.ascensions+' Ascensions';$$('[data-sub]').forEach(b=>b.classList.toggle('on',b.dataset.sub===sub));let box=$('mastercontent'),html='';if(sub==='skills'){html=`<div class="space" style="margin-bottom:10px"><strong style="display:flex;align-items:center;gap:8px">${iconHTML('gem','sm')} ${fmt(s.skillPoints)} Skill Points Available</strong><span class="hint">1 point every 4 forge levels · Each Ascension raises your skill rank cap</span></div><div class="shopgrid">`+skills.map(sk=>{let rank=s.skills[sk[0]]||0,cap=skillCap();return `<div class="shopitem"><div class="space"><span class="small-icon">${iconHTML(sk[2],'lg')}</span><span class="pill">Rank ${rank}/${cap}</span></div><strong>${sk[1]}</strong><div class="hint">${sk[3]}</div><div class="shopbottom"><span class="price">1 SP</span>${shopButton('skill',sk[0],0,rank>=cap||!s.skillPoints||s.skillPoints<1+Math.floor(rank/2),rank>=cap?'Era cap':('Train · '+(1+Math.floor(rank/2))+' SP'))}</div></div>`}).join('')+'</div>'}
if(sub==='quests'){html='<div class="stack">'+quests().map(q=>{let done=s.claimed.includes(q[0]);return `<div class="rowitem"><span class="r-ico">${iconHTML('scroll','lg')}</span><div class="r-body"><strong>${q[1]}</strong><span class="hint">${q[2]} · ${fmt(Math.min(q[4],q[3]))}/${fmt(q[4])}</span><div class="progress" style="height:5px;margin-top:5px"><div style="width:${Math.min(100,100*q[3]/q[4])}%;background:#7adcb4"></div></div></div>${shopButton('quest',q[0],0,done||q[3]<q[4],done?'Claimed':'Claim '+fmt(q[5])+' Ember')}</div>`}).join('');let remaining=Math.max(0,12-(s.kills-s.bountyStart)),reward=Math.ceil(250*(1+.35*s.bounty)*(1+s.zone));html+=`<div class="card"><strong>${iconHTML('scroll','sm')} Repeatable Contract · Hunt 12 enemies</strong><div class="hint" style="margin:5px 0 9px">${12-remaining} / 12 kills this contract · Reward ${fmt(reward)} Ember</div><button class="btn btn-gold" data-bounty="1" ${remaining?'disabled':''}>Claim Bounty</button></div></div>`}
if(sub==='achievements'){
 const workerProgress=workers.filter(w=>workerUnlocked(w)||(s.gens[w[0]]||0)>0).map(w=>{
   const owned=s.gens[w[0]]||0,next=WORKER_MILESTONES.find(m=>owned<m[0]);
   const bonus=Math.round(workerMilestoneBonus(owned)*100),progress=next?Math.min(100,100*owned/next[0]):100;
   return `<div class="efw-achievement-worker">
     <div class="efw-achievement-worker-heading"><span>${iconHTML(w[2],'md')} <strong>${esc(w[1])}</strong></span><span class="pill">Owned ${fmt(owned)}</span></div>
     <div class="efw-milestone-line"><span>${next?'Next milestone: '+next[0]+' workers':'All milestones reached'}</span><span>${next?owned+'/'+next[0]:'Complete'}</span></div>
     <div class="efw-milestone-track" role="progressbar" aria-label="${esc(w[1])} milestone progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}"><span style="width:${progress}%"></span></div>
     <div class="efw-milestone-note">${next?'Next bonus: +'+Math.round(next[1]*100)+'% output':'All bonuses unlocked'} · Active: +${bonus}%</div>
   </div>`;
 }).join('');
 const earned=honors.filter(h=>s.ach.includes(h[0])).length;
 html=`<div class="efw-achievements-heading"><div><h3>Worker milestones</h3><div class="hint">Hire 10, 25, 50 and 100 of each worker type to gain cumulative production bonuses. Milestones reset with Ascension.</div></div></div>
 <div class="efw-achievement-grid">${workerProgress||'<div class="hint">More workers become available as you progress.</div>'}</div>
 <div class="efw-achievements-heading"><div><h3>Achievements</h3><div class="hint">Completed achievements remain unlocked after Ascension.</div></div><span class="pill">${earned} / ${honors.length} earned</span></div>
 <div class="grid2">`+honors.map(h=>`<div class="rowitem" style="opacity:${s.ach.includes(h[0])?1:.48}"><span class="r-ico">${iconHTML(s.ach.includes(h[0])?'medal':'vault','lg')}</span><div class="r-body"><strong>${h[1]}</strong><span class="hint">${h[2]}</span></div></div>`).join('')+'</div>';
}
if(sub==='bestiary'){html='<div class="space" style="margin-bottom:10px"><div class="hint">Track every realm enemy and boss. Only Ashen Wilds currently drops equipment. Boss drops are never guaranteed.</div><span class="pill">Entries '+encounterBook().length+'</span></div><div class="bestiary-grid">'+encounterBook().map(ent=>{let seen=(s.zone===ent.realm&&ent.stage<=maxSelectable(ent.realm))||ent.realm<s.unlocked||((s.codex[ent.id]||0)>0),kills=s.codex[ent.id]||0;return `<div class="codexcard ${seen?'':'locked'}"><div class="codeico">${seen?(ent.boss?iconHTML(ent.icon,'xl'):monsterSheetHTML(ent.realm,ent.stage,'codex')):iconHTML('vault','xl')}</div><div class="codebody"><div class="realmnote">${realms[ent.realm][0]}</div><div class="codextype ${ent.boss?'boss':''}">${ent.boss?'Boss':'Enemy'}</div><strong>${seen?ent.name:'Unknown encounter'}</strong><div class="hint" style="margin-top:4px">${seen?ent.desc:'Defeat earlier bosses to reveal this entry.'}</div><div class="hint" style="margin-top:6px">Defeats: ${fmt(kills)}${ent.boss?' · Boss chest eligible':''}</div></div></div>`}).join('')+'</div>'}
if(sub==='ascend'){let reward=soulReward(),next=ascendTarget(),prog=Math.min(100,100*s.runEarned/next);let lastLoot=s.lastBossLoot?`<div class="hint" style="margin-top:10px">Last boss drop: ${esc(s.lastBossLoot.name)}</div>`:'';html=`<div class="card" style="background:radial-gradient(ellipse at 50% 5%,#3a3257,#16213a 80%);text-align:center;padding:28px 18px"><div style="display:flex;justify-content:center;margin:4px auto 14px">${iconHTML("altar","hero")}</div><div style="font-size:22px;font-weight:850">Ascension Altar</div><div class="hint" style="margin:8px auto 14px;max-width:380px">Sacrifice your current run to gain permanent Soulfire and stronger production. Equipment determines combat stats. Defeating bosses unlocks new regions, Kingdom upgrades, and higher skill tiers.</div><div class="grid2" style="max-width:330px;margin:0 auto 14px"><div class="stat"><div class="label">This run</div><div class="big">${fmt(s.runEarned)}</div></div><div class="stat"><div class="label">Soulfire reward</div><div class="big" style="color:#e2bdff">+${fmt(reward)}</div></div></div><div class="progress" style="margin-bottom:10px"><div style="width:${prog}%;background:#ae80ee"></div></div><div class="hint" style="margin-bottom:14px">${reward?'Ascension is ready!':'Earn '+fmt(next-s.runEarned)+' more Ember to ascend. Boss victories unlock higher caps.'}</div><button class="btn btn-gold" data-ascend="1" ${reward<1?'disabled':''}>Ascend ${reward?'for +'+reward+' Soulfire':'· Locked'}</button><div class="hint" style="margin-top:13px">Resets Ember, workers, temporary upgrades, buildings and the selected battle target. Keeps combat levels (health only), training, skills, Soulfire and discoveries. All equipment and potions are lost on Ascension. Boss victories raise training and skill caps.</div>${lastLoot}</div>`}
box.innerHTML=html;if(sub==='ascend'){
let row=realms.map((r,i)=>`<div class="rowitem" style="opacity:${realmAccessible(i)?1:.78}"><span class="r-ico">${iconHTML(r[1],'lg')}</span><div class="r-body"><strong>${r[0]}</strong><span class="hint">${i?'Defeat '+realms[i-1][4]+' to unlock':'Starting region'} · Boss: ${r[4]}</span></div><span class="pill">${realmAccessible(i)?'Region unlocked':'Boss required'}</span></div>`).join('');
box.insertAdjacentHTML('beforeend',`<div class="card" style="margin-top:12px"><div class="section">Realm unlock roadmap</div><div class="stack" style="gap:7px">${row}</div><div class="hint" style="margin-top:10px">Defeating each region boss increases your Kingdom's building cap and unlocks higher training ranks. Kingdom scenery also requires all six buildings completed to the previous cap.</div></div>`)
}}
function renderPage(){currencyStats();if(page==='workers')renderWorkers();if(page==='upgrades')renderUpgrades();if(page==='gear')renderGear();if(page==='world')renderWorld();if(page==='mastery')renderMastery();stats()}
function go(p){const jumpToCombat=p==='battle'&&inExpedition();if(p==='battle'||p==='kingdom')p='world';page=p;$$('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===p||(p==='world'&&inExpedition()&&x.dataset.view==='battle')));$$('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===p));renderPage();if(jumpToCombat)$('worldbattle').scrollIntoView?.({behavior:'smooth',block:'start'});}
function modal(title,body,onConfirm,confirmLabel='Confirm',textarea=false){modalOpen=true;$('modal').style.display='block';$('modal').innerHTML=`<div class="modaloverlay"><div class="modal"><div style="font-size:19px;font-weight:850;margin-bottom:9px">${esc(title)}</div><div class="hint" style="font-size:12px;margin-bottom:15px">${esc(body)}</div>${textarea?'<textarea id="ef4-modaltext" class="textentry" spellcheck="false"></textarea>':''}<div class="two-actions" style="justify-content:flex-end;margin-top:17px"><button class="btn" data-modalcancel="1">Cancel</button><button class="btn btn-gold" data-modalconfirm="1">${esc(confirmLabel)}</button></div></div></div>`;let close=()=>{$('modal').style.display='none';modalOpen=false};root.querySelector('[data-modalcancel]').onclick=close;root.querySelector('[data-modalconfirm]').onclick=()=>{let val=textarea?$('modaltext').value:undefined;let ok=onConfirm(val);if(ok!==false)close();};}
function saveCode(){save();return btoa(unescape(encodeURIComponent(JSON.stringify(s))))}
function exportSave(){let code=saveCode();modal('Export your save','Copy this code to move your progress to another browser. Your code includes equipment and Soulfire.',()=>{let t=$('modaltext');t.focus();t.select();if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(code).then(()=>toast('Save copied to clipboard')).catch(()=>toast('Select and copy the code manually'))}else{try{document.execCommand('copy');toast('Save copied if supported')}catch(e){toast('Select and copy the code manually')}}return false},'Copy Code',true);$('modaltext').value=code;}
function importSave(){modal('Import save code','Paste a save code from Emberforge III, Reborn v2, or original Emberforge. This replaces the current save.',v=>{try{let o=JSON.parse(decodeURIComponent(escape(atob(v.trim()))));if(!o||!o.gens||!Number.isFinite(Number(o.ember)))throw Error('Bad save');s=clean(o);if(s.hp===0)s.hp=Math.ceil(maxHealth()*.5);if(s.hp===null)s.hp=maxHealth();if(!(s.enemyHP>0))s.enemyHP=enemy().hp;note('Save imported successfully');save();renderPage();toast('Save imported!');return true}catch(e){toast('Invalid or unsupported save code');return false}},'Import',true)}
function ascend(){let reward=soulReward();if(reward<1){toast('Earn 100K this run first');return}modal('Ascend and Reforge?','Receive +'+reward+' permanent Soulfire. Boss victories, not Ascension, unlock regions, building levels, and new powers. Ember, workers, temporary upgrades, buildings, all equipment and potions reset; permanent progress stays.',()=>{let old=s;s=fresh();for(let k of ['lifetime','clicks','souls','ascensions','ach','skills','skillPoints','level','unlocked','kills','bosses','lootFound','claimed','bounty','bountyStart','codex','combatLevel','combatXP','training','stageUnlocked','bossCleared','firstClears','kingdomVistaMax','kingdomVistaMilestone','avatarBody','avatarName'])s[k]=old[k];s.souls+=reward;s.ascensions++;s.hp=maxHealth();s.combatMessage='A new Ascension era begins! Health and permanent skills remain; equipment and potions have been reset.';s.enemyHP=enemy().hp;note('Ascended for +'+reward+' Soulfire');honorCheck();save();renderPage();toast('Ascension complete! +'+reward+' Soulfire');return true},'Ascend Now')}
root.addEventListener('click',e=>{let b=e.target.closest('button');if(!b||!root.contains(b)||b.disabled)return;
if(Object.prototype.hasOwnProperty.call(b.dataset,'returnHome')){travelToKingdom();go('world');toast('Returned safely to the Kingdom');return}
if(Object.prototype.hasOwnProperty.call(b.dataset,'mapToggle')){caladrynMapCollapsed=!caladrynMapCollapsed;try{window.localStorage.setItem(CALADRYN_MAP_PREFERENCE,caladrynMapCollapsed?'1':'0')}catch(_){}updateCaladrynMapVisibility();return}
if(Object.prototype.hasOwnProperty.call(b.dataset,'mapZoom')){const viewport=$('mapviewport'),zoom=viewport.classList.toggle('zoomed');b.setAttribute('aria-pressed',String(zoom));b.textContent=zoom?'Fit map to window':'Enlarge map';if(!zoom)viewport.scrollLeft=0;return}
if(b.dataset.kingdomTab){setKingdomTab(b.dataset.kingdomTab);return}
if(b.dataset.merchantTab){setMerchantTab(b.dataset.merchantTab);return}
if(b.dataset.avatarGender){const gender=b.dataset.avatarGender;if(gender!=='male'&&gender!=='female')return;s.avatarBody=gender;renderGear();save();return}if(b.dataset.page){go(b.dataset.page);return}if(b.dataset.go){go(b.dataset.go);return}if(b.dataset.sub){sub=b.dataset.sub;renderMastery();return}if(b.dataset.upgradeFilter){s.upgradeView=b.dataset.upgradeFilter;renderUpgrades();save();return}if(b.dataset.buy){buyMode=b.dataset.buy;$$('[data-buy]').forEach(x=>x.classList.toggle('on',x.dataset.buy===buyMode));renderWorkers();return}
if(b.id==='ef4-crystal'){mine();return}
if(b.id==='ef4-strike'){manualAttack();return}
if(b.dataset.merchantGear){buyMerchantGear(b.dataset.merchantGear);return}
if(b.dataset.merchantPotion){buyMerchantPotion(b.dataset.merchantPotion);return}
if(b.dataset.merchantSellPotion){sellMerchantPotion(b.dataset.merchantSellPotion);return}
if(b.dataset.target){let stage=+b.dataset.target;if(stage<=maxSelectable(s.zone)){let wasSmart=s.autoMode==='smart';if(wasSmart){s.autoMode='selected';s.auto=true;}setTarget(stage,{keepAuto:true});if(wasSmart)toast('Switched to farming stage '+stage);save();}return}
if(b.id==='ef4-auto'){if(isDown())return;let options=['off','selected','smart'],idx=options.indexOf(s.autoMode);s.autoMode=options[(idx+1)%3];s.auto=s.autoMode!=='off';s.autoProgress=0;s.smartResting=false;if(s.autoMode==='smart')chooseSmartTarget();if(s.auto&&!s.smartResting)s.engagedUntil=Date.now()+5500;else s.engagedUntil=0;s.combatMessage=s.autoMode==='off'?'Auto-Farm paused.':s.autoMode==='smart'?'Smart Hunt engaged · predicted safest high-tier target':'Auto-Farm repeating selected stage '+s.stage;toast(s.autoMode==='off'?'Auto-Farm off':s.autoMode==='smart'?'Smart Hunt enabled':'Farming stage '+s.stage);stats();return}
if(b.id==='ef4-potion'){usePotion('minor');return}
if(b.id==='ef4-retreat'){retreat();return}
if(b.dataset.train){let t=TRAINING.find(v=>v[0]===b.dataset.train);if(!t||s.training[t[0]]>=trainingCap())return;let cost=trainCost(t);if(s.ember<cost)return;let oldMax=maxHealth();s.ember-=cost;s.training[t[0]]++;if(t[0]==='vitality')s.hp=Math.min(maxHealth(),s.hp+(maxHealth()-oldMax));s.combatMessage=t[1]+' increased to level '+s.training[t[0]];renderTraining();stats();toast(t[1]+' trained');return}

if(b.dataset.worker){let w=workers.find(w=>w[0]===b.dataset.worker);if(!w||!workerUnlocked(w))return;let c=costWorker(w,buyMode);if(c.count<1||s.ember<c.price)return;s.ember-=c.price;s.gens[w[0]]+=c.count;honorCheck();renderWorkers();currencyStats();save();return}
if(b.dataset.upgrade){let u=upgrades.find(u=>u[0]===b.dataset.upgrade);if(!u||!upgradeUnlocked(u)||s.ups[u[0]]||s.ember<u[3])return;s.ember-=u[3];s.ups[u[0]]=true;toast(u[1]+' unlocked!');renderUpgrades();currencyStats();return}
if(b.dataset.build){if(!atKingdom()){toast('Return to the Kingdom to construct buildings.');return}let k=buildings.find(v=>v[0]===b.dataset.build);if(!k)return;let n=costBuild(k);if(!buildingUnlocked(k)||s.build[k[0]]>=buildingCap()||s.ember<n)return;s.ember-=n;s.build[k[0]]++;renderKingdom();currencyStats();honorCheck();return}
if(Object.prototype.hasOwnProperty.call(b.dataset,'zone')){const z=Number(b.dataset.zone);if(!travelToRealm(z)){toast('That realm is still locked. Follow the Ember Road and clear the previous guardian.');return}go('world');$('worldbattle').scrollIntoView?.({behavior:'smooth',block:'start'});toast('Traveled to '+realms[z][0]);return}
if(b.dataset.skill){let k=b.dataset.skill;if(!skills.find(x=>x[0]===k)||(s.skills[k]||0)>=skillCap()||s.skillPoints<1+Math.floor((s.skills[k]||0)/2))return;s.skillPoints-=1+Math.floor((s.skills[k]||0)/2);s.skills[k]=(s.skills[k]||0)+1;honorCheck();renderMastery();currencyStats();return}
if(b.dataset.quest){let q=quests().find(q=>q[0]===b.dataset.quest);if(!q||s.claimed.includes(q[0])||q[3]<q[4])return;s.claimed.push(q[0]);gain(q[5]);toast('Quest completed! +'+fmt(q[5])+' Ember');renderMastery();currencyStats();return}
if(b.dataset.bounty){if(s.kills-s.bountyStart<12)return;let reward=Math.ceil(250*(1+.35*s.bounty)*(1+s.zone));s.bounty++;s.bountyStart=s.kills;gain(reward);toast('Bounty claimed: +'+fmt(reward));renderMastery();currencyStats();return}
if(b.dataset.claimrelic){if(inventoryUsedSlots()>=inventoryCapacity()){toast('Free an inventory slot first');return}let i=s.pendingRelics.findIndex(g=>g.id===b.dataset.claimrelic);if(i>=0){let [g]=s.pendingRelics.splice(i,1);s.items.unshift(g);renderGear();save();toast(g.name+' claimed from vault')}return}
if(b.dataset.lock){let g=s.items.find(g=>g.id===b.dataset.lock);if(g){g.locked=!g.locked;renderGear();save();}return}
if(b.dataset.equip){let g=s.items.find(g=>g.id===b.dataset.equip);if(!g)return;const slot=equipmentSlotFor(g);if(!EQUIPMENT_SLOT_KEYS.includes(slot))return;for(const other of EQUIPMENT_SLOT_KEYS)if(s.equipped[other]===g.id)s.equipped[other]=null;s.equipped[slot]=g.id;renderGear();stats();save();return}if(b.dataset.unequip){if(!EQUIPMENT_SLOT_KEYS.includes(b.dataset.unequip))return;s.equipped[b.dataset.unequip]=null;renderGear();stats();save();return}if(b.dataset.sell){if(!atKingdom())return;let g=s.items.find(g=>g.id===b.dataset.sell);if(!g)return;if(isGearTradeProtected(g)){toast('Unlock and unequip the item first.');return}let sell=()=>{s.items=s.items.filter(x=>x!==g);gain(sellValue(g));renderKingdomMerchant();currencyStats();save()};if(g.rarity==='legendary')modal('Sell this Legendary item?','Permanently sell '+g.name+'. This item cannot be recovered.',()=>{sell();return true},'Sell Legendary');else sell();return}
if(b.dataset.ascend){ascend();return}
if(b.dataset.action){let a=b.dataset.action;if(a==='save'){save();toast('Saved');return}if(a==='export'){exportSave();return}if(a==='import'){importSave();return}if(a==='best'){for(let slot of EQUIPMENT_SLOT_KEYS){let g=s.items.filter(x=>equipmentSlotFor(x)===slot).sort((a,b)=>b.power-a.power)[0];if(g)s.equipped[slot]=g.id}renderGear();stats();save();toast('Best gear equipped');return}
if(a==='reset'){modal('Start a new game?','This clears your current Emberforge III progress. Export a save code first if you might want to restore it.',()=>{s=fresh();kingdomVistaPreview=null;rollBattleBackground();s.enemyHP=enemy().hp;save();go('forge');toast('New adventure started');return true},'Reset Game');return}}
});
root.addEventListener('input',e=>{if(e.target?.id==='ef4-adventurer-name'){s.avatarName=e.target.value.slice(0,32);save()}});
root.addEventListener('focusout',e=>{if(e.target?.id==='ef4-adventurer-name'){s.avatarName=e.target.value.trim().slice(0,32);e.target.value=s.avatarName;save()}});

$('showowned').addEventListener('change',e=>{s.showOwned=e.target.checked;renderUpgrades();save()});
function refreshShopAfford(){if(page==='workers'||page==='upgrades'||page==='world'){root.querySelectorAll('[data-price]').forEach(b=>{let p=+b.dataset.price;if(b.dataset.merchantGear){b.disabled=s.ember<p||inventoryUsedSlots()>=inventoryCapacity();return}if(b.dataset.merchantPotion){let pot=potionDefinition(b.dataset.merchantPotion);b.disabled=!pot||s.ember<p||(potionCount(pot.id)%pot.maxStack===0&&inventoryUsedSlots()>=inventoryCapacity());return}if(b.dataset.worker&&buyMode==='max'){let w=workers.find(x=>x[0]===b.dataset.worker),c=costWorker(w,'max');if(!c||c.count===0){b.disabled=true}else{b.disabled=false;b.dataset.price=c.price;b.textContent='Hire ×'+fmt(c.count)}return}if(b.dataset.train&&s.training[b.dataset.train]>=trainingCap())return;if(b.dataset.upgrade){let u=upgrades.find(v=>v[0]===b.dataset.upgrade);if(!u||s.ups[b.dataset.upgrade]||!upgradeUnlocked(u))return;}if(b.dataset.build){let build=buildings.find(v=>v[0]===b.dataset.build);if(!build||!buildingUnlocked(build)||s.build[b.dataset.build]>=buildingCap())return;}b.disabled=s.ember<p})}if(page==='upgrades'&&s.upgradeView==='affordable')renderUpgrades()}
