// Job 1: placement by nearest-free-slot-from-origin instead of fixed per-station
// lists. SLOT_FILL_ORDER goes; slotFillOrder grows an origin argument and every
// caller that knows where the droid is standing now hands it over.
const fs=require('fs');
const APP='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js';
let s=fs.readFileSync(APP,'utf8');
const NL='\r\n';
const sub=(from,to)=>{const n=s.split(from).length-1;if(n!==1){console.error('MATCHED '+n+'x:\n'+from.slice(0,200));process.exit(1)}s=s.split(from).join(to)};

// -- 1. The fill-order block itself -------------------------------------------
const lines=s.split(NL);
const start=lines.findIndex(l=>l.startsWith('// The order the game fills'));
const end=lines.findIndex(l=>l.startsWith('const slotFillOrder=station=>{'));
if(start<0||end<0){console.error('cannot find the fill-order block');process.exit(1)}
if(lines[end+5]!=='};'){console.error('slotFillOrder does not end where expected: '+JSON.stringify(lines[end+5]));process.exit(1)}
const block=[
"// How the game picks a slot for you. It takes the free slot closest to where the",
"// droid was standing, so a station has no fill order of its own: refill the same",
"// station from two directions and you get near-opposite answers. The Lounge was",
"// swept twice to check. From Worker slots it filled 1,2,3,5,4,6,10,7,9,8; from",
"// Battle slots 10,9,8,7,6,4,1,5,2,3 \u2014 because Worker sits south of the Lounge and",
"// Battle north of it. Distance from the origin reproduces both, down to which half",
"// of the Lounge goes first. No single list can say that.",
"//",
"// Two things distance does not decide.",
"//",
"// Astromech puts its five mission slots \u2014 1, 3, 5, 7 and 9 \u2014 ahead of every",
"// earning-only slot, from any origin. Mission slots were taken from both halves of",
"// the Lounge and every even slot came later regardless, so the first five",
"// Astromechs you send to work are the ones that go on missions.",
"//",
"// Battle stays on plain slot order. Both of its floors are drawn on the one map",
"// image, so the upstairs dots are hand-placed onto ground-floor coordinates and a",
"// flat gap cannot price the stairs. Scored against the slot log, nearest-from-",
"// origin gets 30 of 38 on the four single-floor sweeps and 3 of 10 on Battle. Give",
"// upstairs real coordinates and BATTLE can come off this list.",
"//",
"// Companion is on the list for a different reason: those slots are on you rather",
"// than in the building, so there is no dot to measure a distance to.",
"const NO_DISTANCE_STATIONS=['BATTLE','COMPANION'];",
"// A station's slots in the order the game would take them for a droid arriving",
"// from `origin` ({station,slot}). No origin means nothing to measure from \u2014 a",
"// droid still in the roster has not stood anywhere yet \u2014 so slot order stands.",
"// The sort is stable, so equal gaps stay in slot order too.",
"const slotFillOrder=(station,origin)=>{",
"  const available=stationSlotIndices(station);",
"  const ordered=origin&&!NO_DISTANCE_STATIONS.includes(station)",
"    ?available.map(slot=>({slot,gap:slotWalkGap(origin,{station,slot})})).sort((a,b)=>a.gap-b.gap).map(x=>x.slot)",
"    :available;",
"  if(station!=='ASTROMECH')return ordered;",
"  const mission=ordered.filter(slot=>ASTROMECH_MISSION_SLOTS.includes(slot));",
"  return[...mission,...ordered.filter(slot=>!ASTROMECH_MISSION_SLOTS.includes(slot))];",
"};"];
lines.splice(start,end+6-start,...block);
s=lines.join(NL);

// -- 2. The distance helper the fill order measures with -----------------------
sub("const SLOT_FLOOR_PENALTY=12;",
[ "const SLOT_FLOOR_PENALTY=12;",
  "// A slot with no dot on the map cannot be compared with one that has, so it sorts",
  "// last rather than poisoning the comparison with Infinity.",
  "const SLOT_GAP_UNREACHABLE=1e6;",
  "// The walk the game seems to measure: a straight line across the floor, plus a",
  "// flat charge for changing floor.",
  "function slotWalkGap(from,to){",
  "  const a=slotLogPoint(from.station,from.slot),b=slotLogPoint(to.station,to.slot);",
  "  if(!a||!b)return SLOT_GAP_UNREACHABLE;",
  "  return Math.hypot(b.x-a.x,b.y-a.y)+(a.upstairs!==b.upstairs?SLOT_FLOOR_PENALTY:0);",
  "}"].join(NL));

// Blueprint Storage has dots on the map under a shorter name, so name it here and
// crafting can pick the Build slot nearest the shelf.
sub("    const lists=station==='LOUNGE'?[spots.LOUNGE,spots.LOUNGE_REBIRTH,spots.LOUNGE_NOVA]:[spots[station]];",
    "    const lists=station==='LOUNGE'?[spots.LOUNGE,spots.LOUNGE_REBIRTH,spots.LOUNGE_NOVA]:station==='BLUEPRINT_STORAGE'?[spots.BLUEPRINT]:[spots[station]];");

