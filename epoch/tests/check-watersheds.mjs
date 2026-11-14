import assert from "node:assert/strict";
import {WATERSHED_VERSION,BASIN_SPACING,watershedAtBand,nearestWaterCorridor,
 lakeSites,riverCenter,riverWidth} from "../js/water-corridors.js";
import {waterAt,waterTerrainHeight} from "../js/water-generation.js";
import {coastlineX} from "../js/ocean-generation.js";
import {CHUNK_SIZE} from "../js/forest-generation.js";
assert.equal(WATERSHED_VERSION,2);
assert(BASIN_SPACING>=600);
for(const seed of [12000,42,1337,987654321]){
 let lakes=0,turning=false,vertical=false;
 for(let band=-3;band<=3;band++){
  const net=watershedAtBand(seed,band);
  assert.deepEqual(watershedAtBand(seed,band),net,"same seed reproduces routes");
  assert.equal(net.routes.length,3);
  assert(net.source.x<net.mouth.x-1000,"finite mountain headwater and ocean mouth");
  assert(Math.abs(net.mouth.x-coastlineX(net.mouth.z,seed))<45,
   "river must reach the actual ocean coastline");
  assert.equal(net.routes[0].points[0].x,net.source.x);
  assert.equal(net.routes[0].points.at(-1).z,net.mouth.z);
  const main=net.routes[0];
  const before=nearestWaterCorridor(net.source.x-125,net.source.z,seed);
  assert(before.distance>=0,"upstream of the headwater is not an endless river");
  for(const branch of net.routes.slice(1)){
   assert.equal(branch.joins,main.id);
   const at=branch.points.at(-1),close=main.points.some(p=>Math.hypot(p.x-at.x,p.z-at.z)<.00001);
   assert(close,"tributaries merge exactly into the main channel");
   const dx=branch.mouth.x-branch.source.x,dz=branch.mouth.z-branch.source.z;
   if(Math.abs(dz)>Math.abs(dx)*1.4)vertical=true;
  }
  let forward=0,back=0;
  for(let i=2;i<main.points.length;i++){
   const a=main.points[i-1],b=main.points[i],c=main.points[i-2];
   const cross=(a.x-c.x)*(b.z-a.z)-(a.z-c.z)*(b.x-a.x);
   if(cross>.02)forward++;
   if(cross<-.02)back++;
  }
  if(forward>3&&back>3)turning=true;
  for(const lake of net.lakes){
   lakes++;
   assert(lake.radius>=47&&lake.radius<80);
   assert(waterAt(lake.x,lake.z,seed).depth>1.5);
   assert.equal(lakeSites(seed,band,Math.floor(lake.x/232)).length,1);
  }
  for(const route of net.routes){
   for(let i=4;i<route.points.length-4;i+=4){
    const p=route.points[i],s=nearestWaterCorridor(p.x,p.z,seed);
    assert(s.distance<0,"generated river center stays wet");
   }
  }
 }
 assert(turning&&vertical,"river networks turn and also have north/south tributaries");
 assert(lakes>=1&&lakes<=5,"large lakes are occasional, not regularly alternating");
 assert.equal(waterAt(0,0,seed).depth,0,"starter area stays dry");
 assert.equal(waterAt(-2500,150,seed).depth,0,"waterways do not repeat indefinitely westward");
 assert(Number.isFinite(waterTerrainHeight(-230,110,seed)));
 for(const cx of [-6,-1,0,1,4]){
  const x=cx*CHUNK_SIZE,z=riverCenter(x,0,seed);
  assert(Math.abs(waterAt(x-.00001,z,seed).depth-waterAt(x+.00001,z,seed).depth)<.002);
 }
 assert(riverWidth(0,0,seed)>1);
}
console.log("PASS 2D watershed networks: finite sources, coastal mouths, north/south tributaries, joins, sparse lakes, seeded seams");
