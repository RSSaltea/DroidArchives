// The rebirth need-hint used to answer for the loaded profile only, so a spawn
// that mattered to another save looked like nothing. It now answers for every
// selected profile and says which ones want it.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log(`  ${c?'ok  ':'FAIL'} ${l}${c?'':'  -> '+x}`)};
const grabFn=k=>{const i=src.indexOf(k);if(i<0)throw Error('missing '+k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const line=k=>src.split(/\r?\n/).find(l=>l.trimStart().startsWith(k));

const store=new Map();
const sandbox={console,window:{},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
  VARIANTS:['DEFAULT','GOLD','DIAMOND','RAINBOW','BESKAR','GALACTIC'],
  normalizeDroidRows:rows=>rows.map(r=>({...r})),
  rowIsBuilding:()=>false};
sandbox.state={droids:[
    {name:'MONO-WALKER',rarity:'LEGENDARY'},
    {name:'PIT',rarity:'COMMON'}],
  rebirths:{0:[{to:9,requiredDroids:[{droidName:'MONO-WALKER',variant:'DEFAULT'}]},
               {to:12,requiredDroids:[{droidName:'MONO-WALKER',variant:'GOLD'}]}]},
  cycle:0,rebirth:0,owned:[]};
vm.createContext(sandbox);
for(const k of ['function bestOwnedVariant(','function hasRequirement('])
  vm.runInContext(k.startsWith('function')?grabFn(k):line(k),sandbox);
// A need hint stops at the profile's own Super Rebirth goal, so both of those
// have to be in scope for it to be worked out at all.
for(const k of ['const maxRebirth=','const rebirthGoal='])vm.runInContext(line(k),sandbox);
vm.runInContext(grabFn('function rebirthNeedProfiles('),sandbox);
vm.runInContext(grabFn('function chosenNeedProfiles('),sandbox);
vm.runInContext(grabFn('function withProfileData('),sandbox);
vm.runInContext(grabFn('window.__companionRebirthNeed=(quality,rarity,keys)=>{'),sandbox);

const profile=(id,name,owned,rebirth)=>({id,name,data:{owned,cycle:0,rebirth}});
sandbox.activeProfileDoc=()=>({profiles:[
  profile('a','Main',[],0),                                   // needs it
  profile('b','Alt',[{name:'MONO-WALKER',variant:'DIAMOND'}],0)]}); // already has better
sandbox.availableGroupOutlookProfiles=()=>[
  {isOwn:false,ownerId:'u2',ownerName:'Casey',profileId:'p9',profileName:'Casey main',data:{owned:[],cycle:0,rebirth:0}},
  {isOwn:true,ownerId:'me',ownerName:'You',profileId:'a',profileName:'Main',data:{owned:[],cycle:0,rebirth:0}}];
let KEYS=[];
const run=e=>{sandbox.KEYS=KEYS;return vm.runInContext(e,sandbox)};

console.log('=== across profiles ===');
let out=run(`window.__companionRebirthNeed('GOLD','LEGENDARY',KEYS)`);
ok('the spawn is reported once, not once per profile',out.length===1,JSON.stringify(out));
ok('it names the droid',out[0]?.droidName==='MONO-WALKER');
ok('the profile that already owns a better one is left out',
   !out[0]?.profiles.some(p=>p.name==='Alt'),JSON.stringify(out[0]?.profiles));
ok('the profile that needs it is named',out[0]?.profiles.some(p=>p.name==='Main'));
ok('a group profile that needs it is named too',out[0]?.profiles.some(p=>p.name==='Casey main'));
ok('own profiles shared back through a group are not counted twice',
   out[0]?.profiles.filter(p=>p.name==='Main').length===1);
ok('it reports the soonest rebirth that wants it',out[0]?.rebirth===9,String(out[0]?.rebirth));

console.log('=== the loaded profile is not disturbed ===');
ok('owned is put back',JSON.stringify(sandbox.state.owned)==='[]');
ok('rebirth is put back',sandbox.state.rebirth===0);

console.log('=== selection ===');
KEYS=['own:b'];
out=run(`window.__companionRebirthNeed('GOLD','LEGENDARY',KEYS)`);
ok('deselecting every needing profile silences the hint',out.length===0,JSON.stringify(out));
KEYS=[];
ok('clearing the selection checks everything again',
   run(`window.__companionRebirthNeed('GOLD','LEGENDARY',KEYS)`).length===1);

console.log('=== unchanged behaviour ===');
ok('a rarity that does not match returns nothing',
   run(`window.__companionRebirthNeed('GOLD','COMMON',KEYS)`).length===0);
ok('a quality too low to satisfy returns nothing',
   run(`window.__companionRebirthNeed('DEFAULT','LEGENDARY',KEYS)`).every(x=>x.variant==='DEFAULT'));

console.log('=== a hint stops at the profile\u2019s own Super Rebirth goal ===');
{
  // A droid nothing wants until Rebirth 20, and two profiles: one aiming past
  // it, one stopping at 12.
  sandbox.state.droids.push({name:'LATE-BLOOMER',rarity:'MYTHIC'});
  sandbox.state.rebirths[0].push({to:20,requiredDroids:[{droidName:'LATE-BLOOMER',variant:'DEFAULT'}]});
  const withGoal=(id,name,goal)=>({id,name,data:{owned:[],cycle:0,rebirth:0,superRebirthGoal:goal}});
  sandbox.activeProfileDoc=()=>({profiles:[withGoal('far','Going all the way',30),withGoal('near','Stopping at 12',12)]});
  sandbox.availableGroupOutlookProfiles=()=>[];
  KEYS=[];
  const hits=run(`window.__companionRebirthNeed('DEFAULT','MYTHIC',KEYS)`);
  ok('the droid is still hinted for the profile that gets that far',hits.length===1,JSON.stringify(hits));
  const named=(hits[0]&&hits[0].profiles||[]).map(p=>p.key||p.name);
  ok('and only that profile is named',named.length===1,JSON.stringify(named));
  ok('the profile stopping at 12 is not asked to chase it',!JSON.stringify(hits).includes('Stopping at 12'),JSON.stringify(hits));

  KEYS=[];
  sandbox.activeProfileDoc=()=>({profiles:[withGoal('near','Stopping at 12',12)]});
  ok('with only that profile, the spawn is not a need at all',
    run(`window.__companionRebirthNeed('DEFAULT','MYTHIC',KEYS)`).length===0);

  KEYS=[];
  sandbox.activeProfileDoc=()=>({profiles:[withGoal('far','Going all the way',30)]});
  ok('and it is a need again once the goal reaches it',
    run(`window.__companionRebirthNeed('DEFAULT','MYTHIC',KEYS)`).length===1);

  // A goal set on the open tab must not leak into another profile's answer.
  sandbox.state.superRebirthGoal=12;
  KEYS=[];
  ok('the tab\u2019s own goal does not override the profile being read',
    run(`window.__companionRebirthNeed('DEFAULT','MYTHIC',KEYS)`).length===1);
  ok('and the tab\u2019s goal is put back afterwards',sandbox.state.superRebirthGoal===12);
  sandbox.state.superRebirthGoal=undefined;
}


console.log(fails?`\n${fails} FAILED`:'\nall passed');
process.exit(fails?1:0);
