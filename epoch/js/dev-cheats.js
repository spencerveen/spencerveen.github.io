/**
 * TEMPORARY Epoch developer cheats.
 * Session-only flags, intentionally separate from the persisted GameState.data.
 * Delete this module and the small GameState/UI hooks before release.
 */
export const DEV_CHEATS=Object.freeze([
 {key:"unlimitedSprint",label:"Unlimited sprint",note:"Run with Shift without spending stamina."},
 {key:"unlimitedHealth",label:"Unlimited health",note:"Stay at full health and ignore damage."},
 {key:"unlimitedHunger",label:"Unlimited hunger",note:"Hunger stays at 100%."},
 {key:"neverDie",label:"Never die",note:"Survive fatal injuries and the age-100 cutoff."}
]);
export const newDevCheats=()=>Object.fromEntries(DEV_CHEATS.map(({key})=>[key,false]));
export const validDevCheat=key=>DEV_CHEATS.some(c=>c.key===key);
