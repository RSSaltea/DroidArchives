// What the app used to predict versus what it predicts now, over the same 47
// measured landings. The old shipped rule is reconstructed from the fixed lists
// that were deleted; the new one is read out of app.js as it stands.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
const line=k=>src.split(/\r?\n/).find(l=>l.trimStart().startsWith(k));
const grab=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};

const CAP={WORKER:11,ASTROMECH:9,BATTLE:11,LOUNGE:10};
const sandbox={console,Math,Number,Array,Set,JSON,MAP_FLOORS:['downstairs','upstairs'],
  stationSlotIndices:t=>Array.from({length:CAP[t]},(_,i)=>i)};
vm.createContext(sandbox);
vm.runInContext(/const MAP_SPOTS=\{[\s\S]*?\n\};/.exec(src)[0],sandbox);
for(const k of['const ASTROMECH_MISSION_SLOTS=','const SLOT_FLOOR_PENALTY=','const SLOT_GAP_UNREACHABLE=','const MEASURED_FILL_ORDER='])
  vm.runInContext(line(k),sandbox);
for(const k of['function slotLogPoint','function slotWalkGap'])vm.runInContext(grab(k),sandbox);
vm.runInContext(/const slotFillOrder=\(station,origin\)=>\{[\s\S]*?\n\};/.exec(src)[0],sandbox);
// The lists app.js used to ship, kept here only so the two can be compared.
vm.runInContext(`const OLD={WORKER:[8,9,10,1,0,2,7,3,6,4,5],ASTROMECH:[6,4,8,2,0,3,1,5,7],BATTLE:[10,9,4,3,8,2,7,1,6,5,0],LOUNGE:[9,8,7,6,5,3,0,4,1,2]};
const oldFillOrder=station=>{const available=stationSlotIndices(station),preferred=OLD[station];
  if(!preferred)return available;
  const measured=preferred.filter(i=>available.includes(i));
  return[...measured,...available.filter(i=>!preferred.includes(i))]};`,sandbox);
const run=e=>vm.runInContext(e,sandbox);

const NEAREST_ORDER=['WORKER','BATTLE','ASTROMECH'];
const rows=[];
const sweep=(station,count,pairs)=>{
  let free=Array.from({length:count},(_,i)=>({station,slot:i}));
  for(const[fromStation,fromSlot,landed]of pairs){
    rows.push({station,fromStation,fromSlot:fromSlot-1,free:free.slice(),landed:landed-1,
      droidType:station==='LOUNGE'?'WORKER':station});
    free=free.filter(s=>s.slot!==landed-1);
  }
};
sweep('LOUNGE',10,[['WORKER',1,1],['WORKER',2,2],['WORKER',3,3],['WORKER',4,5],['WORKER',5,4],
  ['WORKER',6,6],['WORKER',11,10],['WORKER',9,7],['WORKER',10,9],['WORKER',8,8]]);
sweep('LOUNGE',10,[['BATTLE',1,10],['BATTLE',2,9],['BATTLE',3,8],['BATTLE',4,7],['BATTLE',5,6],
  ['BATTLE',11,4],['BATTLE',10,1],['BATTLE',9,5],['BATTLE',8,2]]);
sweep('WORKER',11,[['LOUNGE',1,9],['LOUNGE',2,10],['LOUNGE',3,11],['LOUNGE',5,2],['LOUNGE',4,1],
  ['LOUNGE',6,3],['LOUNGE',7,8],['LOUNGE',8,4],['LOUNGE',9,7],['LOUNGE',10,5]]);
sweep('ASTROMECH',9,[['LOUNGE',1,7],['LOUNGE',2,5],['LOUNGE',3,9],['LOUNGE',4,3],
  ['LOUNGE',6,1],['LOUNGE',7,4],['LOUNGE',8,2],['LOUNGE',9,6]]);
sweep('BATTLE',11,[['LOUNGE',1,11],['LOUNGE',2,10],['LOUNGE',3,5],['LOUNGE',5,4],['LOUNGE',4,9],
  ['LOUNGE',6,3],['LOUNGE',7,8],['LOUNGE',8,2],['LOUNGE',9,7],['LOUNGE',10,6]]);

// The shipped rule, in both shapes: pick the station the same way, then the slot
// by whichever fill order is being tested.
const shipped=(row,which)=>{
  const home=row.free.filter(s=>s.station===row.droidType),pool=home.length?home:row.free;
  for(const station of[...NEAREST_ORDER,'LOUNGE','UPGRADE_CHIP']){
    const here=pool.filter(s=>s.station===station);
    if(!here.length)continue;
    const order=which==='old'?run(`oldFillOrder(${JSON.stringify(station)})`)
      :run(`slotFillOrder(${JSON.stringify(station)},${JSON.stringify({station:row.fromStation,slot:row.fromSlot})})`);
    return here.slice().sort((a,b)=>order.indexOf(a.slot)-order.indexOf(b.slot))[0];
  }
  return pool[0];
};

for(const which of['old','new']){
  const per={};let hit=0;
  for(const row of rows){
    const got=shipped(row,which),right=got&&got.station===row.station&&got.slot===row.landed;
    per[row.station]=per[row.station]||{hit:0,n:0};
    per[row.station].n++;if(right){per[row.station].hit++;hit++}
  }
  console.log(`${which==='old'?'fixed lists   ':'from the origin'}  ${String(hit).padStart(2)}/${rows.length}  `+
    Object.entries(per).map(([k,v])=>`${k} ${v.hit}/${v.n}`).join('  '));
}

console.log('\nper-row, the origin model:');
for(const row of rows){
  const got=shipped(row,'new'),old=shipped(row,'old');
  const mark=got&&got.slot===row.landed?'ok  ':'MISS';
  if(row.station!=='WORKER'&&row.station!=='ASTROMECH')continue;
  console.log(`  ${mark} ${row.station} from ${row.fromStation} ${row.fromSlot+1}: landed ${row.landed+1}, new says ${got.slot+1}, old said ${old.slot+1}  free ${row.free.map(s=>s.slot+1).join(',')}`);
}
