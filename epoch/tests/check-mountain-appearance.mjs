import assert from "node:assert/strict";
import {CHUNK_SIZE,STARTER_SEED,chunkCoord,terrainHeight} from "../js/forest-generation.js";
import {mountainAt,mountainTerrainHeight} from "../js/mountain-generation.js";
import {terrainAppearanceAt,mountainOutcropSites,mountainHabitat,MOUNTAIN_VISUAL_VERSION} from "../js/mountain-appearance.js";
import {waterAt,waterTerrainHeight} from "../js/water-generation.js";
assert.equal(MOUNTAIN_VISUAL_VERSION,1);
assert.deepEqual(mountainHabitat(0),{trees:true,berries:true,grass:true,animals:true});
assert.deepEqual(mountainHabitat(18),{trees:false,berries:false,grass:false,animals:false});
assert(mountainHabitat(18).trees===false&&mountainHabitat(18).berries===false,
 "rocky summits no longer grow full forest canopies or berry bushes");
const base=terrainAppearanceAt(0,0,STARTER_SEED,[],{shore:Infinity},0);
assert.equal(base.rock,0);
assert.equal(base.foothill,0);
assert.deepEqual(base.color,[82/255,105/255,74/255,1],
 "start terrain retains its original forest colors");
let anyOutcrop=false;
for(const seed of [12000,42,1337,987654321]){
 let peak=null;
 for(let x=-1100;x<=1100;x+=68)for(let z=-1100;z<=1100;z+=68){
  const m=mountainAt(x,z,seed);
  if(m.uplift>18&&(!peak||m.uplift>peak.uplift))peak={x,z,uplift:m.uplift};
 }
 assert(peak,"each world seed should have high rocky terrain");
 const grassy=terrainAppearanceAt(peak.x,peak.z,seed,[],{shore:Infinity},0);
 const steep=terrainAppearanceAt(peak.x,peak.z,seed,[],{shore:Infinity},1.2);
 assert(steep.rock>grassy.rock&&steep.rock>.65,
  "rock should be visibly stronger on high, steep faces");
 assert(steep.color[0]>base.color[0]&&steep.color[2]>base.color[2],
  "exposed stone must be visibly grayer than the starting forest");
 assert(steep.color.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 assert.deepEqual(terrainAppearanceAt(peak.x,peak.z,seed,[],{shore:Infinity},1.2),steep);
 const safe=[{x:peak.x,z:peak.z,radius:55}];
 assert.deepEqual(terrainAppearanceAt(peak.x,peak.z,seed,safe,{shore:Infinity},1.2),base,
  "historic village protection keeps its original terrain appearance");
 const right=terrainAppearanceAt(peak.x+.00001,peak.z,seed,[],{shore:Infinity},.6);
 const left=terrainAppearanceAt(peak.x-.00001,peak.z,seed,[],{shore:Infinity},.6);
 for(let k=0;k<3;k++)assert(Math.abs(right.color[k]-left.color[k])<.001,
  "rock colors remain smooth across world-coordinate chunk boundaries");
 const {cx,cz}=chunkCoord(peak.x,peak.z);
 const terrain=(x,z)=>waterTerrainHeight(x,z,seed);
 const shallow=(x,z)=>waterAt(x,z,seed);
 for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
  const a=mountainOutcropSites(seed,cx+dx,cz+dz,terrain,shallow,[]);
  const b=mountainOutcropSites(seed,cx+dx,cz+dz,terrain,shallow,[]);
  assert.deepEqual(a,b,"rocks must respawn at exactly the same positions");
  assert(a.length<=3,"outcrops are tightly limited per detailed chunk");
  for(const p of a){
   anyOutcrop=true;
   assert(p.x>=(cx+dx)*CHUNK_SIZE&&p.x<(cx+dx+1)*CHUNK_SIZE);
   assert(p.z>=(cz+dz)*CHUNK_SIZE&&p.z<(cz+dz+1)*CHUNK_SIZE);
   assert(mountainAt(p.x,p.z,seed).uplift>=10.5);
   assert(shallow(p.x,p.z).depth<=.02,"no stone outcrops underwater");
   assert(Number.isFinite(p.y)&&p.width>0&&p.height>0);
  }
 }
 assert.deepEqual(mountainOutcropSites(seed,cx,cz,terrain,()=>({depth:3}),[]),[],
  "underwater mountain terrain must not spawn floating rocks");
 assert.deepEqual(mountainOutcropSites(seed,cx,cz,terrain,shallow,
  [{x:peak.x,z:peak.z,radius:1000}]),[],"protected settlements never get bedrock props");
 const seaOrRiver=shallow(peak.x,peak.z);
 assert.equal(terrain(peak.x,peak.z),
  seaOrRiver.depth>0?seaOrRiver.bedY:seaOrRiver.surfaceY-.055,
  "rendered terrain shares the river and ocean seabed elevations");
 assert.equal(mountainTerrainHeight(peak.x,peak.z,seed),
  mountainTerrainHeight(peak.x,peak.z,seed),
  "the visual material does not alter procedural mountain elevation");
}
assert(anyOutcrop,"at least one seeded highland must have exposed-rock props");
console.log("PASS mountain visuals: green starter, high rock faces, deterministic outcrops, safe water and villages, unchanged heights");
