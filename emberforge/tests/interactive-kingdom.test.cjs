'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('game.html'),views=read('ui/views.js'),css=read('styles/world.css');
const kingdom=html.slice(html.indexOf('id="ef4-kingdominterior"'),html.indexOf('<section class="page" data-view="mastery"'));
const places=['mine','barracks','library','roost','watchtower','vault','merchant'];
test('first Kingdom scene ships its own dark fantasy visual asset',()=>{
 const image=fs.readFileSync(path.join(__dirname,'../art/frontier-settlement.avif'));
 assert.equal(image.toString('ascii',4,8),'ftyp');
 assert.equal(image.toString('ascii',8,12),'avif');
 assert.ok(image.length>40000);
 assert.match(css,/frontier-settlement\.avif/);
 assert.match(views,/classList\.toggle\('efk-frontier',earned===0\)/);
});
test('all six building areas and merchant have interactive, labeled hotspots',()=>{
 for(const point of places){
  assert.match(kingdom,new RegExp('data-kingdom-point="'+point+'"'));
  assert.match(css,new RegExp('\\.efk-point-'+point+'\\{'));
 }
 assert.equal((kingdom.match(/data-kingdom-point="/g)||[]).length,7);
 assert.match(views,/openKingdomLocation\(b\.dataset\.kingdomPoint\)/);
});
test('the Kingdom uses one compact dialog, not permanently expanded bubble cards',()=>{
 assert.match(kingdom,/id="ef4-kingdomdialog" hidden/);
 assert.match(kingdom,/id="ef4-buildlist"/);
 assert.match(kingdom,/id="ef4-merchantstock"/);
 assert.match(kingdom,/id="ef4-merchantlist"/);
 assert.doesNotMatch(kingdom,/class="efk-hub-nav"/);
 assert.match(views,/const selected=buildings\.find\(b=>b\[0\]===kingdomPoint\)/);
 assert.match(views,/selected\?\(\(\)=>/);
 assert.match(views,/renderKingdomMerchant\(\)/);
 assert.match(views,/closeKingdomLocation\(\)/);
});
test('scene dialogs are closeable via button, backdrop and Escape',()=>{
 assert.match(kingdom,/data-kingdom-close/);
 assert.match(views,/e\.target\.classList\?\.contains\('efk-dialog-scrim'\)/);
 assert.match(views,/e\.key==='Escape'/);
});
