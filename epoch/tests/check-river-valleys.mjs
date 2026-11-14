import assert from "node:assert/strict";
import {STARTER_SEED,terrainHeight,CHUNK_SIZE} from "../js/forest-generation.js";
import {riverCenter,riverWidth,lakeSites,nearestWaterCorridor} from "../js/water-corridors.js";
import {mountainAt,mountainTerrainHeight,riverValleyFactor,RIVER_VALLEY_SHOULDER} from "../js/mountain-generation.js";
import {waterAt,waterTerrainHeight} from "../js/water-generation.js";

// The signed river/lake footprint is a pure module, with the exact old path.
for(const seed of [12000,42,1337,987654321]){
 const phase=(seed%100000)*.0000712;
 for(const x of [-624,-224,-12,155,310,800]){
  for(const channel of [-2,0,1]){
   const oldCenter=72+42*Math.sin(phase*2.4)+channel*195+
    24*Math.sin(x/153+channel*1.73+phase)+
    11*Math.sin(x/57+phase*1.9+channel*.91);
   assert.equal(riverCenter(x,channel,seed),oldCenter,"saved river centerlines unchanged");
   const oldWidth=5.5+1.3*Math.sin(x/79+channel*1.41+phase*3);
   assert.equal(riverWidth(x,channel,seed),oldWidth,"saved widths unchanged");
   const sample=nearestWaterCorridor(x,oldCenter,seed);
   assert(sample.distance<0,"seeded river still crosses its original centerline");
   assert.equal(waterAt(x,oldCenter,seed).depth>0,true);
  }
 }
 let strongOverlap=null;
 for(let x=-1200;x<=1200&&!strongOverlap;x+=24)for(let channel=-3;channel<=3;channel++){
  const z=riverCenter(x,channel,seed);
  const uncarved=mountainAt(x,z,seed,[],1000).uplift;
  if(uncarved>12){strongOverlap={x,z,uncarved};break;}
 }
 assert(strongOverlap,"each seed has a mountain crossing near some river");
 const {x,z,uncarved}=strongOverlap;
 const water=waterAt(x,z,seed);
 const valley=mountainAt(x,z,seed).uplift;
 assert(valley<.001,"a river should flow on the floor of a mountain valley");
 assert(uncarved>12,"uncarved ridge would have buried the river");
 assert.equal(water.surfaceY-.055,terrainHeight(x,z,seed),
  "water surface lies on the low valley floor instead of atop the peak");
 // Preserve the shape of the existing river and its wading restrictions.
 assert.equal(water.kind,"river");
 assert.equal(water.passable,false);
 assert.equal(waterTerrainHeight(x,z,seed),water.bedY);
 assert.equal(water.corridorDistance,nearestWaterCorridor(x,z,seed).distance);
 // The valley has smooth foothill shoulders across the original bank.
 assert.equal(riverValleyFactor(-4),0);
 assert.equal(riverValleyFactor(RIVER_VALLEY_SHOULDER+3),1);
 for(let dist=-3;dist<70;dist+=3){
  const p=riverValleyFactor(dist),next=riverValleyFactor(dist+.00001);
  assert(p>=0&&p<=1&&Math.abs(next-p)<.00001);
 }
 for(const seam of [-128,-32,0,32,320]){
  const zc=riverCenter(seam,0,seed);
  const nearL=mountainTerrainHeight(seam-.00001,zc,seed);
  const nearR=mountainTerrainHeight(seam+.00001,zc,seed);
  assert(Math.abs(nearL-nearR)<.001,"terrain remains seamless at chunk crossings");
 }
 const lake=lakeSites(seed,0,3)[0];
 if(lake){
  assert.equal(mountainAt(lake.x,lake.z,seed).uplift,0,
   "lakes also sit on the valley floor");
 }
 const protectedSite=[{x:740,z:520,radius:42}];
 assert.equal(mountainAt(740,520,seed,protectedSite).uplift,0,
  "historic villages remain at their old mountain elevation");
}
console.log("PASS mountain valleys: stable rivers, carved valley floors, smooth shoulders, lakes, old saves and seams");
