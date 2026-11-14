/**
 * Phase 6A: Stone Age villager professions and nearby work-site discovery.
 * Workers use real streamed harvest nodes, wildlife and shallow-water fish.
 * The world controller handles movement; state handles persistent transactions.
 */
export const VILLAGER_JOBS=Object.freeze({
 idle:Object.freeze({name:"Unassigned",verb:"Resting"}),
 woodcutter:Object.freeze({name:"Woodcutter",verb:"Chopping wood",resource:"wood"}),
 stonegatherer:Object.freeze({name:"Stone Gatherer",verb:"Gathering stone",resource:"stone"}),
 forager:Object.freeze({name:"Forager",verb:"Picking berries",resource:"food"}),
 hunter:Object.freeze({name:"Hunter",verb:"Hunting wildlife"}),
 fisher:Object.freeze({name:"Fisher",verb:"Fishing"})
});
export const JOB_SEARCH_RADIUS=56;
export const JOB_SPEED=2.55;
export const JOB_WORK_SECONDS=Object.freeze({
 woodcutter:3.5,stonegatherer:4,forager:3,hunter:7,fisher:5
});
export const validVillagerJob=job=>typeof job==="string"&&
 Object.prototype.hasOwnProperty.call(VILLAGER_JOBS,job);

const distance=(a,b,x,z)=>Math.hypot(a-x,b-z);
const within=(pile,x,z)=>distance(pile.x,pile.z,x,z)<=JOB_SEARCH_RADIUS;

// Fishers stand on a dry bank beside a real fish site, never underwater.
function fishingBank(world,site){
 let best=null;
 for(let i=0;i<16;i++){
  const angle=i*Math.PI/8;
  for(const radius of [2.5,3.2,4]){
   const x=site.x+Math.cos(angle)*radius,z=site.z+Math.sin(angle)*radius;
   const water=world.terrain.waterAt(x,z);
   if(water.depth>.08||world.isBlocked(x,z))continue;
   if(!best||distance(x,z,site.x,site.z)<best.distance)
    best={x,z,distance:distance(x,z,site.x,site.z)};
  }
 }
 return best;
}
export function findVillagerWork(world,person,reserved=new Set()){
 const job=person.job,pile=world.currentVillage?.stockpile;
 if(!pile||!validVillagerJob(job)||job==="idle")return null;
 const options=[];
 const consider=task=>{
  if(reserved.has(task.id)||!within(pile,task.x,task.z))return;
  const travel=distance(person.x,person.z,task.x,task.z);
  options.push({...task,score:travel});
 };
 const resource=VILLAGER_JOBS[job].resource;
 if(resource){
  const seen=new Set();
  for(const node of world.entities){
   if(node.resource!==resource||!node.resourceId||seen.has(node.resourceId))continue;
   seen.add(node.resourceId);
   const status=world.getResourceStatus({
    id:node.resourceId,resource:node.resource
   });
   if(!status||status.removed||status.remaining<=0)continue;
   if(world.terrain.waterAt(node.x,node.z).depth>.08)continue;
   consider({id:node.resourceId,job,kind:"resource",resource,
    x:node.x,z:node.z,chunkKey:node.chunkKey});
  }
 }else if(job==="hunter"){
  for(const animal of world.animals){
   if(animal.dead||!["deer","rabbit"].includes(animal.species))continue;
   if(world.getWildlifeStatus?.(animal.definition)?.dead||
      world.getWildlifeStatus?.(animal.definition)?.looted)continue;
   const x=animal.origin.x,z=animal.origin.z;
   consider({id:animal.id,job,kind:"hunt",species:animal.species,
    x,z,chunkKey:animal.chunkKey});
  }
 }else if(job==="fisher"){
  for(const fish of world.fish){
   if(world.getFishCaught?.(fish.id))continue;
   const bank=fishingBank(world,fish.site);
   if(!bank)continue;
   consider({id:fish.id,job,kind:"fish",x:bank.x,z:bank.z,
    chunkKey:fish.chunkKey,siteX:fish.site.x,siteZ:fish.site.z});
  }
 }
 options.sort((a,b)=>a.score-b.score||a.id.localeCompare(b.id));
 return options[0]||null;
}
