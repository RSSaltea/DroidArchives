// The classic plan used to say "Move X from Worker 5 to empty Worker 3", which is
// not a thing the game lets you do. You tell a droid to go to work and it takes
// the slot it wants; the only targeted placement is swapping your companion with
// whoever already occupies a slot. Runs optimiseStepPlan for real.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
const lines=src.split('\r\n');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log(`  ${c?'ok  ':'FAIL'} ${l}${c?'':'  '+x}`)};
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

const sandbox={console,state:{rebirth:22,purchasedSlots:[],novaUpgrades:{'lounge-slot':4,'companion-slot':1,'upgrade-chip-station':1},loungePurchased:4,
  droids:[{name:'W',type:'WORKER'},{name:'A',type:'ASTROMECH'},{name:'B',type:'BATTLE'}]},
  variantText:v=>v};
vm.createContext(sandbox);
for(const prefix of[
  'const SLOT_RULES=','const ASTROMECH_MISSION_SLOTS=','const BATTLE_UPSTAIRS_FROM=',
  'const novaLevelFor=','const loungeNovaSlots=','const blueprintStorageSlots=','const loungeSlotMeta=',
  'const slotPurchaseKey=','function slotUnlockRebirth','function isSlotEligible',
  'const isSlotPurchased=','const isSlotUnlocked=','const stationSlotIndices=',
  'const MAP_SPOTS=','const MAP_FLOORS=',
  'const SLOT_FLOOR_PENALTY=','const SLOT_GAP_UNREACHABLE=','function slotWalkGap','function slotLogPoint',
  'const MEASURED_FILL_ORDER=','const slotFillOrder=',
  'const slotFloor=','const floorNote=','const unitName=','const stationLabel=','const slotLabel=',
  'const sameDroidVariant=','const sameSlot=','const slotStationName=','const sameOwnedUnit=',
  'function cleanOptimiseSteps','const cleanOptimiseStepsBySlot=','cleanOptimiseSteps=steps=>{',
  'function normaliseProjectedForSteps','function optimiseStepPlan',
])vm.runInContext(grab(prefix),sandbox);
vm.runInContext(`state.purchasedSlots=Object.keys(SLOT_RULES).flatMap(type=>Array.from({length:SLOT_RULES[type].initial+SLOT_RULES[type].unlocks.length},(_,i)=>type+':'+i));`,sandbox);
const run=expr=>vm.runInContext(expr,sandbox);
const plan=(basePlaced,projPlaced,sell=[])=>run(`optimiseStepPlan(${JSON.stringify({placed:basePlaced})},${JSON.stringify({placed:projPlaced,sell,overflow:[]})}).map(s=>s.text)`);
const u=(source,name,variant,station,slot)=>({source,unit:0,name,variant,station,slot});

console.log('=== the unfollowable instruction is gone from the source ===');
ok('no step says "to empty <slot>"',!src.includes('to empty ${slotLabel'),'still there');
ok('a move step is built by placeText',src.includes('text:placeText(unit,pos,goal)'));
ok('both swap steps are built by swapText',
  src.includes('text:swapText(unit,pos,blocker,blockerPos)')&&src.includes('text:swapText(unit,pos,target,goal)'));
ok('placeText predicts rather than instructs',/it will take \$\{slotLabel\(goal\)\}/.test(src));
ok('and falls back to fill-then-swap',/let that slot fill, then make \$\{name\} your companion/.test(src));
ok('the swap step says how a swap is actually done',/make \$\{unitName\(unit\)\} your companion, then swap it with/.test(src));
ok('the prediction uses the same fill order as the Base',src.includes('slotFillOrder(station,origin).find(slot=>!slotOwner.has'));

console.log('\n=== a swap is no longer rewritten into two placements ===');
// It used to turn "swap A and B" into two moves into empty slots, which reads
// more simply and cannot be carried out. The swap is the followable one.
ok('the conversion is gone',!src.includes("a.type==='swap'&&b.type==='move'&&b.to.station!=='BUILD'"));
ok('cleanOptimiseSteps just passes the steps through',src.includes('function cleanOptimiseSteps(steps){const cleaned=[...steps];'));

console.log('\n=== a move the game would make anyway is stated as a prediction ===');
{
  // A Worker droid sitting in the Lounge, with Worker slots free. Telling it to go
  // to work sends it to Worker; the plan just has to name where it will land.
  const base=[u(0,'W','BESKAR','LOUNGE',0)];
  const landing=run(`slotFillOrder('WORKER',{station:'LOUNGE',slot:0})[0]`);
  const steps=plan(base,[u(0,'W','BESKAR','WORKER',landing)]);
  ok('one step',steps.length===1,JSON.stringify(steps));
  ok('it tells you to send it to work',/^Tell W BESKAR in LOUNGE 1 to go to work/.test(steps[0]),steps[0]);
  ok('and names the slot as what will happen, not what to do',
    steps[0].includes('it will take WORKER '+(landing+1))&&!steps[0].includes('to empty'),steps[0]);
  console.log('    '+steps[0]);
}

