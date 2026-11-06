'use strict';
function currencyStats(){ $('ember').textContent=fmt(s.ember);$('eps').textContent=fmt(income());$('click').textContent=fmt(clicks());$('power').textContent=fmt(power());$('souls').textContent=fmt(s.souls);$('sp').textContent=fmt(s.skillPoints);$('navlevel').textContent='Forge Lv '+s.level+' · Asc '+s.ascensions;}
let lastHuntSignature='';
function updateHuntBoard(){
 let max=maxSelectable(s.zone),cleared=s.firstClears[s.zone]||0,signature=[s.zone,s.stage,max,cleared,s.autoMode,Math.floor(s.combatLevel/3),Math.floor(s.hp/maxHealth()*4)].join('|');
 $('huntprogress').textContent='Cleared '+Math.min(9,cleared)+'/9 · '+(s.bossCleared[s.zone]?'Boss slain':'Boss locked until 9');
 $('huntmode').textContent=s.autoMode==='smart'?(s.smartResting?'Smart · recovering':'Smart Hunt'):s.autoMode==='selected'?'Auto · target':'Manual';
 $('huntstatus').textContent=s.autoMode==='smart'?'Automatically chooses a target predicted to be survivable. Bosses enter Smart Hunt after your first victory.':'Win on a stage to unlock the next (+45% first-clear XP and Ember). Earlier stages remain farmable.';
 $('hunttip').textContent= max<10?'Stage '+Math.min(10,max+1)+' unlocks after your first win on stage '+max+'.':'Boss unlocked · select stage 10 to challenge or farm earlier stages.';
 $('farmforecast').textContent='Safe target: '+(bestFarmStage()||'rest')+' · Drops: '+(s.stage===10?'Rare+ chest, Epic possible'+(s.zone>=3?', ultra-rare Legendary':''):LOOT_REGIONS[s.zone][s.stage<=3?'early':s.stage<=6?'mid':'late'].slice(0,2).map(x=>x[0]).join(' / '));
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
 $('homebossnote').textContent=boss?'Boss encounter · Rare+ chest. Epic boss-only; Legendary in later realms.':'Choose and repeat any unlocked stage. New stages unlock after first victories.';
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
 $('regen').textContent='Regen +'+fmt(realRecovery(active))+' HP/s';
 $('enemyattack').textContent='Enemy hit '+fmt(foeRawDamage())+' · Every '+foeAttackInterval().toFixed(2)+'s';
 $('enemytimerbar').style.width=(active?Math.min(100,s.enemyTimer/foeAttackInterval()*100):0)+'%';
 $('strike').textContent=down?'Recovering...':boss?'Strike Boss':'Strike';$('strike').disabled=down||now<s.manualAt;
 $('manualbar').style.width=(down?0:Math.min(100,100*(1-Math.max(0,s.manualAt-now)/650)))+'%';
 $('auto').textContent=s.autoMode==='smart'?'Smart Hunt':s.autoMode==='selected'?'Farm Target':'Auto OFF';$('auto').disabled=down;$('auto').classList.toggle('btn-gold',s.auto);
 $('potion').textContent=now<s.potionReady?'Potion '+Math.ceil((s.potionReady-now)/1000)+'s':'Heal '+fmt(potionCost());$('potion').disabled=down||s.hp>=hpMax||now<s.potionReady||s.ember<potionCost();
 $('retreat').disabled=down||(!active&&s.enemyHP===e.hp);
 $('combatmessage').textContent=s.combatMessage||'Ready for battle';$('combatmessage').classList.toggle('danger',down||s.hp/hpMax<.2);$('combatmessage').classList.toggle('warning',!down&&s.hp/hpMax<.4);
 $('autodesc').textContent=s.autoMode==='smart'?(s.smartResting?'Smart Hunt is resting to recover HP.':'Smart Hunt targets the highest predicted survivable encounter. Proven bosses are eligible.') :s.autoMode==='selected'?'Auto-Farm repeats stage '+s.stage+'. Enemies fight back; retreat or change the target anytime.':'Manual mode · Attack cooldown 0.65s. Select a stage, then strike. Auto cycles OFF → Farm → Smart.';
 $('battlescene').className='scene illustrated zone'+s.zone+(boss?' bosswave':'');$('bosslootnote').style.display=boss?'block':'none';
 $('combattip').textContent=boss?'Bosses strike hard with a special every fourth hit. Epic drops are boss-only; Legendary drops start at Obsidian Wastes.':'Each stage can be farmed repeatedly. New stages unlock one at a time after first victories. A safe farming target improves XP and loot.';
 updateHuntBoard();
 let next=s.zone<5?s.zone+1:5;
 $('nextgate').textContent=s.zone<5?'Next realm: '+realms[next][0]+' · Combat Lv '+REALM_LEVELS[next]+', Ascension '+REALM_ASCENSIONS[next]+' and previous boss defeated.':'Endgame unlocked · defeat the Ash King and master the final era.';
 setIcon('crystalicon','crystal','crystalHero');setIcon('forgecrest','altar','lg');setIcon('expeditionicon','swords','sm');
 setIcon('card-workers','pickaxe','lg');setIcon('card-gear','backpack','lg');setIcon('card-mastery','altar','lg');setIcon('salvageicon','gear','sm');
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
 <div class="efa-metric"><span>Ascension tier</span><strong>${s.ascensions}</strong></div>`;
 $('upgradehint').textContent=view==='all'?'Future powers are previews; unlock their requirements before purchasing.':'Higher-tier powers reveal themselves as your Forge, Combat level and Ascensions grow.';
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
function renderKingdom(){let cap=buildingCap();updateIllustratedScenes();$('kingdominfo').innerHTML=`Current building capacity: <strong>level ${cap}/12</strong> per structure · Ascend to raise it. Buildings now preview humble, growing, and grand visual tiers as they level.`;
$('buildlist').innerHTML=buildings.filter(b=>buildingUnlocked(b)||s.build[b[0]]>0).map(b=>{let lv=s.build[b[0]],p=costBuild(b),available=buildingUnlocked(b),maxed=lv>=cap,t=buildTier(lv),next=t<3?(t===0?1:t===1?4:8):null;return `<div class="shopitem ${available?'':'locked-card'}"><div class="space"><span class="small-icon">${iconHTML(b[2],'lg')}</span><span class="pill">Level ${lv} / ${cap}</span></div><strong>${b[1]}</strong><div class="hint">${b[5]}</div><div class="progress"><div style="width:${100*Math.min(12,lv)/12}%;background:#80d9bf"></div></div><div class="build-tier-note"><strong>${BUILD_TIER_NAMES[t]}</strong> · ${BUILD_TIER_NOTES[b[0]][t]}</div><div class="hint kingdom-need">${available?maxed&&cap<12?'More levels unlock after Ascension':'Unlocked':'Dormant until Asc '+buildingReq(b)[1]+', Combat '+buildingReq(b)[2]}</div><div class="tier-next">${next!==null?'Next visual jump at level '+next:'Visual line complete for this era.'}</div><div class="shopbottom"><span class="price">${maxed?'Era cap':short(p)}</span>${shopButton('build',b[0],p,maxed||!available||s.ember<p,maxed?'Era cap':!available?'Locked':'Construct')}</div></div>`}).join('');let future=buildings.filter(b=>!buildingUnlocked(b)&&!s.build[b[0]]).slice(0,2);if(future.length)$('buildlist').innerHTML+=`<div class="upgrade-empty"><strong>Coming in later eras</strong><div class="hint" style="margin-top:7px">${future.map(b=>b[1]+' · Asc '+buildingReq(b)[1]+' / Combat '+buildingReq(b)[2]).join(' · ')}</div></div>`}
function renderGear(){
 const makeSlot=(key)=>{
   const def=EQUIPMENT_SLOTS.find(x=>x[0]===key);
   if(!def)return '';
   const g=equippedItem(key),label=def[1],type=equipmentPowerType(key);
   return `<div class="efg-slot ${g?'filled '+g.rarity+'-gear':'empty'}" data-slot="${key}" aria-label="${esc(label)} equipment slot">
     <div class="efg-slot-art">${g?lootVisual(g.icon,'lg'):iconHTML(def[2],'lg')}</div>
     <div class="efg-slot-details"><span class="efg-slot-name">${esc(label)}</span><strong class="rarity-${g?g.rarity:'common'}">${g?esc(g.name):'Empty slot'}</strong>${g?`<small>+${fmt(g.power)} ${type}</small>`:''}${g?.ability?`<small>${lootAbilityText(g)}</small>`:''}</div>
     ${g?`<button class="efg-remove btn btn-quiet" data-unequip="${key}" aria-label="Unequip ${esc(label)}">Remove</button>`:''}
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
 $('salvagefilter').value=s.salvage;$('bagtitle').textContent='Backpack ('+s.items.length+' / 60)';let sorted=[...s.items].sort((a,b)=>rarityValue[b.rarity]-rarityValue[a.rarity]||b.power-a.power);
 $('baglist').innerHTML=sorted.length?sorted.map(g=>{let equipped=Object.values(s.equipped).includes(g.id);return `<div class="rowitem ${g.rarity}-gear"><span class="r-ico">${lootVisual(g.icon,'lg')}</span><div class="r-body"><strong class="rarity-${g.rarity}">${g.rarity.toUpperCase()} · ${esc(g.name)}</strong><span class="hint">+${fmt(g.power)} ${equipmentPowerType(equipmentSlotFor(g))} · ${realms[g.origin||0][0]} · sell ${fmt(sellValue(g))} Ember</span>${g.ability?`<span class="hint loot-ability">${lootAbilityText(g)}</span>`:''}</div><button class="item-lock ${g.locked?'locked':''}" data-lock="${esc(g.id)}" title="${g.locked?'Unlock item':'Protect item'}">${g.locked?'🔒':'🔓'}</button><button class="btn" data-equip="${esc(g.id)}" ${equipped?'disabled':''}>${equipped?'Equipped':'Equip'}</button><button class="btn btn-quiet" data-sell="${esc(g.id)}" ${equipped||g.locked?'disabled':''}>Sell</button></div>`}).join(''):'<div class="card hint" style="text-align:center;padding:24px">No equipment yet. Farm early stages for rusty daggers and swords. Bosses guarantee a gear chest.</div>';if(s.pendingRelics.length){$('baglist').insertAdjacentHTML('beforeend','<div class="card"><div class="section">Legendary Relic Vault · '+s.pendingRelics.length+' waiting</div><div class="hint" style="margin-bottom:10px">Your bag was full, so these Legendary drops were preserved instead of sold.</div>'+s.pendingRelics.map(g=>'<div class="rowitem legendary-gear"><span class="r-ico">'+lootVisual(g.icon,'lg')+'</span><div class="r-body"><strong class="rarity-legendary">'+esc(g.name)+'</strong><span class="hint">+'+fmt(g.power)+' rating · '+lootAbilityText(g)+'</span></div><button class="btn btn-gold" data-claimrelic="'+esc(g.id)+'" '+(s.items.length>=60?'disabled':'')+'>Claim</button></div>').join('')+'</div>');}
}
function renderWorld(){
 let next=realms.findIndex((r,i)=>!realmAccessible(i));if(next<0)next=5;
 $('worldinfo').innerHTML=`<strong>Ascension era ${s.ascensions}</strong> · Combat Lv ${s.combatLevel}. Later realms require specific Ascension milestones even if you have already beaten their guardian. Your earlier discoveries are preserved.`;
 $('maplist').innerHTML=realms.map((r,i)=>{let discovered=i<=s.unlocked,levelLocked=s.combatLevel<REALM_LEVELS[i],ascLocked=s.ascensions<REALM_ASCENSIONS[i],available=realmAccessible(i),selected=i===s.zone,foe=encounterBook().find(x=>x.realm===i&&!x.boss),boss=encounterBook().find(x=>x.realm===i&&x.boss);let why=[];if(!discovered)why.push('previous boss');if(ascLocked)why.push('Ascension '+REALM_ASCENSIONS[i]);if(levelLocked)why.push('Combat Lv '+REALM_LEVELS[i]);return `<button class="maptile ${selected?'selected':''}" data-zone="${i}" ${!available?'disabled':''}><div class="space"><span class="duoicons">${discovered?monsterSheetHTML(i,1,'duo'):iconHTML('vault','lg')}${discovered?iconHTML(boss.icon,'lg'):''}</span><span class="pill">${selected?'Exploring':available?'Available':discovered?'Discovered · Gated':'Locked'}</span></div><strong>${r[0]}</strong><div class="hint">${available?selected?'Stage '+s.stage+'/10 · unlocked '+maxSelectable(i)+'/10':'Click to travel':'Requires '+why.join(' + ')}</div><div class="map-req">Asc ${REALM_ASCENSIONS[i]} · Combat Lv ${REALM_LEVELS[i]}${i?' · boss clear':''}</div><div class="hint" style="margin-top:4px"><strong>${foe.name}</strong> · <span class="mapboss">Boss: ${boss.name}</span></div></button>`}).join('')}
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
if(sub==='bestiary'){html='<div class="space" style="margin-bottom:10px"><div class="hint">Track every realm enemy and boss. Bosses are the only source of <strong>Epic</strong> and <strong>Legendary</strong> loot.</div><span class="pill">Entries '+encounterBook().length+'</span></div><div class="bestiary-grid">'+encounterBook().map(ent=>{let seen=(s.zone===ent.realm&&ent.stage<=maxSelectable(ent.realm))||ent.realm<s.unlocked||((s.codex[ent.id]||0)>0),kills=s.codex[ent.id]||0;return `<div class="codexcard ${seen?'':'locked'}"><div class="codeico">${seen?(ent.boss?iconHTML(ent.icon,'xl'):monsterSheetHTML(ent.realm,ent.stage,'codex')):iconHTML('vault','xl')}</div><div class="codebody"><div class="realmnote">${realms[ent.realm][0]}</div><div class="codextype ${ent.boss?'boss':''}">${ent.boss?'Boss':'Enemy'}</div><strong>${seen?ent.name:'Unknown encounter'}</strong><div class="hint" style="margin-top:4px">${seen?ent.desc:'Defeat earlier bosses to reveal this entry.'}</div><div class="hint" style="margin-top:6px">Defeats: ${fmt(kills)}${ent.boss?' · Boss chest eligible':''}</div></div></div>`}).join('')+'</div>'}
if(sub==='ascend'){let reward=soulReward(),next=ascendTarget(),prog=Math.min(100,100*s.runEarned/next);let lastLoot=s.lastBossLoot?`<div class="hint" style="margin-top:10px">Last boss chest: <span class="rarity-${s.lastBossLoot.rarity}">${s.lastBossLoot.rarity.toUpperCase()}</span> ${esc(s.lastBossLoot.name)} · +${fmt(s.lastBossLoot.power)} damage</div>`:'';html=`<div class="card" style="background:radial-gradient(ellipse at 50% 5%,#3a3257,#16213a 80%);text-align:center;padding:28px 18px"><div style="display:flex;justify-content:center;margin:4px auto 14px">${iconHTML("altar","hero")}</div><div style="font-size:22px;font-weight:850">Ascension Altar</div><div class="hint" style="margin:8px auto 14px;max-width:380px">Sacrifice your current run to gain permanent Soulfire. Soulfire permanently empowers production and combat with diminishing returns. Each Ascension unlocks more upgrades, skills, and world regions.</div><div class="grid2" style="max-width:330px;margin:0 auto 14px"><div class="stat"><div class="label">This run</div><div class="big">${fmt(s.runEarned)}</div></div><div class="stat"><div class="label">Soulfire reward</div><div class="big" style="color:#e2bdff">+${fmt(reward)}</div></div></div><div class="progress" style="margin-bottom:10px"><div style="width:${prog}%;background:#ae80ee"></div></div><div class="hint" style="margin-bottom:14px">${reward?'Ascension is ready!':'Earn '+fmt(next-s.runEarned)+' more Ember to ascend. Next era unlocks higher caps.'}</div><button class="btn btn-gold" data-ascend="1" ${reward<1?'disabled':''}>Ascend ${reward?'for +'+reward+' Soulfire':'· Locked'}</button><div class="hint" style="margin-top:13px">Resets Ember, workers, temporary upgrades, buildings and the selected battle target (not stage unlocks). Keeps combat levels, permanent training, equipment, skills, Soulfire and discoveries. Training and skill caps rise after each Ascension.</div>${lastLoot}</div>`}
box.innerHTML=html;if(sub==='ascend'){
let row=REALM_ASCENSIONS.map((a,i)=>`<div class="rowitem" style="opacity:${s.ascensions>=a?1:.78}"><span class="r-ico">${iconHTML(realms[i][1],'lg')}</span><div class="r-body"><strong>${realms[i][0]}</strong><span class="hint">Ascension ${a} · Combat Lv ${REALM_LEVELS[i]} · previous guardian defeated</span></div><span class="pill">${s.ascensions>=a?'Era unlocked':'Future era'}</span></div>`).join('');
box.insertAdjacentHTML('beforeend',`<div class="card" style="margin-top:12px"><div class="section">Realm unlock roadmap</div><div class="stack" style="gap:7px">${row}</div><div class="hint" style="margin-top:10px">Each new era also raises building capacity by 2 levels and training capacity by 3 levels.</div></div>`)
}}
function renderPage(){currencyStats();if(page==='workers')renderWorkers();if(page==='upgrades')renderUpgrades();if(page==='gear')renderGear();if(page==='kingdom')renderKingdom();if(page==='world')renderWorld();if(page==='battle')renderTraining();if(page==='mastery')renderMastery();stats()}
function go(p){page=p;$$('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===p));$$('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===p));renderPage();}
function modal(title,body,onConfirm,confirmLabel='Confirm',textarea=false){modalOpen=true;$('modal').style.display='block';$('modal').innerHTML=`<div class="modaloverlay"><div class="modal"><div style="font-size:19px;font-weight:850;margin-bottom:9px">${esc(title)}</div><div class="hint" style="font-size:12px;margin-bottom:15px">${esc(body)}</div>${textarea?'<textarea id="ef4-modaltext" class="textentry" spellcheck="false"></textarea>':''}<div class="two-actions" style="justify-content:flex-end;margin-top:17px"><button class="btn" data-modalcancel="1">Cancel</button><button class="btn btn-gold" data-modalconfirm="1">${esc(confirmLabel)}</button></div></div></div>`;let close=()=>{$('modal').style.display='none';modalOpen=false};root.querySelector('[data-modalcancel]').onclick=close;root.querySelector('[data-modalconfirm]').onclick=()=>{let val=textarea?$('modaltext').value:undefined;let ok=onConfirm(val);if(ok!==false)close();};}
function inventorySell(predicate){let chosen=s.items.filter(g=>!g.locked&&g.rarity!=='legendary'&&!Object.values(s.equipped).includes(g.id)&&predicate(g));if(!chosen.length){toast('No matching unequipped items.');return}let total=chosen.reduce((v,g)=>v+sellValue(g),0);s.items=s.items.filter(g=>!chosen.includes(g));gain(total);toast('Salvaged '+chosen.length+' items · +'+fmt(total)+' Ember');renderPage();}
function saveCode(){save();return btoa(unescape(encodeURIComponent(JSON.stringify(s))))}
function exportSave(){let code=saveCode();modal('Export your save','Copy this code to move your progress to another browser. Your code includes equipment and Soulfire.',()=>{let t=$('modaltext');t.focus();t.select();if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(code).then(()=>toast('Save copied to clipboard')).catch(()=>toast('Select and copy the code manually'))}else{try{document.execCommand('copy');toast('Save copied if supported')}catch(e){toast('Select and copy the code manually')}}return false},'Copy Code',true);$('modaltext').value=code;}
function importSave(){modal('Import save code','Paste a save code from Emberforge III, Reborn v2, or original Emberforge. This replaces the current save.',v=>{try{let o=JSON.parse(decodeURIComponent(escape(atob(v.trim()))));if(!o||!o.gens||!Number.isFinite(Number(o.ember)))throw Error('Bad save');s=clean(o);if(s.hp===0)s.hp=Math.ceil(maxHealth()*.5);if(s.hp===null)s.hp=maxHealth();if(!(s.enemyHP>0))s.enemyHP=enemy().hp;note('Save imported successfully');save();renderPage();toast('Save imported!');return true}catch(e){toast('Invalid or unsupported save code');return false}},'Import',true)}
function ascend(){let reward=soulReward();if(reward<1){toast('Earn 100K this run first');return}modal('Ascend and Reforge?','Receive +'+reward+' permanent Soulfire. The new era raises building, skill and training caps and unlocks additional powers and regions. Ember, workers, temporary upgrades and buildings reset; permanent progress stays.',()=>{let old=s;s=fresh();for(let k of ['lifetime','clicks','souls','ascensions','ach','skills','skillPoints','level','unlocked','kills','bosses','lootFound','items','equipped','claimed','bounty','bountyStart','codex','lastBossLoot','combatLevel','combatXP','training','stageUnlocked','bossCleared','firstClears','pendingRelics','kingdomVistaMax','avatarBody','avatarName'])s[k]=old[k];s.souls+=reward;s.ascensions++;s.hp=maxHealth();s.combatMessage='A new Ascension era begins! Permanent stats grow stronger.';s.enemyHP=enemy().hp;note('Ascended for +'+reward+' Soulfire');honorCheck();save();renderPage();toast('Ascension complete! +'+reward+' Soulfire');return true},'Ascend Now')}
root.addEventListener('click',e=>{let b=e.target.closest('button');if(!b||!root.contains(b)||b.disabled)return;
if(b.dataset.avatarGender){const gender=b.dataset.avatarGender;if(gender!=='male'&&gender!=='female')return;s.avatarBody=gender;renderGear();save();return}if(b.dataset.vista){let choice=b.dataset.vista;if(choice==='auto')kingdomVistaPreview=null;else{let idx=activeKingdomVista();kingdomVistaPreview=(idx+(choice==='next'?1:-1)+KINGDOM_VISTAS.length)%KINGDOM_VISTAS.length;}updateIllustratedScenes();return}if(b.dataset.page){go(b.dataset.page);return}if(b.dataset.go){go(b.dataset.go);return}if(b.dataset.sub){sub=b.dataset.sub;renderMastery();return}if(b.dataset.upgradeFilter){s.upgradeView=b.dataset.upgradeFilter;renderUpgrades();save();return}if(b.dataset.buy){buyMode=b.dataset.buy;$$('[data-buy]').forEach(x=>x.classList.toggle('on',x.dataset.buy===buyMode));renderWorkers();return}
if(b.id==='ef4-crystal'){mine();return}
if(b.id==='ef4-strike'){manualAttack();return}
if(b.dataset.target){let stage=+b.dataset.target;if(stage<=maxSelectable(s.zone)){let wasSmart=s.autoMode==='smart';if(wasSmart){s.autoMode='selected';s.auto=true;}setTarget(stage,{keepAuto:true});if(wasSmart)toast('Switched to farming stage '+stage);save();}return}
if(b.id==='ef4-auto'){if(isDown())return;let options=['off','selected','smart'],idx=options.indexOf(s.autoMode);s.autoMode=options[(idx+1)%3];s.auto=s.autoMode!=='off';s.autoProgress=0;s.smartResting=false;if(s.autoMode==='smart')chooseSmartTarget();if(s.auto&&!s.smartResting)s.engagedUntil=Date.now()+5500;else s.engagedUntil=0;s.combatMessage=s.autoMode==='off'?'Auto-Farm paused.':s.autoMode==='smart'?'Smart Hunt engaged · predicted safest high-tier target':'Auto-Farm repeating selected stage '+s.stage;toast(s.autoMode==='off'?'Auto-Farm off':s.autoMode==='smart'?'Smart Hunt enabled':'Farming stage '+s.stage);stats();return}
if(b.id==='ef4-potion'){usePotion();return}
if(b.id==='ef4-retreat'){retreat();return}
if(b.dataset.train){let t=TRAINING.find(v=>v[0]===b.dataset.train);if(!t||s.training[t[0]]>=trainingCap())return;let cost=trainCost(t);if(s.ember<cost)return;let oldMax=maxHealth();s.ember-=cost;s.training[t[0]]++;if(t[0]==='vitality')s.hp=Math.min(maxHealth(),s.hp+(maxHealth()-oldMax));s.combatMessage=t[1]+' increased to level '+s.training[t[0]];renderTraining();stats();toast(t[1]+' trained');return}

if(b.dataset.worker){let w=workers.find(w=>w[0]===b.dataset.worker);if(!w||!workerUnlocked(w))return;let c=costWorker(w,buyMode);if(c.count<1||s.ember<c.price)return;s.ember-=c.price;s.gens[w[0]]+=c.count;honorCheck();renderWorkers();currencyStats();save();return}
if(b.dataset.upgrade){let u=upgrades.find(u=>u[0]===b.dataset.upgrade);if(!u||!upgradeUnlocked(u)||s.ups[u[0]]||s.ember<u[3])return;s.ember-=u[3];s.ups[u[0]]=true;toast(u[1]+' unlocked!');renderUpgrades();currencyStats();return}
if(b.dataset.build){let k=buildings.find(v=>v[0]===b.dataset.build);if(!k)return;let n=costBuild(k);if(!buildingUnlocked(k)||s.build[k[0]]>=buildingCap()||s.ember<n)return;s.ember-=n;s.build[k[0]]++;renderKingdom();currencyStats();honorCheck();return}
if(b.dataset.zone){let z=+b.dataset.zone;if(!realmAccessible(z)){toast('Requires Asc '+REALM_ASCENSIONS[z]+', Combat Lv '+REALM_LEVELS[z]+' and previous boss');return}s.zone=z;s.stage=1;rollBattleBackground();s.stageUnlocked[z]=Math.max(1,s.stageUnlocked[z]||0);s.enemyHP=enemy().hp;s.enemyTimer=0;s.enemyHits=0;s.auto=false;s.autoMode='off';s.smartResting=false;s.engagedUntil=0;s.combatMessage='Entered '+realms[z][0]+'. Rested before engaging.';note('Traveled to '+realms[z][0]);go('battle');toast('Entered '+realms[z][0]);return}
if(b.dataset.skill){let k=b.dataset.skill;if(!skills.find(x=>x[0]===k)||(s.skills[k]||0)>=skillCap()||s.skillPoints<1+Math.floor((s.skills[k]||0)/2))return;s.skillPoints-=1+Math.floor((s.skills[k]||0)/2);s.skills[k]=(s.skills[k]||0)+1;honorCheck();renderMastery();currencyStats();return}
if(b.dataset.quest){let q=quests().find(q=>q[0]===b.dataset.quest);if(!q||s.claimed.includes(q[0])||q[3]<q[4])return;s.claimed.push(q[0]);gain(q[5]);toast('Quest completed! +'+fmt(q[5])+' Ember');renderMastery();currencyStats();return}
if(b.dataset.bounty){if(s.kills-s.bountyStart<12)return;let reward=Math.ceil(250*(1+.35*s.bounty)*(1+s.zone));s.bounty++;s.bountyStart=s.kills;gain(reward);toast('Bounty claimed: +'+fmt(reward));renderMastery();currencyStats();return}
if(b.dataset.claimrelic){if(s.items.length>=60){toast('Free an inventory slot first');return}let i=s.pendingRelics.findIndex(g=>g.id===b.dataset.claimrelic);if(i>=0){let [g]=s.pendingRelics.splice(i,1);s.items.unshift(g);renderGear();save();toast(g.name+' claimed from vault')}return}
if(b.dataset.lock){let g=s.items.find(g=>g.id===b.dataset.lock);if(g){g.locked=!g.locked;renderGear();save();}return}
if(b.dataset.equip){let g=s.items.find(g=>g.id===b.dataset.equip);if(!g)return;const slot=equipmentSlotFor(g);if(!EQUIPMENT_SLOT_KEYS.includes(slot))return;for(const other of EQUIPMENT_SLOT_KEYS)if(s.equipped[other]===g.id)s.equipped[other]=null;s.equipped[slot]=g.id;renderGear();stats();save();return}if(b.dataset.unequip){if(!EQUIPMENT_SLOT_KEYS.includes(b.dataset.unequip))return;s.equipped[b.dataset.unequip]=null;renderGear();stats();save();return}if(b.dataset.sell){let g=s.items.find(g=>g.id===b.dataset.sell);if(!g)return;if(g.locked||Object.values(s.equipped).includes(g.id)){toast('Unlock and unequip the item first.');return}let sell=()=>{s.items=s.items.filter(x=>x!==g);gain(sellValue(g));renderGear();currencyStats()};if(g.rarity==='legendary')modal('Sell this Legendary item?','Permanently salvage '+g.name+'. This item cannot be recovered.',()=>{sell();return true},'Sell Legendary');else sell();return}
if(b.dataset.ascend){ascend();return}
if(b.dataset.action){let a=b.dataset.action;if(a==='save'){save();toast('Saved');return}if(a==='export'){exportSave();return}if(a==='import'){importSave();return}if(a==='best'){for(let slot of EQUIPMENT_SLOT_KEYS){let g=s.items.filter(x=>equipmentSlotFor(x)===slot).sort((a,b)=>b.power-a.power)[0];if(g)s.equipped[slot]=g.id}renderGear();stats();save();toast('Best gear equipped');return}
if(a==='salvage-common'){inventorySell(g=>g.rarity==='common');return}if(a==='salvage-rare'){inventorySell(g=>rarityValue[g.rarity]<=1);return}if(a==='salvage-epic'){inventorySell(g=>rarityValue[g.rarity]<=2);return}if(a==='salvage-all'){modal('Salvage unequipped gear?','Sell every unlocked unequipped item up through Epic rarity. Legendary gear is always protected.',()=>{inventorySell(()=>true);return true},'Salvage All');return}if(a==='reset'){modal('Start a new game?','This clears your current Emberforge III progress. Export a save code first if you might want to restore it.',()=>{s=fresh();kingdomVistaPreview=null;rollBattleBackground();s.enemyHP=enemy().hp;save();go('forge');toast('New adventure started');return true},'Reset Game');return}}
});
root.addEventListener('input',e=>{if(e.target?.id==='ef4-adventurer-name'){s.avatarName=e.target.value.slice(0,32);save()}});
root.addEventListener('focusout',e=>{if(e.target?.id==='ef4-adventurer-name'){s.avatarName=e.target.value.trim().slice(0,32);e.target.value=s.avatarName;save()}});
$('salvagefilter').addEventListener('change',v=>{s.salvage=v.target.value;save();toast('Auto-salvage: '+$('salvagefilter').selectedOptions[0].textContent)});

$('showowned').addEventListener('change',e=>{s.showOwned=e.target.checked;renderUpgrades();save()});
function refreshShopAfford(){if(page==='workers'||page==='upgrades'||page==='kingdom'||page==='battle'){root.querySelectorAll('[data-price]').forEach(b=>{let p=+b.dataset.price;if(b.dataset.worker&&buyMode==='max'){let w=workers.find(x=>x[0]===b.dataset.worker),c=costWorker(w,'max');if(!c||c.count===0){b.disabled=true}else{b.disabled=false;b.dataset.price=c.price;b.textContent='Hire ×'+fmt(c.count)}return}if(b.dataset.train&&s.training[b.dataset.train]>=trainingCap())return;if(b.dataset.upgrade){let u=upgrades.find(v=>v[0]===b.dataset.upgrade);if(!u||s.ups[b.dataset.upgrade]||!upgradeUnlocked(u))return;}if(b.dataset.build){let build=buildings.find(v=>v[0]===b.dataset.build);if(!build||!buildingUnlocked(build)||s.build[b.dataset.build]>=buildingCap())return;}b.disabled=s.ember<p})}if(page==='upgrades'&&s.upgradeView==='affordable')renderUpgrades()}
