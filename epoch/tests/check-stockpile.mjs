import assert from "node:assert/strict";
import {ITEM_IDS} from "../js/inventory.js";
import {PLOTS,plotAtHome} from "../js/settlement.js";
import {LEGACY_HOME,STOCKPILE_CAPACITY,STOCKPILE_INTERACT_RANGE,VILLAGE_RADIUS,
 snapGrid,stockpileUsed,stockpileValidation} from "../js/stockpile.js";
const memory=new Map();
globalThis.localStorage={
 getItem:key=>memory.get(key)||null,
 setItem:(key,value)=>memory.set(key,value),
 removeItem:key=>memory.delete(key)
};
const {GameState}=await import("../js/state.js");
assert.equal(STOCKPILE_CAPACITY,480);
assert.equal(snapGrid(5.2),6);
assert.equal(snapGrid(-3.1),-4);
const game=new GameState();
assert.equal(game.data.village.stockpile,null);
assert.equal(game.canBuildPlot("family_1").ok,false,"No construction before founding");
assert.equal(game.depositAllToStockpile(0,0),0);
assert.equal(game.foundStockpile(5.2,6.7),true,"First stockpile free to found");
assert.equal(game.foundStockpile(10,10),false,"Only one founding stockpile");
assert.equal(game.stockpileInfo().x,6);
assert.equal(game.stockpileInfo().z,6);
assert.equal(game.stockpileInfo().used,0);
assert.equal(game.canBuildPlot("family_1").ok,false,"Backpack cannot pay for a building");
const offset=plotAtHome(game.data.village,"family_1");
assert.equal(offset.x,PLOTS[0].x+6-LEGACY_HOME.x);
assert.equal(offset.z,PLOTS[0].z+6-LEGACY_HOME.z);
for(const p of PLOTS){
 const site=plotAtHome(game.data.village,p.id);
 assert(Math.hypot(site.x-6,site.z-6)<=VILLAGE_RADIUS,"Starter plots remain within village boundary");
}
const clearMock={
 player:{position:{x:0,z:0}},
 groundY(){return .2},
 obstacles:[]
};
assert(stockpileValidation(clearMock,6.4,6.1).ok,"Suitable stockpile terrain");
clearMock.obstacles.push({x:6,z:6,r:.75});
assert(!stockpileValidation(clearMock,6,6).ok,"Trees and rocks block founding");
clearMock.obstacles.length=0;
clearMock.groundY=(x,z)=>x>5?2:.2;
assert(!stockpileValidation(clearMock,6,6).ok,"Steep terrain is rejected");

const initial={wood:44,stone:30,berries:9,vines:8};
for(const [id,n] of Object.entries(initial))assert.equal(game.addResource(id,n),n);
assert.equal(game.depositAllToStockpile(0,0),0,"Cannot deposit from far away");
assert.equal(game.stockpileInfo().used,0);
assert.equal(game.depositAllToStockpile(6,6),91,"All materials deposited into stockpile");
assert.equal(game.inventoryUsed(),0,"Personal backpack is empty after depositing");
for(const id of ITEM_IDS)assert.equal(game.stockpileInfo().items[id],initial[id]);
assert.equal(game.canBuildPlot("family_1").ok,true,"Stored supplies unlock building");
assert(game.buildVillagePlot("family_1"),"Family Hut uses stockpile resources");
assert.equal(game.stockpileInfo().items.wood,34);
assert.equal(game.stockpileInfo().items.stone,24);
assert.equal(game.villageCapacity(),8);
assert.equal(game.inventoryCount("wood"),0,"No hidden carried supplies after construction");
const before=JSON.stringify(game.stockpileInfo());
assert.equal(game.withdrawFromStockpile("wood",12,100,100),0,"Cannot withdraw from afar");
assert.equal(JSON.stringify(game.stockpileInfo()),before);
assert.equal(game.withdrawFromStockpile("wood",12,6,6),12);
assert.equal(game.inventoryCount("wood"),12);
assert.equal(game.stockpileInfo().items.wood,22);
assert.equal(game.depositToStockpile("wood",5,6,6),5);
assert.equal(game.inventoryCount("wood"),7);
assert.equal(game.stockpileInfo().items.wood,27);
assert(game.buildVillagePlot("family_2"),"Second hut spends village materials");
assert.equal(game.stockpileInfo().items.wood,17);
assert.equal(game.stockpileInfo().items.stone,18);
assert.equal(game.villageCapacity(),11);
const savedPile=game.stockpileInfo();
const reloaded=new GameState();
assert.deepEqual(reloaded.stockpileInfo(),savedPile,"Village stockpile survives browser reload");
reloaded.nextGeneration();
assert.deepEqual(reloaded.stockpileInfo(),savedPile,"Stockpile survives descendant generations");
assert.equal(reloaded.villageCapacity(),11,"Housing also survives generations");
const full=new GameState();
full.data.inventory=Array.from({length:10},()=>null);
full.data.village.stockpile.items={wood:STOCKPILE_CAPACITY-1,stone:0,berries:0,vines:0};
full.addResource("stone",12);
assert.equal(full.depositToStockpile("stone",12,6,6),1,"Partial deposit respects capacity");
assert.equal(full.inventoryCount("stone"),11,"Extra resources remain in backpack");
assert.equal(stockpileUsed(full.data.village.stockpile),STOCKPILE_CAPACITY);
assert.equal(full.depositToStockpile("stone",10,6,6),0,"Full stockpile rejects deposits");
console.log("PASS Epoch stockpile: founding, 2m grid placement, blocked terrain, save migration, backpack transfer, village costs, generation persistence, storage capacity");
