/**
 * Epoch procedural world, version 1. One continuous FOREST biome.
 * Everything here is deterministic from the saved numeric world seed.
 * Do not use Math.random() for terrain, resource, or animal placement.
 * The terrain height function is continuous across positive/negative chunks.
 */
export const CHUNK_SIZE=32;
export const ACTIVE_RADIUS=2; // 5×5 terrain-only window
export const DETAIL_RADIUS=1; // 3×3 region with trees, stone, berries and deer
export const TERRAIN_SUBDIVISIONS=16;
export const STARTER_SEED=12000;
const PLOTS=[
 [-8,4],[-15,4],[-5,-3],[2,12],[1,-13]
];
const TREE_POINTS=[
 [4,4],[9,7],[13,1],[7,-9],[-9,8],[-14,-3],[-19,9],
 [16,13],[-22,-11],[11,-17],[19,-7],[-16,17],[1,15],
 [22,20],[-24,21],[6,22],[-7,-18],[-23,-20],[22,-19]
];
const ROCK_POINTS=[[3,-7],[-8,-8],[11,2],[-13,12],[16,-13],[-19,-16],[0,21],[21,8],[-23,4]];
const BERRY_POINTS=[[-2,5],[6,-4],[-10,1],[11,12],[-15,-10],[3,17],[-20,11]];
const DEER_POINTS=[[-1,14],[18,-2],[-16,0]];
const floorChunk=n=>Math.floor(n/CHUNK_SIZE);
export const chunkCoord=(x,z)=>({cx:floorChunk(x),cz:floorChunk(z)});
export const chunkKey=(cx,cz)=>cx+","+cz;
function hash2(x,z,seed){
 let h=(seed>>>0) ^ Math.imul(x|0,0x9e3779b1) ^ Math.imul(z|0,0x85ebca77);
 h=Math.imul(h^(h>>>16),0x7feb352d);
 h=Math.imul(h^(h>>>15),0x846ca68b);
 return (h^(h>>>16))>>>0;
}
export function seededRandom(seed,cx,cz){
 let value=hash2(cx,cz,seed);
 return ()=>{value=(value+0x6d2b79f5)>>>0;
   let t=value;t=Math.imul(t^(t>>>15),t|1);
   t^=t+Math.imul(t^(t>>>7),t|61);
   return ((t^(t>>>14))>>>0)/4294967296;
 };
}
const blend=t=>t*t*(3-2*t);
const lerp=(a,b,t)=>a+(b-a)*t;
function noise(x,z,seed){
 const ax=Math.floor(x),az=Math.floor(z),fx=blend(x-ax),fz=blend(z-az);
 const h=(i,j)=>hash2(i,j,seed)/4294967295;
 return lerp(lerp(h(ax,az),h(ax+1,az),fx),lerp(h(ax,az+1),h(ax+1,az+1),fx),fz);
}
export function terrainHeight(x,z,seed=STARTER_SEED){
 // Flat near the founding village, easing into gentle rolling forest terrain.
 const d=Math.hypot(x+3,z+2);
 const smooth=blend(Math.max(0,Math.min(1,(d-21)/16)));
 const broad=(noise(x/58,z/58,seed)-.5)*5.3;
 const detail=(noise(x/21,z/21,seed+311)-.5)*1.7;
 return .18 + smooth*(broad+detail);
}
export function validForestSite(x,z,range=3.7){
 if(Math.hypot(x+3,z+2)<9)return false;
 return PLOTS.every(([px,pz])=>Math.hypot(x-px,z-pz)>range);
}
const item=(kind,x,z,num=0)=>{
 const shape=kind==="wood"?"tree":kind==="stone"?"rock":"bush";
 return {id:kind+":"+Math.round(x*100)+":"+Math.round(z*100),
  resource:kind,shape,x,z,
  label:kind==="wood"?(num%2?"Pinewood":"Ancient Oak"):kind==="stone"?"Stone Deposit":"Wild Berry Bush",
  radius:kind==="food"?.0:.75};
};
export function forestObjects(seed,cx,cz){
 const result=[],used=[];
 const add=(obj)=>{
  if(!validForestSite(obj.x,obj.z,4.35))return false;
  if(used.some(p=>Math.hypot(p.x-obj.x,p.z-obj.z)<2.7))return false;
  used.push(obj);result.push(obj);return true;
 };
 // Preserve familiar early gathering locations from the original clearing.
 for(const [kind,points] of [["wood",TREE_POINTS],["stone",ROCK_POINTS],["food",BERRY_POINTS]]){
  for(let i=0;i<points.length;i++){
   const [x,z]=points[i];
   if(floorChunk(x)===cx&&floorChunk(z)===cz)add(item(kind,x,z,i));
  }
 }
 const rng=seededRandom(seed,cx,cz),goals={wood:7,stone:3,food:4};
 let index=0;
 for(const [kind,count] of Object.entries(goals)){
  let placed=0;
  for(let trial=0;trial<count*10&&placed<count;trial++){
   const x=cx*CHUNK_SIZE+1+rng()*(CHUNK_SIZE-2);
   const z=cz*CHUNK_SIZE+1+rng()*(CHUNK_SIZE-2);
   // Keep the inhabited home clearing visible, but maintain forest at its edge.
   if(Math.hypot(x,z)<23)continue;
   if(add(item(kind,x,z,index++)))placed++;
  }
 }
 return result;
}
export function forestAnimals(seed,cx,cz){
 const result=DEER_POINTS.filter(([x,z])=>floorChunk(x)===cx&&floorChunk(z)===cz)
   .map(([x,z],i)=>({x,z,id:"starter-deer-"+i}));
 const rng=seededRandom(seed^0x235a1cb,cx,cz);
 if(rng()>.43){
  const x=cx*CHUNK_SIZE+4+rng()*(CHUNK_SIZE-8);
  const z=cz*CHUNK_SIZE+4+rng()*(CHUNK_SIZE-8);
  if(Math.hypot(x,z)>21&&validForestSite(x,z,5))
   result.push({x,z,id:"deer:"+chunkKey(cx,cz)});
 }
 return result;
}
