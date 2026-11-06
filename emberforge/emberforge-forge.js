/* Emberforge Forge v1. Visual restructuring only; original game objects stay live. */
(function () {
  "use strict";
  function mount(frame) {
    var doc;
    try { doc = frame.contentDocument; } catch (_) { return; }
    if (!doc) return;
    var root = doc.querySelector("#ef4");
    var forge = root && root.querySelector('[data-view="forge"]');
    if (!forge || forge.dataset.efForgeV2 === "1") return;
    // The existing HUD moves the original, live production and tap elements here.
    var stats = forge.querySelector(".ef-hud-context");
    if (!stats || !stats.querySelector("#ef4-eps") || !stats.querySelector("#ef4-click")) return;

    function leafText(el) { return (el.textContent || "").replace(/\s+/g, " ").trim(); }
    function rectGood(el) {
      var r = el.getBoundingClientRect();
      return r.width >= 240 && r.height >= 170;
    }
    function isSource(el) {
      return el && el !== forge && !el.closest(".ef-forge-v2");
    }
    function chooseScene() {
      var all = Array.prototype.slice.call(forge.querySelectorAll("*"));
      // The existing scene contains a View Kingdom pill. Find its smallest
      // scene-sized ancestor, never the enclosing two-column dashboard.
      var kingdom = all.find(function (el) {
        return el.matches("button,a,[role=button]") &&
          /view kingdom/i.test(leafText(el));
      }) || all.find(function (el) {
        return el.children.length === 0 && /^view kingdom/i.test(leafText(el));
      });
      if (kingdom) {
        var node = kingdom.parentElement;
        while (node && node !== forge) {
          var t = leafText(node);
          if (rectGood(node) && !/Current expedition|Lifetime Ember harvested/i.test(t)) {
            return node;
          }
          node = node.parentElement;
        }
      }
      // Otherwise locate the existing visual surface, not a stat or loot card.
      var best = null, bestScore = -Infinity;
      all.forEach(function (el) {
        if (!isSource(el) || !rectGood(el) || el === stats) return;
        var r = el.getBoundingClientRect();
        var cls = String(el.className || "").toLowerCase();
        var txt = leafText(el);
        if (/Current expedition|Lifetime Ember harvested|Manage loot|Recruit workers/i.test(txt)) return;
        if (txt.length > 500) return;
        var image = el.querySelector("img");
        var bg = "";
        try { bg = doc.defaultView.getComputedStyle(el).backgroundImage || ""; } catch (_) {}
        var hasArt = bg.indexOf("url(") >= 0 || (image && image.getBoundingClientRect().width >= 200);
        if (!hasArt && !/scene|forge-art|forge-world|forge-visual|stage/i.test(cls)) return;
        var score = 0;
        if (bg.indexOf("url(") >= 0) score += 60;
        if (image) score += 20;
        if (/scene|visual|environment|landscape|forge-art/i.test(cls)) score += 90;
        if (/view kingdom/i.test(txt)) score += 100;
        if (r.width / Math.max(1, r.height) > 1.25) score += 20;
        score += Math.min(r.width, 1200) / 30;
        if (score > bestScore) { bestScore = score; best = el; }
      });
      return best;
    }
    var scene = forge.querySelector("#ef4-forgescene") || chooseScene();
    // Fail closed: if the original interactive scene can't be identified,
    // leave the entire gameplay screen exactly as it was.
    if (!scene || scene.contains(stats) || scene.contains(forge.querySelector("#ef4-eps"))) return;

    var sheet = doc.createElement("link");
    sheet.rel = "stylesheet";
    sheet.href = "./emberforge-forge.css?v=6";
    doc.head.appendChild(sheet);

    var hero = doc.createElement("section");
    hero.className = "ef-forge-v2";
    hero.setAttribute("aria-label", "Emberforge interactive forge");
    hero.innerHTML =
      '<div class="ef-forge-v2-scene"></div>' +
      '<div class="ef-forge-v2-top">' +
        '<div class="ef-forge-v2-stats"></div>' +
        '<div class="ef-forge-v2-level" aria-label="Forge level">' +
          '<span class="ef-forge-level-caption">Level</span>' +
          '<strong id="ef-forge-level">8</strong>' +
        '</div>' +
      '</div>' +
      '<div class="ef-forge-v2-ember" aria-hidden="true">✦</div>' +
      '<div class="ef-forge-progress">' +
        '<div class="ef-forge-progress-titles"><span>FORGE PROGRESSION</span>' +
          '<span class="ef-forge-progress-numbers" id="ef-forge-progress-text">—</span></div>' +
        '<div class="ef-forge-progress-track" role="progressbar" aria-label="Lifetime Ember toward next Forge level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
          '<div class="ef-forge-progress-fill"></div>' +
        '</div>' +
      '</div>';

    hero.querySelector(".ef-forge-v2-scene").appendChild(scene);
    stats.classList.add("ef-forge-stats");
    hero.querySelector(".ef-forge-v2-stats").replaceWith(stats);
    forge.appendChild(hero);

    // Remove the four old scene pills, which duplicate navigation / level.
    var chips = Array.prototype.slice.call(scene.querySelectorAll("a,button,span,div"));
    chips.forEach(function (el) {
      if (el.children.length > 1 || el === scene) return;
      var t = leafText(el);
      if (!/^(?:EMBERFORGE TIER\b|FORGE LV\b|ASC\s+\d+\b|View Kingdom\b)/i.test(t)) return;
      // Restrict removal to the pill itself, not its scene container.
      if (el.getBoundingClientRect().width > 300) return;
      var target = el.matches("a,button") ? el : el.closest("a,button") || el;
      target.classList.add("ef-forge-old-chip");
      target.setAttribute("aria-hidden", "true");
      if (target.matches("a,button")) target.tabIndex = -1;
    });

    forge.dataset.efForgeV2 = "1";
    forge.classList.add("ef-forge-v2-on");

    var progressText = hero.querySelector("#ef-forge-progress-text");
    var fill = hero.querySelector(".ef-forge-progress-fill");
    var track = hero.querySelector(".ef-forge-progress-track");
    var level = hero.querySelector("#ef-forge-level");
    function format(n) {
      if (!Number.isFinite(n)) return "—";
      if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
      if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
      if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
      return String(Math.floor(n));
    }
    function readNumber(raw) {
      if (!raw) return NaN;
      var m = String(raw).replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i);
      return m ? Number(m[1]) * ({K:1e3,M:1e6,B:1e9}[String(m[2] || "").toUpperCase()] || 1) : NaN;
    }
    function sourceCard() {
      var nodes = forge.querySelectorAll("span,small,p,div,strong");
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (el.closest(".ef-forge-v2") || el.children.length > 1) continue;
        if (!/^Lifetime Ember harvested$/i.test(leafText(el))) continue;
        var n = el;
        while (n && n !== forge) {
          if (/Next level at/i.test(leafText(n)) && /Lifetime Ember harvested/i.test(leafText(n))) return n;
          n = n.parentElement;
        }
        return el.parentElement;
      }
      return null;
    }
    function sync() {
      // Keep square sprites on mobile and narrow panels, while wide desktop
      // panels display landscape artwork without stretching.
      var sceneRect = hero.getBoundingClientRect();
      hero.dataset.efForgeWide = sceneRect.width >= 760 &&
        sceneRect.width / Math.max(1, sceneRect.height) >= 1.85 ? "1" : "0";
      // Read the original game DOM rather than independently estimating
      // progression. The engine already computes the level and bar value.
      var levelSource = doc.getElementById("ef4-level");
      if (levelSource) {
        var m = (levelSource.textContent || "").match(/Level\s*(\d+)/i);
        if (m) {
          level.textContent = m[1];
          // Match the engine's 50-level-per-tier progression.
          var forgeLevel = Number(m[1]);
          hero.dataset.efForgeTier = String(Math.min(3, Math.floor(Math.max(0, forgeLevel - 1) / 50)));
        }
      }
      // The legacy game swaps Forge backdrops based on its own responsive
      // rules. Apply the ultra-resolution art to the real painted background
      // layer, not merely the surrounding responsive CSS wrapper. This runs
      // after the engine's updates, including after browser resizing.
      var paintedBg = doc.getElementById("ef4-forgebg");
      if (paintedBg && hero.dataset.efForgeTier === "0") {
        var ultraUrl = 'url("' + new URL("./forge-tier0-ultra.webp", doc.baseURI).href + '")';
        if (paintedBg.style.getPropertyValue("background-image") !== ultraUrl ||
            paintedBg.style.getPropertyPriority("background-image") !== "important") {
          paintedBg.style.setProperty("background-image", ultraUrl, "important");
        }
        paintedBg.style.setProperty("background-size", "cover", "important");
        paintedBg.style.setProperty("background-position", "center center", "important");
        paintedBg.style.setProperty("background-repeat", "no-repeat", "important");
      }
      var lifetimeSource = doc.getElementById("ef4-lifetime");
      var nextLevelSource = doc.getElementById("ef4-levelinfo");
      var originalBar = doc.getElementById("ef4-levelbar");
      if (!lifetimeSource || !nextLevelSource) return;
      var targetMatch = (nextLevelSource.textContent || "").match(/Next level at\s*([\d,.]+[KMB]?)/i);
      var current = readNumber(lifetimeSource.textContent);
      var target = readNumber(targetMatch && targetMatch[1]);
      if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return;
      var engineProgress = originalBar ? parseFloat(originalBar.style.width) : NaN;
      var pct = Number.isFinite(engineProgress) ? engineProgress : current / target * 100;
      pct = Math.max(0, Math.min(100, pct));
      progressText.textContent = format(current) + " / " + format(target);
      fill.style.width = pct + "%";
      track.setAttribute("aria-valuenow", String(Math.round(pct)));
      track.setAttribute("aria-valuetext", format(current) + " of " + format(target) + " lifetime Embers toward the next Forge level");
    }
    sync();
    // Existing game engine owns all values; HUD only displays those values.
    var poll = doc.defaultView.setInterval(function () {
      if (!hero.isConnected) { doc.defaultView.clearInterval(poll); return; }
      sync();
    }, 650);
  }

  window.EmberforgeForge = {mount:mount};
})();