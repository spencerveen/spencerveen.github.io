/**
 * Epoch watershed network v2: finite branching rivers and occasional basins.
 * Routes are generated once for each broad catchment band and spatially
 * indexed so per-vertex water queries don't retrace their course.
 *
 * Dependency-free of mountain/water/ocean generation to prevent cycles.
 */
import {STARTER_SEED,terrainHeight,seededRandom} from "./forest-generation.js?v=20261114y";
export const WATERSHED_VERSION=2;
export const BASIN_SPACING=720;
export const STREAM_SOURCE_LIMIT=-1980;
const CELL=96,CACHE_LIMIT=24,TAU=2*Math.PI;
const cache=new Map();
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*t;
const hash=(x,z,seed)=>{
 let h=(seed>>>0)^Math.imul(x|0,0x9e3779b1)^Math.imul(z|0,0x85ebca77);
 h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);
 return ((h^(h>>>16))>>>0)/4294967295;
};
function noise(x,z,seed){
 const ix=Math.floor(x),iz=Math.floor(z),fx=smooth(x-ix),fz=smooth(z-iz);
 return mix(mix(hash(ix,iz,seed),hash(ix+1,iz,seed),fx),
  mix(hash(ix,iz+1,seed),hash(ix+1,iz+1,seed),fx),fz);
}
// Same base ridge field as mountain-generation, evaluated without river
// carving to choose elevated headwaters and avoid circular dependencies.
function highlandHeight(x,z,seed){
 const starter=smooth((Math.hypot(x+3,z+2)-150)/130);
 const angle=((seed>>>0)%997)/997*Math.PI*.85+.17,ca=Math.cos(angle),sa=Math.sin(angle);
 const across=-x*sa+z*ca,along=x*ca+z*sa;
 const region=noise((across*.85+along*.18)/380,(along*.91-across*.12)/380,
  (seed^0x4d4f554e)>>>0);
 const mass=smooth((region-.535)/.205);
 const bend=24*Math.sin(along/155+(seed%311)*.018);
 const ridge=Math.pow(1-Math.abs(Math.sin((across+bend)/87)),3);
 const detail=.78+.22*noise(x/115,z/115,(seed^0x4c41594f)>>>0);
 return terrainHeight(x,z,seed)+starter*mass*(5+31*ridge)*detail;
}
// Keep the ocean edge identical without depending on ocean-generation.
function coastalX(z,seed){
 const phase=((seed>>>0)%100003)*.0000432;
 return 565+58*Math.sin(z/217+phase*2.1)+
  30*Math.sin(z/67+phase*3.8)+11*Math.sin(z/28-phase*1.9);
}
function sampleCurve(points,step=14){
 const result=[];
 for(let i=0;i<points.length-1;i++){
  const prev=points[Math.max(0,i-1)],a=points[i],b=points[i+1],
   next=points[Math.min(points.length-1,i+2)];
  const count=Math.max(3,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/step));
  for(let j=0;j<count;j++){
   const t=j/count,t2=t*t,t3=t2*t;
   const cat=(key)=>.5*((2*a[key])+(-prev[key]+b[key])*t+
    (2*prev[key]-5*a[key]+4*b[key]-next[key])*t2+
    (-prev[key]+3*a[key]-3*b[key]+next[key])*t3);
   result.push({x:cat("x"),z:cat("z"),t:mix(i/(points.length-1),(i+1)/(points.length-1),t)});
  }
 }
 result.push({...points[points.length-1],t:1});
 return result;
}
function lakeShore(x,z,lake){
 const dx=x-lake.x,dz=z-lake.z,ca=Math.cos(lake.angle),sa=Math.sin(lake.angle);
 const along=dx*ca+dz*sa,across=-dx*sa+dz*ca;
 const theta=Math.atan2(across,along);
 const radius=lake.radius*(1+.09*Math.sin(theta*3+lake.phase)+
  .05*Math.cos(theta*5-lake.phase*.7));
 return Math.hypot(along*.78,across*1.19)-radius;
}
export const lakeShoreDistance=lakeShore;
function makeBasin(seed,band){
 const rng=seededRandom((seed^0x72564154)>>>0,band,17);
 const baseZ=band*BASIN_SPACING+BASIN_SPACING*.5+(rng()-.5)*210;
 let source=null;
 for(let i=0;i<28;i++){
  const x=-1250-rng()*560,z=baseZ+(rng()-.5)*440;
  const rating=highlandHeight(x,z,seed);
  if(!source||rating>source.rating)source={x,z,rating};
 }
 const outletZ=baseZ+(rng()-.5)*300;
 const mouth={x:coastalX(outletZ,seed)+38,z:outletZ};
 const phase=rng()*TAU,phase2=rng()*TAU;
 const mainWaypoints=[];
 for(let k=0;k<=11;k++){
  const t=k/11,taper=Math.sin(Math.PI*t);
  const x=mix(source.x,mouth.x,t)+
   taper*(68*Math.sin(t*TAU*1.4+phase));
  const z=mix(source.z,mouth.z,t)+taper*(
   135*Math.sin(t*TAU*1.55+phase2)+
   84*Math.sin(t*TAU*3.1+phase));
  mainWaypoints.push({x:k===0?source.x:k===11?mouth.x:x,
   z:k===0?source.z:k===11?mouth.z:z});
 }
 const routes=[{id:"river:"+band+":main",kind:"main",points:sampleCurve(mainWaypoints),
  source:{x:source.x,z:source.z},mouth:{...mouth}}];
 for(let branch=0;branch<2;branch++){
  const joinT=.38+rng()*.40,joinIndex=Math.round(joinT*(routes[0].points.length-1));
  const join=routes[0].points[joinIndex];
  const side=branch===0?-1:1;
  const sourceX=join.x-85-rng()*215;
  const sourceZ=join.z+side*(250+rng()*185);
  const control=[
   {x:sourceX,z:sourceZ},
   {x:mix(sourceX,join.x,.24)+30*Math.sin(phase+branch),
    z:mix(sourceZ,join.z,.27)+side*34},
   {x:mix(sourceX,join.x,.66)-32*Math.cos(phase2+branch),
    z:mix(sourceZ,join.z,.71)-side*18},
   {x:join.x,z:join.z}
  ];
  routes.push({id:"river:"+band+":tributary:"+branch,kind:"tributary",
   points:sampleCurve(control,12),source:{...control[0]},mouth:{x:join.x,z:join.z},
   joins:routes[0].id});
 }
 const lakes=[];
 // Only about one in three catchments contains a substantial river lake;
 // no more evenly spaced "river, lake, river, lake" pattern.
 if(rng()<.34){
  const t=.27+rng()*.57,idx=Math.round(t*(routes[0].points.length-1));
  const p=routes[0].points[idx],near=routes[0].points[Math.min(idx+3,routes[0].points.length-1)];
  lakes.push({id:"lake:"+band+":basin",kind:"lake",x:p.x,z:p.z,
   radius:47+rng()*32,angle:Math.atan2(near.z-p.z,near.x-p.x),
   phase:rng()*TAU});
 }
 const segments=[],index=new Map();
 const add=(segment,radius)=>{
  const n=segments.push(segment)-1;
  const minX=Math.floor((Math.min(segment.ax,segment.bx)-radius)/CELL),
   maxX=Math.floor((Math.max(segment.ax,segment.bx)+radius)/CELL);
  const minZ=Math.floor((Math.min(segment.az,segment.bz)-radius)/CELL),
   maxZ=Math.floor((Math.max(segment.az,segment.bz)+radius)/CELL);
  for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++){
   const key=cx+","+cz;
   if(!index.has(key))index.set(key,[]);
   index.get(key).push(n);
  }
 };
 for(const route of routes){
  const main=route.kind==="main";
  for(let i=0;i<route.points.length-1;i++){
   const a=route.points[i],b=route.points[i+1];
   const ra=main?1.15+6.2*Math.pow(a.t,.85):.7+2.75*Math.pow(a.t,.9);
   const rb=main?1.15+6.2*Math.pow(b.t,.85):.7+2.75*Math.pow(b.t,.9);
   add({type:"river",id:route.id,ax:a.x,az:a.z,bx:b.x,bz:b.z,
    ra,rb,t0:a.t,t1:b.t,source:a.t===0,main},85);
  }
 }
 for(const lake of lakes){
  // One indexed lake descriptor rather than an expensive 80m polygon grid.
  add({type:"lake",id:lake.id,ax:lake.x,az:lake.z,bx:lake.x,bz:lake.z,
   lake},lake.radius*1.45+90);
 }
 return {seed,band,source:routes[0].source,mouth,routes,lakes,segments,index};
}
function basin(seed,band){
 const key=(seed>>>0)+":"+band;
 if(cache.has(key))return cache.get(key);
 if(cache.size>=CACHE_LIMIT)cache.clear();
 const value=makeBasin(seed>>>0,band);
 cache.set(key,value);
 return value;
}
export function watershedAtBand(seed,band){
 const v=basin(seed,band);
 return {band,source:{...v.source},mouth:{...v.mouth},
  routes:v.routes.map(r=>({id:r.id,kind:r.kind,source:{...r.source},mouth:{...r.mouth},
   joins:r.joins||null,points:r.points.map(p=>({...p}))})),
  lakes:v.lakes.map(l=>({...l}))};
}
function segmentDistance(x,z,s){
 if(s.type==="lake")return {distance:lakeShore(x,z,s.lake),width:s.lake.radius,progress:0};
 const dx=s.bx-s.ax,dz=s.bz-s.az,len=dx*dx+dz*dz;
 const t=len>0?clamp(((x-s.ax)*dx+(z-s.az)*dz)/len):0;
 const dist=Math.hypot(x-(s.ax+t*dx),z-(s.az+t*dz));
 return {distance:dist-mix(s.ra,s.rb,t),width:mix(s.ra,s.rb,t),progress:mix(s.t0,s.t1,t)};
}
export function nearestWaterCorridor(x,z,seed=STARTER_SEED){
 if(!Number.isFinite(x)||!Number.isFinite(z))
  return {distance:Infinity,kind:"land",id:null};
 if(x<STREAM_SOURCE_LIMIT||x>950)return {distance:Infinity,kind:"land",id:null};
 const cz=Math.floor(z/CELL),cx=Math.floor(x/CELL),center=Math.floor(z/BASIN_SPACING);
 let best={distance:Infinity,kind:"land",id:null};
 for(let offset=-1;offset<=1;offset++){
  const v=basin(seed,center+offset);
  const candidates=v.index.get(cx+","+cz);
  if(!candidates)continue;
  for(const index of candidates){
   const seg=v.segments[index],data=segmentDistance(x,z,seg);
   if(data.distance<best.distance)
    best={distance:data.distance,kind:seg.type,id:seg.id,
     progress:data.progress,width:data.width};
  }
 }
 return best;
}
export function riverCenter(x,channel=0,seed=STARTER_SEED){
 const points=basin(seed,channel).routes[0].points;
 let nearest=points[0],delta=Infinity;
 for(const p of points){const d=Math.abs(p.x-x);if(d<delta){delta=d;nearest=p;}}
 return nearest.z;
}
export function riverWidth(x,channel=0,seed=STARTER_SEED){
 const points=basin(seed,channel).routes[0].points;
 let nearest=points[0],delta=Infinity;
 for(const p of points){const d=Math.abs(p.x-x);if(d<delta){delta=d;nearest=p;}}
 return 1.15+6.2*Math.pow(nearest.t,.85);
}
export function lakeSites(seed,channel,section){
 return basin(seed,channel).lakes.filter(l=>Math.floor(l.x/232)===section);
}
