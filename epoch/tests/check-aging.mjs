import assert from "node:assert/strict";
import {GameState} from "../js/state.js";
import {legacyResidents,NATURAL_DEATH_AGE,normalizeDeceasedResidents} from "../js/residents.js";

const store=new Map();
globalThis.localStorage={
 getItem:key=>store.get(key)||null,
 setItem:(key,value)=>store.set(key,value),
 removeItem:key=>store.delete(key)
};
const endOfYear=state=>{state.data.calendarProgress=89/90;state.advance(2)};
assert.equal(NATURAL_DEATH_AGE,100);
const village=new GameState({slot:1,newGame:true});
const first=legacyResidents(2);
first[0].age=99;first[1].age=98;
first.forEach(p=>p.homeId="camp");
village.data.village.residents=first;
village.data.village.population=3;
village.data.hero.age=77;
assert(village.chooseSuccessor(first[0].id));
assert.equal(village.data.successorId,first[0].id);
const beforeYear=village.data.year;
endOfYear(village);
assert.equal(village.data.year,beforeYear+1,"the game calendar advances one year");
assert.equal(village.data.hero.age,78,"the player ages on the calendar tick");
assert.equal(village.data.village.residents.length,1,"the villager turning 100 dies");
assert.equal(village.data.village.residents[0].age,99,"all living villagers age on the same tick");
assert.equal(village.data.village.population,2,"the dead villager leaves active population");
assert.equal(village.villageHousing()[0].occupied,1,"a dead villager vacates their bed");
assert.equal(village.data.successorId,null,"death clears the named successor if necessary");
assert.equal(village.data.village.deceased.length,1);
assert.deepEqual(village.data.village.deceased[0],{
 id:first[0].id,name:first[0].name,age:100,year:beforeYear+1,cause:"old age"
});
assert(village.data.history[0].includes(first[0].name+" died of old age"));
village.save();
const resumed=new GameState({slot:1});
assert.equal(resumed.data.hero.age,78);
assert.equal(resumed.data.village.residents[0].age,99);
assert.deepEqual(resumed.data.village.deceased,village.data.village.deceased,"deaths survive a save/reload");
endOfYear(resumed);
assert.equal(resumed.data.village.population,1,"all village inhabitants ultimately age out");
assert.equal(resumed.data.village.residents.length,0);
assert.equal(resumed.data.village.deceased.length,2);
assert.equal(resumed.data.hero.age,79,"death of neighbors does not immediately kill the founder");
resumed.data.hero.age=99;
endOfYear(resumed);
assert.equal(resumed.data.survival.gameOver,true,"at age 100 with no survivors the game ends");
assert.equal(resumed.data.village.population,0);
assert.equal(resumed.data.lastDeath.reason,"old age");
assert.equal(resumed.data.lastDeath.gameOver,true);
assert.equal(resumed.data.lineage.at(-1).deathReason,"old age");
assert(resumed.data.history[0].includes("civilization has ended"));
resumed.save();
const ended=new GameState({slot:1});
assert.equal(ended.data.survival.gameOver,true,"a dead civilization does not restart on load");
assert.equal(ended.data.village.deceased.length,2,"memorial history remains in an ended save");
const yearEnded=ended.data.year;
ended.advance(5);
assert.equal(ended.data.year,yearEnded,"an ended game never advances");

const named=new GameState({slot:2,newGame:true});
const two=legacyResidents(2);two[0].age=50;two[1].age=52;
two.forEach(p=>p.homeId="camp");
named.data.village.residents=two;
named.data.village.population=3;
named.data.hero.age=99;
assert(named.chooseSuccessor(two[1].id));
endOfYear(named);
assert.equal(named.data.survival.gameOver,false);
assert.equal(named.data.hero.name,two[1].name,"named successor takes leadership on natural death");
assert.equal(named.data.hero.age,53,"the successor's age includes this year's aging");
assert.equal(named.data.generation,2);
assert.equal(named.data.lastDeath.reason,"old age");
assert.equal(named.data.lastDeath.successorName,two[1].name);
assert.equal(named.data.village.population,2,"taking control of a villager cannot duplicate population");
assert.equal(named.data.village.residents.length,1);
assert.equal(named.data.village.residents[0].age,51);
assert.equal(named.data.survival.health,75);
assert.equal(named.data.successorId,null);
named.save();
const namedAgain=new GameState({slot:2});
assert.equal(namedAgain.data.hero.age,53);
assert.equal(namedAgain.data.village.residents[0].age,51);

const lastMinute=new GameState({slot:3,newGame:true});
const aboutToDie=legacyResidents(1);aboutToDie[0].age=99;aboutToDie[0].homeId="camp";
lastMinute.data.village.residents=aboutToDie;
lastMinute.data.village.population=2;
lastMinute.data.hero.age=99;
lastMinute.chooseSuccessor(aboutToDie[0].id);
endOfYear(lastMinute);
assert.equal(lastMinute.data.village.deceased.length,1,"successors turning 100 die before succession");
assert.equal(lastMinute.data.lastDeath.gameOver,true,"nobody aged 100 can inherit leadership");
assert.equal(lastMinute.data.village.population,0);

const oldSave={version:1,worldSeed:12000,hero:{name:"Old Founder",age:100},
 village:{population:1,buildings:[],plots:{}}};
store.set("epoch.stoneage.slot.1",JSON.stringify(oldSave));
const legacy=new GameState({slot:1});
assert.equal(legacy.data.hero.age,100);
legacy.advance(1);
assert(legacy.data.survival.gameOver,"100-year-old founders from older saves resolve on their first live tick");
assert.equal(legacy.data.lastDeath.reason,"old age");

const manual=new GameState({slot:2,newGame:true});
const veteran=legacyResidents(1);veteran[0].age=90;
veteran[0].homeId="camp";
manual.data.village.residents=veteran;manual.data.village.population=2;
manual.nextGeneration();
assert.equal(manual.data.village.residents.length,0,"manual 24-year skips age residents too");
assert.equal(manual.data.village.deceased.length,1,"manual time skips preserve natural deaths");
assert.equal(manual.data.village.population,1);
const archives=normalizeDeceasedResidents([
 {id:"legacy:resident:1",name:"A",age:100,year:-1,cause:"old age"},
 {id:"legacy:resident:1",name:"Duplicate",age:100,year:-1,cause:"old age"},
 {id:"invalid",name:"Not a real resident",year:-1}
]);
assert.equal(archives.length,1,"invalid and duplicate memorials are discarded");
console.log("PASS natural aging: founder and villagers share calendar years, age-100 deaths, vacant beds, archived memory, successor eligibility, game over and legacy saves");
