'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const views=read('ui/views.js'),combat=read('systems/combat.js');

test('the full UI module parses after guarded status-text cleanup',()=>{
 assert.doesNotThrow(()=>new vm.Script(views));
 assert.match(views,/function writeStatusText\(id,value\)/);
 assert.match(views,/function renderPage\(\)\{if\(page==='workers'\)/);
 assert.match(views,/if\(page==='forge'\|\|page==='world'\|\|page==='battle'\)updateIllustratedScenes\(\)/);
 assert.match(views,/root\.querySelector\('\[data-view="/);
});
test('unchanged status labels do not trigger repeated DOM mutations',()=>{
 const snippet=views.slice(views.indexOf('function writeStatusText('),views.indexOf('function currencyStats()'));
 let writes=0,stored='';
 const node={get textContent(){return stored;},set textContent(value){writes++;stored=value;}};
 const ctx={$:()=>node};vm.createContext(ctx);vm.runInContext(snippet,ctx);
 vm.runInContext("writeStatusText('x','A')",ctx);
 vm.runInContext("writeStatusText('x','A')",ctx);
 vm.runInContext("writeStatusText('x','B')",ctx);
 assert.equal(writes,2);
 assert.equal(stored,'B');
});
test('hunt forecast is sampled in World only and hunt buttons update only on stage changes',()=>{
 const helper=views.slice(views.indexOf('function writeStatusText('),views.indexOf('function currencyStats()'));
 const hunt=views.slice(views.indexOf('let lastHuntSignature='),views.indexOf('function stats()'));
 assert.ok(hunt.includes("lastFarmForecastAt"));
 const nodes=new Map(),counts={steps:0,forecast:0},now={ms:0};
 function node(id){
  if(!nodes.has(id)){
   const obj={textContent:'',_html:''};
   Object.defineProperty(obj,'innerHTML',{get(){return this._html;},set(v){this._html=v;if(id==='huntsteps')counts.steps++;}});
   nodes.set(id,obj);
  }
  return nodes.get(id);
 }
 const ctx={
  page:'forge',Date:{now:()=>now.ms},s:{zone:0,stage:1,firstClears:[0],bossCleared:[false],autoMode:'off',smartResting:false,combatLevel:1,skills:{},equipped:{},hp:100},
  $:node,maxSelectable:()=>10,maxHealth:()=>100,activeSkill:()=>0,
  bestFarmStage:()=>{counts.forecast++;return 1;},
  realms:[['Ashen Wilds']],enemyAt:(_zone,stage)=>({name:'Enemy',trait:'standard',hp:100,icon:'imp'}),
  iconHTML:()=>'',monsterSheetHTML:()=>'',fmt:String,esc:String
 };
 vm.createContext(ctx);vm.runInContext(helper+'\n'+hunt,ctx);
 vm.runInContext('updateHuntBoard()',ctx);
 assert.deepEqual(counts,{steps:0,forecast:0});
 ctx.page='world';vm.runInContext('updateHuntBoard()',ctx);
 assert.deepEqual(counts,{steps:1,forecast:1});
 now.ms=200;vm.runInContext('updateHuntBoard()',ctx);
 assert.deepEqual(counts,{steps:1,forecast:1});
 now.ms=1300;vm.runInContext('updateHuntBoard()',ctx);
 assert.deepEqual(counts,{steps:1,forecast:2});
 ctx.s.stage=2;vm.runInContext('updateHuntBoard()',ctx);
 assert.deepEqual(counts,{steps:2,forecast:3});
});
test('worker economy evaluates the global multiplier once per income and payout pass',()=>{
 const snippet=combat.slice(combat.indexOf('const WORKER_MILESTONES='),combat.indexOf('const equippedItem='));
 const workers=Array.from({length:12},(_,i)=>['id'+i,'Worker','icon',15,1,'desc',1]);
 const s={gens:Object.fromEntries(workers.map(w=>[w[0],1])),workerTimers:{}};
 let multipliers=0,earnings=0;
 const ctx={s,workers,Math,Number,workerUnlocked:()=>true,
  multiplier:()=>{multipliers++;return 1;},
  activeBuild:()=>0,activeSkill:()=>0,soulfactor:()=>1,skillfactor:()=>1,gain:n=>{earnings+=n;}
 };
 vm.createContext(ctx);vm.runInContext(snippet,ctx);
 assert.equal(vm.runInContext('income()',ctx),12);
 assert.equal(multipliers,1);
 multipliers=0;
 vm.runInContext('accrueWorkerEarnings(1)',ctx);
 assert.equal(multipliers,1);
 assert.equal(earnings,12);
});
test('avatar edits save on blur or pagehide rather than after each keypress',()=>{
 const inputHandler=views.split('\n').find(x=>x.startsWith("root.addEventListener('input',e=>"));
 const blurHandler=views.split('\n').find(x=>x.startsWith("root.addEventListener('focusout',e=>"));
 assert.ok(inputHandler&&!inputHandler.includes('save()'));
 assert.ok(blurHandler&&blurHandler.includes('save()'));
});
