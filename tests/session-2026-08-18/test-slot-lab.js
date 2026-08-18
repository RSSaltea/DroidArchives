// The Slot Lab is a private tool, so the gate matters, and the protocol has to
// cover every slot with a place to write the landing down.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8'),css=fs.readFileSync(ROOT+'styles.css','utf8');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log(`  ${c?'ok  ':'FAIL'} ${l}${c?'':'  '+x}`)};
const grabFn=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const line=k=>src.split(/\r?\n/).find(l=>l.startsWith(k));

// Their real Base: everything unlocked except Nova Lounge slots 2, 3 and 4,
// so the Lounge has 10 of its 13 rather than the full set.
const UNLOCKED={WORKER:11,ASTROMECH:9,BATTLE:11,LOUNGE:10};
const SLOTS=UNLOCKED;
const sandbox={console,email:'',
  SLOT_RULES:{WORKER:{initial:4,unlocks:[1,4,7,10,12,14,16]},ASTROMECH:{initial:3,unlocks:[2,5,8,11,13,15]},
    BATTLE:{initial:2,unlocks:[3,6,9,17,18,19,20,21,22]},LOUNGE:{initial:5,unlocks:Array(8).fill(99)}},
  BATTLE_UPSTAIRS_FROM:5,stationName:x=>x[0]+x.slice(1).toLowerCase(),
  stationSlotIndices:x=>Array.from({length:UNLOCKED[x]},(_,i)=>i)};
sandbox.galacticUserEmail=()=>sandbox.email;
vm.createContext(sandbox);
// The protocol asks which part of the Lounge a slot is in, so it can name a
// ground-floor one rather than guessing.
vm.runInContext('const '+/loungeSlotMeta=index=>[^;]*;/.exec(src)[0],sandbox);
for(const k of ['const SLOT_LAB_OWNERS=','const normaliseEmail=','const slotLabAllowed=','const slotLabSlots=','const slotLabCeiling='])
  vm.runInContext(line(k),sandbox);
for(const k of ['function slotLabRange','function slotLabSweep','function slotLabProtocol','function slotLabReport'])vm.runInContext(grabFn(k),sandbox);
const run=e=>vm.runInContext(e,sandbox);

console.log('=== who can see it ===');
const allow=e=>{sandbox.email=e;return run('slotLabAllowed()')};
ok('xraffo@gmail.com',allow('xraffo@gmail.com'));
ok('xraffo@googlemail.com — the address actually signed in',allow('xraffo@googlemail.com'));
ok('shouting it still works',allow('XRAFFO@GoogleMail.COM'));
ok('stray whitespace still works',allow('  xraffo@gmail.com '));
ok('nobody else',!allow('someone@else.com'));
ok('not signed in at all',!allow(''));
ok('a lookalike is refused',!allow('xraffo@gmail.com.evil.com'));
ok('and it is not a substring match',!allow('notxraffo@gmail.com'));

console.log('\n=== the protocol covers every slot ===');
const phases=run('slotLabProtocol()');
const sweep=id=>phases.find(p=>p.id===id);
for(const [id,station] of [['PB-WORKER','WORKER'],['PB-ASTRO','ASTROMECH'],['PB-BATTLE','BATTLE'],['PB-LOUNGE','LOUNGE']]){
  const p=sweep(id),recs=p.steps.filter(s=>s.kind==='record').length;
  ok(`${station.padEnd(9)} sweep asks for all ${SLOTS[station]} landings`,recs===SLOTS[station],`asks ${recs}`);
  ok(`${station.padEnd(9)} sweep sets up once and restores once`,
    p.steps.filter(s=>s.kind==='setup').length===1&&p.steps.filter(s=>s.kind==='undo').length===1);
}
ok('Battle sweep says which slots are on which floor',/1 to 5 are downstairs, 6 upwards are upstairs/.test(sweep('PB-BATTLE').note||''));

console.log('\n=== it only ever asks for slots you actually have ===');
ok('Lounge sweep asks for 10, not the full 13',sweep('PB-LOUNGE').steps.filter(s=>s.kind==='record').length===10);
ok('and says which 3 are left out',/3 slots you have not unlocked are left out/.test(sweep('PB-LOUNGE').note||''),sweep('PB-LOUNGE').note);
ok('Phase 0 sends from Lounge 10, not Lounge 13',
  sweep('P0').steps.some(s=>/Lounge slot 10 — the far end/.test(s.text)),
  (sweep('P0').steps.find(s=>/far end/.test(s.text))||{}).text);
ok('no step mentions a Lounge slot above 10',!sweep('P0').steps.concat(sweep('PB-LOUNGE').steps).some(s=>/Lounge slot 1[123]/.test(s.text)));
ok('stations that are fully unlocked are unaffected',!(sweep('PB-WORKER').note||'').includes('left out'));

console.log('\n=== a station with too few slots is skipped, not broken ===');
UNLOCKED.LOUNGE=1;
const thin=run('slotLabProtocol()').find(p=>p.id==='PB-LOUNGE');
ok('no steps offered',thin.steps.length===0);
ok('and it says why',/needs at least two unlocked slots/.test(thin.note),thin.note);
UNLOCKED.LOUNGE=10;
ok('Lounge sweep is last, since it is the parking space',phases.map(p=>p.id).indexOf('PB-LOUNGE')>phases.map(p=>p.id).indexOf('PB-WORKER'));

console.log('\n=== every step tells you what to do and how to undo it ===');
const all=phases.flatMap(p=>p.steps);
ok(`${all.length} steps, all with instructions`,all.every(s=>s.text&&s.text.length>10));
ok('every recording step asks a question',all.filter(s=>s.kind==='record').every(s=>s.ask));
ok('every phase ends by putting the base back',phases.every(p=>p.steps[p.steps.length-1].kind==='undo'));
ok('every phase explains why it exists',phases.every(p=>p.why&&p.why.length>40));
ok('step ids are unique',new Set(all.map(s=>s.id)).size===all.length);

