import {founderAppearance,descendantAppearance,normalizeAppearance,randomAppearance} from "./characters.js?v=20261113m";
import {SURVIVAL,freshSurvival,normalizeSurvival,maxStamina,spendStamina,advanceVitals,consumeBerries} from "./survival.js?v=20261114q";
import {LEGACY_KEY,saveSlotKey} from "./save-slots.js?v=20261113m";
import {BUILDINGS,PLOT_BY_ID,plotAtHome,capacity,emptyVillage} from "./settlement.js?v=20261114m";
import {normalizeBuildings,placementCheck,UNIQUE_BUILDINGS} from "./village-placement.js?v=20261114b";
import {LEGACY_HOME,createStockpile,normalStockpile,stockpileCount,stockpileUsed,
 STOCKPILE_CAPACITY,stockpileHas,payStockpile,nearStockpile,withinVillage,
 depositStockpile,depositAllStockpile,withdrawStockpile} from "./stockpile.js?v=20261113k";
import {STARTER_SEED} from "./forest-generation.js?v=20261113k";
import {resourceNodeStatus,resourceStateStats} from "./resource-nodes.js?v=20261113k";
import {harvestAtNode} from "./harvest.js?v=20261114q";
import {tribeAtChunk,normalizeTribeRecords,tribeTrust,tribeAidRequest,
 TRIBE_TRUST_GOAL,TRIBE_AID_TRUST} from "./tribes.js?v=20261114m";
import {legacyResidents,normalizeResidents,normalizeHomes,housingUnits,
 moveResidentHome,residentConnections} from "./residents.js?v=20261114n";
