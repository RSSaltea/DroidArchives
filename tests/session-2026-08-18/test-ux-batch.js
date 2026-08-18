// Covers the batch: verb colouring, step ticks, spare-from-selling, the
// already-optimal state, and the outlook whereabouts line.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8'),lines=src.split(/\r?\n/);
const grab=k=>{const i=src.indexOf(k);if(i<0)throw new Error('missing '+k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const grabLine=k=>lines.find(l=>l.trimStart().startsWith(k));

let store={};
const sandbox={console,
  localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}},
  state:{droids:[{name:'PROTO-ROLLER',rarity:'EPIC',type:'WORKER'}]},
  picture:()=>'<img>',variantText:v=>v,stationName:t=>t[0]+t.slice(1).toLowerCase(),
};
sandbox.unitName=x=>`${x.name} ${x.variant}`;
vm.createContext(sandbox);
for(const k of ['const escapeAttr=','const readList=','const writeList=','const optimiseTickedSteps=','const toggleTickedStep=','const sparedFromSelling=','const spareFromSelling=','const clearOptimiseMarks=','const STEP_VERB_TONE=','const stepTicked=','const variantLabel=','const plainUnitName=','const slotLogSession='])
  vm.runInContext(grabLine(k),sandbox);
vm.runInContext(grab('function stepHtml'),sandbox);
vm.runInContext(grab('function droidWhereabouts'),sandbox);

console.log('=== verb colouring ===');
const mk=(text,type,unit)=>({text,type,unit:unit||{name:'PROTO-ROLLER',variant:'BESKAR',source:0,unit:0}});
for(const [text,want] of [['Sell PROTO-ROLLER Beskar from Worker.','verb-sell'],
    ['Send PROTO-ROLLER Beskar to the Lounge.','verb-stage'],
    ['Tell PROTO-ROLLER Beskar to go to work — it will take a Worker slot.','verb-place'],
    ['Make PROTO-ROLLER Beskar your companion.','verb-place'],
    ['Move X from WORKER 1 to empty LOUNGE 1.','verb-stage'],
    ['Swap X with Y.','verb-stage']]){
  sandbox.step=mk(text,'move');
  const html=vm.runInContext('stepHtml(step)',sandbox);
  const got=(html.match(/verb-(\w+)/)||[])[0];
  console.log(`  ${got===want?'ok  ':'FAIL'} ${text.split(' ')[0].padEnd(5)} -> ${got}`);
}

console.log('\n=== Keep button only on sell steps ===');
sandbox.step=mk('Sell PROTO-ROLLER Beskar from Worker.','sell');
const sellHtml=vm.runInContext('stepHtml(step)',sandbox);
sandbox.step=mk('Send PROTO-ROLLER Beskar to the Lounge.','move');
const moveHtml=vm.runInContext('stepHtml(step)',sandbox);
console.log('  sell step has Keep:',/data-skip-sell="0:0"/.test(sellHtml));
console.log('  move step has none:',!/data-skip-sell/.test(moveHtml));
console.log('  note step has no tick:',!/step-tick/.test(vm.runInContext("stepHtml({text:'x',type:'note'})",sandbox)));

console.log('\n=== ticks persist and toggle ===');
const t='Sell PROTO-ROLLER Beskar from Worker.';
console.log('  starts unticked:',vm.runInContext(`stepTicked(${JSON.stringify(t)})`,sandbox)===false);
vm.runInContext(`toggleTickedStep(${JSON.stringify(t)})`,sandbox);
console.log('  ticked after toggle:',vm.runInContext(`stepTicked(${JSON.stringify(t)})`,sandbox)===true);
console.log('  survives a reload (localStorage):',JSON.parse(store['droid-archive-optimise-ticked']).includes(t));
vm.runInContext(`toggleTickedStep(${JSON.stringify(t)})`,sandbox);
console.log('  untoggles:',vm.runInContext(`stepTicked(${JSON.stringify(t)})`,sandbox)===false);

console.log('\n=== spare from selling ===');
vm.runInContext("spareFromSelling('3:0')",sandbox);
vm.runInContext("spareFromSelling('3:0')",sandbox);
console.log('  recorded once, no duplicates:',JSON.stringify(vm.runInContext('sparedFromSelling()',sandbox))==='["3:0"]');
vm.runInContext('clearOptimiseMarks()',sandbox);
console.log('  cleared when a layout is applied:',vm.runInContext('sparedFromSelling().length',sandbox)===0);

console.log('\n=== attribute escaping (step text goes into an attribute) ===');
console.log('  quotes escaped:',vm.runInContext(`escapeAttr('a "b" <c>')`,sandbox)==='a &quot;b&quot; &lt;c&gt;');

console.log('\n=== outlook whereabouts ===');
const placed=[{name:'BB',station:'WORKER'},{name:'BB',station:'WORKER'},{name:'BB',station:'LOUNGE'},{name:'OTHER',station:'BATTLE'}];
sandbox.placed=placed;
console.log('  BB    ->',JSON.stringify(vm.runInContext("droidWhereabouts('BB',placed)",sandbox)));
console.log('  OTHER ->',JSON.stringify(vm.runInContext("droidWhereabouts('OTHER',placed)",sandbox)));
console.log('  none  ->',JSON.stringify(vm.runInContext("droidWhereabouts('NOPE',placed)",sandbox)));

console.log('\n=== already-optimal wiring present in source ===');
console.log('  nothingToDo guards Apply button:',/nothingToDo\?'<p class="optimise-settled">Already optimal\.<\/p>'/.test(src));
console.log('  nothingToDo hides the notice:',/nothingToDo\?''.{0,20}<div class="notice">This page does not change/.test(src.replace(/\n/g,'')));
console.log('  Apply handler is null-safe:',/querySelector\('#applyOptimised'\)\?\./.test(src));
// Applying a layout got longer than one line — it has a shared-profile branch to
// go through now — so this looks for the call in applyOptimisedLayout rather than
// for one exact line of it.
console.log('  marks cleared on apply:',/state\.owned=projected\.rows;\s*clearOptimiseMarks\(\);/.test(src));
