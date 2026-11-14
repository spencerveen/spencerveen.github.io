import assert from "node:assert/strict";
import {
 MAX_SAVE_SLOTS,LEGACY_KEY,MIGRATION_KEY,saveSlotKey,readSlot,
 saveSummary,allSaveSummaries,mostRecentSave,removeSlot,migrateLegacySave
} from "../js/save-slots.js";
import {GameState} from "../js/state.js";
import {founderAppearance,normalizeAppearance} from "../js/characters.js";
const store=new Map();
globalThis.localStorage={
 getItem:key=>store.get(key)||null,
 setItem:(key,value)=>store.set(key,value),
 removeItem:key=>store.delete(key)
};
assert.equal(MAX_SAVE_SLOTS,3);
assert.equal(saveSlotKey(1),"epoch.stoneage.slot.1");
assert.equal(saveSlotKey(3),"epoch.stoneage.slot.3");
assert.throws(()=>saveSlotKey(4),RangeError);
assert.equal(allSaveSummaries().filter(s=>!s.empty).length,0,"new browser has 3 empty slots");
assert.equal(mostRecentSave(),null);
const founder=founderAppearance();
const original=new GameState();
original.data.hero.name="Legacy Ada";
original.data.skills.woodcutting=777;
original.data.inventory[0]={id:"wood",qty:7};
original.data.worldSeed=987321;
original.data.village.stockpile={x:6,z:6,items:{wood:12,stone:9,berries:0,vines:0}};
original.save();
const untouched=store.get(LEGACY_KEY);
assert(migrateLegacySave(),"older single save imported to slot 1");
assert.equal(store.get(LEGACY_KEY),untouched,"legacy save never overwritten or deleted");
assert.equal(readSlot(1).hero.name,"Legacy Ada");
assert.equal(readSlot(1).skills.woodcutting,777);
assert.equal(readSlot(1).worldSeed,987321);
assert.equal(readSlot(1).village.stockpile.items.stone,9);
assert.equal(migrateLegacySave(),false,"migration is one-time only");
const imported=new GameState({slot:1});
assert.equal(imported.data.hero.name,"Legacy Ada");
assert.equal(imported.data.inventory[0].qty,7);
assert.equal(imported.data.village.stockpile.items.wood,12);
assert.equal(typeof imported.setAppearance,"undefined","live character cannot be edited");
const female={...founder,sex:"female",hairStyle:2,skin:4,beard:0,height:1.06,build:.94};
const second=new GameState({slot:2,newGame:true,founder:{name:"Mira",appearance:female}});
assert.equal(second.data.hero.name,"Mira");
assert.deepEqual(second.data.hero.appearance,normalizeAppearance(female));
assert.equal(second.data.lineage[0].name,"Mira");
assert.deepEqual(second.data.lineage[0].appearance,normalizeAppearance(female),
 "Founder and initial lineage share one appearance profile");
assert(second.save());
assert.equal(second.data.inventory.length,10);
assert.equal(second.data.village.stockpile,null);
assert.equal(readSlot(2).hero.name,"Mira");
const third=new GameState({slot:3,newGame:true,founder:{name:"Toran",appearance:founder}});
third.data.resources.wood=0;
third.data.skills.foraging=42;
assert(third.save());
assert.equal(readSlot(3).skills.foraging,42);
second.data.skills.mining=555;
assert(second.save());
assert.equal(readSlot(1).skills.woodcutting,777,"slot 1 untouched by slot 2 saves");
assert.equal(readSlot(3).skills.mining,0,"slot 3 untouched by slot 2 saves");
assert.equal(new GameState({slot:2}).data.skills.mining,555);
const slot2Latest=readSlot(2);
slot2Latest.lastSavedAt=Date.now()+2000;
store.set(saveSlotKey(2),JSON.stringify(slot2Latest));
assert.equal(mostRecentSave().slot,2,"most recently saved slot is Continue target");
assert.equal(allSaveSummaries().filter(s=>!s.empty).length,3);
const slot2Copy=JSON.stringify(readSlot(2));
second.nextGeneration();
assert.equal(second.data.hero.name,"Eira");
assert.equal(second.data.lineage[0].name,"Mira","founder remains in lineage history");
assert.equal(readSlot(1).hero.name,"Legacy Ada");
assert.equal(readSlot(3).hero.name,"Toran");
assert(removeSlot(2));
assert.equal(readSlot(2),null);
assert.equal(migrateLegacySave(),false,"deleting a slot never resurrects old save");
assert.equal(readSlot(1).hero.name,"Legacy Ada");
assert.equal(new GameState({slot:2,newGame:true,founder:{name:"New Start",appearance:founder}}).data.hero.name,"New Start");
assert.equal(store.get(LEGACY_KEY),untouched);
console.log("PASS Epoch save slots: 3 independent worlds, one-time migration, founder-only appearance, safe delete and descendants");
