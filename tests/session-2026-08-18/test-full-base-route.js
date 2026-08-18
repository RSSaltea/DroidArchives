// Reported: a packed base where Optimise says "could not route". The reporter's
// own route was three moves - sell the spare Battle droid, move Mono into the
// freed Battle slot, move Loadlifter out of Build into the freed Worker slot.
// Lounge and Companion are full, so nothing can step aside; the sell is the only
// thing that makes room.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const lines=fs.readFileSync(ROOT+'app.js','utf8').split(/\r?\n/);
const from=lines.findIndex(l=>l.startsWith('const unitName=')),to=lines.findIndex(l=>l.startsWith('function safeOptimiseStepPlan'));
const CAP={WORKER:2,ASTROMECH:1,BATTLE:2,BUILD:3,LOUNGE:1,COMPANION:1,UPGRADE_CHIP:1};
const d=name=>({name,type:'ASTROMECH',rarity:'EPIC',variants:{}});
const names=['MONO','LOADLIFTER','RIC','W1','B1','A1','L1','C1','U1'];
const sandbox={console,PRODUCTIVE_STATIONS:['WORKER','ASTROMECH','BATTLE'],floorNote:(s,i)=>s==='BATTLE'?(i>=5?' (upstairs)':' (downstairs)'):'',MAP_FLOORS:['downstairs','upstairs'],MAP_SPOTS:{downstairs:{},upstairs:{}},
  SLOT_RULES:Object.fromEntries(Object.keys(CAP).map(k=>[k,{initial:CAP[k],unlocks:[]}])),
  stationSlotIndices:t=>Array.from({length:CAP[t]},(_,i)=>i),slotFillOrder:t=>Array.from({length:CAP[t]},(_,i)=>i),
  stationName:t=>t,variantText:v=>v,picture:()=>'',
  localStorage:{getItem:()=>null,setItem:()=>{}},state:{droids:names.map(d)}};
vm.createContext(sandbox);vm.runInContext(lines.slice(from,to+1).join('\n'),sandbox);

const at=(name,station,slot,src)=>({name,variant:'GALACTIC',station,slot,source:src,unit:0});
const fixed=[at('W1','WORKER',1,3),at('B1','BATTLE',1,4),at('A1','ASTROMECH',0,5),
             at('L1','LOUNGE',0,6),at('C1','COMPANION',0,7),at('U1','UPGRADE_CHIP',0,8)];
const baseP={placed:[...fixed,
  at('MONO','WORKER',0,0),        // wants Battle
  at('RIC','BATTLE',0,2),         // to be sold - this is what frees the Battle slot
  at('LOADLIFTER','BUILD',0,1),   // finished building, wants Worker
],overflow:[]};
const projected={placed:[...fixed,
  at('MONO','BATTLE',0,0),
  at('LOADLIFTER','WORKER',0,1),
],sell:[at('RIC','BATTLE',0,2)],overflow:[]};

const steps=sandbox.safeOptimiseStepPlan(baseP,projected);
console.log(`${steps.length} step(s):`);
steps.forEach(s=>console.log(`   [${s.type}] ${s.text}`));
const stuck=steps.find(s=>s.type==='note');
console.log('\ngave up:',Boolean(stuck));
console.log('PASS:',!stuck);
