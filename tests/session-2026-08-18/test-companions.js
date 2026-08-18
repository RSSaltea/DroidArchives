// Companion slots: one pick per chosen boost, cycling when fewer boosts than
// slots, preferred Iconics first, and never stealing a droid from a credit slot.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8'),lines=src.split(/\r?\n/);
const grab=k=>{const i=src.indexOf(k);if(i<0)throw new Error('missing '+k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const grabLine=k=>lines.find(l=>l.trimStart().startsWith(k));

const CAP={WORKER:2,ASTROMECH:2,BATTLE:1,BUILD:2,LOUNGE:5,COMPANION:2,UPGRADE_CHIP:0};
const droid=(name,type,rarity)=>({name,type,rarity,variants:Object.fromEntries(
  ['DEFAULT','GOLD','DIAMOND','RAINBOW','BESKAR','GALACTIC'].map((v,i)=>[v,{cost:0,income:10*(i+1)}])) });
const sandbox={console,
  VARIANTS:['DEFAULT','GOLD','DIAMOND','RAINBOW','BESKAR','GALACTIC'],
  PRODUCTIVE_STATIONS:['WORKER','ASTROMECH','BATTLE'],MAP_FLOORS:['downstairs','upstairs'],MAP_SPOTS:{downstairs:{},upstairs:{}},ASTROMECH_MISSION_SLOTS:[0,2,4,6,8],
  SLOT_RULES:Object.fromEntries(Object.keys(CAP).map(k=>[k,{initial:Math.max(CAP[k],1),unlocks:[]}])),
  stationSlotIndices:t=>Array.from({length:CAP[t]},(_,i)=>i),slotFillOrder:t=>Array.from({length:CAP[t]},(_,i)=>i),
  isIconic:d=>d?.rarity==='ICONIC',
  variantText:v=>v,rarityText:r=>r,
  droidCycleStatus:()=>({kind:'unused',label:'Duplicate - not used for rebirth'}),
  optimiseFreeBuildMode:()=>'upgrade-cost',optimiseFreeBuildModeLabel:()=>'',optimiseStorageKeepScore:()=>0,
  upgradeChipRate:()=>0,isBuilding:()=>false,sparedFromSelling:()=>[],droidexGapsAbove:()=>[],
  state:{optimiseFreeBuild:false,optimiseKeepDroidex:false,droidex:[],owned:[],
    droids:[droid('ASTRO-LOW','ASTROMECH','COMMON'),droid('ASTRO-HIGH','ASTROMECH','MYTHIC'),
      droid('WORK-HIGH','WORKER','MYTHIC'),droid('BATT-HIGH','BATTLE','MYTHIC'),
      {name:'CHOPPER',rarity:'ICONIC',type:'ASTROMECH',special:{incomePercent:0.15},variants:{DEFAULT:{cost:0,income:0}}}]},
};
vm.createContext(sandbox);
for(const k of ['const COMPANION_GOALS=','const companionGoals=','const companionSlotCount=','const preferredCompanionsFull=','const preferredCompanions=','const iconicDroids=','const missingPreferredCompanions='])
  vm.runInContext(grabLine(k),sandbox);
vm.runInContext(grab('function droidAttributeValue'),sandbox);
vm.runInContext(grab('function droidAttribute'),sandbox);
vm.runInContext(grab('function stabiliseProjectedPlacements'),sandbox);
vm.runInContext(grab('function optimisedPlacements'),sandbox);
sandbox.expandedOwned=()=>sandbox.state.owned.flatMap((x,i)=>Array.from({length:x.qty},(_,unit)=>({...x,source:i,unit})));

console.log('=== attribute values ===');
for(const [n,v] of [['ASTRO-HIGH','GALACTIC'],['ASTRO-LOW','DEFAULT'],['WORK-HIGH','GALACTIC'],['BATT-HIGH','GALACTIC']])
  console.log(` ${n} ${v}:`,vm.runInContext(`droidAttributeValue(state.droids.find(d=>d.name==='${n}'),'${v}')`,sandbox));

const roster=[{name:'ASTRO-HIGH',variant:'GALACTIC',qty:1},{name:'ASTRO-LOW',variant:'DEFAULT',qty:1},
  {name:'WORK-HIGH',variant:'GALACTIC',qty:1},{name:'BATT-HIGH',variant:'GALACTIC',qty:1}];
const companionsOf=r=>r.placed.filter(x=>x.station==='COMPANION').map(x=>`${x.name} ${x.variant}`);

console.log('\n=== one boost chosen -> both slots from it ===');
sandbox.state.owned=roster.map(x=>({...x}));sandbox.state.companionGoals=['pickaxe'];sandbox.state.preferredCompanions=[];
let r=vm.runInContext('optimisedPlacements({placed:[],overflow:[]},{assignments:[]})',sandbox);
console.log(' companions:',companionsOf(r),'(expect both Astromechs, best first)');

console.log('\n=== two boosts -> one of each ===');
sandbox.state.companionGoals=['pickaxe','crafting'];
r=vm.runInContext('optimisedPlacements({placed:[],overflow:[]},{assignments:[]})',sandbox);
console.log(' companions:',companionsOf(r),'(expect one Astromech + one Worker)');

console.log('\n=== all three, only two slots -> first two in order ===');
sandbox.state.companionGoals=['pickaxe','crafting','health'];
r=vm.runInContext('optimisedPlacements({placed:[],overflow:[]},{assignments:[]})',sandbox);
console.log(' companions:',companionsOf(r),'(expect Astromech + Worker, Battle misses out)');

console.log('\n=== preferred Iconic takes a slot first ===');
sandbox.state.owned=[...roster.map(x=>({...x})),{name:'CHOPPER',variant:'DEFAULT',qty:1}];
sandbox.state.preferredCompanions=['CHOPPER'];
r=vm.runInContext('optimisedPlacements({placed:[],overflow:[]},{assignments:[]})',sandbox);
console.log(' companions:',companionsOf(r),'(expect CHOPPER + one boost pick)');

console.log('\n=== preferred Iconic not owned -> flagged to buy ===');
sandbox.state.owned=roster.map(x=>({...x}));
console.log(' missing:',vm.runInContext('missingPreferredCompanions()',sandbox),'(expect CHOPPER)');

console.log('\n=== a droid already earning is not stolen for Companion ===');
sandbox.state.preferredCompanions=[];sandbox.state.companionGoals=['pickaxe'];
r=vm.runInContext("optimisedPlacements({placed:[],overflow:[]},{assignments:[{key:'0:0',name:'ASTRO-HIGH',variant:'GALACTIC',station:'ASTROMECH',slot:0}]})",sandbox);
const astroHigh=r.placed.find(x=>x.name==='ASTRO-HIGH');
console.log(' ASTRO-HIGH stayed in:',astroHigh&&astroHigh.station,'(expect ASTROMECH, not COMPANION)');
console.log(' companions:',companionsOf(r));

console.log('\n=== companion picks are never sold ===');
console.log(' sold:',r.sell.map(x=>x.name),'| companion reason:',
  (r.placed.find(x=>x.station==='COMPANION')||{}).keepDetail);
