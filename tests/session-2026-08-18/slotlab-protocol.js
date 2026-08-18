// The slots this Base actually has right now, as the Base numbers them — not the
// theoretical maximum. The Nova Shop Lounge slots especially are bought one at a
// time, so a run built around "all 13" asks you to use slots that do not exist.
const slotLabSlots=station=>stationSlotIndices(station).map(index=>index+1);
const slotLabCeiling=station=>{const rule=SLOT_RULES[station];return rule?rule.initial+rule.unlocks.length:0};
function slotLabRange(station){
  const have=slotLabSlots(station),ceiling=slotLabCeiling(station),missing=ceiling-have.length;
  const first=have[0],last=have[have.length-1];
  // Non-contiguous is normal once slots are bought out of order, so spell the
  // list out rather than implying a range.
  const runs=have.every((slot,i)=>i===0||slot===have[i-1]+1);
  const list=!have.length?'none':runs?(have.length===1?String(first):first+' to '+last):have.join(', ');
  return{have,ceiling,missing,first,last,list,
    note:missing?'This run covers '+stationName(station)+' '+list+'. The '+missing+' slot'+(missing===1?'':'s')+' you have not unlocked '+(missing===1?'is':'are')+' left out — re-run just those if you buy them later.':''};
}

// A sweep is one set-up, then a landing to write down for each slot you have,
// then one restore. You do not put the base back between placements, only after.
function slotLabSweep(id,title,why,setup,act,undo,range,extra){
  const count=range.have.length;
  if(count<2)return{id,title,why,note:'Skipped: '+title.replace(/^Phase [^·]*· /,'')+' needs at least two unlocked slots and this Base has '+count+'.',steps:[]};
  const steps=[{id:id+'-set',kind:'setup',text:setup}];
  range.have.forEach((slot,i)=>steps.push({id:id+'-'+(i+1),kind:'record',
    text:act+' Droid '+(i+1)+' of '+count+'.',
    ask:i===0?'Which slot did the first one take?':'Which slot did droid '+(i+1)+' take?'}));
  steps.push({id:id+'-undo',kind:'undo',text:undo});
  return{id,title,why,note:[extra,range.note].filter(Boolean).join(' '),steps};
}

