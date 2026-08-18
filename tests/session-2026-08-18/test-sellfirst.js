// The reported case: BDX EXPLORER sits in the Upgrade Chip slot and is to be
// sold; NAV-EX (Worker type) is in a full Worker station and should end up in
// the chip slot; MECHA-DROID is parked in Build and should take the Worker slot.
// Classic did it in 3 by naming slots directly. What can the route planner do?
const fs=require('fs'),vm=require('vm');
const lines=fs.readFileSync('c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js','utf8').split(/\r?\n/);
const a=lines.findIndex(l=>l.startsWith('const unitName=')),b=lines.findIndex(l=>l.startsWith('function safeOptimiseStepPlan'));
const raw=lines.slice(a,b+1).join('\n');
// Optional arg swaps the auto-route model so both readings can be compared.
const model=process.argv[2]||'stage';
const source=raw.replace(`const AUTO_ROUTE_MODEL='stage'`,`const AUTO_ROUTE_MODEL='${model}'`);
if(model!=='stage'&&source===raw)throw new Error('model swap failed - constant not found');

const CAP={WORKER:4,ASTROMECH:3,BATTLE:2,BUILD:3,LOUNGE:5,COMPANION:2,UPGRADE_CHIP:1};
const droid=(name,type)=>({name,type,rarity:'EPIC',variants:{DEFAULT:{income:10}}});
const sandbox={console,PRODUCTIVE_STATIONS:['WORKER','ASTROMECH','BATTLE'],floorNote:(s,i)=>s==='BATTLE'?(i>=5?' (upstairs)':' (downstairs)'):'',MAP_FLOORS:['downstairs','upstairs'],MAP_SPOTS:{downstairs:{},upstairs:{}},
  SLOT_RULES:Object.fromEntries(Object.keys(CAP).map(k=>[k,{initial:CAP[k],unlocks:[]}])),
  stationSlotIndices:t=>Array.from({length:CAP[t]},(_,i)=>i),slotFillOrder:t=>Array.from({length:CAP[t]},(_,i)=>i),
  stationName:t=>t,variantText:v=>v,picture:()=>'',
  localStorage:{getItem:()=>null,setItem:()=>{}},
  state:{droids:[droid('NAV-EX','WORKER'),droid('MECHA-DROID','WORKER'),droid('BDX EXPLORER','WORKER'),
    droid('W1','WORKER'),droid('W2','WORKER'),droid('W3','WORKER'),droid('A1','ASTROMECH'),droid('A2','ASTROMECH'),
    droid('A3','ASTROMECH'),droid('B1','BATTLE'),droid('B2','BATTLE')]}};
vm.createContext(sandbox);vm.runInContext(source,sandbox);

const at=(name,variant,station,slot,src)=>({name,variant,station,slot,source:src,unit:0});
// Astromech and Battle are full so they are never a landing option; Worker is
// full too, with NAV-EX holding the last slot.
const filler=[at('W1','DEFAULT','WORKER',0,3),at('W2','DEFAULT','WORKER',1,4),at('W3','DEFAULT','WORKER',2,5),
  at('A1','DEFAULT','ASTROMECH',0,6),at('A2','DEFAULT','ASTROMECH',1,7),at('A3','DEFAULT','ASTROMECH',2,8),
  at('B1','DEFAULT','BATTLE',0,9),at('B2','DEFAULT','BATTLE',1,10)];
const baseP={placed:[...filler,
  at('NAV-EX','DIAMOND','WORKER',3,0),
  at('MECHA-DROID','BESKAR','BUILD',0,1),
  at('BDX EXPLORER','DIAMOND','UPGRADE_CHIP',0,2)],overflow:[]};
const projected={placed:[...filler,
  at('NAV-EX','DIAMOND','UPGRADE_CHIP',0,0),
  at('MECHA-DROID','BESKAR','WORKER',3,1)],
  sell:[at('BDX EXPLORER','DIAMOND','UPGRADE_CHIP',0,2)],overflow:[]};

const steps=sandbox.safeOptimiseStepPlan(baseP,projected);
const visits=sandbox.optimiseVisits(steps);
console.log(`${steps.length} steps / ${visits.length} stops\n`);
visits.forEach((v,i)=>{console.log(`${i+1}. ${v.at}`);v.steps.forEach(s=>console.log(`     ${s.text}`))});
const sellIdx=steps.findIndex(s=>s.type==='sell');
console.log(`\nsell happens at step ${sellIdx+1} of ${steps.length}`);
