/**
 * Import small, original (not AI-generated) Quaternius animation curves.
 * Source: CC0 Universal Animation Library v3, repacked as an optimized GLB
 * from a pinned public, CC0-credited game asset repository.
 *
 * Run: node epoch/tools/import-quaternius-walk.mjs
 * Original animation copyright/CC0: Quaternius, Gonzalo Furnier.
 */
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const SOURCE="https://raw.githubusercontent.com/Seyamalam/blood-league-kickoff/aa02a4e6d8337a0604d2da131bcbbeb1f01badf0/public/assets/vendor/quaternius/universal-animation-library.glb";
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../assets/animations");
const response=await fetch(SOURCE,{signal:AbortSignal.timeout(60000)});
if(!response.ok)throw new Error("Animation library download failed: "+response.status);
const bytes=Buffer.from(await response.arrayBuffer());
const u=offset=>bytes.readUInt32LE(offset);
if(bytes.toString("ascii",0,4)!=="glTF"||u(4)!==2||u(8)!==bytes.length)throw Error("Bad GLB header");
const jsonLen=u(12),json=JSON.parse(bytes.toString("utf8",20,20+jsonLen));
const binaryStart=20+jsonLen+8,binLength=u(20+jsonLen);
if(binaryStart+binLength!==bytes.length)throw Error("GLB length invalid");
if(u(20+jsonLen+4)!==0x004e4942)throw Error("Not a binary GLB");
const names=(json.animations||[]).map(a=>a.name);
console.log("Available source animations:",names.join(", "));
if(!names.length)throw Error("Source GLB contains no animations");

const findClip=(pattern)=>json.animations.find(a=>pattern.test(a.name||""));
const desired={
 idle:[/^Idle_Loop$/i,/^Idle$/i,/idle.*loop/i,/idle/i],
 walk:[/^Walk_Loop$/i,/^Walk_Fwd_Loop$/i,/walk.*loop/i,/walk/i],
 run:[/^Jog_Fwd_Loop$/i,/^Run_Fwd_Loop$/i,/^Sprint_Fwd_Loop$/i,/jog.*loop/i,/sprint/i,/run/i]
};
const componentSize={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
const componentCount={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function accessor(index){
 const a=json.accessors[index];
 if(!a)throw Error("Missing accessor "+index);
 const count=componentCount[a.type],bytesEach=componentSize[a.componentType];
 if(!count||!bytesEach)throw Error("Unsupported accessor "+index+" / "+a.type);
 const read=(type,p)=>{
  if(type===5126)return bytes.readFloatLE(p);
  if(type===5123)return bytes.readUInt16LE(p);
  if(type===5125)return bytes.readUInt32LE(p);
  if(type===5121)return bytes.readUInt8(p);
  if(type===5122)return bytes.readInt16LE(p);
  if(type===5120)return bytes.readInt8(p);
  throw Error("Unsupported type "+type);
 };
 const values=Array.from({length:a.count},()=>Array(count).fill(0));
 if(a.bufferView!==undefined){
  const bv=json.bufferViews[a.bufferView];
  if(!bv)throw Error("Missing base buffer view in accessor "+index);
  const stride=bv.byteStride||count*bytesEach;
  const offset=binaryStart+bv.byteOffset+(a.byteOffset||0);
  for(let i=0;i<a.count;i++)
    for(let j=0;j<count;j++)values[i][j]=read(a.componentType,offset+i*stride+j*bytesEach);
 }
 // glTF's optimized animation channels often use sparse-only accessors. An
 // omitted base bufferView means zero-initialized elements overridden here.
 if(a.sparse){
  const {indices,values:changes,count:sparseCount}=a.sparse;
  const ib=json.bufferViews[indices.bufferView],vb=json.bufferViews[changes.bufferView];
  if(!ib||!vb)throw Error("Missing sparse buffer view "+index);
  const indexStart=binaryStart+ib.byteOffset+(indices.byteOffset||0);
  const valueStart=binaryStart+vb.byteOffset+(changes.byteOffset||0);
  for(let i=0;i<sparseCount;i++){
   const dst=read(indices.componentType,indexStart+i*componentSize[indices.componentType]);
   if(dst>=a.count)throw Error("Sparse index out of range "+index);
   for(let j=0;j<count;j++)
    values[dst][j]=read(a.componentType,valueStart+(i*count+j)*bytesEach);
  }
 }
 return values;
}
const result={version:1,source:"Quaternius Universal Animation Library (CC0)",origin:SOURCE,clips:{}};
for(const [role,patterns] of Object.entries(desired)){
 const source=patterns.map(findClip).find(Boolean);
 if(!source)throw Error("Could not find "+role+" animation");
 const tracks=[],jointNames=new Set(),paths=new Set();
 for(const channel of source.channels||[]){
  const target=channel.target||{},node=json.nodes[target.node],name=node?.name;
  if(!name||!["rotation","translation"].includes(target.path))continue;
  const sampler=source.samplers[channel.sampler];
  if(!sampler)continue;
  const times=accessor(sampler.input).map(row=>row[0]);
  let values=accessor(sampler.output);
  if(sampler.interpolation==="CUBICSPLINE"){
   values=values.filter((_,i)=>i%3===1);
  }
  if(times.length!==values.length)throw Error("Track length mismatch "+role+" "+name);
  // Keep runtime footprint small; use 5 decimal precision and no extra tangents.
  const round=v=>Math.round(v*100000)/100000;
  const keyframes=values.map(row=>row.map(round));
  const rest=target.path==="rotation"?(node.rotation||[0,0,0,1]):(node.translation||[0,0,0]);
  tracks.push({name,path:target.path,times:times.map(round),values:keyframes,rest:rest.map(round)});
  jointNames.add(name);paths.add(target.path);
 }
 if(tracks.length<10)throw Error("Too few bone tracks in "+role+" ("+tracks.length+")");
 const duration=Math.max(...tracks.map(t=>t.times.at(-1)||0));
 result.clips[role]={name:source.name,duration:Math.round(duration*10000)/10000,tracks};
 console.log("EXPORTED",role,source.name,tracks.length,"tracks",jointNames.size,"nodes",duration.toFixed(3)+"s",Array.from(paths).join("/"));
 console.log("TRACK SAMPLE",role,tracks.slice(0,12).map(t=>t.name+":"+t.path).join(", "));
}
await fs.mkdir(dir,{recursive:true});
const filename=path.join(dir,"quaternius-locomotion.json");
const content=JSON.stringify(result);
await fs.writeFile(filename,content+"\n");
console.log("Wrote",filename,(content.length/1024).toFixed(1)+"KiB");
