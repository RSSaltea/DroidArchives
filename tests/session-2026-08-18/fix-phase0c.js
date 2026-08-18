// You cannot tell a droid which slot to take — the game decides. You CAN choose
// which droid to pull out, so every instruction has to be phrased as a removal,
// and the only way to fill one particular slot is to make it the sole free one
// and then send a droid. Phase 0 was asking for placements that cannot be made.
const fs=require('fs');
const APP='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js';
let s=fs.readFileSync(APP,'utf8');
const NL='\r\n';
const sub=(from,to)=>{const n=s.split(from).length-1;if(n!==1){console.error('MATCHED '+n+'x:\n'+from.slice(0,160));process.exit(1)}s=s.split(from).join(to)};

// Spell the technique out once, at the top of the phase.
sub("    note:[W.note,L.note].filter(Boolean).join(' '),",
    "    note:'You cannot choose which slot a droid goes into — the game decides that, and it is the whole thing being measured. You can choose which droid to take out, so to fill one particular slot, make it the only free one in that station and then send a droid to work. Every step below is written as a removal for that reason.'+[W.note,L.note].filter(Boolean).join(' '),");

// P0-3: use whichever ground-floor Lounge droid is there, rather than placing one.
sub("        ...(loungeGround.length?[rec('P0-3','Put a Battle droid in Lounge slot '+loungeGround[0]+' — ground floor — and send it to work from there.','Which Battle slot did it take?','Put it back in that same Lounge slot.')]:[]),",
    "        ...(loungeGround.length?[rec('P0-3','Take a Battle droid sitting anywhere in the ground-floor part of the Lounge — slots '+loungeGround[0]+' to '+loungeGround[loungeGround.length-1]+' — and send it to work.','Which Battle slot did it take?','Pull it straight back out to the Lounge, so Battle '+B.first+' and Battle '+B.last+' are the only free Battle slots again.')]:[]),");

// P0-4: restoring means making the vacated slot the only free one again.
sub("        ...(battleUpstairs.length?[rec('P0-4','Now go upstairs to the Battle droid already sitting in Battle '+battleUpstairs[0]+' and tell it to go to work again. It will leave that slot and choose between the two free ones — this is the only way to start a droid on the upper floor.','Which Battle slot did it take?','Put it back in Battle '+battleUpstairs[0]+'.')]:[]),",
    "        ...(battleUpstairs.length?[rec('P0-4','Now go upstairs to the Battle droid already sitting in Battle '+battleUpstairs[0]+' and tell it to go to work again. It leaves that slot and picks one of the two free ones — this is the only way to start a droid on the upper floor.','Which Battle slot did it take?','Pull it back out to the Lounge. Battle '+battleUpstairs[0]+' is now empty too, so refill it by leaving it as the only free Battle slot and sending one droid, then free '+B.first+' and '+B.last+' again.')]:[]),");

// P0-5: you cannot put a droid into Worker slot 1, so use one already out there.
sub("        ...(W.have.length?[rec('P0-5','Now put a Battle droid in Worker slot '+W.first+', right across the Base, and tell it to go to work from there. Battle has room, so it will leave Worker for it.','Which Battle slot did it take?','Put everything back.')]:[]),",
    "        ...(W.have.length?[rec('P0-5','If you happen to have a Battle droid already sitting in a Worker or Astromech slot — they end up there when Battle is full — tell that one to go to work. It starts from right across the Base. If you have not got one, leave this blank: the two runs above already answer the question.','Which Battle slot did it take?','Pull it back out to the Lounge.')]:[]),");

sub("        {id:'P0-undo',kind:'undo',text:'Refill Battle. If all of those landed in the same slot, the starting spot does not matter and a fixed order is safe to build on. They also settle whether Battle '+B.first+' beats Battle '+B.last+', which none of your earlier tests covered.'}]:[])]});",
    "        {id:'P0-undo',kind:'undo',text:'Refill Battle, one slot at a time if you need particular droids in particular places. If those runs all landed in the same slot, the starting spot does not matter and a fixed order is safe to build on. If they did not, stop and tell me — the order is not fixed and the sweeps below would be measuring the wrong thing.'}]:[])]});");

fs.writeFileSync(APP,s,'utf8');
console.log('Phase 0 is now all removals, and P0-5 no longer asks for the impossible');
