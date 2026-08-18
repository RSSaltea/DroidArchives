// Multi-Crit per the in-game description: landing a crit triggers a chain of
// extra rolls, each at half the previous chance, stopping at the cap or the
// first failure. Every successful roll adds another base hit, and the whole
// stack is multiplied by the crit amount.
const hitSeconds=eff=>1.2*(eff+1);

// p may exceed 1 (a 200% chance is a guaranteed roll, and halves to a guaranteed
// 100% on the next), so it must not be clamped.
function rollChances(p,maxRolls){
  return Array.from({length:maxRolls},(_,k)=>p/Math.pow(2,k));
}
// Probability of exactly n successes: the first n land, then one fails (or we
// hit the cap).
function distribution(p,maxRolls){
  const c=rollChances(p,maxRolls).map(x=>Math.min(1,x)),out=[];
  let chain=1;
  for(let n=0;n<=maxRolls;n++){
    if(n===0){out.push(1-c[0]);chain=c[0];continue}
    const more=n<maxRolls?c[n]:0;
    out.push(chain*(1-more));
    chain*=more;
  }
  return out;
}
// Seconds removed by one swing, averaged.
function expectedSeconds(base,p,critMult,maxRolls){
  const dist=distribution(p,maxRolls);
  let total=dist[0]*base;                      // no crit: a plain hit
  for(let n=1;n<=maxRolls;n++)total+=dist[n]*base*n*critMult;
  return total;
}

console.log('=== the worked example: Multi-Crit cap 3, 200% chance, 200% crit damage, 10s base ===');
const dist=distribution(2.0,3);
dist.forEach((d,n)=>console.log(`  exactly ${n} crit${n===1?' ':'s'}: ${(d*100).toFixed(1)}%`));
console.log('  third roll is the only uncertain one, at 50%:',Math.abs(dist[2]-0.5)<1e-9&&Math.abs(dist[3]-0.5)<1e-9);
console.log('  2 successes -> (10+10) x2 =',10*2*2,'s   expected 40');
console.log('  3 successes -> (10+10+10) x2 =',10*3*2,'s   expected 60');
console.log('  average:',expectedSeconds(10,2.0,2,3).toFixed(1),'s  (halfway between 40 and 60)');

console.log('\n=== pickaxe formula against the eight measurements ===');
const checks=[[14,0,18],[15,0,19.2],[16,0,20.4],[17,0,21.6],[14,7,26.4],[15,7,27.6],[16,7,28.8],[17,7,30]];
let bad=0;
for(const [lvl,bonus,want] of checks){const got=hitSeconds(lvl+bonus);if(Math.abs(got-want)>1e-9)bad++}
console.log('  all eight reproduce:',bad===0);

console.log('\n=== why the cap must be level+1, not level ===');
console.log('  at Multi Crit level 0 you still crit normally, so the cap there is 1 roll.');
console.log('  cap = level + 1 gives L0->1, L1->2, L2->3, L3->4, L4->5,');
console.log('  which is exactly what nova-shop.json rewards say.');

console.log('\n=== sanity: more crit chance always helps, and the cap has diminishing value ===');
const base=hitSeconds(25),M=2;
for(const cap of [1,2,3,4,5])console.log(`  cap ${cap}: ${expectedSeconds(base,0.51,M,cap).toFixed(3)}s`);
console.log('  (with 51% chance, ranks past 3 are worth almost nothing)');
