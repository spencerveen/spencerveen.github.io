import assert from "node:assert/strict";
import {GameState} from "../js/state.js";
import {legacyResidents,normalizeResidents} from "../js/residents.js";
import {settlementManagementPage,managementNeedsAttention,
 manageSearchText,MANAGEMENT_SECTIONS} from "../js/settlement-management.js";
import {COUNCIL_STAGES,councilLodge,councilStage,hasCouncilLodge} from "../js/council-evolution.js";

const memory=new Map();
globalThis.localStorage={
 getItem:key=>memory.get(key)||null,
 setItem:(key,value)=>memory.set(key,String(value)),
 removeItem:key=>memory.delete(key)
};
const state=new GameState({slot:1,newGame:true});
state.onChange=()=>{};state.onVillagerNeeds=()=>{};
state.devCheats.unlimitedHealth=true;state.devCheats.unlimitedHunger=true;
const world={people:[],player:{position:{x:80,z:80}}};
const ui={state,world,settlementFilter:"all",settlementSearch:""};
assert.deepEqual([...MANAGEMENT_SECTIONS],["overview","people","traditions"]);
assert(COUNCIL_STAGES.every(stage=>stage.era==="Stone Age"));
assert.equal(councilLodge(state.data.village),null);
assert(!hasCouncilLodge(state.data.village));
assert(settlementManagementPage(ui).includes("Build a Council Lodge"));
assert(!settlementManagementPage(ui).includes('data-settlement-job='),
 "unbuilt councils cannot manage people");
assert(state.foundStockpile(0,8));
const pile=state.data.village.stockpile;
Object.assign(pile.items,{wood:76,stone:60,vines:14,berries:4});
state.data.village.buildings=[
 {id:"hut_1",kind:"family",x:10,z:8,turn:0,level:1},
 {id:"council_1",kind:"council",x:0,z:-8,turn:0,level:1}
];
state.data.village.residents=normalizeResidents(legacyResidents(2));
state.data.village.population=3;
state.data.village.residents[0].hunger=30;
state.data.village.residents[1].energy=22;
const first=state.data.village.residents[0],second=state.data.village.residents[1];
assert(hasCouncilLodge(state.data.village));
const lodge=councilLodge(state.data.village);
assert.equal(lodge.id,"council_1");
assert.equal(councilStage(lodge).name,"Council Lodge");
assert.equal(state.villageCapacity(),8);
const overview=settlementManagementPage(ui,"overview");
assert(overview.includes("Life in your tribe"));
assert(overview.includes("Council Lodge"));
assert(overview.includes("3 / 8"));
assert(overview.includes("Manage your people"));
assert(overview.includes("Culture tree"));
assert(!overview.includes('data-action="settlement-deposit-all"'),
 "council does not replace physical stockpile");
const people=settlementManagementPage(ui,"people");
assert(people.includes('data-settlement-job="'+first.id+'"'));
assert(people.includes('data-settlement-home="'+second.id+'"'));
assert(people.includes('data-action="council-successor"'));
assert(people.includes('data-action="settlement-profile"'));
assert(people.includes("Find resident"));
assert(managementNeedsAttention(first)&&managementNeedsAttention(second));
assert(!managementNeedsAttention({hunger:89,energy:89,resting:false}));
assert(manageSearchText(first,"Forager","Hut 1").includes("hut 1"));
ui.settlementFilter="workers";
assert(settlementManagementPage(ui,"people").includes('data-sm-worker="false"'));
ui.settlementFilter="all";
const traditions=settlementManagementPage(ui,"traditions");
assert(traditions.includes("Tribal traditions"));
assert(traditions.includes("The next leader"));
assert(traditions.includes("Elders&#39; Council"));
assert(traditions.includes('data-action="council-open-culture"'));
assert(traditions.includes('data-action="settlement-upgrade" data-id="council_1"'));
assert(!traditions.includes('data-id="stockpile"'));
assert(!state.canUpgradeVillage("council_1",80,80).ok);
assert(state.canUpgradeVillage("council_1",80,80,{fromSettlement:true}).ok);
const old={...pile.items};
assert(state.upgradeVillage("council_1",80,80,{fromSettlement:true}).ok);
assert.equal(pile.items.wood,old.wood-16);
assert.equal(pile.items.stone,old.stone-12);
assert.equal(pile.items.vines,old.vines-4);
assert.equal(councilStage(lodge).name,"Elders' Council");
assert.equal(state.villageDevelopment().culturePerYear,2);
assert(!state.upgradeVillage("council_1",80,80,{fromSettlement:true}).ok);
assert(settlementManagementPage(ui,"overview").includes("ELDERS&#39; COUNCIL"));
assert(settlementManagementPage(ui,"traditions").includes("Council improvement completed"));
assert(state.assignResidentJob(first.id,"forager"));
assert(state.assignResidentHome(first.id,"hut_1"));
assert(state.chooseSuccessor(second.id));
assert.equal(state.data.successorId,second.id);
assert(settlementManagementPage(ui,"people").includes("Successor"));
assert(settlementManagementPage(ui,"traditions").includes(second.name));
state.save();
const restored=new GameState({slot:1});
assert.equal(councilStage(councilLodge(restored.data.village)).name,"Elders' Council");
assert.equal(restored.data.successorId,second.id);
assert.equal(restored.data.village.residents[0].job,"forager");
assert.equal(restored.data.village.residents[0].homeId,"hut_1");
assert.equal(restored.villageDevelopment().culturePerYear,2);
console.log("PASS Council Lodge: built-only management, workers, housing, succession, culture, stages and saves");
