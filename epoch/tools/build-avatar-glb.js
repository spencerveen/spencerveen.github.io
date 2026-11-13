function buildAvatarGLB(sex){
 const female=sex==="female", V=(x,y,z)=>[x,y,z], meshes=[],nodes=[], materials=[],accessors=[],bufferViews=[],parts=[];
 const matList=[
  ["Skin",[0.72,0.43,0.28,1]],["Hair",[.22,.13,.085,1]],["Eye",[.16,.16,.14,1]],["Tunic",[.33,.20,.12,1]],
  ["Leather",[.18,.11,.075,1]],["Fur",[.64,.53,.37,1]],["Trim",[.78,.65,.44,1]],["Boots",[.23,.15,.10,1]]
 ];
 for(const [name,color] of matList) materials.push({name,pbrMetallicRoughness:{baseColorFactor:color,metallicFactor:0,roughnessFactor:.91},doubleSided:name==="Hair"||name==="Fur"});
 const MI=Object.fromEntries(matList.map((a,i)=>[a[0],i]));
 const node=(name,parent=null,translation=[0,0,0])=>{
  const id=nodes.length;nodes.push({name,translation:translation.map(x=>+x.toFixed(6)),children:[]});
  if(parent!==null)nodes[parent].children.push(id);return id;
 };
 const root=node("CharacterRoot");
 const hips=node("Hips",root,V(0,1.03,0));
 const spine=node("Spine",hips,V(0,.47,0));
 const head=node("Head",spine,V(0,.62,0));
 const shoulder=female?.325:.385,hip=female?.205:.195;
 const armL=node("UpperArm_L",spine,V(-shoulder,.25,0)),armR=node("UpperArm_R",spine,V(shoulder,.25,0));
 const elbowL=node("LowerArm_L",armL,V(-.10,-.45,0)),elbowR=node("LowerArm_R",armR,V(.10,-.45,0));
 const legL=node("UpperLeg_L",hips,V(-hip,-.04,0)),legR=node("UpperLeg_R",hips,V(hip,-.04,0));
 const kneeL=node("LowerLeg_L",legL,V(0,-.45,0)),kneeR=node("LowerLeg_R",legR,V(0,-.45,0));
 const footL=node("Foot_L",kneeL,V(0,-.43,.035)),footR=node("Foot_R",kneeR,V(0,-.43,.035));
 const geom=(name,verts,faces,mat,parent)=>{
  // Stable precision across V8 and JS runtimes for reproducible binary assets.
  verts=verts.map(v=>v.map(x=>Math.round(x*100000)/100000));
  const normals=Array(verts.length).fill(0).map(()=>[0,0,0]);
  for(let i=0;i<faces.length;i+=3){
   const a=verts[faces[i]],b=verts[faces[i+1]],c=verts[faces[i+2]];
   const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
   const n=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];
   for(let j=0;j<3;j++){const m=normals[faces[i+j]];m[0]+=n[0];m[1]+=n[1];m[2]+=n[2]}
  }
  for(const n of normals){const length=Math.hypot(...n)||1;n[0]/=length;n[1]/=length;n[2]/=length;}
  const p=verts.flat(),normal=normals.flat();
  const meshId=meshes.length;meshes.push({name,parts:[p,normal,faces],mat:MI[mat]});
  const child=node(name,parent);nodes[child].mesh=meshId;return child;
 };
 const loft=(name,parent,mat,rings,n=12)=>{
  rings=rings[0][0]>rings[rings.length-1][0]?[...rings].reverse():rings;
  const vertices=[],tri=[];
  for(let r=0;r<rings.length;r++){
   const [y,rx,rz,cx=0,cz=0]=rings[r];
   for(let k=0;k<n;k++){const ang=k*Math.PI*2/n;vertices.push([cx+Math.cos(ang)*rx,y,cz+Math.sin(ang)*rz])}
  }
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<n;i++){
   const a=r*n+i,b=r*n+(i+1)%n,c=(r+1)*n+i,d=(r+1)*n+(i+1)%n;
   tri.push(a,c,b,c,d,b);
  }
  tri.push(...Array.from({length:n-2},(_,i)=>[0,i+2,i+1]).flat());
  const top=(rings.length-1)*n;tri.push(...Array.from({length:n-2},(_,i)=>[top,top+i+1,top+i+2]).flat());
  return geom(name,vertices,tri,mat,parent);
 };
 const ellipsoid=(name,parent,mat,c,r,n=12,levels=7)=>{
  const rings=[];
  for(let i=0;i<=levels;i++){
   const ang=Math.PI*i/levels,dy=-Math.cos(ang),width=Math.max(.001,Math.sin(ang));
   rings.push([c[1]+r[1]*dy,r[0]*width,r[2]*width,c[0],c[2]]);
  }
  return loft(name,parent,mat,rings,n);
 };
 const tube=(name,parent,mat,points,radii,n=8)=>{
  // Tube around a segment's local mostly-vertical axis; works for locks and limbs.
  const rings=points.map((p,i)=>[p[1],radii[i],radii[i],p[0],p[2]]);
  return loft(name,parent,mat,rings,n);
 };
 const bodyWidth=female?.37:.43,waist=female?.265:.29;
 loft("Chest_Tunic",spine,"Tunic",[[-.38,.255,.19],[ -.16,waist,.205],[.13,bodyWidth,.235],[.29,bodyWidth*.91,.20],[.43,.15,.15]],14);
 loft("Neck_Skin",spine,"Skin",[[.42,.135,.12],[.58,.14,.125],[.66,.125,.125]],12);
 loft("Hip_Wrap",hips,"Tunic",[[-.15,.30,.24],[.01,female?.33:.32,.25],[.15,waist,.20],[.30,.285,.21]],12);
 loft("Layered_Hide_Skirt",hips,"Tunic",[[-.25,.41,.34],[-.11,.35,.305],[.11,.30,.24]],13);
 // Jagged fur border: alternating heights give a silhouette rather than flat cardboard skirt.
 {
  const verts=[],faces=[],n=14;
  for(let i=0;i<n;i++){const a=i*2*Math.PI/n,x=Math.cos(a),z=Math.sin(a);verts.push([x*.416,-.21+(i%2?-.095:0),z*.345]);}
  for(let i=0;i<n;i++){const a=i*2*Math.PI/n;verts.push([Math.cos(a)*.36,-.065,Math.sin(a)*.29]);}
  for(let i=0;i<n;i++){const k=(i+1)%n;faces.push(i,n+i,k,k,n+i,n+k);}
  geom("Fur_Hem",verts,faces,"Fur",hips);
 }
 loft("Leather_Belt",hips,"Leather",[[.17,.298,.225],[.28,.31,.233]],12);
 ellipsoid("Stone_Buckle",hips,"Trim",V(0,.235,.251),V(.125,.11,.063),10,4);
 ellipsoid("Side_Satchel",hips,"Leather",V(.35,.02,.11),V(.16,.19,.12),10,6);
 // Collar is a tapered sculptural ring with overlapping triangular pieces.
 loft("Fur_Collar",spine,"Fur",[[.31,.36,.20],[.41,.35,.205],[.48,.19,.15]],12);
 for(let k=0;k<11;k++){
  const a=k*Math.PI*2/11;
  tube("Fur_Collar_Lock_"+k,spine,"Fur",[
   [Math.cos(a)*.32,.39,Math.sin(a)*.2],
   [Math.cos(a)*.365,.27-(k%3)*.05,Math.sin(a)*.245]
  ],[.07,.014],5);
 }
 // Head: organic jaw-to-cranium loft. Not floating spheres.
 loft("Head_Face",head,"Skin",[[-.27,.12,.115,0,.035],[-.17,.196,.177,0,.01],[-.04,female?.224:.241,.207,0,0],[.14,.258,.224,0,0],[.32,.24,.221,0,-.016],[.425,.15,.148,0,-.03],[.45,.02,.03,0,-.04]],16);
 // Strong angular brow and nose bridge.
 loft("Nose",head,"Skin",[[-.135,.06,.08,0,.255],[-.06,.075,.065,0,.286],[.075,.052,.055,0,.225]],8);
 ellipsoid("Nose_Tip",head,"Skin",V(0,-.12,.319),V(.076,.052,.073),8,4);
 for(const side of [-1,1]){
  ellipsoid("Ear_"+side,head,"Skin",V(side*.239,-.08,0),V(.064,.11,.073),8,5);
  ellipsoid("Eye_White_"+side,head,"Trim",V(side*.103,.093,.209),V(.065,.041,.018),10,4);
  ellipsoid("Iris_"+side,head,"Eye",V(side*.102,.087,.226),V(.025,.029,.013),8,4);
  const brow=ellipsoid("Brow_"+side,head,"Hair",V(side*.106,.159,.214),V(.085,.027,.022),9,4);
 }
 ellipsoid("Lower_Lip",head,"Skin",V(0,-.177,.208),V(.083,.025,.029),10,4);
 // Hairstyle variants. Hair_0-5 each with merged sculpture-like cap and tapered locks.
 for(let style=0;style<6;style++){
  const hp=node("Hair_"+style,head);
  loft("HairCap_"+style,hp,"Hair",[[.22,.226,.20,0,-.029],[.34,.252,.21,0,-.023],[.435,.21,.17,0,-.027],[.505,.08,.075,0,-.04]],14);
  const lock=(name,x,y,z,dx,dy,dz,r=.10)=>{
   // three sections with point tip, anchored to head cap.
   tube(name,hp,"Hair",[[x,y,z],[x+dx*.58,y+dy*.58,z+dz*.58],[x+dx,y+dy,z+dz]],[r,r*.83,.007],6);
  };
  if(style===0){for(let i=0;i<8;i++){const a=i*Math.PI*2/8;lock("Short_Lock_"+i,Math.cos(a)*.18,.44,Math.sin(a)*.16,Math.cos(a)*.12,.16+(i%2)*.08,Math.sin(a)*.09,.095)}}
  if(style===1){for(let i=0;i<12;i++){const a=i*2*Math.PI/12;lock("Shaggy_Lock_"+i,Math.cos(a)*.235,.28,Math.sin(a)*.18,Math.cos(a)*.04,-.2-(i%3)*.035,Math.sin(a)*.02,.092)}}
  if(style===2){for(let i=0;i<12;i++){const a=i*2*Math.PI/12;lock("Medium_Lock_"+i,Math.cos(a)*.235,.26,Math.sin(a)*.18,Math.cos(a)*.12,-.39-(i%3)*.055,Math.sin(a)*.09,.087)}}
  if(style===3){for(let i=0;i<9;i++){const a=i*2*Math.PI/9;lock("Tied_Fringe_"+i,Math.cos(a)*.2,.33,Math.sin(a)*.19,Math.cos(a)*.10,-.055,Math.sin(a)*.04,.09)}
   loft("Ponytail_"+style,hp,"Hair",[[-.48,.12,.13,0,-.26],[-.25,.16,.17,0,-.30],[.07,.145,.16,0,-.31]],10);
   ellipsoid("Leather_Hair_Tie",hp,"Leather",V(0,.06,-.3),V(.155,.065,.16),9,5);
  }
  if(style===4){for(let k=0;k<3;k++)for(let j=0;j<5;j++){const xx=(k-1)*.13,yy=.22-j*.145;ellipsoid("Braid_"+k+"_"+j,hp,"Hair",V(xx,yy,-.255-(j%2)*.025),V(.085,.095,.086),7,4)}}
  if(style===5){for(let i=0;i<8;i++){const a=i*2*Math.PI/8;lock("Topknot_Sweep_"+i,Math.cos(a)*.15,.47,Math.sin(a)*.14,Math.cos(a)*.09,.20,Math.sin(a)*.08,.10)}
   ellipsoid("Topknot_Main",hp,"Hair",V(0,.65,-.06),V(.19,.15,.19),9,5);
   ellipsoid("Topknot_Tie",hp,"Leather",V(0,.51,-.06),V(.11,.055,.10),9,4);
  }
 }

 // Variants of facial hair live under head anchors and can be hidden per character.
 for(let beard=1;beard<=3;beard++){
  const beardRoot=node("Beard_"+beard,head);
  if(beard===1){
   ellipsoid("Light_Stubble",beardRoot,"Hair",V(0,-.225,.144),V(.175,.065,.106),11,5);
  } else {
   loft("Chin_Beard_"+beard,beardRoot,"Hair",[
     [-.42-(beard===3?.08:0),.015,.03,0,.10],
     [-.32-(beard===3?.05:0),.12,.10,0,.11],
     [-.19,.205,.13,0,.08],
     [-.07,.205,.12,0,.06]
   ],12);
   for(const side of [-1,1]){
    ellipsoid("Sideburn_"+side,beardRoot,"Hair",V(side*.165,-.11,.16),V(.08,.16,.095),9,5);
    ellipsoid("Mustache_"+side,beardRoot,"Hair",V(side*.075,-.15,.272),V(.105,.037,.035),9,4);
   }
   if(beard===3)for(let j=-2;j<=2;j++)tube("Beard_Tip_"+j,beardRoot,"Hair",[[j*.065,-.38,.15],[j*.06,-.53+Math.abs(j)*.035,.14]],[.054,.005],6);
  }
 }
 // Primitive cross-stitch detail gives the leather tunic depth without textures.
 for(let j=0;j<3;j++){
  const yy=.22-j*.14;
  tube("Torso_Stitch_A_"+j,spine,"Trim",[[-.075,yy,.245],[.07,yy-.085,.249]],[.019,.019],5);
  tube("Torso_Stitch_B_"+j,spine,"Trim",[[.07,yy,.247],[-.075,yy-.085,.247]],[.019,.019],5);
 }
 // Arms with sculpted tubular muscles, bracers, palm and thumb.
 for(const side of [-1,1]){
  const sh=side===-1?armL:armR,el=side===-1?elbowL:elbowR;
  tube("Upper_Arm_"+side,sh,"Skin",[[side*.09,-.44,0],[side*.055,-.28,0],[0,.01,0]],[.123,.154,.17],11);
  ellipsoid("Deltoid_"+side,sh,"Skin",V(side*.02,-.08,0),V(.175,.175,.17),11,6);
  tube("Forearm_"+side,el,"Skin",[[side*.02,-.34,.02],[side*.018,-.19,0],[0,.045,0]],[.10,.125,.132],10);
  loft("Leather_Bracer_"+side,el,"Leather",[[-.32,.112,.113,side*.02,0],[-.22,.135,.139,side*.02,0],[-.09,.141,.139,0,0]],10);
  ellipsoid("Hand_Palm_"+side,el,"Skin",V(side*.02,-.43,.025),V(.105,.14,.074),10,6);
  for(let k=0;k<4;k++){
   const xx=side*.02+(k-1.5)*.046;
   tube("Finger_"+side+"_"+k,el,"Skin",[[xx,-.56,.048],[xx,-.64+(k===0?.035:0),.055]],[.028,.018],6);
  }
  tube("Thumb_"+side,el,"Skin",[[side*.125,-.43,.08],[side*.16,-.55,.14]],[.04,.015],7);
  // Leg anatomical volumes and strapped boots.
  const upper=side===-1?legL:legR,lower=side===-1?kneeL:kneeR,foot=side===-1?footL:footR;
  tube("Thigh_"+side,upper,"Skin",[[0,-.47,0],[0,-.26,0],[0,.07,0]],[.148,.179,.21],12);
  ellipsoid("Knee_"+side,lower,"Skin",V(0,-.01,.065),V(.155,.16,.15),10,6);
  tube("Shin_"+side,lower,"Skin",[[0,-.42,.005],[0,-.23,0],[0,0,0]],[.119,.148,.15],10);
  loft("Boot_Leg_"+side,lower,"Boots",[[-.415,.135,.13,0,.015],[-.28,.157,.145,0,.013],[-.18,.169,.157,0,.006]],11);
  loft("Boot_Fur_Cuff_"+side,lower,"Fur",[[-.21,.175,.164,0,.007],[-.135,.18,.165,0,.005]],11);
  ellipsoid("Boot_Foot_"+side,foot,"Boots",V(0,.028,.16),V(.18,.145,.34),12,6);
  for(let k=0;k<2;k++){
   const strap=ellipsoid("Boot_Strap_"+side+"_"+k,lower,"Leather",V(0,-.27-k*.075,.134),V(.169,.024,.05),10,4);
  }
 }
 // Accessor creation, GLB buffer pack.
 const bytes=[];
 const aligned=()=>{while(bytes.length%4)bytes.push(0)};
 const view=(arr,type)=>{
  aligned();const offset=bytes.length;let b;
  if(type==="f32"){b=new Uint8Array(arr.length*4);const d=new DataView(b.buffer);arr.forEach((v,i)=>d.setFloat32(i*4,Math.round(v*100000)/100000,true));}
  else {b=new Uint8Array(arr.length*2);const d=new DataView(b.buffer);arr.forEach((v,i)=>d.setUint16(i*2,v,true));}
  for(const v of b)bytes.push(v);
  const id=bufferViews.length;bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});return id;
 };
 const addAccessor=(arr,componentType,type,componentCount,extrema=false)=>{
  const vi=view(arr,componentType===5126?"f32":"u16");
  const access={bufferView:vi,componentType,count:arr.length/componentCount,type};
  if(extrema){const min=Array(componentCount).fill(Infinity),max=Array(componentCount).fill(-Infinity);for(let i=0;i<arr.length;i+=componentCount)for(let j=0;j<componentCount;j++){min[j]=Math.min(min[j],arr[i+j]);max[j]=Math.max(max[j],arr[i+j]);} access.min=min;access.max=max;}
  const index=accessors.length;accessors.push(access);return index;
 };
 const gltfMeshes=[];
 for(const m of meshes){
  const [pos,norm,indices]=m.parts;
  const position=addAccessor(pos,5126,"VEC3",3,true),normal=addAccessor(norm,5126,"VEC3",3),index=addAccessor(indices,5123,"SCALAR",1);
  gltfMeshes.push({name:m.name,primitives:[{attributes:{POSITION:position,NORMAL:normal},indices:index,material:m.mat,mode:4}]});
 }
 aligned();
 const json={asset:{version:"2.0",generator:"Epoch original sculpted modular avatar generator"},scene:0,scenes:[{nodes:[root]}],nodes,meshes:gltfMeshes,materials,accessors,bufferViews,buffers:[{byteLength:bytes.length}]};
 const ascii=str=>Array.from(str,ch=>ch.charCodeAt(0));
 const jsonBytes=ascii(JSON.stringify(json));
 while(jsonBytes.length%4)jsonBytes.push(32);
 const bin=bytes.slice();while(bin.length%4)bin.push(0);
 const total=12+8+jsonBytes.length+8+bin.length;
 const output=new Uint8Array(total);const data=new DataView(output.buffer);
 const w32=(at,x)=>data.setUint32(at,x,true);
 w32(0,0x46546c67);w32(4,2);w32(8,total);w32(12,jsonBytes.length);w32(16,0x4e4f534a);
 output.set(jsonBytes,20);const chunk=20+jsonBytes.length;w32(chunk,bin.length);w32(chunk+4,0x004e4942);output.set(bin,chunk+8);
 const b64chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",base64=(buf)=>{let out="";for(let i=0;i<buf.length;i+=3){const a=buf[i],b=buf[i+1],c=buf[i+2],n=(a<<16)|((b||0)<<8)|(c||0);out+=b64chars[n>>>18&63]+b64chars[n>>>12&63]+(i+1<buf.length?b64chars[n>>>6&63]:"=")+(i+2<buf.length?b64chars[n&63]:"=");}return out};
 return {base64:base64(output),size:output.length,meshCount:gltfMeshes.length,nodeCount:nodes.length,materialCount:materials.length,sex};
}

// Use buildAvatarGLB('male') / ('female') in a Node toolchain; the output is a base64-encoded glTF 2.0 binary file.

// Rebuild these original assets locally with Node.js 18+:
//    node epoch/tools/build-avatar-glb.js
// Blender can import the resulting .glb files for sculpting and rig refinements.
if (typeof require!=="undefined" && require.main===module) {
 const fs=require("node:fs"), path=require("node:path");
 const directory=path.resolve(__dirname,"../assets/characters");
 fs.mkdirSync(directory,{recursive:true});
 for (const sex of ["male","female"]) {
   const asset=buildAvatarGLB(sex);
   const filename=path.join(directory,"human_"+sex+".glb");
   fs.writeFileSync(filename,Buffer.from(asset.base64,"base64"));
   console.log(sex,asset.size+" bytes",asset.meshCount+" meshes",filename);
 }
}