import {ITEMS,INVENTORY_SLOTS,canonicalItem,emptyInventory,emptyUnpacked,normalizeInventory,
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
// First discoveries and meaningful construction milestones generate Knowledge.
export const KNOWLEDGE_REWARDS=Object.freeze({
 stockpile:3,
 first:Object.freeze({lore:6,family:3,council:3,hearth:4}),
 milestones:Object.freeze({3:3,6:4,10:5})
});
export const RESEARCH_SECONDS_PER_KNOWLEDGE=60;
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
 knowledgeClaims:[],researchSeconds:0,tribes:{},
 survival:freshSurvival(),successorId:null,lastDeath:null,
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
  // A veteran with built structures inherits the same original stockpile.
  if(data?.version===1 && data?.village?.stockpile===undefined
     && Object.keys(this.data.village.plots).length>0)
   this.data.village.stockpile=createStockpile(LEGACY_HOME.x,LEGACY_HOME.z);
  else this.data.village.stockpile=normalStockpile(this.data.village.stockpile);
  // Preserve every completed structure in its exact historical world location,
  // without recreating the five old empty construction circles.
  this.data.village.buildings=normalizeBuildings(
   this.data.village.buildings,this.data.village.plots,this.data.village.stockpile);
  this.data.village.nextBuildingNumber=Math.max(1,
   Number(this.data.village.nextBuildingNumber)||1,
   ...this.data.village.buildings.map(b=>{
    const m=/^building_([0-9]+)$/.exec(b.id);return m?Number(m[1])+1:1;
   }));
  const previousPopulation=Math.max(1,Math.min(capacity(this.data.village),
   Number(this.data.village.population)||1));
  const previousResidents=Array.isArray(data?.village?.residents)?
   data.village.residents:legacyResidents(previousPopulation-1);
  this.data.village.residents=normalizeResidents(previousResidents,capacity(this.data.village)-1);
  for(const resident of this.data.village.residents){
   if(resident.originTribeId&&!resident.originTribeName){
    const coordinates=resident.originTribeId.slice(6).split(",").map(Number);
    const tribe=coordinates.length===2&&coordinates.every(Number.isInteger)?
     tribeAtChunk(this.data.worldSeed,coordinates[0],coordinates[1]):null;
    resident.originTribeName=tribe?.name||"an independent tribe";
   }
   if(!resident.memories.length)resident.memories=[
    {year:resident.joinedYear,text:resident.recruitment==="peaceful"?
     "Welcomed peacefully from "+resident.originTribeName+".":"Resident of the original settlement."}
   ];
  }
  normalizeHomes(this.data.village);
  this.data.survival=normalizeSurvival(data?.survival);
  this.data.successorId=this.data.village.residents.some(r=>r.id===data?.successorId)?data.successorId:null;
  this.data.lastDeath=data?.lastDeath&&typeof data.lastDeath==="object"&&
   Number.isSafeInteger(data.lastDeath.id)?{
    id:data.lastDeath.id,oldName:String(data.lastDeath.oldName||"").slice(0,60),
    successorName:String(data.lastDeath.successorName||"").slice(0,60),
    reason:String(data.lastDeath.reason||"").slice(0,110),
    year:Number.isFinite(data.lastDeath.year)?data.lastDeath.year:this.data.year,
    gameOver:data.lastDeath.gameOver===true
   }:null;
  this.data.village.population=this.data.survival.gameOver?0:this.data.village.residents.length+1;
  // Legacy villages keep previously achieved progress; they must not receive
  // retroactive first-build bonuses when the new progression system loads.
  if(Array.isArray(data?.knowledgeClaims)){
   this.data.knowledgeClaims=[...new Set(data.knowledgeClaims.filter(key=>typeof key==="string"))];
  }else if(data?.version===1){
   const kinds=new Set(this.data.village.buildings.map(b=>b.kind));
   this.data.knowledgeClaims=[
    ...(this.data.village.stockpile?["stockpile"]:[]),
    ...[...kinds].filter(k=>k in KNOWLEDGE_REWARDS.first).map(k=>"first:"+k),
    ...Object.keys(KNOWLEDGE_REWARDS.milestones).filter(n=>this.data.village.buildings.length>=Number(n)).map(n=>"buildings:"+n)
   ];
  }else this.data.knowledgeClaims=[];
  this.data.researchSeconds=Number.isFinite(Number(data?.researchSeconds))?
   Math.max(0,Math.min(RESEARCH_SECONDS_PER_KNOWLEDGE-.001,Number(data.researchSeconds))):0;
  this.data.tribes=normalizeTribeRecords(data?.tribes);
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
  this.onVitals=()=>{};
  this.sprintedThisTick=false;this.vitalSaveClock=0;
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
 researchResourceCount(id){
  // Only materials are pooled; Knowledge and Culture remain personal currencies.
  if(id==="knowledge"||id==="culture")return this.data[id];
  return this.inventoryCount(id)+stockpileCount(this.data.village.stockpile,id);
 }
 enoughResearch(cost){
  return Object.entries(cost).every(([id,amount])=>this.researchResourceCount(id)>=amount);
 }
 payResearch(cost){
  // Check the whole cost before taking anything from either source.
  if(!this.enoughResearch(cost))return false;
  for(const [id,amount] of Object.entries(cost)){
   if(id==="knowledge"||id==="culture"){this.data[id]-=amount;continue}
   const fromPack=Math.min(this.inventoryCount(id),amount);
   if(fromPack)removeItems(this.data.inventory,id,fromPack);
   const fromStockpile=amount-fromPack;
   if(fromStockpile)this.data.village.stockpile.items[canonicalItem(id)]-=fromStockpile;
  }
  this.syncResources();
  return true;
 }
 tribeRecord(id){
  const record=this.data.tribes?.[id];
  return record?{...record}:null;
 }
 discoverTribe(candidate){
  if(!candidate||!Number.isInteger(candidate.cx)||!Number.isInteger(candidate.cz))return false;
  const tribe=tribeAtChunk(this.data.worldSeed,candidate.cx,candidate.cz);
  if(!tribe||tribe.id!==candidate.id)return false;
  const previous=this.data.tribes[tribe.id];
  if(previous?.discovered||previous?.status==="relocated"||previous?.status==="razed")return false;
  this.data.tribes[tribe.id]={status:previous?.status||"active",
   discovered:true,discoveredYear:this.data.year,
   trust:tribeTrust(tribe,previous),completed:previous?.completed||0};
  this.changed("Discovered "+tribe.name+" in the wilderness.");
  return true;
 }
 tribeDefinition(id){
  const match=/^tribe:(-?\d+),(-?\d+)$/.exec(String(id));
  if(!match)return null;
  const tribe=tribeAtChunk(this.data.worldSeed,Number(match[1]),Number(match[2]));
  return tribe?.id===id?tribe:null;
 }
 tribeProgress(id){
  const tribe=this.tribeDefinition(id),record=this.data.tribes[id];
  if(!tribe||!record?.discovered)return null;
  const trust=tribeTrust(tribe,record),request=record.status==="active"?tribeAidRequest(tribe,record):null;
  return {tribe,record:{...record},trust,request,
   ready:record.status==="active"&&trust>=TRIBE_TRUST_GOAL,
   space:this.villageCapacity()-this.data.village.population};
 }
 aidTribe(id,expectedStage){
  const progress=this.tribeProgress(id);
  if(!progress||progress.record.status!=="active"||!progress.request||progress.ready||
   !Number.isInteger(expectedStage)||expectedStage!==progress.record.completed)return false;
  if(!this.enough(progress.request.cost)||!this.pay(progress.request.cost))return false;
  const record=this.data.tribes[id];
  record.trust=Math.min(TRIBE_TRUST_GOAL,progress.trust+TRIBE_AID_TRUST);
  record.completed=(record.completed||0)+1;
  this.changed("Helped "+progress.tribe.name+" with "+progress.request.name.toLowerCase()+
   ". Trust "+record.trust+"/"+TRIBE_TRUST_GOAL+".");
  return true;
 }
 inviteTribe(id){
  const progress=this.tribeProgress(id);
  if(!progress||!progress.ready||!this.data.village.stockpile)return false;
  const {tribe,space}=progress;
  if(space<tribe.population)return false;
  const existing=new Set(this.data.village.residents.map(v=>v.id));
  if(tribe.members.some(m=>existing.has(m.id)))return false;
  // One transaction: the entire tribe relocates or none of it does.
  const arrivals=tribe.members.map(member=>({
   id:member.id,name:member.name,sex:member.sex,age:member.age,
   originTribeId:tribe.id,originTribeName:tribe.name,
   role:member.role==="leader"?"formerLeader":"resident",recruitment:"peaceful",
   joinedYear:this.data.year,homeId:null,
   memories:[{year:this.data.year,text:"Welcomed peacefully from "+tribe.name+"."}]
  }));
  this.data.village.residents.push(...arrivals);
  normalizeHomes(this.data.village);
  this.data.village.population=this.data.village.residents.length+1;
  this.data.tribes[id].status="relocated";
  this.changed(tribe.name+" peacefully joined "+this.data.hero.name+"'s village. "+
   arrivals.length+" new residents arrived; their former camp was dismantled.");
  return true;
 }
 residentProfile(id){
  const resident=this.data.village.residents.find(r=>r.id===id);
  if(!resident)return null;
  const homes=housingUnits(this.data.village);
  return {
   resident:{...resident,memories:resident.memories.map(m=>({...m}))},
   home:homes.find(h=>h.id===resident.homeId)||null,
   homes,
   connections:residentConnections(this.data.village,id)
  };
 }
 villageHousing(){return housingUnits(this.data.village)}
 assignResidentHome(id,homeId){
  const changed=moveResidentHome(this.data.village,id,homeId,this.data.year);
  if(!changed)return false;
  const resident=this.data.village.residents.find(r=>r.id===id);
  const unit=housingUnits(this.data.village).find(h=>h.id===homeId);
  this.changed(resident.name+" moved to "+unit.label+".");
  return true;
 }
 survivalStatus(){
  const vitals=this.data.survival;
  return {...vitals,maxStamina:maxStamina(vitals)};
 }
 canSpendStamina(amount){const v=this.data.survival;return !v.gameOver&&v.health>0&&v.stamina+1e-8>=amount}
 spendStamina(amount,reason=""){
  if(!spendStamina(this.data.survival,amount))return false;
  if(reason==="sprint")this.sprintedThisTick=true;
  this.onVitals();
  return true;
 }
 swingWeapon(){return this.spendStamina(SURVIVAL.weaponSwingCost,"attack")}
 eatBerries(){
  if(this.data.survival.gameOver||this.inventoryCount("berries")<1)return false;
  if(!consumeBerries(this.data.survival))return false;
  removeItems(this.data.inventory,"berries",1);
  this.syncResources();
  this.changed(this.data.hero.name+" ate wild berries and regained energy.");
  return true;
 }
 chooseSuccessor(id){
  if(this.data.survival.gameOver)return false;
  const chosen=id===null?null:this.data.village.residents.find(r=>r.id===id);
  if(id!==null&&!chosen)return false;
  if(this.data.successorId===id)return true;
  this.data.successorId=id;
  this.changed(id?chosen.name+" was named the next leader.":"The named successor was cleared.");
  return true;
 }
 damageHero(amount,reason="an injury"){
  const v=this.data.survival;
  if(v.gameOver||!Number.isFinite(amount)||amount<=0||v.health<=0)return false;
  v.health=Math.max(0,v.health-amount);
  if(v.health<=0)return this.heroDies(reason);
  this.changed(this.data.hero.name+" was injured.");
  return true;
 }
 heroDies(reason="a fatal injury"){
  const v=this.data.survival;
  if(v.gameOver||v.health>0)return false;
  const oldName=this.data.hero.name,roster=this.data.village.residents;
  const named=roster.find(r=>r.id===this.data.successorId);
  const chosen=named||roster[Math.floor(Math.random()*roster.length)]||null;
  const eventId=++v.deathCount;
  const previous=this.data.lineage.at(-1);
  if(previous){previous.deathYear=this.data.year;previous.deathReason=String(reason).slice(0,110)}
  this.data.successorId=null;
  if(!chosen){
   v.gameOver=true;
   this.data.village.population=0;
   this.data.lastDeath={id:eventId,oldName,successorName:"",reason,year:this.data.year,gameOver:true};
   this.changed(oldName+" died from "+reason+". No villagers remain. This civilization has ended.");
   return true;
  }
  this.data.village.residents=roster.filter(r=>r.id!==chosen.id);
  this.data.village.population=this.data.village.residents.length+1;
  this.data.hero={name:chosen.name,age:chosen.age,
   appearance:randomAppearance("epoch:villager:"+chosen.id,chosen.sex),sourceResidentId:chosen.id};
  const inherited=this.data.civics.includes("apprenticeship")?.25:
    this.data.civics.includes("oral")?.15:.08;
  this.data.skills=Object.fromEntries(SKILLS.map(([id])=>[id,Math.round(this.data.skills[id]*inherited)]));
  this.data.generation++;
  this.data.lineage.push({name:chosen.name,gen:this.data.generation,start:this.data.year,
   role:named?"Named successor":"Chosen by the survivors",
   sourceResidentId:chosen.id,appearance:{...this.data.hero.appearance}});
  // The new leader brings their own health and needs, not the previous
  // character's exhaustion, starvation or temporary meal effects.
  v.health=75;v.hunger=80;v.foodSeconds=0;v.stamina=80;v.gameOver=false;
  this.data.lastDeath={id:eventId,oldName,successorName:chosen.name,reason,year:this.data.year,gameOver:false};
  this.changed(oldName+" died from "+reason+". "+chosen.name+" now leads the village.");
  return true;
 }
 gainXP(skill,amount){this.data.skills[skill]=(this.data.skills[skill]||0)+amount}
 awardKnowledge(claim,amount){
  if(this.data.knowledgeClaims.includes(claim)||amount<=0)return 0;
  this.data.knowledgeClaims.push(claim);
  this.data.knowledge+=amount;
  return amount;
 }
 constructionKnowledge(kind){
  const count=this.data.village.buildings.length;
  let gained=this.awardKnowledge("first:"+kind,KNOWLEDGE_REWARDS.first[kind]||0);
  for(const [threshold,bonus] of Object.entries(KNOWLEDGE_REWARDS.milestones))
   if(count>=Number(threshold))gained+=this.awardKnowledge("buildings:"+threshold,bonus);
  return gained;
 }
 researchRate(){
  return this.data.village.stockpile?.x!==undefined&&this.data.village.buildings.some(b=>b.kind==="lore")?1:0;
 }
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
  if(!node||!this.eligible(kind,key)||!this.payResearch(node.cost))return false;
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
  const earned=this.awardKnowledge("stockpile",KNOWLEDGE_REWARDS.stockpile);
  this.changed(`${this.data.hero.name} founded the village and raised its first stockpile.`+(earned?` +${earned} Knowledge.`:""));
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
 canPlaceVillageBuilding(kind,x,z,turn=0,world=null){
  const blueprint=BUILDINGS[kind],village=this.data.village;
  if(!blueprint)return {ok:false,reason:"Unknown building type."};
  if(!village.stockpile)return {ok:false,reason:"Found a village stockpile first."};
  if(UNIQUE_BUILDINGS.includes(kind)&&village.buildings.some(b=>b.kind===kind))
   return {ok:false,reason:"This village already has a "+blueprint.name+"."};
  for(const requirement of blueprint.requires){
   if(!this.data.technologies.includes(requirement)&&!this.data.civics.includes(requirement))
    return {ok:false,reason:"Unlock "+(requirement==="fire"?"Control of Fire":requirement==="tools"?"Stone Toolmaking":"Tribal Community")+" first."};
  }
  if(!stockpileHas(village.stockpile,blueprint.cost))
   return {ok:false,reason:"Deposit "+Object.entries(blueprint.cost).map(([id,n])=>n+" "+id).join(" and ")+" at your stockpile."};
  return placementCheck({village,world,kind,x,z,turn});
 }
 placeVillageBuilding(kind,x,z,turn=0,world=null){
  const check=this.canPlaceVillageBuilding(kind,x,z,turn,world);
  if(!check.ok)return {ok:false,reason:check.reason};
  const blueprint=BUILDINGS[kind],village=this.data.village;
  if(!payStockpile(village.stockpile,blueprint.cost))
   return {ok:false,reason:"Village resources changed; try again."};
  const id="building_"+village.nextBuildingNumber++;
  const entry={id,kind,x:check.x,z:check.z,turn:check.turn};
  village.buildings.push(entry);
  if(kind==="family")this.data.shelter=true;
  this.gainXP("construction",kind==="family"?55:65);
  const earned=this.constructionKnowledge(kind);
  this.changed(this.data.hero.name+"'s village built a "+blueprint.name+"."+(earned?" +"+earned+" Knowledge.":""));
  return {ok:true,building:entry};
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
  // Legacy API for old tests and imported saves, not a visible preset plot.
  const result=this.canBuildPlot(id);
  if(!result.ok)return false;
  const plot=PLOT_BY_ID[id],site=plotAtHome(this.data.village,id);
  const placed=this.placeVillageBuilding(plot.kind,site.x,site.z,plot.rotation*2/Math.PI);
  if(!placed.ok)return false;
  const entry=this.data.village.buildings.find(b=>b.id===placed.building.id);
  if(entry)entry.id=id;
  this.data.village.plots[id]=plot.kind;
  this.save();
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
  this.data.survival={...freshSurvival(),deathCount:this.data.survival.deathCount};
  this.data.lineage.push({name,gen:this.data.generation,start:this.data.year,role:"Descendant of "+old.name,appearance:this.data.hero.appearance});
  this.changed(`${old.name}'s legacy passes to ${name}, generation ${this.data.generation}.`);
  return name;
 }
 advance(dt){
  const d=this.data,seconds=Math.max(0,Math.min(dt,5));
  if(d.survival.gameOver)return;
  const survivalChanged=advanceVitals(d.survival,seconds,this.sprintedThisTick);
  this.sprintedThisTick=false;
  if(survivalChanged){
   this.onVitals();
   this.vitalSaveClock+=seconds;
   if(this.vitalSaveClock>=8){this.vitalSaveClock=0;this.save()}
  }
  d.calendarProgress+=seconds/90;
  // An operational shelter slowly generates Knowledge during active play.
  // Villager assignments and offline research are future mechanics.
  if(this.researchRate()){
   d.researchSeconds+=seconds;
   if(d.researchSeconds>=RESEARCH_SECONDS_PER_KNOWLEDGE){
    const gained=Math.floor(d.researchSeconds/RESEARCH_SECONDS_PER_KNOWLEDGE);
    d.researchSeconds-=gained*RESEARCH_SECONDS_PER_KNOWLEDGE;
    d.knowledge+=gained;
    this.changed("The Toolmaker's Shelter produced "+gained+" Knowledge.");
   }
  }
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
