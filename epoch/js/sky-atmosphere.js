/**
 * Epoch 6C.1A/B: static day/night skies with local CC0 photographic panoramas.
 *
 * Lightweight inward-facing Babylon sphere with an equirectangular WebP
 * shader. Both images are loaded once; preview changes do not reload chunks
 * or recreate meshes. The mode API is ready for later clock-based blending.
 *
 * Sources and conversion: ../assets/sky/SOURCES.md
 */
export const SKY_ASSETS=Object.freeze({
 day:"./assets/sky/day.webp?v=20261114sky1",
 night:"./assets/sky/night.webp?v=20261114sky1"
});
export const SKY_PREVIEW_MODES=Object.freeze(["day","night"]);
export const SKY_LIGHTING=Object.freeze({
 day:Object.freeze({
  background:[.62,.71,.62],fog:[.62,.71,.62],
  hemiIntensity:.77,ground:[.32,.37,.29],
  sunIntensity:.85,sunColor:[1,.91,.75],sunDirection:[-.5,-1,.4],
  terrainBrightness:1,waterColor:[.94,.99,1]
 }),
 night:Object.freeze({
  background:[.075,.105,.17],fog:[.085,.12,.19],
  hemiIntensity:.25,ground:[.065,.078,.105],
  sunIntensity:.16,sunColor:[.45,.61,.95],sunDirection:[.32,-.8,-.5],
  terrainBrightness:.39,waterColor:[.40,.54,.76]
 })
});
const SKY_VERTEX=String.raw`
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 skyDirection;
void main(void){
 skyDirection=position;
 gl_Position=worldViewProjection*vec4(position,1.0);
}
`;
const SKY_FRAGMENT=String.raw`
precision highp float;
uniform sampler2D daySampler;
uniform sampler2D nightSampler;
uniform float nightMix;
uniform float dayReady;
uniform float nightReady;
varying vec3 skyDirection;
void main(void){
 vec3 direction=normalize(skyDirection);
 // A 2:1 equirectangular panorama viewed from the center of the sphere.
 float u=fract(atan(direction.z,direction.x)/6.28318530718+0.5);
 float v=0.5-asin(clamp(direction.y,-1.0,1.0))/3.14159265359;
 vec2 coords=vec2(u,clamp(v,0.001,0.999));
 vec3 dayFallback=mix(vec3(.65,.77,.85),vec3(.17,.43,.73),
  smoothstep(-.08,.72,direction.y));
 vec3 nightFallback=mix(vec3(.13,.17,.26),vec3(.015,.027,.07),
  smoothstep(-.08,.72,direction.y));
 vec3 dayColor=mix(dayFallback,texture2D(daySampler,coords).rgb,dayReady);
 vec3 nightColor=mix(nightFallback,texture2D(nightSampler,coords).rgb,nightReady);
 vec3 horizon=mix(vec3(.62,.71,.62),vec3(.085,.12,.19),nightMix);
 vec3 sky=mix(dayColor,nightColor,nightMix);
 // Pure-sky panoramas can include lower-hemisphere reflection artifacts.
 // Hide those below the natural horizon instead of inventing far terrain.
 sky=mix(horizon,sky,smoothstep(-.12,.035,direction.y));
 gl_FragColor=vec4(sky,1.0);
}
`;

const color=(B,channels)=>new B.Color3(...channels);
const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));

