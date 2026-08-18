// Fitting pickaxe level to seconds removed per hit, from the eight measurements.
// Astromech levels stack onto your own, so the input is the effective level.
const samples=[
  {level:14,bonus:0,secs:18.0},
  {level:15,bonus:0,secs:19.2},
  {level:16,bonus:0,secs:20.4},
  {level:17,bonus:0,secs:21.6},
  {level:14,bonus:7,secs:26.4},
  {level:15,bonus:7,secs:27.6},
  {level:16,bonus:7,secs:28.8},
  {level:17,bonus:7,secs:30.0},
];

console.log('effective  seconds   step');
let prev=null;
for(const s of samples.slice().sort((a,b)=>(a.level+a.bonus)-(b.level+b.bonus))){
  const eff=s.level+s.bonus;
  console.log(`   ${String(eff).padStart(2)}      ${s.secs.toFixed(1).padStart(5)}   ${prev===null?'-':(s.secs-prev).toFixed(2)}`);
  prev=s.secs;
}

// Every step of one level is the same size, so it is linear.
const steps=[];
const sorted=samples.slice().sort((a,b)=>(a.level+a.bonus)-(b.level+b.bonus));
for(let i=1;i<sorted.length;i++){
  const de=(sorted[i].level+sorted[i].bonus)-(sorted[i-1].level+sorted[i-1].bonus);
  if(de===1)steps.push(sorted[i].secs-sorted[i-1].secs);
}
const per=steps.reduce((a,b)=>a+b,0)/steps.length;
console.log(`\nper level: ${per.toFixed(4)}s  (all steps identical: ${steps.every(s=>Math.abs(s-per)<1e-9)})`);

// seconds = per * (effective + offset)
const first=sorted[0],offset=first.secs/per-(first.level+first.bonus);
console.log(`offset:    ${offset.toFixed(4)}`);
console.log(`\nformula:   seconds = ${per.toFixed(1)} x (pickaxe level + astromech + ${offset.toFixed(0)})`);

let bad=0;
console.log('\ncheck against every measurement:');
for(const s of samples){
  const eff=s.level+s.bonus,got=per*(eff+offset);
  const ok=Math.abs(got-s.secs)<1e-9;
  if(!ok)bad++;
  console.log(`  ${ok?'ok  ':'FAIL'} level ${s.level} +${s.bonus} = ${String(eff).padStart(2)}  ->  ${got.toFixed(2)}s   measured ${s.secs.toFixed(1)}s`);
}
console.log(bad?`\n${bad} MISMATCH`:'\nall eight measurements reproduced exactly');

console.log('\nextrapolating:');
for(const eff of [0,1,10,20,25,32,50])console.log(`  effective ${String(eff).padStart(2)} -> ${(per*(eff+offset)).toFixed(1)}s`);
