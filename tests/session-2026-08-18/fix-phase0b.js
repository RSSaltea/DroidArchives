// The Lounge's "Upper Level" is the upper circle on the map, not a storey, so
// sending from it changes nothing about height. The only real second floor is
// upstairs Battle — so the way to start a droid up there is to use one that is
// already in an upstairs Battle slot and tell it to go to work again. Under the
// reroute rule it leaves that slot and picks from what is free, which is exactly
// the comparison we want, made from upstairs.
const fs=require('fs');
const APP='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js';
let s=fs.readFileSync(APP,'utf8');
const NL='\r\n';
const sub=(from,to)=>{const n=s.split(from).length-1;if(n!==1){console.error('MATCHED '+n+'x:\n'+from.slice(0,160));process.exit(1)}s=s.split(from).join(to)};

sub([ "  const loungeGround=L.have.filter(slot=>loungeSlotMeta(slot-1).kind==='base');",
  "  const loungeUpper=L.have.filter(slot=>loungeSlotMeta(slot-1).kind==='rebirth');"].join(NL),
[ "  const loungeGround=L.have.filter(slot=>loungeSlotMeta(slot-1).kind==='base');",
  "  // A Battle slot upstairs that is not one of the two being compared, so a droid",
  "  // parked there can be told to work and will choose between the free pair.",
  "  const battleUpstairs=B.have.filter(slot=>slot>BATTLE_UPSTAIRS_FROM&&slot!==B.first&&slot!==B.last);"].join(NL));

sub("        ...(loungeUpper.length?[rec('P0-4','Now put a Battle droid in Lounge slot '+loungeUpper[0]+', the first one under Upper Level, and send it to work from up there. This is the only way to change floor, since you always stand where the droid is.','Which Battle slot did it take?','Put it back in that Lounge slot.')]:[]),",
    "        ...(battleUpstairs.length?[rec('P0-4','Now go upstairs to the Battle droid already sitting in Battle '+battleUpstairs[0]+' and tell it to go to work again. It will leave that slot and choose between the two free ones — this is the only way to start a droid on the upper floor.','Which Battle slot did it take?','Put it back in Battle '+battleUpstairs[0]+'.')]:[]),");

sub("        {id:'P0-set2',kind:'setup',text:'Refill Worker completely. Now free Battle '+B.first+' and Battle '+B.last+' only, parking those two droids in the Lounge. Each run below sends a Battle droid from a different starting spot — you walk to the droid each time, so the droid\\u2019s spot is the only thing changing.'},",
    "        {id:'P0-set2',kind:'setup',text:'Refill Worker completely. Now free Battle '+B.first+' and Battle '+B.last+' only, parking those two droids in the Lounge. Each run below starts a Battle droid somewhere different — you walk to the droid to give the order, so its spot is the only thing changing.'},");

fs.writeFileSync(APP,s,'utf8');
console.log('P0-4 now starts the droid on the actual upper floor');
