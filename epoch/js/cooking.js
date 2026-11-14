/**
 * Stone Age campfire cooking. Recipes consume carried ingredients first and
 * village stockpile ingredients second, and always output to the backpack.
 * This simulation is pure: failed recipes never lose ingredients or fuel.
 */
import {addItems,removeItems,countItem,canonicalItem} from "./inventory.js?v=20261114cook1";
import {stockpileCount} from "./stockpile.js?v=20261114cook1";

export const COOKING_VERSION=2;
export const COOKING_REACH=6;
export const COOKING_RECIPES=Object.freeze({
 roasted_meat:Object.freeze({name:"Roasted Meat",description:"Slow-roast hunted meat above a wood fire.",
  cost:Object.freeze({animal_meat:2,wood:1}),output:Object.freeze({id:"cooked_meat",qty:2}),xp:22}),
 berry_roast:Object.freeze({name:"Berry-Roasted Meat",description:"Roast meat with wild berries for a more nourishing meal.",
  cost:Object.freeze({animal_meat:1,berries:2,wood:1}),output:Object.freeze({id:"berry_roast",qty:1}),xp:28}),
 cooked_fish:Object.freeze({name:"Roasted Fish",description:"Roast your fresh catch on the communal fire.",
  cost:Object.freeze({fish_meat:2,wood:1}),output:Object.freeze({id:"cooked_fish",qty:2}),xp:23})
});
export function prepareCooking(recipeId,inventory,pile){
 const recipe=COOKING_RECIPES[recipeId];
 if(!recipe||!pile||!Array.isArray(inventory))return {ok:false,reason:"No available cooking recipe."};
 const pack=inventory.map(item=>item?{...item}:null);
 const supplies={...pile.items};
 for(const [id,amount] of Object.entries(recipe.cost)){
  const available=countItem(pack,id)+(stockpileCount(pile,id));
  if(available<amount)return {ok:false,reason:"Missing "+(amount-available)+" "+id.replaceAll("_"," ")+".",missing:id};
 }
 // Reserve all costs on copies, including stockpile firewood.
 for(const [id,amount] of Object.entries(recipe.cost)){
  const used=Math.min(countItem(pack,id),amount);
  if(used)removeItems(pack,id,used);
  supplies[canonicalItem(id)]-=amount-used;
 }
 const produced=addItems(pack,recipe.output.id,recipe.output.qty);
 if(produced!==recipe.output.qty)return {ok:false,reason:"Backpack full. Make space for the prepared meal."};
 return {ok:true,pack,supplies,recipe};
}
