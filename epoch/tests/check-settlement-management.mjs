import assert from "node:assert/strict";
import {GameState} from "../js/state.js";
import {legacyResidents,normalizeResidents} from "../js/residents.js";
import {settlementManagementPage,managementNeedsAttention,
 manageSearchText,MANAGEMENT_SECTIONS} from "../js/settlement-management.js";

const memory=new Map();
globalThis.localStorage={
 getItem:key=>memory.get(key)||null,
 setItem:(key,value)=>memory.set(key,String(value)),
 removeItem:key=>memory.delete(key)
};
const state=new GameState({slot:1,newGame:true});
state.onChange=()=>{};
state.onVillagerNeeds=()=>{};
state.devCheats.unlimitedHealth=true;
state.devCheats.unlimitedHunger=true;
const world={people:[],player:{position:{x:80,z:80}}};
const ui={state,world,settlementFilter:"all",settlementSearch:""};
assert.deepEqual([...MANAGEMENT_SECTIONS],["overview","people","buildings","supplies"]);
assert(settlementManagementPage(ui).includes("Establish a home for your people"));
assert(state.foundStockpile(0,8));
const pile=state.data.village.stockpile;
Object.assign(pile.items,{wood:72,stone:55,vines:13,flint:3,berries:4});
state.data.village.buildings=[
 {id:"building_1",kind:"family",x:10,z:8,turn:0,level:1},
 {id:"building_2",kind:"lore",x:0,z:19,turn:0,level:1}
];
state.data.village.residents=normalizeResidents(legacyResidents(2));
state.data.village.population=3;
state.data.village.residents[0].hunger=30;
state.data.village.residents[1].energy=22;
const first=state.data.village.residents[0],second=state.data.village.residents[1];
const summary=settlementManagementPage(ui,"overview");
assert(summary.includes("Life in your settlement"));
assert(summary.includes("3 / 8"));
assert(summary.includes("4")&&summary.includes("Ready meals"));
assert(summary.includes("Quick management"));
assert(summary.includes("Manage workers"));
assert(summary.includes("Inspect upgrades"));
const people=settlementManagementPage(ui,"people");
assert(people.includes('data-settlement-job="'+first.id+'"'));
assert(people.includes('data-settlement-home="'+second.id+'"'));
assert(people.includes('data-action="settlement-profile"'));
assert(people.includes("Find resident"));
assert(people.includes("Needs attention"));
assert(managementNeedsAttention(first));
assert(managementNeedsAttention(second));
assert(!managementNeedsAttention({hunger:89,energy:89,resting:false}));
assert(manageSearchText(first,"Forager","Hut 1").includes("hut 1"));
ui.settlementFilter="workers";
let filtered=settlementManagementPage(ui,"people");
assert(filtered.includes('data-sm-worker="false"'));
assert(filtered.includes("hidden"),"filters hide people without dropping records");
ui.settlementFilter="all";
const structures=settlementManagementPage(ui,"buildings");
assert(structures.includes("Raised Granary"));
assert(structures.includes("Extended Sleeping Hut"));
assert(structures.includes("Toolmaker's Workshop"));
assert(structures.includes('data-action="settlement-upgrade"'));
assert(structures.includes('data-id="stockpile"'));
assert(structures.includes('data-id="building_1"'));
assert(!state.canUpgradeVillage("stockpile",80,80).ok,
 "legacy in-world purchases still require proximity");
assert(state.canUpgradeVillage("stockpile",80,80,{fromSettlement:true}).ok,
 "settlement-wide orders can be placed while exploring");
assert(state.upgradeVillage("stockpile",80,80,{fromSettlement:true}).ok);
assert.equal(state.stockpileInfo().capacity,720);
assert(!state.upgradeVillage("stockpile",80,80,{fromSettlement:true}).ok,
 "duplicate remote upgrades cannot double-charge");
const upgraded=settlementManagementPage(ui,"buildings");
assert(upgraded.includes("Improvement complete"));
assert(upgraded.includes('data-id="building_1"'));
const supplies=settlementManagementPage(ui,"supplies");
assert(supplies.includes("Everything in reserve"));
assert(supplies.includes("72 / 720")===false);
assert(supplies.includes('data-action="settlement-find-stockpile"'));
assert(supplies.includes("Read-only"));
assert(supplies.includes('data-action="settlement-transfer"'));
world.player.position={x:1,z:9};
const near=settlementManagementPage(ui,"supplies");
assert(near.includes('data-action="settlement-deposit-all"'));
assert(near.includes("You are close enough to transfer"));
assert(near.includes("Stockpile inventory"));
assert(state.assignResidentJob(first.id,"forager"));
assert.equal(state.data.village.residents[0].job,"forager");
assert(state.assignResidentHome(first.id,"building_1"));
assert.equal(state.data.village.residents[0].homeId,"building_1");
state.save();
const restored=new GameState({slot:1});
assert.equal(restored.data.village.stockpile.level,2);
assert.equal(restored.stockpileInfo().capacity,720);
assert.equal(restored.data.village.residents[0].job,"forager");
assert.equal(restored.data.village.residents[0].homeId,"building_1");
console.log("PASS settlement manager: summaries, searchable jobs, housing, remote upgrades, stock ledger, persistence");
