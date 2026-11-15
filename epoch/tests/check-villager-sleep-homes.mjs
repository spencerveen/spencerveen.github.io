import assert from "node:assert/strict";
import {hutDoorApproach,villagerBedtimeTarget,sleepingAccommodation,
 HUT_DOOR_DISTANCE,HUT_DOOR_REACH} from "../js/villager-sleep-homes.js";
import {normalizeHomes,legacyResidents} from "../js/residents.js";
import {advanceVillagerEnergy} from "../js/villager-routines.js";
assert(HUT_DOOR_DISTANCE>2.66,"night approach must be outside Hut collision");
assert(HUT_DOOR_REACH>0&&HUT_DOOR_REACH<.9);
const hut={id:"hut_a",kind:"family",x:10,z:20,turn:0};
const turn90={...hut,turn:1},turn180={...hut,turn:2},turn270={...hut,turn:3};
const approx=(a,b)=>assert(Math.abs(a-b)<1e-8,Math.abs(a-b));
const p0=hutDoorApproach(hut,1);
approx(p0.x,10);approx(p0.z,20+HUT_DOOR_DISTANCE);
const p90=hutDoorApproach(turn90,1);
approx(p90.x,10+HUT_DOOR_DISTANCE);approx(p90.z,20);
const p180=hutDoorApproach(turn180,1);
approx(p180.x,10);approx(p180.z,20-HUT_DOOR_DISTANCE);
const p270=hutDoorApproach(turn270,1);
approx(p270.x,10-HUT_DOOR_DISTANCE);approx(p270.z,20);
const flank=hutDoorApproach(hut,0);
assert(flank.x!==p0.x,"housemates receive staggered entrance points");
assert(Math.hypot(flank.x-hut.x,flank.z-hut.z)>2.66);
assert.equal(hutDoorApproach(null),null);
assert.equal(hutDoorApproach({kind:"council",x:10,z:20}),null);
assert.deepEqual(hutDoorApproach({...hut,turn:5},1),p90,
 "rotations wrap without moving saved hut");
assert.deepEqual(villagerBedtimeTarget({hutEntrance:p90,homeX:0,homeZ:0}),p90);
assert.deepEqual(villagerBedtimeTarget({homeX:7,homeZ:9}),{x:7,z:9});
assert.equal(sleepingAccommodation({work:{mode:"sleeping"},hutEntrance:p0}),"hut");
assert.equal(sleepingAccommodation({work:{mode:"sleeping"},hutEntrance:null}),"camp");
assert.equal(sleepingAccommodation({work:{mode:"goingHome"},hutEntrance:p0}),"awake");
const village={
 buildings:[hut],residents:legacyResidents(2)
};
normalizeHomes(village);
assert(village.residents.some(p=>p.homeId==="camp"));
assert(village.residents.some(p=>p.homeId===hut.id));
const savedEnergy=advanceVillagerEnergy({energy:30,hunger:100,resting:true},
 {mode:"sleeping",moving:false,atHome:true,local:true},5,"night");
assert(savedEnergy.energy>30,"sleeping inside hut retains old energy recovery");
console.log("PASS sleep homes: rotated door coordinates, obstacle clearance, housemates, camp fallback, energy");
