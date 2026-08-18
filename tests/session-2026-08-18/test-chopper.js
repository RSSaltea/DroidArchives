// Checks Chopper is wired up: data shape matches the other Iconics, the image
// resolves through the manifest, income is 15%/s, and the passive surfaces.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const droids=JSON.parse(fs.readFileSync(ROOT+'data/droids.json','utf8'));
const manifest=JSON.parse(fs.readFileSync(ROOT+'data/image-manifest.json','utf8'));
const src=fs.readFileSync(ROOT+'app.js','utf8');
const grab=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};

const chopper=droids.find(d=>d.name==='CHOPPER');
console.log('found in droids.json:',Boolean(chopper));
console.log('rarity/type:',chopper.rarity,chopper.type);
console.log('has novaCrystalCost (should be false - event droid):','novaCrystalCost' in chopper);

// Shape must match the existing Iconics so nothing downstream special-cases it.
const bb8=droids.find(d=>d.name==='BB-8');
const shape=o=>JSON.stringify(Object.keys(o).sort());
console.log('variants match BB-8 shape:',shape(chopper.variants)===shape(bb8.variants));
console.log('special keys:',Object.keys(chopper.special).join(', '));

const sandbox={VARIANTS:['DEFAULT','GOLD','DIAMOND','RAINBOW','BESKAR','GALACTIC'],
  ATTRIBUTE:{WORKER:'Walk speed'},state:{images:manifest,droids}};
vm.createContext(sandbox);
vm.runInContext("const norm=s=>s.toUpperCase().replace(/[^A-Z0-9]/g,'');",sandbox);
vm.runInContext(grab('const isIconic=')+';',sandbox);
vm.runInContext(grab('const iconicIncome=')+';',sandbox);
vm.runInContext(grab('function imageFor'),sandbox);
vm.runInContext(grab('function droidAttribute'),sandbox);

const img=vm.runInContext("imageFor(state.droids.find(d=>d.name==='CHOPPER'),'DEFAULT')",sandbox);
console.log('\nimage resolves to:',img||'(NOTHING - would render text fallback)');
console.log('file exists on disk:',fs.existsSync(ROOT+img));

const isIco=vm.runInContext("isIconic(state.droids.find(d=>d.name==='CHOPPER'))",sandbox);
const inc=vm.runInContext("iconicIncome(state.droids.find(d=>d.name==='CHOPPER'))",sandbox);
const attr=vm.runInContext("droidAttribute(state.droids.find(d=>d.name==='CHOPPER'),'DEFAULT')",sandbox);
console.log('isIconic:',isIco,'| iconicIncome:',inc,'(15%/s =',inc*100+'%)');
console.log('attribute:',JSON.stringify(attr));

// Other Iconics must be untouched by the attribute change.
const others=droids.filter(d=>d.rarity==='ICONIC'&&d.name!=='CHOPPER');
const otherAttrs=others.map(d=>vm.runInContext(`droidAttribute(state.droids.find(x=>x.name===${JSON.stringify(d.name)}),'DEFAULT')`,sandbox));
console.log('other Iconics still N/A:',otherAttrs.every(a=>a==='N/A'),`(${others.length} checked)`);

// A normal droid's attribute must be unaffected.
const astro=droids.find(d=>d.type==='ASTROMECH'&&d.rarity==='EPIC');
console.log('sample Epic Astromech attribute:',vm.runInContext(`droidAttribute(state.droids.find(x=>x.name===${JSON.stringify(astro.name)}),'GOLD')`,sandbox));

console.log('\nPASS:',Boolean(chopper)&&isIco&&inc===0.15&&attr==='+50% Crit Chance & Damage'
  &&Boolean(img)&&fs.existsSync(ROOT+img)&&otherAttrs.every(a=>a==='N/A'));
