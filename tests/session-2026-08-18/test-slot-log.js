// The slot-choice log, scored against the landings actually measured in game.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8'),css=fs.readFileSync(ROOT+'styles.css','utf8');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log(`  ${c?'ok  ':'FAIL'} ${l}${c?'':'  '+x}`)};
const grab=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const line=k=>src.split(/\r?\n/).find(l=>l.trimStart().startsWith(k));
const block=k=>{const i=src.indexOf(k);return src.slice(i,src.indexOf('\n];',i)+3)};

const CAP={WORKER:11,ASTROMECH:9,BATTLE:11,LOUNGE:10};
const store={};
const sandbox={console,Math,Number,Array,Set,JSON,Date,
  WORK_STATIONS:["WORKER","ASTROMECH","BATTLE","UPGRADE_CHIP"],NEAREST_ORDER:["WORKER","BATTLE","ASTROMECH"],
  MAP_FLOORS:['downstairs','upstairs'],
  stationSlotIndices:t=>Array.from({length:CAP[t]},(_,i)=>i),
  state:{rebirth:34,sharedView:null},activeProfile:()=>({id:'p1',name:'Main'}),
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)}}};
vm.createContext(sandbox);
vm.runInContext(/const MAP_SPOTS=\{[\s\S]*?\n\};/.exec(src)[0],sandbox);
vm.runInContext(line('const MEASURED_FILL_ORDER='),sandbox);
vm.runInContext(/const slotFillOrder=\(station,origin\)=>\{[\s\S]*?\n\};/.exec(src)[0],sandbox);
for(const k of ['const ASTROMECH_MISSION_SLOTS=','const SLOT_LOG_KEY=','const slotLogWrite=',
  'const slotLogClear=','const slotLogTracking=','const slotLogSetTracking=','const SLOT_FLOOR_PENALTY=','const SLOT_GAP_UNREACHABLE='])
  vm.runInContext(line(k),sandbox);
// slotLogAll filters as it reads now, so it spans lines like the functions do.
for(const k of ['const slotLogAll=','function slotLogPoint','function slotWalkGap','function slotLogNearest','function slotLogScores','function slotLogAdd'])
  vm.runInContext(grab(k),sandbox);
vm.runInContext(line('const slotLogSame='),sandbox);
vm.runInContext(block('const SLOT_RULES_UNDER_TEST='),sandbox);
const run=e=>vm.runInContext(e,sandbox);

