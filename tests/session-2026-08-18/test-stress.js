// Late-game base: every station near capacity, a big shuffle plus sells.
const fs=require('fs'),vm=require('vm');
const {MAP_FLOORS,MAP_SPOTS}=require('./map-data');
const lines=fs.readFileSync('c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js','utf8').split(/\r?\n/);
const from=lines.findIndex(l=>l.startsWith('const unitName=')),to=lines.findIndex(l=>l.startsWith('function safeOptimiseStepPlan'));
const source=lines.slice(from,to+1).join('\n');

const CAP={WORKER:11,ASTROMECH:9,BATTLE:5,BUILD:3,LOUNGE:5,COMPANION:2,UPGRADE_CHIP:1};
const TYPES=['WORKER','ASTROMECH','BATTLE'];
let seed=7;const rnd=n=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed%n};

const droids=[],placed=[],target=[],sell=[];
const slots={WORKER:0,ASTROMECH:0,BATTLE:0,LOUNGE:0,BUILD:0,COMPANION:0,UPGRADE_CHIP:0};
const tslots={...slots};
// 24 droids: fill the credit stations and storage, then scramble the targets.
for(let i=0;i<24;i++){
  const type=TYPES[rnd(3)],name=`D${i}-${type[0]}`;
  droids.push({name,type,rarity:'EPIC',variants:{DEFAULT:{income:10}}});
  const homes=['WORKER','ASTROMECH','BATTLE','LOUNGE','BUILD'].filter(s=>slots[s]<CAP[s]);
  const from=homes[rnd(homes.length)];
  placed.push({name,variant:'DEFAULT',station:from,slot:slots[from]++,source:i,unit:0});
  if(i%7===3){sell.push({name,variant:'DEFAULT',station:from,slot:0,source:i,unit:0});continue}
  const outs=['WORKER','ASTROMECH','BATTLE','LOUNGE','COMPANION'].filter(s=>tslots[s]<CAP[s]);
  const dest=outs[rnd(outs.length)];
  target.push({name,variant:'DEFAULT',station:dest,slot:tslots[dest]++,source:i,unit:0});
}

const sandbox={console,PRODUCTIVE_STATIONS:TYPES,MAP_FLOORS,MAP_SPOTS,floorNote:()=>'',
  SLOT_RULES:Object.fromEntries(Object.keys(CAP).map(k=>[k,{initial:CAP[k],unlocks:[]}])),
  stationSlotIndices:t=>Array.from({length:CAP[t]},(_,i)=>i),slotFillOrder:t=>Array.from({length:CAP[t]},(_,i)=>i),
  stationName:t=>t,variantText:()=>'',picture:()=>'',state:{droids}};
vm.createContext(sandbox);vm.runInContext(source,sandbox);

const t0=Date.now();
const steps=sandbox.safeOptimiseStepPlan({placed,overflow:[]},{placed:target,sell,overflow:[]});
const ms=Date.now()-t0;
const visits=sandbox.optimiseVisits(steps);
const moved=placed.filter(x=>{const t=target.find(y=>y.name===x.name);return !t||t.station!==x.station}).length;
console.log(`${droids.length} droids, ${moved} needing a command, ${sell.length} sells`);
console.log(`-> ${steps.length} steps across ${visits.length} stops in ${ms}ms`);
console.log('stops:',visits.map(v=>`${v.at}(${v.steps.length})`).join(' → '));
const per={};for(const v of visits)per[v.at]=(per[v.at]||0)+1;
console.log('visits per station:',per);
console.log('incomplete:',steps.some(s=>s.type==='note'));
