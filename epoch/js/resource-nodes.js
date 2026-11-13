/**
 * Resource nodes are keyed by the deterministic IDs produced by forest-generation.
 * Only touched nodes are saved; untouched forest remains procedural.
 * Wall-clock berry regrowth continues across page reloads and distant chunks.
 */
export const BERRY_REGROW_MS=120000; // 2 minutes; tune with farming later.
export const RESOURCE_NODES=Object.freeze({
 wood:Object.freeze({name:"Tree",max:12,regrowMs:0}),
 stone:Object.freeze({name:"Stone Deposit",max:12,regrowMs:0}),
 food:Object.freeze({name:"Berry Bush",max:8,regrowMs:BERRY_REGROW_MS})
});
export const BUSH_VINE_YIELD=3;

const finiteTime=now=>Number.isFinite(Number(now))?Math.max(0,Number(now)):Date.now();
export function resourceNodeStatus(nodes,meta,now=Date.now()){
 const kind=meta?.resource,rule=RESOURCE_NODES[kind],id=meta?.id||meta?.resourceId;
 if(!rule||typeof id!=="string"||!id.length)return null;
 const raw=nodes?.[id];
 if(raw?.removed)return {id,kind,remaining:0,max:rule.max,removed:true,regrowAt:0};
 const remaining=raw&&Number.isFinite(Number(raw.remaining))?
  Math.max(0,Math.min(rule.max,Math.floor(Number(raw.remaining)))):rule.max;
 const regrowAt=Number.isFinite(Number(raw?.regrowAt))?Math.max(0,Number(raw.regrowAt)):0;
 if(kind==="food"&&remaining===0&&regrowAt>0&&finiteTime(now)>=regrowAt)
  return {id,kind,remaining:rule.max,max:rule.max,removed:false,regrowAt:0};
 return {id,kind,remaining,max:rule.max,removed:false,regrowAt};
}
export function recordResourceNode(nodes,status,remaining,{removed=false,now=Date.now()}={}){
 if(!status)return;
 const rule=RESOURCE_NODES[status.kind];
 const count=Math.max(0,Math.min(rule.max,Math.floor(Number(remaining)||0)));
 const gone=!!removed||(count<=0&&status.kind!=="food");
 const time=finiteTime(now);
 const regrowAt=status.kind==="food"&&count===0&&!gone?time+rule.regrowMs:0;
 if(count===rule.max&&!gone)delete nodes[status.id];
 else nodes[status.id]={remaining:count,removed:gone,regrowAt};
}
export function resourceStateStats(nodes){
 const values=Object.values(nodes||{});
 return {modified:values.length,removed:values.filter(node=>node?.removed).length,
  depletedBerries:values.filter(node=>!node?.removed&&node?.remaining===0).length};
}
