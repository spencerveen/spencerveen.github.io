import assert from "node:assert/strict";
import {GameState} from "../js/state.js";
import {tribeAtChunk,starterTribeChunk,legacyTribeAtChunk,normalizeTribeRecords}
 from "../js/tribes.js";
import {generateTribeFamilies,tribeFamilySummary,tribeFamilyDescription,
 childVisualScale,TRIBE_FAMILY_CHANCE,TRIBE_CHILD_LIMIT,CHILD_ADULT_AGE}
 from "../js/tribe-families.js";
import {areCloseKin} from "../js/relationships.js";
import {LEGACY_HOME} from "../js/stockpile.js";

const member=(i,sex="male")=>({id:"tribe:1,2:member:"+i,name:"Person "+i,
 sex,age:21+i,x:12+i,z:22+i,role:i===0?"leader":"resident"});
const fixtures=[member(0),member(1,"female"),member(2,"female"),member(3,"male"),member(4)];
const basic={id:"tribe:1,2",cx:1,cz:2,x:13,z:23,name:"Sample Tribe",
 population:5,members:fixtures,placementVersion:2};
let families=0;
for(let seed=1;seed<=120;seed++){
 const one=generateTribeFamilies(basic,seed);
 const two=generateTribeFamilies(basic,seed);
 assert.deepEqual(one,two,"one seed reproduces the exact same relationships");
 assert.equal(one.members.length,basic.members.length,"no free family members are created");
 assert.equal(one.population,basic.population,"family generation does not alter tribe headcount");
 assert.deepEqual(one.members.map(p=>[p.id,p.name,p.sex,p.x,p.z,p.role]),
  fixtures.map(p=>[p.id,p.name,p.sex,p.x,p.z,p.role]),
  "established identity, location and leadership are never rerolled");
 const summary=tribeFamilySummary(one);
 assert(summary.children<=TRIBE_CHILD_LIMIT);
 if(summary.families)families++;
 for(const child of one.members.filter(p=>p.age<CHILD_ADULT_AGE)){
  assert.equal(child.familyRole,"child");
  assert(child.age>=2&&child.age<=15,"wilderness children start 2–15 years old");
  assert(child.parentIds.length>=1&&child.parentIds.length<=2);
  for(const id of child.parentIds){
   const parent=one.members.find(m=>m.id===id);
   assert(parent&&parent.familyRole==="parent","all parents exist in the original tribe");
   assert(parent.age-child.age>=18,"parent-child age gaps are plausible");
   assert(areCloseKin(child,parent),"close family ties can prevent invalid partnerships");
  }
  assert(tribeFamilyDescription(child,one).includes(child.sex==="female"?"daughter":"son"));
 }
 for(const parent of one.members.filter(p=>p.partnerId)){
  const mate=one.members.find(p=>p.id===parent.partnerId);
  assert(mate&&mate.partnerId===parent.id,"seeded partnerships are reciprocal");
 }
 assert(one.members[0].age>=18,"the existing tribal leader is always an adult");
}
assert(families>58&&families<95,
 "family camps appear in a meaningful share of the procedural world");
assert(TRIBE_FAMILY_CHANCE===.65);
assert(childVisualScale(3)<childVisualScale(15));
assert.equal(childVisualScale(18),1);
assert.deepEqual(generateTribeFamilies(basic,45,0),basic,
 "historical rosters without a family version are left completely untouched");
assert.equal(tribeFamilySummary(generateTribeFamilies(basic,45,0)).families,0);

const savedLegacy=legacyTribeAtChunk(12000,...starterTribeChunk(12000));
if(savedLegacy){
 const version0=tribeAtChunk(12000,savedLegacy.cx,savedLegacy.cz,true,0);
 assert.deepEqual(version0,savedLegacy,"old placement and old ages remain exactly unchanged");
}
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.get(k)||null,
 setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};

