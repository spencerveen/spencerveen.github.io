'use strict';

// Preserve older saves and the raw contents of any unreadable current save.
// A failed parse must not silently erase the only copy of player progress.
function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    if (raw) {
      const original = JSON.parse(raw);
      if ((original.version || 0) < 7) {
        try {
          if (!localStorage.getItem(KEY + '-pre-v7-backup')) {
            localStorage.setItem(KEY + '-pre-v7-backup', raw);
          }
        } catch (error) {
          console.warn('[Emberforge] Could not back up a legacy save:', error);
        }
      }
      s = clean(original);
      return;
    }
  } catch (error) {
    console.warn('[Emberforge] Could not load current save:', error);
    if (raw) {
      try {
        if (!localStorage.getItem(KEY + '-corrupt-backup')) {
          localStorage.setItem(KEY + '-corrupt-backup', raw);
        }
      } catch (backupError) {
        console.warn('[Emberforge] Could not preserve unreadable save:', backupError);
      }
    }
  }

  try {
    let old = localStorage.getItem('emberforge-reborn-v2');
    let fromV1 = false;
    if (!old) {
      old = localStorage.getItem('emberforge-clicker-v1');
      fromV1 = !!old;
    }
    if (!old) return;
    const obj = JSON.parse(old);
    s = clean({...obj, zone:obj.realm || 0, stage:obj.wave || 1, enemyHP:obj.hp || 0});
    if (fromV1) {
      s.level = 1 + Math.floor(Math.log10(s.lifetime / 100 + 1) * 4);
      s.skillPoints = Math.floor((s.level - 1) / 4);
    }
    s.version = 7;
    s.journal.unshift('✨ Previous Emberforge save migrated.');
  } catch (error) {
    console.warn('[Emberforge] Could not migrate legacy save:', error);
  }
}

function save() {
  s.updated = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    $('savebadge').textContent = '● Saved';
    $('saveinfo').textContent = 'Saved locally · ' + new Date().toLocaleTimeString();
  } catch (error) {
    console.warn('[Emberforge] Local save failed:', error);
    $('savebadge').textContent = '● Session only';
    $('saveinfo').textContent = 'Local saves unavailable: export a save code.';
  }
}
