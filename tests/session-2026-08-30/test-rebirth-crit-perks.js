// Rebirths 23, 26 and 29 hand out +5% crit chance and 24, 27 and 30 hand out
// +10% crit amount. rebirthCritBonus was a stub returning zero, left in place so
// the buffs could arrive as data; this checks the data and the sum agree, and
// that the bonus is a running total of what you have reached rather than the
// single perk sitting on your current rebirth.
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.resolve(__dirname,'..','..')+'/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log('  '+(c?'ok  ':'FAIL')+' '+l+(c?'':'  -> '+x))};

// Pull a top-level function out of app.js. The parameter list is walked first so
// that a destructured default like ({after=0}={}) is not mistaken for the body.
function extract(name){
  const start=src.indexOf('function '+name+'(');
  if(start<0)throw Error('function not found: '+name);
  let parens=0,body=-1;
  for(let j=src.indexOf('(',start);j<src.length;j++){
    if(src[j]==='(')parens++;
    else if(src[j]===')'&&--parens===0){body=src.indexOf('{',j);break}
  }
  if(body<0)throw Error('no body found for '+name);
  let depth=0;
  for(let j=body;j<src.length;j++){
    if(src[j]==='{')depth++;
    else if(src[j]==='}'&&--depth===0)return src.slice(start,j+1);
  }
  throw Error('unbalanced braces in '+name);
}

const shop=JSON.parse(fs.readFileSync(ROOT+'data/nova-shop.json','utf8'));

function run(rebirth){
  const sandbox={state:{rebirth,novaShop:shop}};
  vm.createContext(sandbox);
  vm.runInContext(extract('rebirthCritBonus')+'\n'+extract('rebirthCritPerks'),sandbox);
  return sandbox;
}

console.log('=== the data carries the six perks ===');
{
  const perk=n=>shop.rebirthRewards.find(r=>r.rebirth===n)||{};
  ok('R23 is +5% crit chance',perk(23).critChancePercent===5,JSON.stringify(perk(23)));
  ok('R24 is +10% crit amount',perk(24).critAmountPercent===10,JSON.stringify(perk(24)));
  ok('R26 is +5% crit chance',perk(26).critChancePercent===5,JSON.stringify(perk(26)));
  ok('R27 is +10% crit amount',perk(27).critAmountPercent===10,JSON.stringify(perk(27)));
  ok('R29 is +5% crit chance',perk(29).critChancePercent===5,JSON.stringify(perk(29)));
  ok('R30 is +10% crit amount',perk(30).critAmountPercent===10,JSON.stringify(perk(30)));
  const stray=shop.rebirthRewards.filter(r=>(r.critChancePercent||r.critAmountPercent)&&![23,24,26,27,29,30].includes(r.rebirth));
  ok('no other rebirth carries a crit perk',stray.length===0,JSON.stringify(stray));
}

console.log('=== nothing is banked before R23 ===');
{
  const {rebirthCritBonus}=run(22);
  const bonus=rebirthCritBonus();
  ok('chance is zero at R22',bonus.chance===0,String(bonus.chance));
  ok('amount is zero at R22',bonus.amount===0,String(bonus.amount));
}

console.log('=== each perk lands on its own rebirth ===');
{
  const near=(a,b)=>Math.abs(a-b)<1e-9;
  ok('R23 banks 5% chance and no amount',near(run(23).rebirthCritBonus().chance,0.05)&&run(23).rebirthCritBonus().amount===0);
  ok('R24 keeps the 5% and adds 10% amount',near(run(24).rebirthCritBonus().chance,0.05)&&near(run(24).rebirthCritBonus().amount,0.10));
  // 25 and 28 hand out nothing, so the running total must not move across them.
  ok('R25 is unchanged from R24',near(run(25).rebirthCritBonus().chance,0.05)&&near(run(25).rebirthCritBonus().amount,0.10));
  ok('R28 is unchanged from R27',near(run(28).rebirthCritBonus().chance,0.10)&&near(run(28).rebirthCritBonus().amount,0.20));
}

console.log('=== the perks stack rather than replace ===');
{
  const near=(a,b)=>Math.abs(a-b)<1e-9;
  const bonus=run(30).rebirthCritBonus();
  ok('all three chance perks are banked at R30',near(bonus.chance,0.15),String(bonus.chance));
  ok('all three amount perks are banked at R30',near(bonus.amount,0.30),String(bonus.amount));
}

console.log('=== what is still owed ===');
{
  const {rebirthCritPerks}=run(24);
  const owed=rebirthCritPerks({after:24});
  ok('four perks are still ahead at R24',owed.length===4,JSON.stringify(owed));
  ok('the next one is R26 crit chance',owed[0].at===26&&owed[0].chance===5,JSON.stringify(owed[0]));
  ok('nothing is owed at R30',rebirthCritPerks({after:30}).length===0);
  ok('a goal short of 26 hides the later perks',rebirthCritPerks({after:24,through:25}).length===0);
}

console.log(fails?`\n${fails} FAILED`:'\nAll passed');
process.exit(fails?1:0);
