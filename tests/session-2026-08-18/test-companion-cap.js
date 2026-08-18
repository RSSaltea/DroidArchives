// Preferred companions must cap at the number of Companion slots actually
// unlocked: 1 without the Nova upgrade, 2 with it. Over-limit saves stay stored
// but hidden, so unlocking the second slot brings the extra one back.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8'),lines=src.split(/\r?\n/);
const grabLine=k=>lines.find(l=>l.trimStart().startsWith(k));

let novaCompanion=0;
const sandbox={console,
  isIconic:d=>d?.rarity==='ICONIC',
  // Mirrors isSlotEligible: slot 1 always, slot 2 behind the Nova upgrade.
  stationSlotIndices:t=>t==='COMPANION'?(novaCompanion>=1?[0,1]:[0]):[0],
  state:{droids:[{name:'CHOPPER',rarity:'ICONIC'},{name:'BB-8',rarity:'ICONIC'},{name:'R2-D2',rarity:'ICONIC'}],owned:[],preferredCompanions:[]},
};
vm.createContext(sandbox);
for(const k of ['const preferredCompanions=','const companionSlotCount=','const preferredCompanionsFull=','const missingPreferredCompanions='])
  vm.runInContext(grabLine(k),sandbox);
const show=()=>vm.runInContext('preferredCompanions()',sandbox);
const full=()=>vm.runInContext('preferredCompanionsFull()',sandbox);
const slots=()=>vm.runInContext('companionSlotCount()',sandbox);

console.log('=== second slot NOT unlocked ===');
sandbox.state.preferredCompanions=['CHOPPER'];
console.log(` slots ${slots()} | picked ${JSON.stringify(show())} | full: ${full()} -> Add tile hidden: ${full()}`);
sandbox.state.preferredCompanions=[];
console.log(` none picked -> full: ${full()} -> Add tile shown: ${!full()}`);

console.log('\n=== second slot unlocked ===');
novaCompanion=1;
sandbox.state.preferredCompanions=['CHOPPER'];
console.log(` slots ${slots()} | picked ${JSON.stringify(show())} | full: ${full()} -> Add tile shown: ${!full()}`);
sandbox.state.preferredCompanions=['CHOPPER','BB-8'];
console.log(` slots ${slots()} | picked ${JSON.stringify(show())} | full: ${full()} -> Add tile hidden: ${full()}`);

console.log('\n=== an over-limit save is capped, not destroyed ===');
sandbox.state.preferredCompanions=['CHOPPER','BB-8','R2-D2'];
novaCompanion=0;
const capped1=show();
console.log(` 3 stored, 1 slot -> shows ${JSON.stringify(capped1)}`);
novaCompanion=1;
const capped2=show();
console.log(` same save, 2 slots -> shows ${JSON.stringify(capped2)}`);
console.log(' stored list untouched:',JSON.stringify(sandbox.state.preferredCompanions));

const pass=capped1.length===1&&capped2.length===2&&sandbox.state.preferredCompanions.length===3;
console.log('\nPASS:',pass);
