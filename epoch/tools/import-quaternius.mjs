/**
 * Prepare Quaternius Universal Base Characters [Standard] for Epoch.
 * Uses the actual original rigged GLTF (mesh, normals, UVs, joint weights,
 * inverse bind matrices, and 69-node skeleton), then embeds only the three
 * color textures needed for the browser. No procedural replacement geometry.
 * Input comes from the free CC0 Standard assets, mirrored as originally
 * distributed in NafisRayan/Animate-Rigged-Humanoid-No-Blender.
 *
 * Run: node epoch/tools/import-quaternius.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const ROOT="https://raw.githubusercontent.com/NafisRayan/Animate-Rigged-Humanoid-No-Blender/5821923af517ac5fdc82505faa92a0d575fc1b1a/Universal%20Base%20Characters%5BStandard%5D/Universal%20Base%20Characters%5BStandard%5D/Base%20Characters/Godot%20-%20UE/";
async function download(name){
 const res=await fetch(ROOT+encodeURIComponent(name),{signal:AbortSignal.timeout(60000)});
 if(!res.ok)throw new Error("Failed to download "+name+": HTTP "+res.status);
 return Buffer.from(await res.arrayBuffer());
}
const pad4=buf=>{
 const pad=(4-buf.length%4)%4;
 return pad?Buffer.concat([buf,Buffer.alloc(pad)]):buf;
};
const glb=(gltf,buffer)=>{
 const j=pad4(Buffer.from(JSON.stringify(gltf)));
 // The JSON chunk must use space for padding.
 const json=Buffer.alloc(j.length,32);
 Buffer.from(JSON.stringify(gltf)).copy(json);
 const bin=pad4(buffer);
 const header=Buffer.alloc(12);
 header.write("glTF",0);header.writeUInt32LE(2,4);
 header.writeUInt32LE(12+8+json.length+8+bin.length,8);
 const jhdr=Buffer.alloc(8);jhdr.writeUInt32LE(json.length,0);jhdr.write("JSON",4);
 const bhdr=Buffer.alloc(8);bhdr.writeUInt32LE(bin.length,0);bhdr.write("BIN\0",4);
 return Buffer.concat([header,jhdr,json,bhdr,bin]);
};
await fs.mkdir(path.join(PROJECT,"assets/characters"),{recursive:true});
for(const sex of ["Male","Female"]){
 const name="Superhero_"+sex+"_FullBody";
 console.log("Reading Quaternius",name);
 const [jsonBytes,baseBin]=await Promise.all([download(name+".gltf"),download(name+".bin")]);
 const g=JSON.parse(jsonBytes.toString("utf8"));
 if(g.skins?.length!==1||g.nodes?.length<65||g.meshes?.length!==3)
  throw new Error("Unexpected source structure for "+name);
 let bin=pad4(baseBin);
 const originalImages=g.images;
 const srcTextures=g.textures;
 const srcMaterials=g.materials;
 const keptImages=[],keptTextures=[],imageLookup=new Map(),textureLookup=new Map();
 const neededTextureIndexes=srcMaterials.map(m=>m.pbrMetallicRoughness?.baseColorTexture?.index).filter(n=>n!==undefined);
 const usedTextureIndexes=[...new Set(neededTextureIndexes)];
 for(const oldIndex of usedTextureIndexes){
   const original=srcTextures[oldIndex],imageIndex=original.source;
   let newImageIndex=imageLookup.get(imageIndex);
   if(newImageIndex===undefined){
     const filename=originalImages[imageIndex].uri;
     if(!filename||!filename.endsWith(".png"))throw Error("Unexpected image "+filename);
     const image=await download(filename);
     const offset=bin.length;
     bin=Buffer.concat([bin,pad4(image)]);
     const bufferViewIndex=g.bufferViews.length;
     g.bufferViews.push({buffer:0,byteOffset:offset,byteLength:image.length});
     newImageIndex=keptImages.length;
     keptImages.push({name:filename,mimeType:"image/png",bufferView:bufferViewIndex});
     imageLookup.set(imageIndex,newImageIndex);
     console.log("  Embedded texture",filename,Math.round(image.length/1024)+"KiB");
   }
   const ni=keptTextures.length;
   keptTextures.push({source:newImageIndex, ...(original.sampler===undefined?{}:{sampler:original.sampler})});
   textureLookup.set(oldIndex,ni);
 }
 g.images=keptImages;g.textures=keptTextures;
 for(const m of g.materials){
   delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;
   const p=m.pbrMetallicRoughness||(m.pbrMetallicRoughness={});
   delete p.metallicRoughnessTexture;
   const old=p.baseColorTexture?.index;
   if(old!==undefined)p.baseColorTexture.index=textureLookup.get(old);
   p.metallicFactor=0;p.roughnessFactor=.88;
 }
 g.buffers=[{byteLength:bin.length}];
 g.asset.generator="Epoch Quaternius Standard GLB color-only repack";
 const result=glb(g,bin);
 const output=path.join(PROJECT,"assets/characters","quaternius_"+sex.toLowerCase()+".glb");
 await fs.writeFile(output,result);
 console.log("  Saved",output,Math.round(result.length/1024)+"KiB",g.skins.length+" skin,",g.nodes.length+" nodes");
}
