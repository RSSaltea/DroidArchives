// The recording box on each "go to work" step, the track toggle on Optimise, and
// the findings table on the Slot Lab.
const fs=require('fs');
const APP='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js';
let s=fs.readFileSync(APP,'utf8');
const NL='\r\n', J=a=>a.join(NL);
const sub=(from,to)=>{const n=s.split(from).length-1;if(n!==1){console.error('MATCHED '+n+'x:\n'+from.slice(0,170));process.exit(1)}s=s.split(from).join(to)};

// A box on every step that sends a droid to work, so following the plan records data.
sub("  return `${tick}<span class=\"step-thumb\">${d?picture(d,step.unit.variant):''}</span><span class=\"step-text\">${text}${assumed}</span>${skip}`;",
J([ "  // Following a plan is the cheapest way to gather slot-choice data, so each",
    "  // send-to-work step can record where the droid actually ended up.",
    "  const logged=step.logged?`<b class=\"step-logged\">landed in ${step.to==='LOUNGE'?'Lounge':stationName(step.to)} ${step.logged}</b>`:'';",
    "  const record=step.kind==='work'&&slotLogTracking()&&slotLabAllowed()&&Number.isInteger(step.fromSlot)",
    "    ?`<label class=\"step-record\">${logged?'':`<small>Landed in?</small><input type=\"text\" inputmode=\"numeric\" placeholder=\"slot\" data-log-step=\"${escapeAttr(step.text)}\">`}${logged}</label>`:'';",
    "  return `${tick}<span class=\"step-thumb\">${d?picture(d,step.unit.variant):''}</span><span class=\"step-text\">${text}${assumed}</span>${record}${skip}`;"]));

// Track toggle, and the handler that writes a row.
sub("  document.querySelectorAll('[data-step-tick]').forEach(box=>box.onclick=e=>{",
J([ "  // Owner only: arm tracking, then every send-to-work step offers a box.",
    "  const trackHost=document.querySelector('#optimiseTrack');",
    "  if(trackHost&&slotLabAllowed()){",
    "    trackHost.hidden=false;",
    "    const button=trackHost.querySelector('button');",
    "    button.textContent=slotLogTracking()?'Tracking slots · on':'Track slot choices';",
    "    button.classList.toggle('active',slotLogTracking());",
    "    trackHost.querySelector('small').textContent=`${slotLogAll().length} landings recorded`;",
    "    button.onclick=()=>{slotLogSetTracking(!slotLogTracking());rerender()};",
    "  }",
    "  // Slots this plan has already filled are no longer free for the next droid.",
    "  const takenThisPlan={};",
    "  document.querySelectorAll('[data-log-step]').forEach(input=>{",
    "    input.onchange=()=>{",
    "      const step=steps.find(x=>x.text===input.dataset.logStep);",
    "      const landed=Number(input.value.trim())-1;",
    "      if(!step||!Number.isInteger(landed)||landed<0)return;",
    "      const taken=takenThisPlan[step.to]||(takenThisPlan[step.to]=[]);",
    "      const free=slotLogFree(step.to,taken);",
    "      if(!slotLogAdd({station:step.to,fromStation:step.from,fromSlot:step.fromSlot,free,landed,droid:step.unit?.name||''})){",
    "        toast(`${stationName(step.to)} ${landed+1} was not free — update your Base first`);",
    "        input.value='';return;",
    "      }",
    "      taken.push(landed);",
    "      step.logged=landed+1;",
    "      toast('Landing recorded');",
    "      rerender();",
    "    };",
    "  });",
    "  document.querySelectorAll('[data-step-tick]').forEach(box=>box.onclick=e=>{"]));

fs.writeFileSync(APP,s,'utf8');
console.log('step recording and track toggle wired');
