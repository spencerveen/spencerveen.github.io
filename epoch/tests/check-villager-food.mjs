import assert from "node:assert/strict";
import {GameState} from "../js/state.js";
import {legacyResidents,normalizeResidents} from "../js/residents.js";
import {progressAtHour} from "../js/game-clock.js";
import {advanceVillagerEnergy,villagerCanBeginWork} from "../js/villager-routines.js";
import {normalizedHunger,advanceVillagerHunger,consumeVillagerMeal,
 VILLAGER_FOOD_PRIORITY,availableVillageMeals,firstVillageMeal,
 hungryStatus,VILLAGER_MEAL_AT,VILLAGER_CRITICAL_HUNGER} from "../js/villager-nutrition.js";

const memory=new Map();
globalThis.localStorage={
 getItem:key=>memory.get(key)||null,
 setItem:(key,value)=>memory.set(key,value),
 removeItem:key=>memory.delete(key)
};
assert.equal(normalizedHunger(undefined),100);
assert.equal(normalizedHunger(Infinity),100);
assert.equal(normalizedHunger(-30),0);
assert.equal(normalizedHunger(500),100);
assert.equal(hungryStatus(0),"Starving");
assert.equal(hungryStatus(14),"Very hungry");
assert.equal(hungryStatus(35),"Hungry");
assert.equal(hungryStatus(80),"Fed");
assert.equal(VILLAGER_MEAL_AT,48);
assert.equal(VILLAGER_CRITICAL_HUNGER,15);
assert.deepEqual(VILLAGER_FOOD_PRIORITY.map(f=>f.id),
 ["berry_roast","cooked_meat","cooked_fish","berries"]);
assert.equal(firstVillageMeal({items:{animal_meat:20,fish_meat:30}}),null,
 "raw food is not edible");
assert.equal(availableVillageMeals({items:{animal_meat:20,fish_meat:20,berries:2}}),2);
assert(advanceVillagerHunger({hunger:75},{mode:"working",local:true},5,"work")<74);
assert.equal(advanceVillagerHunger({hunger:75},{mode:"working",local:false},5,"work"),75);
assert(advanceVillagerHunger({hunger:75},{mode:"sleeping",local:true},5,"night")>74.5);
assert(!villagerCanBeginWork(10,100,false,"woodcutter",0));
assert(villagerCanBeginWork(10,100,false,"forager",0),
 "foragers can recover a starving village when emergency food is needed");
const fed=advanceVillagerEnergy({energy:25,resting:true,hunger:100},
 {mode:"sleeping",atHome:true,local:true},5,"night");
const starving=advanceVillagerEnergy({energy:25,resting:true,hunger:0},
 {mode:"sleeping",atHome:true,local:true},5,"night");
assert(fed.energy>starving.energy+2,"sleep cannot fully restore starving villagers");

const game=new GameState({slot:1,newGame:true});
game.onChange=()=>{};game.onVitals=()=>{};game.onVillagerNeeds=()=>{};
game.devCheats.unlimitedHealth=true;game.devCheats.unlimitedHunger=true;
assert(game.foundStockpile(0,8));
game.data.village.residents=normalizeResidents(legacyResidents(2));
game.data.village.population=3;
const [first,second]=game.data.village.residents;
first.hunger=40;second.hunger=45;
const pile=game.data.village.stockpile;
pile.items.berries=2;pile.items.cooked_fish=1;pile.items.cooked_meat=1;
pile.items.berry_roast=1;pile.items.animal_meat=4;pile.items.fish_meat=3;
assert.equal(game.villageFoodStatus().meals,5);
assert.equal(game.villageFoodStatus().hungry,2);
assert.equal(game.villageFoodStatus().critical,0);
let result=game.feedVillager(first.id);
assert(result.ok&&result.id==="berry_roast","best cooked meal is served first");
assert.equal(first.hunger,92);
assert.equal(first.lastMeal,"berry_roast");
assert.equal(pile.items.berry_roast,0);
assert.equal(game.feedVillager(first.id).ok,false,
 "repeated requests cannot consume a second meal while already fed");
result=game.feedVillager(second.id);
assert(result.ok&&result.id==="cooked_meat");
assert.equal(second.hunger,83);
assert.equal(pile.items.cooked_meat,0);
assert.equal(pile.items.cooked_fish,1);
assert.equal(pile.items.animal_meat,4);
assert.equal(pile.items.fish_meat,3);
first.hunger=48;second.hunger=15;
result=game.feedVillager(first.id);
assert(result.ok&&result.id==="cooked_fish");
assert.equal(first.hunger,79);
result=game.feedVillager(second.id);
assert(result.ok&&result.id==="berries");
assert.equal(second.hunger,39);
assert.equal(pile.items.berries,1);
assert.equal(game.villageFoodStatus().meals,1);
assert.equal(game.villageFoodStatus().hungry,1);
first.hunger=40;
result=game.feedVillager(first.id);
assert(result.ok&&result.id==="berries");
assert.equal(pile.items.berries,0);
second.hunger=0;
assert.equal(game.feedVillager(second.id).ok,false,"starving villager cannot eat without food");
assert.equal(pile.items.animal_meat,4,"raw meat never acts as a meal");
assert.equal(pile.items.fish_meat,3,"raw fish never acts as a meal");
assert.equal(game.villageFoodStatus().critical,1);
assert.equal(game.villageFoodStatus().meals,0);

game.getVillagerActivity=()=>({mode:"sleeping",atHome:true,local:true});
game.data.calendarProgress=progressAtHour(22);
second.energy=40;second.resting=true;
const oldHunger=second.hunger,oldEnergy=second.energy;
game.advance(5);
assert.equal(second.hunger,oldHunger);
assert(second.energy<oldEnergy,"starvation reduces energy even while sleeping");
first.hunger=50;game.advance(5);
assert(first.hunger<50,"hunger drains in normal game ticks");
game.save();
const reloaded=new GameState({slot:1});
assert.equal(reloaded.data.village.residents[0].lastMeal,"berries");
assert(Math.abs(reloaded.data.village.residents[0].hunger-first.hunger)<1e-6);
assert.equal(reloaded.data.village.residents[1].hunger,0);
assert.equal(reloaded.data.village.stockpile.items.berries,0);
assert.equal(reloaded.data.village.stockpile.items.animal_meat,4);
const legacy=JSON.parse(memory.get("epoch.stoneage.slot.1"));
delete legacy.village.residents[0].hunger;
delete legacy.village.residents[0].lastMeal;
legacy.village.residents[1].hunger=NaN;
legacy.village.residents[1].lastMeal="animal_meat";
memory.set("epoch.stoneage.slot.1",JSON.stringify(legacy));
const migrated=new GameState({slot:1});
assert.equal(migrated.data.village.residents[0].hunger,100);
assert.equal(migrated.data.village.residents[0].lastMeal,null);
assert.equal(migrated.data.village.residents[1].hunger,100);
assert.equal(migrated.data.village.residents[1].lastMeal,null);
console.log("PASS 6C.4: real edible stockpile meals, no double consumption, hunger, starvation, saving and migration");
