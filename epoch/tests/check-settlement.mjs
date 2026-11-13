// Dependency-free regression checks for the first Stone Age settlement slice.
// Uses the same source modules and the real versioned local-save key.
import assert from "node:assert/strict";
import fs from "node:fs";
import {STARTER_SEED} from "../js/forest-generation.js";
const load=p=>fs.readFileSync(new URL(p,import.meta.url),"utf8");
const clean=s=>s.replace(/^import .*$/gm,"").replace(/^export /gm,"");
const person=new Function(clean(load("../js/characters.js"))+"\nreturn {founderAppearance,descendantAppearance,normalizeAppearance};")();
const village=new Function(clean(load("../js/settlement.js"))+"\nreturn {BUILDINGS,PLOT_BY_ID,PLOTS,capacity,emptyVillage};")();
const store=new Map();
const localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)};
const GameState=new Function("localStorage","deps",
  "const {founderAppearance,descendantAppearance,normalizeAppearance,BUILDINGS,PLOT_BY_ID,capacity,emptyVillage,STARTER_SEED}=deps;\n"+
   clean(load("../js/state.js"))+"\nreturn GameState;"
)(localStorage,{...person,...village,STARTER_SEED});
const fresh=new GameState();fresh.onChange=()=>{};
assert.equal(fresh.villageCapacity(),5);
assert.equal(fresh.data.village.population,5);
assert.equal(village.PLOTS.length,5);
assert.equal(fresh.canBuildPlot("hearth_1").ok,false,"Fire research required");
assert.equal(fresh.buildVillagePlot("unknown"),false);
fresh.data.resources.wood=200;fresh.data.resources.stone=200;
assert(fresh.buildVillagePlot("family_1"),"First hut built");
assert.equal(fresh.villageCapacity(),8,"Each hut adds exactly three places");
assert(fresh.data.shelter,"Legacy shelter compatibility flag");
assert.equal(fresh.buildVillagePlot("family_1"),false,"Cannot double-build a plot");
assert(fresh.buildVillagePlot("family_2"));
assert.equal(fresh.villageCapacity(),11);
assert(!fresh.buildVillagePlot("hearth_1"),"Tech prerequisites enforced");
fresh.data.technologies.push("fire");
assert(fresh.buildVillagePlot("hearth_1"));
assert(!fresh.buildVillagePlot("lore_1"),"Toolmaking is required");
fresh.data.technologies.push("tools");
assert(fresh.buildVillagePlot("lore_1"));
assert(!fresh.buildVillagePlot("council_1"),"Tribal Community required");
fresh.data.civics.push("community");
assert(fresh.buildVillagePlot("council_1"));
assert.equal(Object.keys(fresh.data.village.plots).length,5);
const reload=new GameState();
assert.equal(reload.villageCapacity(),11,"Huts persist after reload");
assert.equal(Object.keys(reload.data.village.plots).length,5);
reload.nextGeneration();
assert.equal(reload.villageCapacity(),11,"Housing survives descendant succession");
assert.equal(Object.keys(reload.data.village.plots).length,5,"All village buildings survive succession");
const previousSave={version:1,hero:{name:"Aren",age:30,appearance:person.founderAppearance()},shelter:true,
 resources:{wood:11,stone:10,food:3},skills:{},technologies:["fire"],civics:[],history:[]};
store.set("epoch.stoneage.v1",JSON.stringify(previousSave));
const migrated=new GameState();
assert.equal(migrated.data.village.plots.family_1,"family","Old built shelter migrates for free");
assert.equal(migrated.villageCapacity(),8);
assert.equal(migrated.data.resources.wood,11,"Existing resources preserved");
assert.equal(migrated.data.worldSeed,STARTER_SEED,"Old saves use a stable forest seed");
store.clear();
const reset=new GameState();
assert.equal(reset.villageCapacity(),5,"Fresh characters have no inherited huts");
assert.equal(Object.keys(reset.data.village.plots).length,0);
assert(Number.isInteger(reset.data.worldSeed)&&reset.data.worldSeed>0,"New game gets a valid world seed");
reset.save();
const seedReloaded=new GameState();
assert.equal(seedReloaded.data.worldSeed,reset.data.worldSeed,"World seed persists across page reloads");
console.log("PASS Epoch village: five plots, 3-person housing, resource costs, prerequisites, legacy saves, local persistence, descendant inheritance");
