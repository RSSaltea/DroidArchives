// Battle is split over two floors. Measured in game: B1+B6 free -> B1,
// B2+B6 free -> B2, B6+B11 free -> B11. So downstairs wins over upstairs, and
// upstairs works back from the stairs. Anything naming a Battle slot must also
// say which floor, since the number alone does not tell you where to walk.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log(`  ${c?'ok  ':'FAIL'} ${l}${c?'':'  '+x}`)};
const line=k=>src.split(/\r?\n/).find(l=>l.trimStart().startsWith(k));
const grab=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};

const CAP={BATTLE:11,WORKER:11,ASTROMECH:9,LOUNGE:10};
const sandbox={console,Math,Number,Array,Set,JSON,MAP_FLOORS:['downstairs','upstairs'],
  stationName:t=>t[0]+t.slice(1).toLowerCase(),
  stationSlotIndices:t=>Array.from({length:CAP[t]},(_,i)=>i)};
vm.createContext(sandbox);
vm.runInContext(/const MAP_SPOTS=\{[\s\S]*?\n\};/.exec(src)[0],sandbox);
// Battle is the only station left with a measured order, so this is one line.
for(const k of ['const BATTLE_UPSTAIRS_FROM=','const slotFloor=','const floorNote=','const stationSlotLabel=',
  'const ASTROMECH_MISSION_SLOTS=','const SLOT_FLOOR_PENALTY=','const SLOT_GAP_UNREACHABLE=','const MEASURED_FILL_ORDER='])
  vm.runInContext(line(k),sandbox);
for(const k of ['function slotLogPoint','function slotWalkGap'])vm.runInContext(grab(k),sandbox);
vm.runInContext(/const slotFillOrder=\(station,origin\)=>\{[\s\S]*?\n\};/.exec(src)[0],sandbox);
const run=e=>vm.runInContext(e,sandbox);
const at=(st,origin)=>run(`slotFillOrder("${st}"${origin?','+JSON.stringify(origin):''})`).map(i=>i+1).join(',');

console.log('=== Battle keeps the order one sweep measured ===');
// The station was emptied and refilled a droid at a time, so every landing named
// the best slot still free. Every other station moved over to distance-from-origin
// (see test-nearest-fill.js); Battle cannot, because both its floors are drawn on
// the one map image and the upstairs dots sit on ground-floor coordinates.
ok('Battle    11,10,5,4,9,3,8,2,7,6,1',at('BATTLE')==='11,10,5,4,9,3,8,2,7,6,1',at('BATTLE'));
ok('it is the only measured list left',
  JSON.stringify(Object.keys(run('MEASURED_FILL_ORDER')))==='["BATTLE"]',JSON.stringify(Object.keys(run('MEASURED_FILL_ORDER'))));
ok('so the origin makes no difference to Battle',
  at('BATTLE',{station:'LOUNGE',slot:0})===at('BATTLE')&&at('BATTLE',{station:'WORKER',slot:0})===at('BATTLE'));
ok('and plain slot order is not what it falls back to',at('BATTLE')!=='1,2,3,4,5,6,7,8,9,10,11');
const B=at('BATTLE').split(',').map(Number);
ok('Battle starts upstairs, so downstairs-first was wrong',B[0]>5&&B[1]>5,B.join(','));
ok('and Battle 1 is last rather than first',B[B.length-1]===1);

console.log('\n=== a known conflict, left standing rather than papered over ===');
// The earlier two-slot test had Battle 1 and 6 free and took 1. This order puts
// 6 ahead of 1, so one fixed list cannot explain both - which matches Phase 0
// finding that where the droid starts changes the answer. Battle is exactly where
// that cannot yet be acted on, so the conflict stays visible.
const order=run('slotFillOrder("BATTLE")');
const pick=(...free)=>order.find(i=>free.includes(i))+1;
ok('the sweep order predicts B6 over B1, not the B1 seen in the earlier pair test',
  pick(0,5)===6,'predicts B'+pick(0,5));
ok('B2 over B6 still agrees with the earlier test',pick(1,5)===2,'predicts B'+pick(1,5));
ok('B11 over B6 still agrees',pick(5,10)===11,'predicts B'+pick(5,10));
ok('the code says what would let Battle join the rest',
  /upstairs real coordinates and this[\s\S]{0,40}entry can go/.test(src));

console.log('\n=== only unlocked slots are offered ===');
CAP.BATTLE=5;
ok('with only the ground floor bought, no upstairs slots appear',
  run('slotFillOrder("BATTLE")').every(i=>i<5));
CAP.BATTLE=12;
ok('a slot the sweep never reached is offered last, not dropped',
  at('BATTLE')==='11,10,5,4,9,3,8,2,7,6,1,12',at('BATTLE'));
CAP.BATTLE=11;

console.log('\n=== the floor is stated wherever a Battle slot is named ===');
ok('slot 1 is downstairs',run('slotFloor("BATTLE",0)')==='downstairs');
ok('slot 5 is downstairs',run('slotFloor("BATTLE",4)')==='downstairs');
ok('slot 6 is upstairs',run('slotFloor("BATTLE",5)')==='upstairs');
ok('slot 11 is upstairs',run('slotFloor("BATTLE",10)')==='upstairs');
ok('other stations get no floor',run('slotFloor("WORKER",0)')==='');
ok('label reads "Battle 8 (upstairs)"',run('stationSlotLabel("BATTLE",7)')==='Battle 8 (upstairs)',run('stationSlotLabel("BATTLE",7)'));
ok('label reads "Battle 2 (downstairs)"',run('stationSlotLabel("BATTLE",1)')==='Battle 2 (downstairs)');
ok('Worker is left alone',run('stationSlotLabel("WORKER",2)')==='Worker 3');

console.log('\n=== wired into every place that names a slot ===');
ok('classic plan slot text',/const slotLabel=p=>p\?`\$\{p\.station\} \$\{p\.slot\+1\}\$\{floorNote\(p\.station,p\.slot\)\}`/.test(src));
ok('Optimise preview "From:" line',/originLabel=x=>[\s\S]{0,180}floorNote\(origin\.station,origin\.slot\)/.test(src));
ok('route plan "go to work" step',/go to work[\s\S]{0,60}\$\{toFloor\(action\)\} slot/.test(src));
// You can never pick a slot outright; swapping your companion with whoever is in
// it is the only targeted placement the game allows.
ok('route plan swap step names the floor too',/Swap \$\{name\} into a \$\{placeName\(action\.to\)\}\$\{toFloor\(action\)\}/.test(src));
ok('and tells you to do it through the companion',/make it your companion, then swap it with whoever is in the slot/.test(src));
ok('route plan sell step names the floor it came from',/Sell \$\{name\} from \$\{placeName\(from\)\}\$\{fromFloor\(action,from\)\}/.test(src));
ok('Rebirth outlook and Base needed list, via requirementLocations',
  /requirementLocations[\s\S]{0,320}stationSlotLabel\(unit\.station,unit\.slot\)/.test(src));
ok('the Second Floor divider uses the same constant',src.includes("type==='BATTLE'&&index===BATTLE_UPSTAIRS_FROM"));

console.log('\n=== the game places droids in this order too ===');
ok('optimisedPlacements uses slotFillOrder',/free=\(station,origin\)=>slotFillOrder\(station,origin\)/.test(src));
ok('placements() uses it as well',/firstFree=\(station,origin\)=>slotFillOrder\(station,origin\)/.test(src));

console.log(fails?`\n${fails} FAILURE(S)`:'\nPASS: true');
process.exit(fails?1:0);
