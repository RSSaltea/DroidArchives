// Placement is by distance from where the droid started, not by a per-station
// list. Runs the real slotFillOrder against the real map coordinates.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
const lines=src.split('\r\n');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log(`  ${c?'ok  ':'FAIL'} ${l}${c?'':'  '+x}`)};

// Pull a whole declaration out of app.js by its opening line, following it until
// the braces close. Cheaper than a parser and enough for this file's style.
function grab(prefix){
  const start=lines.findIndex(l=>l.startsWith(prefix));
  if(start<0)throw Error('not found: '+prefix);
  let depth=0,out=[];
  for(let i=start;i<lines.length;i++){
    out.push(lines[i]);
    for(const ch of lines[i]){if('{(['.includes(ch))depth++;else if('})]'.includes(ch))depth--}
    if(depth<=0)break;
  }
  return out.join('\n');
}

const sandbox={console,state:{rebirth:22,purchasedSlots:[],novaUpgrades:{'lounge-slot':4,'companion-slot':1,'upgrade-chip-station':1},loungePurchased:4}};
vm.createContext(sandbox);
for(const prefix of[
  'const SLOT_RULES=','const ASTROMECH_MISSION_SLOTS=','const BATTLE_UPSTAIRS_FROM=',
  'const novaLevelFor=','const loungeNovaSlots=','const blueprintStorageSlots=','const loungeSlotMeta=',
  'const slotPurchaseKey=','function slotUnlockRebirth','function isSlotEligible',
  'const isSlotPurchased=','const isSlotUnlocked=','const stationSlotIndices=',
  'const MAP_SPOTS=','const MAP_FLOORS=',
  'const SLOT_FLOOR_PENALTY=','const SLOT_GAP_UNREACHABLE=','function slotWalkGap','function slotLogPoint',
  'const MEASURED_FILL_ORDER=','const slotFillOrder=',
  'function expandedOwned','function placements','function stabiliseProjectedPlacements',
])vm.runInContext(grab(prefix),sandbox);

// Everything this base could ever unlock is unlocked and bought, so the orders
// below are over the full set of slots rather than a starter base's handful.
vm.runInContext(`state.purchasedSlots=Object.keys(SLOT_RULES).flatMap(type=>Array.from({length:SLOT_RULES[type].initial+SLOT_RULES[type].unlocks.length},(_,i)=>type+':'+i));`,sandbox);
const run=expr=>vm.runInContext(expr,sandbox);
const order=(station,origin)=>run(`slotFillOrder(${JSON.stringify(station)},${JSON.stringify(origin||null)})`);
const slots=station=>run(`stationSlotIndices(${JSON.stringify(station)})`);
const display=list=>list.map(i=>i+1).join(',');

console.log('=== the fixed per-station lists are gone ===');
ok('SLOT_FILL_ORDER no longer exists',!src.includes('SLOT_FILL_ORDER'));
ok('slotFillOrder takes an origin',src.includes('const slotFillOrder=(station,origin)=>{'));
ok('the comment says what decides a slot',/free slot closest to where the/.test(src));
ok('only Battle still carries a measured list',JSON.stringify(Object.keys(run('MEASURED_FILL_ORDER')))==='["BATTLE"]',JSON.stringify(Object.keys(run('MEASURED_FILL_ORDER'))));

console.log('\n=== the base is fully unlocked, so these are the real slot counts ===');
ok('Worker has 11 slots',slots('WORKER').length===11,String(slots('WORKER').length));
ok('Astromech has 9 slots',slots('ASTROMECH').length===9,String(slots('ASTROMECH').length));
ok('Battle has 11 slots',slots('BATTLE').length===11,String(slots('BATTLE').length));
ok('Lounge has 13 slots',slots('LOUNGE').length===13,String(slots('LOUNGE').length));

console.log('\n=== no origin means nothing to measure, so slot order stands ===');
for(const station of['WORKER','LOUNGE','BUILD','UPGRADE_CHIP','COMPANION'])
  ok(`${station} unchanged without an origin`,JSON.stringify(order(station))===JSON.stringify(slots(station)),display(order(station)));
