/**
 * Epoch's generated grass, sand and water textures.
 * Shared Babylon textures/materials (one set for every streamed chunk).
 * UV coordinates are based on absolute world meters, not chunk-local UVs.
 */
export const TEXTURE_VERSION=1;
export const TERRAIN_TILE_METERS=7.5;
export const WATER_TILE_METERS=10;
const clamp=x=>Math.min(1,Math.max(0,x));
export const terrainUV=(x,z)=>[x/TERRAIN_TILE_METERS,z/TERRAIN_TILE_METERS];
export const waterUV=(x,z)=>[x/WATER_TILE_METERS,z/WATER_TILE_METERS];
export function terrainBiomeWeights(sample,rock=0){
 const beach=sample?.kind==="ocean"?1:clamp(Number(sample?.coastBeach)||0);
 return [beach,clamp(rock)];
}

export const TERRAIN_VERTEX_SHADER=`
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
attribute vec2 uv;
attribute vec2 uv2;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec4 vColor;
varying vec2 vUV;
varying vec2 vBiome;
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main(void){
 vec4 location=world*vec4(position,1.0);
 vWorldPos=location.xyz;
 vNormalW=normalize(mat3(world)*normal);
 vColor=color;
 vUV=uv;
 vBiome=uv2;
 gl_Position=worldViewProjection*vec4(position,1.0);
}
`;
export const TERRAIN_FRAGMENT_SHADER=`
precision highp float;
varying vec4 vColor;
varying vec2 vUV;
varying vec2 vBiome;
varying vec3 vNormalW;
varying vec3 vWorldPos;
uniform sampler2D grassSampler;
uniform sampler2D sandSampler;
uniform vec3 cameraPosition;
uniform vec3 fogColor;
uniform float fogDensity;
uniform float skyBrightness;
void main(void){
 // Subtle detail is modulated onto the existing slope/soil/sand vertex
 // palette; exposed mountains therefore stay rocky rather than green.
 vec3 grass=texture2D(grassSampler,vUV).rgb;
 vec3 sand=texture2D(sandSampler,vUV*.78).rgb;
 vec3 grassDetail=clamp(grass/vec3(.42,.53,.22),vec3(.60),vec3(1.52));
 vec3 sandDetail=clamp(sand/vec3(.86,.64,.40),vec3(.62),vec3(1.48));
 vec3 detail=mix(grassDetail,sandDetail,clamp(vBiome.x,0.0,1.0));
 float detailStrength=.84*(1.0-.94*clamp(vBiome.y,0.0,1.0));
 vec3 albedo=vColor.rgb*mix(vec3(1.0),detail,detailStrength);
 float light=.79+.21*max(0.0,dot(normalize(vNormalW),normalize(vec3(.34,.88,.30))));
 vec3 result=albedo*light*skyBrightness;
 float d=length(vWorldPos-cameraPosition);
 float fog=1.0-exp(-d*d*fogDensity*fogDensity);
 result=mix(result,fogColor,clamp(fog,0.0,1.0));
 gl_FragColor=vec4(result,1.0);
}
`;

export function setupSurfaceTextures(B,scene,materials){
 B.Effect.ShadersStore.epochTerrainVertexShader=TERRAIN_VERTEX_SHADER;
 B.Effect.ShadersStore.epochTerrainFragmentShader=TERRAIN_FRAGMENT_SHADER;
 const texture=(name)=>{
  const t=new B.Texture("./assets/textures/"+name+".webp?v=20261114textures1",
   scene,false,false,B.Texture.TRILINEAR_SAMPLINGMODE);
  t.name="Epoch "+name+" terrain texture";
  t.wrapU=B.Texture.WRAP_ADDRESSMODE;
  t.wrapV=B.Texture.WRAP_ADDRESSMODE;
  t.anisotropicFilteringLevel=4;
  return t;
 };
 const grass=texture("grass"),sand=texture("sand"),water=texture("water");
 const fallback=materials.terrainSurface;
 const ground=new B.ShaderMaterial("Epoch grass-to-sand terrain",scene,
  {vertex:"epochTerrain",fragment:"epochTerrain"},
  {attributes:["position","normal","color","uv","uv2"],
   uniforms:["world","worldViewProjection","cameraPosition","fogColor","fogDensity","skyBrightness"],
   samplers:["grassSampler","sandSampler"]});
 ground.setTexture("grassSampler",grass);
 ground.setTexture("sandSampler",sand);
 ground.setColor3("fogColor",scene.fogColor);
 ground.setFloat("fogDensity",scene.fogDensity);
 ground.setFloat("skyBrightness",1);
 ground.backFaceCulling=true;
 ground.onError=(effect,error)=>{
  console.warn("Epoch terrain shader unavailable, using vertex-color fallback",error);
  materials.terrainSurface=fallback;
  for(const m of scene.meshes)if(m.material===ground)m.material=fallback;
 };
 materials.terrainSurface=ground;
 materials.grassTexture=grass;
 materials.sandTexture=sand;
 materials.waterTexture=water;
 materials.river.diffuseTexture=water;
 materials.river.diffuseColor=new B.Color3(1,1,1);
 // Retain water vertex-color depth tint and its own transparency.
 materials.river.useAlphaFromDiffuseTexture=false;
 return ground;
}
