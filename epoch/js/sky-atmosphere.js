/**
 * Epoch 6C.1A–C: CC0 photographic skies and smoothly changing atmosphere.
 *
 * Lightweight inward-facing Babylon sphere with an equirectangular WebP
 * shader. Both images are loaded once. A manual preview now fades through
 * sunrise and sunset, without changing the calendar or recreating chunks.
 *
 * Sources and conversion: ../assets/sky/SOURCES.md
 */
import {createSkyPreviewTransition,skyEnvironmentAt,skyTwilightWeight} from "./sky-transitions.js?v=20261114twilight1";
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
uniform float twilightGlow;
uniform float duskWeight;
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
 // The source is a tonemapped night HDRI with bright exposure. Restore a
 // moonlit darkness instead of displaying its photographic preview as day.
 nightColor=pow(max(nightColor,vec3(0.0)),vec3(1.18))*vec3(.35,.43,.62);
 vec3 horizon=mix(vec3(.62,.71,.62),vec3(.085,.12,.19),nightMix);
 vec3 sky=mix(dayColor,nightColor,nightMix);
 // Sunlit clouds and a low warm horizon slowly develop at dusk/dawn.
 // Use a localized golden glow, preserving cloud structure in the HDRIs.
 vec2 solarAxis=mix(vec2(-.72,.69),vec2(.82,-.57),duskWeight);
 float facing=max(0.0,dot(normalize(direction.xz+vec2(.0001)),normalize(solarAxis)));
 float horizonGlow=exp(-pow((direction.y-.035)*5.0,2.0));
 float solarGlow=pow(facing,3.0);
 vec3 twilightColor=mix(vec3(1.0,.69,.47),vec3(1.0,.42,.24),duskWeight);
 sky=mix(sky,sky*vec3(1.05,.78,.72)+twilightColor*(.16+.51*solarGlow)*horizonGlow,
  twilightGlow*.78);
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
  {attributes:["position"],uniforms:["worldViewProjection","nightMix","twilightGlow","duskWeight","dayReady","nightReady"],
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
 material.setFloat("twilightGlow",0);
 material.setFloat("duskWeight",1);
 const dome=B.MeshBuilder.CreateSphere("Epoch panorama sky dome",
  {diameter:900,segments:24,sideOrientation:B.Mesh.BACKSIDE},scene);
 dome.material=material;dome.isPickable=false;dome.applyFog=false;
 dome.alwaysSelectAsActiveMesh=true;dome.renderingGroupId=0;
 dome.metadata={skybox:true,preview:"day"};
 const textures={day:null,night:null},loaded={day:false,night:false};
 const fade=createSkyPreviewTransition(0);
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
 function applyVisuals(){
  const mix=fade.mix;
  const setup=skyEnvironmentAt(mix,fade.phase,SKY_LIGHTING.day,SKY_LIGHTING.night);
  material.setFloat("nightMix",mix);
  material.setFloat("twilightGlow",skyTwilightWeight(mix));
  material.setFloat("duskWeight",fade.phase==="dusk"?1:0);
  scene.clearColor.copyFromFloats(...setup.background,1);
  scene.fogColor.copyFromFloats(...setup.fog);
  if(world.skyHemi){
   world.skyHemi.intensity=setup.hemiIntensity;
   world.skyHemi.groundColor.copyFromFloats(...setup.ground);
  }
  if(world.skySun){
   world.skySun.intensity=setup.sunIntensity;
   world.skySun.diffuse.copyFromFloats(...setup.sunColor);
   world.skySun.direction.copyFromFloats(...setup.sunDirection);
  }
  // The terrain shader does not use native Babylon lights, so lighting
  // and fog uniforms must match every stage of the sky transition.
  if(world.m.terrainSurface?.setColor3)
   world.m.terrainSurface.setColor3("fogColor",scene.fogColor);
  if(world.m.terrainSurface?.setFloat)
   world.m.terrainSurface.setFloat("skyBrightness",setup.terrainBrightness);
  if(world.m.river){
   world.m.river.diffuseColor.copyFromFloats(...setup.waterColor);
   const emissive=mode==="day"&&mix===0?
    [.025,.045,.05]:[.006+.019*(1-mix),.012+.033*(1-mix),.022+.028*(1-mix)];
   world.m.river.emissiveColor.copyFromFloats(...emissive);
  }
  dome.metadata.phase=fade.transitioning?(fade.phase==="dawn"?"sunrise":"sunset"):mode;
 }
 /** When the user changes direction mid-transition, resume from the current
  * blend, with proportional duration. No snapping or resource reloads.
  */
 function setMode(next,immediate=false){
  if(!SKY_PREVIEW_MODES.includes(next))return false;
  mode=next;
  dome.metadata.preview=mode;
  fade.setTarget(mode==="night"?1:0,immediate);
  applyVisuals();
  return true;
 }
 function update(camera,dt=0){
  if(camera)dome.position.copyFrom(camera.position);
  if(fade.transitioning&&dt>0){
   fade.advance(dt);
   applyVisuals();
  }
 }
 function status(){
  return {mode,phase:fade.transitioning?
    (fade.phase==="dawn"?"sunrise":"sunset"):mode,
   nightMix:fade.mix,twilight:skyTwilightWeight(fade.mix),
   transitioning:fade.transitioning,secondsRemaining:fade.remaining,
   loaded:{...loaded},shaderError:error,
   domeVisible:dome.isEnabled(),usesLocalAssets:true};
 }
 setMode("day",true);
 return {dome,material,textures,loaded,setMode,update,status,
  get mode(){return mode},get nightMix(){return fade.mix}};

}