// Companion has no entry in the measured list and no dots on the map, because its
// slots are on you rather than in the building. Every gap comes back the same and
// the sort is stable, so it stays in slot order however far the droid has come.
ok('Companion stays in slot order even with an origin',
  JSON.stringify(order('COMPANION',{station:'BATTLE',slot:10}))===JSON.stringify(slots('COMPANION')));

console.log('\n=== every order is a permutation of the station, from every origin ===');
const allOrigins=[];
for(const station of['WORKER','ASTROMECH','BATTLE','LOUNGE','BUILD','UPGRADE_CHIP'])
  for(const slot of slots(station))allOrigins.push({station,slot});
let bad=[];
for(const station of Object.keys(run('SLOT_RULES')))for(const origin of allOrigins){
  const got=order(station,origin),want=slots(station);
  if(got.length!==want.length||new Set(got).size!==got.length||got.some(i=>!want.includes(i)))
    bad.push(`${station} from ${origin.station} ${origin.slot+1}: ${display(got)}`);
}
ok(`no slot ever dropped or duplicated (${allOrigins.length} origins x ${Object.keys(run('SLOT_RULES')).length} stations)`,!bad.length,bad[0]||'');

console.log('\n=== Astromech takes all five mission slots first, from any origin ===');
const mission=run('ASTROMECH_MISSION_SLOTS');
let missionBad=[];
for(const origin of allOrigins){
  const got=order('ASTROMECH',origin),firstOther=got.findIndex(i=>!mission.includes(i));
  if(got.slice(0,5).some(i=>!mission.includes(i))||firstOther!==5)missionBad.push(`from ${origin.station} ${origin.slot+1}: ${display(got)}`);
}
ok('mission slots 1,3,5,7,9 always come first',!missionBad.length,missionBad[0]||'');
ok('mission slots are 1,3,5,7,9 as the Base numbers them',display(mission)==='1,3,5,7,9');
ok('the earning-only slots still follow in distance order',
  (()=>{const got=order('ASTROMECH',{station:'WORKER',slot:0});return got.slice(5).length===4&&got.slice(5).every(i=>!mission.includes(i))})());

console.log('\n=== Battle is left alone: one map image cannot price the stairs ===');
// It keeps the order a sweep measured rather than falling back to 1..11, which
// matched nothing observed. test-battle-floors.js goes into that list in full.
let battleBad=[];
for(const origin of allOrigins)if(display(order('BATTLE',origin))!=='11,10,5,4,9,3,8,2,7,6,1')
  battleBad.push(`from ${origin.station} ${origin.slot+1}: ${display(order('BATTLE',origin))}`);
ok('Battle keeps its measured order from every origin',!battleBad.length,battleBad[0]||'');
ok('and that is not plain slot order',display(order('BATTLE'))!=='1,2,3,4,5,6,7,8,9,10,11');
ok('the comment says why, and what would let it change',/upstairs real coordinates and this[\s\S]{0,40}entry can go/.test(src));

console.log('\n=== the Lounge, swept twice in game, is the case a list cannot express ===');
// Observed: from Worker slots the Lounge filled 1,2,3,5,4,6,10,7,9,8 — its five
// base slots first. From Battle slots it filled 10,9,8,7,6,4,1,5,2,3 — the upper
// circle first. Worker sits south of the Lounge, Battle north of it.
const upper=i=>i>=5;
let loungeWorker=[],loungeBattle=[];
for(const slot of slots('WORKER')){
  const got=order('LOUNGE',{station:'WORKER',slot});
  if(got.slice(0,5).some(upper))loungeWorker.push(`W${slot+1}: ${display(got)}`);
}
for(const slot of slots('BATTLE').filter(i=>i<5)){
  const got=order('LOUNGE',{station:'BATTLE',slot});
  if(!got.slice(0,5).every(upper))loungeBattle.push(`B${slot+1}: ${display(got)}`);
}
// Worker slots 9-11 are the northern pair by the Astromech room, closer to the
// Lounge's upper circle than to its base slots, so they are read separately.
const southWorker=slots('WORKER').filter(i=>i<8);
let southBad=[];
for(const slot of southWorker){
  const got=order('LOUNGE',{station:'WORKER',slot});
  if(got.slice(0,5).some(upper))southBad.push(`W${slot+1}: ${display(got)}`);
}
ok('from the southern Worker slots, the five base slots come first',!southBad.length,southBad[0]||'');
ok('from downstairs Battle, the upper circle comes first',!loungeBattle.length,loungeBattle[0]||'');
ok('the two runs really do disagree',
  JSON.stringify(order('LOUNGE',{station:'WORKER',slot:0}))!==JSON.stringify(order('LOUNGE',{station:'BATTLE',slot:2})));
