// The dropdown only offered slots in the station the plan expected. But which
// station a droid ends up in is one of the things being measured — Phase A showed
// a Worker droid taking Battle over Astromech — so the candidates have to span
// every station that could receive it, and the row has to record which one it
// actually chose. A free set that excludes the real answer cannot be scored.
const fs=require('fs');
const APP='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js';
let s=fs.readFileSync(APP,'utf8');
const NL='\r\n', J=a=>a.join(NL);
const sub=(from,to)=>{const n=s.split(from).length-1;if(n!==1){console.error('MATCHED '+n+'x:\n'+from.slice(0,170));process.exit(1)}s=s.split(from).join(to)};

// Every slot the droid could be given, across every station that takes workers.
sub(J([ "function slotLogFree(station,taken){",
  "  const occupied=new Set(placements().placed.filter(x=>x.station===station).map(x=>x.slot));",
  "  for(const slot of taken||[])occupied.add(slot);",
  "  return stationSlotIndices(station).filter(slot=>!occupied.has(slot));",
  "}"]),
J([ "// Every slot a droid sent to work could land in, across all the stations that",
  "// take one. Which station it picks is part of what is being measured, so",
  "// narrowing this to the planned station would throw away the answer.",
  "function slotLogFree(taken){",
  "  const placed=placements().placed,out=[];",
  "  for(const station of WORK_STATIONS){",
  "    const occupied=new Set(placed.filter(x=>x.station===station).map(x=>x.slot));",
  "    for(const gone of taken||[])if(gone.station===station)occupied.add(gone.slot);",
  "    for(const slot of stationSlotIndices(station))if(!occupied.has(slot))out.push({station,slot});",
  "  }",
  "  return out;",
  "}",
  "const slotLogSame=(a,b)=>Boolean(a)&&Boolean(b)&&a.station===b.station&&a.slot===b.slot;"]));

sub(J([ "    const already=taken[step.to]||(taken[step.to]=[]);",
  "    step.freeSlots=slotLogFree(step.to,already);",
  "    step.logged=slotLogSession.get(step.text)??null;",
  "    if(Number.isInteger(step.logged))already.push(step.logged);"]),
J([ "    step.freeSlots=slotLogFree(taken);",
  "    step.logged=slotLogSession.get(step.text)||null;",
  "    if(step.logged)taken.push(step.logged);"]));
sub("  const taken={};","  const taken=[];");

// The row now names the station it landed in, and the one the plan expected.
sub(J([ "function slotLogAdd(row){",
  "  if(!Number.isInteger(row.landed)||!row.station)return false;",
  "  // A landing outside the free set means the Base is out of date, and a wrong row",
  "  // is worse than no row.",
  "  if(!row.free.includes(row.landed))return false;"]),
J([ "function slotLogAdd(row){",
  "  if(!Number.isInteger(row.landed)||!row.station)return false;",
  "  // A landing outside the free set means the Base is out of date, and a wrong row",
  "  // is worse than no row.",
  "  if(!row.free.some(slot=>slot.station===row.station&&slot.slot===row.landed))return false;"]));

// Options span stations, so each has to name its station.
sub(J([ "  const free=step.freeSlots||[];",
  "  const options=free.map(slot=>`<option value=\"${slot}\" ${step.logged===slot?'selected':''}>${stationSlotLabel(step.to,slot)}</option>`).join('');"]),
J([ "  const free=step.freeSlots||[];",
  "  const options=free.map(spot=>`<option value=\"${spot.station}:${spot.slot}\" ${slotLogSame(step.logged,spot)?'selected':''}>${stationSlotLabel(spot.station,spot.slot)}</option>`).join('');"]));
sub("<option value=\"\">${free.length} free…</option>","<option value=\"\">${free.length} it could take…</option>");

sub(J([ "      const landed=Number(picker.value);",
  "      // The options came from the free set, so this cannot be an occupied slot.",
  "      slotLogAdd({station:step.to,fromStation:step.from,fromSlot:step.fromSlot,",
  "        free:step.freeSlots,landed,droid:step.unit?.name||''});",
  "      slotLogSession.set(step.text,landed);",
  "      toast(`Recorded · ${stationSlotLabel(step.to,landed)}`);"]),
J([ "      const cut=picker.value.indexOf(':');",
  "      const spot={station:picker.value.slice(0,cut),slot:Number(picker.value.slice(cut+1))};",
  "      // The options came from the free set, so this cannot be an occupied slot.",
  "      slotLogAdd({station:spot.station,fromStation:step.from,fromSlot:step.fromSlot,",
  "        free:step.freeSlots,landed:spot.slot,plannedStation:step.to,",
  "        droid:step.unit?.name||'',droidType:state.droids.find(d=>d.name===step.unit?.name)?.type||''});",
  "      slotLogSession.set(step.text,spot);",
  "      toast(`Recorded · ${stationSlotLabel(spot.station,spot.slot)}`);"]));

