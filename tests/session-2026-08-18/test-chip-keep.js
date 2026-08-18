// Reproduces the reported regression: PROTO-ROLLER Beskar sits in the Upgrade
// Chip slot and has no remaining rebirth use, so the unused-sell pass dumped it
// and a weaker droid (DRFT-R Diamond) inherited the slot — fewer chips/min for
// two pointless steps. The chip occupant must be kept.
const fs=require('fs'),vm=require('vm');
const lines=fs.readFileSync('c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js','utf8').split(/\r?\n/);
const grab=start=>{const i=lines.findIndex(l=>l.startsWith(start));let depth=0,out=[];
  for(let j=i;j<lines.length;j++){out.push(lines[j]);for(const c of lines[j]){if(c==='{')depth++;else if(c==='}')depth--}if(depth===0&&/[{}]/.test(out.join('')))break}return out.join('\n')};

const CAP={WORKER:2,ASTROMECH:1,BATTLE:1,BUILD:2,LOUNGE:5,COMPANION:1,UPGRADE_CHIP:1};
const droid=(name,rarity)=>({name,type:'WORKER',rarity,variants:{DEFAULT:{income:10},DIAMOND:{income:20},BESKAR:{income:30}}});
const RATES={EPIC:{DEFAULT:6,DIAMOND:18,BESKAR:30},MYTHIC:{DEFAULT:10,DIAMOND:30,BESKAR:50}};
// PROTO-ROLLER Beskar = 30/min but no rebirth use. DRFT-R Diamond = 18/min, in use.
const USELESS=new Set(['PROTO-ROLLER']);
const sandbox={
  console,
  VARIANTS:['DEFAULT','GOLD','DIAMOND','RAINBOW','BESKAR','GALACTIC'],
  PRODUCTIVE_STATIONS:['WORKER','ASTROMECH','BATTLE'],MAP_FLOORS:['downstairs','upstairs'],MAP_SPOTS:{downstairs:{},upstairs:{}},ASTROMECH_MISSION_SLOTS:[0,2,4,6,8],
  SLOT_RULES:Object.fromEntries(Object.keys(CAP).map(k=>[k,{initial:CAP[k],unlocks:[]}])),
  stationSlotIndices:t=>Array.from({length:CAP[t]},(_,i)=>i),slotFillOrder:t=>Array.from({length:CAP[t]},(_,i)=>i),
  isIconic:()=>false,
  isBuilding:()=>false,sparedFromSelling:()=>[],
  COMPANION_GOALS:[],companionGoals:()=>[],preferredCompanions:()=>[],droidAttributeValue:()=>0,droidAttribute:()=>'',droidexGapsAbove:()=>[],variantText:v=>v,
  droidCycleStatus:d=>USELESS.has(d.name)?{kind:'unused',label:'No rebirth use'}:{kind:'current',label:'in use'},
  optimiseFreeBuildMode:()=>'upgrade-cost',optimiseFreeBuildModeLabel:()=>'',optimiseStorageKeepScore:()=>0,
  state:{optimiseFreeBuild:false,optimiseKeepDroidex:false,
    droids:[droid('PROTO-ROLLER','EPIC'),droid('DRFT-R','EPIC')],
    owned:[{name:'PROTO-ROLLER',variant:'BESKAR',qty:1},{name:'DRFT-R',variant:'DIAMOND',qty:1}]},
};
sandbox.upgradeChipRate=(d,v)=>RATES[d&&d.rarity]?.[v]||0;
sandbox.expandedOwned=()=>sandbox.state.owned.flatMap((x,i)=>Array.from({length:x.qty},(_,unit)=>({...x,source:i,unit})));
vm.createContext(sandbox);
vm.runInContext(grab('function stabiliseProjectedPlacements'),sandbox);
vm.runInContext(grab('function optimisedPlacements'),sandbox);

// PROTO-ROLLER already in the chip slot, DRFT-R idling in the Lounge.
const baseP={placed:[
  {name:'PROTO-ROLLER',variant:'BESKAR',station:'UPGRADE_CHIP',slot:0,source:0,unit:0},
  {name:'DRFT-R',variant:'DIAMOND',station:'LOUNGE',slot:0,source:1,unit:0},
],overflow:[]};
const r=sandbox.optimisedPlacements(baseP,{assignments:[]});
for(const x of r.placed)console.log(`placed: ${x.name} ${x.variant} -> ${x.station} ${x.slot}`);
for(const x of r.sell)console.log(`SELL:   ${x.name} ${x.variant} (${x.sellReason})`);
const chip=r.placed.find(x=>x.station==='UPGRADE_CHIP');
const rate=chip?sandbox.upgradeChipRate(sandbox.state.droids.find(d=>d.name===chip.name),chip.variant):0;
console.log(`\nchip slot: ${chip?chip.name+' '+chip.variant:'EMPTY'} = ${rate} chips/min (best possible: 30)`);
console.log('PASS:',rate===30&&!r.sell.some(x=>x.name==='PROTO-ROLLER'));
