/* Emberforge Battle v1 — presentation-only, original engine owns combat and saves. */
(function(){
"use strict";
function mount(frame){
 var doc;try{doc=frame.contentDocument}catch(_){return}
 if(!doc)return;
 var root=doc.getElementById("ef4"),battle=root&&root.querySelector('[data-view="battle"]');
 if(!battle||battle.dataset.efBattleSkin==="1")return;
 var master=doc.getElementById("ef4-mastercontent");
 if(!master)return;
 var s=doc.createElement("link");s.rel="stylesheet";s.href="./emberforge-battle.css?v=1";doc.head.appendChild(s);
 var norm=function(t){return (t||"").replace(/\s+/g," ").trim()};
 var txt=function(el){return norm(el&&el.textContent)};
 var elements=function(base,selector){return Array.from(base.querySelectorAll(selector))};
 var cards=function(base){return elements(base,".card,.panel,section,article")};
 function smallCard(label,scope){
   var choices=cards(scope).filter(function(el){return txt(el).includes(label)&&el.querySelectorAll(".card,.panel,section,article").length<7});
   choices.sort(function(a,b){return a.querySelectorAll("*").length-b.querySelectorAll("*").length});
   return choices[0]||null;
 }
 function findButton(scope,re){
   return elements(scope,"button,[role=button]").find(function(el){return re.test(txt(el))})||null;
 }
 function proxied(button,label,cls){
   var el=doc.createElement("button");el.type="button";el.className=cls||"efb-action";el.textContent=label;
   el.addEventListener("click",function(){if(button&&!button.disabled)button.click()});
   return el;
 }
 var board=smallCard("HUNT BOARD",battle);
 if(!board)board=elements(battle,"*").find(function(x){return x.children.length===0 && /HUNT BOARD/.test(txt(x))})?.closest(".card,.panel")||null;
 if(!board)return; // fail closed rather than hiding any game UI without navigation
 var stageButtons=elements(board,"button,[role=button]").filter(function(x){return /#\s*\d+|BOSS|Cinder|Soot|Skeleton|Magma|Revenant|Hound|Imp|Scarab|Marauder/i.test(txt(x))});
 if(stageButtons.length<2)return;
 // The stage items are identified once; leave engine-managed listeners intact.
 var training=smallCard("Combat training",battle);
 var report=smallCard("Battle report",battle);
 var enemy=smallCard("CURRENT ENEMY",battle);
 if(!enemy)enemy=elements(battle,"*").find(function(x){return x.children.length===0 && /CURRENT ENEMY/i.test(txt(x))})?.closest(".card,.panel")||null;
 if(!enemy)return;
 var scene=doc.getElementById("ef4-battlescene")||null;
 if(!scene){
   var candidates=elements(battle,"img,div").filter(function(el){
     if(el.closest(".efb-shell")||el.closest("button"))return false;
     var r=el.getBoundingClientRect();if(r.width<250||r.height<180)return false;
     var style=doc.defaultView.getComputedStyle(el);
     return (el.tagName==="IMG"||/url\(/.test(style.backgroundImage))&&
       (el.closest(".card,.panel")!==board&&el.closest(".card,.panel")!==enemy);
   });
   candidates.sort(function(a,b){return b.getBoundingClientRect().width*b.getBoundingClientRect().height-a.getBoundingClientRect().width*a.getBoundingClientRect().height});
   scene=candidates[0]?.closest(".card,.panel")||candidates[0]||null;
 }
 if(!scene)return;
 var sceneHost=scene.closest(".card,.panel")||scene;
 if(sceneHost===battle||sceneHost.contains(enemy)||sceneHost.contains(board))return;
 var shell=doc.createElement("section");shell.className="efb-shell";
 shell.innerHTML='<div class="efb-stage-top"><div class="efb-location"><span class="efb-eyebrow">THE BATTLEGROUND</span><strong class="efb-realm">Ashen Wilds</strong><span class="efb-stage">Stage</span></div><div class="efb-foe"><strong class="efb-name">Current enemy</strong><span class="efb-reward"></span><div class="efb-health" role="progressbar" aria-label="Enemy health" aria-valuemin="0" aria-valuemax="100"><div class="efb-health-fill"></div></div><small class="efb-hp-text"></small></div></div><button type="button" class="efb-arrow efb-prev" aria-label="Previous monster">‹</button><button type="button" class="efb-arrow efb-next" aria-label="Next monster">›</button><div class="efb-bottom"><div class="efb-status" aria-live="polite"></div><div class="efb-actions"></div></div>';
 sceneHost.parentNode.insertBefore(shell,sceneHost);
 shell.insertBefore(sceneHost,shell.firstChild);
 var attacks=findButton(enemy,/^Strike$/i),autofarm=findButton(enemy,/Farm Target|Auto.?Farm|Auto Attack/i),heal=findButton(enemy,/^Heal\b/i),retreat=findButton(enemy,/^Retreat$/i);
 var actionArea=shell.querySelector(".efb-actions");
 if(autofarm)actionArea.appendChild(proxied(autofarm,"Auto Attack","efb-action efb-attack"));
 if(heal)actionArea.appendChild(proxied(heal,"Heal","efb-action efb-heal"));
 if(retreat)actionArea.appendChild(proxied(retreat,"Retreat","efb-action efb-retreat"));
 if(!actionArea.children.length)return;
 var prev=shell.querySelector(".efb-prev"),next=shell.querySelector(".efb-next");
 var selected=0;
 function getStages(){return stageButtons.filter(function(x){return x.isConnected})}
 function nav(dir){
   var stages=getStages();var candidate=stages[selected+dir];
   if(candidate&&!candidate.disabled){candidate.click();selected+=dir;refresh();}
 }
 prev.addEventListener("click",function(){nav(-1)});
 next.addEventListener("click",function(){nav(1)});
 function refresh(){
   var stages=getStages();
   var picked=stages.findIndex(function(el){return el.matches('[aria-pressed=true],[aria-selected=true],.active,.selected')||/current/i.test(el.className)});
   if(picked<0){
     var stageText=txt(battle.querySelector(".space")?.parentElement||battle).match(/Stage\s*(\d+)\s*\/\s*(\d+)/i);
     if(stageText)picked=Number(stageText[1])-1;
   }
   if(picked>=0&&picked<stages.length)selected=picked;
   prev.disabled=selected<=0;
   next.disabled=selected>=stages.length-1||!!stages[selected+1]?.disabled;
   var stage=stages[selected],stageName=txt(stage).replace(/(?:✓\s*Farm|New|#\s*\d+|BOSS)/gi,"").trim();
   shell.querySelector(".efb-stage").textContent=(selected===stages.length-1?"Boss encounter":"Stage "+(selected+1)+" / "+stages.length);
   var headerText=txt(battle).match(/(Ashen Wilds|Whispering Forest|[A-Z][a-z]+ (?:Wastes|Wilds|Ruins|Citadel|Forest|Depths|Keep))/);
   if(headerText)shell.querySelector(".efb-realm").textContent=headerText[1];
   var enText=txt(enemy);
   var name=enText.match(/CURRENT ENEMY\s*(?:\+\S+\s*Ember\s*)?([^\n]*?)(?:\s+\d[\d,.KMB]*\s*\/\s*\d[\d,.KMB]*\s*HP|\s+Enemy hit|\s+\d+\s*\/\s*10)/i);
   var title=elements(enemy,"h1,h2,h3,h4,strong").map(txt).find(function(t){return t&&t!=="CURRENT ENEMY"&&!/^[\d+]/.test(t)&&!/Ember|XP|HP|Attack/i.test(t)});
   shell.querySelector(".efb-name").textContent=title||name?.[1]?.trim()||stageName||"Current enemy";
   var hp=enText.match(/([\d,.]+[KMB]?)\s*\/\s*([\d,.]+[KMB]?)\s*HP/i);
   shell.querySelector(".efb-hp-text").textContent=hp?hp[0]:"";
   var originalBars=elements(enemy,'[role=progressbar], [id$="enemyhpbar"], [class*="hpbar"], .bar > div');
   var bar=originalBars.find(function(x){return /enemy|hp/i.test(x.id+" "+x.className+" "+x.getAttribute("aria-label"))})||originalBars[0];
   var percent=bar?parseFloat(bar.style.width):NaN;
   if(!Number.isFinite(percent)&&hp){
     var num=function(s){var m=s.match(/([\d,.]+)\s*([KMB])?/i);return m?parseFloat(m[1].replace(/,/g,""))*({K:1e3,M:1e6,B:1e9}[m[2]]||1):NaN};
     percent=100*num(hp[1])/num(hp[2]);
   }
   if(Number.isFinite(percent)){percent=Math.min(100,Math.max(0,percent));shell.querySelector(".efb-health-fill").style.width=percent+"%";shell.querySelector(".efb-health").setAttribute("aria-valuenow",String(Math.round(percent)))}
   var reward=enText.match(/\+\s*[\d,.]+[KMB]?\s*Ember/i);shell.querySelector(".efb-reward").textContent=reward?reward[0]:"";
   [autofarm,heal,retreat].forEach(function(origin,i){var control=actionArea.children[i];if(origin&&control){control.disabled=origin.disabled;control.textContent=i===0?"Auto Attack":(i===1?(txt(origin)||"Heal"):"Retreat")}});
 }
 // Original interface remains connected so combat, unlocks and saves work.
 board.classList.add("efb-source-hidden");
 enemy.classList.add("efb-source-hidden");
 if(training)training.classList.add("efb-source-hidden");
 if(report)report.classList.add("efb-source-hidden");
 battle.classList.add("efb-redesigned");battle.dataset.efBattleSkin="1";
 // Hide old title and redundant attack chip without affecting live nodes.
 var battleMetric=battle.querySelector(".ef-hud-context");if(battleMetric)battleMetric.classList.add("efb-source-hidden");
 var top=battle.querySelector(".space");if(top)top.classList.add("efb-source-hidden");
 // Training and statistics get their own tabs in Mastery. Clone instead of move,
 // preserving original listener scopes and delegating action buttons.
 var menu=doc.createElement("div");menu.className="efb-master-tabs";
 menu.innerHTML='<button type="button" data-efb-tab="original" class="active">Mastery</button><button type="button" data-efb-tab="training">Training</button><button type="button" data-efb-tab="statistics">Statistics</button>';
 var content=doc.createElement("div");content.className="efb-master-portals";
 var sections={};
 ["training","statistics"].forEach(function(key){var panel=doc.createElement("section");panel.className="efb-master-portal";panel.dataset.efbPanel=key;content.appendChild(panel);sections[key]=panel});
 master.insertBefore(menu,master.firstChild);master.insertBefore(content,menu.nextSibling);
 var original=Array.from(master.children).filter(function(x){return x!==menu&&x!==content});
 function tab(which){elements(menu,"button").forEach(function(b){b.classList.toggle("active",b.dataset.efbTab===which)});
   original.forEach(function(el){el.style.display=which==="original"?"": "none"});
   Object.keys(sections).forEach(function(k){sections[k].style.display=k===which?"block":"none"});
 }
 menu.addEventListener("click",function(e){var b=e.target.closest("button[data-efb-tab]");if(b)tab(b.dataset.efbTab)});
 function clonePanel(source,target){
   if(!source||!target)return;
   // Preserve local form state by mapping clone clicks to the real source controls.
   var active=doc.activeElement;var clone=source.cloneNode(true);
   clone.classList.remove("efb-source-hidden");
   clone.removeAttribute("id");
   elements(clone,"[id]").forEach(function(n){n.removeAttribute("id")});
   var real=elements(source,"button");
   elements(clone,"button").forEach(function(btn,i){
     var orig=real[i];btn.disabled=orig?orig.disabled:true;
     btn.addEventListener("click",function(){if(orig&&!orig.disabled){orig.click();setTimeout(refreshMaster,50)}});
   });
   target.replaceChildren(clone);
 }
 function refreshMaster(){
   // Refresh only when Mastery is visible, not every combat tick.
   var activeTab=menu.querySelector(".active")?.dataset.efbTab;
   if(activeTab==="training")clonePanel(training,sections.training);
   if(activeTab==="statistics")clonePanel(report,sections.statistics);
 }
 menu.addEventListener("click",function(){refreshMaster()});
 tab("original");refresh();
 var timer=doc.defaultView.setInterval(function(){
   if(!shell.isConnected){doc.defaultView.clearInterval(timer);return}
   refresh();
   if(root.querySelector('[data-view="mastery"].active,[data-view="master"].active'))refreshMaster();
 },750);
}
window.EmberforgeBattle={mount:mount};
})();