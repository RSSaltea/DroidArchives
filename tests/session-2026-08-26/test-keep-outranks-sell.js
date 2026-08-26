// Pressing Keep on a sell step and watching the droid sell anyway. The guard
// that let a Keep through counted a free Build slot as somewhere to put the
// droid, but the placement loop refuses Build unless the droid already stands
// there. With the Lounge and Companion full and "Keep Build slots open" on, the
// press passed the guard, failed to place, and fell into the sweep that sells to
// free Build slots.
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.resolve(__dirname,'..','..')+'/';
const src=fs.readFileSync(ROOT+'app.js','utf8'),LINES=src.split(/\r?\n/);
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log('  '+(c?'ok  ':'FAIL')+' '+l+(c?'':'  -> '+x))};

// The loop that decides where a candidate stands, or what becomes of it.
// Two loops walk the candidates; this is the one that assigns a slot.
const marker=LINES.findIndex(l=>l.includes("let station='',slot=-1;"));
if(marker<0)throw Error('placement loop not found');
const start=marker-3;
const loop=LINES.slice(start,marker+4).join('\n');

function place({candidates,freeSlots,strictKeepBuild}){
  const sell=[],overflow=[],claimed=[];
  const sandbox={candidates,sell,overflow,strictKeepBuild,
    // -1 means "no slot free", which is what the real free() returns.
    free:(station)=>freeSlots[station]===undefined?-1:freeSlots[station],
    claim:(unit,station,slot)=>claimed.push({name:unit.name,station,slot}),
    isIconic:()=>false,
    optimiseFreeBuildMode:()=>'upgrade-cost',
    optimiseFreeBuildModeLabel:()=>'Highest upgrade cost',
    state:{droids:[{name:'OPTI-STRIKE'},{name:'GONK'}]}};
  vm.createContext(sandbox);
  vm.runInContext(loop,sandbox);
  return {sell,overflow,claimed};
}
const kept=name=>({unit:{name},fallbacks:['LOUNGE','COMPANION'],old:null,kept:false,spared:true});
const ordinary=name=>({unit:{name},fallbacks:['LOUNGE','COMPANION'],old:null,kept:false});

console.log('=== a Keep with nowhere to stand is not sold ===');
{
  // Every store full. This is the case that was selling the droid.
  const out=place({candidates:[kept('OPTI-STRIKE')],freeSlots:{},strictKeepBuild:true});
  ok('it does not end up in the Sell list',out.sell.length===0,JSON.stringify(out.sell));
  ok('it goes to overflow instead, where the plan shows it',out.overflow.length===1,JSON.stringify(out.overflow));
  ok('and it is the droid that was kept',out.overflow[0].name==='OPTI-STRIKE');
}

console.log('');
console.log('=== a free Build slot is no longer mistaken for storage ===');
{
  // Build has room, Lounge and Companion do not. The placement cannot use Build
  // for a droid that did not come from there, so this must not read as "fine".
  const out=place({candidates:[kept('OPTI-STRIKE')],freeSlots:{BUILD:0},strictKeepBuild:true});
  ok('the droid is still not sold',out.sell.length===0,JSON.stringify(out.sell));
  ok('and it is not quietly claimed into a Build slot',out.claimed.length===0,JSON.stringify(out.claimed));
}

console.log('');
console.log('=== when there is room, Keep just works ===');
{
  const out=place({candidates:[kept('OPTI-STRIKE')],freeSlots:{LOUNGE:2},strictKeepBuild:true});
  ok('it is placed in the Lounge',out.claimed.length===1&&out.claimed[0].station==='LOUNGE',JSON.stringify(out.claimed));
  ok('nothing is sold',out.sell.length===0);
  ok('and nothing overflows',out.overflow.length===0);
}

console.log('');
console.log('=== the sweep still works on droids you did not keep ===');
{
  const out=place({candidates:[ordinary('GONK')],freeSlots:{},strictKeepBuild:true});
  ok('an ordinary droid with nowhere to go is still sold',out.sell.length===1,JSON.stringify(out.sell));
  ok('and says why',String(out.sell[0].sellReason||'').includes('Build slots open'),out.sell[0].sellReason);
  const off=place({candidates:[ordinary('GONK')],freeSlots:{},strictKeepBuild:false});
  ok('with the sweep off it overflows rather than selling',off.sell.length===0&&off.overflow.length===1);
}

console.log('');
console.log('=== the guard no longer second-guesses the press ===');
{
  const at=LINES.findIndex(l=>l.includes("if(spared.includes(key)"));
  ok('an explicit Keep always becomes a candidate',
    /if\(spared\.includes\(key\)\)\{/.test(LINES[at]||''),LINES[at]);
  ok('and is marked so the sweep leaves it alone',(LINES[at+2]||'').includes('spared:true'),LINES[at+2]);
}

console.log('');
console.log(fails?fails+' failed':'all passed');
process.exit(fails?1:0);
