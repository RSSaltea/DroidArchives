// Pulls the real planner block out of app.js and runs it against a synthetic
// base, so we are testing shipped code rather than a copy.
const fs=require('fs'),vm=require('vm');
const lines=fs.readFileSync('c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js','utf8').split(/\r?\n/);
const from=lines.findIndex(l=>l.startsWith('const unitName=')),to=lines.findIndex(l=>l.startsWith('function safeOptimiseStepPlan'));
if(from<0||to<0)throw new Error('planner block not found');
const source=lines.slice(from,to+1).join('\n');

const CAP={WORKER:4,ASTROMECH:3,BATTLE:2,BUILD:3,LOUNGE:5,COMPANION:2,UPGRADE_CHIP:1};
const droid=(name,type,rarity='EPIC')=>({name,type,rarity,variants:{DEFAULT:{income:10}}});
const sandbox={
  console,
  PRODUCTIVE_STATIONS:['WORKER','ASTROMECH','BATTLE'],floorNote:(s,i)=>s==='BATTLE'?(i>=5?' (upstairs)':' (downstairs)'):'',MAP_FLOORS:['downstairs','upstairs'],MAP_SPOTS:{downstairs:{},upstairs:{}},
  SLOT_RULES:Object.fromEntries(Object.keys(CAP).map(k=>[k,{initial:CAP[k],unlocks:[]}])),
  stationSlotIndices:type=>Array.from({length:CAP[type]},(_,i)=>i),slotFillOrder:type=>Array.from({length:CAP[type]},(_,i)=>i),
  stationName:t=>({WORKER:'Worker',ASTROMECH:'Astromech',BATTLE:'Battle',BUILD:'Build',LOUNGE:'Lounge',COMPANION:'Companion',UPGRADE_CHIP:'Upgrade Chip'}[t]||t),
  variantText:v=>v==='DEFAULT'?'Standard':v,
  picture:()=>'',
  state:{droids:[
    droid('Astro-A','ASTROMECH'),droid('Batt-B','BATTLE'),droid('Work-C','WORKER'),
    droid('Batt-D','BATTLE'),droid('Work-E','WORKER'),droid('Junk-F','WORKER'),droid('Junk-G','ASTROMECH'),
  ]},
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);

// source index = the roster row, unit = which copy of that row.
const at=(name,station,slot,source)=>({name,variant:'DEFAULT',station,slot,source,unit:0});
const baseP={placed:[
  at('Batt-B','WORKER',0,0),      // battle droid stuck in Worker  -> wants BATTLE
  at('Work-C','BATTLE',0,1),      // worker droid stuck in Battle  -> wants WORKER
  at('Batt-D','LOUNGE',0,2),      // idle in lounge                -> wants BATTLE
  at('Work-E','BUILD',0,3),       // parked in build               -> wants WORKER
  at('Astro-A','LOUNGE',1,4),     // idle in lounge                -> wants ASTROMECH
  at('Junk-F','WORKER',1,5),      // sell
  at('Junk-G','ASTROMECH',0,6),   // sell
],overflow:[]};
const projected={placed:[
  at('Batt-B','BATTLE',0,0),at('Work-C','WORKER',0,1),at('Batt-D','BATTLE',1,2),
  at('Work-E','WORKER',1,3),at('Astro-A','ASTROMECH',0,4),
],sell:[at('Junk-F','WORKER',1,5),at('Junk-G','ASTROMECH',0,6)],overflow:[]};

const steps=sandbox.safeOptimiseStepPlan(baseP,projected);
const visits=sandbox.optimiseVisits(steps);
console.log(`\n${steps.length} steps across ${visits.length} stops\n`);
for(const v of visits){
  console.log(`-- ${v.at} --`);
  for(const s of v.steps)console.log(`     ${s.text}`);
}
const perStation={};
for(const v of visits)perStation[v.at]=(perStation[v.at]||0)+1;
console.log('\nvisits per station:',perStation);
const unresolved=steps.filter(s=>s.type==='note');
console.log(unresolved.length?'INCOMPLETE PLAN':'plan complete');
