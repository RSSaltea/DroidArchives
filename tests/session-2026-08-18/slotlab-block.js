// ─── Slot Lab ───────────────────────────────────────────────────────────────
// A guided run-through for measuring how the game itself chooses a slot. The map
// positions are placed by hand and only ever approximate, so the fill order has
// to be measured rather than read off them. Every step says what to set up, what
// to do, and how to put the base back for the next one.
//
// Personal tool, hidden unless the signed-in account owns it. This is a static
// site, so that hides the page rather than protecting it — there is nothing here
// worth protecting, only clutter worth keeping out of everyone else's way.
const SLOT_LAB_OWNERS=['xraffo@gmail.com'];
// gmail and googlemail are one account and either can be the address you signed
// in with, so compare a normalised form rather than the raw text.
const normaliseEmail=email=>String(email||'').trim().toLowerCase().replace(/@googlemail\.com$/,'@gmail.com');
const slotLabAllowed=()=>SLOT_LAB_OWNERS.includes(normaliseEmail(galacticUserEmail()));
// Every slot a station has once everything is unlocked, which is what these runs
// assume.
const slotLabSlotCount=station=>{const rule=SLOT_RULES[station];return rule?rule.initial+rule.unlocks.length:0};
const slotLabRead=()=>{try{return JSON.parse(localStorage.getItem('droid-archive-slot-lab')||'{}')||{}}catch(e){return{}}};
const slotLabWrite=data=>{try{localStorage.setItem('droid-archive-slot-lab',JSON.stringify(data))}catch(e){}};

// A sweep is one set-up, then a landing to write down for each free slot, then
// one restore. You do not put the base back between placements, only after.
function slotLabSweep(id,title,why,setup,act,undo,count,note){
  const steps=[{id:id+'-set',kind:'setup',text:setup}];
  for(let i=1;i<=count;i++)steps.push({id:id+'-'+i,kind:'record',
    text:act+' Droid '+i+' of '+count+'.',
    ask:i===1?'Which slot did the first one take?':'Which slot did droid '+i+' take?'});
  steps.push({id:id+'-undo',kind:'undo',text:undo});
  return{id,title,why,note,steps};
}

