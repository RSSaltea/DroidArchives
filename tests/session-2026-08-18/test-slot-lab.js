// The Slot Lab is a private tool, so the gate matters. The scripted protocol that
// used to fill this page is gone — it gathered the original sweeps and landings
// come from normal play now — leaving the data, an export and a reset.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8'),css=fs.readFileSync(ROOT+'styles.css','utf8');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log(`  ${c?'ok  ':'FAIL'} ${l}${c?'':'  '+x}`)};
const grabFn=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const line=k=>src.split(/\r?\n/).find(l=>l.startsWith(k));

const sandbox={console,email:''};
sandbox.galacticUserEmail=()=>sandbox.email;
vm.createContext(sandbox);
for(const k of ['const SLOT_LAB_OWNERS=','const normaliseEmail=','const slotLabAllowed='])
  vm.runInContext(line(k),sandbox);
const run=e=>vm.runInContext(e,sandbox);

console.log('=== the gate ===');
sandbox.email='xraffo@gmail.com';
ok('the owner gets in',run('slotLabAllowed()')===true);
sandbox.email='XRaffo@Gmail.com ';
ok('case and stray spaces do not lock them out',run('slotLabAllowed()')===true);
sandbox.email='someone@else.com';
ok('nobody else does',run('slotLabAllowed()')===false);
sandbox.email='';
ok('and neither does being signed out',run('slotLabAllowed()')===false);
ok('the page itself checks, not just the nav link',
  /function slotLabPage\(\)\{\s*if\(!slotLabAllowed\(\)\)\{notFound\(\);return\}/.test(src.replace(/\r\n/g,'\n')));
ok('the nav link is added and removed by the same check',src.includes('const wanted=slotLabAllowed();'));

console.log('\n=== the scripted protocol is gone ===');
// It existed to empty a station and refill it a droid at a time, typing each
// landing into a box. That is what produced the original 47 landings; the log
// gathers them from ordinary play now.
for(const dead of['slotLabProtocol','slotLabSweep','slotLabReport','slotLabRead','slotLabWrite','slotLabSlots','slotLabCeiling'])
  ok(`${dead} is gone`,!src.includes(dead+'('),dead+' still referenced');
ok('and its store key with it',!src.includes('droid-archive-slot-lab'));
ok('no set-up/run/put-it-back steps are rendered',!src.includes('lab-verb'));
ok('no free-text answer boxes',!src.includes('data-lab-input')&&!src.includes('data-lab-tick'));

console.log('\n=== what the page has instead ===');
const page=grabFn('function slotLabPage(){');
ok('the findings block',page.includes('slotLogFindingsHtml()'));
ok('the data itself, when there is any',page.includes("'<section class=\"lab-phase\"><h2>The data</h2>")&&page.includes('id="labOutput"'));
ok('and nothing but the heading when there is not',page.includes("rows.length?")&&page.includes("':'');"));
ok('an Export button',page.includes('id="labExport"'));
ok('a Copy button',page.includes('id="labCopy"'));
ok('a Reset button',page.includes('id="labReset"'));
ok('all three are wired',
  page.includes("querySelector('#labExport').onclick")&&page.includes("querySelector('#labCopy').onclick=copy")&&page.includes("querySelector('#labReset').onclick=reset"));

console.log('\n=== export writes a file, not just the clipboard ===');
ok('a JSON blob',page.includes("new Blob([text()],{type:'application/json'})"));
ok('with a dated name',page.includes("link.download='droid-archives-slot-log-'+stamp+'.json'"));
ok('the object URL is released afterwards',page.includes('URL.revokeObjectURL(url)'));
ok('and an empty log says so rather than downloading nothing',
  page.includes("if(!slotLogAll().length){toast('Nothing recorded yet');return}"));
ok('copy falls back to selecting the box when the clipboard is blocked',
  page.includes("box.select();toast('Copy the box below')"));

console.log('\n=== reset is guarded and complete ===');
ok('it confirms first',page.includes("confirm('Delete every recorded landing?"));
ok('and warns there is no undo',page.includes('There is no undo, so export first'));
ok('it clears the log',page.includes('slotLogClear()'));
ok('and the plan-local recordings too, or the dropdowns would still look filled',
  page.includes('slotLogSession.clear()'));
ok('then redraws',page.includes('slotLabPage()'));

console.log('\n=== the findings block reads as the page, not an aside ===');
ok('headed simply "Findings"',src.includes('<h2>Findings</h2>')&&!src.includes('Passive findings'));
ok('it no longer draws its own copy/clear pair',!src.includes('id="labLogCopy"')&&!src.includes('id="labLogClear"'));
ok('the caveat is about Battle now, the only fixed order left',
  src.includes('Battle still ships a fixed order worked out from the original sweeps'));
ok('and it still says to treat small samples as provisional',src.includes('provisional'));

console.log('\n=== styled ===');
ok('the page still uses classes the stylesheet has',
  css.includes('.lab-phase')&&css.includes('.lab-actions')&&css.includes('.lab-output')&&css.includes('.lab-scores'));

console.log(fails?`\n${fails} FAILED`:'\nall passed');
process.exit(fails?1:0);
