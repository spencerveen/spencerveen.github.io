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
 var s=doc.createElement("link");s.rel="stylesheet";s.href="./emberforge-battle.css?v=12";doc.head.appendChild(s);
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
 // Stable engine IDs/classes work in normal fights AND boss encounters.
 var board=battle.querySelector(".huntboard")||doc.getElementById("ef4-huntsteps")?.closest(".card")||smallCard("HUNT BOARD",battle);
 if(!board){console.warn("[Emberforge Battle] Awaiting Hunt Board");return;}
 var stageButtons=elements(doc.getElementById("ef4-huntsteps")||board,"button,[role=button]").filter(function(x){return /#\s*\d+|BOSS|Cinder|Soot|Skeleton|Magma|Revenant|Hound|Imp|Scarab|Marauder/i.test(txt(x))});
 if(stageButtons.length<2){console.warn("[Emberforge Battle] Awaiting stage controls:",stageButtons.length);return;}
 // The stage items are identified once; leave engine-managed listeners intact.
 var training=smallCard("Combat training",battle);
 var report=smallCard("Battle report",battle);
 // The enemy label switches from "Current enemy" to "Realm boss":
 // never use its changing text as the mount prerequisite.
 var enemy=doc.getElementById("ef4-enemyname")?.closest(".card")||smallCard("CURRENT ENEMY",battle);
 if(!enemy){console.warn("[Emberforge Battle] Awaiting Current Enemy panel");return;}
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
 if(!scene){console.warn("[Emberforge Battle] Awaiting battle scene");return;}
 var sceneHost=scene.closest(".card,.panel")||scene;
 if(sceneHost===battle||sceneHost.contains(enemy)||sceneHost.contains(board)){console.warn("[Emberforge Battle] Invalid scene container");return;}
 var shell=doc.createElement("section");shell.className="efb-shell";
 shell.innerHTML='<div class="efb-stage-top"><div class="efb-location"><span class="efb-eyebrow">THE BATTLEGROUND</span><strong class="efb-realm">Ashen Wilds</strong><span class="efb-stage">Stage</span></div><div class="efb-foe"><strong class="efb-name">Current enemy</strong><span class="efb-reward"></span><div class="efb-health" role="progressbar" aria-label="Enemy health" aria-valuemin="0" aria-valuemax="100"><div class="efb-health-fill"></div></div><small class="efb-hp-text"></small></div></div><button type="button" class="efb-arrow efb-prev" aria-label="Previous monster">‹</button><button type="button" class="efb-arrow efb-next" aria-label="Next monster">›</button><div class="efb-bottom"><div class="efb-status" aria-live="polite"></div><div class="efb-event-log" aria-live="polite" aria-label="Battle rewards"></div><div class="efb-actions"></div></div>';
 sceneHost.parentNode.insertBefore(shell,sceneHost);
 shell.insertBefore(sceneHost,shell.firstChild);
 // Escape the original two-column layout so the artwork fills Battle width.
 battle.insertBefore(shell,battle.firstChild);

 // Reward presentation sits above the controls, not inside the original
 // scene layer where the engine's loot card gets obscured.
 var chestReward=doc.createElement("aside");
 chestReward.className="efb-chest-reward";
 chestReward.setAttribute("role","status");
 chestReward.setAttribute("aria-label","Boss chest reward");
 chestReward.hidden=true;
 chestReward.innerHTML='<span class="efb-chest-title">BOSS CHEST OPENED</span><strong class="efb-chest-item"></strong><span class="efb-chest-bonus"></span>';
 shell.appendChild(chestReward);
 var lastChestText="",chestShownAt=0;
 function updateBossChest(){
   // The engine occasionally recreates its boss chest inside a different
   // scene/card node. Detect the exact reward heading throughout Battle.
   var headingPattern=/^BOSS CHEST OPENED\s*$/i;
   var candidates=elements(battle,"div,span,strong,b,h1,h2,h3,h4,p,section,aside");
   var headings=candidates.filter(function(el){
     if(el.closest(".efb-chest-reward,.efb-event-log,.efb-stage-top,.efb-bottom"))return false;
     if(!headingPattern.test(txt(el)))return false;
     return !Array.from(el.children).some(function(child){return headingPattern.test(txt(child))});
   });
   headings.forEach(function(heading){
     // The reward panel may have sibling item/stat elements; choose the
     // smallest enclosing card that contains them, never the entire arena.
     var source=heading;
     var node=heading;
     for(var k=0;k<5&&node.parentElement;k++){
       var parent=node.parentElement;
       if(parent===battle||parent===shell||parent===sceneHost||
          parent===scene||parent.contains(shell)||parent.contains(enemy)||
          parent.contains(board))break;
       var box=parent.getBoundingClientRect();
       var content=txt(parent);
       if(box.height>320||box.width>720||content.length>280||
          !/BOSS CHEST OPENED/i.test(content))break;
       source=parent;
       node=parent;
       if(/(?:RARE|EPIC|LEGENDARY|COMMON|UNCOMMON)\b/i.test(content)&&
          /(?:\+\s*\d|Longsword|Breastplate|Sword|Armor|Shield|Staff)/i.test(content))break;
     }
     var rewardText=txt(source);
     // Prefer item details from the card; preserve the last displayed reward
     // if the game rerenders/clears its old card afterward.
     if(rewardText!==lastChestText &&
        rewardText.length>18 &&
        /BOSS CHEST OPENED/i.test(rewardText)){
       lastChestText=rewardText;
       chestShownAt=Date.now();
       var details=rewardText.replace(/^BOSS CHEST OPENED\s*/i,"").trim();
       var bonus=details.match(/(\+\s*[\d,.]+\s*[A-Za-z][\w\s%+-]{0,40})$/);
       var item=bonus?details.slice(0,bonus.index).trim():details;
       chestReward.querySelector(".efb-chest-item").textContent=item||"Reward received";
       chestReward.querySelector(".efb-chest-bonus").textContent=bonus?bonus[0]:"";
     }
     source.classList.add("efb-old-chest-hidden");
     source.style.setProperty("display","none","important");
   });
   chestReward.hidden=!chestShownAt||Date.now()-chestShownAt>6200;
 }
 var actionArea=shell.querySelector(".efb-actions");
 var prev=shell.querySelector(".efb-prev"),next=shell.querySelector(".efb-next");
 var selected=0,autoOn=false,hasNavigationSelection=false,visitedBoss=false;
 // Stage buttons can retain a stale "active" class after returning from a boss.
 // Once navigation begins, the arrow's selected index is the source of truth.

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
 function liveBoard(){return board.isConnected?board:(battle.querySelector(".huntboard")||doc.getElementById("ef4-huntsteps")?.closest(".card"))}
 function liveEnemy(){return enemy.isConnected?enemy:doc.getElementById("ef4-enemyname")?.closest(".card")}
 function liveStages(){var b=doc.getElementById("ef4-huntsteps")||liveBoard();return b?elements(b,"button,[role=button]").filter(function(el){return /#\s*\d+|BOSS|Cinder|Soot|Skeleton|Magma|Revenant|Hound|Imp|Scarab|Marauder/i.test(txt(el))}):[]}
 function liveControl(re,scope){return findButton(scope||liveEnemy()||battle,re)}
 function activate(el){if(el&&el.isConnected&&!el.disabled){el.click();return true}return false}
 function farmControl(){return doc.getElementById("ef4-auto")||liveControl(/Farm Target|Auto.?Farm|Auto Attack/i,liveBoard())||liveControl(/Farm Target|Auto.?Farm|Auto Attack/i)}
 function stopControl(){return doc.getElementById("ef4-retreat")||liveControl(/^Retreat$|^Stop\b/i)}
 function healControl(){return doc.getElementById("ef4-potion")||liveControl(/^Heal\b/i)}
 function strikeControl(){return doc.getElementById("ef4-strike")||liveControl(/^Strike(?:\s|$)/i)}
 // Stage-change notices from the old art layer are redundant with the new
 // realm/stage badge. Hide only the old scene labels; do not silence game logs.
 function hideSceneLabels(){
   // Hide only the exact legacy tip IDs in CSS. Never change game text nodes.
   elements(sceneHost,"span,small,div").forEach(function(el){
     if(el.closest(".efb-stage-top,.efb-bottom,.efb-arrow"))return;
     if(el.children.length>1)return;
     var label=txt(el);
     if(/^(?:BOSS BATTLE|STAGE\s+\d+(?:\s*\/\s*\d+)?|(?:BOSS BATTLE|ASHEN WILDS)\s*[·•-]\s*(?:ASHEN WILDS|BOSS BATTLE))$/i.test(label)){
       el.classList.add("efb-source-label-hidden");
     }
   });
 }
 // Combat runs inside the game engine. The UI never simulates Strike,
 // Farm Target or Retreat clicks, and it owns no parallel combat timers.
 function engine(){try{return frame.contentWindow.EmberforgeGame||null}catch(_){return null}}
 function beginAuto(){
   var api=engine();
   if(api&&api.setAutoAttack(true))autoOn=true;
 }
 function endAuto(){
   var api=engine();
   if(api&&api.setAutoAttack(false))autoOn=false;
 }
 var autoButton=doc.createElement("button");autoButton.type="button";autoButton.className="efb-action efb-attack";
 var healButton=doc.createElement("button");healButton.type="button";healButton.className="efb-action efb-heal";
 actionArea.append(autoButton,healButton);
 autoButton.addEventListener("click",function(){if(autoOn)endAuto();else beginAuto();routeBattleToasts();refresh()});
 healButton.addEventListener("click",function(){var api=engine();if(api&&api.heal)api.heal();else activate(healControl());refresh()});
 function nav(dir){
   var api=engine(),state=api?.getCombatState();
   var target=(state?state.stage:selected+1)+dir;
   if(!api||!state||target<1||target>state.maxStage)return;
   if(api.selectStage(target)){selected=target-1;hasNavigationSelection=true;}
   refresh();
 }
 prev.addEventListener("click",function(){nav(-1)});
 next.addEventListener("click",function(){nav(1)});
 // Also track direct selections made on the original Hunt Board, if used.
 battle.addEventListener("click",function(event){
   var button=event.target.closest("button");
   if(!button||button.closest(".efb-shell"))return;
   var stages=liveStages(),index=stages.indexOf(button);
   if(index>=0&&!button.disabled){selected=index;hasNavigationSelection=true;if(index===stages.length-1&&/BOSS/i.test(txt(button)))visitedBoss=true;}
 });
 // The game can replace legacy cards during its render cycle. Re-hide fresh
 // copies on each sync, without touching the battlefield or the shared HUD.
 function suppressLegacyPanels(){
   var labels=[
     /^YOUR ADVENTURER\b/i,
     /^CURRENT ENEMY\b/i,
     /^REALM BOSS\b/i,
     /^COMBAT TRAINING\b/i,
     /^BATTLE REPORT\b/i,
     /^HUNT BOARD\b/i
   ];
   elements(battle,".card,.panel").forEach(function(card){
     if(card.closest(".efb-shell")||card.contains(shell)||card===battle)return;
     // Only inspect compact headings directly belonging to this card.
     var headings=elements(card,"h1,h2,h3,h4,h5,h6,strong,b");
     var matched=headings.some(function(h){
       if(h.closest(".card,.panel")!==card)return false;
       var value=txt(h);
       return value.length<100&&labels.some(function(re){return re.test(value)});
     });
     if(!matched){
       // Some legacy cards have headings rendered in plain divs.
       matched=elements(card,":scope > div, :scope > header, :scope > div > div").some(function(el){
         if(el.querySelector(".card,.panel"))return false;
         var value=txt(el);
         return value.length<95&&labels.some(function(re){return re.test(value)});
       });
     }
     if(matched)card.classList.add("efb-source-hidden");
   });
 }
 // Route global battle popups to an in-scene event log. Never modify the
 // engine's toast text or the combat rules, only the visual presentation.
 var eventLog=shell.querySelector(".efb-event-log");
 var eventHistory=[];
 var recentEvents=new Map();
 var routineNotice=/^(?:Hunting\s+\S.{0,95}|Farming\s+(?:(?:stage|hunt|target|boss)\s*)?(?:#?\d+|[A-Za-z][A-Za-z '\-]{1,65})(?:\s*\/\s*\d+)?|Smart\s*Hunt(?:\s+(?:enabled|disabled|on|off|activated|deactivated))?|Retreated to safety|Auto(?:[- ]?Farm| Attack)?\s*(?:ON|OFF|enabled|disabled)|Battle ready)\.?$/i;
 var lastToastMessage=new WeakMap();
 var lastCombatMessage="";
 function routeCombatMessage(){
   var nativeMessage=doc.getElementById("ef4-combatmessage");
   var message=txt(nativeMessage);
   if(!message||message===lastCombatMessage)return;
   lastCombatMessage=message;
   // Stage selection includes the unwanted boss introduction. Combat
   // updates, hits, damage, victories and recovery remain visible.
   if(/^(?:Target selected:|Ready for battle|Rest between fights)/i.test(message))return;
   if(/^(?:You strike|BOSS SPECIAL ATTACK|You were knocked out|Recovered|Combat level|Healing potion|First victory!)/i.test(message)||
      /(?:hits for|defeated\.|damage\.|combat XP\.)/i.test(message)){
     queueEvent(message);
   }
 }
 function purgeEventLog(now){
   var keep=eventHistory.filter(function(entry){return now-entry.at<6500});
   if(keep.length===eventHistory.length)return;
   eventHistory=keep;
   renderEvents();
 }
 function renderEvents(){
   eventLog.replaceChildren();
   eventHistory.slice(-2).forEach(function(entry){
     var item=doc.createElement("div");
     item.className="efb-event-line";
     item.textContent=entry.message;
     eventLog.appendChild(item);
   });
 }
 function queueEvent(message){
   var now=Date.now();
   if(recentEvents.has(message)&&now-recentEvents.get(message)<2300)return;
   recentEvents.set(message,now);
   recentEvents.forEach(function(at,key){if(now-at>9000)recentEvents.delete(key)});
   eventHistory.push({message:message,at:now});
   eventHistory=eventHistory.slice(-2);
   renderEvents();
 }
 function routeBattleToasts(){
   routeCombatMessage();
   // Preserve engine notifications in the arena without restoring the
   // unwanted boss introduction or routine auto/farming status messages.
   var nativeToast=doc.getElementById("ef4-toast");
   if(nativeToast&&nativeToast.style.display!=="none"){
     var notification=txt(nativeToast);
     if(notification&&lastToastMessage.get(nativeToast)!==notification){
       if(!routineNotice.test(notification)&&
          !/^Bosses?\s+(?:strike|attack|use|have)\b.*(?:special|fourth|4th)/i.test(notification)){
         queueEvent(notification);
       }
       lastToastMessage.set(nativeToast,notification);
     }
     if(notification)nativeToast.classList.add("efb-native-toast-hidden");
   }
   // Do not recursively hide arbitrary div/span nodes: it can suppress
   // damage floaters and real battle messages from the scene.
   purgeEventLog(Date.now());
 }
 function refresh(){
   updateBossChest();
   suppressLegacyPanels();
   routeBattleToasts();
   var stages=liveStages();
   hideSceneLabels();
   var picked=stages.findIndex(function(el){return el.matches('[aria-pressed=true],[aria-selected=true],.active,.selected')||/current/i.test(el.className)});
   if(picked<0){
     var stageText=txt(battle.querySelector(".space")?.parentElement||battle).match(/Stage\s*(\d+)\s*\/\s*(\d+)/i);
     if(stageText)picked=Number(stageText[1])-1;
   }
   var state=engine()?.getCombatState();
   if(state){selected=state.stage-1;autoOn=!!state.auto;}
   else if(!hasNavigationSelection&&picked>=0&&picked<stages.length)selected=picked;
   if(selected>=stages.length)selected=Math.max(0,stages.length-1);
   prev.disabled=selected<=0;
   next.disabled=selected>=stages.length-1||(state?selected+2>state.maxStage:!!stages[selected+1]?.disabled);
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
   // Our Auto Attack runs native Strike clicks, not the engine's farming cycle.
   // If knocked out, stop until the player explicitly re-enables it.
   var nativeControl=doc.getElementById("ef4-auto");
   if(nativeControl?.disabled&&autoOn)endAuto();
   autoButton.disabled=!strikeControl()||!!nativeControl?.disabled;
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
 // Watch only text/child changes. Ignore changes made by our own scene log,
 // so event rendering cannot recursively trigger more rendering.
 var toastObserver=new doc.defaultView.MutationObserver(function(){routeBattleToasts()});
 ["ef4-toast","ef4-combatmessage"].forEach(function(id){
   var node=doc.getElementById(id);
   if(node)toastObserver.observe(node,{childList:true,characterData:true,subtree:true});
 });
 tab("original");refresh();
 var timer=doc.defaultView.setInterval(function(){
   if(!shell.isConnected){doc.defaultView.clearInterval(timer);toastObserver.disconnect();return}
   refresh();
   if(root.querySelector('[data-view="mastery"].active,[data-view="master"].active'))refreshMaster();
 },750);
}
window.EmberforgeBattle={mount:mount};
})();