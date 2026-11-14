import assert from "node:assert/strict";
import {GameState} from "../js/state.js";
import {tribeAtChunk,starterTribeChunk,tribeCampIsActive,TRIBE_TRUST_GOAL,tribeBaseTrust} from "../js/tribes.js";
import {LEGACY_HOME} from "../js/stockpile.js";

const saves=new Map();
globalThis.localStorage={getItem:k=>saves.get(k)||null,setItem:(k,v)=>saves.set(k,v),removeItem:k=>saves.delete(k)};
const g=new GameState({slot:1,newGame:true});
g.onChange=()=>{};
const tribe=tribeAtChunk(g.data.worldSeed,...starterTribeChunk(g.data.worldSeed));
assert.equal(g.data.village.population,1);
assert.deepEqual(g.data.village.residents,[],"founder is not duplicated in resident roster");
assert.equal(g.tribeProgress(tribe.id),null,"undiscovered tribe has no relationship");
assert.equal(g.inviteTribe(tribe.id),false);
assert.equal(g.aidTribe(tribe.id,0),false);
assert(g.discoverTribe(tribe));
assert.equal(g.tribeProgress(tribe.id).trust,tribeBaseTrust(tribe));
assert.equal(g.tribeProgress(tribe.id).record.completed,0);
assert.equal(g.aidTribe(tribe.id,0),false,"you cannot aid a tribe with an empty backpack");
const before=JSON.stringify(g.data.inventory);
assert.equal(g.aidTribe(tribe.id,2),false,"an out-of-order quest cannot be completed");
assert.equal(JSON.stringify(g.data.inventory),before);
for(let stage=0;stage<3;stage++){
 const quest=g.tribeProgress(tribe.id).request;
 assert(quest,"each stage has a supply request");
 for(const [id,n] of Object.entries(quest.cost))assert.equal(g.addResource(id,n),n);
 const wrongStage=JSON.stringify({slots:g.data.inventory,trust:g.tribeProgress(tribe.id).trust});
 assert(!g.aidTribe(tribe.id,stage+1));
 assert.equal(JSON.stringify({slots:g.data.inventory,trust:g.tribeProgress(tribe.id).trust}),wrongStage);
 assert(g.aidTribe(tribe.id,stage),"the leader accepts the brought materials");
 assert.equal(g.tribeProgress(tribe.id).record.completed,stage+1);
 for(const [id] of Object.entries(quest.cost))
  assert.equal(g.inventoryCount(id),0,"quest materials actually leave the backpack");
 assert(!g.aidTribe(tribe.id,stage),"replaying a completed request cannot charge the player twice");
}
const progress=g.tribeProgress(tribe.id);
assert.equal(progress.trust,TRIBE_TRUST_GOAL);
assert(progress.ready);
assert.equal(progress.request,null);
assert.equal(g.aidTribe(tribe.id,3),false);
assert.equal(g.inviteTribe(tribe.id),false,"must found a stockpile before settling others");
assert(g.foundStockpile(LEGACY_HOME.x,LEGACY_HOME.z));
if(tribe.population>g.villageCapacity()-g.data.village.population){
 assert.equal(g.inviteTribe(tribe.id),false,"whole tribe requires housing for every person");
 assert.equal(g.tribeProgress(tribe.id).record.status,"active");
}
g.data.village.stockpile.items={wood:100,stone:80,berries:10,vines:0};
assert(g.placeVillageBuilding("family",LEGACY_HOME.x+8,LEGACY_HOME.z+10).ok,"building a hut adds three spaces");
assert(g.villageCapacity()-g.data.village.population>=tribe.population);
const beforeCount=g.data.village.population;
assert(g.inviteTribe(tribe.id),"tribe can peacefully relocate when trusted and housed");
assert.equal(g.tribeProgress(tribe.id).record.status,"relocated");
assert.equal(g.data.village.population,beforeCount+tribe.population);
assert.equal(g.data.village.residents.length,tribe.population);
assert.deepEqual(g.data.village.residents.map(v=>v.id),tribe.members.map(m=>m.id),"each arrival keeps their seeded identity");
assert(g.data.village.residents.every(v=>v.recruitment==="peaceful"&&v.originTribeId===tribe.id));
assert(g.data.village.residents.every(v=>v.joinedYear===g.data.year));
assert.equal(g.inviteTribe(tribe.id),false,"the same tribe cannot be recruited again");
assert(!tribeCampIsActive(tribe,g.data.tribes),"relocated tribe's original camp is no longer active");
g.save();
const reloaded=new GameState({slot:1});
assert.equal(reloaded.data.village.population,beforeCount+tribe.population);
assert.deepEqual(reloaded.data.village.residents,g.data.village.residents,"roster persists exactly through reload");
assert.deepEqual(reloaded.tribeRecord(tribe.id),g.tribeRecord(tribe.id));
assert.equal(reloaded.inviteTribe(tribe.id),false,"reloading never duplicates recruits");
reloaded.nextGeneration();
assert.deepEqual(reloaded.data.village.residents.map(({age,...rest})=>rest),
 g.data.village.residents.map(({age,...rest})=>rest),
 "recruits keep their names, IDs, origins and homes through succession");
assert(reloaded.data.village.residents.every((person,i)=>person.age===g.data.village.residents[i].age+24),
 "the old 24-year succession skip ages every existing resident too");
assert.equal(reloaded.data.village.population,g.data.village.population);
const legacy={version:1,worldSeed:12000,hero:{name:"Old Founder"},village:{population:5,plots:{},buildings:[]}};
saves.set("epoch.stoneage.slot.2",JSON.stringify(legacy));
const imported=new GameState({slot:2});
assert.equal(imported.data.village.population,5,"old population count remains intact");
assert.equal(imported.data.village.residents.length,4,"old unnamed NPCs gain stable saved identities");
assert.equal(new Set(imported.data.village.residents.map(v=>v.id)).size,4);
imported.save();
const again=new GameState({slot:2});
assert.deepEqual(again.data.village.residents,imported.data.village.residents,"legacy roster migration is stable");
console.log("PASS peaceful recruitment: 3 backpack quests, trust, replay protection, housing, named residents, relocated camp, reload and succession");
