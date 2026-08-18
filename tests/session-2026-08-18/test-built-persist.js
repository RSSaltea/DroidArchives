// The completed-build flag must survive every path that rebuilds owned rows:
// validateBaseImport (profile load, cloud sync, import), materializePlacements
// and optimisedPlacements. Losing it in any one of them silently un-completes
// every Build slot, which is what was happening on refresh.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8'),lines=src.split(/\r?\n/);
const grab=k=>{const i=src.indexOf(k);if(i<0)throw new Error('missing '+k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const grabLine=k=>lines.find(l=>l.trimStart().startsWith(k));

const CAP={WORKER:2,ASTROMECH:1,BATTLE:1,BUILD:3,LOUNGE:5,COMPANION:1,UPGRADE_CHIP:0};
const sandbox={console,
  VARIANTS:['DEFAULT','GOLD','DIAMOND','RAINBOW','BESKAR','GALACTIC'],
  SLOT_RULES:Object.fromEntries(Object.keys(CAP).map(k=>[k,{initial:Math.max(CAP[k],1),unlocks:[]}])),
  stationSlotIndices:t=>Array.from({length:CAP[t]},(_,i)=>i),
  isSlotUnlocked:()=>true,
  canonicalDroidName:n=>n,
  maxRebirth:()=>30,
  state:{droids:[{name:'MECHA-DROID'},{name:'SNOW MOUSE'}],rebirths:{0:[]},novaShop:null,owned:[]},
};
vm.createContext(sandbox);
vm.runInContext(grabLine('const normalizeDroidRows='),sandbox);
// validateBaseImport is patched later in the file; grab the base definition.
vm.runInContext(grab('function validateBaseImport'),sandbox);

const owned=[
  {name:'MECHA-DROID',variant:'DEFAULT',qty:1,preferred:'BUILD',preferredSlot:0,built:true},
  {name:'SNOW MOUSE',variant:'GOLD',qty:1,preferred:'BUILD',preferredSlot:1},
  {name:'MECHA-DROID',variant:'GOLD',qty:1,preferred:'WORKER',preferredSlot:0,lockedSlot:true,built:true},
];
sandbox.owned=owned;
const out=vm.runInContext('validateBaseImport({base:{owned,blueprints:[],droidex:[],novaUpgrades:{},multiplier:1,cycle:0,rebirth:0}})',sandbox);

console.log('rows back:',out.owned.length);
out.owned.forEach((r,i)=>console.log(`  ${r.name} ${r.variant} ${r.preferred||'-'} built=${r.built===true} locked=${r.lockedSlot===true}`));

const completedKept=out.owned.filter(r=>r.built===true).length;
const unfinishedStayUnflagged=out.owned.filter(r=>r.name==='SNOW MOUSE').every(r=>!('built' in r));
const lockedKept=out.owned.some(r=>r.lockedSlot===true);
console.log('\ncompleted builds preserved:',completedKept===2,`(${completedKept} of 2)`);
console.log('unfinished stays unflagged:',unfinishedStayUnflagged);
console.log('lockedSlot still preserved:',lockedKept);

// A second round-trip is what a repeated cloud sync does.
sandbox.owned=out.owned;
const twice=vm.runInContext('validateBaseImport({base:{owned,blueprints:[],droidex:[],novaUpgrades:{},multiplier:1,cycle:0,rebirth:0}})',sandbox);
console.log('survives a second round-trip:',twice.owned.filter(r=>r.built===true).length===2);

console.log('\nPASS:',completedKept===2&&unfinishedStayUnflagged&&lockedKept&&twice.owned.filter(r=>r.built===true).length===2);
