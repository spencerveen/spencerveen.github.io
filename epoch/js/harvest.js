/**
 * Resource gathering is a state transaction. It consumes one specific
 * deterministic node and only depletes it by the quantity that fits in the
 * character's ten-slot inventory.
 */
import {addItems,itemCapacity} from "./inventory.js?v=20261113j";
import {RESOURCE_NODES,BUSH_VINE_YIELD,resourceNodeStatus,recordResourceNode} from "./resource-nodes.js?v=20261113j";
export function harvestAtNode(state,meta,action="gather",now=Date.now()){
 const status=resourceNodeStatus(state.data.resourceNodes,meta,now);
 if(!status)return {type:"empty",label:"No resource found here."};
 if(status.removed)return {type:"empty",resourceId:status.id,removed:true,label:"This resource has already been depleted."};
 // Shift + left click (or Shift + E) chops a bush for vines rather than berries.
 if(status.kind==="food"&&action==="cut"){
  if(itemCapacity(state.data.inventory,"vines")<BUSH_VINE_YIELD)
   return {type:"full",resourceId:status.id,label:"Need room for "+BUSH_VINE_YIELD+" vines before cutting down this bush."};
  addItems(state.data.inventory,"vines",BUSH_VINE_YIELD);
  recordResourceNode(state.data.resourceNodes,status,0,{removed:true,now});
  state.syncResources();
  state.gainXP("woodcutting",12);state.gainXP("survival",2);
  state.changed();
  return {type:"removed",action:"cut",removed:true,remaining:0,resourceId:status.id,
   added:BUSH_VINE_YIELD,vines:BUSH_VINE_YIELD,label:"Bush cleared · +"+BUSH_VINE_YIELD+" vines · this bush won't regrow"};
 }
 if(status.remaining<=0){
  const seconds=Math.max(1,Math.ceil((status.regrowAt-now)/1000));
  return {type:"empty",resourceId:status.id,remaining:0,removed:false,
   label:status.kind==="food"?"This bush is out of berries. Regrows in "+seconds+"s; Shift+click to cut for vines.":"This deposit is depleted."};
 }
 const harvesting={
  wood:{item:"wood",amount:state.data.axe?3:2,skill:"woodcutting",xp:13,label:"wood"},
  stone:{item:"stone",amount:2,skill:"mining",xp:12,label:"stone"},
  food:{item:"berries",amount:2,skill:"foraging",xp:12,label:"wild berries"}
 }[status.kind];
 const requested=Math.min(status.remaining,harvesting.amount);
 const added=addItems(state.data.inventory,harvesting.item,requested);
 if(!added)return {type:"full",resourceId:status.id,label:"Pack full! Spend or discard a stack first."};
 let vines=0;
 if(status.kind==="wood"||status.kind==="food")
  vines=addItems(state.data.inventory,"vines",1);
 const remaining=status.remaining-added;
 recordResourceNode(state.data.resourceNodes,status,remaining,{now});
 const latest=resourceNodeStatus(state.data.resourceNodes,meta,now);
 state.syncResources();
 state.gainXP(harvesting.skill,Math.max(1,Math.round(harvesting.xp*added/harvesting.amount)));
 state.gainXP("survival",2);
 if(status.kind==="food")state.data.culture++;
 state.changed();
 const removed=!!latest.removed;
 const end=removed?(status.kind==="wood"?" · tree felled!":" · deposit exhausted!"):
  remaining===0?" · berries depleted (regrow in 2 min)":" · "+remaining+"/"+status.max+" remaining";
 return {type:"gathered",resourceId:status.id,kind:status.kind,
  added,vines,remaining,removed,regrowAt:latest.regrowAt,
  label:"+"+added+" "+harvesting.label+(vines?" · +"+vines+" vines":"")+end};
}
