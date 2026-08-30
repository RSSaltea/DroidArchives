// Two answers the planner could not give before. "Can I sell this yet" needed
// the rebirths *after* the one you are reading, not the one it is listed under,
// and "what will I eventually need" needed the highest quality across all of
// them rather than the next one. Ctrl-drag duplication is checked here too,
// because the one thing it must never do is quietly displace what it lands on.
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

const VARIANTS=['DEFAULT','GOLD','DIAMOND','RAINBOW','BESKAR','GALACTIC','STELLAR'];
// GONK is wanted twice and at two different qualities, MOUSE only at the first
// rebirth, PIT only at the last. That covers finished, still-wanted and not-yet.
const CYCLE=[
  {to:20,requiredDroids:[{droidName:'GONK',variant:'GOLD'},{droidName:'MOUSE',variant:'DEFAULT'}]},
  {to:21,requiredDroids:[{droidName:'GONK',variant:'BESKAR'}]},
  {to:22,requiredDroids:[{droidName:'PIT',variant:'RAINBOW'}]},
];

function schedules(goal=30){
  const sandbox={VARIANTS,state:{cycle:0,rebirths:{0:CYCLE}},rebirthGoal:()=>goal};
  vm.createContext(sandbox);
  vm.runInContext([extract('requirementSchedule'),extract('requirementPeak'),extract('requirementFinishesAt')].join('\n'),sandbox);
  return sandbox;
}

console.log('=== every rebirth that still wants a droid ===');
{
  const {requirementSchedule}=schedules();
  ok('GONK is wanted at 20 and 21',JSON.stringify(requirementSchedule('GONK'))==='[{"at":20,"variant":"GOLD"},{"at":21,"variant":"BESKAR"}]',JSON.stringify(requirementSchedule('GONK')));
  ok('a droid nothing wants has an empty schedule',requirementSchedule('NOBODY').length===0);
  ok('after 20 only the R21 entry survives',JSON.stringify(requirementSchedule('GONK',{after:20}))==='[{"at":21,"variant":"BESKAR"}]');
}

console.log('=== the highest quality ever asked for ===');
{
  const {requirementPeak}=schedules();
  // Reading the R20 card: it says Gold, but Beskar is coming at R21. Upgrading
  // to Gold now and to Beskar later costs more than going straight to Beskar.
  ok('GONK peaks at Beskar, not the Gold on its first card',requirementPeak('GONK',{after:19})==='BESKAR',String(requirementPeak('GONK',{after:19})));
  ok('MOUSE peaks at its only requirement',requirementPeak('MOUSE',{after:19})==='DEFAULT');
  ok('a finished droid has no peak',requirementPeak('MOUSE',{after:20})===null||requirementPeak('MOUSE',{after:20})===undefined,String(requirementPeak('MOUSE',{after:20})));
}

console.log('=== can I sell it after this rebirth ===');
{
  const {requirementFinishesAt}=schedules();
  ok('MOUSE is done after R20',requirementFinishesAt('MOUSE',20)===true);
  ok('GONK is not done after R20, R21 still wants it',requirementFinishesAt('GONK',20)===false);
  ok('GONK is done after R21',requirementFinishesAt('GONK',21)===true);
  ok('PIT is not done after R21',requirementFinishesAt('PIT',21)===false);
}

console.log('=== a max rebirth short of a requirement frees the droid ===');
{
  // Stopping at R20 means R21 never happens, so the Beskar GONK is never needed
  // and the copy standing in the Base is spare the moment R20 is done.
  const {requirementFinishesAt,requirementPeak}=schedules(20);
  ok('GONK is sellable after R20 when the goal is R20',requirementFinishesAt('GONK',20)===true);
  ok('and no longer peaks at Beskar',requirementPeak('GONK',{after:19})==='GOLD',String(requirementPeak('GONK',{after:19})));
}

console.log('=== ctrl-drag duplication ===');
function copier({owned=[],droids}={}){
  const toasts=[],commits=[];
  const sandbox={
    state:{owned,droids:droids||[{name:'GONK',special:{}},{name:'BB-8',special:{maxQuantity:1}}]},
    toast:m=>toasts.push(m),
    commitOwned:(...args)=>commits.push(args),
  };
  vm.createContext(sandbox);
  vm.runInContext(extract('copyPlacedDroid'),sandbox);
  return{run:sandbox.copyPlacedDroid,toasts,commits};
}
{
  const c=copier();
  const done=c.run({name:'GONK',variant:'RAINBOW'},'WORKER',4,null);
  ok('a copy into an empty slot is made',done===true);
  ok('it lands in the slot it was dropped on',JSON.stringify(c.commits)==='[["GONK","RAINBOW",1,"WORKER",4]]',JSON.stringify(c.commits));
}
{
  // The whole point of the guard: a plain drag already displaces an occupant,
  // so a copy onto one would be silently destroying a droid.
  const c=copier();
  const done=c.run({name:'GONK',variant:'RAINBOW'},'WORKER',4,{name:'MOUSE',variant:'GOLD'});
  ok('a copy onto an occupied slot is refused',done===false);
  ok('nothing is added',c.commits.length===0,JSON.stringify(c.commits));
  ok('and it says why',/empty slot/.test(c.toasts[0]||''),JSON.stringify(c.toasts));
}
{
  const c=copier({owned:[{name:'BB-8',variant:'DEFAULT',qty:1}]});
  const done=c.run({name:'BB-8',variant:'DEFAULT'},'COMPANION',0,null);
  ok('a one-per-base droid is not duplicated',done===false);
  ok('nothing is added',c.commits.length===0);
  ok('and it says why',/limited to 1/.test(c.toasts[0]||''),JSON.stringify(c.toasts));
}
{
  const c=copier({owned:[]});
  ok('the first copy of a limited droid is allowed',c.run({name:'BB-8',variant:'DEFAULT'},'COMPANION',0,null)===true);
}

console.log(fails?`\n${fails} FAILED`:'\nAll passed');
process.exit(fails?1:0);
