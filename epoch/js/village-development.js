/**
 * Phase 6D — Stone Age village development.
 *
 * A structure starts at level 1 when placed. One materials-funded improvement
 * can raise it to level 2. These effects are derived from actual built
 * structures and saved stockpile level, never from the UI or render meshes.
 */
export const DEVELOPMENT_MAX_LEVEL=2;
export const STOCKPILE_EXPANSION=240;
export const VILLAGE_UPGRADES=Object.freeze({
 stockpile:Object.freeze({
  title:"Raised Granary",kind:"stockpile",
  description:"Reinforce the stockpile with elevated platforms and baskets.",
  benefit:"+240 storage capacity (480 → 720 items)",
  cost:Object.freeze({wood:18,stone:12,vines:4})
 }),
 family:Object.freeze({
  title:"Extended Sleeping Hut",kind:"family",
  description:"Expand an individual hut with an extra sleeping alcove.",
  benefit:"+2 beds in this hut (3 → 5)",
  cost:Object.freeze({wood:12,stone:8,vines:3})
 }),
 hearth:Object.freeze({
  title:"Improved Cooking Hearth",kind:"hearth",
  description:"A better stone oven helps make each recipe stretch further.",
  benefit:"+1 prepared serving from each cooking recipe",
  cost:Object.freeze({wood:8,stone:10,vines:2})
 }),
 lore:Object.freeze({
  title:"Toolmaker's Workshop",kind:"lore",
  description:"Shared tools and better methods make gathering faster.",
  benefit:"20% shorter villager gathering actions and +50% Knowledge production",
  cost:Object.freeze({wood:14,stone:12,flint:1})
 }),
 council:Object.freeze({
  title:"Elders' Council",kind:"council",
  description:"A permanent council preserves traditions between generations.",
  benefit:"+2 Culture each in-game year",
  cost:Object.freeze({wood:16,stone:12,vines:4})
 })
});
export const developmentLevel=value=>
 Number.isFinite(value)&&value>=DEVELOPMENT_MAX_LEVEL?2:1;
export const structureLevel=building=>developmentLevel(building?.level);
export const stockpileLevel=pile=>developmentLevel(pile?.level);
export const upgradedBuilding=(village,kind)=>!!(village?.buildings||[])
 .find(b=>b.kind===kind&&structureLevel(b)===2);
export const upgradedHutBeds=building=>3+(structureLevel(building)-1)*2;
export const workerGatherDurationMultiplier=village=>upgradedBuilding(village,"lore")?.8:1;
export const workshopKnowledgeMultiplier=village=>upgradedBuilding(village,"lore")?1.5:1;
export const councilYearCulture=village=>upgradedBuilding(village,"council")?2:0;
export const hearthExtraServing=village=>upgradedBuilding(village,"hearth")?1:0;
export const upgradedStockpileCapacity=stockpile=>
 480+(stockpileLevel(stockpile)-1)*STOCKPILE_EXPANSION;
