import assert from "node:assert/strict";
import {riverCenter,riverWidth,lakeSites,lakeShoreDistance,nearestWaterCorridor} from "../js/water-corridors.js";
import {waterAt,waterTerrainHeight} from "../js/water-generation.js";
import {CHUNK_SIZE} from "../js/forest-generation.js";
for(const seed of [12000,42,1337,987654321]){
 let found=0;
 for(let channel=-3;channel<=3;channel++){
  for(let section=-6;section<=6;section++){
   const lakes=lakeSites(seed,channel,section);
   assert.deepEqual(lakes,lakeSites(seed,channel,section),"lake descriptors remain seeded");
   for(const lake of lakes){
    found++;
    assert(lake.radius>=23&&lake.radius<=47,"larger lakes than the former 14-31m discs");
    assert.equal(lakeShoreDistance(lake.x,lake.z,lake),-lake.radius*(1+
      .075*Math.sin(lake.phase)+.045*Math.cos(-lake.phase*.7)));
    const r=[0,Math.PI/2,Math.PI,3*Math.PI/2].map(a=>
     lakeShoreDistance(lake.x+lake.radius*Math.cos(a),lake.z+lake.radius*Math.sin(a),lake));
    assert(Math.max(...r)-Math.min(...r)>1,"lakes are not perfect circles");
    const center=waterAt(lake.x,lake.z,seed);
    assert(center.depth>1.5,"a natural lake retains its deep basin");
   }
  }
 }
 assert(found>5);
 for(const channel of [-2,-1,0,1,2]){
  const samples=[];
  for(let x=-600;x<=500;x+=20){
   const z=riverCenter(x,channel,seed);
   const d=riverWidth(x,channel,seed);
   assert(d>=3.5&&d<=10);
   samples.push(d);
   assert(nearestWaterCorridor(x,z,seed).distance<0);
  }
  assert(Math.max(...samples)-Math.min(...samples)>1.2,
   "river widths vary naturally rather than forming a constant ribbon");
 }
 for(const seam of [-6,-1,0,1,5]){
  const x=seam*CHUNK_SIZE,z=riverCenter(x,0,seed);
  const before=waterTerrainHeight(x-.00001,z,seed);
  const after=waterTerrainHeight(x+.00001,z,seed);
  assert(Math.abs(before-after)<.002,"seamless banks survive chunk boundaries");
 }
}
console.log("PASS natural waterways: seeded basins, irregular shores, variable river width, bounded depths and seamless chunks");
