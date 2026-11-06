'use strict';
// Caladryn travel changes location without touching loot, progression or item ownership.
function stopForTravel(){
 s.auto=false;
 s.autoMode='off';
 s.autoProgress=0;
 s.smartResting=false;
 s.engagedUntil=0;
 s.enemyTimer=0;
 s.enemyHits=0;
 s.manualAt=0;
 s.enemyHP=enemy().hp;
}
function travelToKingdom(){
 if(atKingdom())return true;
 stopForTravel();
 s.location='kingdom';
 s.combatMessage='Safely returned to the Kingdom. Choose a realm to continue your expedition.';
 note('Returned to the Kingdom');
 save();
 return true;
}
function travelToRealm(index){
 if(!Number.isInteger(index)||index<0||index>=realms.length||!realmAccessible(index))return false;
 if(inExpedition()&&s.zone===index)return true;
 stopForTravel();
 s.location='realm';
 s.zone=index;
 s.stage=1;
 s.stageUnlocked[index]=Math.max(1,s.stageUnlocked[index]||0);
 s.enemyHP=enemy().hp;
 rollBattleBackground();
 s.combatMessage='Arrived in '+realms[index][0]+'. Select a target to begin your hunt.';
 note('Traveled to '+realms[index][0]);
 save();
 return true;
}
