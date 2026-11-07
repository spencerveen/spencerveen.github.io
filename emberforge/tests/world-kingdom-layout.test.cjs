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


test('widescreen uses playable scene width while preserving hotspot geometry',()=>{
 assert.match(css,/Wide desktop Kingdom/);
 assert.match(css,/#ef4 \.efk-vista-frame\.efk-kingdom-interactive::before\{/);
 assert.match(css,/url\('\.\.\/art\/frontier-settlement\.avif'\)/);
 assert.match(css,/pointer-events:none;/);
 assert.match(css,/\.efk-vista-frame\.efk-kingdom-interactive>\.kingdomscene\{/);
 assert.match(css,/aspect-ratio:1672 \/ 941!important/);
 assert.match(css,/width:min\(calc\(100% - 64px\),1560px\)/);
 assert.match(html,/data-kingdom-point="merchant"/);
});


test('home Kingdom fits the game viewport and avoids redundant atlas heading',()=>{
 assert.match(views,/classList\.toggle\('kingdom-at-home',home\)/);
 assert.match(css,/#ef4 \.kingdom-at-home \.caladryn-header\{display:none!important\}/);
 assert.match(css,/calc\(\(100dvh - 290px\) \* 1672 \/ 941\)/);
 assert.match(css,/aspect-ratio:1672 \/ 941!important/);
 assert.match(html,/data-kingdom-point="mine"/);
 assert.match(html,/data-kingdom-point="merchant"/);
});
test('merchant panel scrolls internally with a visible close control',()=>{
 assert.match(css,/#ef4 \.efk-hub \.efk-kingdom-dialog\{\s*position:fixed!important/);
 assert.match(css,/max-height:calc\(100dvh - 44px\)!important/);
 assert.match(css,/overscroll-behavior:contain/);
 assert.match(css,/\.efk-dialog-titlebar\{\s*position:sticky/);
 assert.match(html,/data-kingdom-close/);
});
