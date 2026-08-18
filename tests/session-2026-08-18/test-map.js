// The map has to expose exactly the slots the Base does - same stations, same
// indices, no duplicates, none missing - or a marker will edit the wrong slot.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
const grab=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const grabBlock=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i);return src.slice(i,j+b.length)};

const sandbox={console};
vm.createContext(sandbox);
vm.runInContext(grabBlock('const MAP_SPOTS={','\n};'),sandbox);
vm.runInContext(grab('function mapFloorSlots'),sandbox);

const SLOT_RULES={WORKER:{initial:4,unlocks:[1,4,7,10,12,14,16]},ASTROMECH:{initial:3,unlocks:[2,5,8,11,13,15]},
  BATTLE:{initial:2,unlocks:[3,6,9,17,18,19,20,21,22]},BUILD:{initial:3,unlocks:[]},
  LOUNGE:{initial:5,unlocks:new Array(8).fill(99)},COMPANION:{initial:2,unlocks:[]},UPGRADE_CHIP:{initial:1,unlocks:[]}};
const total=t=>SLOT_RULES[t].initial+SLOT_RULES[t].unlocks.length;

const down=vm.runInContext("mapFloorSlots('downstairs')",sandbox);
const up=vm.runInContext("mapFloorSlots('upstairs')",sandbox);
const all=[...down,...up];
console.log(`markers: ${down.length} downstairs + ${up.length} upstairs = ${all.length}`);

let ok=true;
console.log('\nstation        map   game');
for(const t of ['WORKER','ASTROMECH','BATTLE','BUILD','LOUNGE','UPGRADE_CHIP']){
  const mine=all.filter(s=>s.station===t),want=total(t);
  const idx=mine.map(s=>s.index).sort((a,b)=>a-b);
  const contiguous=idx.every((v,i)=>v===i);
  const good=mine.length===want&&contiguous;
  if(!good)ok=false;
  console.log(`  ${t.padEnd(13)}${String(mine.length).padStart(3)}   ${String(want).padStart(4)}   ${good?'ok':'*** '+(mine.length!==want?'count':'indices '+idx.join(','))+' ***'}`);
}
const bp=all.filter(s=>s.station==='BLUEPRINT_STORAGE');
console.log(`  ${'BLUEPRINT'.padEnd(13)}${String(bp.length).padStart(3)}      3   ${bp.length===3?'ok':'*** wrong ***'}`);
if(bp.length!==3)ok=false;

// Battle spans floors: ground 0-4, upstairs 5-10, no overlap.
const bDown=down.filter(s=>s.station==='BATTLE').map(s=>s.index).sort((a,b)=>a-b);
const bUp=up.filter(s=>s.station==='BATTLE').map(s=>s.index).sort((a,b)=>a-b);
console.log('\nBattle downstairs:',bDown.join(','),'| upstairs:',bUp.join(','));
const split=JSON.stringify(bDown)==='[0,1,2,3,4]'&&JSON.stringify(bUp)==='[5,6,7,8,9,10]';
console.log('  ground floor is 0-4 and upstairs 5-10 (the Rebirth 17-22 unlocks):',split);
if(!split)ok=false;

// Nothing may appear twice, and every coordinate must be inside the artwork.
const keys=all.map(s=>`${s.station}:${s.index}`);
const dupes=keys.length!==new Set(keys).size;
const inBounds=all.every(s=>s.x>0&&s.x<100&&s.y>0&&s.y<100);
console.log('\nno slot appears on both floors:',!dupes);
console.log('every marker sits inside the image:',inBounds);
if(dupes||!inBounds)ok=false;

// Lounge: the 5 base spots must come before the 8 Nova ones.
const lounge=down.filter(s=>s.station==='LOUNGE');
const nova=lounge.filter(s=>s.index>=9);
console.log('\nlounge: 5 base + 4 rebirth + 4 nova =',lounge.length);
console.log('  the 4 Nova slots (9-12) are the northernmost dots:',nova.length===4&&nova.every(s=>s.y<29)&&lounge.filter(s=>s.index<9).every(s=>s.y>29));

// The Astromech top and bottom rows should each sit on one line, and each row
// should run left to right so slot indices follow reading order.
const astro=down.filter(s=>s.station==='ASTROMECH');
const topRow=astro.filter(s=>s.y<45),botRow=astro.filter(s=>s.y>=54);
const oneLine=a=>new Set(a.map(s=>s.y)).size===1;
const ltr=a=>a.every((s,i)=>i===0||s.index>a[i-1].index&&s.x>a[i-1].x);
console.log('\nAstromech top row of',topRow.length,'on one line:',oneLine(topRow),'| left to right:',ltr(topRow));
console.log('Astromech bottom row of',botRow.length,'on one line:',oneLine(botRow),'| left to right:',ltr(botRow));
console.log('the lone left one is untouched:',astro.filter(s=>s.y>=45&&s.y<54).length===1);
const rows=topRow.length===4&&botRow.length===4&&oneLine(topRow)&&oneLine(botRow)&&ltr(topRow)&&ltr(botRow);
if(!rows)ok=false;

console.log('\nPASS:',ok);


