/** Swimming uses the normal stamina pool, without new saved state. */
import {SHALLOW_LIMIT} from "./water-generation.js?v=20261114watershed3";
export const SWIM=Object.freeze({
 depth:SHALLOW_LIMIT, speed:2.25, fastSpeed:3.1,
 cost:5.25, fastCost:9.25, recovery:5, surfaceOffset:1.04
});
export const isSwimmingDepth=water=>(water?.depth||0)>=SWIM.depth;
export const swimCost=(dt,fast=false)=>
 (fast?SWIM.fastCost:SWIM.cost)*Math.max(0,Math.min(1,dt));
