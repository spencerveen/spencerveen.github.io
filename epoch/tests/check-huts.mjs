import assert from "node:assert/strict";
import {GameState} from "../js/state.js";
import {UI} from "../js/ui.js";
import {BUILDINGS} from "../js/settlement.js";
import {legacyResidents,housingUnits} from "../js/residents.js";
import {LEGACY_HOME} from "../js/stockpile.js";

const saves=new Map();
globalThis.localStorage={
 getItem:k=>saves.get(k)||null,
 setItem:(k,v)=>saves.set(k,v),
 removeItem:k=>saves.delete(k)
};
assert.equal(BUILDINGS.family.name,"Hut","the construction catalog calls these Huts");
assert.equal(BUILDINGS.family.short,"Housing");
const state=new GameState({slot:1,newGame:true});
state.onChange=()=>{};
assert(state.foundStockpile(LEGACY_HOME.x,LEGACY_HOME.z));
state.data.village.buildings.push({id:"hut_test",kind:"family",x:-8,z:4,turn:0});
state.data.village.residents=legacyResidents(2);
state.data.village.residents[0].homeId="hut_test";
state.data.village.residents[1].homeId="camp";
state.data.village.population=3;
const ui={state,contextBuilding:()=>state.data.village.buildings[0]};
const html=UI.prototype.hut.call(ui);
assert(html.includes("Hut 1"),"the panel displays the actual house label");
assert(html.includes("Who lives here?"));
assert(html.includes(state.data.village.residents[0].name),"Hut shows the resident actually assigned to it");
assert(!html.includes(state.data.village.residents[1].name),"villagers living elsewhere are not incorrectly listed");
assert(html.includes("1 / 3"),"vacancies reflect actual occupancy");
assert(html.includes('data-action="view-resident"'),"residents have usable profile links");
assert(!html.includes('data-action="next"'),"the Hut no longer offers manual succession");
assert(!html.includes('data-action="confirm-next"'));
assert(!html.includes("Plan succession"));
const fake={...state.data.village,residents:[state.data.village.residents[1]]};
const emptyUi={state:{...state,data:{...state.data,village:fake},villageHousing:()=>housingUnits(fake)},
 contextBuilding:()=>fake.buildings[0]};
const empty=UI.prototype.hut.call(emptyUi);
assert(empty.includes("Unoccupied Hut"));
assert(!empty.includes('data-action="view-resident"'));
state.save();
const restored=new GameState({slot:1});
assert.equal(restored.villageHousing()[1].label,"Hut 1","existing saved structures are renamed without changing identifiers");
assert.equal(restored.villageHousing()[1].occupied,1);
assert.equal(restored.data.village.residents[0].homeId,"hut_test","Hut rename does not lose saved assignments");
console.log("PASS huts: household view, assigned residents, vacancies, profile links, no manual succession and backward-compatible saves");
