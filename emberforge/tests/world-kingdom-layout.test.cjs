'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('game.html'),css=read('styles/world.css'),views=read('ui/views.js');
test('the world atlas is a modal overlay rather than a scrolling section above the Kingdom',()=>{
 assert.match(html,/id="ef4-mapregion" role="dialog" aria-modal="true"/);
 assert.match(html,/class="caladryn-atlas-head"/);
 assert.match(html,/class="btn btn-quiet caladryn-atlas-close"[^>]+data-map-toggle/);
 assert.match(css,/#ef4 \.caladryn-map-region\{\s*position:fixed;inset:0;z-index:850/);
 assert.match(css,/#ef4 \.caladryn-map-region\[hidden\]\{display:none!important\}/);
 assert.match(views,/let caladrynMapCollapsed=true;/);
});
test('world map and interactive Kingdom use a consistent desktop width',()=>{
 assert.match(css,/#ef4 \.caladryn-header\{width:min\(100%,1560px/);
 assert.match(css,/#ef4 \.efk-hub\{width:min\(100%,1560px/);
 assert.match(css,/#ef4 \.efk-vista-frame\.efk-kingdom-interactive\{width:100%;margin-inline:0\}/);
 assert.match(css,/#ef4 \.caladryn-map-region \.caladryn-map-viewport\{/);
 assert.match(css, /calc\(\(100dvh - 195px\)\*1672\/941\)/);
});
test('Kingdom offers direct world travel while retaining individual building hotspots',()=>{
 const kingdom=html.slice(html.indexOf('id="ef4-kingdominterior"'),html.indexOf('<section class="page" data-view="mastery"'));
 assert.match(kingdom,/class="btn btn-quiet efk-world-launch"[^>]+data-map-toggle/);
 assert.match(kingdom,/data-kingdom-point="mine"/);
 assert.match(kingdom,/data-kingdom-point="merchant"/);
 assert.match(views,/openKingdomLocation\(b\.dataset\.kingdomPoint\)/);
 assert.match(views,/if\(e\.key==='Escape'&&!caladrynMapCollapsed\)/);
 assert.match(views,/if\(e\.target\.id==='ef4-mapregion'\)/);
});