function slotLabProtocol(){
  const n={WORKER:slotLabSlotCount('WORKER'),ASTROMECH:slotLabSlotCount('ASTROMECH'),
    BATTLE:slotLabSlotCount('BATTLE'),LOUNGE:slotLabSlotCount('LOUNGE')};
  const rec=(id,text,ask,undo)=>({id,kind:'record',text,ask,undo});
  const phases=[];

  phases.push({id:'P0',title:'Phase 0 · Does where you stand change the answer?',
    why:'If the answer moves with you, or with where the droid started, then no fixed list of slots can be right and everything below is measuring the wrong thing. These are the cheapest runs here and they rule it out.',
    steps:[
      {id:'P0-set',kind:'setup',text:'Park two droids in the Lounge so Worker 1 and Worker '+n.WORKER+' are the only free Worker slots. Every other Worker slot stays filled.'},
      rec('P0-1','Stand beside the Lounge and send the droid in Lounge slot 1 to work.','Which Worker slot did it take?','Send it straight back to the Lounge.'),
      rec('P0-2','Now send the droid in Lounge slot '+n.LOUNGE+' — the far end — to work.','Which Worker slot did it take?','Send it back to the Lounge. If this differs from the run above, stop and tell me: the order is not fixed and the rest of this changes.'),
      {id:'P0-set2',kind:'setup',text:'Refill Worker completely. Now free Battle 1 and Battle '+n.BATTLE+' only, parking those two droids in the Lounge.'},
      rec('P0-3','Stand downstairs and send a Battle droid from the Lounge to work.','Which Battle slot did it take?','Send it back to the Lounge.'),
      rec('P0-4','Go upstairs and send another Battle droid from the Lounge to work.','Which Battle slot did it take?','Send it back to the Lounge.'),
      {id:'P0-undo',kind:'undo',text:'Put both Battle droids back so Battle is full again. Runs 3 and 4 also settle whether Battle 1 beats Battle '+n.BATTLE+', which none of your earlier tests covered.'}]});

  phases.push({id:'PA',title:'Phase A · Cross-station: by station, or by slot?',
    why:'When a droid cannot get into its own station it goes elsewhere. If it prefers Astromech over Battle no matter which slots are open, that is a fixed station order and Phase C disappears entirely. If the winner moves with the slot, it is choosing by distance and Phase C is needed.',
    steps:[
      {id:'PA-set',kind:'setup',text:'Fill every Worker slot, so a Worker droid cannot go home, and keep one spare Worker droid in the Lounge to send.'},
      rec('PA-1','Free Astromech 3 and Battle 1 only. Send the spare Worker droid to work.','Where did it land?','Put it back in the Lounge and refill Astromech 3 and Battle 1.'),
      rec('PA-2','Free Astromech '+n.ASTROMECH+' and Battle 1 only. Send the spare Worker droid to work.','Where did it land?','Put it back in the Lounge and refill both slots.'),
      rec('PA-3','Free Astromech 3 and Battle '+n.BATTLE+' only. Send the spare Worker droid to work.','Where did it land?','Put it back in the Lounge and refill both slots.'),
      {id:'PA-undo',kind:'undo',text:'Refill everything. If all three landed in Astromech the choice is by station, so you can skip Phase C — tell me and you are finished after Phase B.'}]});

  phases.push(slotLabSweep('PB-WORKER','Phase B1 · Worker slot order',
    'Emptying only Worker means a Worker droid goes straight home, so each placement names the best slot still free. That is the whole order in one pass, instead of 55 pairwise tests.',
    'Move every Worker droid into the Lounge so all Worker slots are free. Leave every other station exactly as it is.',
    'Send one Worker droid from the Lounge to work and note the slot it takes.',
    'Leave Worker filled as it now stands — the next sweep does not need it emptied.',n.WORKER));

  phases.push(slotLabSweep('PB-ASTRO','Phase B2 · Astromech slot order',
    'Same idea. This one also shows whether the mission slots really are 1, 3, 5, 7 and 9.',
    'Move every Astromech droid into the Lounge so all Astromech slots are free. Leave the other stations alone.',
    'Send one Astromech droid from the Lounge to work and note the slot it takes.',
    'Leave Astromech as it now stands.',n.ASTROMECH));

  phases.push(slotLabSweep('PB-BATTLE','Phase B3 · Battle slot order',
    'The important one. Battle runs over two floors, and this settles the entire order in a single pass — including whether downstairs really is always preferred.',
    'Move every Battle droid into the Lounge so all Battle slots are free, both floors. Leave the other stations alone.',
    'Send one Battle droid from the Lounge to work and note the slot it takes.',
    'Leave Battle as it now stands.',n.BATTLE,
    'Slots 1 to '+BATTLE_UPSTAIRS_FROM+' are downstairs, '+(BATTLE_UPSTAIRS_FROM+1)+' to '+n.BATTLE+' are upstairs.'));

  phases.push(slotLabSweep('PB-LOUNGE','Phase B4 · Lounge slot order',
    'Do this last: the Lounge is the parking space for every sweep above, so it has to be clear of them first. Your note about a droid landing in Lounge 8 suggests the Lounge may fill downwards — if the first placement here lands in the highest slot, that is confirmed and the app currently has it backwards.',
    'Send every droid in the Lounge back to work first, so the Lounge is completely empty.',
    'Send one droid from a credit station to the Lounge and note the slot it takes.',
    'Put the base back however you like it. Phase B is done.',n.LOUNGE));

  phases.push({id:'PC',title:'Phase C · Cross-station order — only if Phase A disagreed',
    why:'Skip this entirely if Phase A landed in Astromech all three times. It is only needed if the game picks by distance, in which case we need the order over the other two stations as each type of droid sees it. The first six placements are the ones that matter — that is the range the optimiser actually works in, so a partial answer here is worth far more than a complete one you never finish.',
    steps:[
      {id:'PC-set',kind:'setup',text:'Fill every Worker slot. Empty Astromech and Battle completely. Keep your spare Worker droids in the Lounge.'},
      {id:'PC-W-1',kind:'record',text:'Send a Worker droid from the Lounge to work. Droid 1 of 6.',ask:'Where did it land?'},
      {id:'PC-W-2',kind:'record',text:'Send another Worker droid to work. Droid 2 of 6.',ask:'Where did droid 2 land?'},
      {id:'PC-W-3',kind:'record',text:'Send another Worker droid to work. Droid 3 of 6.',ask:'Where did droid 3 land?'},
      {id:'PC-W-4',kind:'record',text:'Send another Worker droid to work. Droid 4 of 6.',ask:'Where did droid 4 land?'},
      {id:'PC-W-5',kind:'record',text:'Send another Worker droid to work. Droid 5 of 6.',ask:'Where did droid 5 land?'},
      {id:'PC-W-6',kind:'record',text:'Send another Worker droid to work. Droid 6 of 6.',ask:'Where did droid 6 land?'},
      {id:'PC-undo',kind:'undo',text:'Refill Astromech and Battle. If you have the spare droids, repeat the same six with Astromech droids (Astromech full, Worker and Battle empty) and then with Battle droids — otherwise send what you have and stop there.'}]});

  return phases;
}

// What you paste back to me. Only phases you have actually started show up.
function slotLabReport(phases,values){
  const lines=[];
  for(const phase of phases){
    const answered=phase.steps.filter(s=>s.kind==='record'&&values[s.id]);
    if(!answered.length)continue;
    lines.push(phase.title.replace(/^Phase [^·]*· /,''));
    if(phase.id.indexOf('PB-')===0)lines.push('  landing order: '+phase.steps.filter(s=>s.kind==='record').map(s=>values[s.id]||'?').join(', '));
    else for(const step of answered)lines.push('  '+step.id+': '+values[step.id]);
    lines.push('');
  }
  return lines.length?lines.join('\n').trim():'Nothing recorded yet.';
}

