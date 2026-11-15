import assert from "node:assert/strict";
import {GameState} from "../js/state.js";
import {REAL_SECONDS_PER_YEAR,REAL_SECONDS_PER_GAME_HOUR,GAME_START_HOUR,
 GAME_HOURS_PER_YEAR,normalizeCalendarProgress,hourAtProgress,
 progressAtHour,clockAtProgress,skyAtHour,sunsetBlend} from "../js/game-clock.js";

const memory=new Map();
globalThis.localStorage={
 getItem:key=>memory.get(key)||null,
 setItem:(key,value)=>memory.set(key,value),
 removeItem:key=>memory.delete(key)
};
const approx=(a,b,delta=1e-9)=>Math.abs(a-b)<delta;
assert.equal(REAL_SECONDS_PER_YEAR,432);
assert.equal(REAL_SECONDS_PER_GAME_HOUR,18);
assert.equal(GAME_HOURS_PER_YEAR,24);
assert.equal(GAME_START_HOUR,7);
assert.equal(75*REAL_SECONDS_PER_YEAR/3600,9,
 "ages 25 to 100 should last 9 real hours");
assert(82*REAL_SECONDS_PER_YEAR/3600>9 &&
 82*REAL_SECONDS_PER_YEAR/3600<10,
 "a newly created 18-year-old lasts 9-10 hours if they survive");
assert.equal(clockAtProgress(0).label,"7:00 AM");
assert.equal(clockAtProgress(.5).label,"7:00 PM");
assert.equal(clockAtProgress(.75).label,"1:00 AM");
assert.equal(clockAtProgress(.9999).phase,"sunrise");
assert.equal(skyAtHour(0).nightMix,1);
assert.equal(skyAtHour(4).nightMix,1);
assert.equal(skyAtHour(5).nightMix,1);
assert.equal(skyAtHour(6).nightMix,.5);
assert.equal(skyAtHour(7).nightMix,0);
assert.equal(skyAtHour(12).nightMix,0);
assert.equal(skyAtHour(18).nightMix,0);
assert.equal(skyAtHour(19).nightMix,.5);
assert.equal(sunsetBlend(0),0);
assert.equal(sunsetBlend(.5),.5);
assert.equal(sunsetBlend(1),1);
for(let i=1;i<=100;i++)
 assert(sunsetBlend(i/100)>=sunsetBlend((i-1)/100),"sunset stays monotonic");
const evening=skyAtHour(18+23/60);
assert.equal(evening.phase,"sunset");
assert(evening.nightMix>.25&&evening.nightMix<.35,
 "6:23 PM must visibly blend the sky, rather than leaving it 90% daytime");
assert.equal(skyAtHour(17+59/60).nightMix,0);
assert.equal(skyAtHour(20).nightMix,1);
assert.equal(skyAtHour(20).nightMix,1);
assert.equal(skyAtHour(22).nightMix,1);
assert.equal(skyAtHour(6).phase,"sunrise");
assert.equal(skyAtHour(19).phase,"sunset");
for(let t=0;t<24;t+=.05){
 const p=progressAtHour(t);
 assert(approx(hourAtProgress(p),t,1e-7),"clock mapping is reversible");
}
for(const h of [4.9999,5,5.0001,6.9999,7,7.0001,17.9999,18,18.0001,19.9999,20,20.0001]){
 const s=skyAtHour(h);
 assert(s.nightMix>=0&&s.nightMix<=1);
}
assert.equal(normalizeCalendarProgress(-30),0);
assert.equal(normalizeCalendarProgress(NaN),0);
assert(normalizeCalendarProgress(42)<1);
const game=new GameState({slot:1,newGame:true});
game.onChange=()=>{};
game.devCheats.unlimitedHealth=true;
game.devCheats.unlimitedHunger=true;
const year=game.data.year,age=game.data.hero.age;
for(let i=0;i<86;i++)game.advance(5);
game.advance(1);
assert.equal(game.data.year,year,"431 seconds must not advance the year");
assert.equal(game.data.hero.age,age);
assert(game.clockInfo().hour24>=6&&game.clockInfo().hour24<7,
 "year is ending during sunrise");
game.advance(1);
assert.equal(game.data.year,year+1,"one 432-second cycle advances exactly one year");
assert.equal(game.data.hero.age,age+1);
assert(approx(game.data.calendarProgress,0,1e-10));
assert.equal(game.clockInfo().label,"7:00 AM");
game.data.calendarProgress=.5;
game.save();
const loaded=new GameState({slot:1});
assert.equal(loaded.data.year,year+1);
assert.equal(loaded.data.hero.age,age+1);
assert.equal(loaded.clockInfo().label,"7:00 PM");
assert.equal(loaded.clockInfo().phase,"sunset");
assert(approx(loaded.data.calendarProgress,.5));
loaded.data.calendarProgress=.9995;
loaded.devCheats.unlimitedHealth=true;
loaded.devCheats.unlimitedHunger=true;
loaded.advance(1);
assert.equal(loaded.data.year,year+2,"legacy near-year-end saves roll over once");
assert.equal(loaded.data.hero.age,age+2);
console.log("PASS 6C.1D: clock, stronger 6:23 PM sunset, natural aging, save persistence and dawn/dusk");
