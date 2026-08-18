// Checks the Stellar schedule against the screenshot: at 01:44:53 BST on
// 17/08/2026 the game showed Stellar 00:15:07, Mythic 00:10:07, Galactic
// 00:00:07. All three must fall out of the same instant, which is what pins
// Stellar to the top of the hour.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
const grab=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const grabBlock=(start,end)=>{const i=src.indexOf(start),j=src.indexOf(end,i);return src.slice(i,j+end.length)};

const sandbox={console,Math,Number,String,Array,Date};
vm.createContext(sandbox);
vm.runInContext(grabBlock('const SPAWN_TIMERS=[','];'),sandbox);
vm.runInContext(grabBlock('const activeSpawnTimers=','\n'),sandbox);
vm.runInContext(grabBlock('const padTime=','\n'),sandbox);
vm.runInContext(grab('function durationParts'),sandbox);
vm.runInContext(grab('function clockDuration'),sandbox);
vm.runInContext(grab('function nextSpawn'),sandbox);

const timers=vm.runInContext('activeSpawnTimers()',sandbox);
console.log('active timers:',timers.map(t=>t.id).join(', '));
console.log('order matches the game banners (stellar, mythic, galactic):',
  JSON.stringify(timers.map(t=>t.id))===JSON.stringify(['stellar','mythic','galactic']));

// 01:44:53 BST = 00:44:53 UTC.
const shot=Date.UTC(2026,7,17,0,44,53);
const expected={stellar:'00:15:07',mythic:'00:10:07',galactic:'00:00:07'};
let ok=true;
console.log('\nat 01:44:53 BST on 17/08/2026:');
for(const t of timers){
  const ms=vm.runInContext(`nextSpawn(${JSON.stringify(t)},new Date(${shot}))`,sandbox)-shot;
  const shown=vm.runInContext(`clockDuration(${ms})`,sandbox);
  const want=expected[t.id];
  if(shown!==want)ok=false;
  console.log(`  ${t.id.padEnd(9)} ${shown}   game showed ${want}   ${shown===want?'match':'*** MISMATCH ***'}`);
}

// Stellar must land on the hour, every hour.
console.log('\nnext Stellar from a few instants (UTC):');
for(const [h,m,s] of [[0,44,53],[5,0,1],[13,59,59],[23,30,0]]){
  const at=Date.UTC(2026,7,17,h,m,s);
  const next=new Date(vm.runInContext(`nextSpawn(activeSpawnTimers()[0],new Date(${at}))`,sandbox));
  const onHour=next.getUTCMinutes()===0&&next.getUTCSeconds()===0;
  if(!onHour)ok=false;
  console.log(`  ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} -> ${next.toISOString().slice(11,19)} ${onHour?'(on the hour)':'*** NOT ON THE HOUR ***'}`);
}

// Never returns a time in the past or more than one interval away.
let sane=true;
for(let i=0;i<600;i++){
  const at=Date.UTC(2026,7,17,0,0,0)+i*137000;
  const next=vm.runInContext(`nextSpawn(activeSpawnTimers()[0],new Date(${at}))`,sandbox);
  if(next<=at||next-at>3600000)sane=false;
}
console.log('\nalways ahead and within one hour, over 600 instants:',sane);

console.log('\nimage reused from Beskar for now:',timers[0].image);
console.log('\nPASS:',ok&&sane);
