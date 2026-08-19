// Recording a landing has to move the droid for later steps too. Park SEN-TRI
// in Lounge 1, send it to work from there, and Lounge 1 must be offered again
// to the next droid heading for the Lounge.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log(`  ${c?'ok  ':'FAIL'} ${l}${c?'':'  -> '+x}`)};
const grabFn=k=>{const i=src.indexOf(k);if(i<0)throw Error('missing '+k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};

const LOUNGE_SLOTS=[0,1,2,3,4];
const sandbox={console,ROSTER:'ROSTER',
  state:{sharedView:null},
  slotLabAllowed:()=>true, slotLogTracking:()=>true,
  // stand-in for the real one: Lounge slots minus taken, plus freed
  slotLogFree:(taken,freed,only)=>{
    if(!only||only[0]!=='LOUNGE')return[];
    const held=new Set(taken.filter(s=>s.station==='LOUNGE').map(s=>s.slot));
    for(const spot of freed) if(spot.station==='LOUNGE') held.delete(spot.slot);
    return LOUNGE_SLOTS.filter(slot=>!held.has(slot)).map(slot=>({station:'LOUNGE',slot}));
  }};
const recorded=new Map();
sandbox.slotLogSession={get:text=>recorded.get(text)};
vm.createContext(sandbox);
vm.runInContext(grabFn('function annotateLogSlots('),sandbox);

const run=steps=>{sandbox.steps=steps;vm.runInContext('annotateLogSlots(steps)',sandbox);return steps};
const lounge=s=>(s.freeSlots||[]).map(x=>x.slot).join(',');

const SEN={source:1,unit:0}, UTIL={source:2,unit:0};
const steps=()=>[
  {text:'park SEN',   unit:SEN, kind:'move', to:'LOUNGE', from:'WORKER', fromSlot:3},
  {text:'work SEN',   unit:SEN, kind:'work', to:'BATTLE', from:'LOUNGE', fromSlot:0},
  {text:'park UTIL',  unit:UTIL,kind:'move', to:'LOUNGE', from:'ASTROMECH', fromSlot:1}
];

// SEN-TRI parks in the Lounge, then goes to work from there. UTIL-TEC follows
// it into the Lounge afterwards, so it should be offered the slot SEN-TRI left.
const movesOn=()=>[
  {text:'park SEN',  unit:SEN, kind:'move', to:'LOUNGE', from:'WORKER', fromSlot:3},
  {text:'work SEN',  unit:SEN, kind:'work', to:'BATTLE', from:'LOUNGE', fromSlot:0},
  {text:'park UTIL', unit:UTIL,kind:'move', to:'LOUNGE', from:'ASTROMECH', fromSlot:1}
];
// The same, without SEN-TRI ever leaving.
const staysPut=()=>[
  {text:'park SEN',  unit:SEN, kind:'move', to:'LOUNGE', from:'WORKER', fromSlot:3},
  {text:'park UTIL', unit:UTIL,kind:'move', to:'LOUNGE', from:'ASTROMECH', fromSlot:1}
];

console.log('=== nothing recorded yet ===');
recorded.clear();
let plan=run(movesOn());
ok('every Lounge slot is offered to the first step',lounge(plan[0])==='0,1,2,3,4',lounge(plan[0]));

console.log('=== recorded into Lounge 1, then sent to work ===');
recorded.clear();
recorded.set('park SEN',{station:'LOUNGE',slot:0});   // Lounge 1
recorded.set('work SEN',{station:'BATTLE',slot:6});   // and out again
plan=run(movesOn());
ok('the slot it left is offered again',lounge(plan[2]).split(',').includes('0'),lounge(plan[2]));
ok('and nothing else was released with it',lounge(plan[2])==='0,1,2,3,4',lounge(plan[2]));

console.log('=== recorded into Lounge 1 and left there ===');
recorded.clear();
recorded.set('park SEN',{station:'LOUNGE',slot:0});
plan=run(staysPut());
ok('the occupied slot is not offered to the next droid',!lounge(plan[1]).split(',').includes('0'),lounge(plan[1]));
ok('the rest still are',lounge(plan[1])==='1,2,3,4',lounge(plan[1]));

console.log('=== the plan moves it on even with no landing recorded ===');
recorded.clear();
recorded.set('park SEN',{station:'LOUNGE',slot:0});
plan=run(movesOn());
ok('going to work frees the slot whether or not the landing was recorded',
   lounge(plan[2]).split(',').includes('0'),lounge(plan[2]));

console.log(fails?`\n${fails} FAILED`:'\nall passed');
process.exit(fails?1:0);
