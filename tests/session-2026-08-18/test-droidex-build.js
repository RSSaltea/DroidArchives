// Covers the four new behaviours: cumulative Droidex on upgrade, exact-quality
// on add, Droidex keeps in Optimise, and still-building droids being untouchable.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8'),lines=src.split(/\r?\n/);
const grab=k=>{const i=src.indexOf(k);if(i<0)throw new Error('missing '+k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const grabLine=k=>lines.find(l=>l.trimStart().startsWith(k));

const CAP={WORKER:4,ASTROMECH:3,BATTLE:2,BUILD:3,LOUNGE:5,COMPANION:2,UPGRADE_CHIP:1};
const droid=(name,rarity)=>({name,rarity,type:'WORKER',variants:Object.fromEntries(
  ['DEFAULT','GOLD','DIAMOND','RAINBOW','BESKAR','GALACTIC'].map(v=>[v,{cost:0,income:10}])) });
const sandbox={console,
  VARIANTS:['DEFAULT','GOLD','DIAMOND','RAINBOW','BESKAR','GALACTIC'],
  PRODUCTIVE_STATIONS:['WORKER','ASTROMECH','BATTLE'],MAP_FLOORS:['downstairs','upstairs'],MAP_SPOTS:{downstairs:{},upstairs:{}},ASTROMECH_MISSION_SLOTS:[0,2,4,6,8],
  SLOT_RULES:Object.fromEntries(Object.keys(CAP).map(k=>[k,{initial:CAP[k],unlocks:[]}])),
  stationSlotIndices:t=>Array.from({length:CAP[t]},(_,i)=>i),slotFillOrder:t=>Array.from({length:CAP[t]},(_,i)=>i),
  isIconic:d=>d?.rarity==='ICONIC',sparedFromSelling:()=>[],
  COMPANION_GOALS:[],companionGoals:()=>[],preferredCompanions:()=>[],droidAttributeValue:()=>0,droidAttribute:()=>'',
  variantText:v=>v,
  droidCycleStatus:()=>({kind:'unused',label:'Duplicate - not used for rebirth'}),
  optimiseFreeBuildMode:()=>'upgrade-cost',optimiseFreeBuildModeLabel:()=>'',optimiseStorageKeepScore:()=>0,
  upgradeChipRate:()=>0,
  save:()=>{},toast:()=>{},
  state:{optimiseFreeBuild:false,optimiseKeepDroidex:true,autoCompleteBuilds:false,droidex:[],
    droids:[droid('ALPHA','EPIC'),droid('BETA','EPIC')],owned:[]},
};
vm.createContext(sandbox);
for(const k of ['const isDroidFlawless=','function droidexEntry','function recordDroidex(','function recordDroidexUpgrade','const isBuilding=','const rowIsBuilding=','const autoCompleteBuilds=','const droidexGapsAbove='])
  vm.runInContext(k.startsWith('function')?grab(k):grabLine(k),sandbox);
vm.runInContext(grab('function stabiliseProjectedPlacements'),sandbox);
vm.runInContext(grab('function optimisedPlacements'),sandbox);
sandbox.expandedOwned=()=>sandbox.state.owned.flatMap((x,i)=>Array.from({length:x.qty},(_,unit)=>({...x,source:i,unit})));

console.log('=== Droidex recording ===');
vm.runInContext("recordDroidex('ALPHA','DEFAULT')",sandbox);
console.log('after adding a Standard:',JSON.stringify(sandbox.state.droidex.map(x=>x.variant)));
const added=vm.runInContext("recordDroidexUpgrade('ALPHA','DEFAULT','BESKAR')",sandbox);
console.log(`upgrading Standard -> Beskar recorded ${added} more:`,JSON.stringify(sandbox.state.droidex.map(x=>x.variant)));
const back=vm.runInContext("recordDroidexUpgrade('ALPHA','BESKAR','GOLD')",sandbox);
console.log('downgrading records nothing:',back===0);
const dupe=vm.runInContext("recordDroidexUpgrade('ALPHA','DEFAULT','GOLD')",sandbox);
console.log('re-recording an existing quality is a no-op:',dupe===0);
const pathOk=JSON.stringify(sandbox.state.droidex.map(x=>x.variant))===JSON.stringify(['DEFAULT','GOLD','DIAMOND','RAINBOW','BESKAR']);
console.log('full path DEFAULT..BESKAR present, GALACTIC absent:',pathOk);

console.log('\n=== gaps above ===');
console.log("ALPHA at BESKAR ->",vm.runInContext("droidexGapsAbove('ALPHA','BESKAR')",sandbox));
console.log("BETA at DEFAULT ->",vm.runInContext("droidexGapsAbove('BETA','DEFAULT')",sandbox));

console.log('\n=== Optimise: keeps a droid that can still fill the Droidex ===');
sandbox.state.owned=[{name:'BETA',variant:'DEFAULT',qty:1}];
let r=vm.runInContext('optimisedPlacements({placed:[],overflow:[]},{assignments:[]})',sandbox);
let kept=r.placed.find(x=>x.name==='BETA');
console.log('BETA kept:',Boolean(kept),'| station:',kept&&kept.station,'| sold:',r.sell.length);
console.log('reason shown:',kept&&kept.keepReason,'-',kept&&kept.keepDetail);

console.log('\n=== only one copy per droid is kept ===');
sandbox.state.owned=[{name:'BETA',variant:'DEFAULT',qty:4}];
r=vm.runInContext('optimisedPlacements({placed:[],overflow:[]},{assignments:[]})',sandbox);
console.log('kept',r.placed.filter(x=>x.name==='BETA').length,'of 4, sold',r.sell.length,'(expect 1 kept / 3 sold)');

console.log('\n=== setting off -> nothing held for Droidex ===');
sandbox.state.optimiseKeepDroidex=false;
r=vm.runInContext('optimisedPlacements({placed:[],overflow:[]},{assignments:[]})',sandbox);
console.log('kept',r.placed.filter(x=>x.name==='BETA').length,'sold',r.sell.length,'(expect 0 kept / 4 sold)');
sandbox.state.optimiseKeepDroidex=true;

console.log('\n=== still-building droid is untouchable ===');
sandbox.state.owned=[{name:'BETA',variant:'DEFAULT',qty:1,preferred:'BUILD',preferredSlot:0}];
const baseP={placed:[{name:'BETA',variant:'DEFAULT',station:'BUILD',slot:0,source:0,unit:0}],overflow:[]};
r=vm.runInContext('optimisedPlacements(baseP,{assignments:[]})',Object.assign(sandbox,{baseP})&&sandbox);
const still=r.placed.find(x=>x.name==='BETA');
console.log('left in Build:',still&&still.station==='BUILD','| sold:',r.sell.length,'| reason:',still&&still.keepDetail);
console.log('row keeps no stray built flag:',!('built' in (r.rows[0]||{})));

console.log('\n=== once complete it can be moved ===');
const baseP2={placed:[{name:'BETA',variant:'DEFAULT',station:'BUILD',slot:0,source:0,unit:0,built:true}],overflow:[]};
sandbox.state.owned=[{name:'BETA',variant:'DEFAULT',qty:1,preferred:'BUILD',preferredSlot:0,built:true}];
sandbox.baseP2=baseP2;
r=vm.runInContext('optimisedPlacements(baseP2,{assignments:[]})',sandbox);
const moved=r.placed.find(x=>x.name==='BETA');
console.log('now placed in:',moved&&moved.station,'(moved out of Build)');
console.log('built flag preserved on the row:',r.rows.some(x=>x.built===true));
