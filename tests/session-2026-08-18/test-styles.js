// Both step styles must work off the same target layout, so the Upgrade Chip
// pick has to show up in each. Also checks the default is the new route plan
// and that an unrecognised stored value falls back to it.
const fs=require('fs'),vm=require('vm');
const lines=fs.readFileSync('c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js','utf8').split(/\r?\n/);
const a=lines.findIndex(l=>l.startsWith('const unitName=')),b=lines.findIndex(l=>l.startsWith('function safeOptimiseStepPlan'));
const source=lines.slice(a,b+1).join('\n');

const CAP={WORKER:4,ASTROMECH:3,BATTLE:2,BUILD:3,LOUNGE:5,COMPANION:2,UPGRADE_CHIP:1};
const droid=(name,type)=>({name,type,rarity:'EPIC',variants:{DEFAULT:{income:10}}});
let store={};
const mk=()=>{
  const s={console,PRODUCTIVE_STATIONS:['WORKER','ASTROMECH','BATTLE'],floorNote:(s,i)=>s==='BATTLE'?(i>=5?' (upstairs)':' (downstairs)'):'',MAP_FLOORS:['downstairs','upstairs'],MAP_SPOTS:{downstairs:{},upstairs:{}},
    SLOT_RULES:Object.fromEntries(Object.keys(CAP).map(k=>[k,{initial:CAP[k],unlocks:[]}])),
    stationSlotIndices:t=>Array.from({length:CAP[t]},(_,i)=>i),slotFillOrder:t=>Array.from({length:CAP[t]},(_,i)=>i),
    stationName:t=>t,variantText:()=>'Std',picture:()=>'',
    localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}},
    state:{droids:[droid('Batt-B','BATTLE'),droid('Work-C','WORKER'),droid('Junk-F','WORKER')]}};
  vm.createContext(s);vm.runInContext(source,s);return s;
};
const at=(name,station,slot,source)=>({name,variant:'DEFAULT',station,slot,source,unit:0});
const baseP={placed:[at('Batt-B','WORKER',0,0),at('Work-C','BATTLE',0,1),at('Junk-F','WORKER',1,2)],overflow:[]};
const projected={placed:[at('Batt-B','BATTLE',0,0),at('Work-C','WORKER',0,1)],sell:[at('Junk-F','WORKER',1,2)],overflow:[]};

for(const [label,val] of [['default (nothing stored)',undefined],['route',"route"],['classic',"classic"],['garbage value',"nonsense"]]){
  store={};if(val!==undefined)store['droid-archive-optimise-step-style']=val;
  const s=mk();
  const style=vm.runInContext('optimiseStepStyle()',s);
  const steps=s.safeOptimiseStepPlan(baseP,projected);
  console.log(`\n[${label}] -> style=${style}, ${steps.length} steps`);
  for(const st of steps)console.log('   '+st.text);
}
// The toggle must actually flip and persist.
store={};const s=mk();
console.log('\nstart:',vm.runInContext('optimiseStepStyle()',s));
vm.runInContext('localStorage.setItem("droid-archive-optimise-step-style","classic")',s);
console.log('after toggle:',vm.runInContext('optimiseStepStyle()',s),'| stored:',JSON.stringify(store));
