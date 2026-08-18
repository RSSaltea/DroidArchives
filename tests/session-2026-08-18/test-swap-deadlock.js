// Reported case: R3 sits in a Companion slot and needs the Upgrade Chip slot,
// R5 sits in the Upgrade Chip slot and needs the Companion slot. Neither can go
// first - Companion is full and the chip slot is taken - so the planner gave up
// with "could not route", even though the Lounge had space to step aside into.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const lines=fs.readFileSync(ROOT+'app.js','utf8').split(/\r?\n/);
const from=lines.findIndex(l=>l.startsWith('const unitName=')),to=lines.findIndex(l=>l.startsWith('function safeOptimiseStepPlan'));
const source=lines.slice(from,to+1).join('\n');

// Every credit station full, Companion full, one Upgrade Chip slot, Lounge free.
const CAP={WORKER:2,ASTROMECH:1,BATTLE:1,BUILD:3,LOUNGE:5,COMPANION:2,UPGRADE_CHIP:1};
const droid=name=>({name,type:'ASTROMECH',rarity:'EPIC',variants:{}});
const sandbox={console,PRODUCTIVE_STATIONS:['WORKER','ASTROMECH','BATTLE'],floorNote:(s,i)=>s==='BATTLE'?(i>=5?' (upstairs)':' (downstairs)'):'',MAP_FLOORS:['downstairs','upstairs'],MAP_SPOTS:{downstairs:{},upstairs:{}},
  SLOT_RULES:Object.fromEntries(Object.keys(CAP).map(k=>[k,{initial:CAP[k],unlocks:[]}])),
  stationSlotIndices:t=>Array.from({length:CAP[t]},(_,i)=>i),slotFillOrder:t=>Array.from({length:CAP[t]},(_,i)=>i),
  stationName:t=>t,variantText:v=>v,picture:()=>'',
  localStorage:{getItem:()=>null,setItem:()=>{}},
  state:{droids:[droid('R3'),droid('R5'),droid('CHOPPER'),droid('W1'),droid('W2'),droid('A1'),droid('B1')]}};
vm.createContext(sandbox);vm.runInContext(source,sandbox);

const at=(name,station,slot,src)=>({name,variant:'RAINBOW',station,slot,source:src,unit:0});
// Credit stations packed solid so nothing can spill into them.
const filler=[at('W1','WORKER',0,3),at('W2','WORKER',1,4),at('A1','ASTROMECH',0,5),at('B1','BATTLE',0,6)];
const baseP={placed:[...filler,
  at('CHOPPER','COMPANION',0,2),
  at('R3','COMPANION',1,0),        // wants the chip slot
  at('R5','UPGRADE_CHIP',0,1),     // wants the companion slot
],overflow:[]};
const projected={placed:[...filler,
  at('CHOPPER','COMPANION',0,2),
  at('R3','UPGRADE_CHIP',0,0),
  at('R5','COMPANION',1,1),
],sell:[],overflow:[]};

const steps=sandbox.safeOptimiseStepPlan(baseP,projected);
console.log(`${steps.length} step(s):`);
steps.forEach(s=>console.log(`   [${s.type}] ${s.text}`));

const stuck=steps.find(s=>s.type==='note');
console.log('\ngave up:',Boolean(stuck));
if(stuck)console.log('  ->',stuck.text);

// Replay the plan and check both droids actually land where they should.
const where={R3:'COMPANION',R5:'UPGRADE_CHIP'};
for(const s of steps){
  if(!s.unit||s.type==='note')continue;
  const m=/take a (\w+) slot/.exec(s.text)||/to the (Lounge)/.exec(s.text)||/your companion/.test(s.text)&&['','COMPANION'];
  if(/companion/i.test(s.text))where[s.unit.name]='COMPANION';
  else if(/Lounge/.test(s.text))where[s.unit.name]='LOUNGE';
  else if(m&&m[1])where[s.unit.name]=m[1].toUpperCase();
}
console.log('\nafter following the plan:');
console.log('   R3 ends in',where.R3,'(needs UPGRADE_CHIP)');
console.log('   R5 ends in',where.R5,'(needs COMPANION)');
const solved=!stuck&&where.R3==='UPGRADE_CHIP'&&where.R5==='COMPANION';
console.log('\nPASS:',solved);
