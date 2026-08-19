// Recording where a droid actually landed has to move it in the preview and the
// map, not just influence which slots the next step offers.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log(`  ${c?'ok  ':'FAIL'} ${l}${c?'':'  -> '+x}`)};
const grabConst=k=>{const i=src.indexOf(k);if(i<0)throw Error('missing '+k);return src.slice(i,src.indexOf(';',i)+1)};
const grabFn=k=>{const i=src.indexOf(k);if(i<0)throw Error('missing '+k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};

const sandbox={console};
vm.createContext(sandbox);
vm.runInContext(grabFn('function applyLoggedLandings('),sandbox);
const run=(p,steps)=>{sandbox.p=p;sandbox.steps=steps;vm.runInContext('applyLoggedLandings(p,steps)',sandbox);return p};
const run2=(p,steps)=>{sandbox.p=p;sandbox.steps=steps;return vm.runInContext('applyLoggedLandings(p,steps)',sandbox)};
const at=(p,name)=>{const x=p.placed.find(y=>y.name===name);return x?`${x.station} ${x.slot}`:'(unplaced)'};

console.log('=== the recorded slot wins over the guess ===');
let p={placed:[
  {source:1,unit:0,name:'R7',station:'ASTROMECH',slot:3},
  {source:2,unit:0,name:'BB-8',station:'ASTROMECH',slot:7}]};
run(p,[{unit:{source:1,unit:0},logged:{station:'ASTROMECH',slot:7}}]);
ok('the droid moves to the slot that was recorded',at(p,'R7')==='ASTROMECH 7',at(p,'R7'));
ok('whoever was there takes the vacated slot',at(p,'BB-8')==='ASTROMECH 3',at(p,'BB-8'));
ok('nothing is dropped',p.placed.length===2);

console.log('=== an empty target needs no swap ===');
p={placed:[{source:1,unit:0,name:'R7',station:'ASTROMECH',slot:3}]};
run(p,[{unit:{source:1,unit:0},logged:{station:'ASTROMECH',slot:7}}]);
ok('it just moves',at(p,'R7')==='ASTROMECH 7',at(p,'R7'));

console.log('=== recording across stations ===');
p={placed:[
  {source:1,unit:0,name:'R7',station:'ASTROMECH',slot:3},
  {source:2,unit:0,name:'PIT',station:'WORKER',slot:1}]};
run(p,[{unit:{source:1,unit:0},logged:{station:'WORKER',slot:1}}]);
ok('the droid lands in the recorded station',at(p,'R7')==='WORKER 1',at(p,'R7'));
ok('the occupant takes the slot it vacated',at(p,'PIT')==='ASTROMECH 3',at(p,'PIT'));

console.log('=== nothing recorded, nothing moved ===');
p={placed:[{source:1,unit:0,name:'R7',station:'ASTROMECH',slot:3}]};
run(p,[{unit:{source:1,unit:0},logged:null},{unit:null,logged:{station:'WORKER',slot:0}}]);
ok('an unrecorded step leaves the plan alone',at(p,'R7')==='ASTROMECH 3',at(p,'R7'));

console.log('=== a droid that is not placed ===');
p={placed:[{source:9,unit:0,name:'OTHER',station:'WORKER',slot:0}]};
run(p,[{unit:{source:1,unit:0},logged:{station:'WORKER',slot:0}}]);
ok('a sold or unplaced droid does not disturb anyone',at(p,'OTHER')==='WORKER 0',at(p,'OTHER'));

console.log('=== the guess was already right ===');
p={placed:[{source:1,unit:0,name:'R7',station:'ASTROMECH',slot:7}]};
run(p,[{unit:{source:1,unit:0},logged:{station:'ASTROMECH',slot:7}}]);
ok('it stays put',at(p,'R7')==='ASTROMECH 7',at(p,'R7'));

console.log('=== it reports whether anything moved ===');
// Apply only rebuilds the saved rows when something actually moved.
vm.runInContext(grabConst('const optimisedRows='),sandbox);
p={placed:[{source:1,unit:0,name:'R7',station:'ASTROMECH',slot:3}]};
ok('an unchanged plan reports false',
   run2(p,[{unit:{source:1,unit:0},logged:{station:'ASTROMECH',slot:3}}])===false);
ok('a moved droid reports true',
   run2(p,[{unit:{source:1,unit:0},logged:{station:'ASTROMECH',slot:7}}])===true);

console.log('=== the rows Apply writes follow the recording ===');
p={placed:[
  {source:1,unit:0,name:'R7',variant:'GOLD',station:'ASTROMECH',slot:3},
  {source:2,unit:0,name:'BB-8',variant:'DEFAULT',station:'ASTROMECH',slot:7}],overflow:[]};
run(p,[{unit:{source:1,unit:0},logged:{station:'ASTROMECH',slot:7}}]);
sandbox.pp=p;
const rows=vm.runInContext('optimisedRows(pp.placed,pp.overflow)',sandbox);
const row=name=>rows.find(r=>r.name===name);
ok('the written row carries the recorded slot',
   row('R7').preferred==='ASTROMECH'&&row('R7').preferredSlot===7,JSON.stringify(row('R7')));
ok('the swapped droid is written to the vacated slot',
   row('BB-8').preferredSlot===3,JSON.stringify(row('BB-8')));
ok('every droid is still written',rows.length===2);

console.log(fails?`\n${fails} FAILED`:'\nall passed');
process.exit(fails?1:0);
