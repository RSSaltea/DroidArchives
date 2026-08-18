// The recommendation has to rank by damage per crystal, and Multi Crit has to be
// priced including the Critical Chance ranks it needs first.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8'),lines=src.split(/\r?\n/);
const grab=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const grabLine=k=>lines.find(l=>l.trimStart().startsWith(k));
const grabTo=(k,end)=>{const i=src.indexOf(k);return src.slice(i,src.indexOf(end,i)+end.length)};

const nova=JSON.parse(fs.readFileSync(ROOT+'data/nova-shop.json','utf8'));
const sandbox={console,Math,fmt:n=>String(n),state:{novaShop:nova}};
vm.createContext(sandbox);
for(const k of ['const PICKAXE_SECONDS_PER_LEVEL=','const CRIT_CHANCE_BASE=','const CRIT_AMOUNT_BASE=','const CHOPPER_CRIT_BONUS=',
  'const CRIT_UPGRADE_IDS=','const rebirthCritBonus=','const pickaxeHitSeconds=','const critChanceFor=','const critAmountFor=',
  'const multiCritRolls=','const novaUpgrade=','const novaLevelCost=','const novaMaxLevel=','const MULTI_CRIT_REQUIRES_CHANCE=',
  'const pickaxeMasteryLevels='])
  vm.runInContext(grabLine(k),sandbox);
vm.runInContext(grab('function critMultiplier'),sandbox);
vm.runInContext(grabTo('const critProfile=','\n};'),sandbox);
vm.runInContext(grab('function critUpgradeOptions'),sandbox);
const run=e=>vm.runInContext(e,sandbox);

let fails=0;
const ok=(label,cond)=>{if(!cond)fails++;console.log(`  ${cond?'ok  ':'FAIL'} ${label}`)};

console.log('=== Pickaxe Mastery floor: 5 at rank 1, +2 each, 25 at rank 11 ===');
sandbox.novaLevelFor=r=>r;
for(const [rank,want] of [[0,0],[1,5],[2,7],[4,11],[11,25]]){
  sandbox.novaLevelFor=()=>rank;
  const got=run('pickaxeMasteryLevels()');
  ok(`rank ${String(rank).padStart(2)} keeps ${String(want).padStart(2)}`,got===want);
}
sandbox.novaLevelFor=()=>0;

console.log('\n=== the sheet\'s own scenario: all levels 0, Chopper on ===');
const base={chanceLevel:0,amountLevel:0,multiLevel:0,chopper:true,pickaxe:20,astromech:0};
const opts=run(`critUpgradeOptions(${JSON.stringify(base)})`);
opts.forEach(o=>console.log(`   ${o.name.padEnd(16)} -> ${o.to}   ${String(o.cost).padStart(5)} nova   +${(o.gain*100).toFixed(2)}%   ${o.value.toFixed(2)} per 1k${o.note?'   ('+o.note+')':''}`));
ok('Critical Amount is the best buy, as the sheet concludes',opts[0].name==='Critical Amount');
ok('Critical Chance gain matches the sheet (3.31%)',Math.abs(opts.find(o=>o.name==='Critical Chance').gain-0.0331)<5e-5);
ok('Critical Amount gain matches the sheet (3.38%)',Math.abs(opts.find(o=>o.name==='Critical Amount').gain-0.0338)<5e-5);

console.log('\n=== Multi Crit is priced with the ranks it needs first ===');
const mc=opts.find(o=>o.name==='Multi Crit');
// Multi Crit needs Critical Chance 4, so its unlock is ranks 1-4.
const ccCost=[60,90,120,150].reduce((a,b)=>a+b,0);
console.log(`   quoted ${mc.cost} nova, note: "${mc.note}"`);
ok('quotes Multi Crit its own real price of 400',mc.cost===400);
ok(`marked locked, stating the ${ccCost} needed to unlock`,mc.locked===true&&mc.note.includes(String(ccCost)));
ok('locked ranks sort below anything buyable',opts.indexOf(mc)===opts.length-1);
ok('names the prerequisite',/Critical Chance 4/.test(mc.note));

console.log('\n=== once Critical Chance is already there, only its own price counts ===');
const met=run(`critUpgradeOptions(${JSON.stringify({...base,chanceLevel:4})})`);
const mc2=met.find(o=>o.name==='Multi Crit');
ok('still 400 with the prerequisite met',mc2.cost===400&&!mc2.locked);
ok('and carries no note',!mc2.note);

console.log('\n=== maxed upgrades drop out of the list ===');
const maxed=run(`critUpgradeOptions(${JSON.stringify({...base,chanceLevel:50,amountLevel:50,multiLevel:4})})`);
ok('nothing left to recommend',maxed.length===0);

console.log('\n=== ranking really is damage per crystal ===');
// Buyable ranks come first, in descending value; locked ones trail behind.
const buyable=opts.filter(o=>!o.locked);
ok('buyable ranks sorted descending by value',buyable.every((o,i)=>i===0||buyable[i-1].value>=o.value));
ok('every locked rank sits after every buyable one',opts.findIndex(o=>o.locked)===-1||opts.findIndex(o=>o.locked)>=buyable.length);
ok('value = gain / cost x 1000',opts.every(o=>Math.abs(o.value-o.gain/o.cost*1000)<1e-9));

console.log(fails?`\n${fails} FAILURE(S)`:'\nPASS: true');


