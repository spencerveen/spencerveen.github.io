import assert from "node:assert/strict";
import fs from "node:fs";
import * as inventory from "../js/inventory.js";
import {STARTER_SEED} from "../js/forest-generation.js";
const {ITEMS,ITEM_IDS,INVENTORY_SLOTS,STACK_LIMIT,emptyInventory,addItems,
 removeItems,countItem,migrateResources,retrieveUnpacked,resourceTotals,occupiedSlots}=inventory;
const slots=emptyInventory();
assert.equal(slots.length,10);
assert.equal(STACK_LIMIT,12);
assert.deepEqual(ITEM_IDS,["wood","stone","berries","vines"]);
assert.equal(addItems(slots,"wood",12),12);
assert.deepEqual(slots[0],{id:"wood",qty:12});
assert.equal(addItems(slots,"wood",1),1);
assert.deepEqual(slots[1],{id:"wood",qty:1},"13th wood starts a new stack");
assert.equal(addItems(slots,"wood",11),11);
assert.equal(occupiedSlots(slots),2,"partial stack filled before another slot");
assert.equal(addItems(slots,"food",2),2,"legacy food alias means berries");
assert.equal(countItem(slots,"berries"),2);
assert.equal(addItems(slots,"vines",13),13);
assert.equal(occupiedSlots(slots),5);
assert.equal(removeItems(slots,"wood",13),true);
assert.equal(countItem(slots,"wood"),11);
assert.equal(removeItems(slots,"wood",12),false,"cannot spend more than carried");
assert.equal(countItem(slots,"wood"),11,"failed spend is atomic");
assert.equal(removeItems(slots,"berries",2),true);
assert.equal(countItem(slots,"food"),0);

const full=emptyInventory();
assert.equal(addItems(full,"stone",119),119);
assert.equal(addItems(full,"vines",1),0,"different item cannot enter full pack");
assert.equal(addItems(full,"stone",2),1,"partial intake limited by available space");
assert.equal(addItems(full,"stone",1),0);
assert.equal(full.length,10);
assert.equal(full.reduce((n,x)=>n+(x?.qty||0),0),120);
assert(full.every(s=>s.qty<=12),"no stack exceeds twelve");
assert.equal(removeItems(full,"stone",12),true);
assert.equal(addItems(full,"vines",12),12,"freed slot can accept new item");

const old={wood:100,stone:100,food:30};
const migration=migrateResources(old);
assert.equal(migration.slots.length,10);
for(const id of ITEM_IDS){
 const original=id==="berries"?old.food||0:old[id]||0;
 const saved=countItem(migration.slots,id)+(migration.unpacked[id]||0);
 assert.equal(saved,original,"legacy migration cannot lose "+id);
}
assert(Object.values(migration.unpacked).some(n=>n>0),"legacy extras are retained");
assert.equal(retrieveUnpacked(migration.slots,migration.unpacked),0,"cannot bypass a full pack");
const occupied=migration.slots.findIndex(s=>s?.id==="wood");
assert(occupied>=0);
migration.slots[occupied]=null;
assert(retrieveUnpacked(migration.slots,migration.unpacked)>0,"old supplies can be reclaimed after freeing a slot");

const load=p=>fs.readFileSync(new URL(p,import.meta.url),"utf8");
const clean=s=>s.replace(/^import[\s\S]*?;\s*$/gm,"").replace(/^export /gm,"");
const chars=new Function(clean(load("../js/characters.js"))+
 "\nreturn {founderAppearance,descendantAppearance,normalizeAppearance};")();
const settlement=new Function(clean(load("../js/settlement.js"))+
 "\nreturn {BUILDINGS,PLOT_BY_ID,capacity,emptyVillage};")();
const store=new Map();
const localStorage={
 getItem:key=>store.get(key)||null,
 setItem:(key,value)=>store.set(key,value),
 removeItem:key=>store.delete(key)
};
const deps={...chars,...settlement,...inventory,STARTER_SEED};
const GameState=new Function("localStorage","deps",
 "const {"+Object.keys(deps).join(",")+"}=deps;\n"+clean(load("../js/state.js"))+"\nreturn GameState;")(localStorage,deps);
const state=new GameState();
state.onChange=()=>{};
assert.equal(state.data.inventory.length,10);
assert.equal(state.inventoryUsed(),0);
const wood=state.gather("wood");
assert.equal(wood.added,2);
assert.equal(wood.vines,1);
assert.equal(state.inventoryCount("wood"),2);
assert.equal(state.inventoryCount("vines"),1);
const bush=state.gather("food");
assert.equal(bush.added,2);
assert.equal(bush.vines,1);
assert.equal(state.inventoryCount("berries"),2);
assert.equal(state.data.resources.food,2,"research uses berries as food");
const stone=state.gather("stone");
assert.equal(stone.added,2);
assert.equal(stone.vines,0);
assert.equal(state.inventoryUsed(),4,"each resource has one initial stack");
const experienceBefore=state.data.skills.mining;
assert.equal(state.addResource("wood",10),10);
assert.equal(state.addResource("berries",10),10);
assert.equal(state.addResource("vines",10),10);
assert.equal(state.addResource("stone",82),82);
assert.equal(state.inventoryCount("stone"),84);
assert.equal(state.inventoryUsed(),10);
assert.equal(state.addResource("stone",15),0,"inventory cannot overfill");
const stoneStacks=state.data.inventory.filter(s=>s?.id==="stone");
assert(stoneStacks.length===7);
assert(stoneStacks.every(s=>s.qty<=12));
const fullAttempt=state.gather("wood");
assert.equal(fullAttempt.type,"full","blocked gathering cannot award wood when ten slots are occupied");
assert.equal(state.data.skills.woodcutting,13,"blocked gathering does not award XP");
assert.equal(state.data.resources.wood,12);
assert(state.data.skills.mining===experienceBefore,"adding resources directly awards no XP");
const discard=state.data.inventory.findIndex(s=>s?.id==="stone");
assert(state.discardStack(discard));
assert(state.inventoryUsed()<10);
assert(state.gather("wood").added>0);
state.nextGeneration();
assert(state.inventoryCount("vines")>=1,"inventory survives descendants");
const reloaded=new GameState();
assert.deepEqual(reloaded.data.inventory,state.data.inventory,"inventory stacks persist across reload");

const prior={version:1,hero:{name:"Aren",age:25,appearance:chars.founderAppearance()},
 resources:{wood:100,stone:100,food:30},technologies:[],civics:[],history:[]};
store.set("epoch.stoneage.v1",JSON.stringify(prior));
const migrated=new GameState();
assert.equal(migrated.data.inventory.length,10);
for(const id of ITEM_IDS){
 const original=id==="berries"?prior.resources.food||0:prior.resources[id]||0;
 assert.equal(migrated.inventoryCount(id)+migrated.data.unpacked[id],original,
  "no legacy resource quantity lost: "+id);
}
migrated.save();
const again=new GameState();
assert.deepEqual(again.data.unpacked,migrated.data.unpacked);
assert.deepEqual(again.data.inventory,migrated.data.inventory);
console.log("PASS Epoch inventory: 10 slots, x12 stacks, vines, berries, partial harvest, full pack, crafting spend, persistence and lossless migration");
