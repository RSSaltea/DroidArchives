// Phase 0 showed the answer depends on where the droid starts, so the starting
// slot is data, not context — every run records it, sweeps included. Without it
// a sweep only measures "the order when starting from wherever I happened to be".
const fs=require('fs');
const APP='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js';
let s=fs.readFileSync(APP,'utf8');
const NL='\r\n';
const sub=(from,to)=>{const n=s.split(from).length-1;if(n!==1){console.error('MATCHED '+n+'x:\n'+from.slice(0,160));process.exit(1)}s=s.split(from).join(to)};

// Sweeps: note which Lounge slot each droid was sent from.
sub("  range.have.forEach((slot,i)=>steps.push({id:id+'-'+(i+1),kind:'record',",
    "  range.have.forEach((slot,i)=>steps.push({id:id+'-'+(i+1),kind:'record',askFrom:'Which Lounge slot did it come from?',");

// Phase A: the third box.
sub("  const rec=(id,text,ask,undo,ask2)=>({id,kind:'record',text,ask,undo,ask2});",
    "  const rec=(id,text,ask,undo,ask2,askFrom)=>({id,kind:'record',text,ask,undo,ask2,askFrom});");
// All three Phase A runs end the same way, so this one is a replace-all.
const three="'Which two slots were free?'),";
if(s.split(three).length-1!==3){console.error('expected 3 Phase A runs');process.exit(1)}
s=s.split(three).join("'Which two slots were free?','Which Lounge slot did the droid start in?'),");

// Render it first — it is the first thing you know about a run.
sub("    const setup=step.ask2?",
[ "    const origin=step.askFrom?'<label class=\"lab-answer\"><small>'+step.askFrom+'</small><input type=\"text\" placeholder=\"slot\" data-lab-input=\"'+escapeAttr(step.id+':from')+'\" value=\"'+escapeAttr(values[step.id+':from']||'')+'\"></label>':'';",
  "    const setup=step.ask2?"].join(NL));
sub("+undo+setup+input+'</div></li>';","+undo+origin+setup+input+'</div></li>';");

// Report: pair each landing with where it started.
sub("    if(phase.id.indexOf('PB-')===0)lines.push('  landing order: '+phase.steps.filter(s=>s.kind==='record').map(s=>values[s.id]||'?').join(', '));",
[ "    if(phase.id.indexOf('PB-')===0){",
  "      const rows=phase.steps.filter(s=>s.kind==='record');",
  "      const traced=rows.some(s=>values[s.id+':from']);",
  "      lines.push('  landing order: '+rows.map(s=>traced?(values[s.id+':from']||'?')+' -> '+(values[s.id]||'?'):(values[s.id]||'?')).join(', '));",
  "      if(traced)lines.push('  (read as: started in Lounge slot -> landed in slot)');",
  "    }"].join(NL));
sub("    else for(const step of answered)lines.push('  '+step.id+': '+(values[step.id+':free']?'free '+values[step.id+':free']+' -> ':'')+values[step.id]);",
[ "    else for(const step of answered){",
  "      const bits=[];",
  "      if(values[step.id+':from'])bits.push('from Lounge '+values[step.id+':from']);",
  "      if(values[step.id+':free'])bits.push('free '+values[step.id+':free']);",
  "      lines.push('  '+step.id+': '+(bits.length?bits.join(', ')+' -> ':'')+values[step.id]);",
  "    }"].join(NL));

fs.writeFileSync(APP,s,'utf8');
console.log('every run now records where the droid started');
