// Two problems with the sweeps as written. Worker has 11 slots but there are only
// 10 Lounge slots to park them in, so the station cannot be emptied; and the last
// placement was busywork, because once every other slot is spoken for the one
// still empty is the last in the order by elimination. Sending n-1 droids gives
// the same answer and needs one fewer parking space.
const fs=require('fs');
const APP='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js';
let s=fs.readFileSync(APP,'utf8');
const NL='\r\n';
const sub=(from,to)=>{const n=s.split(from).length-1;if(n!==1){console.error('MATCHED '+n+'x:\n'+from.slice(0,170));process.exit(1)}s=s.split(from).join(to)};

sub([ "  const steps=[{id:id+'-set',kind:'setup',text:setup}];",
  "  range.have.forEach((slot,i)=>steps.push({id:id+'-'+(i+1),kind:'record',askFrom:'Which Lounge slot did it come from?',",
  "    text:act+' Droid '+(i+1)+' of '+count+'.',",
  "    ask:i===0?'Which slot did the first one take?':'Which slot did droid '+(i+1)+' take?'}));",
  "  steps.push({id:id+'-undo',kind:'undo',text:undo});"].join(NL),
[ "  // One fewer send than there are slots: whichever slot is still empty at the",
  "  // end is the last in the order, and that also saves a parking space.",
  "  const sends=count-1;",
  "  const steps=[{id:id+'-set',kind:'setup',text:setup+' You need every one of these '+count+' droids out of the station, but only '+sends+' places to park them — if the Lounge is not big enough, make one your companion and use that as the overflow.'}];",
  "  for(let i=0;i<sends;i++)steps.push({id:id+'-'+(i+1),kind:'record',askFrom:'Which Lounge slot did it come from?',",
  "    text:act+' Droid '+(i+1)+' of '+sends+'.',",
  "    ask:i===0?'Which slot did the first one take?':'Which slot did droid '+(i+1)+' take?'});",
  "  steps.push({id:id+'-undo',kind:'undo',text:'The one slot still empty is the last in the order — write it in the box below rather than sending a droid for it. '+undo});",
  "  steps.push({id:id+'-last',kind:'record',askFrom:null,text:'Which slot was left over?',ask:'The slot nothing took'});"].join(NL));

fs.writeFileSync(APP,s,'utf8');
console.log('sweeps now send n-1 and name the leftover slot');
