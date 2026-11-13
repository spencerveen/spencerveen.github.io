import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const filename=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../assets/animations/quaternius-locomotion.json");
const a=JSON.parse(fs.readFileSync(filename,"utf8"));
assert.equal(a.version,1);
const motions=["idle","walk","run"];
const samples={};
for(const role of motions){
 const clip=a.clips?.[role];
 assert(clip,"Missing "+role+" clip");
 assert(clip.duration>.25 && clip.duration<12,"Unreasonable duration for "+role);
 assert(clip.tracks.length>=10,"Too few tracks for "+role);
 let rotations=0,unique=new Set();
 for(const track of clip.tracks){
   assert(track.times.length===track.values.length && track.times.length>=2);
   assert(["rotation","translation"].includes(track.path));
   assert.deepEqual(track.rest.length,track.path==="rotation"?4:3);
   assert(track.values.every(row=>row.length===track.rest.length&&row.every(Number.isFinite)));
   assert(track.times.every((t,i)=>Number.isFinite(t)&&(i===0||t>=track.times[i-1])));
   if(track.path==="rotation")rotations++;
   unique.add(track.name);
 }
 assert(rotations>=8,"Missing skeletal rotation curves "+role);
 samples[role]={name:clip.name,duration:clip.duration,tracks:clip.tracks.length,bones:unique.size};
}
const bodyBones=a.clips.walk.tracks.map(t=>t.name.toLowerCase());
assert(bodyBones.some(n=>/thigh|upleg|upperleg/.test(n)),"Walk must animate legs");
assert(bodyBones.some(n=>/arm/.test(n)),"Walk must animate arms");
console.log("PASS Quaternius animation clips:",JSON.stringify(samples));
