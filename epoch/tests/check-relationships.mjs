import assert from "node:assert/strict";
import {GameState} from "../js/state.js";
import {legacyResidents} from "../js/residents.js";
import {nearbySocialPairs,relationshipKey,advanceSocialRelationships,
 advanceHouseholdRelationships,normalizeRelationships,pruneRelationships,
 residentRelationships,relationshipSummary,FRIENDSHIP_AT,PARTNERSHIP_AT,
 SOCIAL_SECONDS_PER_POINT} from "../js/relationships.js";
const storage=new Map();
globalThis.localStorage={
 getItem:k=>storage.get(k)||null,
 setItem:(k,v)=>storage.set(k,v),
 removeItem:k=>storage.delete(k)
};
const [a,b,c]=legacyResidents(3);
a.age=29;b.age=26;c.age=22;
for(const p of [a,b,c])p.homeId="camp";
const village={residents:[a,b,c],relationships:{},buildings:[],deceased:[]};
const key=relationshipKey(a.id,b.id);
assert.equal(relationshipKey(b.id,a.id),key,"relationships are symmetric");
assert.equal(relationshipKey(a.id,a.id),null,"self relationships are not valid");
assert.deepEqual(nearbySocialPairs([
 {id:a.id,x:1,z:1,work:{mode:"socializing"}},
 {id:b.id,x:3,z:4,work:{mode:"socializing"}},
 {id:c.id,x:20,z:20,work:{mode:"socializing"}},
 {id:"irrelevant",x:2,z:2,work:{mode:"working"}}
]),[[a.id,b.id]],"only actual nearby conversations count");
assert.deepEqual(nearbySocialPairs([
 {id:a.id,x:0,z:0,work:{mode:"sleeping"}},
 {id:b.id,x:0,z:0,work:{mode:"socializing"}}
]),[],"sleeping never creates a bond");
assert.deepEqual(advanceSocialRelationships(village,[[a.id,"unknown"]],1,-11999),
 {changed:false,events:[]},"unknown or unloaded names cannot produce relationships");
for(let i=0;i<FRIENDSHIP_AT*SOCIAL_SECONDS_PER_POINT;i++)
 advanceSocialRelationships(village,[[a.id,b.id],[b.id,a.id]],1,-11999);
assert.equal(village.relationships[key].affinity,FRIENDSHIP_AT,
 "duplicate pairs in the same second never double progress");
assert.equal(village.relationships[key].friendYear,-11999);
assert.equal(a.memories.filter(m=>m.text.includes("Became friends")).length,1);
assert.equal(b.memories.filter(m=>m.text.includes("Became friends")).length,1);
for(let i=0;i<(PARTNERSHIP_AT-FRIENDSHIP_AT)*SOCIAL_SECONDS_PER_POINT;i++)
 advanceSocialRelationships(village,[[a.id,b.id]],1,-11998);
assert.equal(village.relationships[key].affinity,PARTNERSHIP_AT);
assert.equal(village.relationships[key].partnerYear,-11998,
 "an adult pair may organically partner after a sustained bond");
assert.equal(relationshipSummary(village).partnerships,1);
assert.equal(residentRelationships(village,b.id)[0].stage,"Partner");
for(let i=0;i<PARTNERSHIP_AT*SOCIAL_SECONDS_PER_POINT;i++)
 advanceSocialRelationships(village,[[a.id,c.id]],1,-11997);
assert.equal(relationshipSummary(village).partnerships,1,
 "a villager cannot have two simultaneous partners");
assert.equal(residentRelationships(village,a.id).find(r=>r.id===c.id).stage,"Close friend");
assert.equal(relationshipSummary(village).friendships,2);
assert.equal(a.memories.filter(m=>m.text.includes("partnership")).length,1);
const invalid={
 [key]:village.relationships[key],
 ["legacy:resident:1|missing"]:{affinity:100,partnerYear:-12000},
 ["legacy:resident:1|legacy:resident:1"]:{affinity:100},
 ["legacy:resident:1|legacy:resident:2"]:{...village.relationships[key],a:b.id,b:c.id,partnerYear:-11997}
};
const normalized=normalizeRelationships(invalid,village);
assert.equal(Object.keys(normalized).length,2,"invalid bonds are removed during migration");
assert.equal(Object.values(normalized).filter(r=>r.partnerYear!==null).length,1,
 "corrupt saves cannot assign two partners to the same person");
