// Pick the landing from a list of the slots that were actually free, rather than
// typing a number and being told it was wrong. Also fixes the recorded landing
// vanishing on rerender: it was kept on the step object, and rerender rebuilds
// those from scratch.
const fs=require('fs');
const APP='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js';
let s=fs.readFileSync(APP,'utf8');
const NL='\r\n', J=a=>a.join(NL);
const sub=(from,to)=>{const n=s.split(from).length-1;if(n!==1){console.error('MATCHED '+n+'x:\n'+from.slice(0,170));process.exit(1)}s=s.split(from).join(to)};

// Landings recorded against the plan on screen. Step text is stable while the
// Base is, and the Base only changes when a layout is applied — which clears this.
sub("const SLOT_LOG_KEY='droid-archive-slot-log';",
J([ "const SLOT_LOG_KEY='droid-archive-slot-log';",
    "const slotLogSession=new Map();"]));

// Work out, in plan order, what was free for each send-to-work step.
sub("function slotLogAdd(row){",
J([ "// Each send-to-work step offers the slots free when its droid is sent, which",
    "// means minus anything an earlier step in the same plan has already been",
    "// recorded as taking.",
    "function annotateLogSlots(steps){",
    "  if(!slotLabAllowed()||!slotLogTracking())return;",
    "  const taken={};",
    "  for(const step of steps){",
    "    if(step.kind!=='work'||!Number.isInteger(step.fromSlot))continue;",
    "    const already=taken[step.to]||(taken[step.to]=[]);",
    "    step.freeSlots=slotLogFree(step.to,already);",
    "    step.logged=slotLogSession.get(step.text)??null;",
    "    if(Number.isInteger(step.logged))already.push(step.logged);",
    "  }",
    "}",
    "function slotLogAdd(row){"]));

// A dropdown of the free slots, not a text box.
sub(J([ "  const logged=step.logged?`<b class=\"step-logged\">landed in ${step.to==='LOUNGE'?'Lounge':stationName(step.to)} ${step.logged}</b>`:'';",
  "  const record=step.kind==='work'&&slotLogTracking()&&slotLabAllowed()&&Number.isInteger(step.fromSlot)",
  "    ?`<label class=\"step-record\">${logged?'':`<small>Landed in?</small><input type=\"text\" inputmode=\"numeric\" placeholder=\"slot\" data-log-step=\"${escapeAttr(step.text)}\">`}${logged}</label>`:'';"]),
J([ "  const free=step.freeSlots||[];",
  "  const options=free.map(slot=>`<option value=\"${slot}\" ${step.logged===slot?'selected':''}>${stationSlotLabel(step.to,slot)}</option>`).join('');",
  "  const record=step.kind==='work'&&slotLogTracking()&&slotLabAllowed()&&free.length",
  "    ?`<label class=\"step-record\"><small>Landed in?</small><select data-log-step=\"${escapeAttr(step.text)}\"><option value=\"\">${free.length} free…</option>${options}</select></label>`",
  "    :'';"]));

// Read the slot straight off the dropdown.
sub(J([ "  document.querySelectorAll('[data-log-step]').forEach(input=>{",
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
  "  });"]),
J([ "  document.querySelectorAll('[data-log-step]').forEach(picker=>{",
  "    picker.onchange=()=>{",
  "      const step=steps.find(x=>x.text===picker.dataset.logStep);",
  "      if(!step||picker.value==='')return;",
  "      const landed=Number(picker.value);",
  "      // The options came from the free set, so this cannot be an occupied slot.",
  "      slotLogAdd({station:step.to,fromStation:step.from,fromSlot:step.fromSlot,",
  "        free:step.freeSlots,landed,droid:step.unit?.name||''});",
  "      slotLogSession.set(step.text,landed);",
  "      toast(`Recorded · ${stationSlotLabel(step.to,landed)}`);",
  "      rerender();",
  "    };",
  "  });"]));
sub(J([ "  // Slots this plan has already filled are no longer free for the next droid.",
  "  const takenThisPlan={};"]),"");

fs.writeFileSync(APP,s,'utf8');
console.log('dropdown in, session state fixed');
