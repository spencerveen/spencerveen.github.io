import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../assets/characters");
const expectedBones=["Head","upperarm_l","upperarm_r","lowerarm_l","lowerarm_r","thigh_l","thigh_r","calf_l","calf_r","spine_01"];
for(const sex of ["male","female"]){
 const filename=path.join(dir,`quaternius_${sex}.glb`);
 const file=fs.readFileSync(filename);
 const u=offset=>file.readUInt32LE(offset);
 assert.equal(file.toString("ascii",0,4),"glTF");
 assert.equal(u(4),2);assert.equal(u(8),file.length);
 const jsonLength=u(12);assert.equal(u(16),0x4E4F534A);
 const j=JSON.parse(file.toString("utf8",20,20+jsonLength));
 const binStart=20+jsonLength;
 const binLength=u(binStart);
 assert.equal(u(binStart+4),0x004E4942);
 assert.equal(binStart+8+binLength,file.length);
 assert.equal(j.skins.length,1);
 assert(j.skins[0].joints.length>60,"real articulated skeleton expected");
 assert(j.meshes.length>=3,"full skin, eyes and brows expected");
 assert(j.images.length>=3,"embedded body, eye and hair textures expected");
 assert(j.nodes.some(n=>n.skin===0),"a skinned human mesh must be present");
 assert(j.nodes.some(n=>n.name?.toLowerCase()==="superhero_"+sex),"sex-specific source mesh");
 const names=new Set(j.nodes.map(x=>x.name));
 for(const b of expectedBones)assert(names.has(b),"Missing real source rig bone "+b);
 for(const view of j.bufferViews)assert(view.byteOffset+view.byteLength<=binLength,"binary view bounds");
 for(const image of j.images){
   assert.equal(image.mimeType,"image/png");assert(Number.isInteger(image.bufferView));
   const bv=j.bufferViews[image.bufferView];
   const i=binStart+8+bv.byteOffset;
   assert.equal(file.subarray(i,i+8).toString("hex"),"89504e470d0a1a0a","embedded PNG");
 }
 assert(file.length<8*1024*1024,"model too heavy for first scene");
 console.log(`PASS Quaternius ${sex}: ${j.skins[0].joints.length} bones, ${j.meshes.length} skinned meshes, ${j.images.length} embedded textures, ${(file.length/1024/1024).toFixed(2)} MiB`);
}

for(const hair of ["buns","buzzed","buzzedfemale","long","simpleparted","beard"]){
 const bytes=fs.readFileSync(path.join(dir,"quaternius_hair_"+hair+".glb"));
 assert.equal(bytes.toString("ascii",0,4),"glTF");
 const jsonLen=bytes.readUInt32LE(12);
 const g=JSON.parse(bytes.toString("utf8",20,20+jsonLen));
 assert.equal(g.meshes.length,1,"real hair mesh");
 assert.equal(g.nodes.length,1,"hair root");
 console.log("PASS hair "+hair);
}
