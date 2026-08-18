// Docking the timers makes them position:fixed, which shortens the page by their
// own height and can drag scrollY back under the threshold. Without hysteresis
// that oscillates forever and pins the main thread. This simulates the feedback
// loop against the real function.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=require('child_process').execSync('git -C "c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper" show 9b76e23:app.js',{maxBuffer:1e9}).toString();
const grab=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};

const PANEL_H=200, MARK=1000;
function makeWorld(){
  const el={
    _docked:false,_left:'',dataset:{},offsetHeight:PANEL_H,offsetWidth:240,
    classList:{
      contains:c=>c==='timers-docked'&&el._docked,
      toggle:(c,on)=>{el._docked=on===undefined?!el._docked:on},
      remove:()=>{el._docked=false},
    },
    style:{set left(v){el._left=v},get left(){return el._left}},
    getBoundingClientRect:()=>({top:MARK-PANEL_H-24-world.scrollY,right:900}),
  };
  const world={scrollY:0,innerWidth:1900,el,toggles:0};
  return world;
}

function run(startScroll){
  const world=makeWorld();
  const sandbox={
    app:{querySelector:()=>world.el,children:[]},
    document:{documentElement:{clientWidth:1900}},
    get innerWidth(){return world.innerWidth},
    get scrollY(){return world.scrollY},
    Math,Number,Array,
  };
  vm.createContext(sandbox);
  vm.runInContext(grab('function updateTimerDocking'),sandbox);
  world.scrollY=startScroll;
  let last=world.el._docked,flips=0;
  // Each scroll event: run the handler, then apply the page-height consequence
  // of docking (the browser clamps scrollY when the document shrinks).
  for(let i=0;i<200;i++){
    vm.runInContext('updateTimerDocking()',sandbox);
    if(world.el._docked!==last){flips++;last=world.el._docked}
    const maxScroll=world.el._docked?startScroll-PANEL_H:startScroll;
    world.scrollY=Math.min(world.scrollY,maxScroll);
  }
  return flips;
}

// Just past the threshold is where docking shortens the page enough to undock.
for(const start of [MARK+10,MARK+40,MARK+120,MARK+PANEL_H]){
  const flips=run(start);
  console.log(`scrollY ${String(start).padStart(5)} -> ${flips} state change${flips===1?'':'s'} over 200 scroll events ${flips<=1?'(settles)':'*** OSCILLATES ***'}`);
}
console.log('\nPASS:',[MARK+10,MARK+40,MARK+120,MARK+PANEL_H].every(s=>run(s)<=1));

