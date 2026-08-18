// Battle keeps the order one sweep actually measured. Plain slot order matches
// nothing observed, so dropping Battle out of the distance model must not mean
// dropping it back to 1..11 — it means keeping the one list we have evidence for.
const fs=require('fs');
const APP='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js';
let s=fs.readFileSync(APP,'utf8');
const NL='\r\n';
const sub=(from,to)=>{const n=s.split(from).length-1;if(n!==1){console.error('MATCHED '+n+'x:\n'+from.slice(0,200));process.exit(1)}s=s.split(from).join(to)};

sub([ "// Battle stays on plain slot order. Both of its floors are drawn on the one map",
      "// image, so the upstairs dots are hand-placed onto ground-floor coordinates and a",
      "// flat gap cannot price the stairs. Scored against the slot log, nearest-from-",
      "// origin gets 30 of 38 on the four single-floor sweeps and 3 of 10 on Battle. Give",
      "// upstairs real coordinates and BATTLE can come off this list.",
      "//",
      "// Companion is on the list for a different reason: those slots are on you rather",
      "// than in the building, so there is no dot to measure a distance to.",
      "const NO_DISTANCE_STATIONS=['BATTLE','COMPANION'];"].join(NL),
[ "// Battle is the one station distance cannot model. Both of its floors are drawn on",
  "// the one map image, so the upstairs dots are hand-placed onto ground-floor",
  "// coordinates and a flat gap cannot price the stairs. Scored against the slot log,",
  "// nearest-from-origin gets 30 of 38 on the four single-floor sweeps and 3 of 10 on",
  "// Battle. So Battle keeps the order a sweep actually produced — emptied and",
  "// refilled a droid at a time, every landing naming the best slot still free — which",
  "// beats a distance already known to be wrong. Plain slot order is not the fallback:",
  "// it matches nothing that was observed. Give upstairs real coordinates and this",
  "// entry can go.",
  "//",
  "//   Battle  11, 10, 5, 4, 9, 3, 8, 2, 7, 6, 1",
  "//",
  "// It does contradict an earlier pair test where Battle 1 and 6 were free and the",
  "// droid took 1. No single list can explain both, and the origin is why — that pair",
  "// test started somewhere else. Left standing rather than papered over.",
  "//",
  "// Companion needs no entry despite having no dots: nothing on the map is a distance",
  "// from a slot that sits on you, so every gap comes back the same and the stable",
  "// sort leaves slot order alone.",
  "const MEASURED_FILL_ORDER={BATTLE:[10,9,4,3,8,2,7,1,6,5,0]};"].join(NL));

sub([ "const slotFillOrder=(station,origin)=>{",
      "  const available=stationSlotIndices(station);",
      "  const ordered=origin&&!NO_DISTANCE_STATIONS.includes(station)",
      "    ?available.map(slot=>({slot,gap:slotWalkGap(origin,{station,slot})})).sort((a,b)=>a.gap-b.gap).map(x=>x.slot)",
      "    :available;"].join(NL),
[ "const slotFillOrder=(station,origin)=>{",
  "  const available=stationSlotIndices(station),measured=MEASURED_FILL_ORDER[station];",
  "  const ordered=measured",
  "    ?[...measured.filter(slot=>available.includes(slot)),...available.filter(slot=>!measured.includes(slot))]",
  "    :origin",
  "      ?available.map(slot=>({slot,gap:slotWalkGap(origin,{station,slot})})).sort((a,b)=>a.gap-b.gap).map(x=>x.slot)",
  "      :available;"].join(NL));

fs.writeFileSync(APP,s,'utf8');
console.log('Battle keeps its measured order; everything else measures from the origin');
