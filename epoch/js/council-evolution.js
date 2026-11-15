/**
 * Civic buildings keep the saved "council" kind and stable building ID.
 * Future ages can append stages here without replacing residents, jobs,
 * traditions or the existing Council Lodge location.
 */
export const COUNCIL_KIND="council";
export const COUNCIL_STAGES=Object.freeze([
 Object.freeze({level:1,era:"Stone Age",name:"Council Lodge",
  subtitle:"Gather the tribe, organize its work and preserve traditions."}),
 Object.freeze({level:2,era:"Stone Age",name:"Elders' Council",
  subtitle:"A strengthened lodge that protects the tribe's culture."})
]);
export function councilLodge(village){
 return village?.buildings?.find(b=>b.kind===COUNCIL_KIND)||null;
}
export function councilStage(building){
 if(!building||building.kind!==COUNCIL_KIND)return null;
 const level=Number.isFinite(building.level)?Math.max(1,Math.floor(building.level)):1;
 return COUNCIL_STAGES.find(s=>s.level===level)||COUNCIL_STAGES.at(-1);
}
export const hasCouncilLodge=village=>!!councilLodge(village);
