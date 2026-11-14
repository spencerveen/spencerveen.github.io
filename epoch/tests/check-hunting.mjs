import assert from "node:assert/strict";
import {GameState} from "../js/state.js";
import {forestAnimals,CHUNK_SIZE} from "../js/forest-generation.js";
import {WILDLIFE,normalizeWildlife,animalMotion,animalCombatStats} from "../js/hunting.js";
import {ITEMS} from "../js/inventory.js";
const mem=new Map();
globalThis.localStorage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
const seed=12000;
const animals=[];
for(let cx=-5;cx<=5;cx++)for(let cz=-5;cz<=5;cz++){
 const a=forestAnimals(seed,cx,cz);
 assert.deepEqual(a,forestAnimals(seed,cx,cz),"same seed reproduces wildlife");
 for(const animal of a){
  assert.equal(Math.floor(animal.x/CHUNK_SIZE),cx);
  assert.equal(Math.floor(animal.z/CHUNK_SIZE),cz);
  assert(WILDLIFE[animal.species]);
  animals.push(animal);
 }
}
assert.deepEqual(new Set(animals.map(a=>a.species)),new Set(["deer","rabbit","boar"]));
assert.equal(new Set(animals.map(a=>a.id)).size,animals.length,"each animal has unique world ID");
const a=animalMotion("deer",1,0,1,0,0,0,2,.2);
assert(a.x>1&&a.mode==="flee","deer run away from approaching player");
const rabbit=animalMotion("rabbit",1,0,1,0,0,0,2,.2);
assert(rabbit.x>a.x,"rabbits flee faster than deer");
const boar=animalMotion("boar",1,0,1,0,0,0,2,.2,true);
assert(boar.x<1&&boar.mode==="charge","provoked boars defend themselves");
assert.equal(animalCombatStats("stone_spear",ITEMS.stone_spear.combat).reach,2.7);
assert.equal(animalCombatStats("bow",ITEMS.bow.combat),null,"unimplemented bows can't hunt");
const game=new GameState({slot:1,newGame:true});game.onChange=()=>{};
const deer={id:"wildlife:unit:deer",species:"deer"};
assert.equal(game.wildlifeStatus(deer).health,16);
assert.equal(game.huntAnimal(deer).ok,false,"no weapon means no hunting");
assert.equal(game.data.survival.stamina,100);
game.data.equipment.weapon="wood_club";
game.data.weaponCondition=3;
game.data.survival.stamina=8;
assert.equal(game.huntAnimal(deer).ok,false,"insufficient stamina blocks attack");
game.data.survival.stamina=100;
for(const expected of [9,2,0]){
 const hit=game.huntAnimal(deer);
 assert(hit.ok&&hit.damage===7);
 assert.equal(game.wildlifeStatus(deer).health,expected);
}
assert(game.wildlifeStatus(deer).dead);
assert.equal(game.data.equipment.weapon,null,"club breaks after last swing");
assert.equal(game.data.weaponCondition,null);
assert.equal(game.huntAnimal(deer).ok,false,"dead wildlife cannot be attacked again");
game.data.inventory=Array.from({length:10},()=>({id:"stone",qty:12}));
assert.equal(game.harvestAnimal(deer).ok,false,"no space for 3 different drops");
assert(game.wildlifeStatus(deer).dead&&!game.wildlifeStatus(deer).looted);
for(let i=0;i<3;i++)game.data.inventory[i]=null;
const gathered=game.harvestAnimal(deer);
assert(gathered.ok&&gathered.looted);
assert.deepEqual(gathered.loot,{animal_meat:3,fur:2,raw_hide:1});
assert.equal(game.inventoryCount("animal_meat"),3);
assert.equal(game.inventoryCount("fur"),2);
assert.equal(game.inventoryCount("raw_hide"),1);
assert.equal(game.harvestAnimal(deer).ok,false,"cannot duplicate harvested resources");
game.save();
const loaded=new GameState({slot:1});
assert.deepEqual(loaded.wildlifeStatus(deer),game.wildlifeStatus(deer));
assert.equal(loaded.harvestAnimal(deer).ok,false);
const hurt={id:"wildlife:unit:boar",species:"boar"};
loaded.data.equipment.weapon="stone_spear";
loaded.data.weaponCondition=48;
loaded.data.survival.stamina=100;
const swing=loaded.huntAnimal(hurt);
assert.equal(swing.ok,true);
assert.equal(swing.damage,8);
assert.equal(loaded.wildlifeStatus(hurt).health,14);
loaded.save();
assert.equal(new GameState({slot:1}).wildlifeStatus(hurt).health,14,
 "animal injuries remain across save and terrain reload");
const danger=new GameState({slot:2,newGame:true});
danger.data.survival.health=25;
danger.damageHero(9,"a wild boar attack");
assert.equal(danger.data.survival.health,16);
danger.setDevCheat("unlimitedHealth",true);
danger.damageHero(9,"a wild boar attack");
assert.equal(danger.data.survival.health,100,"dev cheat remains effective");
assert.deepEqual(normalizeWildlife({[deer.id]:{species:"deer",health:0,dead:true,looted:true}})[deer.id],
 {species:"deer",health:0,dead:true,looted:true});
console.log("PASS Phase 5B wildlife: seeded deer/boar/rabbit, flee/charge, weapon stamina, breakage, carcass loot and persistence");
