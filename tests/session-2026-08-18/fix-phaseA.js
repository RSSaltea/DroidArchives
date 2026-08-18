// Phase A named the exact slots to free, but you cannot put a droid back into a
// given slot, so restoring that exact pair between runs is a fight. What the
// result actually depends on is which pair was free — so let any convenient pair
// be used and record it alongside the landing.
const fs=require('fs');
const APP='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js';
let s=fs.readFileSync(APP,'utf8');
const NL='\r\n';
const sub=(from,to)=>{const n=s.split(from).length-1;if(n!==1){console.error('MATCHED '+n+'x:\n'+from.slice(0,160));process.exit(1)}s=s.split(from).join(to)};

// A record step can now ask a second thing.
sub("  const rec=(id,text,ask,undo)=>({id,kind:'record',text,ask,undo});",
    "  const rec=(id,text,ask,undo,ask2)=>({id,kind:'record',text,ask,undo,ask2});");

// Relax the three runs: any Astromech/Battle pair will do, as long as we know which.
sub("      rec('PA-1','Free Astromech '+A.first+' and Battle '+B.first+' only. Send the spare Worker droid to work.','Where did it land?','Put it back in the Lounge and refill both slots.'),",
    "      rec('PA-1','Leave exactly one Astromech slot and one Battle slot free — whichever two are easiest to arrange — and send the spare Worker droid to work.','Where did it land?','Put it back in the Lounge.','Which two slots were free?'),");
sub("      rec('PA-2','Free Astromech '+A.last+' and Battle '+B.first+' only. Send the spare Worker droid to work.','Where did it land?','Put it back in the Lounge and refill both slots.'),",
    "      rec('PA-2','Now do it again with a different Astromech slot free — ideally one at the far end from last time — and one Battle slot. Send the spare Worker droid to work.','Where did it land?','Put it back in the Lounge.','Which two slots were free?'),");
sub("      rec('PA-3','Free Astromech '+A.first+' and Battle '+B.last+' only. Send the spare Worker droid to work.','Where did it land?','Put it back in the Lounge and refill both slots.'),",
    "      rec('PA-3','Once more, this time changing which Battle slot is free — an upstairs one is the most useful — with one Astromech slot. Send the spare Worker droid to work.','Where did it land?','Put it back in the Lounge.','Which two slots were free?'),");

sub("      {id:'PA-set',kind:'setup',text:'Fill every Worker slot, so a Worker droid cannot go home, and keep one spare Worker droid in the Lounge to send.'},",
    "      {id:'PA-set',kind:'setup',text:'Fill every Worker slot, so a Worker droid cannot go home, and keep one spare Worker droid in the Lounge to send. The exact pair of slots you free does not matter as long as you write down which pair it was — that is what the answer depends on.'},");

sub("      {id:'PA-undo',kind:'undo',text:'Refill everything. If all three landed in Astromech the choice is by station, so you can skip Phase C — tell me and you are finished after Phase B.'}]});",
    "      {id:'PA-undo',kind:'undo',text:'Refill everything. If it went to Astromech every time whichever slots were free, the choice is by station. If it followed a particular slot around, it is choosing by distance.'}]});");

// Second input, and both answers in the report.
sub("    const input=step.kind==='record'?'<label class=\"lab-answer\"><small>'+step.ask+'</small><input type=\"text\" inputmode=\"numeric\" placeholder=\"slot\" data-lab-input=\"'+escapeAttr(step.id)+'\" value=\"'+escapeAttr(values[step.id]||'')+'\"></label>':'';",
[ "    const input=step.kind==='record'?'<label class=\"lab-answer\"><small>'+step.ask+'</small><input type=\"text\" inputmode=\"numeric\" placeholder=\"slot\" data-lab-input=\"'+escapeAttr(step.id)+'\" value=\"'+escapeAttr(values[step.id]||'')+'\"></label>':'';",
  "    // Some runs depend on which slots were free, so that gets written down too.",
  "    const setup=step.ask2?'<label class=\"lab-answer wide\"><small>'+step.ask2+'</small><input type=\"text\" placeholder=\"e.g. Astromech 3, Battle 7\" data-lab-input=\"'+escapeAttr(step.id+':free')+'\" value=\"'+escapeAttr(values[step.id+':free']||'')+'\"></label>':'';"].join(NL));
sub("    return '<li class=\"lab-step '+step.kind+(done.has(step.id)?' is-done':'')+'\">'+tick+'<div><p>'+verb+' '+step.text+'</p>'+undo+input+'</div></li>';",
    "    return '<li class=\"lab-step '+step.kind+(done.has(step.id)?' is-done':'')+'\">'+tick+'<div><p>'+verb+' '+step.text+'</p>'+undo+setup+input+'</div></li>';");
sub("    else for(const step of answered)lines.push('  '+step.id+': '+values[step.id]);",
    "    else for(const step of answered)lines.push('  '+step.id+': '+(values[step.id+':free']?'free '+values[step.id+':free']+' -> ':'')+values[step.id]);");

fs.writeFileSync(APP,s,'utf8');
console.log('Phase A now records which slots were free');
