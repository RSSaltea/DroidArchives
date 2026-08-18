// "Needed later in this cycle" should say what the upgrade costs and where the
// copy is, in BOTH interfaces - not just whether you have it.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8'),css=fs.readFileSync(ROOT+'styles.css','utf8');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log(`  ${c?'ok  ':'FAIL'} ${l}${c?'':'  '+x}`)};

const grabFn=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const line=k=>src.split(/\r?\n/).find(l=>l.trimStart().startsWith(k));

const sandbox={console,VARIANTS:['DEFAULT','GOLD','DIAMOND','RAINBOW','BESKAR','GALACTIC','STELLAR'],
  CHIP_COSTS:{MYTHIC:{GOLD:10,DIAMOND:20,RAINBOW:40,BESKAR:80,GALACTIC:160,STELLAR:320}},
  fmt:n=>String(n),variantText:v=>v,stationName:t=>t,stationSlotLabel:(s,i)=>`${s} ${i+1}${s==='BATTLE'?(i>=5?' (upstairs)':' (downstairs)'):''}`,
  state:{droids:[{name:'LEP',rarity:'MYTHIC'}],owned:[{name:'LEP',variant:'GALACTIC',qty:1}]},
  rowIsBuilding:()=>false,
  placements:()=>({placed:[{name:'LEP',variant:'GALACTIC',station:'WORKER',slot:4}]})};
vm.createContext(sandbox);
for(const k of ['function bestOwnedVariant','function hasRequirement','function chipsToVariant',
  'function requirementStatus','function requirementLocations'])vm.runInContext(grabFn(k),sandbox);
for(const k of ['const requirementNote=','const requirementWhere='])vm.runInContext(line(k),sandbox);
const run=e=>vm.runInContext(e,sandbox);

console.log('=== you own it, upgraded far enough ===');
let st=run(`requirementStatus({droidName:'LEP',variant:'BESKAR'})`);
ok('reads as ready',st.ready===true);
ok('no chips quoted',st.chips===0);
ok('and it says where it is',st.where==='WORKER 5',String(st.where));
ok('note is Ready',run(`requirementNote(requirementStatus({droidName:'LEP',variant:'BESKAR'}))`).includes('Ready'));

console.log('\n=== you own it but it needs upgrading — the case that was just red ===');
st=run(`requirementStatus({droidName:'LEP',variant:'STELLAR'})`);
ok('not ready',st.ready===false);
ok('flagged as an upgrade, not as missing',st.needsUpgrade===true);
ok('quotes the chip cost (Galactic->Stellar = 320)',st.chips===320,String(st.chips));
ok('names the best copy you own',st.have==='GALACTIC');
ok('and where that copy is',st.where==='WORKER 5',String(st.where));
const note=run(`requirementNote(requirementStatus({droidName:'LEP',variant:'STELLAR'}))`);
ok('note quotes the cost',/Upgrade.*320 chips/.test(note),note);
const where=run(`requirementWhere(requirementStatus({droidName:'LEP',variant:'STELLAR'}))`);
ok('subtitle names quality and location',/Best owned: GALACTIC/.test(where)&&/WORKER 5/.test(where),where);

console.log('\n=== you do not own it at all ===');
st=run(`requirementStatus({droidName:'NOPE',variant:'GOLD'})`);
ok('still just missing',!st.ready&&!st.needsUpgrade&&!st.have);
ok('note is Needed',run(`requirementNote(requirementStatus({droidName:'NOPE',variant:'GOLD'}))`)==='Needed');

console.log('\n=== a copy you own that is not in the Base ===');
sandbox.placements=()=>({placed:[]});
st=run(`requirementStatus({droidName:'LEP',variant:'STELLAR'})`);
ok('no location found',!st.where);
ok('and it says so rather than going blank',/not in your Base/.test(run(`requirementWhere(requirementStatus({droidName:'LEP',variant:'STELLAR'}))`)));

console.log('\n=== both interfaces use it ===');
ok('modern Base needed cards',/needed-card \$\{status\.ready\?'have':status\.needsUpgrade\?'upgrade':'missing'\}/.test(src));
ok('legacy Base future rows',/future-item \$\{status\.ready\?'have':status\.needsUpgrade\?'upgrade':'missing'\}/.test(src));
ok('legacy quotes the cost too',/futureRows=future\.map[\s\S]{0,700}requirementNote\(status\)/.test(src));
ok('legacy names the location too',/futureRows=future\.map[\s\S]{0,400}status\.where/.test(src));
ok('the location map is built once per render, not per card',
  (src.match(/const located=requirementLocations\(\)/g)||[]).length===2);

console.log('\n=== the amber state is styled in both layouts ===');
ok('.needed-card.upgrade',css.includes('.needed-card.upgrade{'));
ok('.future-item.upgrade',css.includes('.future-item.upgrade{'));
ok('the new subtitle line is styled',css.includes('.needed-card em{'));

console.log(fails?`\n${fails} FAILURE(S)`:'\nPASS: true');
process.exit(fails?1:0);