// One definition of the gap, so the log's scoring and the placement it scores
// cannot drift apart.
sub([ "  let best=null;",
      "  for(const spot of free){",
      "    const point=slotLogPoint(spot.station,spot.slot);",
      "    if(!point)continue;",
      "    const gap=Math.hypot(point.x-start.x,point.y-start.y)+(point.upstairs!==start.upstairs?SLOT_FLOOR_PENALTY:0);",
      "    if(!best||gap<best.gap)best={spot,gap};",
      "  }"].join(NL),
    [ "  const from={station:fromStation,slot:fromSlot};",
      "  let best=null;",
      "  for(const spot of free){",
      "    const gap=slotWalkGap(from,spot);",
      "    if(gap>=SLOT_GAP_UNREACHABLE)continue;",
      "    if(!best||gap<best.gap)best={spot,gap};",
      "  }"].join(NL));

// -- 3. placements(): the Base's own layout ------------------------------------
sub("firstFree=station=>slotFillOrder(station).find(i=>!occupied[station].has(i))??-1;",
    "firstFree=(station,origin)=>slotFillOrder(station,origin).find(i=>!occupied[station].has(i))??-1,standingAt=x=>{const slot=Number(x.preferredSlot);return SLOT_RULES[x.preferred]&&Number.isInteger(slot)?{station:x.preferred,slot}:null};");
sub("for(const x of pending){const d=state.droids.find(y=>y.name===x.name);let station,slot=-1;if(x.preferred&&SLOT_RULES[x.preferred]&&(slot=firstFree(x.preferred))>=0)station=x.preferred;else if((slot=firstFree(d.type))>=0)station=d.type;else if((slot=firstFree('BUILD'))>=0)station='BUILD';",
    "for(const x of pending){const d=state.droids.find(y=>y.name===x.name),from=standingAt(x);let station,slot=-1;if(x.preferred&&SLOT_RULES[x.preferred]&&(slot=firstFree(x.preferred,from))>=0)station=x.preferred;else if((slot=firstFree(d.type,from))>=0)station=d.type;else if((slot=firstFree('BUILD',from))>=0)station='BUILD';");

// -- 4. Adding a droid by hand: the picker's "next slot" ----------------------
sub("const nextFreeSlot=station=>{const used=new Set(placements().placed.filter(x=>x.station===station).map(x=>x.slot));return stationSlotIndices(station).find(i=>!used.has(i))??-1};",
    "const nextFreeSlot=station=>{const used=new Set(placements().placed.filter(x=>x.station===station).map(x=>x.slot));return slotFillOrder(station).find(i=>!used.has(i))??-1};");

// -- 5. Crafting a blueprint: Build's three slots are in three rooms ----------
sub("slot=stationSlotIndices('BUILD').find(i=>!occupied.has(i));",
    "slot=slotFillOrder('BUILD',{station:'BLUEPRINT_STORAGE',slot:Number(blueprint.slot)||0}).find(i=>!occupied.has(i));");

// -- 6. The optimiser's move list ---------------------------------------------
sub("firstOpen=station=>stationSlotIndices(station).find(i=>!p.placed.some(x=>x.station===station&&x.slot===i))??-1",
    "firstOpen=(station,origin)=>slotFillOrder(station,origin).find(i=>!p.placed.some(x=>x.station===station&&x.slot===i))??-1");
sub("open=firstOpen(x.station),targetSlot=","open=firstOpen(x.station,old),targetSlot=");

// -- 7. The projected layout --------------------------------------------------
sub("free=station=>slotFillOrder(station).find(i=>!occupied[station].has(i))??-1",
    "free=(station,origin)=>slotFillOrder(station,origin).find(i=>!occupied[station].has(i))??-1");
sub("slot=free(fallback);if(slot>=0)","slot=free(fallback,old);if(slot>=0)");

// stabilise used to hand the floating droids whatever was left in plain slot
// order, which threw away the slot the fill order had just worked out. Keep that
// choice when it is still open and only re-seat the ones that actually collide.
sub("const open=slots.filter(slot=>!used.has(slot));floating.forEach((item,index)=>stable.push({...item,slot:open[index]??item.slot}))}return stable}",
[ "const spare=new Set(slots.filter(slot=>!used.has(slot))),colliding=[];",
  "    for(const item of floating){if(spare.has(item.slot)){spare.delete(item.slot);stable.push(item)}else colliding.push(item)}",
  "    for(const item of colliding){",
  "      const old=current.get(`${item.source}:${item.unit}`);",
  "      const slot=slotFillOrder(station,old||null).find(i=>spare.has(i));",
  "      if(slot===undefined){stable.push(item);continue}",
  "      spare.delete(slot);stable.push({...item,slot});",
  "    }",
  "  }",
  "  return stable;",
  "}"].join(NL));

// -- 8. The rule the log scores as "what the app ships" -----------------------
sub("  {id:'fixed',name:'The station and slot orders the app ships with',",
    "  {id:'fixed',name:'The station order the app ships with, nearest slot inside it',");
sub("       const order=slotFillOrder(station);",
    "       const order=slotFillOrder(station,{station:row.fromStation,slot:row.fromSlot});");

if(s.includes('SLOT_FILL_ORDER')){console.error('SLOT_FILL_ORDER survived the patch');process.exit(1)}
fs.writeFileSync(APP,s,'utf8');
console.log('placement now measures from where the droid is standing');