// Every landing measured in game, replayed as log rows: the free set shrinks as
// the sweep fills the station.
const rows=[];
// During each sweep the other stations were full, so the candidates really were
// just that station's free slots — expressed now as (station, slot) pairs.
const TYPE={WORKER:'WORKER',ASTROMECH:'ASTROMECH',BATTLE:'BATTLE',LOUNGE:'WORKER'};
const sweep=(station,count,pairs)=>{
  let free=Array.from({length:count},(_,i)=>({station,slot:i}));
  for(const [fromStation,fromSlot,landed] of pairs){
    rows.push({station,fromStation,fromSlot:fromSlot-1,free:free.slice(),landed:landed-1,
      droidType:TYPE[station]});
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

console.log(`=== scoring ${rows.length} measured landings ===`);
const scores=run(`slotLogScores(${JSON.stringify(rows)})`);
for(const s of scores)console.log(`  ${String(Math.round(s.hit/s.n*100)).padStart(3)}%  ${s.name}  (${s.hit}/${s.n})`);

const by=id=>scores.find(s=>s.id===id);

ok('scores are sorted best first',scores.every((s,i)=>i===0||scores[i-1].hit>=s.hit));
ok('three rules are scored',scores.length===3);
ok('every rule picks a station and a slot together',
  scores.every(s=>s.n===rows.length));
ok('the fitted rule still leads on its own training data',by('fixed').hit>=by('nearest').hit);
ok('nearest-from-origin explains the Lounge, where a fixed order cannot',
  by('nearest').per.LOUNGE.hit/by('nearest').per.LOUNGE.n>0.8,
  by('nearest').per.LOUNGE.hit+'/'+by('nearest').per.LOUNGE.n);



console.log('\n=== the store ===');
ok('starts empty',run('slotLogAll()').length===0);
ok('a landing outside the free set is refused',
  run(`slotLogAdd({station:'WORKER',fromStation:'LOUNGE',fromSlot:0,free:[{station:'WORKER',slot:1},{station:'WORKER',slot:2}],landed:7})`)===false);
ok('and nothing was written',run('slotLogAll()').length===0);
ok('a real landing is accepted',
  run(`slotLogAdd({station:'WORKER',fromStation:'LOUNGE',fromSlot:0,free:[{station:'WORKER',slot:1},{station:'WORKER',slot:2}],landed:2})`)===true);
ok('the row keeps every slot it could have taken, not just the landing',
  run('slotLogAll()')[0].free.length===2&&run('slotLogAll()')[0].free[0].station==='WORKER');
ok('plus origin, rebirth and a timestamp',(()=>{const r=run('slotLogAll()')[0];
  return r.fromStation==='LOUNGE'&&r.fromSlot===0&&r.rebirth===34&&Boolean(r.at)})());
ok('tracking is off unless turned on',run('slotLogTracking()')===false);
run('slotLogSetTracking(true)');
ok('and survives a reload once on',run('slotLogTracking()')===true);
ok('clearing empties it',(()=>{run('slotLogClear()');return run('slotLogAll()').length===0})());

console.log('\n=== the recording control ===');
ok('the landing is picked from a list, never typed',
  src.includes('<select data-log-step=')&&!src.includes('inputmode="numeric" placeholder="slot" data-log-step'));
ok('the list holds only slots that were free',src.includes('const options=free.map(spot=>'));
ok('each option is named in full, floor included',src.includes('stationSlotLabel(spot.station,spot.slot)'));
ok('and the control is hidden when nothing is free',src.includes('slotLabAllowed()&&free.length'));
ok('free sets are worked out in plan order, allowing for what the steps above did',
  src.includes("step.freeSlots=slotLogFree(taken,freed,lounge?['LOUNGE']:undefined)"));
ok('a recorded landing survives the rerender that follows it',
  src.includes('slotLogSession.set(step.text,spot)')&&src.includes('slotLogSession.get(step.text)'));
ok('and is cleared when a layout is applied, since the plan changes then',
  /clearOptimiseMarks=\(\)=>\{slotLogSession\.clear\(\)/.test(src));

console.log('\n=== wiring ===');
ok('steps carry where the droid started',src.includes('fromSlot:startSlotAt.get(tracked[action.i])'));
ok('the plan is annotated before it is drawn',src.includes('annotateLogSlots(steps);'));
ok('the log lives outside the profile, so no Base can be lost to it',
  src.includes("SLOT_LOG_KEY='droid-archive-slot-log'"));
ok('owner only, and only on your own Base',src.includes('if(trackHost&&slotLabAllowed()&&!state.sharedView)'));
ok('findings appear on the Slot Lab',src.includes('slotLogFindingsHtml()+'));
ok('styled',css.includes('.step-record select{')&&css.includes('.lab-scores table{'));

console.log('\n=== multiple profiles ===');
// One shared pool on purpose: how the game picks a slot is a property of the
// game, not of a save, so pooling gets to an answer sooner. But each row has to
// name its profile, because profiles differ in rebirth and unlocked slots.
run('slotLogClear()');
run(`slotLogAdd({station:'WORKER',fromStation:'LOUNGE',fromSlot:0,free:[{station:'WORKER',slot:1},{station:'WORKER',slot:2}],landed:2})`);
ok('a row records which profile produced it',(()=>{const r=run('slotLogAll()')[0];
  return r.profileId==='p1'&&r.profile==='Main'})(),JSON.stringify(run('slotLogAll()')[0]||{}));
ok('and the rebirth, since profiles sit at different ones',run('slotLogAll()')[0].rebirth===34);
ok('every profile writes to one pool, not one log each',src.includes("SLOT_LOG_KEY='droid-archive-slot-log'"));
ok('the findings say which profiles contributed',src.includes('Across ${byProfile.length} of your profiles'));
ok('and warn that a stale Base drags the scores down',src.includes('its rows will drag the scores down'));
// Reloading the profile must NOT wipe the recordings. Tabbing out lets the cloud
// session refresh, which reloads the profile, and clearing there reset every
// dropdown and quietly made the free-slot lists further down the plan wrong.
ok('reloading the profile no longer wipes the recordings',
  !/function applyProfileData\(data\)\{slotLogSession\.clear\(\)/.test(src));
ok('the recordings are scoped to the profile instead, so a switch shows an empty set',
  src.includes("const slotSessionProfile=()=>activeProfile()?.id||'local';")&&
  src.includes('store.profileId===slotSessionProfile()'));
run('slotLogClear()');

console.log('\n=== other peoples profiles are not tracked at all ===');
// A shared Base is somebody else's and it moves without you: slots are bought and
// droids shuffled between your visits, so a row from one measures a state you
// cannot check. Your own saves only.
run('slotLogClear()');
sandbox.state.sharedView={ownerId:'u2',ownerName:'Alexx',profileId:'p9',profileName:'Main'};
sandbox.state.rebirth=12;
const refused=run(`slotLogAdd({station:'BATTLE',fromStation:'LOUNGE',fromSlot:0,free:[{station:'BATTLE',slot:0},{station:'BATTLE',slot:9}],landed:9})`);
ok('a landing on their Base is refused',refused===false,String(refused));
ok('and nothing is written',run('slotLogAll()').length===0,String(run('slotLogAll()').length));
sandbox.state.sharedView=null;sandbox.state.rebirth=34;
run(`slotLogAdd({station:'WORKER',fromStation:'LOUNGE',fromSlot:0,free:[{station:'WORKER',slot:1},{station:'WORKER',slot:2}],landed:2})`);
const mine=run('slotLogAll()')[0];
ok('your own rows still record normally',mine.profile==='Main'&&mine.profileId==='p1'&&mine.rebirth===34,JSON.stringify(mine));
ok('and carry no shared flag to carry',mine.shared===undefined,String(mine.shared));

console.log('\n=== rows collected before, on somebody elses Base, are dropped ===');
// Reading purges rather than a one-off migration, so a stale tab or an older
// build cannot put them back.
run('slotLogWrite([{station:"WORKER",landed:1,profile:"Alexx · Main",profileId:"p9",ownerId:"u2",shared:true},{station:"WORKER",landed:2,profile:"Main",profileId:"p1"}])');
const kept=run('slotLogAll()');
ok('the shared row is gone',kept.length===1&&kept[0].profile==='Main',JSON.stringify(kept));
ok('and the purge is committed, not just filtered on the way out',
  run('JSON.parse(localStorage.getItem(SLOT_LOG_KEY)).length')===1);
ok('a log with nothing shared is left alone',(()=>{
  run('slotLogWrite([{station:"WORKER",landed:1,profile:"Main",profileId:"p1"}])');
  return run('slotLogAll()').length===1})());
run('slotLogClear()');

console.log('\n=== nothing is even offered while a group profile is open ===');
ok('the record box is withheld',src.includes("(step.kind==='work'||step.to==='LOUNGE')&&!state.sharedView&&slotLogTracking()"));
ok('the plan is not annotated with free sets',src.includes('if(state.sharedView||!slotLabAllowed()||!slotLogTracking())return;'));
ok('and the Track button is hidden',src.includes('if(trackHost&&slotLabAllowed()&&!state.sharedView){'));
ok('slotLogAdd refuses as a backstop, whatever the UI did',
  /function slotLogAdd\(row\)\{[\s\S]{0,400}if\(state\.sharedView\)return false;/.test(src));
ok('the findings say group profiles are never recorded',
  src.includes('Group profiles are never recorded'));
// Popping into somebody's group profile and back must not cost you the
// recordings you had made on your own Base. Nothing is recorded while you are in
// one, and the store is keyed by profile, so neither needs to clear anything.
ok('opening a group profile leaves your recordings alone',
  !/async function openGroupProfile\(groupId,ownerId,profileId\)\{slotLogSession\.clear\(\)/.test(src));
ok('and so does leaving one',
  !/async function exitSharedProfile\(goToGroups=true\)\{slotLogSession\.clear\(\)/.test(src));
ok('the only thing that still clears them is applying a layout, which changes the Base',
  /clearOptimiseMarks=\(\)=>\{slotLogSession\.clear\(\)/.test(src));
run('slotLogClear()');

console.log('\n=== the handlers redraw with something that exists ===');
// optimisePage has no rerender in scope. Calling one there threw after the
// setting had already been saved, so the toggle only took effect on refresh.
const page=(()=>{const i=src.indexOf('function optimisePage(){');let d=0,j=i;
  for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}
  return src.slice(i,j)})();
ok('optimisePage does not define rerender',!/const rerender=|function rerender/.test(page));
ok('so nothing inside it may call rerender',!/\brerender\(\)/.test(page),
  (page.match(/.{60}\brerender\(\).{20}/)||[''])[0]);
ok('the track toggle redraws the page',/slotLogSetTracking\(!slotLogTracking\(\)\);optimisePage\(\)/.test(page));
ok('and so does recording a landing',/slotLogSession\.set\(step\.text,spot\);[\s\S]{0,90}optimisePage\(\)/.test(page));

console.log('\n=== the plan is simulated forward ===');
// Steps above a given one have already emptied their slots by the time you reach
// it — a sell for good, a move until it lands.
const CAP2={WORKER:5,ASTROMECH:2,BATTLE:1,UPGRADE_CHIP:1};
const sb2={console,Math,Number,Array,Set,Map,ROSTER:'ROSTER',
  // Your own Base: annotateLogSlots bails out on a shared one.
  state:{sharedView:null},
  WORK_STATIONS:['WORKER','ASTROMECH','BATTLE','UPGRADE_CHIP'],
  stationSlotIndices:x=>Array.from({length:CAP2[x]||0},(_,i)=>i),
  slotLabAllowed:()=>true,slotLogTracking:()=>true,slotLogSession:new Map(),
  placements:()=>({placed:[...[0,1,2,3].map(slot=>({station:'WORKER',slot})),
    {station:'ASTROMECH',slot:0},{station:'ASTROMECH',slot:1},
    {station:'BATTLE',slot:0},{station:'UPGRADE_CHIP',slot:0}]})};
vm.createContext(sb2);
for(const k of ['function slotLogFree','function annotateLogSlots'])vm.runInContext(grab(k),sb2);
const plan=[{kind:'sell',from:'WORKER',fromSlot:1,text:'sell a'},
  {kind:'work',from:'BUILD',fromSlot:0,to:'WORKER',text:'send a'},
  {kind:'work',from:'BUILD',fromSlot:1,to:'WORKER',text:'send b'}];
const done=vm.runInContext(`(()=>{const s=${JSON.stringify(plan)};annotateLogSlots(s);return s})()`,sb2);
const offer=i=>done[i].freeSlots.map(f=>`${f.station} ${f.slot+1}`).join(', ');
ok('a sell above frees its slot for the steps below',
  done[1].freeSlots.some(f=>f.station==='WORKER'&&f.slot===1),offer(1));
ok('the Base free slot is still offered too',
  done[1].freeSlots.some(f=>f.station==='WORKER'&&f.slot===4),offer(1));
ok('and slots in other stations',done[1].freeSlots.length===2,offer(1));
sb2.slotLogSession.set('send a',{station:'WORKER',slot:1});
const done2=vm.runInContext(`(()=>{const s=${JSON.stringify(plan)};annotateLogSlots(s);return s})()`,sb2);
ok('once a landing is recorded, later steps stop offering that slot',
  !done2[2].freeSlots.some(f=>f.station==='WORKER'&&f.slot===1),
  done2[2].freeSlots.map(f=>`${f.station} ${f.slot+1}`).join(', '));
ok('sells are not offered a dropdown of their own',!done[0].freeSlots);

console.log(fails?`\n${fails} FAILURE(S)`:'\nPASS: true');
process.exit(fails?1:0);
