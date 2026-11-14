/**
 * Phase 6B — physical hauling and dry-land routes.
 * The cargo manifest belongs to a named resident's save record, never to a
 * transient Babylon mesh. An unfinished trip may be resumed after reload.
 */
import {STOCKPILE_ITEM_IDS} from "./inventory.js?v=20261114fish1";
import {stockpileSpace} from "./stockpile.js?v=20261114fish1";

export const VILLAGER_CARRY_CAPACITY=8;
export const HAUL_ROUTE_STEP=1.8;
export const HAUL_WATER_DEPTH=.10;
const allowed=new Set(STOCKPILE_ITEM_IDS);

export function normalizeCargo(raw){
 const out={};let remaining=VILLAGER_CARRY_CAPACITY;
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return out;
 for(const [item,rawCount] of Object.entries(raw)){
  if(!allowed.has(item)||remaining<=0)continue;
  const n=Number(rawCount);
  if(!Number.isFinite(n)||n<=0)continue;
  const qty=Math.min(remaining,Math.floor(n));
  if(qty>0){out[item]=qty;remaining-=qty}
 }
 return out;
}
export const cargoCount=manifest=>Object.values(normalizeCargo(manifest))
 .reduce((sum,qty)=>sum+qty,0);
export function cargoLabel(manifest){
 const items=Object.entries(normalizeCargo(manifest));
 return items.map(([id,qty])=>qty+" "+id.replaceAll("_"," ")).join(", ");
}
export function normalizeHaulPosition(raw){
 return raw&&Number.isFinite(raw.x)&&Number.isFinite(raw.z)&&
  Math.abs(raw.x)<100000&&Math.abs(raw.z)<100000?
  {x:raw.x,z:raw.z}:null;
}
export function transferCargo(manifest,stockpile){
 const cargo=normalizeCargo(manifest),left={};
 let room=stockpileSpace(stockpile),moved=0;
 for(const [item,qty] of Object.entries(cargo)){
  const take=Math.min(qty,room);
  if(take>0){
   stockpile.items[item]=(stockpile.items[item]||0)+take;
   moved+=take;room-=take;
  }
  if(qty>take)left[item]=qty-take;
 }
 return {moved,left,remaining:cargoCount(left),full:room===0};
}
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function land(world,x,z){
 return !world.isBlocked(x,z)&&
  (world.terrain?.waterAt(x,z)?.depth??0)<=HAUL_WATER_DEPTH;
}
/** True only if the segment stays on walkable land and respects steep slopes. */
export function drySegment(world,a,b){
 const span=near(a,b),steps=Math.max(1,Math.ceil(span/.7));
 let x=a.x,z=a.z,y=world.groundY(x,z);
 for(let i=1;i<=steps;i++){
  const nx=a.x+(b.x-a.x)*i/steps,nz=a.z+(b.z-a.z)*i/steps;
  if(!land(world,nx,nz))return false;
  const ny=world.groundY(nx,nz);
  if(Math.abs(ny-y)>.56)return false;
  x=nx;z=nz;y=ny;
 }
 return true;
}

/** Bounded A* for worker trips; does not route through water or solid props.
 * Returns [] for unreachable sites instead of teleporting across rivers.
 * This is called only on new legs or when a waypoint becomes obstructed.
 */
export function landRoute(world,start,finish,stop=2.1){
 const dist=near(start,finish);
 if(dist<=stop)return [];
 if(drySegment(world,start,finish))return [{x:finish.x,z:finish.z}];
 const step=HAUL_ROUTE_STEP,pad=14;
 const minX=Math.floor((Math.min(start.x,finish.x)-pad)/step)*step;
 const minZ=Math.floor((Math.min(start.z,finish.z)-pad)/step)*step;
 const maxX=Math.max(start.x,finish.x)+pad,maxZ=Math.max(start.z,finish.z)+pad;
 const nx=Math.ceil((maxX-minX)/step)+1,nz=Math.ceil((maxZ-minZ)/step)+1;
 if(nx*nz>9000)return null;
 const key=(i,j)=>i*nz+j;
 const wx=i=>minX+i*step,wz=j=>minZ+j*step;
 const si=Math.max(0,Math.min(nx-1,Math.round((start.x-minX)/step)));
 const sj=Math.max(0,Math.min(nz-1,Math.round((start.z-minZ)/step)));
 const startKey=key(si,sj),nodes=new Map([[startKey,{i:si,j:sj,g:0,parent:null}]]);
 const frontier=[{i:si,j:sj,g:0,f:dist,key:startKey}],closed=new Set();
 const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 let end=null;
 for(let searched=0;frontier.length&&searched<4500;searched++){
  frontier.sort((a,b)=>a.f-b.f);
  const next=frontier.shift();
  if(closed.has(next.key))continue;
  closed.add(next.key);
  const pos={x:wx(next.i),z:wz(next.j)};
  if(near(pos,finish)<=Math.max(stop,step*.8)){
   end=next.key;break;
  }
  const parent=nodes.get(next.key);
  for(const [di,dj] of directions){
   const i=next.i+di,j=next.j+dj;
   if(i<0||j<0||i>=nx||j>=nz)continue;
   const k=key(i,j);if(closed.has(k))continue;
   const point={x:wx(i),z:wz(j)};
   if(!land(world,point.x,point.z))continue;
   if(!drySegment(world,pos,point)&&next.key!==startKey)continue;
   if(next.key===startKey&&!drySegment(world,start,point))continue;
   if(di&&dj&&(!land(world,wx(next.i+di),wz(next.j))||
                !land(world,wx(next.i),wz(next.j+dj))))continue;
   const g=parent.g+Math.hypot(di,dj);
   if(nodes.has(k)&&nodes.get(k).g<=g)continue;
   nodes.set(k,{i,j,g,parent:next.key});
   frontier.push({i,j,g,key:k,f:g+near(point,finish)/step});
  }
 }
 if(end===null)return null;
 const route=[];
 for(let k=end;k!==startKey;){
  const n=nodes.get(k);if(!n)break;
  route.unshift({x:wx(n.i),z:wz(n.j)});
  k=n.parent;
 }
 // Simplify safe straight stretches to avoid zig-zagging on the grid.
 const simplified=[],points=[{x:start.x,z:start.z},...route];
 let cursor=0;
 while(cursor<points.length-1){
  let far=cursor+1;
  for(let j=points.length-1;j>far;j--){
   if(drySegment(world,points[cursor],points[j])){far=j;break}
  }
  simplified.push(points[far]);cursor=far;
 }
 if(drySegment(world,simplified.at(-1)||start,finish))
  simplified.push({x:finish.x,z:finish.z});
 return simplified;
}
