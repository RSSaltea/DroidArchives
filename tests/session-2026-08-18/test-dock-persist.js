// A page render destroys the timer panel and a MutationObserver rebuilds it.
// The docked state must survive that, otherwise every click drops the panel back
// to full width until the next scroll. Also re-checks the oscillation guard.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
const grab=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const grabLine=k=>src.slice(src.indexOf(k)).split('\n')[0];

const PANEL_H=200, MARK=1000;
function build(){
  const world={scrollY:0,classes:new Set()};
  const el={
    dataset:{},offsetHeight:PANEL_H,offsetWidth:240,
    classList:{
      contains:c=>world.classes.has(c),
      toggle:(c,on)=>{const want=on===undefined?!world.classes.has(c):on;want?world.classes.add(c):world.classes.delete(c)},
      remove:c=>world.classes.delete(c),
    },
    style:{left:''},
    getBoundingClientRect:()=>({top:MARK-PANEL_H-24-world.scrollY,right:900}),
  };
  const sandbox={
    app:{querySelector:()=>el,children:[]},
    document:{documentElement:{clientWidth:1900}},
    innerWidth:1900,
    get scrollY(){return world.scrollY},
    Math,Number,Array,console,
  };
  vm.createContext(sandbox);
  vm.runInContext(grabLine('let timerDock='),sandbox);
  vm.runInContext(grab('function updateTimerDocking'),sandbox);
  return {world,sandbox,el};
}

const {world,sandbox}=build();
const docked=()=>world.classes.has('timers-docked');
const state=()=>vm.runInContext('timerDock.docked',sandbox);

console.log('=== scrolling past the mark docks it ===');
world.scrollY=MARK+300;
vm.runInContext('updateTimerDocking()',sandbox);
console.log('  docked:',docked(),'| remembered:',state());

console.log('\n=== a page render rebuilds the panel: state must survive ===');
// This is what the MutationObserver rebuild does - a brand new element with no
// classes - except timerShell now paints timers-docked from the remembered state.
const remembered=state();
world.classes.clear();
if(remembered)world.classes.add('timers-docked');
console.log('  panel rebuilt, painted docked:',docked());
vm.runInContext('updateTimerDocking()',sandbox);
console.log('  still docked after re-check:',docked(),'(was full width before the fix)');

console.log('\n=== ten renders in a row, no scrolling ===');
let stayed=true;
for(let i=0;i<10;i++){
  const keep=state();
  world.classes.clear();
  if(keep)world.classes.add('timers-docked');
  vm.runInContext('updateTimerDocking()',sandbox);
  if(!docked())stayed=false;
}
console.log('  stayed docked through every render:',stayed);

console.log('\n=== scrolling back to the top releases it ===');
world.scrollY=0;
vm.runInContext('updateTimerDocking()',sandbox);
console.log('  released:',!docked());

console.log('\n=== still no oscillation in the hysteresis band ===');
let flips=0,last=docked();
for(const y of [MARK+10,MARK+10-PANEL_H,MARK+10,MARK+10-PANEL_H,MARK+10]){
  world.scrollY=y;
  vm.runInContext('updateTimerDocking()',sandbox);
  if(docked()!==last){flips++;last=docked()}
}
console.log('  state changes over the flip-flop sequence:',flips,flips<=1?'(stable)':'*** OSCILLATES ***');

console.log('\nPASS:',stayed&&flips<=1);