function slotLabPage(){
  if(!slotLabAllowed()){notFound();return}
  const phases=slotLabProtocol();
  const store=slotLabRead(),values=store.values||{},done=new Set(store.done||[]);
  const persist=()=>slotLabWrite({values,done:[...done]});
  const recordSteps=phases.flatMap(p=>p.steps.filter(s=>s.kind==='record'));
  const answered=recordSteps.filter(s=>values[s.id]).length;

  const stepHtml=step=>{
    const tick='<label class="step-tick" title="Mark this step as done"><input type="checkbox" data-lab-tick="'+escapeAttr(step.id)+'" '+(done.has(step.id)?'checked':'')+'><span></span></label>';
    const verb=step.kind==='setup'?'<span class="lab-verb setup">Set up</span>':step.kind==='undo'?'<span class="lab-verb undo">Put it back</span>':'<span class="lab-verb run">Run</span>';
    const undo=step.undo?'<small class="lab-undo">Then: '+step.undo+'</small>':'';
    const input=step.kind==='record'?'<label class="lab-answer"><small>'+step.ask+'</small><input type="text" inputmode="numeric" placeholder="slot" data-lab-input="'+escapeAttr(step.id)+'" value="'+escapeAttr(values[step.id]||'')+'"></label>':'';
    return '<li class="lab-step '+step.kind+(done.has(step.id)?' is-done':'')+'">'+tick+'<div><p>'+verb+' '+step.text+'</p>'+undo+input+'</div></li>';
  };
  const phaseHtml=phase=>'<section class="lab-phase"><h2>'+phase.title+'</h2><p class="lab-why">'+phase.why+'</p>'+(phase.note?'<p class="notice">'+phase.note+'</p>':'')+'<ol class="lab-steps">'+phase.steps.map(stepHtml).join('')+'</ol></section>';

  app.innerHTML='<div class="breadcrumbs"><a href="#/">Homepage</a> / Slot Lab</div>'+
    '<section class="base-heading"><div><p class="eyebrow">Private tool</p><h1>Slot Lab</h1>'+
    '<p class="lead">Measuring how the game picks a slot, rather than guessing it from map dots placed by hand. Work down the list — every step says what to set up, what to do, and how to put the base back for the next one.</p></div>'+
    '<div class="lab-actions"><button class="btn" id="labCopy">Copy results</button><button class="btn ghost" id="labReset">Start over</button></div></section>'+
    '<div class="notice">These runs assume every slot is unlocked. <strong>'+answered+' of '+recordSteps.length+'</strong> landings recorded.</div>'+
    phases.map(phaseHtml).join('')+
    '<section class="lab-phase"><h2>Results so far</h2><p class="lab-why">Paste this back to me. Phases you have not started are left out.</p>'+
    '<textarea class="form-control lab-output" id="labOutput" readonly rows="10">'+escapeAttr(slotLabReport(phases,values))+'</textarea></section>';

  const refresh=()=>{const out=document.querySelector('#labOutput');if(out)out.value=slotLabReport(phases,values)};
  app.querySelectorAll('[data-lab-input]').forEach(input=>{
    input.oninput=()=>{const value=input.value.trim();if(value)values[input.dataset.labInput]=value;else delete values[input.dataset.labInput];persist();refresh()};
  });
  app.querySelectorAll('[data-lab-tick]').forEach(box=>{
    box.onchange=()=>{if(box.checked)done.add(box.dataset.labTick);else done.delete(box.dataset.labTick);persist();box.closest('.lab-step').classList.toggle('is-done',box.checked)};
  });
  document.querySelector('#labCopy').onclick=async()=>{
    try{await navigator.clipboard.writeText(slotLabReport(phases,values));toast('Results copied')}
    catch(e){document.querySelector('#labOutput').select();toast('Copy the box at the bottom')}
  };
  document.querySelector('#labReset').onclick=()=>{
    if(!confirm('Clear every recorded landing and start the run again?'))return;
    slotLabWrite({values:{},done:[]});toast('Slot Lab cleared');slotLabPage();
  };
}

// The link only exists for the account that owns the tool.
function syncSlotLabNav(){
  const wanted=slotLabAllowed();
  for(const host of [document.querySelector('.site-header nav'),document.querySelector('.sidebar')]){
    if(!host)continue;
    const existing=host.querySelector('[data-slot-lab-link]');
    if(!wanted){existing&&existing.remove();continue}
    if(existing)continue;
    const link=document.createElement('a');
    link.href='#/slot-lab';link.dataset.slotLabLink='1';
    link.innerHTML=host.matches('.sidebar')?'⌗ <span>Slot Lab</span>':'Slot Lab';
    const before=host.querySelector('[href="#/donate"]');
    if(before)before.before(link);else host.append(link);
  }
}
