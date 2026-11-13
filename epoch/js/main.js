import {GameState} from "./state.js";
import {World} from "./world.js";
import {UI} from "./ui.js";
const loading=document.getElementById("loading");
try{
  if(!globalThis.BABYLON)throw new Error("Babylon.js failed to load. Check your internet connection.");
  const canvas=document.getElementById("scene");
  const state=new GameState();
  let ui;
  const world=new World(canvas,
    resource=>{const result=state.gather(resource);if(result)ui.toast(result.label)},
    (title,details)=>ui?.status(title,details));
  ui=new UI(state,world);
  window.setInterval(()=>state.advance(1),1000);
  window.addEventListener("pagehide",()=>state.save());
  loading.classList.add("hidden");
  ui.toast("The first chapter begins. Explore the clearing.");
  // Expose a read-only inspection aid for development without exposing mutation methods.
  Object.defineProperty(globalThis,"epochDebug",{value:()=>({
    year:state.formatYear(),generation:state.data.generation,
    skills:{...state.data.skills},resources:{...state.data.resources},appearance:{...state.data.hero.appearance},villagerCount:world.people.length,
    technologies:[...state.data.technologies],civics:[...state.data.civics],
    position:{x:world.player.position.x,z:world.player.position.z}
  }),configurable:true});
}catch(error){
  console.error("Epoch failed to initialize:",error);
  loading.querySelector("h2").textContent="Unable to open Epoch";
  loading.querySelector("p").textContent=error.message;
}
