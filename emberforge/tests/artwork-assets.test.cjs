'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const monsterSource=read('data/monster-portraits.js');
const kingdomSource=read('data/kingdom-vistas.js');
const monsters=vm.runInNewContext(monsterSource+'\nMONSTER_PORTRAITS;');
const art=vm.runInNewContext(kingdomSource+'\n({KINGDOM_VISTAS, ICON_DATA});');

function assertWebpFile(url){
 assert.match(url,/^\.\/art\/(?:monsters|kingdom|icons)\/[a-z0-9-]+\.webp$/);
 const file=path.join(base,url.slice(2)),bytes=fs.readFileSync(file);
 assert.equal(bytes.toString('ascii',0,4),'RIFF',url);
 assert.equal(bytes.toString('ascii',8,12),'WEBP',url);
 assert.ok(bytes.length>1000,url+' should be an actual artwork asset');
}
test('monster portraits retain six realm rows and nine stage entries each',()=>{
 assert.equal(monsters.length,6);
 const names=new Set();
 for(let zone=0;zone<6;zone++){
  assert.equal(monsters[zone].length,9);
  for(let stage=1;stage<=9;stage++){
   const image=monsters[zone][stage-1];
   assert.equal(image,`./art/monsters/realm-${zone+1}-stage-${stage}.webp`);
   assertWebpFile(image);
   names.add(image);
  }
 }
 assert.equal(names.size,54);
});
test('kingdom vistas and the full icon index point at individual cacheable WebP files',()=>{
 assert.equal(art.KINGDOM_VISTAS.length,6);
 const urls=new Set();
 for(let i=0;i<6;i++){
  const image=art.KINGDOM_VISTAS[i];
  assert.equal(image,`./art/kingdom/vista-${i}.webp`);
  assertWebpFile(image);
  urls.add(image);
 }
 const icons=Object.entries(art.ICON_DATA);
 assert.equal(icons.length,52);
 for(const [name,url] of icons){
  assert.equal(url,`./art/icons/${name}.webp`);
  assertWebpFile(url);
  assert.ok(!urls.has(url),'asset URL must be unique');
  urls.add(url);
 }
 assert.equal(urls.size,58);
});
test('legacy artwork JavaScript bundles contain no inline image payloads',()=>{
 assert.doesNotMatch(monsterSource,/data:image\//);
 assert.doesNotMatch(kingdomSource,/data:image\//);
 assert.ok(monsterSource.length<5000);
 assert.ok(kingdomSource.length<20000);
});
test('kingdom backgrounds invalidate their cache when file URL changes',()=>{
 const start=kingdomSource.indexOf('function setIllustratedBackground(');
 const end=kingdomSource.indexOf('\nfunction rollBattleBackground',start);
 assert.ok(start>=0&&end>start);
 const node={dataset:{},style:{}};
 const context={$:()=>node};vm.createContext(context);
 vm.runInContext(kingdomSource.slice(start,end),context);
 vm.runInContext("setIllustratedBackground('kingdombg','./art/kingdom/vista-0.webp','cover','center')",context);
 assert.equal(node.style.backgroundImage,'url(./art/kingdom/vista-0.webp)');
 vm.runInContext("setIllustratedBackground('kingdombg','./art/kingdom/vista-1.webp','cover','center')",context);
 assert.equal(node.style.backgroundImage,'url(./art/kingdom/vista-1.webp)');
});
test('hunt thumbnails load lazily while active enemy art remains eager',()=>{
 const formatting=read('core/formatting.js');
 const start=formatting.indexOf('function monsterSheetHTML(');
 const end=formatting.indexOf('\n\nfunction clean(',start);
 assert.ok(start>=0&&end>start);
 const context={MONSTER_PORTRAITS:monsters,iconHTML:()=>''};
 vm.createContext(context);
 vm.runInContext(formatting.slice(start,end),context);
 assert.match(vm.runInContext("monsterSheetHTML(0,1,'hunt')",context),/loading="lazy"/);
 assert.match(vm.runInContext("monsterSheetHTML(0,1,'hero')",context),/loading="eager"/);
});
