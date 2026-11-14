// Player survival rules. Future meals and weapons can extend these tables.
export const SURVIVAL=Object.freeze({
 health:100,stamina:100,hunger:100,
 hungerDrain:.11,staminaRegen:5,starvingRegen:.8,healthRegen:.15,
 sprintCost:11,
 starvingStaminaMax:45,
 berryHunger:24,berryStamina:12,berryBonus:20,berryDuration:120,
 gatherCost:Object.freeze({wood:6,stone:5,food:2,cut:8}),
 weaponSwingCost:10
});
export function clamp(value,min,max){return Math.min(max,Math.max(min,value))}
export function maxStamina(vitals){
 return (vitals.hunger<=0?SURVIVAL.starvingStaminaMax:SURVIVAL.stamina)+
  (vitals.foodSeconds>0?SURVIVAL.berryBonus:0);
}
export function freshSurvival(){return {health:SURVIVAL.health,stamina:SURVIVAL.stamina,hunger:SURVIVAL.hunger,foodSeconds:0,gameOver:false,deathCount:0}}
export function normalizeSurvival(raw){
 const fresh=freshSurvival(),v=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
 const number=(key,max)=>Number.isFinite(Number(v[key]))?clamp(Number(v[key]),0,max):fresh[key];
 const result={health:number("health",100),stamina:number("stamina",120),hunger:number("hunger",100),
  foodSeconds:number("foodSeconds",120),gameOver:v.gameOver===true,
  deathCount:Number.isSafeInteger(v.deathCount)&&v.deathCount>=0?v.deathCount:0};
 result.stamina=clamp(result.stamina,0,maxStamina(result));
 if(result.gameOver)result.health=0;
 return result;
}
export function spendStamina(vitals,amount){
 if(!Number.isFinite(amount)||amount<=0)return false;
 if(vitals.gameOver||vitals.health<=0||vitals.stamina+1e-8<amount)return false;
 vitals.stamina=Math.max(0,vitals.stamina-amount);
 return true;
}
export function advanceVitals(vitals,seconds,sprinting=false){
 if(vitals.gameOver||vitals.health<=0||seconds<=0)return false;
 const old={...vitals};
 const dt=clamp(seconds,0,5);
 vitals.hunger=clamp(vitals.hunger-SURVIVAL.hungerDrain*dt,0,100);
 vitals.foodSeconds=Math.max(0,vitals.foodSeconds-dt);
 vitals.stamina=Math.min(vitals.stamina,maxStamina(vitals));
 if(!sprinting){
  const regen=vitals.hunger<=0?SURVIVAL.starvingRegen:
   vitals.hunger<25?SURVIVAL.staminaRegen*.45:SURVIVAL.staminaRegen;
  vitals.stamina=clamp(vitals.stamina+regen*dt,0,maxStamina(vitals));
 }
 // Eating supports gradual, modest healing, but hunger at zero only penalizes
 // the player. It never drains their health or triggers death.
 if(vitals.hunger>25&&!sprinting) vitals.health=clamp(vitals.health+SURVIVAL.healthRegen*dt,0,100);
 return Object.keys(old).some(k=>vitals[k]!==old[k]);
}
export function consumeBerries(vitals){
 if(vitals.gameOver||vitals.health<=0)return false;
 vitals.hunger=clamp(vitals.hunger+SURVIVAL.berryHunger,0,100);
 vitals.foodSeconds=SURVIVAL.berryDuration; // Refresh, never stack.
 vitals.stamina=clamp(vitals.stamina+SURVIVAL.berryStamina,0,maxStamina(vitals));
 return true;
}
