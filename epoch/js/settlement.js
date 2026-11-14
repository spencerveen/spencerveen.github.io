import {LEGACY_HOME} from "./stockpile.js?v=20261113k";
// Stone Age building types and original plot coordinates kept solely to
// migrate existing constructed villages. New construction uses free 2m grid.
export const BUILDINGS={
 family:{name:"Family Hut",short:"Housing",description:"A hide-and-timber family dwelling. Adds room for three more villagers.",cost:{wood:10,stone:6},requires:[],capacity:3},
 hearth:{name:"Cooking Hearth",short:"Cooking",description:"A communal firepit with a roasting spit. The cooking station is ready for hunting and meat recipes later.",cost:{wood:6,stone:5},requires:["fire"],capacity:0},
 lore:{name:"Toolmaker's Shelter",short:"Technology",description:"A covered workspace for experimenting with flint, tools and new discoveries. Technology bonuses come later.",cost:{wood:12,stone:8},requires:["tools"],capacity:0},
 council:{name:"Council Lodge",short:"Culture",description:"A gathering place for stories, traditions and village decisions. Culture bonuses come later.",cost:{wood:14,stone:8},requires:["community"],capacity:0}
};
export const PLOTS=[
 {id:"family_1",kind:"family",x:-8,z:4,rotation:0},
 {id:"family_2",kind:"family",x:-15,z:4,rotation:-.3},
 {id:"hearth_1",kind:"hearth",x:-5,z:-3,rotation:0},
 {id:"lore_1",kind:"lore",x:2,z:12,rotation:.2},
 {id:"council_1",kind:"council",x:1,z:-13,rotation:-.3}
];
export const PLOT_BY_ID=Object.fromEntries(PLOTS.map(plot=>[plot.id,plot]));
export const VILLAGE_START_POPULATION=5; // Player and four existing settlement NPCs.
export const VILLAGE_START_CAPACITY=5;   // Temporary sleeping places around camp.
export function emptyVillage(){return {plots:{},buildings:[],nextBuildingNumber:1,population:VILLAGE_START_POPULATION,stockpile:null}}
/** Keep plot IDs stable, but move their starter blueprint with the home base. */
export function plotAtHome(village,id){
 const plot=PLOT_BY_ID[id];
 if(!plot)return null;
 const home=village?.stockpile;
 if(!home)return {...plot};
 return {...plot,x:plot.x+(home.x-LEGACY_HOME.x),z:plot.z+(home.z-LEGACY_HOME.z)};
}
export function villagePlots(village){return PLOTS.map(p=>plotAtHome(village,p.id))}
export function capacity(village){
 if(Array.isArray(village?.buildings))
  return VILLAGE_START_CAPACITY+
   village.buildings.filter(building=>building.kind==="family").length*BUILDINGS.family.capacity;
 return VILLAGE_START_CAPACITY+PLOTS.reduce((sum,plot)=>
  sum+(village?.plots?.[plot.id]==="family"?BUILDINGS.family.capacity:0),0);
}
export function villagePlotType(village,id){return village?.plots?.[id]||null}
