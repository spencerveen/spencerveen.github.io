import assert from "node:assert/strict";
import {STARTER_SEED,terrainHeight,CHUNK_SIZE} from "../js/forest-generation.js";
import {watershedAtBand,nearestWaterCorridor,riverCenter} from "../js/water-corridors.js";
import {mountainAt,mountainTerrainHeight,riverValleyFactor,RIVER_VALLEY_SHOULDER} from "../js/mountain-generation.js";
import {waterAt,waterTerrainHeight} from "../js/water-generation.js";
for(const seed of [STARTER_SEED,42,1337,987654321]){
 let overlap=null;
 for(let basin=-3;basin<=3&&!overlap;basin++){
  const points=watershedAtBand(seed,basin).routes[0].points;
  for(let i=0;i<points.length;i+=8){
   const {x,z}=points[i],uncarved=mountainAt(x,z,seed,[],1000).uplift;
   const candidate=waterAt(x,z,seed);
   if(uncarved>9&&candidate.corridorDistance< -3.05){
    overlap={x,z,uncarved};break;
   }
  }
 }
 assert(overlap,"some river passes through a formerly higher mountain");
 const {x,z,uncarved}=overlap,w=waterAt(x,z,seed);
 assert(mountainAt(x,z,seed).uplift<.001,"river valleys cut a low channel through ridges");
 assert.equal(w.surfaceY-.055,terrainHeight(x,z,seed));
 assert.equal(waterTerrainHeight(x,z,seed),w.bedY);
 assert.equal(w.corridorDistance,nearestWaterCorridor(x,z,seed).distance);
 assert.equal(riverValleyFactor(-4),0);
 assert.equal(riverValleyFactor(RIVER_VALLEY_SHOULDER+3),1);
 for(let t=-3;t<70;t+=3)
  assert(Math.abs(riverValleyFactor(t+.00001)-riverValleyFactor(t))<.00001);
 for(const seam of [-128,-32,0,32,320]){
  const zc=riverCenter(seam,0,seed);
  const nearL=mountainTerrainHeight(seam-.00001,zc,seed);
  const nearR=mountainTerrainHeight(seam+.00001,zc,seed);
  assert(Math.abs(nearL-nearR)<.002);
 }
 const site=[{x:740,z:520,radius:42}];
 assert.equal(mountainAt(740,520,seed,site).uplift,0);
}
console.log("PASS watershed valleys: mountain crossings, smooth shoulders, water-bed continuity, protected sites");