console.log('    from Worker 1: '+display(order('LOUNGE',{station:'WORKER',slot:0}))+'   (observed 1,2,3,5,4,6,10,7,9,8)');
console.log('    from Battle 3: '+display(order('LOUNGE',{station:'BATTLE',slot:2}))+'   (observed 10,9,8,7,6,4,1,5,2,3)');

console.log('\n=== distances are measured, not invented ===');
ok('a slot with no dot on the map sorts last, not Infinity',run('SLOT_GAP_UNREACHABLE')===1e6);
ok('an unmeasurable pair returns that sentinel',run(`slotWalkGap({station:'COMPANION',slot:0},{station:'WORKER',slot:0})`)===1e6);
ok('changing floor costs a flat penalty',run(`slotWalkGap({station:'BATTLE',slot:0},{station:'BATTLE',slot:5})>=SLOT_FLOOR_PENALTY`));
ok('the same slot is zero away from itself',run(`slotWalkGap({station:'WORKER',slot:3},{station:'WORKER',slot:3})`)===0);
ok('Blueprint Storage has a position now',run(`slotLogPoint('BLUEPRINT_STORAGE',0)!==null`));
ok('the log scorer shares the one distance function',/const gap=slotWalkGap\(from,spot\);/.test(src));

console.log('\n=== every caller that knows where the droid stands hands it over ===');
ok('placements reads the slot it is recorded in',src.includes('standingAt=x=>{const slot=Number(x.preferredSlot);'));
ok('placements passes it to all three fallbacks',/firstFree\(x\.preferred,from\)[\s\S]{0,120}firstFree\(d\.type,from\)[\s\S]{0,60}firstFree\('BUILD',from\)/.test(src));
ok('the projected layout passes the droid\'s current slot',src.includes('slot=free(fallback,old);'));
ok('the move list does too',src.includes('open=firstOpen(x.station,old)'));
ok('the picker\'s next slot follows the fill order',src.includes(`return slotFillOrder(station).find(i=>!used.has(i))??-1};`));
ok('crafting picks the Build slot nearest the shelf',src.includes(`slotFillOrder('BUILD',{station:'BLUEPRINT_STORAGE',slot:Number(blueprint.slot)||0})`));
ok('the log scores what the app now ships',src.includes(`const order=slotFillOrder(station,{station:row.fromStation,slot:row.fromSlot});`));