console.log('\n=== a move the game would not make becomes fill-then-swap ===');
{
  // Same droid, but the plan wants a Worker slot the game would not choose. That
  // cannot be ordered, so the step has to describe the swap instead.
  const order=run(`slotFillOrder('WORKER',{station:'LOUNGE',slot:0})`);
  const wanted=order[order.length-1];
  const steps=plan([u(0,'W','BESKAR','LOUNGE',0)],[u(0,'W','BESKAR','WORKER',wanted)]);
  ok('one step',steps.length===1,JSON.stringify(steps));
  ok('it does not pretend you can place it',!steps[0].includes('to empty'),steps[0]);
  ok('it says to let the slot fill first',steps[0].includes('let that slot fill'),steps[0]);
  ok('then make it your companion and swap',steps[0].includes('your companion and swap the two'),steps[0]);
  ok('and says where sending it to work would land it instead',
    steps[0].includes('would put it in WORKER '+(order[0]+1)),steps[0]);
  console.log('    '+steps[0]);
}

console.log('\n=== a swap step explains the one targeted placement there is ===');
{
  // Two droids that want each other's slots: unambiguously a swap.
  const steps=plan(
    [u(0,'W','BESKAR','WORKER',0),u(1,'A','BESKAR','ASTROMECH',0)],
    [u(0,'W','BESKAR','ASTROMECH',0),u(1,'A','BESKAR','WORKER',0)]);
  const swap=steps.find(t=>t.startsWith('Swap'));
  ok('a swap step is produced',Boolean(swap),JSON.stringify(steps));
  if(swap){
    ok('it names both droids and both slots',/Swap .* in WORKER 1 with .* in ASTROMECH 1/.test(swap),swap);
    ok('and says to do it through the companion',swap.includes('your companion, then swap it with'),swap);
    console.log('    '+swap);
  }
}

console.log('\n=== every step still starts with a verb the colouring knows ===');
const VERBS=Object.keys(JSON.parse('{"Sell":1,"Send":1,"Move":1,"Swap":1,"Carry":1,"Tell":1,"Make":1,"Put":1}'));
ok('the tone map is unchanged',/const STEP_VERB_TONE=\{Sell:'sell',Send:'stage',Move:'stage',Swap:'stage',Carry:'stage',Tell:'place',Make:'place',Put:'place'\}/.test(src));
{
  const all=[
    ...plan([u(0,'W','BESKAR','LOUNGE',0)],[u(0,'W','BESKAR','WORKER',run(`slotFillOrder('WORKER',{station:'LOUNGE',slot:0})[0]`))]),
    ...plan([u(0,'W','BESKAR','LOUNGE',0)],[u(0,'W','BESKAR','WORKER',run(`slotFillOrder('WORKER',{station:'LOUNGE',slot:0}).slice(-1)[0]`))]),
    ...plan([u(0,'W','BESKAR','WORKER',0),u(1,'A','BESKAR','ASTROMECH',0)],[u(0,'W','BESKAR','ASTROMECH',0),u(1,'A','BESKAR','WORKER',0)]),
    ...plan([u(0,'W','BESKAR','WORKER',0)],[],[u(0,'W','BESKAR','WORKER',0)]),
  ];
  const unknown=all.filter(t=>!VERBS.includes(t.split(' ')[0]));
  ok(`all ${all.length} generated steps open with a known verb`,!unknown.length,unknown[0]||'');
}

console.log('\n=== the route plan names the slot it wants swapped ===');
ok('the swap fallback no longer says "the slot you want"',!src.includes('whoever is in the slot you want'));
ok('it names the slot instead',src.includes('${placeName(action.to)}${toSlot(action)}${toFloor(action)}'));
ok('toSlot reads the goal slot',src.includes('const toSlot=action=>{const slot=goalSlotAt.get(tracked[action.i]);'));
ok('and says an empty slot has to fill before it can be swapped',
  src.includes('let it fill first; a swap needs somebody to swap with'));
ok('the "go to work" step is untouched, it was already right',
  src.includes('to go to work — it will take a ${placeName(action.to)}${toFloor(action)} slot.'));

console.log(fails?`\n${fails} FAILED`:'\nall passed');
process.exit(fails?1:0);
