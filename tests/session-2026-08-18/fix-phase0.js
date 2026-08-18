// Phase 0 asked you to stand somewhere and send a droid from the Lounge, which
// cannot be done — you have to walk to the droid to give it the order, so your
// position is always the droid's position. The question that can actually be
// answered is whether the DROID's starting spot changes the answer, which is
// also the one that matters.
const fs=require('fs');
let s=fs.readFileSync('c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js','utf8');
const NL='\r\n';
const sub=(from,to)=>{const n=s.split(from).length-1;if(n!==1){console.error('MATCHED '+n+'x:\n'+from.slice(0,150));process.exit(1)}s=s.split(from).join(to)};

// Which Lounge slots are on which floor, so the run can name a real one.
sub("  const W=slotLabRange('WORKER'),A=slotLabRange('ASTROMECH'),B=slotLabRange('BATTLE'),L=slotLabRange('LOUNGE');",
[ "  const W=slotLabRange('WORKER'),A=slotLabRange('ASTROMECH'),B=slotLabRange('BATTLE'),L=slotLabRange('LOUNGE');",
  "  // The Lounge is itself split over two floors, and it is the only place you can",
  "  // send a droid from that lets you change floor — so it stands in for testing",
  "  // whether height matters at all.",
  "  const loungeGround=L.have.filter(slot=>loungeSlotMeta(slot-1).kind==='base');",
  "  const loungeUpper=L.have.filter(slot=>loungeSlotMeta(slot-1).kind==='rebirth');"].join(NL));

sub("    why:'If the answer moves with you, or with where the droid started, then no fixed list of slots can be right and everything below is measuring the wrong thing. These are the cheapest runs here and they rule it out.',",
    "    why:'You have to walk to a droid to give it an order, so you can never choose where you are standing independently of where it is. The question that can be answered is whether the DROID\\u2019s starting spot changes where it lands \\u2014 across the Base, and up a floor. If it does, no fixed list of slots can be right and everything below is measuring the wrong thing.',");

// The two Worker runs already done stay exactly as they are, ids and all, so the
// answers already recorded against them are not lost.
sub("        rec('P0-2','Now send the droid in Lounge slot '+L.last+' — the far end of the Lounge you have — to work.','Which Worker slot did it take?','Send it back to the Lounge. If this differs from the run above, stop and tell me: the order is not fixed and the rest of this changes.')]:[]),",
    "        rec('P0-2','Now send the droid in Lounge slot '+L.last+' — the far end of the Lounge you have — to work.','Which Worker slot did it take?','Send it back to the Lounge. If this differs from the run above, stop and tell me: the order is not fixed and the rest of this changes.')]:[]),");

sub([ "      ...(canFloor?[",
  "        {id:'P0-set2',kind:'setup',text:'Refill Worker completely. Now free Battle '+B.first+' and Battle '+B.last+' only, parking those two droids in the Lounge.'},",
  "        rec('P0-3','Stand downstairs and send a Battle droid from the Lounge to work.','Which Battle slot did it take?','Send it back to the Lounge.'),",
  "        rec('P0-4','Go upstairs and send another Battle droid from the Lounge to work.','Which Battle slot did it take?','Send it back to the Lounge.'),",
  "        {id:'P0-undo',kind:'undo',text:'Put both Battle droids back so Battle is full again. Runs 3 and 4 also settle whether Battle '+B.first+' beats Battle '+B.last+', which none of your earlier tests covered.'}]:[])]});"].join(NL),
[ "      ...(canFloor?[",
  "        {id:'P0-set2',kind:'setup',text:'Refill Worker completely. Now free Battle '+B.first+' and Battle '+B.last+' only, parking those two droids in the Lounge. Each run below sends a Battle droid from a different starting spot — you walk to the droid each time, so the droid\\u2019s spot is the only thing changing.'},",
  "        ...(loungeGround.length?[rec('P0-3','Put a Battle droid in Lounge slot '+loungeGround[0]+' — ground floor — and send it to work from there.','Which Battle slot did it take?','Put it back in that same Lounge slot.')]:[]),",
  "        ...(loungeUpper.length?[rec('P0-4','Now put a Battle droid in Lounge slot '+loungeUpper[0]+', the first one under Upper Level, and send it to work from up there. This is the only way to change floor, since you always stand where the droid is.','Which Battle slot did it take?','Put it back in that Lounge slot.')]:[]),",
  "        ...(W.have.length?[rec('P0-5','Now put a Battle droid in Worker slot '+W.first+', right across the Base, and tell it to go to work from there. Battle has room, so it will leave Worker for it.','Which Battle slot did it take?','Put everything back.')]:[]),",
  "        {id:'P0-undo',kind:'undo',text:'Refill Battle. If all of those landed in the same slot, the starting spot does not matter and a fixed order is safe to build on. They also settle whether Battle '+B.first+' beats Battle '+B.last+', which none of your earlier tests covered.'}]:[])]});"].join(NL));

fs.writeFileSync('c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js',s,'utf8');
console.log('Phase 0 rebuilt around what is actually performable');
