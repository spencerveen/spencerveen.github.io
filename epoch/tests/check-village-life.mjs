import assert from "node:assert/strict";
import {villagerLeisureSeed,villagerLeisureChoice,villagerMaySocialize,
 villageGatherCenter,leisureStatus,isLeisureMode,VILLAGE_GATHER_RADIUS,
 VILLAGE_WANDER_RADIUS} from "../js/village-life.js";
import {villagerDayPhase,villagerCanBeginWork,villagerActivityText,
 advanceVillagerEnergy} from "../js/villager-routines.js";
import {availableVillageMeals} from "../js/villager-nutrition.js";

assert.deepEqual(villageGatherCenter({stockpile:{x:0,z:8},buildings:[]}),
 {x:0,z:8,kind:"gather"},"a village with no constructed hearth gathers in its clearing");
assert.deepEqual(villageGatherCenter({stockpile:{x:0,z:8},
 buildings:[{kind:"hearth",x:12,z:4}]}),
 {x:12,z:4,kind:"hearth"},"a built hearth becomes the actual meeting spot");
assert.equal(villageGatherCenter({buildings:[]}),null);
const resident={shift:"evening",job:"woodcutter",energy:80,hunger:80,
 resting:false,carrying:false};
assert(villagerMaySocialize(resident));
assert(villagerMaySocialize({...resident,shift:"morning"}));
assert(villagerMaySocialize({...resident,shift:"work",job:"idle"}));
for(const changes of [
 {shift:"night"},{shift:"work"},{energy:18},{hunger:48},
 {resting:true},{carrying:true}
])assert(!villagerMaySocialize({...resident,...changes}),
 "work, sleep, hunger, fatigue and hauling override idle social activity");
assert.equal(villagerDayPhase(19),"evening");
assert.equal(villagerDayPhase(22),"night");
assert(villagerCanBeginWork(10,100,false,"woodcutter",100),
 "social routines never block a rested worker's shift");
assert(isLeisureMode("socialWalk")&&isLeisureMode("socializing")&&
 isLeisureMode("wandering"));
for(const mode of ["returning","waiting","working","sleeping","eating"])
 assert(!isLeisureMode(mode));
const choices=new Set();
for(let i=0;i<40;i++){
 const id="legacy:resident:"+i;
 const one=villagerLeisureChoice(id,3,true);
 const two=villagerLeisureChoice(id,3,true);
 assert.deepEqual(one,two,"identities yield reproducible leisure choices");
 assert(one.duration>=5&&one.duration<=11);
 assert(one.pause>=4&&one.pause<=10);
 assert(one.kind==="wander"||one.kind==="hearth");
 assert(one.angle>=0&&one.angle<7);
 choices.add(one.kind);
 assert.equal(villagerLeisureSeed(id,3),villagerLeisureSeed(id,3));
}
assert(choices.has("wander")&&choices.has("hearth"),
 "some residents stroll, while others gather around a hearth");
for(let i=0;i<20;i++)
 assert(["wander","gather"].includes(villagerLeisureChoice("p"+i,1,false).kind),
  "no unbuilt hearth or free campfire is conjured");
assert.equal(leisureStatus("socialWalk","hearth"),"Walking to the hearth");
assert.equal(leisureStatus("socializing","hearth"),"Gathering around the fire");
assert.equal(leisureStatus("socializing","gather"),"Socializing");
assert.equal(leisureStatus("wandering","wander"),"Exploring the village");
assert.equal(leisureStatus("working","hearth"),null);
assert.equal(villagerActivityText("socializing","evening",false,"hearth"),
 "Gathering around the fire");
assert.equal(villagerActivityText("socialWalk","morning",false,"gather"),
 "Meeting villagers");
assert.equal(villagerActivityText("sleeping","night"),"Sleeping");
assert.equal(availableVillageMeals({items:{berries:1}}),1);
const conversation=advanceVillagerEnergy({energy:55,hunger:80,resting:false},
 {mode:"socializing",atHome:false,local:true,moving:false},5,"evening");
assert(conversation.energy>55,"conversation is calm recovery rather than a work task");
const strolling=advanceVillagerEnergy({energy:55,hunger:80,resting:false},
 {mode:"socialWalk",atHome:false,local:true,moving:true},5,"evening");
assert(strolling.energy<55,"walking around the settlement uses real energy");
assert(VILLAGE_GATHER_RADIUS>2&&VILLAGE_WANDER_RADIUS>VILLAGE_GATHER_RADIUS);
console.log("PASS 6C.5: deterministic leisure, real hearth requirement, work/meal/sleep priority and activity costs");
