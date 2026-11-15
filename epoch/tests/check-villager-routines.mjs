import assert from "node:assert/strict";
import {GameState} from "../js/state.js";
import {legacyResidents,normalizeResidents} from "../js/residents.js";
import {progressAtHour} from "../js/game-clock.js";
import {villagerDayPhase,villagerCanBeginWork,normalizedEnergy,normalizedResting,
 advanceVillagerEnergy,villagerActivityText,VILLAGER_RESTED_AT} from "../js/villager-routines.js";

const memory=new Map();
globalThis.localStorage={
 getItem:key=>memory.get(key)||null,
 setItem:(key,value)=>memory.set(key,value),
 removeItem:key=>memory.delete(key)
};
assert.equal(villagerDayPhase(4.99),"night");
assert.equal(villagerDayPhase(5),"morning");
assert.equal(villagerDayPhase(7.999),"morning");
assert.equal(villagerDayPhase(8),"work");
assert.equal(villagerDayPhase(17.999),"work");
assert.equal(villagerDayPhase(18),"evening");
assert.equal(villagerDayPhase(19.999),"evening");
assert.equal(villagerDayPhase(20),"night");
assert.equal(villagerDayPhase(23.999),"night");
assert.equal(villagerDayPhase(-1),"night");
assert.equal(normalizedEnergy(NaN),100);
assert.equal(normalizedEnergy(200),100);
assert.equal(normalizedEnergy(-10),0);
assert(normalizedResting(false,8),"fatigue forces recovery");
assert(normalizedResting(true,35),"fatigue persists until sufficiently rested");
assert(!normalizedResting(true,65),"recover at 65 energy");
assert(villagerCanBeginWork(10,100,false,"woodcutter"));
assert(!villagerCanBeginWork(7,100,false,"woodcutter"));
assert(!villagerCanBeginWork(18,100,false,"woodcutter"));
assert(!villagerCanBeginWork(10,100,false,"idle"));
assert(!villagerCanBeginWork(10,10,true,"woodcutter"));
assert.equal(villagerActivityText("sleeping","night"),"Sleeping");
assert.equal(villagerActivityText("resting","work"),"Resting to recover");
assert.equal(villagerActivityText("goingHome","evening"),"Returning home");

let actor={energy:100,resting:false};
for(let i=0;i<38;i++){
 const next=advanceVillagerEnergy(actor,{mode:"working",atHome:false,local:true},5,"work");
 actor={...actor,...next};
}
assert(actor.energy<=15,"sustained work causes exhaustion");
assert(actor.resting,"the fatigued worker must stop accepting jobs");
const exhausted=actor.energy;
for(let i=0;i<20;i++)
 actor={...actor,...advanceVillagerEnergy(actor,
  {mode:"sleeping",atHome:true,local:true},5,"night")};
assert(actor.energy>exhausted+50,"sleep restores substantial energy");
assert(!actor.resting,"fully rested workers regain eligibility");
assert(actor.energy<=100);
const staticWorker=advanceVillagerEnergy({energy:30,resting:true},
 {mode:"working",atHome:false,local:false},5,"work");
assert.equal(staticWorker.energy,30,"distant unloaded villagers do not secretly work");
assert.equal(staticWorker.resting,true);
const stranded=advanceVillagerEnergy({energy:10,resting:true},
 {mode:"stuck",atHome:false,local:true},5,"night");
assert(stranded.energy>10,"stranded workers can recover slowly without fake sleep");

const game=new GameState({slot:1,newGame:true});
game.onChange=()=>{};
game.onVitals=()=>{};
game.onVillagerNeeds=()=>{};
game.devCheats.unlimitedHealth=true;
game.devCheats.unlimitedHunger=true;
assert(game.foundStockpile(0,8));
game.data.village.residents=normalizeResidents(legacyResidents(2));
game.data.village.population=3;
const woodcutter=game.data.village.residents[0];
const id=woodcutter.id;
assert(game.assignResidentJob(id,"woodcutter"));
woodcutter.energy=50;
woodcutter.resting=false;
woodcutter.cargo={wood:2};
game.getVillagerActivity=vId=>vId===id?
 {mode:"working",moving:false,atHome:false,local:true}:
 {mode:"sleeping",moving:false,atHome:true,local:true};
game.data.calendarProgress=progressAtHour(10);
const beforeYear=game.data.year;
for(let i=0;i<10;i++)game.advance(5);
assert(woodcutter.energy<30,"real game ticks debit assigned villager work");
assert.equal(game.data.year,beforeYear);
assert.deepEqual(woodcutter.cargo,{wood:2},
 "energy ticks never move, duplicate or delete a load of cargo");
game.getVillagerActivity=()=>({mode:"sleeping",atHome:true,moving:false,local:true});
game.data.calendarProgress=progressAtHour(21);
const sleepingStart=woodcutter.energy;
for(let i=0;i<15;i++)game.advance(5);
assert(woodcutter.energy>sleepingStart+40);
assert(game.data.year===beforeYear);
game.save();
const loaded=new GameState({slot:1});
const savedPerson=loaded.data.village.residents.find(v=>v.id===id);
assert(savedPerson.energy>sleepingStart+40,"energy persists across reloads");
assert.deepEqual(savedPerson.cargo,{wood:2},"load persists alongside energy");
assert(!savedPerson.resting);
assert(savedPerson.energy<=100);
const legacy=JSON.parse(memory.get("epoch.stoneage.slot.1"));
delete legacy.village.residents[0].energy;
delete legacy.village.residents[0].resting;
memory.set("epoch.stoneage.slot.1",JSON.stringify(legacy));
const migrated=new GameState({slot:1});
const original=migrated.data.village.residents.find(v=>v.id===id);
assert.equal(original.energy,100,"older saves migrate to full energy");
assert.equal(original.resting,false,"older saves don't start exhausted");
assert.equal(VILLAGER_RESTED_AT,65);
console.log("PASS phase 6C.3: work shift boundaries, fatigue, rest, sleep, saved energy, cargo and legacy migration");
