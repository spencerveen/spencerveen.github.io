(function(){
"use strict";
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
  var sheet=doc.createElement("link");sheet.rel="stylesheet";sheet.href="./emberforge-hud.css?v=4";doc.head.append(sheet);
  header.innerHTML=[
    '<div class="ef-hud-top">',
      '<img class="ef-hud-logo" src="./emberforge-logo-v3.webp" alt="Emberforge" width="400" height="117" draggable="false">',
      '<div class="ef-hud-actions" data-hud="actions"></div>',
    '</div>',
    '<div class="ef-hud-vitals">',
      '<div class="ef-hud-combat ef-hud-panel"><span data-hud="combat-icon"></span><span class="ef-hud-label">Combat level</span><strong data-hud="combat-value"></strong></div>',
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
  function update(){
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
  mountAscension();update();doc.title="Emberforge";
}
window.EmberforgeHUD={mount:mount};
})();