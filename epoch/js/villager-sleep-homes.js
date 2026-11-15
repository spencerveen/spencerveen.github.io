/**
 * Visual-only night accommodation coordinates. Saved homeId remains the
 * authority: a Hut owner approaches its rotated doorway, while a camp
 * resident sleeps on a bedroll at their existing communal camp location.
 *
 * Door points stay outside the solid building footprint so the existing
 * collision/pathfinding system can actually reach them. The villager then
 * appears to enter through the dark doorway when sleep begins.
 */
export const HUT_DOOR_DISTANCE=2.92; // collision radius 2.35 + 0.31
export const HUT_DOOR_REACH=.55;

export function hutDoorApproach(hut,occupantIndex=0){
 if(!hut||hut.kind!=="family"||
   !Number.isFinite(hut.x)||!Number.isFinite(hut.z))return null;
 const turn=((Math.round(Number(hut.turn)||0)%4)+4)%4;
 const angle=turn*Math.PI/2;
 const fx=Math.sin(angle),fz=Math.cos(angle);
 const rx=Math.cos(angle),rz=-Math.sin(angle);
 const side=((Math.max(0,Math.floor(occupantIndex))%3)-1)*.18;
 return {x:hut.x+fx*HUT_DOOR_DISTANCE+rx*side,
  z:hut.z+fz*HUT_DOOR_DISTANCE+rz*side};
}
export function villagerBedtimeTarget(person){
 return person?.hutEntrance||{x:person.homeX,z:person.homeZ};
}
export function sleepingAccommodation(person){
 return person?.work?.mode==="sleeping"?
  (person.hutEntrance?"hut":"camp"):"awake";
}
