// Auto-route sends a droid to its OWN type of station whenever that has room, so
// a Worker droid the layout wants in Battle can never be told to go there while
// any Worker slot is open. The planner only ever emitted moves auto-route would
// make, so it gave up instead of saying "carry it over yourself".
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const lines=fs.readFileSync(ROOT+'app.js','utf8').split(/\r?\n/);
const from=lines.findIndex(l=>l.startsWith('const unitName=')),to=lines.findIndex(l=>l.startsWith('function safeOptimiseStepPlan'));
const CAP={WORKER:4,ASTROMECH:1,BATTLE:2,BUILD:3,LOUNGE:1,COMPANION:1,UPGRADE_CHIP:1};
const TYPE={MONO:'WORKER',LOADLIFTER:'WORKER'};
const names=['MONO','LOADLIFTER','RIC','W1','B1','A1','L1','C1','U1'];
const sandbox={console,PRODUCTIVE_STATIONS:['WORKER','ASTROMECH','BATTLE'],floorNote:(s,i)=>s==='BATTLE'?(i>=5?' (upstairs)':' (downstairs)'):'',MAP_FLOORS:['downstairs','upstairs'],MAP_SPOTS:{downstairs:{},upstairs:{}},
  SLOT_RULES:Object.fromEntries(Object.keys(CAP).map(k=>[k,{initial:CAP[k],unlocks:[]}])),
  stationSlotIndices:t=>Array.from({length:CAP[t]},(_,i)=>i),slotFillOrder:t=>Array.from({length:CAP[t]},(_,i)=>i),
  stationName:t=>t,variantText:v=>v,picture:()=>'',
  localStorage:{getItem:()=>null,setItem:()=>{}},
  state:{droids:names.map(n=>({name:n,type:TYPE[n]||'ASTROMECH',rarity:'EPIC',variants:{}}))}};
vm.createContext(sandbox);vm.runInContext(lines.slice(from,to+1).join('\n'),sandbox);

const at=(name,station,slot,src)=>({name,variant:'GALACTIC',station,slot,source:src,unit:0});
// Worker has 4 slots and only two are used, so auto-route always wants Worker.
const fixed=[at('W1','WORKER',1,3),at('B1','BATTLE',1,4),at('A1','ASTROMECH',0,5),
             at('L1','LOUNGE',0,6),at('C1','COMPANION',0,7),at('U1','UPGRADE_CHIP',0,8)];
const baseP={placed:[...fixed,at('MONO','WORKER',0,0),at('RIC','BATTLE',0,2)],overflow:[]};
const projected={placed:[...fixed,at('MONO','BATTLE',0,0)],sell:[at('RIC','BATTLE',0,2)],overflow:[]};

const steps=sandbox.safeOptimiseStepPlan(baseP,projected);
console.log(`${steps.length} step(s):`);
steps.forEach(s=>console.log(`   [${s.type}] ${s.text}`));
const stuck=steps.find(s=>s.type==='note');
console.log('\ngave up:',Boolean(stuck));
console.log('PASS (a complete plan):',!stuck);