console.log('\n=== the controls come before the sweeps ===');
const order=phases.map(p=>p.id);
ok('Phase 0 first — is the order fixed at all',order[0]==='P0');
ok('then Phase A — station or slot',order[1]==='PA');
ok('Phase C last, and marked skippable',order[order.length-1]==='PC'&&/Skip this entirely/.test(sweep('PC').why));

console.log('\n=== Phase 0 only asks for things you can actually do ===');
const p0=sweep('P0').steps;
// You walk to the droid to give it an order, so you can never pick where you
// stand independently of where it is.
ok('never asks you to stand somewhere and send from elsewhere',
  !p0.some(s=>/Stand downstairs|Go upstairs and send/.test(s.text)),
  (p0.find(s=>/Stand downstairs|Go upstairs and send/.test(s.text))||{}).text);
ok('varies where the DROID starts instead',p0.filter(s=>s.kind==='record'&&/Battle droid/.test(s.text)).length>=2);
// You can pick which droid to remove, never which slot it lands in.
ok('never asks you to place a droid into a named slot',
  !p0.some(s=>/Put a Battle droid in (Worker|Lounge|Astromech|Battle) slot|Put it back in (Battle|Worker|Lounge) d/.test((s.text||'')+(s.undo||''))),
  (p0.find(s=>/Put it back in (Battle|Worker) d/.test((s.text||'')+(s.undo||'')))||{}).undo);
ok('explains the only way to fill one particular slot',
  /make it the only free one in that station and then send a droid/.test(sweep('P0').note||''));
ok('one run from the ground-floor Lounge',p0.some(s=>/ground-floor part of the Lounge/.test(s.text)));
ok('one run started on the real upper floor — an upstairs Battle slot',
  p0.some(s=>/go upstairs to the Battle droid already sitting in Battle 6/.test(s.text)));
ok('does not treat the Lounge as having a second floor',
  !p0.some(s=>/Upper Level/.test(s.text)));
ok('one run from right across the Base, using a droid already out there',p0.some(s=>/right across the Base/.test(s.text)&&/already sitting in a Worker or Astromech slot/.test(s.text)));
ok('the two Worker runs keep their ids, so answers already given survive',
  p0.some(s=>s.id==='P0-1')&&p0.some(s=>s.id==='P0-2'));
ok('and says to stop and report if the three runs disagree',
  /If they did not, stop and tell me/.test(p0[p0.length-1].text));

console.log('\n=== Phase A records which slots were free, not just the landing ===');
// You cannot put a droid back into a chosen slot, so dictating an exact pair to
// free between runs is unworkable. Any pair will do as long as it is recorded.
const pa = sweep('PA').steps.filter(s => s.kind === 'record');
ok('all three runs ask which pair was free', pa.length === 3 && pa.every(s => s.ask2));
ok('and none of them dictates an exact pair', !pa.some(s => /Free Astromech \d+ and Battle \d+ only/.test(s.text)));
ok('the second answer is stored under its own key', src.includes("escapeAttr(step.id+':free')"));
ok('a wider box, since a slot pair is not a number', css.includes('.lab-answer.wide input{'));

// Phase 0 showed the answer depends on where the droid starts, so that is data
// too - a landing with no origin recorded cannot be interpreted.
ok('every run also asks where the droid started',
  pa.every(s => s.askFrom) && sweep('PB-WORKER').steps.filter(s => s.kind === 'record' && !s.id.endsWith('-last')).every(s => s.askFrom));
const full = run(`slotLabReport(slotLabProtocol(),${JSON.stringify({
  'PA-1': 'Astromech 3', 'PA-1:free': 'Astromech 3, Battle 7', 'PA-1:from': '2',
  'PB-WORKER-1': '11', 'PB-WORKER-1:from': '1' })})`);
ok('the report carries origin, free pair and landing together',
  /PA-1: from Lounge 2, free Astromech 3, Battle 7 -> Astromech 3/.test(full), full.replace(/\n/g, ' | '));
ok('sweeps read as started -> landed', /landing order: 1 -> 11/.test(full));
ok('and say how to read that', /started in Lounge slot -> landed in slot/.test(full));

console.log('\n=== the report you paste back ===');
ok('nothing recorded yet reads clearly',run('slotLabReport(slotLabProtocol(),{})')==='Nothing recorded yet.');
const partial={'PB-WORKER-1':'3','PB-WORKER-2':'1','P0-1':'11'};
const report=run(`slotLabReport(slotLabProtocol(),${JSON.stringify(partial)})`);
ok('a sweep reports as one landing order',/landing order: 3, 1, \?/.test(report),report.replace(/\n/g,' | '));
ok('unanswered slots show as ?',report.includes('?'));
ok('phases you have not touched are left out',!report.includes('Cross-station order'));
ok('single runs report individually',/P0-1: 11/.test(report));

console.log('\n=== wiring ===');
ok('routed at #/slot-lab',src.includes("else if(path==='/slot-lab')slotLabPage();"));
ok('the page refuses to render for anyone else',/function slotLabPage\(\)\{\s*if\(!slotLabAllowed\(\)\)\{notFound\(\);return\}/.test(src));
ok('the nav link is kept in step on every route change',src.includes('renderCloudHeader();syncSlotLabNav();'));
ok('answers survive a reload',src.includes("localStorage.getItem('droid-archive-slot-lab')"));
ok('styled',css.includes('.lab-step{')&&css.includes('.lab-verb.undo{'));

console.log(fails?`\n${fails} FAILURE(S)`:'\nPASS: true');
process.exit(fails?1:0);