function slotLabProtocol(){
  const W=slotLabRange('WORKER'),A=slotLabRange('ASTROMECH'),B=slotLabRange('BATTLE'),L=slotLabRange('LOUNGE');
  const rec=(id,text,ask,undo)=>({id,kind:'record',text,ask,undo});
  const phases=[];

  // Phase 0 needs two Worker slots to compare and two Lounge slots to send from.
  const canOrigin=W.have.length>=2&&L.have.length>=2,canFloor=B.have.length>=2;
  phases.push({id:'P0',title:'Phase 0 · Does where you stand change the answer?',
    why:'If the answer moves with you, or with where the droid started, then no fixed list of slots can be right and everything below is measuring the wrong thing. These are the cheapest runs here and they rule it out.',
    note:[W.note,L.note].filter(Boolean).join(' '),
    steps:[
      ...(canOrigin?[
        {id:'P0-set',kind:'setup',text:'Park two droids in the Lounge so Worker '+W.first+' and Worker '+W.last+' are the only free Worker slots. Every other Worker slot stays filled.'},
        rec('P0-1','Stand beside the Lounge and send the droid in Lounge slot '+L.first+' to work.','Which Worker slot did it take?','Send it straight back to the Lounge.'),
        rec('P0-2','Now send the droid in Lounge slot '+L.last+' — the far end of the Lounge you have — to work.','Which Worker slot did it take?','Send it back to the Lounge. If this differs from the run above, stop and tell me: the order is not fixed and the rest of this changes.')]:[]),
      ...(canFloor?[
        {id:'P0-set2',kind:'setup',text:'Refill Worker completely. Now free Battle '+B.first+' and Battle '+B.last+' only, parking those two droids in the Lounge.'},
        rec('P0-3','Stand downstairs and send a Battle droid from the Lounge to work.','Which Battle slot did it take?','Send it back to the Lounge.'),
        rec('P0-4','Go upstairs and send another Battle droid from the Lounge to work.','Which Battle slot did it take?','Send it back to the Lounge.'),
        {id:'P0-undo',kind:'undo',text:'Put both Battle droids back so Battle is full again. Runs 3 and 4 also settle whether Battle '+B.first+' beats Battle '+B.last+', which none of your earlier tests covered.'}]:[])]});

  phases.push({id:'PA',title:'Phase A · Cross-station: by station, or by slot?',
    why:'When a droid cannot get into its own station it goes elsewhere. If it prefers Astromech over Battle no matter which slots are open, that is a fixed station order and Phase C disappears entirely. If the winner moves with the slot, it is choosing by distance and Phase C is needed.',
    steps:[
      {id:'PA-set',kind:'setup',text:'Fill every Worker slot, so a Worker droid cannot go home, and keep one spare Worker droid in the Lounge to send.'},
      rec('PA-1','Free Astromech '+A.first+' and Battle '+B.first+' only. Send the spare Worker droid to work.','Where did it land?','Put it back in the Lounge and refill both slots.'),
      rec('PA-2','Free Astromech '+A.last+' and Battle '+B.first+' only. Send the spare Worker droid to work.','Where did it land?','Put it back in the Lounge and refill both slots.'),
      rec('PA-3','Free Astromech '+A.first+' and Battle '+B.last+' only. Send the spare Worker droid to work.','Where did it land?','Put it back in the Lounge and refill both slots.'),
      {id:'PA-undo',kind:'undo',text:'Refill everything. If all three landed in Astromech the choice is by station, so you can skip Phase C — tell me and you are finished after Phase B.'}]});

  phases.push(slotLabSweep('PB-WORKER','Phase B1 · Worker slot order',
    'Emptying only Worker means a Worker droid goes straight home, so each placement names the best slot still free. That is the whole order in one pass, instead of dozens of pairwise tests.',
    'Move every Worker droid into the Lounge so all Worker slots are free. Leave every other station exactly as it is.',
    'Send one Worker droid from the Lounge to work and note the slot it takes.',
    'Leave Worker filled as it now stands — the next sweep does not need it emptied.',W));

  phases.push(slotLabSweep('PB-ASTRO','Phase B2 · Astromech slot order',
    'Same idea. This one also shows whether the mission slots really are 1, 3, 5, 7 and 9.',
    'Move every Astromech droid into the Lounge so all Astromech slots are free. Leave the other stations alone.',
    'Send one Astromech droid from the Lounge to work and note the slot it takes.',
    'Leave Astromech as it now stands.',A));

  phases.push(slotLabSweep('PB-BATTLE','Phase B3 · Battle slot order',
    'The important one. Battle runs over two floors, and this settles the entire order in a single pass — including whether downstairs really is always preferred.',
    'Move every Battle droid into the Lounge so all Battle slots are free, both floors. Leave the other stations alone.',
    'Send one Battle droid from the Lounge to work and note the slot it takes.',
    'Leave Battle as it now stands.',B,
    'Slots 1 to '+BATTLE_UPSTAIRS_FROM+' are downstairs, '+(BATTLE_UPSTAIRS_FROM+1)+' upwards are upstairs.'));

  phases.push(slotLabSweep('PB-LOUNGE','Phase B4 · Lounge slot order',
    'Do this last: the Lounge is the parking space for every sweep above, so it has to be clear of them first. Your note about a droid landing in Lounge 8 suggests the Lounge may fill downwards — if the first placement here lands in the highest slot you have, that is confirmed and the app currently has it backwards.',
    'Send every droid in the Lounge back to work first, so the Lounge is completely empty.',
    'Send one droid from a credit station to the Lounge and note the slot it takes.',
    'Put the base back however you like it. Phase B is done.',L));

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

  return phases.filter(phase=>phase.steps.length||phase.note);
}
