// Three droids left over after the credit stations have been filled. The single
// Upgrade Chip slot should take the best chip earner (Mythic Gold = 20/min),
// not whichever droid iterates first (Common Default = 2/min).
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js','utf8'),lines=src.split(/\r?\n/);
const grab=start=>{const i=lines.findIndex(l=>l.startsWith(start));if(i<0)throw new Error('missing '+start);
  let depth=0,out=[];for(let j=i;j<lines.length;j++){out.push(lines[j]);for(const c of lines[j]){if(c==='{')depth++;else if(c==='}')depth--}if(depth===0&&out.length&&/[{}]/.test(out.join('')))break}return out.join('\n')};

const CAP={WORKER:2,ASTROMECH:1,BATTLE:1,BUILD:2,LOUNGE:5,COMPANION:1,UPGRADE_CHIP:1};
const droid=(name,type,rarity)=>({name,type,rarity,variants:{DEFAULT:{income:10},GOLD:{income:20}}});
const sandbox={
  console,
  VARIANTS:['DEFAULT','GOLD','DIAMOND','RAINBOW','BESKAR','GALACTIC'],
  PRODUCTIVE_STATIONS:['WORKER','ASTROMECH','BATTLE'],MAP_FLOORS:['downstairs','upstairs'],MAP_SPOTS:{downstairs:{},upstairs:{}},ASTROMECH_MISSION_SLOTS:[0,2,4,6,8],
  SLOT_RULES:Object.fromEntries(Object.keys(CAP).map(k=>[k,{initial:CAP[k],unlocks:[]}])),
  stationSlotIndices:type=>Array.from({length:CAP[type]},(_,i)=>i),slotFillOrder:type=>Array.from({length:CAP[type]},(_,i)=>i),
  UPGRADE_CHIP_RATES:{COMMON:{DEFAULT:2,GOLD:4},EPIC:{DEFAULT:6,GOLD:12},MYTHIC:{DEFAULT:10,GOLD:20}},
  isIconic:()=>false,
  isBuilding:()=>false,sparedFromSelling:()=>[],
  COMPANION_GOALS:[],companionGoals:()=>[],preferredCompanions:()=>[],droidAttributeValue:()=>0,droidAttribute:()=>'',droidexGapsAbove:()=>[],variantText:v=>v,
  droidCycleStatus:()=>({kind:'current',label:'in use'}),
  optimiseFreeBuildMode:()=>'upgrade-cost',
  optimiseFreeBuildModeLabel:()=>'Highest upgrade cost',
  optimiseStorageKeepScore:()=>0,
  state:{
    optimiseFreeBuild:false,optimiseKeepDroidex:false,
    droids:[droid('Cheap','WORKER','COMMON'),droid('Mid','WORKER','EPIC'),droid('Best','WORKER','MYTHIC')],
    // deliberately ordered so the WORST chip droid iterates first
    owned:[{name:'Cheap',variant:'DEFAULT',qty:1},{name:'Mid',variant:'DEFAULT',qty:1},{name:'Best',variant:'GOLD',qty:1}],
  },
};
sandbox.upgradeChipRate=(d,v)=>sandbox.UPGRADE_CHIP_RATES[d&&d.rarity]?.[v]||0;
sandbox.expandedOwned=()=>sandbox.state.owned.flatMap((x,i)=>Array.from({length:x.qty},(_,unit)=>({...x,source:i,unit})));
vm.createContext(sandbox);
vm.runInContext(grab('function stabiliseProjectedPlacements'),sandbox);
vm.runInContext(grab('function optimisedPlacements'),sandbox);

// No credit assignments at all: every droid is "left over", exactly the case in
// the question ("if there's 4 droids left in the lounge...").
const result=sandbox.optimisedPlacements({placed:[],overflow:[]},{assignments:[]});
for(const x of result.placed)console.log(`${x.name} ${x.variant} -> ${x.station} ${x.slot}`);
const chip=result.placed.find(x=>x.station==='UPGRADE_CHIP');
console.log('\nchip slot holds:',chip&&`${chip.name} ${chip.variant}`,
  '(rate',chip?sandbox.upgradeChipRate(sandbox.state.droids.find(d=>d.name===chip.name),chip.variant):0,'chips/min)');
console.log('PASS:',chip&&chip.name==='Best'&&chip.variant==='GOLD');