// Rules now choose among (station, slot) pairs.
sub(J([ "const SLOT_RULES_UNDER_TEST=[",
  "  {id:'nearest',name:'Nearest free slot to where it started',",
  "   pick:row=>slotLogNearest(row.station,row.free,row.fromStation,row.fromSlot)},",
  "  {id:'mission',name:'Mission slots first, then nearest',",
  "   pick:row=>{",
  "     if(row.station==='ASTROMECH'){",
  "       const mission=row.free.filter(slot=>ASTROMECH_MISSION_SLOTS.includes(slot));",
  "       if(mission.length)return slotLogNearest(row.station,mission,row.fromStation,row.fromSlot);",
  "     }",
  "     return slotLogNearest(row.station,row.free,row.fromStation,row.fromSlot);",
  "   }},",
  "  {id:'fixed',name:'The fixed order the app ships with',",
  "   pick:row=>slotFillOrder(row.station).find(slot=>row.free.includes(slot))},",
  "  {id:'lowest',name:'Lowest free slot number',pick:row=>Math.min(...row.free)},",
  "];"]),
J([ "const SLOT_RULES_UNDER_TEST=[",
  "  {id:'nearest',name:'Nearest free slot to where it started',",
  "   pick:row=>slotLogNearest(row.free,row.fromStation,row.fromSlot)},",
  "  {id:'mission',name:'Own station first, mission slots before the rest',",
  "   pick:row=>{",
  "     // Auto-route sends a droid to its own type of station when one is free.",
  "     const home=row.free.filter(spot=>spot.station===row.droidType);",
  "     const pool=home.length?home:row.free;",
  "     const mission=pool.filter(spot=>spot.station==='ASTROMECH'&&ASTROMECH_MISSION_SLOTS.includes(spot.slot));",
  "     return slotLogNearest(mission.length?mission:pool,row.fromStation,row.fromSlot);",
  "   }},",
  "  {id:'fixed',name:'The station and slot orders the app ships with',",
  "   pick:row=>{",
  "     const home=row.free.filter(spot=>spot.station===row.droidType);",
  "     const pool=home.length?home:row.free;",
  "     for(const station of[...NEAREST_ORDER,'UPGRADE_CHIP']){",
  "       const here=pool.filter(spot=>spot.station===station);",
  "       if(!here.length)continue;",
  "       const order=slotFillOrder(station);",
  "       return here.slice().sort((a,b)=>order.indexOf(a.slot)-order.indexOf(b.slot))[0];",
  "     }",
  "     return pool[0];",
  "   }},",
  "];"]));

sub(J([ "function slotLogNearest(station,free,fromStation,fromSlot){",
  "  const start=slotLogPoint(fromStation,fromSlot);",
  "  if(!start||!free.length)return free[0];",
  "  let best=null;",
  "  for(const slot of free){",
  "    const point=slotLogPoint(station,slot);",
  "    if(!point)continue;",
  "    const gap=Math.hypot(point.x-start.x,point.y-start.y)+(point.upstairs!==start.upstairs?SLOT_FLOOR_PENALTY:0);",
  "    if(!best||gap<best.gap)best={slot,gap};",
  "  }",
  "  return best?best.slot:free[0];",
  "}"]),
J([ "function slotLogNearest(free,fromStation,fromSlot){",
  "  const start=slotLogPoint(fromStation,fromSlot);",
  "  if(!start||!free.length)return free[0];",
  "  let best=null;",
  "  for(const spot of free){",
  "    const point=slotLogPoint(spot.station,spot.slot);",
  "    if(!point)continue;",
  "    const gap=Math.hypot(point.x-start.x,point.y-start.y)+(point.upstairs!==start.upstairs?SLOT_FLOOR_PENALTY:0);",
  "    if(!best||gap<best.gap)best={spot,gap};",
  "  }",
  "  return best?best.spot:free[0];",
  "}"]));

sub("      const right=rule.pick(row)===row.landed;",
    "      const right=slotLogSame(rule.pick(row),{station:row.station,slot:row.landed});");

fs.writeFileSync(APP,s,'utf8');
console.log('candidates now span every station a droid could be sent to');
