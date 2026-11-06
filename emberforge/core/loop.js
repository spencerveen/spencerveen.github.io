'use strict';
function tick(now){let dt=Math.max(0,Math.min(.5,(now-last)/1000));last=now;gain(income()*dt);
let timestamp=Date.now();
if(s.hp===null)s.hp=maxHealth();
if(s.downUntil&&timestamp>=s.downUntil){s.downUntil=0;s.hp=Math.max(1,Math.floor(maxHealth()*.5));s.combatMessage='Recovered with 50% health. Rest or heal before another fight.';toast('Recovered from defeat');}
if(s.autoMode==='smart'&&!isDown()){
 if(!s.smartResting&&s.hp<maxHealth()*.30){s.smartResting=true;s.engagedUntil=0;s.autoProgress=0;s.combatMessage='Smart Hunt is recovering before continuing.';}
 if(s.smartResting&&s.hp>=maxHealth()*.82){s.smartResting=false;chooseSmartTarget();}
}
let fighting=activeFight();
if(!isDown())s.hp=Math.min(maxHealth(),s.hp+realRecovery(fighting)*dt);
if(fighting){
 if(s.auto&&!s.smartResting){s.autoProgress+=dt;let steps=0,interval=autoInterval();while(s.autoProgress>=interval&&steps<8&&!isDown()){s.autoProgress-=interval;damage(autoPower());steps++;}}
 if(activeFight()){s.enemyTimer+=dt;let steps=0,interval=foeAttackInterval();while(s.enemyTimer>=interval&&steps<4&&!isDown()){s.enemyTimer-=interval;takeHit();steps++;}}
}else{
 s.enemyTimer=0;
 if(s.enemyHP<enemy().hp)s.enemyHP=Math.min(enemy().hp,s.enemyHP+enemy().hp*.12*dt);
}
elapsedUI+=dt;elapsedAutoSave+=dt;elapsedShop+=dt;if(elapsedUI>.2){stats();elapsedUI=0}if(needsMain){if(page==='gear'||page==='mastery'||page==='world'||page==='battle')renderPage();needsMain=false}if(elapsedShop>1.5){refreshShopAfford();elapsedShop=0}if(elapsedAutoSave>10){save();elapsedAutoSave=0}requestAnimationFrame(tick)}
// The browser UI calls this API rather than simulating clicks on hidden controls.
// Keep engine state, combat timers, and save data owned by the game itself.
window.EmberforgeGame=Object.freeze({
  getCombatState:()=>({
    zone:s.zone,stage:s.stage,maxStage:maxSelectable(s.zone),
    auto:s.auto,autoMode:s.autoMode,enemyHP:s.enemyHP,
    playerHP:s.hp,down:isDown()
  }),
  selectStage:(stage)=>{
    if(!Number.isInteger(stage)||isDown())return false;
    const changed=setTarget(stage,{keepAuto:true});
    if(changed){stats();save();}
    return changed;
  },
  setAutoAttack:(enabled)=>{
    if(isDown())return false;
    s.autoMode=enabled?'selected':'off';
    s.auto=!!enabled;
    s.smartResting=false;
    s.autoProgress=0;
    if(enabled){s.engagedUntil=Date.now()+5500;}
    else {s.engagedUntil=0;s.enemyTimer=0;}
    stats();save();
    return true;
  },
  strike:()=>{if(isDown())return false;manualAttack();return true;},
  heal:()=>{if(isDown())return false;usePotion();return true;}
});
load();rollBattleBackground();if(s.hp===0&&!s.downUntil)s.hp=Math.ceil(maxHealth()*.5);if(s.hp===null||!Number.isFinite(s.hp))s.hp=maxHealth();s.hp=Math.min(maxHealth(),s.hp);if(s.enemyHP<=0)s.enemyHP=enemy().hp;let offline=Math.min(28800,Math.max(0,(Date.now()-s.updated)/1000));if(offline>10){let amount=income()*offline*.5;gain(amount);if(amount>0)note('Offline income +'+fmt(amount)+' Ember')}honorCheck();stats();go('forge');save();requestAnimationFrame(tick);window.addEventListener('pagehide',save);let hiddenAt=null;document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenAt=Date.now();save()}else if(hiddenAt){let secs=Math.min(28800,Math.max(0,(Date.now()-hiddenAt)/1000));if(secs>5){let n=income()*secs*.5;gain(n);if(n>0)note('Away earnings: +'+fmt(n)+' Ember');}last=performance.now();hiddenAt=null;renderPage()}});
