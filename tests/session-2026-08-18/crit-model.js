// Reconstructing the crit maths from the community sheet, then checking the
// reconstruction against every figure the sheet prints. If these all match, the
// model is right and the calculator can be built on it.
const pct=n=>(n*100).toFixed(2)+'%';

// p = chance to crit, a = crit amount, rank = Multi Crits rank.
// Each extra roll is conditional on the previous one landing, and its chance is
// halved again each time: p/2, p/4, p/8, p/16.
function multiCritMultiplier(p,a,rank){
  let mult=1+a,chain=1;
  for(let k=1;k<=rank;k++){chain*=p/Math.pow(2,k);mult+=chain*a}
  return mult;
}
// Average damage against a non-crit swing of 1.
const expected=(p,a,rank)=>(1-p)+p*multiCritMultiplier(p,a,rank);

const chance=(lvl,chopper)=>0.01+0.05*lvl+(chopper?0.5:0);
const amount=(lvl,chopper)=>0.50+0.10*lvl+(chopper?0.5:0);

let fails=0;
const check=(label,got,want)=>{
  const ok=Math.abs(got-want)<0.0001;
  if(!ok)fails++;
  console.log(`  ${ok?'ok  ':'FAIL'} ${label.padEnd(46)} got ${pct(got).padStart(8)}  sheet ${pct(want).padStart(8)}`);
};

console.log('=== base values (level 0, Chopper equipped) ===');
check('chance to crit',chance(0,true),0.51);
check('crit amount',amount(0,true),1.00);

console.log('\n=== Multi Crits multiplier by rank, baseline p=51% a=100% ===');
[[0,2.0000],[1,2.2550],[2,2.2875],[3,2.2896],[4,2.2897]].forEach(([r,want])=>
  check(`rank ${r}`,multiCritMultiplier(0.51,1.00,r),want));

console.log('\n=== after buying Critical Chance (p=56%) ===');
[[0,2.0000],[1,2.2800],[2,2.3192],[3,2.3219],[4,2.3220]].forEach(([r,want])=>
  check(`rank ${r}`,multiCritMultiplier(0.56,1.00,r),want));

console.log('\n=== after buying Critical Amount (a=110%) ===');
[[0,2.1000],[1,2.3805],[2,2.4163],[3,2.4185],[4,2.4186]].forEach(([r,want])=>
  check(`rank ${r}`,multiCritMultiplier(0.51,1.10,r),want));

console.log('\n=== damage increase from one more rank ===');
const base=expected(0.51,1.00,0);
check('Critical Chance  +1',expected(0.56,1.00,0)/base-1,0.0331);
check('Critical Amount  +1',expected(0.51,1.10,0)/base-1,0.0338);
// The sheet pairs a 91% crit chance with a multiplier still derived from 51%.
const mcMult=multiCritMultiplier(0.51,1.00,1);
check('Multi Crits      +1',((1-0.91)+0.91*mcMult)/base-1,0.4186);

console.log('\n=== value per crystal (sheet calls it scaled impact) ===');
const scaled=(inc,cost)=>inc/cost*1000;
check('Critical Chance / 60',scaled(expected(0.56,1.00,0)/base-1,60),0.5519);
check('Critical Amount / 30',scaled(expected(0.51,1.10,0)/base-1,30),1.1258);
check('Multi Crits / 820',scaled(((1-0.91)+0.91*mcMult)/base-1,820),0.5105);

console.log(fails?`\n${fails} MISMATCH(ES)`:'\nevery figure in the sheet reproduced exactly');

console.log('\n=== the 91% question ===');
console.log('  crit chance if Multi Crits needs Critical Chance rank 4:',pct(chance(4,true)));
console.log('  crit chance if it needs rank 8:                        ',pct(chance(8,true)));
console.log('  sheet uses 91%, so its damage maths assumes rank 8');
const cost=n=>[60,90,120,150,180,210,240,270].slice(0,n).reduce((s,x)=>s+x,0);
console.log('  cost of Critical Chance 1-4 + Multi Crits 1:',cost(4)+400,'(the sheet quotes 820)');
console.log('  cost of Critical Chance 1-8 + Multi Crits 1:',cost(8)+400);