const homeVillage={residents:legacyResidents(3),relationships:{},deceased:[],buildings:[]};
homeVillage.residents[0].homeId="hut_1";
homeVillage.residents[1].homeId="hut_1";
homeVillage.residents[2].homeId="camp";
advanceHouseholdRelationships(homeVillage,-11999);
const houseKey=relationshipKey(homeVillage.residents[0].id,homeVillage.residents[1].id);
assert.equal(homeVillage.relationships[houseKey].affinity,1);
assert.equal(homeVillage.relationships[houseKey].socialPoints,0);
assert.equal(Object.keys(homeVillage.relationships).length,1,
 "communal camp occupancy alone does not create a personal bond");
const youngerVillage={residents:legacyResidents(2),relationships:{},deceased:[],buildings:[]};
youngerVillage.residents.forEach(p=>p.age=17);
for(let i=0;i<PARTNERSHIP_AT*SOCIAL_SECONDS_PER_POINT;i++)
 advanceSocialRelationships(youngerVillage,[[youngerVillage.residents[0].id,youngerVillage.residents[1].id]],1,-11999);
assert.equal(relationshipSummary(youngerVillage).partnerships,0,
 "partnerships require both people to be adults");
youngerVillage.residents.forEach(p=>p.age=18);
advanceHouseholdRelationships(youngerVillage,-11998); // camp is deliberately not enough
advanceSocialRelationships(youngerVillage,[[youngerVillage.residents[0].id,youngerVillage.residents[1].id]],5,-11998);
advanceSocialRelationships(youngerVillage,[[youngerVillage.residents[0].id,youngerVillage.residents[1].id]],1,-11998);
assert.equal(relationshipSummary(youngerVillage).partnerships,1,
 "adults can partner after more shared conversation");
village.residents=village.residents.filter(p=>p.id!==b.id);
village.deceased=[{id:b.id,name:b.name}];
pruneRelationships(village,-11995);
assert(!village.relationships[key],"departed residents cannot remain partners");
assert(a.memories.some(m=>m.text.includes("Mourned the loss of partner")),
 "a surviving partner remembers the loss");

const game=new GameState({slot:1,newGame:true});
game.onChange=()=>{};game.onVitals=()=>{};
game.data.village.residents=legacyResidents(3);
game.data.village.population=4;
game.data.village.residents[0].homeId="camp";
game.data.village.residents[1].homeId="camp";
game.data.village.residents[2].homeId="camp";
game.data.village.relationships={};
const ids=game.data.village.residents.map(p=>p.id);
game.getVillagerSocialPairs=()=>[[ids[0],ids[1]]];
for(let i=0;i<12;i++)game.advanceVillageEnergy(1);
assert.equal(game.data.village.relationships[relationshipKey(ids[0],ids[1])].affinity,2,
 "the live GameState simulation advances bonds using the active-second clock");
game.getVillagerSocialPairs=()=>[];
game.save();
const reloaded=new GameState({slot:1});
assert.equal(reloaded.data.village.relationships[relationshipKey(ids[0],ids[1])].affinity,2,
 "relationships are saved across reload");
const pair=relationshipKey(ids[0],ids[1]);
for(let i=0;i<PARTNERSHIP_AT*SOCIAL_SECONDS_PER_POINT;i++)
 advanceSocialRelationships(reloaded.data.village,[[ids[0],ids[1]]],1,-11990);
assert.equal(reloaded.data.village.relationships[pair].partnerYear,-11990);
assert(reloaded.chooseSuccessor(ids[0]));
reloaded.data.survival.health=0;
assert(reloaded.heroDies("a test injury"));
assert.equal(reloaded.data.hero.sourceResidentId,ids[0]);
assert.equal(reloaded.data.village.relationships[pair].partnerYear,-11990,
 "the successor's committed relationship survives becoming the player");
const after=reloaded.residentProfile(ids[1]);
assert(after.relationships.some(r=>r.isLeader&&r.stage==="Partner"),
 "villager profile recognizes a partner who is now the village leader");
reloaded.save();
const afterLoad=new GameState({slot:1});
assert.equal(afterLoad.data.village.relationships[pair].partnerYear,-11990,
 "leader relationships survive save migration");
console.log("PASS Phase 7A.1: physical socialization, friendships, household bonding, adult monogamous partnerships, death, leadership and persistence");
