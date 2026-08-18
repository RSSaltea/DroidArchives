// Recorded landings used to live in a Map, so tabbing out lost them: the cloud
// session refreshes, reloads the profile, and applyProfileData cleared the Map.
// Every dropdown reset to its placeholder, and because a landing that is not
// recorded consumes nothing, the free-slot lists further down the plan went back
// to offering slots an earlier step had already taken. Runs the real store and
// the real free-slot walk.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
const lines=src.split('\r\n');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log(`  ${c?'ok  ':'FAIL'} ${l}${c?'':'  '+x}`)};
const grabLine=k=>lines.find(l=>l.startsWith(k));
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

const CAP={WORKER:4,ASTROMECH:3,BATTLE:2,UPGRADE_CHIP:1,LOUNGE:5};
// Worker 1-3 full, Astromech 1-3 full, Battle 1 full, Lounge 1-2 full.
const placed=[
  {station:'WORKER',slot:0},{station:'WORKER',slot:1},{station:'WORKER',slot:2},
  {station:'ASTROMECH',slot:0},{station:'ASTROMECH',slot:1},{station:'ASTROMECH',slot:2},
  {station:'BATTLE',slot:0},
  {station:'LOUNGE',slot:0},{station:'LOUNGE',slot:1}];
let store={};
const sb={console,Math,Number,Array,Set,Map,Object,JSON,ROSTER:'ROSTER',
  state:{sharedView:null},
  profileId:'p1',
  WORK_STATIONS:['WORKER','ASTROMECH','BATTLE','UPGRADE_CHIP'],
  stationSlotIndices:x=>Array.from({length:CAP[x]||0},(_,i)=>i),
  slotLabAllowed:()=>true,slotLogTracking:()=>true,
  placements:()=>({placed}),
  localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}}};
sb.activeProfile=()=>({id:sb.profileId});
vm.createContext(sb);
for(const k of['const SLOT_SESSION_KEY=','const SLOT_SESSION_MAX=','const slotSessionProfile=','const slotSessionWrite='])
  vm.runInContext(grabLine(k),sb);
for(const k of['const slotSessionRead=','const slotLogSession=','function slotLogFree','function annotateLogSlots'])
  vm.runInContext(grab(k),sb);
const run=e=>vm.runInContext(e,sb);
const annotate=steps=>{sb.steps=steps;run('annotateLogSlots(steps)');return steps};
const offer=step=>(step.freeSlots||[]).map(f=>`${f.station} ${f.slot+1}`).join(', ');

console.log('=== the recordings outlive the page ===');
run(`slotLogSession.set('step one',{station:'WORKER',slot:3})`);
ok('a recording is written to localStorage',Boolean(store['droid-archive-slot-session']),JSON.stringify(store));
ok('and read back',JSON.stringify(run(`slotLogSession.get('step one')`))==='{"station":"WORKER","slot":3}');
// A reload is a fresh context over the same storage.
{
  const kept=store['droid-archive-slot-session'];
  const sb2={console,Math,Number,Array,Set,Map,Object,JSON,
    activeProfile:()=>({id:'p1'}),
    localStorage:{getItem:k=>k==='droid-archive-slot-session'?kept:null,setItem:()=>{}}};
  vm.createContext(sb2);
  for(const k of['const SLOT_SESSION_KEY=','const SLOT_SESSION_MAX=','const slotSessionProfile=','const slotSessionWrite='])
    vm.runInContext(grabLine(k),sb2);
  for(const k of['const slotSessionRead=','const slotLogSession='])vm.runInContext(grab(k),sb2);
  ok('and survives a reload of the page',
    JSON.stringify(vm.runInContext(`slotLogSession.get('step one')`,sb2))==='{"station":"WORKER","slot":3}');
}
ok('a different profile sees an empty set',(()=>{sb.profileId='p2';
  const got=run(`slotLogSession.get('step one')`);sb.profileId='p1';return got===undefined})());
ok('and switching back finds them again',
  JSON.stringify(run(`slotLogSession.get('step one')`))==='{"station":"WORKER","slot":3}');
ok('clear empties them',(()=>{run('slotLogSession.clear()');return run(`slotLogSession.get('step one')`)===undefined})());
ok('the store is capped so it cannot grow without limit',run('SLOT_SESSION_MAX')===400);
{
  run('slotLogSession.clear()');
  for(let i=0;i<430;i++)run(`slotLogSession.set('s${i}',{station:'WORKER',slot:0})`);
  const kept=run(`Object.keys(slotSessionRead().entries).length`);
  ok('over the cap, the oldest go first',kept===400,String(kept));
  ok('and the newest is still there',Boolean(run(`slotLogSession.get('s429')`)));
  ok('while the oldest is not',run(`slotLogSession.get('s0')`)===undefined);
  run('slotLogSession.clear()');
}

