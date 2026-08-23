// The Droidex hint answers a different question from the rebirth one: a slot is
// exact (a Galactic spawn does nothing for an empty Gold square) and Iconic
// droids have only a DEFAULT square.
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
  // Fusion droids get one square too, by the same rule; CB-23 stands in for
  // anything with a single Droidex square.
  onlyDefaultVariant:d=>d.name==='CB-23'};
sandbox.state={droids:[
    {name:'LEP',rarity:'MYTHIC'},
    {name:'IG',rarity:'MYTHIC'},
    {name:'CB-23',rarity:'MYTHIC'},   // iconic: DEFAULT square only
    {name:'PIT',rarity:'COMMON'}],
  droidex:[],owned:[],cycle:0,rebirth:0,rebirths:{}};
vm.createContext(sandbox);
for(const k of ['function droidexEntry('])
  vm.runInContext(k.startsWith('function')?grabFn(k):line(k),sandbox);
vm.runInContext(grabFn('function rebirthNeedProfiles('),sandbox);
vm.runInContext(grabFn('function chosenNeedProfiles('),sandbox);
vm.runInContext(grabFn('function withProfileData('),sandbox);
vm.runInContext(grabFn('window.__companionDroidexNeed=(quality,rarity,keys)=>{'),sandbox);

const profile=(id,name,droidex)=>({id,name,data:{owned:[],droidex,cycle:0,rebirth:0}});
sandbox.activeProfileDoc=()=>({profiles:[
  profile('a','Main',[{name:'LEP',variant:'GALACTIC'}]),   // has LEP galactic already
  profile('b','Alt',[])]});                                 // has nothing
sandbox.availableGroupOutlookProfiles=()=>[];
let KEYS=[];
const run=e=>{sandbox.KEYS=KEYS;return vm.runInContext(e,sandbox)};
const names=o=>o.map(x=>x.droidName).sort().join(',');

console.log('=== exact variant, not "good enough" ===');
let out=run(`window.__companionDroidexNeed('GALACTIC','MYTHIC',KEYS)`);
ok('a droid already collected at that variant is still needed by the other profile',
   out.find(x=>x.droidName==='LEP')?.profiles.map(p=>p.name).join()==='Alt',JSON.stringify(out.find(x=>x.droidName==='LEP')));
ok('a droid missing everywhere lists both profiles',
   out.find(x=>x.droidName==='IG')?.profiles.length===2);
ok('iconic droids are not wanted at a non-default variant',!out.some(x=>x.droidName==='CB-23'),names(out));
ok('other rarities are left alone',!out.some(x=>x.droidName==='PIT'));

console.log('=== iconic at DEFAULT ===');
out=run(`window.__companionDroidexNeed('DEFAULT','MYTHIC',KEYS)`);
ok('iconic droids do have a DEFAULT square',out.some(x=>x.droidName==='CB-23'),names(out));

console.log('=== the loaded profile is not disturbed ===');
ok('droidex is put back',JSON.stringify(sandbox.state.droidex)==='[]');

console.log('=== selection is shared with the rebirth hint ===');
KEYS=['own:a'];
out=run(`window.__companionDroidexNeed('GALACTIC','MYTHIC',KEYS)`);
ok('deselecting a profile drops its needs',!out.some(x=>x.droidName==='LEP'),names(out));
KEYS=[];
console.log(fails?`\n${fails} FAILED`:'\nall passed');
process.exit(fails?1:0);
