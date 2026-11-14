import {founderAppearance,descendantAppearance,normalizeAppearance} from "./characters.js?v=20261113m";
import {LEGACY_KEY,saveSlotKey} from "./save-slots.js?v=20261113m";
import {BUILDINGS,PLOT_BY_ID,plotAtHome,capacity,emptyVillage} from "./settlement.js?v=20261113k";
import {LEGACY_HOME,createStockpile,normalStockpile,stockpileCount,stockpileUsed,
 STOCKPILE_CAPACITY,stockpileHas,payStockpile,nearStockpile,withinVillage,
 depositStockpile,depositAllStockpile,withdrawStockpile} from "./stockpile.js?v=20261113k";
import {STARTER_SEED} from "./forest-generation.js?v=20261113k";
import {resourceNodeStatus,resourceStateStats} from "./resource-nodes.js?v=20261113k";
import {harvestAtNode} from "./harvest.js?v=20261113k";
import {ITEMS,INVENTORY_SLOTS,emptyInventory,emptyUnpacked,normalizeInventory,
 normalizeUnpacked,migrateResources,addItems,removeItems,countItem,
 resourceTotals,occupiedSlots,unpackedCount,retrieveUnpacked} from "./inventory.js?v=20261113k";
export const SKILLS=[
  ["woodcutting","Woodcutting"],["mining","Mining"],["foraging","Foraging"],
  ["crafting","Crafting"],["construction","Construction"],["survival","Survival"]
];
export const TECH={
 fire:{name:"Control of Fire",description:"Learn to start and tend fire. Unlocks construction of the village Cooking Hearth; no campfire is built automatically.",cost:{wood:4,stone:2,knowledge:3},needs:[]},
 tools:{name:"Stone Toolmaking",description:"Shape stone tools and craft your first proper axe.",cost:{wood:5,stone:6,knowledge:7},needs:["fire"]},
 farming:{name:"Early Agriculture",description:"Experiment with growing food and preparing permanent farmland. A preview of our next age.",cost:{food:10,stone:5,knowledge:18},needs:["tools"],culture:["community"]}
};
export const CIVICS={
 community:{name:"Tribal Community",description:"Establish common responsibilities and organize a small settlement.",cost:{wood:8,food:6,culture:5},needs:[]},
 oral:{name:"Oral Tradition",description:"Teach descendants more of the skills learned by their ancestors.",cost:{food:8,culture:10},needs:["community"]},
 apprenticeship:{name:"Apprenticeship",description:"Create a tradition of mentorship across generations.",cost:{food:12,wood:8,culture:18},needs:["oral"]}
};
const fresh=(founder=null)=>{
 const appearance=normalizeAppearance(founder?.appearance||founderAppearance());
 const name=String(founder?.name||"Aren").trim().slice(0,24)||"Aren";
 return {
 version:1,year:-12000,calendarProgress:0,generation:1,worldSeed:Math.floor(Math.random()*0x7fffffff)+1,hero:{name,age:18,appearance},
 skills:Object.fromEntries(SKILLS.map(([id])=>[id,0])),
 resources:{wood:0,stone:0,food:0,vines:0},inventory:emptyInventory(),unpacked:emptyUnpacked(),resourceNodes:{},knowledge:0,culture:0,
 technologies:[],civics:[],axe:false,shelter:false,village:emptyVillage(),
 lineage:[{name,gen:1,start:-12000,role:"Founder",appearance:{...appearance}}],
 history:["The wanderer "+name+" entered a quiet clearing in a vast prehistoric wilderness."]
 };
};
export function threshold(level){return Math.round(35*level**1.65)}
export function skillLevel(xp){let level=1,remaining=xp;while(level<99 && remaining>=threshold(level)){remaining-=threshold(level);level++}return {level,remaining,next:threshold(level)}}
export class GameState{
 constructor(options={}){
  const selected=typeof options==="number"?{slot:options}:options||{};
  this.slot=selected.slot===undefined?null:selected.slot;
  this.storageKey=this.slot===null?LEGACY_KEY:saveSlotKey(this.slot);
  let data=null;
  if(!selected.newGame)try{data=JSON.parse(localStorage.getItem(this.storageKey)||"null")}catch{}
  const base=fresh(selected.newGame?selected.founder:null);
  this.data=data && data.version===1?{...base,...data,
   hero:{...base.hero,...data.hero},resources:{...base.resources,...data.resources},
   skills:{...base.skills,...data.skills}}:base;
  // Existing pre-chunk saves get one stable forest seed. New games and
  // explicitly reset games receive a new seed, persisted with their world.
  this.data.worldSeed=data?.worldSeed===undefined&&data?.version===1
   ?STARTER_SEED:(Number(this.data.worldSeed)>>>0)||STARTER_SEED;
  this.data.hero.appearance=normalizeAppearance(this.data.hero.appearance||founderAppearance());
  // Save migration: previous players with a built shelter receive one
  // Family Hut free in the equivalent original location. No progress lost.
  if(!data?.village && this.data.shelter){
   this.data.village={plots:{family_1:"family"},population:5};
  }else{
   this.data.village={
    ...emptyVillage(),...(this.data.village||{}),
    plots:{...(this.data.village?.plots||{})}
   };
  }
  this.data.village.population=Math.max(1,Math.min(capacity(this.data.village),Number(this.data.village.population)||5));
  // A veteran with constructed huts gets a free stockpile at the original
  // camp, so the previously built structures stay in their exact positions.
  // Other characters can choose their own starting location.
  if(data?.version===1 && data?.village?.stockpile===undefined
     && Object.keys(this.data.village.plots).length>0)
   this.data.village.stockpile=createStockpile(LEGACY_HOME.x,LEGACY_HOME.z);
  else this.data.village.stockpile=normalStockpile(this.data.village.stockpile);
  // Old saves tracked boundless counters. Pack as much as possible into ten
  // 12-item slots, and retain any remainder as recoverable migration supplies.
  // Never silently delete a veteran player's existing wood/stone/berries.
  if(data?.version===1 && Array.isArray(data.inventory)){
   this.data.inventory=normalizeInventory(data.inventory);
   this.data.unpacked=normalizeUnpacked(data.unpacked);
  }else{
   const migration=migrateResources(data?.resources);
   this.data.inventory=migration.slots;
   this.data.unpacked=migration.unpacked;
  }
  this.syncResources();
  // Untouched procedural nodes are implicit. Save only modified resource IDs.
  this.data.resourceNodes=data?.resourceNodes&&typeof data.resourceNodes==="object"
   &&!Array.isArray(data.resourceNodes)?{...data.resourceNodes}:{};
  this.onChange=()=>{};
  this.lastSave=0;
 }
 save(){
  try{
   this.data.lastSavedAt=Date.now();
   localStorage.setItem(this.storageKey,JSON.stringify(this.data));
   return true;
  }catch(e){console.warn("Save unavailable",e);return false}
 }
 changed(message){if(message)this.data.history.unshift(message);this.data.history=this.data.history.slice(0,80);this.save();this.onChange();}
 syncResources(){
  // Legacy/UI tech APIs continue to read resources.food as Wild Berries.
  // Inventory slots are the only source of truth for material quantities.
  this.data.resources=resourceTotals(this.data.inventory);
 }
 inventoryUsed(){return occupiedSlots(this.data.inventory)}
 inventoryCount(id){return countItem(this.data.inventory,id)}
 inventoryUnpacked(){return unpackedCount(this.data.unpacked)}
 addResource(id,quantity){
  const added=addItems(this.data.inventory,id,quantity);
  this.syncResources();return added;
 }
 retrieveLegacySupplies(){
  const amount=retrieveUnpacked(this.data.inventory,this.data.unpacked);
  if(amount){this.syncResources();this.changed()}
  return amount;
 }
 discardStack(index){
  if(!Number.isInteger(index)||index<0||index>=INVENTORY_SLOTS)return false;
  if(!this.data.inventory[index])return false;
  this.data.inventory[index]=null;
  this.syncResources();this.changed();
  return true;
 }
 enough(cost){
  return Object.entries(cost).every(([key,amount])=>
   key==="knowledge"||key==="culture"?
   this.data[key]>=amount:countItem(this.data.inventory,key)>=amount);
 }
 pay(cost){
  if(!this.enough(cost))return false;
  for(const [key,amount] of Object.entries(cost)){
   if(key==="knowledge"||key==="culture")this.data[key]-=amount;
   else removeItems(this.data.inventory,key,amount);
  }
  this.syncResources();return true;
 }
 gainXP(skill,amount){this.data.skills[skill]=(this.data.skills[skill]||0)+amount;this.data.knowledge+=skill==="survival"?0:1}
 gather(type){
  const gathering={
   wood:{name:"wood",skill:"woodcutting",amount:this.data.axe?3:2,xp:13},
   stone:{name:"stone",skill:"mining",amount:2,xp:12},
   food:{name:"wild berries",skill:"foraging",amount:2,xp:12}
  };
  const info=gathering[type];if(!info)return null;
  const primary=type==="food"?"berries":type;
  const gained=this.addResource(primary,info.amount);
  if(!gained)return {label:"Pack full! Spend or drop a stack to gather more.",type:"full"};
  let vines=0;
  // Trees and berry bushes both yield basic binding vines. They are real
  // inventory items and never sneak past the 10-slot limit.
  if(type==="wood"||type==="food")vines=this.addResource("vines",1);
  this.gainXP(info.skill,Math.max(1,Math.round(info.xp*gained/info.amount)));
  this.gainXP("survival",2);
  if(type==="food")this.data.culture++;
  this.changed();
  return {label:`+${gained} ${info.name}${vines?" · +"+vines+" vines":""}${gained<info.amount?" (pack nearly full)":""}`,type,added:gained,vines};
 }
 resourceStatus(meta,now=Date.now()){return resourceNodeStatus(this.data.resourceNodes,meta,now)}
 resourceStatistics(){return resourceStateStats(this.data.resourceNodes)}
 harvestResource(meta,action="gather",now=Date.now()){return harvestAtNode(this,meta,action,now)}
 eligible(kind,key){
  const d=kind==="tech"?TECH:CIVICS;const owned=kind==="tech"?this.data.technologies:this.data.civics;const node=d[key];
  if(!node)return false;
  return !owned.includes(key) && node.needs.every(n=>owned.includes(n)) && (!node.culture||node.culture.every(n=>this.data.civics.includes(n)));
 }
 unlock(kind,key){
  const node=(kind==="tech"?TECH:CIVICS)[key];
  if(!node||!this.eligible(kind,key)||!this.pay(node.cost))return false;
  (kind==="tech"?this.data.technologies:this.data.civics).push(key);
  this.changed(`${this.data.hero.name}'s people discovered ${node.name}.`);
  return true;
 }
 craftAxe(){
  if(this.data.axe||!this.data.technologies.includes("tools")||!this.pay({wood:2,stone:3}))return false;
  this.data.axe=true;this.gainXP("crafting",28);this.changed(`${this.data.hero.name} crafted a stone axe.`);return true;
 }
 stockpileInfo(){
  const pile=this.data.village.stockpile;
  return {placed:!!pile,x:pile?.x??null,z:pile?.z??null,
   capacity:STOCKPILE_CAPACITY,used:stockpileUsed(pile),
   items:pile?{...pile.items}:null};
 }
 foundStockpile(x,z){
  if(this.data.village.stockpile||!Number.isFinite(Number(x))||!Number.isFinite(Number(z)))return false;
  this.data.village.stockpile=createStockpile(x,z);
  if(!this.data.village.stockpile)return false;
  this.changed(`${this.data.hero.name} founded the village and raised its first stockpile.`);
  return true;
 }
 depositToStockpile(id,amount,x,z){
  const pile=this.data.village.stockpile;
  if(!nearStockpile(pile,x,z))return 0;
  const moved=depositStockpile(this.data.inventory,pile,id,amount);
  if(moved){this.syncResources();this.changed()}
  return moved;
 }
 depositAllToStockpile(x,z){
  const pile=this.data.village.stockpile;
  if(!nearStockpile(pile,x,z))return 0;
  const moved=depositAllStockpile(this.data.inventory,pile);
  if(moved){this.syncResources();this.changed()}
  return moved;
 }
 withdrawFromStockpile(id,amount,x,z){
  const pile=this.data.village.stockpile;
  if(!nearStockpile(pile,x,z))return 0;
  const moved=withdrawStockpile(this.data.inventory,pile,id,amount);
  if(moved){this.syncResources();this.changed()}
  return moved;
 }
 canBuildPlot(id){
  const plot=PLOT_BY_ID[id],building=BUILDINGS[plot?.kind];
  if(!plot||!building)return {ok:false,reason:"Unknown village plot"};
  if(this.data.village.plots[id])return {ok:false,reason:"Already constructed"};
  const pile=this.data.village.stockpile;
  if(!pile)return {ok:false,reason:"Found a village stockpile first"};
  const site=plotAtHome(this.data.village,id);
  if(!withinVillage(pile,site.x,site.z))return {ok:false,reason:"Outside village territory"};
  for(const requirement of building.requires){
   if(!this.data.technologies.includes(requirement)&&!this.data.civics.includes(requirement))
    return {ok:false,reason:"Unlock "+(requirement==="fire"?"Control of Fire":requirement==="tools"?"Stone Toolmaking":"Tribal Community")+" first"};
  }
  if(!stockpileHas(pile,building.cost))return {ok:false,reason:"Deposit the required materials at your village stockpile"};
  return {ok:true,reason:"Ready to construct"};
 }
 buildVillagePlot(id){
  const result=this.canBuildPlot(id);
  if(!result.ok)return false;
  const plot=PLOT_BY_ID[id],building=BUILDINGS[plot.kind];
  if(!payStockpile(this.data.village.stockpile,building.cost))return false;
  this.data.village.plots[id]=plot.kind;
  if(plot.kind==="family")this.data.shelter=true; // Support pre-village saves.
  this.gainXP("construction",plot.kind==="family"?55:65);
  this.changed(`${this.data.hero.name}'s village built a ${building.name}.`);
  return true;
 }
 villageCapacity(){return capacity(this.data.village)}
 buildShelter(){return this.buildVillagePlot("family_1")}
 nextGeneration(){
  const old=this.data.hero;
  const names=["Eira","Torin","Mara","Kellan","Sera","Darin","Elowen","Cai","Nessa","Roran"];
  const name=names[(this.data.generation-1)%names.length];
  const inherited=this.data.civics.includes("apprenticeship")?.25:this.data.civics.includes("oral")?.15:.08;
  this.data.skills=Object.fromEntries(SKILLS.map(([id])=>[id,Math.round(this.data.skills[id]*inherited)]));
  this.data.generation++;this.data.year+=24;this.data.calendarProgress=0;
  this.data.hero={name,age:18,appearance:descendantAppearance(old.appearance,this.data.generation)};
  this.data.lineage.push({name,gen:this.data.generation,start:this.data.year,role:"Descendant of "+old.name,appearance:this.data.hero.appearance});
  this.changed(`${old.name}'s legacy passes to ${name}, generation ${this.data.generation}.`);
  return name;
 }
 advance(dt){
  const d=this.data;d.calendarProgress+=Math.min(dt,5)/90;
  if(d.calendarProgress>=1){d.calendarProgress-=1;d.year++;d.hero.age++;this.changed(`${d.hero.name} celebrates another year of life.`)}
 }
 formatYear(){return this.data.year<0?`${Math.abs(this.data.year).toLocaleString()} BCE`:`${this.data.year+1} CE`}
 reset(){
  // Only the active save can be reset, never other slots. New Game should
  // normally be created from the title screen after user confirmation.
  localStorage.removeItem(this.storageKey);
  this.data=fresh();this.changed();
 }
}
