// The Keep button's tooltip must be plain text. unitName() returns markup, and
// putting it in a title attribute ended the attribute early, spilling the rest
// onto the page as the "RAINBOW AND WORK OUT THE PLAN AGAIN">KEEP" garbage.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8'),lines=src.split(/\r?\n/);
const grab=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const grabLine=k=>lines.find(l=>l.trimStart().startsWith(k));

let store={};
const sandbox={console,
  localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}},
  state:{droids:[{name:'R3',rarity:'EPIC',type:'ASTROMECH'}]},picture:()=>'<img>'};
vm.createContext(sandbox);
for(const k of ['const variantLabel=','const variantText=','const escapeAttr=','const plainUnitName=',
                'const readList=','const writeList=','const optimiseTickedSteps=','const stepTicked=',
                'const STEP_VERB_TONE=','const unitName='])
  vm.runInContext(grabLine(k),sandbox);
vm.runInContext(grab('function stepHtml'),sandbox);

const variantMarkup=vm.runInContext("variantText('RAINBOW')",sandbox);
console.log('variantText returns markup:',variantMarkup);

sandbox.step={type:'sell',
  text:'Sell R3 '+variantMarkup+' from Upgrade Chip.',
  unit:{name:'R3',variant:'RAINBOW',source:2,unit:0}};
const html=vm.runInContext('stepHtml(step)',sandbox);

const btn=(html.match(/<button class="step-skip"[\s\S]*?<\/button>/)||[])[0]||'';
// The skip button's own title, not the tick box's.
const title=(btn.match(/title="([^"]*)"/)||[])[1];
console.log('\nbutton title:',JSON.stringify(title));
console.log('  plain text, no tags:',!/[<>]/.test(title||''));
console.log('  not cut short at a quote:',/work out the plan again$/.test(title||''));

console.log('\nbutton markup:',btn);
console.log('  exactly one ">" before the label:',(btn.split('>').length-1)===2);
// The bug spilled the tail of the title into the page as text after the button.
console.log('  nothing leaked outside the button:',!/(and work out the plan again|rainbow)[^<]*">/i.test(html.replace(btn,'')));

// The displayed step text still keeps its colour markup - only the tooltip is stripped.
console.log('\nstep text keeps variant colour:',/variant-rainbow/.test(html));
console.log('verb still coloured:',/verb-sell/.test(html));

const pass=!/[<>]/.test(title||'')&&/work out the plan again$/.test(title||'')
  &&(btn.split('>').length-1)===2&&/variant-rainbow/.test(html)&&/verb-sell/.test(html);
console.log('\nPASS:',pass);
