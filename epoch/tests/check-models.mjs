// Minimal dependency-free verification of Epoch's authored glTF 2.0 characters.
// Run: node epoch/tests/check-models.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const folder=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../assets/characters");
const requiredJoints=["Hips","Spine","Head","UpperArm_L","UpperArm_R","LowerArm_L","LowerArm_R","UpperLeg_L","UpperLeg_R","LowerLeg_L","LowerLeg_R"];
const requiredMaterials=["Skin","Hair","Eye","Tunic","Leather","Fur","Trim","Boots"];
const expectedStyles=Array.from({length:6},(_,i)=>"Hair_"+i);
const expectedBeards=Array.from({length:3},(_,i)=>"Beard_"+(i+1));
const signatures=[];
for(const sex of ["male","female"]){
  const file=path.join(folder,"human_"+sex+".glb");
  const buf=fs.readFileSync(file);
  const u=(at)=>buf.readUInt32LE(at);
  assert.equal(buf.toString("ascii",0,4),"glTF","GLB magic");
  assert.equal(u(4),2,"GLB version");
  assert.equal(u(8),buf.length,"GLB length matches file");
  const jsonLen=u(12),jsonType=u(16);
  assert.equal(jsonType,0x4e4f534a,"JSON chunk");
  const gltf=JSON.parse(buf.toString("utf8",20,20+jsonLen));
  const binHead=20+jsonLen,binLen=u(binHead);
  assert.equal(u(binHead+4),0x004e4942,"BIN chunk");
  assert.equal(binHead+8+binLen,buf.length,"binary payload length");
  assert.equal(gltf.asset.version,"2.0");
  const nameSet=new Set(gltf.nodes.map(n=>n.name));
  for(const name of [...requiredJoints,...expectedStyles,...expectedBeards])
    assert(nameSet.has(name),sex+" missing "+name);
  for(const name of requiredMaterials)
    assert(gltf.materials.some(m=>m.name===name),sex+" missing material "+name);
  for(const view of gltf.bufferViews){
    assert.equal(view.byteOffset%4,0,"buffer view alignment");
    assert(view.byteOffset+view.byteLength<=binLen,"buffer view in bounds");
  }
  let count=0,faces=0;
  for(const mesh of gltf.meshes){
    for(const primitive of mesh.primitives){
      const p=gltf.accessors[primitive.attributes.POSITION],n=gltf.accessors[primitive.attributes.NORMAL],ind=gltf.accessors[primitive.indices];
      assert.equal(p.count,n.count,"positions and normals share topology");
      assert.equal(ind.count%3,0,"triangle indices");
      const positionView=gltf.bufferViews[p.bufferView],indexView=gltf.bufferViews[ind.bufferView];
      const positionsStart=binHead+8+positionView.byteOffset;
      for(let j=0;j<p.count*3;j++){
        const val=buf.readFloatLE(positionsStart+j*4);
        assert(Number.isFinite(val),"finite vertex position");
      }
      const indicesStart=binHead+8+indexView.byteOffset;
      for(let j=0;j<ind.count;j++)
        assert(buf.readUInt16LE(indicesStart+j*2)<p.count,"index within vertex range");
      count+=p.count;faces+=ind.count/3;
    }
  }
  assert(count>3500 && faces>7000,"substantive sculpted geometry");
  assert(gltf.meshes.length>120,"modular parts present");
  signatures.push(createHash("sha256").update(buf).digest("hex"));
  console.log(`PASS ${sex}: ${gltf.meshes.length} meshes / ${count} vertices / ${faces} triangles / ${Math.round(buf.length/1024)} KiB`);
}
assert.notEqual(signatures[0],signatures[1],"male and female meshes must differ");
console.log("Epoch original modular human asset validation passed.");
