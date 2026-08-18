// Two Worker-type droids in the Lounge. One must end in Worker, the other must
// end in Astromech. Auto-route sends a Worker droid to Worker whenever Worker
// has room, so the ONLY valid order is: work the Worker-bound one first to fill
// Worker, then the Astromech-bound one falls through. If the planner emits them
// the other way round the plan is wrong in game.
const fs=require('fs'),vm=require('vm');
const lines=fs.readFileSync('c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js','utf8').split(/\r?\n/);
const from=lines.findIndex(l=>l.startsWith('const unitName=')),to=lines.findIndex(l=>l.startsWith('function safeOptimiseStepPlan'));
const source=lines.slice(from,to+1).join('\n');

const CAP={WORKER:1,ASTROMECH:1,BATTLE:1,BUILD:1,LOUNGE:3,COMPANION:1,UPGRADE_CHIP:1};
const droid=(name,type)=>({name,type,rarity:'EPIC',variants:{DEFAULT:{income:10}}});
const sandbox={
  console,
  PRODUCTIVE_STATIONS:['WORKER','ASTROMECH','BATTLE'],floorNote:(s,i)=>s==='BATTLE'?(i>=5?' (upstairs)':' (downstairs)'):'',MAP_FLOORS:['downstairs','upstairs'],MAP_SPOTS:{downstairs:{},upstairs:{}},
  SLOT_RULES:Object.fromEntries(Object.keys(CAP).map(k=>[k,{initial:CAP[k],unlocks:[]}])),
  stationSlotIndices:type=>Array.from({length:CAP[type]},(_,i)=>i),slotFillOrder:type=>Array.from({length:CAP[type]},(_,i)=>i),
  stationName:t=>t,variantText:()=>'Standard',picture:()=>'',
  state:{droids:[droid('P-worker','WORKER'),droid('Q-worker','WORKER'),droid('Static','BATTLE')]},
};
vm.createContext(sandbox);vm.runInContext(source,sandbox);

const at=(name,station,slot,source)=>({name,variant:'DEFAULT',station,slot,source,unit:0});
const baseP={placed:[
  at('P-worker','LOUNGE',0,0),
  at('Q-worker','LOUNGE',1,1),
  at('Static','BATTLE',0,2),     // holds Battle shut so it is never a landing option
],overflow:[]};
const projected={placed:[
  at('P-worker','WORKER',0,0),
  at('Q-worker','ASTROMECH',0,1),
  at('Static','BATTLE',0,2),
],sell:[],overflow:[]};

const steps=sandbox.safeOptimiseStepPlan(baseP,projected);
const visits=sandbox.optimiseVisits(steps);
console.log(`${steps.length} steps across ${visits.length} stops`);
for(const v of visits){console.log(`-- ${v.at} --`);for(const s of v.steps)console.log(`     ${s.text}`);}

const order=steps.map(s=>s.unit&&s.unit.name);
const pAt=order.indexOf('P-worker'),qAt=order.indexOf('Q-worker');
console.log('\nP before Q (required):',pAt>=0&&qAt>=0&&pAt<qAt);
console.log('incomplete note:',steps.some(s=>s.type==='note'));
