// Live sync between a browser tab and the companion's embedded view. The row's
// revision is what tells one tab's own write apart from another tab's.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log(`  ${c?'ok  ':'FAIL'} ${l}${c?'':'  -> '+x}`)};
const grabFn=k=>{const i=src.indexOf(k);if(i<0)throw Error('missing '+k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};

const calls={load:0,route:0,toast:0};
const sandbox={console,
  cloudConnected:()=>Boolean(sandbox.state.cloud.user&&sandbox.state.cloud.doc),
  loadSupabaseProfiles:async()=>{calls.load++},
  route:()=>{calls.route++}, toast:()=>{calls.toast++},
  renderCloudHeader:()=>{}, cloudSaveTimer:null};
sandbox.state={cloud:{user:{id:'u1'},doc:{_revision:7},syncing:false,channel:null,status:''}};
vm.createContext(sandbox);
vm.runInContext(grabFn('async function cloudDocChangedElsewhere('),sandbox);
const fire=async rev=>{await vm.runInContext(`cloudDocChangedElsewhere(${rev})`,sandbox)};
const reset=()=>{calls.load=calls.route=calls.toast=0};

(async()=>{
  console.log('=== whose write was it ===');
  reset(); await fire(7);
  ok('the revision we already hold is our own write echoing back',calls.load===0);
  reset(); await fire(6);
  ok('an older revision is ignored',calls.load===0);
  reset(); await fire(8);
  ok('a higher revision is somebody else and is pulled in',calls.load===1);
  ok('the page is redrawn',calls.route===1);
  ok('and it says so',calls.toast===1);

  console.log('=== never pull over an unsaved edit ===');
  sandbox.state.cloud.syncing=true; reset(); await fire(9);
  ok('a write in flight defers the pull',calls.load===0);
  sandbox.state.cloud.syncing=false;
  vm.runInContext('cloudSaveTimer=123',sandbox); reset(); await fire(9);
  ok('a debounced save still pending defers the pull',calls.load===0,'would discard the edit');
  vm.runInContext('cloudSaveTimer=null',sandbox); reset(); await fire(9);
  ok('once it has been written the pull happens',calls.load===1);

  console.log('=== signed out ===');
  sandbox.state.cloud.user=null; reset(); await fire(99);
  ok('no account means nothing to sync',calls.load===0);

  console.log(fails?`\n${fails} FAILED`:'\nall passed');
  process.exit(fails?1:0);
})();
