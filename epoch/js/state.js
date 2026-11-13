import {founderAppearance,descendantAppearance,normalizeAppearance} from "./characters.js?v=20261113b";
export const SKILLS=[
  ["woodcutting","Woodcutting"],["mining","Mining"],["foraging","Foraging"],
  ["crafting","Crafting"],["construction","Construction"],["survival","Survival"]
];
export const TECH={
 fire:{name:"Control of Fire",description:"Use fuel and stone to establish a permanent campfire. The first step toward civilization.",cost:{wood:4,stone:2,knowledge:3},needs:[]},
 tools:{name:"Stone Toolmaking",description:"Shape stone tools and craft your first proper axe.",cost:{wood:5,stone:6,knowledge:7},needs:["fire"]},
 farming:{name:"Early Agriculture",description:"Experiment with growing food and preparing permanent farmland. A preview of our next age.",cost:{food:10,stone:5,knowledge:18},needs:["tools"],culture:["community"]}
};
export const CIVICS={
 community:{name:"Tribal Community",description:"Establish common responsibilities and organize a small settlement.",cost:{wood:8,food:6,culture:5},needs:[]},
 oral:{name:"Oral Tradition",description:"Teach descendants more of the skills learned by their ancestors.",cost:{food:8,culture:10},needs:["community"]},
 apprenticeship:{name:"Apprenticeship",description:"Create a tradition of mentorship across generations.",cost:{food:12,wood:8,culture:18},needs:["oral"]}
};
const KEY="epoch.stoneage.v1";
const fresh=()=>({
 version:1,year:-12000,calendarProgress:0,generation:1,hero:{name:"Aren",age:18,appearance:founderAppearance()},
 skills:Object.fromEntries(SKILLS.map(([id])=>[id,0])),
 resources:{wood:0,stone:0,food:0},knowledge:0,culture:0,
 technologies:[],civics:[],axe:false,shelter:false,
 lineage:[{name:"Aren",gen:1,start:-12000,role:"Founder",appearance:founderAppearance()}],
 history:["The wanderer Aren entered a quiet clearing in a vast prehistoric wilderness."]
});
export function threshold(level){return Math.round(35*level**1.65)}
export function skillLevel(xp){let level=1,remaining=xp;while(level<99 && remaining>=threshold(level)){remaining-=threshold(level);level++}return {level,remaining,next:threshold(level)}}
export class GameState{
 constructor(){
  let data=null;
  try { data=JSON.parse(localStorage.getItem(KEY)||"null"); }catch{}
  const base=fresh();
  this.data=data && data.version===1?{...base,...data,
   hero:{...base.hero,...data.hero},resources:{...base.resources,...data.resources},
   skills:{...base.skills,...data.skills}}:base;
  this.data.hero.appearance=normalizeAppearance(this.data.hero.appearance||founderAppearance());
  this.onChange=()=>{};
  this.lastSave=0;
 }
 save(){try{localStorage.setItem(KEY,JSON.stringify(this.data))}catch(e){console.warn("Save unavailable",e)}}
 changed(message){if(message)this.data.history.unshift(message);this.data.history=this.data.history.slice(0,80);this.save();this.onChange();}
 enough(cost){const s=this.data;return Object.entries(cost).every(([key,value])=>((key==="knowledge"||key==="culture")?s[key]:(s.resources[key]||0))>=value)}
 pay(cost){if(!this.enough(cost))return false;for(const [key,value] of Object.entries(cost)){if(key==="knowledge"||key==="culture")this.data[key]-=value;else this.data.resources[key]-=value;}return true}
 gainXP(skill,amount){this.data.skills[skill]=(this.data.skills[skill]||0)+amount;this.data.knowledge+=skill==="survival"?0:1}
 gather(type){
  const m={wood:{name:"wood",skill:"woodcutting",amount:this.data.axe?3:2,xp:13},stone:{name:"stone",skill:"mining",amount:2,xp:12},food:{name:"wild berries",skill:"foraging",amount:2,xp:12}};
  const v=m[type];if(!v)return null;
  this.data.resources[type]+=v.amount;this.gainXP(v.skill,v.xp);this.gainXP("survival",2);
  if(type==="food")this.data.culture++;
  this.changed();
  return {label:`+${v.amount} ${v.name} · +${v.xp} ${v.skill} XP`,type};
 }
 eligible(kind,key){
  const d=kind==="tech"?TECH:CIVICS;const owned=kind==="tech"?this.data.technologies:this.data.civics;const node=d[key];
  if(!node)return false;
  return !owned.includes(key) && node.needs.every(n=>owned.includes(n)) && (!node.culture||node.culture.every(n=>this.data.civics.includes(n)));
 }
 unlock(kind,key){
  const node=(kind==="tech"?TECH:CIVICS)[key];
  if(!node||!this.eligible(kind,key)||!this.pay(node.cost))return false;
  (kind==="tech"?this.data.technologies:this.data.civics).push(key);
  this.changed(`${this.data.hero.name}'s people discovered ${node.name}.`);
  return true;
 }
 craftAxe(){
  if(this.data.axe||!this.data.technologies.includes("tools")||!this.pay({wood:2,stone:3}))return false;
  this.data.axe=true;this.gainXP("crafting",28);this.changed(`${this.data.hero.name} crafted a stone axe.`);return true;
 }
 buildShelter(){
  if(this.data.shelter||!this.data.technologies.includes("fire")||!this.pay({wood:10,stone:6}))return false;
  this.data.shelter=true;this.gainXP("construction",55);this.data.culture+=3;
  this.changed(`${this.data.hero.name} built the family's first shelter.`);return true;
 }
 setAppearance(patch){
  this.data.hero.appearance=normalizeAppearance({...this.data.hero.appearance,...patch});
  this.changed();
 }
 nextGeneration(){
  const old=this.data.hero;
  const names=["Eira","Torin","Mara","Kellan","Sera","Darin","Elowen","Cai","Nessa","Roran"];
  const name=names[(this.data.generation-1)%names.length];
  const inherited=this.data.civics.includes("apprenticeship")?.25:this.data.civics.includes("oral")?.15:.08;
  this.data.skills=Object.fromEntries(SKILLS.map(([id])=>[id,Math.round(this.data.skills[id]*inherited)]));
  this.data.generation++;this.data.year+=24;this.data.calendarProgress=0;
  this.data.hero={name,age:18,appearance:descendantAppearance(old.appearance,this.data.generation)};
  this.data.lineage.push({name,gen:this.data.generation,start:this.data.year,role:"Descendant of "+old.name,appearance:this.data.hero.appearance});
  this.changed(`${old.name}'s legacy passes to ${name}, generation ${this.data.generation}.`);
  return name;
 }
 advance(dt){
  const d=this.data;d.calendarProgress+=Math.min(dt,5)/90;
  if(d.calendarProgress>=1){d.calendarProgress-=1;d.year++;d.hero.age++;this.changed(`${d.hero.name} celebrates another year of life.`)}
 }
 formatYear(){return this.data.year<0?`${Math.abs(this.data.year).toLocaleString()} BCE`:`${this.data.year+1} CE`}
 reset(){localStorage.removeItem(KEY);this.data=fresh();this.changed()}
}
