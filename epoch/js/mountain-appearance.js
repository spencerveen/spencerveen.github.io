/**
 * Seeded rocky slopes and exposed outcrops. Visuals only; do not change the
 * heightfield, collisions, collectable stone nodes, or save schema.
 */
import {CHUNK_SIZE,STARTER_SEED,seededRandom} from "./forest-generation.js?v=20261114y";
import {mountainAt} from "./mountain-generation.js?v=20261114mountains1";
export const MOUNTAIN_VISUAL_VERSION=1;
const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n)};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const FOREST=[82/255,105/255,74/255];
const FOOTHILL=[100/255,108/255,83/255];
const ROCK=[124/255,126/255,119/255];
const PEAK=[151/255,144/255,133/255];
const BANK=[129/255,132/255,105/255];

/**
 * A color for each actual terrain vertex, blended by mountain relief and the
 * slope measured from its ground-mesh normal. Consistent across chunk seams.
 */
export function terrainAppearanceAt(x,z,seed=STARTER_SEED,protectedSites=[],water=null,grade=0){
 const m=mountainAt(x,z,seed,protectedSites);
 const uplift=m.uplift;
 const foothill=smooth((uplift-.5)/7);
 const steep=smooth((Math.max(0,grade)-.16)/.72);
 const high=smooth((uplift-15)/14);
 const rock=clamp(smooth((uplift-3)/15)*(.20+.72*steep)+.4*high);
 const crest=rock*high*(.42+.35*m.ridge);
 let color=mix(FOREST,FOOTHILL,foothill);
 color=mix(color,ROCK,rock);
 color=mix(color,PEAK,crest);
 // Subtle natural stone bedding: no new textures, meshes, or random flicker.
 const bands=Math.sin(uplift*1.36+x*.14-z*.10)*
  Math.sin(z*.19+x*.045+(seed%97)*.03);
 const wear=rock*(bands*.044-(1-high)*.013);
 color=color.map(c=>clamp(c+wear));
 // Keep the muted bank transition used by the earlier river polish.
 const shore=water&&Number.isFinite(water.shore)?
  smooth((2.8-water.shore)/2.8)*(1-rock*.55):0;
 color=mix(color,BANK,shore*.56);
 return {color:[...color,1],rock,foothill};
}

/**
 * Sparse, entirely decorative chunks of exposed stone near high, sloping
 * ground. Stable seed + integer chunk coordinates prevent pop-in reshuffles.
 */
export function mountainOutcropSites(seed,cx,cz,heightAt,waterAt,protectedSites=[],occupied=[]){
 const rand=seededRandom(((seed>>>0)^0x4f555443)>>>0,cx,cz);
 const result=[];
 for(let trial=0;trial<22&&result.length<3;trial++){
  const x=cx*CHUNK_SIZE+2+rand()*(CHUNK_SIZE-4);
  const z=cz*CHUNK_SIZE+2+rand()*(CHUNK_SIZE-4);
  const height=mountainAt(x,z,seed,protectedSites).uplift;
  if(height<10.5)continue;
  if((waterAt?.(x,z)?.depth||0)>.02)continue;
  if(occupied.some(o=>Math.hypot(o.x-x,o.z-z)<2.8))continue;
  if(result.some(o=>Math.hypot(o.x-x,o.z-z)<5.8))continue;
  const dx=(heightAt(x+1.6,z)-heightAt(x-1.6,z))/3.2;
  const dz=(heightAt(x,z+1.6)-heightAt(x,z-1.6))/3.2;
  const grade=Math.hypot(dx,dz);
  if(grade<.21)continue;
  const scale=.78+rand()*1.25;
  const yaw=rand()*Math.PI*2;
  const shape=rand();
  result.push({x,z,y:heightAt(x,z)-.12,
   width:scale*(1.2+.25*shape),height:scale*(.85+.5*shape),
   depth:scale*(.9+.35*shape),yaw,
   pitch:Math.atan2(dz,1)*.22,roll:-Math.atan2(dx,1)*.22,
   material:rand()>.5?1:0});
 }
 return result;
}
