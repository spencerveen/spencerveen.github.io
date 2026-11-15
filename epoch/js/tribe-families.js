/**
 * EPOCH 7A.2A — deterministic kinship for undiscovered wilderness tribes.
 *
 * The existing tribe generator owns settlement placement, member IDs, names,
 * sexes and positions. This post-process uses an independent seeded PRNG;
 * it never consumes the original generator's random stream.
 *
 * familyVersion 0 preserves discovered legacy rosters verbatim.
 * familyVersion 1 adds families without increasing or replacing population.
 */
import {seededRandom} from "./forest-generation.js?v=20261113k";

export const TRIBE_FAMILY_VERSION=1;
export const CHILD_ADULT_AGE=18;
export const TRIBE_FAMILY_CHANCE=.65;
export const TRIBE_CHILD_LIMIT=2;
/** Provisional child silhouettes; dedicated models and activities arrive in 7A.2C. */
export const childVisualScale=age=>age>=CHILD_ADULT_AGE?1:
 Math.min(.92,.51+Math.max(0,Number(age)||0)*.025);
const asNumber=n=>Number.isInteger(n)?n:0;
const childRole=sex=>sex==="female"?"daughter":"son";

/** A fixed family graph with reciprocal spouses and consistent parents. */
export function generateTribeFamilies(tribe,seed,version=TRIBE_FAMILY_VERSION){
 if(!tribe?.members?.length||version!==TRIBE_FAMILY_VERSION)return tribe;
 // A family roll never changes an original tribe member's identity or location.
 const members=tribe.members.map(member=>({
  ...member,parentIds:[],partnerId:null,householdId:null,
  familyRole:"individual",headOfHousehold:false
 }));
 const result={...tribe,members,familyVersion:TRIBE_FAMILY_VERSION};
 if(members.length<2)return result;
 const rand=seededRandom(((Number(seed)>>>0)^0x7a22fa2a)>>>0,
  asNumber(tribe.cx),asNumber(tribe.cz));
 if(rand()>=TRIBE_FAMILY_CHANCE)return result;
 const familyId=tribe.id+":family:0";
 const parentA=members[0]; // The leader remains the known adult authority.
 const secondParent=members.length>=3 && rand()<.83;
 // Prefer a mother/father pair where the existing roster permits one.
 const eligible=members.slice(1);
 const opposite=eligible.filter(p=>p.sex!==parentA.sex);
 let parentB=null;
 if(secondParent){
  const candidates=(opposite.length?opposite:eligible);
  parentB=candidates[Math.floor(rand()*candidates.length)]||null;
 }
 const children=members.filter(p=>p!==parentA&&p!==parentB);
 if(!children.length)return result;
 // Some families have one child, others two, never beyond two dependents.
 const target=Math.min(TRIBE_CHILD_LIMIT,children.length,
  children.length>=2&&rand()<.63?2:1);
 // Select from the unchanged member list; unrelated adults stay unrelated.
 const selected=[...children].sort((a,b)=>a.id.localeCompare(b.id)).slice(0,target);
 const minParentAge=34;
 parentA.age=minParentAge+Math.floor(rand()*23);
 parentA.familyRole="parent";parentA.householdId=familyId;
 parentA.headOfHousehold=true;
 if(parentB){
  parentB.age=minParentAge+Math.floor(rand()*22);
  parentB.familyRole="parent";parentB.householdId=familyId;
  parentB.partnerId=parentA.id;
  parentA.partnerId=parentB.id;
 }
 for(const child of selected){
  child.age=2+Math.floor(rand()*14); // age 2–15 in the first slice
  child.familyRole="child";
  child.householdId=familyId;
  child.parentIds=[parentA.id,...(parentB?[parentB.id]:[])];
 }
 // An unrelated tribe member keeps the original age, name and sex.
 return result;
}
export function tribeFamilySummary(tribe){
 const members=tribe?.members||[],children=members.filter(m=>m.familyRole==="child");
 const families=new Set(children.map(m=>m.householdId).filter(Boolean));
 return {families:families.size,children:children.length,
  adults:members.filter(m=>m.age>=CHILD_ADULT_AGE).length};
}
export function tribeFamilyDescription(member,tribe){
 if(!member)return "";
 const members=tribe?.members||[];
 const byId=new Map(members.map(p=>[p.id,p]));
 if(member.familyRole==="child"){
  const parents=(member.parentIds||[]).map(id=>byId.get(id)).filter(Boolean);
  if(!parents.length)return childRole(member.sex);
  return childRole(member.sex)+" of "+parents.map(p=>p.name).join(" and ");
 }
 if(member.familyRole==="parent"){
  const children=members.filter(p=>(p.parentIds||[]).includes(member.id));
  const status=member.sex==="female"?"Mother":"Father";
  const spouse=byId.get(member.partnerId);
  return status+(spouse?" · Partner of "+spouse.name:"")+
   (children.length?" · "+children.length+" "+(children.length===1?"child":"children"):"");
 }
 return "Tribesperson";
}