console.log('\n=== nothing clears them behind your back ===');
ok('reloading the profile does not',!/function applyProfileData\(data\)\{slotLogSession\.clear\(\)/.test(src));
ok('opening a group profile does not',!/openGroupProfile\(groupId,ownerId,profileId\)\{slotLogSession\.clear\(\)/.test(src));
ok('leaving one does not',!/exitSharedProfile\(goToGroups=true\)\{slotLogSession\.clear\(\)/.test(src));
ok('applying a layout still does, since that changes the Base',
  /clearOptimiseMarks=\(\)=>\{slotLogSession\.clear\(\)/.test(src));
ok('and so does the Slot Lab reset',/slotLogClear\(\);slotLogSession\.clear\(\)/.test(src));

console.log('\n=== a slot taken in between is not offered again ===');
// Astromech 3 is emptied by step 1, step 2 is recorded as landing there, so
// step 3 must not be offered it. This is what broke once the recording was lost.
run('slotLogSession.clear()');
run(`slotLogSession.set('step2',{station:'ASTROMECH',slot:2})`);
{
  const steps=annotate([
    {kind:'lounge',from:'ASTROMECH',fromSlot:2,to:'LOUNGE',text:'step1'},
    {kind:'work',from:'LOUNGE',fromSlot:0,to:'ASTROMECH',text:'step2'},
    {kind:'work',from:'LOUNGE',fromSlot:1,to:'ASTROMECH',text:'step3'}]);
  ok('the recorded step shows its landing',JSON.stringify(steps[1].logged)==='{"station":"ASTROMECH","slot":2}');
  ok('the freed slot is offered to the step that takes it',
    steps[1].freeSlots.some(f=>f.station==='ASTROMECH'&&f.slot===2),offer(steps[1]));
  ok('but not to the step after it',
    !steps[2].freeSlots.some(f=>f.station==='ASTROMECH'&&f.slot===2),offer(steps[2]));
  ok('the later step still sees the rest',steps[2].freeSlots.length===steps[1].freeSlots.length-1,
    `${steps[1].freeSlots.length} then ${steps[2].freeSlots.length}`);
}
{
  // Same plan with the recording lost: every list is identical, which is exactly
  // the symptom in the report.
  run('slotLogSession.clear()');
  const steps=annotate([
    {kind:'lounge',from:'ASTROMECH',fromSlot:2,to:'LOUNGE',text:'step1'},
    {kind:'work',from:'LOUNGE',fromSlot:0,to:'ASTROMECH',text:'step2'},
    {kind:'work',from:'LOUNGE',fromSlot:1,to:'ASTROMECH',text:'step3'}]);
  ok('without a recording the app cannot know, and says so by offering both',
    offer(steps[1])===offer(steps[2]),`${offer(steps[1])} / ${offer(steps[2])}`);
}

console.log('\n=== the Lounge is recorded too ===');
run('slotLogSession.clear()');
{
  const steps=annotate([
    {kind:'stage',from:'WORKER',fromSlot:0,to:'LOUNGE',text:'send to lounge'},
    {kind:'work',from:'LOUNGE',fromSlot:1,to:'WORKER',text:'go to work'}]);
  ok('a droid sent to the Lounge gets a box',Boolean(steps[0].freeSlots),'none offered');
  ok('offering only Lounge slots, since the station is not in doubt',
    steps[0].freeSlots.every(f=>f.station==='LOUNGE'),offer(steps[0]));
  ok('and only the free ones',offer(steps[0])==='LOUNGE 3, LOUNGE 4, LOUNGE 5',offer(steps[0]));
  ok('a work step still gets every station that takes a worker',
    new Set(steps[1].freeSlots.map(f=>f.station)).size>1,offer(steps[1]));
  ok('and never a Lounge slot, since going to work is not going to the Lounge',
    !steps[1].freeSlots.some(f=>f.station==='LOUNGE'),offer(steps[1]));
}
{
  // A Lounge slot freed by one step and taken by the next has to close, same as
  // the work stations.
  run('slotLogSession.clear()');
  run(`slotLogSession.set('second to lounge',{station:'LOUNGE',slot:0})`);
  const steps=annotate([
    {kind:'work',from:'LOUNGE',fromSlot:0,to:'WORKER',text:'leaves lounge 1'},
    {kind:'stage',from:'WORKER',fromSlot:0,to:'LOUNGE',text:'second to lounge'},
    {kind:'stage',from:'WORKER',fromSlot:1,to:'LOUNGE',text:'third to lounge'}]);
  ok('the vacated Lounge slot is offered to the next arrival',
    steps[1].freeSlots.some(f=>f.slot===0),offer(steps[1]));
  ok('and closed again once it is recorded as taken',
    !steps[2].freeSlots.some(f=>f.slot===0),offer(steps[2]));
}
ok('the record box is drawn for Lounge steps as well as work ones',
  src.includes("(step.kind==='work'||step.to==='LOUNGE')&&!state.sharedView"));
ok('the scoring rule that walks stations knows about the Lounge now',
  src.includes("for(const station of[...NEAREST_ORDER,'UPGRADE_CHIP','LOUNGE']){"));

console.log(fails?`\n${fails} FAILED`:'\nall passed');
process.exit(fails?1:0);
