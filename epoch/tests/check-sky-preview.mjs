import assert from "node:assert/strict";
import {SKY_ASSETS,SKY_PREVIEW_MODES,SKY_LIGHTING} from "../js/sky-atmosphere.js";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const here=path.dirname(fileURLToPath(import.meta.url));
const skyRoot=path.join(here,"..","assets","sky");
const manifest=JSON.parse(readFileSync(path.join(skyRoot,"manifest.json"),"utf8"));
assert.equal(manifest.license,"CC0-1.0");
assert.deepEqual(SKY_PREVIEW_MODES,["day","night"]);
assert.deepEqual(manifest.resolution,[2048,1024]);
for(const mode of SKY_PREVIEW_MODES){
 const entry=manifest.panoramas[mode];
 assert(entry?.polyhaven_id?.endsWith("_puresky"));
 assert(SKY_ASSETS[mode].startsWith("./assets/sky/"+mode+".webp"));
 assert(entry.bytes>30000&&entry.bytes<1_200_000);
 const binary=readFileSync(path.join(skyRoot,entry.file));
 assert.equal(binary.length,entry.bytes);
 assert.equal(binary.toString("ascii",0,4),"RIFF","WebP RIFF signature");
 assert.equal(binary.toString("ascii",8,12),"WEBP","WebP codec signature");
}
assert(SKY_LIGHTING.day.hemiIntensity>SKY_LIGHTING.night.hemiIntensity);
assert(SKY_LIGHTING.day.sunIntensity>SKY_LIGHTING.night.sunIntensity);
assert(SKY_LIGHTING.day.terrainBrightness>SKY_LIGHTING.night.terrainBrightness);
assert.notDeepEqual(SKY_LIGHTING.day.fog,SKY_LIGHTING.night.fog);
const script=readFileSync(path.join(here,"..","js","sky-atmosphere.js"),"utf8");
assert(script.includes("new B.ShaderMaterial"),"sky uses actual scene shader");
assert(script.includes("skyDirection"),"sky uses equirectangular world-space direction");
assert(script.includes("dome.isPickable=false"),"sky never intercepts object selection");
assert(script.includes("createSkyAtmosphere"),"sky controller exports a constructor");
const world=readFileSync(path.join(here,"..","js","world.js"),"utf8");
assert(world.includes("createSkyAtmosphere(B,this.scene,this)"));
assert(world.includes("this.skyAtmosphere.update(this.camera,dt)"),"sky updates with frame delta for gradual transitions");
console.log("PASS skyboxes: two CC0 2K local WebP files, static preview modes, shader, fog and lighting");
