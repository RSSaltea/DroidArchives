// The arrows beside the deck's number fields. The multiplier carries two pairs:
// whole numbers on the left of the field, tenths on the right. Everything here
// runs the handler that actually ships, against a stand-in for the input.
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.resolve(__dirname,'..','..')+'/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
let fails=0;const ok=(l,c,x='')=>{if(!fails&&!c||!c)fails++;console.log('  '+(c?'ok  ':'FAIL')+' '+l+(c?'':'  -> '+x))};

const start=src.indexOf("deck.querySelectorAll('[data-step-for]')");
if(start<0)throw Error('stepper handler missing');
const handler=src.slice(start,src.indexOf('});',start)+3);

function deckWith(value,min,max){
  const input={value:String(value),min:String(min),max:max===undefined?'':String(max),
    stepUp(){this.value=String(Number(this.value)+1)},
    stepDown(){this.value=String(Number(this.value)-1)},
    dispatchEvent(){this.changed=true}};
  const buttons=[];
  const add=(step,by)=>{const b={dataset:{stepFor:'commandMultiplier',step,...(by?{stepBy:by}:{})}};buttons.push(b);return b};
  const parts={coarseUp:add('up','1'),coarseDown:add('down','1'),fineUp:add('up','0.1'),fineDown:add('down','0.1'),plain:add('up',null)};
  vm.runInContext(handler,vm.createContext({deck:{querySelector:()=>input,querySelectorAll:()=>buttons},Event:function(){}}));
  return {input,...parts};
}
const press=(startAt,keys,min=0,max)=>{const d=deckWith(startAt,min,max);keys.forEach(k=>d[k].onclick());return d};

console.log('=== the multiplier takes whole numbers on the left, tenths on the right ===');
ok('left up adds one',press(59.2,['coarseUp']).input.value==='60.2');
ok('left down takes one',press(59.2,['coarseDown']).input.value==='58.2');
ok('right up adds a tenth',press(59.2,['fineUp']).input.value==='59.3');
ok('right down takes a tenth',press(59.2,['fineDown']).input.value==='59.1');
ok('three tenths do not drift into 59.50000000000001',press(59.2,['fineUp','fineUp','fineUp']).input.value==='59.5');
ok('a whole and a tenth together',press(59.2,['coarseUp','fineUp']).input.value==='60.3');
ok('and it always tells the page it changed',press(59.2,['fineUp']).input.changed===true);

console.log('');
console.log('=== the field\u2019s own limits still hold ===');
ok('it will not go under the minimum',press(0.5,['coarseDown']).input.value==='0');
ok('nor a tenth under it',press(0.05,['fineDown']).input.value==='0');
ok('and it stops at a maximum',press(27,['coarseUp','coarseUp','coarseUp','coarseUp'],0,30).input.value==='30');

console.log('');
console.log('=== a field without an explicit amount uses its own step ===');
ok('current rebirth still steps by one',press(10,['plain']).input.value==='11');

console.log('');
console.log('=== the markup declares both pairs ===');
const dual=src.indexOf('class="deck-stepper is-dual"');
const markup=src.slice(dual,src.indexOf('</span><b>',dual));
ok('two arrow groups sit around the multiplier',(markup.match(/deck-stepper-arrows/g)||[]).length===2);
ok('one of them steps by 1',markup.includes('data-step-by="1"'));
ok('the other by 0.1',markup.includes('data-step-by="0.1"'));
ok('and the whole-number pair comes first',markup.indexOf('data-step-by="1"')<markup.indexOf('id="commandMultiplier"'));

console.log('');
console.log('=== the arrows belong to themselves, not to the whole cell ===');
// A <label> with no for= binds to its first labelable descendant, and a button
// is labelable, so hovering or clicking anywhere in the cell was landing on the
// up arrow. Naming the input explicitly is what keeps the arrows separate.
for(const id of ['commandMultiplier','commandRebirth']){
  const at=src.indexOf('id="'+id+'"');
  const label=src.slice(src.lastIndexOf('<label',at),at);
  ok(id+' sits in a label that names its input',label.includes('for="'+id+'"'),label.slice(0,70));
}
ok('neither field is left to bind by position',!/<label><small>(Base multiplier|Current rebirth)/.test(src));

console.log('');
console.log(fails?fails+' failed':'all passed');
process.exit(fails?1:0);
