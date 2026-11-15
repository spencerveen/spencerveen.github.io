/**
 * Epoch 6C.4 — village hunger and shared food. Only stockpile edibles can be
 * consumed: neither raw meat/fish nor a worker's cargo is free food.
 * Time is the same active real-seconds calendar used for energy/aging.
 */
export const VILLAGER_MAX_HUNGER=100;
export const VILLAGER_MEAL_AT=48;
export const VILLAGER_CRITICAL_HUNGER=15;
export const VILLAGER_STARVING_AT=0;
export const VILLAGER_FOOD_PRIORITY=Object.freeze([
 Object.freeze({id:"berry_roast",restore:52,label:"Berry-Roasted Meat"}),
 Object.freeze({id:"cooked_meat",restore:38,label:"Roasted Meat"}),
 Object.freeze({id:"cooked_fish",restore:31,label:"Roasted Fish"}),
 Object.freeze({id:"berries",restore:24,label:"Wild Berries"})
]);
export const normalizedHunger=value=>
 typeof value==="number"&&Number.isFinite(value)?
 Math.max(0,Math.min(VILLAGER_MAX_HUNGER,value)):VILLAGER_MAX_HUNGER;
export function normalizedLastMeal(id){
 return VILLAGER_FOOD_PRIORITY.some(v=>v.id===id)?id:null;
}
export function availableVillageMeals(stockpile){
 return VILLAGER_FOOD_PRIORITY.reduce((sum,food)=>
  sum+Math.max(0,Math.floor(Number(stockpile?.items?.[food.id])||0)),0);
}
export function firstVillageMeal(stockpile){
 return VILLAGER_FOOD_PRIORITY.find(food=>
  Number.isFinite(stockpile?.items?.[food.id])&&stockpile.items[food.id]>=1)||null;
}
export function hungryStatus(hunger){
 const n=normalizedHunger(hunger);
 if(n===0)return "Starving";
 if(n<=VILLAGER_CRITICAL_HUNGER)return "Very hungry";
 if(n<=VILLAGER_MEAL_AT)return "Hungry";
 return "Fed";
}
/** Hunger ticks even during sleep, but working and traveling consume more. */
export function advanceVillagerHunger(person,activity,seconds,shift){
 const hunger=normalizedHunger(person.hunger);
 const dt=Math.max(0,Math.min(Number(seconds)||0,5));
 if(!dt||activity?.local===false)return hunger;
 const mode=activity?.mode||"idle",moving=activity?.moving===true;
 let rate=mode==="working"?.22:
  moving?.19:
  shift==="night"?.085:
  shift==="morning"?.13:.145;
 return normalizedHunger(hunger-rate*dt);
}
/** Return a new hunger amount and a meal record. The caller must atomically
 * decrement its real store, so this function never creates food itself.
 */
export function consumeVillagerMeal(person,stockpile){
 const hunger=normalizedHunger(person.hunger);
 if(hunger>VILLAGER_MEAL_AT)return null;
 const meal=firstVillageMeal(stockpile);
 if(!meal)return null;
 const before=Number(stockpile.items[meal.id]);
 if(!Number.isSafeInteger(before)||before<1)return null;
 stockpile.items[meal.id]=before-1;
 person.hunger=normalizedHunger(hunger+meal.restore);
 person.lastMeal=meal.id;
 return {id:meal.id,label:meal.label,restored:person.hunger-hunger,
  hunger:person.hunger,remaining:stockpile.items[meal.id]};
}
