// The crit model has to reproduce the community sheet exactly and the eight
// pickaxe measurements exactly, or the calculator built on it is fiction.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js','utf8'),lines=src.split(/\r?\n/);
const grab=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const grabLine=k=>lines.find(l=>l.trimStart().startsWith(k));

const sandbox={console,Math};
vm.createContext(sandbox);
for(const k of ['const PICKAXE_SECONDS_PER_LEVEL=','const CRIT_CHANCE_BASE=','const CRIT_AMOUNT_BASE=','const CHOPPER_CRIT_BONUS=',
  'const rebirthCritBonus=','const pickaxeHitSeconds=','const critChanceFor=','const critAmountFor=','const multiCritRolls='])
  vm.runInContext(grabLine(k),sandbox);
vm.runInContext(grab('function critMultiplier'),sandbox);
// critProfile spans several lines and opens with a destructured parameter, so
// brace counting stops too early. Take it up to the line that closes it.
const start=src.indexOf('const critProfile=');
vm.runInContext(src.slice(start,src.indexOf('\n};',start)+3),sandbox);
const run=e=>vm.runInContext(e,sandbox);

let fails=0;
const near=(label,got,want,tol=1e-9)=>{const ok=Math.abs(got-want)<tol;if(!ok)fails++;
  console.log(`  ${ok?'ok  ':'FAIL'} ${label.padEnd(44)} ${got.toFixed(4).padStart(9)}  want ${want.toFixed(4)}`)};

console.log('=== pickaxe: the eight measurements ===');
for(const [lvl,bonus,want] of [[14,0,18],[15,0,19.2],[16,0,20.4],[17,0,21.6],[14,7,26.4],[15,7,27.6],[16,7,28.8],[17,7,30]])
  near(`level ${lvl} + ${bonus} astromech`,run(`pickaxeHitSeconds(${lvl}+${bonus})`),want);

console.log('\n=== base rates ===');
near('crit chance, level 0, no Chopper',run('critChanceFor(0,false)'),0.01);
near('crit chance, level 0, Chopper',run('critChanceFor(0,true)'),0.51);
near('crit amount, level 0, Chopper',run('critAmountFor(0,true)'),1.00);
near('crit chance, level 8, Chopper',run('critChanceFor(8,true)'),0.91);

console.log('\n=== Multi Crit cap: level N buys N extra rolls ===');
for(const [lvl,want] of [[0,1],[1,2],[2,3],[3,4],[4,5]])near(`level ${lvl}`,run(`multiCritRolls(${lvl})`),want);

console.log('\n=== sheet: multiplier on a crit, baseline 51% / 100% ===');
// The sheet reports the multiplier given a crit landed, so divide out the
// no-crit branch to compare like for like.
const onCrit=(c,a,r)=>(run(`critMultiplier(${c},${a},${r})`)-(1-Math.min(1,c)))/Math.min(1,c);
[[1,2.0000],[2,2.2550],[3,2.2875],[4,2.2896],[5,2.2897]].forEach(([rolls,want])=>
  near(`rolls ${rolls}`,onCrit(0.51,1.00,rolls),want,5e-5));

console.log('\n=== sheet: after buying Critical Chance (56%) ===');
[[1,2.0000],[2,2.2800],[3,2.3192],[4,2.3219],[5,2.3220]].forEach(([rolls,want])=>
  near(`rolls ${rolls}`,onCrit(0.56,1.00,rolls),want,5e-5));

console.log('\n=== sheet: after buying Critical Amount (110%) ===');
[[1,2.1000],[2,2.3805],[3,2.4163],[4,2.4185],[5,2.4186]].forEach(([rolls,want])=>
  near(`rolls ${rolls}`,onCrit(0.51,1.10,rolls),want,5e-5));

console.log('\n=== sheet: damage increase from one more rank ===');
const dmg=(c,a,r)=>run(`critMultiplier(${c},${a},${r})`);
const base=dmg(0.51,1.00,1);
near('Critical Chance +1',dmg(0.56,1.00,1)/base-1,0.0331,5e-5);
near('Critical Amount +1',dmg(0.51,1.10,1)/base-1,0.0338,5e-5);

console.log('\n=== chance above 100% stays unclamped in the chain ===');
// 200% chance: roll 2 is a guaranteed 100%, roll 3 a coin flip.
const p=run('critProfile({chanceLevel:0,amountLevel:0,chopper:false,multiLevel:3,pickaxe:0})');
console.log('  profile keys:',Object.keys(p).join(', '));
near('200% chance, 2 rolls, all guaranteed',run('critMultiplier(2.0,1.0,2)'),3.0);
console.log('  (1 base + 2 crit amounts, both rolls certain)');

console.log('\n=== rebirth buffs are wired in but currently zero ===');
console.log('  ',JSON.stringify(run('rebirthCritBonus()')));

console.log('\n=== a whole profile ===');
const prof=run('critProfile({chanceLevel:10,amountLevel:10,multiLevel:2,chopper:true,pickaxe:25,astromech:7})');
console.log(`   chance ${(prof.chance*100).toFixed(0)}%  amount ${(prof.amount*100).toFixed(0)}%  rolls ${prof.rolls}`);
console.log(`   base hit ${prof.base.toFixed(1)}s  x${prof.multiplier.toFixed(3)}  =  ${prof.perHit.toFixed(2)}s per swing`);
near('base hit for effective level 32',prof.base,39.6);

console.log(fails?`\n${fails} FAILURE(S)`:'\nPASS: true');
