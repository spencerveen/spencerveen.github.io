'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const classes=()=>{
 const names=new Set();
 return {toggle:(key,on)=>on?names.add(key):names.delete(key),contains:key=>names.has(key)};
};
function harness(startWidth=1600,stored=null,blocked=false){
 const hud=read('emberforge-hud.js');
 const from=hud.indexOf('function setupSidebar(doc,root){'),to=hud.indexOf('function mount(frame){',from);
 assert.ok(from>=0&&to>from,'Sidebar controller should be independently testable');
 const code=hud.slice(from,to);
 const changes={},listeners={},attributes={},toggleClicks=[],mem={};
 if(stored)mem['emberforge-sidebar-mode-v1']=stored;
 const toggle={
  attributes,disabled:false,title:'',
  setAttribute(name,value){attributes[name]=value},
  addEventListener(name,fn){toggleClicks.push({name,fn})},
  querySelector(sel){assert.equal(sel,'.nav-toggle-label');return label}
 };
 const label={textContent:''};
 const nav={
  dataset:{},
  querySelector(sel){return sel==='#ef4-navtoggle'?toggle:null}
 };
 const layout={classList:classes()};
 const root={clientWidth:startWidth,querySelector(sel){return sel==='#ef4-nav'?nav:sel==='.layout'?layout:null}};
 const win={
  innerWidth:startWidth,
  localStorage:{
   getItem(k){if(blocked)throw Error('Storage disabled');return mem[k]||null},
   setItem(k,v){if(blocked)throw Error('Storage disabled');mem[k]=v}
  },
  addEventListener(name,fn){listeners[name]=fn}
 };
 const doc={defaultView:win};
 vm.runInNewContext(code+'setupSidebar(doc,root);',{doc,root},{timeout:1000});
 function click(){
  assert.equal(toggleClicks.length,1);
  let stopped=false,prevented=false;
  toggleClicks[0].fn({preventDefault(){prevented=true},stopPropagation(){stopped=true}});
  assert.ok(stopped&&prevented,'toggle does not bubble into game engine');
 }
 function resize(width){win.innerWidth=width;root.clientWidth=width;listeners.resize();}
 return {nav,layout,toggle,label,mem,click,resize,attributes,listeners};
}

test('wide desktop uses expanded fantasy navigation by default',()=>{
 const h=harness(1600);
 assert.equal(h.layout.classList.contains('nav-expanded'),true);
 assert.equal(h.layout.classList.contains('nav-collapsed'),false);
 assert.equal(h.toggle.disabled,false);
 assert.equal(h.attributes['aria-expanded'],'true');
 assert.equal(h.label.textContent,'Collapse menu');
});

test('medium windows use icon-only sidebar and can expand manually',()=>{
 const h=harness(1000);
 assert.equal(h.layout.classList.contains('nav-collapsed'),true);
 assert.equal(h.attributes['aria-label'],'Expand navigation');
 h.click();
 assert.equal(h.layout.classList.contains('nav-expanded'),true);
 assert.equal(h.mem['emberforge-sidebar-mode-v1'],'expanded');
 h.click();
 assert.equal(h.layout.classList.contains('nav-collapsed'),true);
 assert.equal(h.mem['emberforge-sidebar-mode-v1'],'collapsed');
});

test('manual preference persists across resize; mobile always uses one row',()=>{
 const h=harness(1530,'collapsed');
 assert.equal(h.layout.classList.contains('nav-collapsed'),true);
 h.resize(390);
 assert.equal(h.layout.classList.contains('nav-mobile'),true);
 assert.equal(h.layout.classList.contains('nav-collapsed'),false);
 assert.equal(h.toggle.disabled,true);
 const old=h.mem['emberforge-sidebar-mode-v1'];
 h.click();
 assert.equal(h.mem['emberforge-sidebar-mode-v1'],old,'mobile does not change preference');
 h.resize(1500);
 assert.equal(h.layout.classList.contains('nav-collapsed'),true,'restores preference on desktop');
 h.click();
 assert.equal(h.layout.classList.contains('nav-expanded'),true);
 h.resize(820);
 assert.equal(h.layout.classList.contains('nav-expanded'),true,'manual expanded state overrides auto layout');
});

test('blocked localStorage does not break nav initialization, resizing, or toggling',()=>{
 const h=harness(900,null,true);
 assert.equal(h.layout.classList.contains('nav-collapsed'),true);
 assert.doesNotThrow(()=>h.click());
 assert.equal(h.layout.classList.contains('nav-expanded'),true);
 h.resize(540);
 assert.equal(h.layout.classList.contains('nav-mobile'),true);
});

test('sidebar keeps six original clickable page buttons and hides only their visual labels',()=>{
 const html=read('game.html'),css=read('emberforge-sidebar.css'),hud=read('emberforge-hud.js');
 const nav=html.slice(html.indexOf('<nav class="sidebar"'),html.indexOf('</nav>')+6);
 const tabs=['forge','workers','upgrades','gear','world','mastery'];
 for(const p of tabs)assert.match(nav,new RegExp('data-page="'+p+'"'));
 assert.equal((nav.match(/data-page="/g)||[]).length,6);
 assert.equal((nav.match(/class="nav-label"/g)||[]).length,6);
 assert.match(nav,/id="ef4-navtoggle"/);
 assert.match(nav,/aria-label="World"/);
 assert.match(css,/#ef4 \.layout\.nav-collapsed\{grid-template-columns:68px minmax\(0,1fr\)/);
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(css,/#ef4 \.layout \.sidebar \.nav-label\{display:none!important\}/);
 assert.match(css,/#ef4 \.layout \.sidebar\{[^\n]*display:grid;/);
 assert.match(hud,/setupSidebar\(doc,root\);/);
 assert.match(hud,/sideSheet\.href="\.\/emberforge-sidebar\.css\?v=2"/);
});
