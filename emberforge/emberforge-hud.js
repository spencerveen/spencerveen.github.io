(function(){
"use strict";
// UI-only sidebar controller. Never changes game state or navigation handlers.
function setupSidebar(doc,root){
  var nav=root.querySelector("#ef4-nav"),layout=root.querySelector(".layout");
  if(!nav||!layout||nav.dataset.responsiveReady==="1")return;
  var toggle=nav.querySelector("#ef4-navtoggle"),win=doc.defaultView;
  if(!toggle||!win)return;
  nav.dataset.responsiveReady="1";
  var key="emberforge-sidebar-mode-v1";
  var preference=null;
  try{
    var stored=win.localStorage.getItem(key);
    if(stored==="expanded"||stored==="collapsed")preference=stored;
  }catch(_){/* Browsers may restrict local storage; navigation still works. */}
  function apply(){
    var width=win.innerWidth||root.clientWidth||1201;
    var mobile=width<=760;
    var mode=mobile?"mobile":(preference||(width<=1200?"collapsed":"expanded"));
    layout.classList.toggle("nav-expanded",mode==="expanded");
    layout.classList.toggle("nav-collapsed",mode==="collapsed");
    layout.classList.toggle("nav-mobile",mode==="mobile");
    var expanded=mode==="expanded";
    toggle.setAttribute("aria-expanded",String(expanded));
    toggle.setAttribute("aria-label",expanded?"Collapse navigation":"Expand navigation");
    toggle.title=expanded?"Collapse navigation":"Expand navigation";
    toggle.disabled=mobile;
    toggle.querySelector(".nav-toggle-label").textContent=expanded?"Collapse menu":"Expand menu";
  }
  toggle.addEventListener("click",function(event){
    event.preventDefault();event.stopPropagation();
    if(win.innerWidth<=760)return;
    preference=layout.classList.contains("nav-collapsed")?"expanded":"collapsed";
    try{win.localStorage.setItem(key,preference)}catch(_){}
    apply();
  });
  win.addEventListener("resize",apply,{passive:true});
  apply();
}
function mount(frame){
  var doc;
  try{doc=frame.contentDocument}catch(e){return}
  if(!doc)return;
  var root=doc.querySelector("#ef4"),header=root&&root.querySelector(".ef-head");
  if(!header||header.dataset.hudRedesigned==="1")return;
  var id=function(key){return doc.getElementById("ef4-"+key)};
  var names=["ember","eps","click","power","souls","sp","tophealth","topcombat",
             "cur-ember","cur-eps","cur-click","cur-power","cur-souls","cur-sp","cur-combat","savebadge"];
  var old={},i;
  for(i=0;i<names.length;i++){old[names[i]]=id(names[i]);if(!old[names[i]])return}
  var saveButton=header.querySelector("[data-action=save]");
  var forge=root.querySelector("[data-view=forge]"),battle=root.querySelector("[data-view=battle]"),master=id("mastercontent");
  if(!saveButton||!forge||!battle||!master)return;
  var sheet=doc.createElement("link");sheet.rel="stylesheet";sheet.href="./emberforge-hud.css?v=5";doc.head.append(sheet);
  // Apply the in-game navigation theme without touching gameplay or save logic.
  var sideSheet=doc.createElement("link");
  sideSheet.rel="stylesheet";
  sideSheet.href="./emberforge-sidebar.css?v=3";
  doc.head.append(sideSheet);
  var nav=root.querySelector("#ef4-nav");
  if(nav)nav.setAttribute("aria-label","Emberforge game sections");
  setupSidebar(doc,root);
  header.innerHTML=[
    '<div class="ef-hud-top">',
      '<img class="ef-hud-logo" src="./emberforge-logo-v3.webp" alt="Emberforge" width="400" height="117" draggable="false">',
      '<div class="ef-hud-actions" data-hud="actions"></div>',
    '</div>',
    '<div class="ef-hud-vitals">',
      '<div class="ef-hud-combat ef-hud-panel"><div class="ef-hud-combat-line"><span data-hud="combat-icon"></span><span class="ef-hud-label">Combat level</span><strong data-hud="combat-value"></strong></div><div class="ef-hud-xp-track" role="progressbar" aria-label="Combat experience to next level" aria-valuemin="0" aria-valuemax="100"><span class="ef-hud-xp-fill"></span></div></div>',
      '<div class="ef-hud-ember ef-hud-panel"><span data-hud="ember-icon"></span><span class="ef-hud-label">Total Embers</span><strong data-hud="ember-value"></strong></div>',
      '<div class="ef-hud-health ef-hud-panel">',
        '<div class="ef-hud-health-top"><span class="ef-hud-heart" aria-hidden="true">♥</span><span class="ef-hud-label">Health</span><strong data-hud="health-value"></strong></div>',
        '<div id="ef-hud-health-track" class="ef-hud-track" role="progressbar" aria-label="Adventurer HP" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><div id="ef-hud-health-fill" class="ef-hud-fill"></div></div>',
      '</div>',
    '</div>',
    '<div class="ef-hud-hidden" hidden aria-hidden="true"></div>'
  ].join("");
  header.classList.add("ef-hud");header.dataset.hudRedesigned="1";
  header.setAttribute("aria-label","Emberforge player status");
  var slot=function(n){return header.querySelector('[data-hud="'+n+'"]')};
  old.savebadge.classList.add("ef-hud-savebadge");old.savebadge.setAttribute("role","status");
  saveButton.classList.add("ef-hud-save");
  slot("actions").append(old.savebadge,saveButton);
  slot("combat-icon").append(old["cur-combat"]);
  slot("combat-value").replaceWith(old.topcombat);
  slot("health-value").replaceWith(old.tophealth);
  slot("ember-icon").append(old["cur-ember"]);
  slot("ember-value").replaceWith(old.ember);
  header.querySelector(".ef-hud-hidden").append(old["cur-souls"],old.souls,old["cur-sp"],old.sp);
  function metric(icon,val,label,suffix){
    var node=doc.createElement("span");node.className="ef-hud-metric";
    var text=doc.createElement("span");text.textContent=label;
    node.append(icon,text,val);
    if(suffix){var unit=doc.createElement("span");unit.textContent=suffix;node.append(unit)}
    return node;
  }
  var forgeRow=doc.createElement("div");forgeRow.className="ef-hud-context";
  forgeRow.append(metric(old["cur-eps"],old.eps,"Production","/s"),metric(old["cur-click"],old.click,"Per tap",""));
  forge.querySelector(".space").insertAdjacentElement("afterend",forgeRow);
  var battleRow=doc.createElement("div");battleRow.className="ef-hud-context";
  battleRow.append(metric(old["cur-power"],old.power,"Attack damage",""));
  battle.querySelector(".space").insertAdjacentElement("afterend",battleRow);
  var bar=doc.getElementById("ef-hud-health-fill"),track=doc.getElementById("ef-hud-health-track"),source=id("playerhpbar");
  var combatXpTrack=header.querySelector(".ef-hud-xp-track");
  var combatXpFill=header.querySelector(".ef-hud-xp-fill");
  function refreshCombatXp(){
    var exact=id("playerxpbar")||id("combatxpbar")||id("xpbar");
    var candidates=exact?[exact]:Array.from(battle.querySelectorAll('[id*="xpbar"],[class*="xpbar"],[role="progressbar"]'));
    var xp=candidates.find(function(el){return /combat|xp/i.test((el.id||"")+" "+(el.className||"")) && Number.isFinite(parseFloat(el.style.width))});
    if(!xp)xp=candidates.find(function(el){return Number.isFinite(parseFloat(el.style.width)) && /xp/i.test((el.parentElement?.textContent||"").slice(0,150))});
    if(!xp){combatXpTrack.style.visibility="hidden";return}
    var percent=Math.min(100,Math.max(0,parseFloat(xp.style.width)));
    combatXpTrack.style.visibility="visible";combatXpFill.style.width=percent+"%";
    combatXpTrack.setAttribute("aria-valuenow",String(Math.round(percent)));
  }
  function update(){
    refreshCombatXp();
    var pct=source?parseFloat(source.style.width):100;
    if(!Number.isFinite(pct))pct=100;
    pct=Math.max(0,Math.min(100,pct));
    bar.style.width=pct+"%";track.classList.toggle("low",pct<=30);
    track.setAttribute("aria-valuenow",String(Math.round(pct)));
    track.setAttribute("aria-valuetext",old.tophealth.textContent.trim()+" HP");
    var asc=master.querySelector("#ef-hud-current-souls");
    if(asc)asc.textContent=old.souls.textContent;
  }
  function mountAscension(){
    if(master.querySelector("#ef-hud-current-souls"))return;
    var card=master.querySelector(".card");
    if(!card||card.textContent.indexOf("Ascension Altar")<0)return;
    var label=doc.createElement("div");label.className="ef-hud-ascend";
    label.innerHTML='Current Soulfire <strong id="ef-hud-current-souls"></strong>';
    card.insertBefore(label,card.querySelector(".grid2")||card.firstChild);
    update();
  }
  if(typeof MutationObserver!=="undefined"){
    var m=new MutationObserver(update);
    m.observe(old.tophealth,{childList:true,characterData:true,subtree:true});
    m.observe(old.souls,{childList:true,characterData:true,subtree:true});
    if(source)m.observe(source,{attributes:true,attributeFilter:["style"]});
    var n=new MutationObserver(mountAscension);
    n.observe(master,{childList:true});
  }
  mountAscension();update();
  var xpPoll=doc.defaultView.setInterval(function(){if(!header.isConnected){doc.defaultView.clearInterval(xpPoll);return}refreshCombatXp()},900);
  doc.title="Emberforge";
}
window.EmberforgeHUD={mount:mount};
})();