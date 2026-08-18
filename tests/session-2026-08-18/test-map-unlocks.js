// Pins the map against "map numbered downstairs/upstairs.png". Every dot on those
// images is labelled with either its starting slot number or the Rebirth that
// unlocks it; this checks the app agrees, dot for dot.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');

// The labels as read off the numbered maps. rbN = "unlocks at Rebirth N",
// a plain number = a slot you have from the start.
const LABELS={
  WORKER:[['1',76.24,70.75],['2',80.09,79.79],['3',68.97,69.34],['4',62.82,72.97],
    ['rb1',60.46,80.1],['rb4',63.26,88.35],['rb7',71.49,91.68],['rb10',78.51,87.64],
    ['rb12',77.79,42.16],['rb14',75.96,40.65],['rb16',73.52,40.21]],
  ASTROMECH:[['1',20.1,51.32],['2',29.11,40.2],['3',20.99,40.2],
    ['rb2',34.46,40.2],['rb5',39.8,40.2],['rb8',36.48,55.17],['rb11',45.27,55.17],['rb13',30.44,55.17],['rb15',26.19,55.17]],
  BATTLE:[['1',61.04,22.98],['2',64.49,24.07],['rb3',67.07,22.21],['rb6',70.08,23.37],['rb9',71.96,21.61],
    ['rb17',65.13,11.47],['rb18',65.48,14.69],['rb19',65.74,17.71],['rb20',66.09,20.83],['rb21',66.27,24.16],['rb22',66.53,27.68]],
  BUILD:[['1',70.03,53.47],['rb1',41.92,48.32],['rb2',67.39,32.37]],
  LOUNGE:[['1',82.13,51.54],['2',86.13,56.33],['3',92.52,56.33],['4',95.85,44.64],['5',96.02,51.22],
    ['rb17',94.52,38.31],['rb18',95.06,35.42],['rb19',94.97,32.44],['rb20',93.47,29.94]],
};

const grabLine=k=>src.split(/\r?\n/).find(l=>l.startsWith(k));
const grabBlock=k=>{const i=src.indexOf(k);return src.slice(i,src.indexOf('\n};',i)+3)};
const grabFn=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};

const sandbox={console,Math,state:{rebirth:0,purchasedSlots:[],loungePurchased:0,novaUpgrades:{}},
  novaLevelFor:()=>0,localStorage:{getItem:()=>null}};
vm.createContext(sandbox);
vm.runInContext(grabLine('const SLOT_RULES='),sandbox);
vm.runInContext(grabBlock('const MAP_SPOTS='),sandbox);
for(const k of ['const loungeNovaSlots=','const loungeSlotMeta='])vm.runInContext(grabLine(k),sandbox);
vm.runInContext(grabFn('function slotUnlockRebirth'),sandbox);
vm.runInContext(grabFn('function mapFloorSlots'),sandbox);
const run=e=>vm.runInContext(e,sandbox);

let fails=0;
const ok=(label,cond,extra='')=>{if(!cond)fails++;console.log(`  ${cond?'ok  ':'FAIL'} ${label}${extra&&!cond?'  '+extra:''}`)};

// Every marker the map view will draw, across both floors.
const slots=[...run('mapFloorSlots("downstairs")'),...run('mapFloorSlots("upstairs")')];

console.log('=== every labelled dot sits on the slot its label claims ===');
for(const[station,list]of Object.entries(LABELS)){
  for(const[label,x,y]of list){
    const hit=slots.find(s=>Math.hypot(s.x-x,s.y-y)<0.05&&
      (s.station===station||(station==='LOUNGE'&&s.station==='LOUNGE')));
    if(!hit){ok(`${station} ${label} — dot found on the map`,false,`(${x},${y})`);continue}
    const want=label.startsWith('rb')?Number(label.slice(2)):null;
    const got=run(`slotUnlockRebirth(${JSON.stringify(hit.station)},${hit.index})`);
    ok(`${station.padEnd(9)} ${label.padEnd(5)} -> slot ${String(hit.index).padStart(2)}  ${want===null?'from the start':'Rebirth '+want}`,
      got===want,`app says ${got===null?'from the start':'Rebirth '+got}`);
  }
}

console.log('\n=== the dot count matches the number of slots that exist ===');
for(const[station,list]of Object.entries(LABELS)){
  const rule=run(`SLOT_RULES[${JSON.stringify(station)}]`);
  const total=station==='LOUNGE'?9:rule.initial+rule.unlocks.length;  // Lounge also has 4 Nova slots
  ok(`${station.padEnd(9)} ${list.length} dots = ${total} slots`,list.length===total,`rule gives ${total}`);
}

console.log('\n=== starting slots, before any Rebirth ===');
for(const[station,want]of[['WORKER',4],['ASTROMECH',3],['BATTLE',2],['BUILD',1],['LOUNGE',5]]){
  const free=LABELS[station].filter(l=>!l[0].startsWith('rb')).length;
  ok(`${station.padEnd(9)} starts with ${want}`,free===want,`map shows ${free}`);
}

console.log('\n=== no two markers claim the same slot ===');
const keys=slots.map(s=>`${s.station}:${s.index}`);
ok(`${keys.length} markers, ${new Set(keys).size} distinct slots`,keys.length===new Set(keys).size);

console.log(fails?`\n${fails} FAILURE(S)`:'\nPASS: true');
process.exit(fails?1:0);