console.log('\n=== stabilise no longer throws the choice away ===');
ok('it keeps a planned slot that is still open',src.includes('for(const item of floating){if(spare.has(item.slot))'));
ok('and re-seats only the collisions, by fill order',src.includes('const slot=slotFillOrder(station,old||null).find(i=>spare.has(i));'));
const stab=(basePlaced,placed)=>run(`stabiliseProjectedPlacements(${JSON.stringify({placed:basePlaced})},${JSON.stringify(placed)})`);
{
  // One droid holds Worker 1; a second arrives from the Lounge and the planner put
  // it in Worker 9, the nearest free slot to where it stood. That has to survive.
  const out=stab(
    [{source:0,unit:0,station:'WORKER',slot:0},{source:1,unit:0,station:'LOUNGE',slot:0}],
    [{source:0,unit:0,station:'WORKER',slot:0},{source:1,unit:0,station:'WORKER',slot:8}]);
  const moved=out.find(x=>x.source===1);
  ok('a planned Worker 9 stays Worker 9',moved.slot===8,'slot '+(moved.slot+1));
}
{
  // Two droids planned into the same slot. One keeps it, the other is re-seated
  // rather than both being dealt out from slot 1 upwards.
  const out=stab(
    [{source:0,unit:0,station:'LOUNGE',slot:0},{source:1,unit:0,station:'LOUNGE',slot:1}],
    [{source:0,unit:0,station:'WORKER',slot:8},{source:1,unit:0,station:'WORKER',slot:8}]);
  const a=out.find(x=>x.source===0),b=out.find(x=>x.source===1);
  ok('the collision is broken, not duplicated',a.slot!==b.slot,`${a.slot+1} and ${b.slot+1}`);
  ok('one of them keeps the slot the planner chose',a.slot===8||b.slot===8,`${a.slot+1} and ${b.slot+1}`);
}
{
  // A droid already sitting in the station keeps its seat, which is the whole
  // point of the function and must not have regressed.
  const out=stab(
    [{source:0,unit:0,station:'WORKER',slot:5}],
    [{source:0,unit:0,station:'WORKER',slot:0}]);
  ok('a droid already in the station keeps its seat',out[0].slot===5,'slot '+(out[0].slot+1));
}

console.log('\n=== placements() runs for real, since every Base render calls it ===');
// A runtime error here takes the whole Base page down, and the fill order is now
// reached through two functions declared much further down the file.
vm.runInContext(`state.droids=[{name:'W',type:'WORKER'},{name:'A',type:'ASTROMECH'},{name:'B',type:'BATTLE'}];`,sandbox);
{
  // Nobody pinned, so nobody has an origin: plain slot order, mission slots first.
  vm.runInContext(`state.owned=[{name:'A',variant:'BESKAR',qty:3}];`,sandbox);
  const p=run('placements()');
  ok('three loose Astromechs land without error',p.placed.length===3&&!p.overflow.length);
  ok('and take mission slots 1, 3 and 5',display(p.placed.map(x=>x.slot).sort((a,b)=>a-b))==='1,3,5',
    display(p.placed.map(x=>x.slot)));
}
{
  // One pinned into the Lounge, its own station full: it has to move, and now it
  // moves from somewhere, so the Worker slot it takes is the nearest one.
  vm.runInContext(`state.owned=[{name:'W',variant:'BESKAR',qty:1,preferred:'LOUNGE',preferredSlot:0},{name:'W',variant:'BESKAR',qty:1}];`,sandbox);
  const p=run('placements()');
  ok('a pinned droid keeps its pin',p.placed.some(x=>x.station==='LOUNGE'&&x.slot===0));
  ok('and the unpinned one still gets a Worker slot',p.placed.some(x=>x.station==='WORKER'));
}
{
  // More droids than slots, which is where an off-by-one in the ordering would show.
  vm.runInContext(`state.owned=[{name:'W',variant:'BESKAR',qty:40}];`,sandbox);
  const p=run('placements()');
  const seats=new Set(p.placed.map(x=>`${x.station}:${x.slot}`));
  ok('an overflowing base seats nobody twice',seats.size===p.placed.length,`${seats.size} of ${p.placed.length}`);
  ok('and the leftovers land in overflow, not nowhere',p.placed.length+p.overflow.length===40,
    `${p.placed.length}+${p.overflow.length}`);
}

console.log('\n=== scored against the 47 landings measured in game ===');
// The fixed lists that used to ship were the sweeps themselves, written down. On
// this data they therefore score near-perfectly on the stations that were swept
// once, and badly on the Lounge, the only station swept twice from two different
// directions. That is the whole case: 40/47 that cannot generalise against 38/47
// that can. If a later sweep pulls the overall number below the old one on the
// Lounge too, the model is wrong and this test should say so.
const NEAREST_ORDER=['WORKER','BATTLE','ASTROMECH'];
const rows=[];
const sweep=(station,count,pairs)=>{
  let free=Array.from({length:count},(_,i)=>({station,slot:i}));
  for(const[fromStation,fromSlot,landed]of pairs){
    rows.push({station,fromStation,fromSlot:fromSlot-1,free:free.slice(),landed:landed-1,
      droidType:station==='LOUNGE'?'WORKER':station});
    free=free.filter(s=>s.slot!==landed-1);
  }
};
sweep('LOUNGE',10,[['WORKER',1,1],['WORKER',2,2],['WORKER',3,3],['WORKER',4,5],['WORKER',5,4],
  ['WORKER',6,6],['WORKER',11,10],['WORKER',9,7],['WORKER',10,9],['WORKER',8,8]]);
