'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('battle arena fits desktop game height without a viewport-sized minimum',()=>{
 const css=read('emberforge-battle.css');
 assert.match(css,/Desktop battle viewport fit/);
 assert.match(css,/height:clamp\(300px,calc\(100dvh - 255px\),720px\)/);
 assert.match(css,/min-height:0!important/);
 assert.match(css,/max-height:calc\(100dvh - 190px\)/);
 assert.match(css,/\.efb-actions\{max-width:520px\}/);
});
test('exploration shows compact realm navigation while retaining travel controls',()=>{
 const css=read('styles/world.css'),views=read('ui/views.js'),html=read('game.html');
 assert.match(views,/classList\.toggle\('battle-in-realm',!home\)/);
 assert.match(css,/\.battle-in-realm \.caladryn-header/);
 assert.match(css,/\.battle-in-realm \.caladryn-battle-interior\{/);
 assert.match(css,/\.efb-redesigned>\.space:first-of-type\{display:none!important\}/);
 assert.match(html,/id="ef4-maptoggle" data-map-toggle/);
 assert.match(html,/id="ef4-returnhome" data-return-home/);
 assert.match(html,/id="ef4-battlescene"/);
});
test('battle skin is cache-busted and gameplay controls remain engine-driven',()=>{
 const skin=read('emberforge-battle.js'),index=read('index.html');
 assert.match(skin,/emberforge-battle\.css\?v=16/);
 assert.match(index,/emberforge-battle\.js\?v=41/);
 assert.match(skin,/api\.setAutoAttack\(/);
});
