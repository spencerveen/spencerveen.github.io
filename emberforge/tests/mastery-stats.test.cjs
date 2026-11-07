'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('game.html'),views=read('ui/views.js'),css=read('styles/mastery.css');
test('Mastery moves permanent counters into Statistics instead of large header cards',()=>{
 assert.match(html,/data-sub="stats"/);
 assert.doesNotMatch(html,/class="efm-legacy-strip"/);
 assert.doesNotMatch(html,/id="ef4-masterybosses"|id="ef4-masterysp"|id="ef4-masterysouls"|id="ef4-legacy"/);
 assert.match(views,/if\(sub==='stats'\)/);
 assert.match(views,/Guardians vanquished/);
 assert.match(views,/Unspent talent/);
 assert.match(views,/Soulfire/);
 assert.match(views,/Kingdom building levels/);
 assert.match(css,/\.efm-stats-grid/);
});
test('Ascension retains its altar but does not duplicate the World Map unlock roadmap',()=>{
 assert.match(views,/if\(sub==='ascend'\)/);
 assert.match(views,/data-ascend="1"/);
 assert.doesNotMatch(views,/Realm unlock roadmap|efm-realm-roadmap/);
 assert.match(html,/data-sub="ascend"/);
});
