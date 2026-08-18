// Late-game base with targets shaped the way optimiseBase actually produces
// them: native station first (it is worth +10%), spilling only when full.
const fs=require('fs'),vm=require('vm');
const {MAP_FLOORS,MAP_SPOTS}=require('./map-data');const walk=require('./walkdist');
const lines=fs.readFileSync('c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js','utf8').split(/\r?\n/);
const from=lines.findIndex(l=>l.startsWith('const unitName=')),to=lines.findIndex(l=>l.startsWith('function safeOptimiseStepPlan'));
const source=lines.slice(from,to+1).join('\n');

const CAP={WORKER:11,ASTROMECH:9,BATTLE:5,BUILD:3,LOUNGE:5,COMPANION:2,UPGRADE_CHIP:1};
const TYPES=['WORKER','ASTROMECH','BATTLE'];

function run(label,count,scramble,seedStart){
  let seed=seedStart;const rnd=n=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed%n};
  const droids=[],placed=[],target=[],sell=[];
  const cur={WORKER:0,ASTROMECH:0,BATTLE:0,LOUNGE:0,BUILD:0,COMPANION:0,UPGRADE_CHIP:0},tgt={...cur};
  for(let i=0;i<count;i++){
    const type=TYPES[rnd(3)],name=`D${i}-${type[0]}`;
    droids.push({name,type,rarity:'EPIC',variants:{DEFAULT:{income:10}}});
    // Current layout: deliberately scrambled, this is the mess being fixed.
    const homes=(scramble?['WORKER','ASTROMECH','BATTLE','LOUNGE','BUILD']:[type,'LOUNGE','BUILD','WORKER','ASTROMECH','BATTLE']).filter(s=>cur[s]<CAP[s]);
    if(!homes.length){droids.pop();continue}
    const home=homes[rnd(homes.length)];
    placed.push({name,variant:'DEFAULT',station:home,slot:cur[home]++,source:i,unit:0});
    if(i%8===3){sell.push({name,variant:'DEFAULT',station:home,slot:0,source:i,unit:0});continue}
    // Target: native station if it has room, else spill down the credit slots,
    // else storage. This is the shape optimiseBase converges on.
    const dest=[type,...TYPES.filter(t=>t!==type),'UPGRADE_CHIP','LOUNGE','COMPANION'].find(s=>tgt[s]<CAP[s]);
    if(!dest)continue;
    target.push({name,variant:'DEFAULT',station:dest,slot:tgt[dest]++,source:i,unit:0});
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
  const note=steps.find(s=>s.type==='note');
  console.log(`\n[${label}] ${count} droids, ${moved} needing a command, ${sell.length} sells`);
  console.log(`  ${steps.length} steps / ${visits.length} stops / ${ms}ms  ${note?'INCOMPLETE':'complete'}`);
  console.log('  route:',visits.map(v=>`${v.at}(${v.steps.length})`).join(' → '));console.log('  walking distance:',walk(visits.map(v=>v.at)).toFixed(1));
  console.log('  assumed-nearest steps:',steps.filter(s=>s.assumed).length);
  if(note)console.log('  '+note.text);
}

run('scrambled base',24,true,7);
run('scrambled base',24,true,99);
run('scrambled base',30,true,1234);
run('mild drift',24,false,42);