export function createSkyAtmosphere(B,scene,world){
 B.Effect.ShadersStore.epochSkyVertexShader=SKY_VERTEX;
 B.Effect.ShadersStore.epochSkyFragmentShader=SKY_FRAGMENT;
 const material=new B.ShaderMaterial("Epoch photographed sky",scene,
  {vertex:"epochSky",fragment:"epochSky"},
  {attributes:["position"],uniforms:["worldViewProjection","nightMix","dayReady","nightReady"],
   samplers:["daySampler","nightSampler"]});
 material.backFaceCulling=false;
 material.disableDepthWrite=true;
 const fallback=(red,green,blue)=>new B.RawTexture(new Uint8Array([red,green,blue,255]),
  1,1,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false,B.Texture.NEAREST_SAMPLINGMODE);
 const dayFallback=fallback(160,192,215),nightFallback=fallback(20,29,61);
 material.setTexture("daySampler",dayFallback);
 material.setTexture("nightSampler",nightFallback);
 material.setFloat("dayReady",0);
 material.setFloat("nightReady",0);
 material.setFloat("nightMix",0);
 const dome=B.MeshBuilder.CreateSphere("Epoch panorama sky dome",
  {diameter:900,segments:24,sideOrientation:B.Mesh.BACKSIDE},scene);
 dome.material=material;dome.isPickable=false;dome.applyFog=false;
 dome.alwaysSelectAsActiveMesh=true;dome.renderingGroupId=0;
 dome.metadata={skybox:true,preview:"day"};
 const textures={day:null,night:null},loaded={day:false,night:false};
 let mode="day",error="";
 material.onError=(_,message)=>{
  error=String(message);
  console.warn("Epoch sky shader failed; using scene background color",message);
  dome.setEnabled(false);
 };
 for(const key of SKY_PREVIEW_MODES){
  const sampler=key==="day"?"daySampler":"nightSampler";
  const ready=key==="day"?"dayReady":"nightReady";
  textures[key]=new B.Texture(SKY_ASSETS[key],scene,false,false,
   B.Texture.TRILINEAR_SAMPLINGMODE,
   ()=>{
    loaded[key]=true;
    material.setTexture(sampler,textures[key]);
    material.setFloat(ready,1);
   },
   (message,exception)=>{
    console.warn("Epoch "+key+" sky panorama unavailable; showing gradient fallback",
     message,exception||"");
   });
  textures[key].wrapU=B.Texture.WRAP_ADDRESSMODE;
  textures[key].wrapV=B.Texture.CLAMP_ADDRESSMODE;
  textures[key].anisotropicFilteringLevel=2;
 }
 function setMode(next){
  if(!SKY_PREVIEW_MODES.includes(next))return false;
  mode=next;dome.metadata.preview=mode;
  material.setFloat("nightMix",mode==="night"?1:0);
  const setup=SKY_LIGHTING[mode];
  scene.clearColor=new B.Color4(...setup.background,1);
  scene.fogColor=color(B,setup.fog);
  if(world.skyHemi){
   world.skyHemi.intensity=setup.hemiIntensity;
   world.skyHemi.groundColor=color(B,setup.ground);
  }
  if(world.skySun){
   world.skySun.intensity=setup.sunIntensity;
   world.skySun.diffuse=color(B,setup.sunColor);
   world.skySun.direction=new B.Vector3(...setup.sunDirection);
  }
  // Epoch terrain has an intentionally custom ShaderMaterial, so its
  // fog and illumination need explicit uniforms (scene lights alone
  // cannot darken this shader).
  if(world.m.terrainSurface?.setColor3)
   world.m.terrainSurface.setColor3("fogColor",scene.fogColor);
  if(world.m.terrainSurface?.setFloat)
   world.m.terrainSurface.setFloat("skyBrightness",setup.terrainBrightness);
  if(world.m.river){
   world.m.river.diffuseColor=color(B,setup.waterColor);
   world.m.river.emissiveColor=mode==="day"?
    new B.Color3(.025,.045,.05):new B.Color3(.006,.012,.022);
  }
  return true;
 }
 function update(camera){
  if(camera)dome.position.copyFrom(camera.position);
 }
 function status(){
  return {mode,loaded:{...loaded},shaderError:error,
   domeVisible:dome.isEnabled(),usesLocalAssets:true};
 }
 setMode("day");
 return {dome,material,textures,loaded,setMode,update,status,
  get mode(){return mode}};
}