sweep('LOUNGE',10,[['BATTLE',1,10],['BATTLE',2,9],['BATTLE',3,8],['BATTLE',4,7],['BATTLE',5,6],
  ['BATTLE',11,4],['BATTLE',10,1],['BATTLE',9,5],['BATTLE',8,2]]);
sweep('WORKER',11,[['LOUNGE',1,9],['LOUNGE',2,10],['LOUNGE',3,11],['LOUNGE',5,2],['LOUNGE',4,1],
  ['LOUNGE',6,3],['LOUNGE',7,8],['LOUNGE',8,4],['LOUNGE',9,7],['LOUNGE',10,5]]);
sweep('ASTROMECH',9,[['LOUNGE',1,7],['LOUNGE',2,5],['LOUNGE',3,9],['LOUNGE',4,3],
  ['LOUNGE',6,1],['LOUNGE',7,4],['LOUNGE',8,2],['LOUNGE',9,6]]);
sweep('BATTLE',11,[['LOUNGE',1,11],['LOUNGE',2,10],['LOUNGE',3,5],['LOUNGE',5,4],['LOUNGE',4,9],
  ['LOUNGE',6,3],['LOUNGE',7,8],['LOUNGE',8,2],['LOUNGE',9,7],['LOUNGE',10,6]]);
// Those sweeps ran on a base with these counts, so the fill order has to be asked
// over the same slots the droid was actually choosing between.
const SWEPT={WORKER:11,ASTROMECH:9,BATTLE:11,LOUNGE:10};
const sweptOrder=(station,origin)=>order(station,origin).filter(i=>i<SWEPT[station]);
const predict=row=>{
  const home=row.free.filter(s=>s.station===row.droidType),pool=home.length?home:row.free;
  for(const station of[...NEAREST_ORDER,'LOUNGE']){
    const here=pool.filter(s=>s.station===station);
    if(!here.length)continue;
    const seq=sweptOrder(station,{station:row.fromStation,slot:row.fromSlot});
    return here.slice().sort((a,b)=>seq.indexOf(a.slot)-seq.indexOf(b.slot))[0];
  }
  return pool[0];
};
const per={};let hit=0;
for(const row of rows){
  const got=predict(row),right=got&&got.station===row.station&&got.slot===row.landed;
  (per[row.station]=per[row.station]||{hit:0,n:0}).n++;
  if(right){per[row.station].hit++;hit++}
}
console.log('    '+Object.entries(per).map(([k,v])=>`${k} ${v.hit}/${v.n}`).join('   ')+`   overall ${hit}/${rows.length}`);
ok('the Lounge, the one station swept from two directions, is mostly right',
  per.LOUNGE.hit/per.LOUNGE.n>0.8,`${per.LOUNGE.hit}/${per.LOUNGE.n}`);
ok('and beats the 12/19 the fixed Lounge list managed',per.LOUNGE.hit>12,`${per.LOUNGE.hit}/19`);
ok('Astromech is carried by the mission slots',per.ASTROMECH.hit>=7,`${per.ASTROMECH.hit}/${per.ASTROMECH.n}`);
ok('Battle is unchanged, since its list is unchanged',per.BATTLE.hit===10,`${per.BATTLE.hit}/${per.BATTLE.n}`);
ok('overall it stays within a few of the fitted lists',hit>=36,`${hit}/${rows.length}`);

console.log(fails?`\n${fails} FAILED`:'\nall passed');
process.exit(fails?1:0);
