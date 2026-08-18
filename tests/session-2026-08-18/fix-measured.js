// Replaces the guessed slot orders with measured ones. Every station was emptied
// and refilled a droid at a time, so each landing named the best slot still free.
const fs=require('fs');
const APP='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js';
let s=fs.readFileSync(APP,'utf8');
const NL='\r\n';
const sub=(from,to)=>{const n=s.split(from).length-1;if(n!==1){console.error('MATCHED '+n+'x:\n'+from.slice(0,170));process.exit(1)}s=s.split(from).join(to)};

sub([ "// The order the game fills a station's slots when it places a droid for you.",
  "// Only Battle differs from plain slot order, because it is the only station",
  "// split over two floors. Measured in game:",
  "//   Battle 1 + 6 free -> took 1      Battle 2 + 6 free -> took 2",
  "//   Battle 6 + 11 free -> took 11",
  "// So a free downstairs slot beats a free upstairs one, and upstairs it works",
  "// back from the stairs — Battle 11 sits nearest them and Battle 6 furthest, which",
  "// is what the map coordinates show too. The downstairs order among 1-5 has not",
  "// been tested, so it is left as plain slot order.",
  "const SLOT_FILL_ORDER={BATTLE:[0,1,2,3,4,10,9,8,7,6,5]};"].join(NL),
[ "// The order the game fills a station's slots when it places a droid for you.",
  "// Measured, not guessed: each station was emptied and refilled one droid at a",
  "// time, so every landing named the best slot still free. Listed here as slot",
  "// indices; the Base numbers them from 1.",
  "//",
  "//   Worker     9, 10, 11, 2, 1, 3, 8, 4, 7, 5, 6",
  "//   Astromech  7, 5, 9, 3, 1, then 4, 2, 6, 8",
  "//   Battle     11, 10, 5, 4, 9, 3, 8, 2, 7, 6, 1",
  "//   Lounge     10, 9, 8, 7, 6, then 4, 1, 5, 2, 3",
  "//",
  "// Two of these carry real meaning. Astromech fills all five mission slots — 1,",
  "// 3, 5, 7 and 9 — before it touches a single even one, so the first five",
  "// Astromechs you send to work are the ones that go on missions. And the Lounge",
  "// clears its upper circle first, counting down, before any of the base slots.",
  "//",
  "// Battle flatly contradicts what the earlier two-slot tests implied. Upstairs 11",
  "// and 10 are taken before anything downstairs, where the old rule put every",
  "// downstairs slot first. The earlier tests only ever offered Battle 6, which is",
  "// second from last, so it lost every time and looked like proof that downstairs",
  "// always wins.",
  "const SLOT_FILL_ORDER={",
  "  WORKER:[8,9,10,1,0,2,7,3,6,4,5],",
  "  ASTROMECH:[6,4,8,2,0,3,1,5,7],",
  "  BATTLE:[10,9,4,3,8,2,7,1,6,5,0],",
  "  LOUNGE:[9,8,7,6,5,3,0,4,1,2]",
  "};"].join(NL));

// Slots the measurements never reached must still be offered, just last — the
// Nova Lounge slots above 10 were not unlocked when this was measured.
sub([ "const slotFillOrder=station=>{",
  "  const available=stationSlotIndices(station),preferred=SLOT_FILL_ORDER[station];",
  "  return preferred?preferred.filter(i=>available.includes(i)):available;",
  "};"].join(NL),
[ "const slotFillOrder=station=>{",
  "  const available=stationSlotIndices(station),preferred=SLOT_FILL_ORDER[station];",
  "  if(!preferred)return available;",
  "  const measured=preferred.filter(index=>available.includes(index));",
  "  return[...measured,...available.filter(index=>!preferred.includes(index))];",
  "};"].join(NL));

// Phase A: a Worker droid took Battle every time, whichever slots were free —
// Battle 1 over Astromech 3, Battle 1 over Astromech 7, Battle 6 over Astromech 3.
sub([ "// When a droid cannot reach its own type of slot, the game sends it to the",
  "// \"nearest\" credit slot — which depends on how your base is laid out. This is",
  "// that tie-break. Steps that actually depend on it are flagged in the plan so",
  "// you can sanity-check them; put the stations in your own walking order and the",
  "// flags go away.",
  "const NEAREST_ORDER=['WORKER','ASTROMECH','BATTLE'];"].join(NL),
[ "// Where a droid goes when it cannot reach its own type of slot. Measured: a",
  "// Worker droid took Battle over Astromech all three times it was offered both,",
  "// whichever slots were free, so this is a station order rather than a per-slot",
  "// distance. Steps that lean on it are still flagged in the plan.",
  "const NEAREST_ORDER=['WORKER','BATTLE','ASTROMECH'];"].join(NL));

fs.writeFileSync(APP,s,'utf8');
console.log('measured orders written');
