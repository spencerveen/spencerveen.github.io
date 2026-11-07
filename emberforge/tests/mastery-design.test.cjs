'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('game.html'),views=read('ui/views.js'),css=read('styles/mastery.css');
test('Hall of Legacies retains all five functional Mastery chambers',()=>{
 assert.match(html,/class="page efm-mastery" data-view="mastery"/);
 assert.match(html,/id="ef4-subnav"/);
 for(const tab of ['skills','quests','achievements','bestiary','ascend'])
  assert.match(html,new RegExp('data-sub="'+tab+'"'));
 assert.match(html,/id="ef4-mastercontent"/);
 assert.match(html,/styles\/mastery\.css\?v=\d+/);
});
test('Mastery statistics live in the dedicated chamber, not an oversized header strip',()=>{
 assert.match(html,/data-sub="stats"/);
 assert.doesNotMatch(html,/class="efm-legacy-strip"/);
 assert.match(views,/if\(sub==='stats'\)/);
 assert.match(views,/Guardians vanquished/);
 assert.match(views,/Unspent talent/);
 assert.match(views,/Soulfire/);
 assert.match(css,/\.efm-stats-grid/);
});
test('specialization paths use existing six skills, level caps and purchase actions',()=>{
 assert.match(views,/id:'forge',name:'The Emberforge'/);
 assert.match(views,/id:'war',name:'The Warpath'/);
 for(const name of ['harvest','industry','aura','blade','fortune','veteran'])
  assert.match(views,new RegExp("'"+name+"'"));
 assert.match(views,/shopButton\('skill',id,0,maxed\|\|!affordable/);
 assert.match(views,/const perc=Math\.round\(100\*Math\.min\(rank,cap\)/);
 assert.match(views,/button\.setAttribute\('aria-pressed',String\(active\)\)/);
});
test('contracts, triumphs, realm bestiary and ascension keep their game actions',()=>{
 assert.match(views,/class="efm-contract-list"/);
 assert.match(views,/shopButton\('quest',q\[0\]/);
 assert.match(views,/data-bounty="1"/);
 assert.match(views,/class="efm-trophy-grid"/);
 assert.match(views,/efm-realm-collection/);
 assert.match(views,/encounterBook\(\)/);
 assert.match(views,/class="card efm-altar"/);
 assert.match(views,/data-ascend="1"/);
});
test('dark fantasy styling adapts to smaller screens',()=>{
 assert.match(css,/\.efm-hero\{/);
 assert.match(css,/\.efm-branches\{/);
 assert.match(css,/\.efm-realm-grid\{/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/@media\(max-width:560px\)/);
 assert.doesNotMatch(css,/font:750 12px\/1\.3 inherit/);
});


test('Mastery header displays cinematic dragon artwork without redundant subtitle and star badge',()=>{
 assert.match(html,/THE HALL OF LEGACIES/);
 assert.match(html,/The Master&#39;s Chronicle|The Master's Chronicle/);
 assert.doesNotMatch(html,/Every victory leaves its mark/);
 assert.doesNotMatch(html,/efm-hero-ornament|efm-hero-emblem/);
 assert.match(css,/url\('\.\.\/art\/mastery-dragon-banner\.avif'\)/);
 const asset=fs.readFileSync(path.join(__dirname,'..','art','mastery-dragon-banner.avif'));
 assert.ok(asset.length>25000,'Mastery dragon image should contain the optimized artwork');
 assert.equal(asset.toString('ascii',4,12),'ftypavif');
});
