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
 var s=doc.createElement("link");s.rel="stylesheet";s.href="./emberforge-battle.css?v=3";doc.head.appendChild(s);
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
 // Escape the original two-column layout so the artwork fills Battle width.
 battle.insertBefore(shell,battle.firstChild);

 var actionArea=shell.querySelector(".efb-actions");
 var prev=shell.querySelector(".efb-prev"),next=shell.querySelector(".efb-next");
 var selected=0,autoOn=false;
 // The title includes a nested combat level (e.g. "YOUR ADVENTURER · COMBAT LV 46").
 // Find its smallest dedicated panel, not a leaf text node or the Battle container.
 function locateAdventurerCard(){
   var heading=elements(battle,"h1,h2,h3,h4,h5,h6,.title,.card-title,strong,span,div").find(function(el){
     if(el.closest(".efb-shell")||el.closest(".efb-source-hidden"))return false;
     var text=txt(el);
     return /YOUR ADVENTURER/i.test(text)&&text.length<110 &&
       el.querySelectorAll(".card,.panel").length===0;
   });
   if(!heading)return null;
   var panel=heading.closest(".card,.panel,article,section");
   if(panel&&panel!==battle&&!panel.contains(shell)&&!panel.contains(board)&&!panel.contains(enemy))return panel;
   return null;
 }
 var statusCard=locateAdventurerCard();
 function liveBoard(){return board.isConnected?board:smallCard("HUNT BOARD",battle)}
 function liveEnemy(){return enemy.isConnected?enemy:smallCard("CURRENT ENEMY",battle)}
 function liveStages(){var b=liveBoard();return b?elements(b,"button,[role=button]").filter(function(el){return /#\s*\d+|BOSS|Cinder|Soot|Skeleton|Magma|Revenant|Hound|Imp|Scarab|Marauder/i.test(txt(el))}):[]}
 function liveControl(re,scope){return findButton(scope||liveEnemy()||battle,re)}
 function activate(el){if(el&&el.isConnected&&!el.disabled){el.click();return true}return false}
 function farmControl(){return liveControl(/Farm Target|Auto.?Farm|Auto Attack/i,liveBoard())||liveControl(/Farm Target|Auto.?Farm|Auto Attack/i)}
 function stopControl(){return liveControl(/^Retreat$|^Stop\b/i)}
 function healControl(){return liveControl(/^Heal\b/i)}
 function strikeControl(){return liveControl(/^Strike(?:\s|$)/i)}
 // Stage-change notices from the old art layer are redundant with the new
 // realm/stage badge. Hide only the old scene labels; do not silence game logs.
 function hideSceneLabels(){
   elements(sceneHost,"span,small,div").forEach(function(el){
     if(el.closest(".efb-stage-top,.efb-bottom,.efb-arrow"))return;
     if(el.children.length>1)return;
     var label=txt(el);
     if(/^(?:BOSS BATTLE|STAGE\s+\d+(?:\s*\/\s*\d+)?|(?:BOSS BATTLE|ASHEN WILDS)\s*[·•-]\s*(?:ASHEN WILDS|BOSS BATTLE))$/i.test(label)){
       el.classList.add("efb-source-label-hidden");
     }
   });
 }
 var lastStrike=0,autoTimer=null;
 function attackTick(){
   if(!autoOn||!shell.isConnected){
     if(autoTimer){doc.defaultView.clearInterval(autoTimer);autoTimer=null}
     return;
   }
   var strike=strikeControl();
   // Let the original combat engine enforce hit damage and cooldown.
   if(strike&&!strike.disabled&&Date.now()-lastStrike>=650){
     if(activate(strike))lastStrike=Date.now();
   }
 }
 function beginAuto(){
   if(autoOn)return;
   // Farming may already be active; selecting a target alone is not an On/Off
   // switch. Keep the Strike fallback active even if Farm Target is disabled.
   var farm=farmControl();
   if(farm&&!farm.disabled)activate(farm);
   autoOn=true;
   if(autoTimer)doc.defaultView.clearInterval(autoTimer);
   attackTick();
   autoTimer=doc.defaultView.setInterval(attackTick,700);
 }
 function endAuto(){
   autoOn=false;
   if(autoTimer){doc.defaultView.clearInterval(autoTimer);autoTimer=null}
   // Stop engine-managed autofarming when an explicit stop exists.
   var stop=stopControl();if(stop&&!stop.disabled)activate(stop);
 }
 var autoButton=doc.createElement("button");autoButton.type="button";autoButton.className="efb-action efb-attack";
 var healButton=doc.createElement("button");healButton.type="button";healButton.className="efb-action efb-heal";
 actionArea.append(autoButton,healButton);
 autoButton.addEventListener("click",function(){if(autoOn)endAuto();else beginAuto();refresh()});
 healButton.addEventListener("click",function(){activate(healControl());refresh()});
 function nav(dir){
   var stages=liveStages(),index=selected+dir;
   if(index>=0&&index<stages.length&&activate(stages[index]))selected=index;
   refresh();
 }
 prev.addEventListener("click",function(){nav(-1)});
 next.addEventListener("click",function(){nav(1)});
 function refresh(){
   var stages=liveStages();
   hideSceneLabels();
   var picked=stages.findIndex(function(el){return el.matches('[aria-pressed=true],[aria-selected=true],.active,.selected')||/current/i.test(el.className)});
   if(picked<0){
     var stageText=txt(battle.querySelector(".space")?.parentElement||battle).match(/Stage\s*(\d+)\s*\/\s*(\d+)/i);
     if(stageText)picked=Number(stageText[1])-1;
   }
   if(picked>=0&&picked<stages.length)selected=picked;
   prev.disabled=selected<=0;
   next.disabled=selected>=stages.length-1||!!stages[selected+1]?.disabled;
   var stage=stages[selected],stageName=txt(stage).replace(/(?:✓\s*Farm|New|#\s*\d+|BOSS)/gi,"").trim();
   shell.querySelector(".efb-stage").textContent=(selected===stages.length-1?"Boss encounter":"Stage "+(selected+1)+" / "+Math.max(10,stages.length));
   var headerText=txt(battle).match(/(Ashen Wilds|Whispering Forest|[A-Z][a-z]+ (?:Wastes|Wilds|Ruins|Citadel|Forest|Depths|Keep))/);
   if(headerText)shell.querySelector(".efb-realm").textContent=headerText[1];
   var enText=txt(liveEnemy()||enemy);
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
   var h=healControl(),f=farmControl();
   autoButton.disabled=false;
   autoButton.textContent="Auto Attack: "+(autoOn?"On":"Off");
   autoButton.setAttribute("aria-pressed",String(autoOn));
   healButton.disabled=!h||h.disabled;
   healButton.textContent=h?txt(h):"Heal";
   if(!statusCard||!statusCard.isConnected)statusCard=locateAdventurerCard();
   if(statusCard)statusCard.classList.add("efb-source-hidden");
   var status=statusCard&&txt(statusCard).match(/\b(Resting|In combat|Recovering|Defeated)\b/i);
   shell.querySelector(".efb-status").textContent=status?status[1]:"";

 }
 // Original interface remains connected so combat, unlocks and saves work.
 board.classList.add("efb-source-hidden");
 enemy.classList.add("efb-source-hidden");
 if(training)training.classList.add("efb-source-hidden");
 if(report)report.classList.add("efb-source-hidden");
 if(statusCard)statusCard.classList.add("efb-source-hidden");
 battle.classList.add("efb-redesigned");battle.dataset.efBattleSkin="1";
 // Only hide the redundant title/subtitle, not other gameplay labels.
 elements(battle,"h1,h2,h3").forEach(function(h){
   if(/^The Battleground$/i.test(txt(h)))h.classList.add("efb-source-hidden");
 });

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

 // The original game's global hunting toast sits over the HUD, outside the
 // Battle artwork. Suppress ONLY that redundant announcement; leave damage
 // numbers, save notices, level ups, and other game messages untouched.
 var huntingNotice=/^Hunting\s+[\w][\w\s'’·-]{1,85}$/i;
 function hideHuntNotice(node){
   if(!node)return;
   var el=node.nodeType===3?node.parentElement:node;
   if(!el||el.nodeType!==1)return;
   var candidates=[el];
   if(el.querySelectorAll)candidates.push.apply(candidates,Array.from(el.querySelectorAll("div,span,p,strong,small,[role=status],[role=alert]")));
   candidates.forEach(function(candidate){
     if(candidate.classList.contains("efb-hunt-toast-hidden")||candidate.closest(".efb-shell"))return;
     var t=(candidate.textContent||"").replace(/\s+/g," ").trim();
     if(!huntingNotice.test(t))return;
     // Prefer hiding the full toast capsule, but never a full page/header.
     var target=candidate;
     for(var k=0;k<3&&target.parentElement;k++){
       var parent=target.parentElement;
       if(parent===root||parent===doc.body||parent.closest(".efb-shell"))break;
       var pt=(parent.textContent||"").replace(/\s+/g," ").trim();
       if(pt!==t)break;
       var rect=parent.getBoundingClientRect();
       if(rect.width>550||rect.height>140)break;
       target=parent;
     }
     target.classList.add("efb-hunt-toast-hidden");
   });
 }
 hideHuntNotice(doc.body);
 var toastObserver=new doc.defaultView.MutationObserver(function(mutations){
   mutations.forEach(function(m){
     if(m.type==="characterData")hideHuntNotice(m.target);
     else m.addedNodes.forEach(hideHuntNotice);
   });
 });
 toastObserver.observe(doc.body,{subtree:true,childList:true,characterData:true});
 tab("original");refresh();
 var timer=doc.defaultView.setInterval(function(){
   if(!shell.isConnected){doc.defaultView.clearInterval(timer);toastObserver.disconnect();endAuto();return}
   refresh();
   if(root.querySelector('[data-view="mastery"].active,[data-view="master"].active'))refreshMaster();
 },750);
}
window.EmberforgeBattle={mount:mount};
})();