let selected=null;
for(let seed=12000;seed<12100&&!selected;seed++){
 const coords=starterTribeChunk(seed),t=tribeAtChunk(seed,...coords);
 if(t?.members.some(m=>m.familyRole==="child")&&
    t.members.some(m=>m.partnerId))selected={seed,tribe:t};
}
assert(selected,"at least one deterministic family camp has two parents and children");
const game=new GameState({slot:1,newGame:true});
game.onChange=()=>{};
game.data.worldSeed=selected.seed;
const tribe=selected.tribe;
assert(game.discoverTribe(tribe));
assert.equal(game.tribeRecord(tribe.id).familyVersion,1);
const fromState=game.tribeDefinition(tribe.id);
assert.deepEqual(fromState,tribe,"discovery recreates the same names, family ties and child ages");
for(let stage=0;stage<3;stage++){
 const offer=game.tribeProgress(tribe.id).request;
 for(const [id,amount] of Object.entries(offer.cost))
  assert.equal(game.addResource(id,amount),amount);
 assert(game.aidTribe(tribe.id,stage));
}
assert(game.foundStockpile(LEGACY_HOME.x,LEGACY_HOME.z));
game.data.village.stockpile.items={wood:100,stone:100,berries:50,vines:20};
assert(game.placeVillageBuilding("family",LEGACY_HOME.x+8,LEGACY_HOME.z+10).ok);
assert(game.inviteTribe(tribe.id));
assert.equal(game.data.village.population,tribe.population+1);
const joins=new Map(game.data.village.residents.map(r=>[r.id,r]));
for(const child of tribe.members.filter(m=>m.familyRole==="child")){
 const arrived=joins.get(child.id);
 assert(arrived,"child is physically recruited along with their parents");
 assert.deepEqual(arrived.parentIds,child.parentIds);
 assert.equal(arrived.householdId,child.householdId);
 assert.equal(arrived.age,child.age);
 assert.equal(arrived.job,"idle");
 assert(!game.assignResidentJob(child.id,"woodcutter"),
  "children cannot be sent to adult resource jobs");
 const profile=game.residentProfile(child.id);
 assert.deepEqual(profile.family.parents.map(p=>p.id),child.parentIds,
  "clicking a recruited child reveals their actual parents");
 for(const id of child.parentIds){
  const family=game.residentProfile(id).family;
  assert(family.children.some(c=>c.id===child.id),
   "parents can inspect every recorded child");
 }
}
const partners=tribe.members.filter(p=>p.partnerId);
assert.equal(partners.length,2);
const partner=joins.get(partners[0].id),other=joins.get(partners[1].id);
assert.equal(partner.partnerId,other.id);
assert(game.residentProfile(partner.id).relationships.some(r=>
 r.id===other.id&&r.stage==="Partner"),"existing tribal partnership enters social graph");
const partnerId=other.id;
game.save();
const restored=new GameState({slot:1});
assert.deepEqual(restored.data.village.residents,game.data.village.residents,
 "all parent IDs and partnerships persist across save/load");
assert.deepEqual(restored.tribeRecord(tribe.id),game.tribeRecord(tribe.id));
assert(restored.residentProfile(partnerId).relationships.some(r=>r.stage==="Partner"));

const retro=new GameState({slot:2,newGame:true});
retro.data.worldSeed=selected.seed;
retro.data.tribes[tribe.id]={status:"active",discovered:true,discoveredYear:-12000,
 placementVersion:2,trust:0,completed:0};
retro.save();
const oldWorld=new GameState({slot:2});
assert.equal(oldWorld.tribeRecord(tribe.id).familyVersion,0);
const expected=tribeAtChunk(selected.seed,tribe.cx,tribe.cz,false,0);
assert.deepEqual(oldWorld.tribeDefinition(tribe.id),expected,
 "tribes discovered before 7A.2A cannot have their ages or family members rewritten");
assert.deepEqual(oldWorld.tribeDefinition(tribe.id).members.map(p=>p.age),
 expected.members.map(p=>p.age));
assert.equal(normalizeTribeRecords({[tribe.id]:{placementVersion:2}})[tribe.id].familyVersion,0);
console.log("PASS 7A.2A: deterministic families, parent/child validity, live recruits, saved kinship, tribal partners, adult work safety and old-world compatibility");
