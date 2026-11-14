import assert from "node:assert/strict";
import {riverCenter,riverWidth,lakeSites,lakeShoreDistance,
 nearestWaterCorridor,watershedAtBand,BASIN_SPACING} from "../js/water-corridors.js";
import {waterAt,waterTerrainHeight} from "../js/water-generation.js";
import {CHUNK_SIZE} from "../js/forest-generation.js";
for(const seed of [12000,42,1337,987654321]){
 let lakeCount=0,basinCount=0,turns=0,branches=0;
 for(let basin=-4;basin<=4;basin++){
  const network=watershedAtBand(seed,basin);
  basinCount++;
  assert.deepEqual(network,watershedAtBand(seed,basin));
  assert(network.routes.length===3,"two tributaries join every trunk");
  branches+=2;
  for(const lake of network.lakes){
   lakeCount++;
   assert(lake.radius>=47&&lake.radius<80,"lakes are rare but larger");
   const r=[0,Math.PI/2,Math.PI,3*Math.PI/2].map(a=>
    lakeShoreDistance(lake.x+lake.radius*Math.cos(a),lake.z+lake.radius*Math.sin(a),lake));
   assert(Math.max(...r)-Math.min(...r)>1,"lake has an organic asymmetrical shoreline");
   assert.deepEqual(lakeSites(seed,basin,Math.floor(lake.x/232)),[lake]);
   assert(waterAt(lake.x,lake.z,seed).depth>1,"lake basins hold water");
  }
  const river=network.routes[0];
  const pts=river.points;
  assert(pts[0].x<pts.at(-1).x-1000,"rivers have finite headwaters and downstream mouths");
  for(let i=1;i<pts.length-1;i++){
   const a=pts[i-1],b=pts[i],c=pts[i+1];
   if(Math.abs((b.x-a.x)*(c.z-b.z)-(b.z-a.z)*(c.x-b.x))>.2)turns++;
  }
  for(let i=10;i<pts.length-10;i+=7){
   const p=pts[i],s=nearestWaterCorridor(p.x,p.z,seed);
   assert(s.distance<0,"continuous river geometry on every segment");
  }
 }
 assert(lakeCount<basinCount*.65,"no repeating river/lake every segment");
 assert(branches>=18&&turns>100,"branches and bends provide many directions");
 for(const c of [-3,0,2]){
  for(let x=-550;x<=500;x+=38){
   const w=riverWidth(x,c,seed),z=riverCenter(x,c,seed);
   assert(Number.isFinite(w)&&w>=1&&w<9);
   assert(nearestWaterCorridor(x,z,seed).distance<0,
    "centerline helper returns actual river route");
  }
 }
 for(const seam of [-6,-1,0,1,5]){
  const x=seam*CHUNK_SIZE,z=riverCenter(x,0,seed);
  const before=waterTerrainHeight(x-.00001,z,seed);
  const after=waterTerrainHeight(x+.00001,z,seed);
  assert(Math.abs(before-after)<.002,"riverbank heights stay continuous at chunk boundaries");
 }
}
console.log("PASS watershed: winding finite routes, connecting tributaries, occasional natural lakes and continuous chunks");
