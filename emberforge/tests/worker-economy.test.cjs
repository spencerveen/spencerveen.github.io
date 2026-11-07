'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const combat=read('systems/combat.js');
const economics=combat.slice(combat.indexOf('const WORKER_MILESTONES='),combat.indexOf('const equippedItem='));
const pricing=combat.slice(combat.indexOf('const costWorker='),combat.indexOf('const costBuild='));

function makeEconomy(){
 const workers=[
  ['spark','Spark Sprites','sprite',15,.09,'Gather embers',1],
  ['alchemist','Ash Alchemists','alchemist',65000,1000,'Distill fire',5]
 ];
 const s={gens:{spark:1,alchemist:1},workerTimers:{},ember:0};
 const scope={s,workers,Math,Number,
  workerUnlocked:()=>true,
  multiplier:()=>1,activeBuild:()=>0,activeSkill:()=>0,
  soulfactor:()=>1,skillfactor:()=>1,
  gain:n=>{s.ember+=n;}
 };
 vm.createContext(scope);
 vm.runInContext(economics+'\n'+pricing,scope);
 return {s,workers,calc:expr=>vm.runInContext(expr,scope)};
}
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,actual+' != '+expected);

test('worker output is the average rate but timed workers pay only on a completed interval',()=>{
 const {s,calc}=makeEconomy();
 near(calc('income()'),200.09);
 near(calc('accrueWorkerEarnings(4)'),.36);
 near(s.ember,.36);
 near(s.workerTimers.alchemist,4);
 near(calc('accrueWorkerEarnings(1)'),1000.09);
 near(s.ember,1000.45);
 near(s.workerTimers.alchemist,0);
 near(calc('accrueWorkerEarnings(10,.5)'),1000.45);
 near(s.workerTimers.alchemist,0);
});
test('batch timers cannot accumulate on an unowned worker and restart on its next hire',()=>{
 const {s,calc}=makeEconomy();
 calc('accrueWorkerEarnings(4)');
 s.gens.alchemist=0;
 calc('accrueWorkerEarnings(10)');
 assert.equal(s.workerTimers.alchemist,undefined);
 s.gens.alchemist=1;
 near(calc('accrueWorkerEarnings(4)'),.36);
 near(calc('accrueWorkerEarnings(1)'),1000.09);
});
test('worker milestones are cumulative one-percent bonuses',()=>{
 const {s,calc}=makeEconomy();
 for(const [owned,mult] of [[9,1],[10,1.01],[25,1.02],[50,1.03],[100,1.04],[199,1.04],[200,1.05],[400,1.06],[800,1.07],[1000,1.07],[1600,1.08],[3200,1.09]]){
  s.gens.alchemist=owned;
  near(calc('workerProduction(workers[1])'),owned*200*mult);
 }
});
test('the next threshold continues doubling after 100 workers',()=>{
 const {calc}=makeEconomy();
 for(const [count,next] of [[0,10],[10,25],[24,25],[25,50],[50,100],[99,100],[100,200],[199,200],[200,400],[999,1600],[1600,3200]]){
  assert.equal(calc('nextWorkerMilestone('+count+')'),next);
 }
});
test('worker price growth is 33% and Max sums actual incremental prices',()=>{
 const {s,calc}=makeEconomy();
 s.gens.spark=0;
 assert.equal(calc('costWorker(workers[0],1).price'),15);
 s.gens.spark=1;
 assert.equal(calc('costWorker(workers[0],1).price'),20);
 s.gens.spark=2;
 assert.equal(calc('costWorker(workers[0],1).price'),27);
 s.gens.spark=0;s.ember=150;
 const affordable=calc('costWorker(workers[0],"max")');
 assert.equal(affordable.count,5);
 assert.equal(affordable.price,145);
});
test('offline, visibility, and save paths use the batch scheduler',()=>{
 const loop=read('core/loop.js'),formatting=read('core/formatting.js'),defs=read('data/definitions.js'),views=read('ui/views.js');
 assert.match(loop,/accrueWorkerEarnings\(elapsed\)/);
 assert.match(loop,/accrueWorkerEarnings\(offline,\.5\)/);
 assert.match(loop,/accrueWorkerEarnings\(secs,\.5\)/);
 assert.match(loop,/document\.hidden\)return/);
 assert.doesNotMatch(loop,/gain\(income\(\)\*dt\)/);
 assert.match(defs,/version:13,workerTimers:\{\},workerLifetimeHires:/);
 assert.match(formatting,/x\.workerTimers=\{\}/);
 assert.match(formatting,/x\.workerLifetimeHires=Object\.fromEntries/);
 assert.match(views,/data-worker-countdown/);
});
