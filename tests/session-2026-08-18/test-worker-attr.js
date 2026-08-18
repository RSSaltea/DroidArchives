// Every Worker crafting value, transcribed from the supplied table, checked
// against the formula the code actually uses.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
const grab=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};

const TABLE={
  COMMON:   {DEFAULT:0.2,GOLD:0.4,DIAMOND:0.6,RAINBOW:0.8,BESKAR:1,  GALACTIC:1.2},
  RARE:     {DEFAULT:0.4,GOLD:0.6,DIAMOND:0.8,RAINBOW:1,  BESKAR:1.2,GALACTIC:1.4},
  EPIC:     {DEFAULT:0.6,GOLD:0.8,DIAMOND:1,  RAINBOW:1.2,BESKAR:1.4,GALACTIC:1.6},
  LEGENDARY:{DEFAULT:0.8,GOLD:1,  DIAMOND:1.2,RAINBOW:1.4,BESKAR:1.6,GALACTIC:1.8},
  MYTHIC:   {DEFAULT:1,  GOLD:1.2,DIAMOND:1.4,RAINBOW:1.6,BESKAR:1.8,GALACTIC:2},
};
const sandbox={VARIANTS:['DEFAULT','GOLD','DIAMOND','RAINBOW','BESKAR','GALACTIC']};
vm.createContext(sandbox);
vm.runInContext(grab('const isIconic=')+';',sandbox);
vm.runInContext(grab('function droidAttribute'),sandbox);
// Whole-line grab: brace counting breaks on the ${...} inside its template.
vm.runInContext(src.split(/\r?\n/).find(l=>l.startsWith('const droidGameplayAttribute=')),sandbox);

let fails=0;
for(const [rarity,row] of Object.entries(TABLE))for(const [variant,want] of Object.entries(row)){
  const got=vm.runInContext(`droidAttribute({name:'W',type:'WORKER',rarity:'${rarity}'},'${variant}')`,sandbox);
  const expect=`+${want}/sec Droid Crafting`;
  if(got!==expect){fails++;console.log(`  MISMATCH ${rarity} ${variant}: got ${JSON.stringify(got)} want ${JSON.stringify(expect)}`)}
}
console.log(`all 30 Worker values match the table: ${fails===0}`);
console.log('sample (Rare Standard, as in the ARG screenshot):',
  vm.runInContext("droidAttribute({name:'ARG',type:'WORKER',rarity:'RARE'},'DEFAULT')",sandbox));
console.log('no trailing .0 on whole numbers:',
  vm.runInContext("droidAttribute({name:'W',type:'WORKER',rarity:'MYTHIC'},'GALACTIC')",sandbox));

// Other types must be untouched.
console.log('\nAstromech Epic Gold: ',vm.runInContext("droidAttribute({name:'A',type:'ASTROMECH',rarity:'EPIC'},'GOLD')",sandbox));
console.log('Battle Legendary Beskar:',vm.runInContext("droidAttribute({name:'B',type:'BATTLE',rarity:'LEGENDARY'},'BESKAR')",sandbox));
console.log('Iconic with passive:  ',vm.runInContext("droidAttribute({name:'CHOPPER',rarity:'ICONIC',type:'ASTROMECH',special:{passive:'+50% Crit Chance & Damage'}},'DEFAULT')",sandbox));
console.log('Iconic without:       ',vm.runInContext("droidAttribute({name:'BB-8',rarity:'ICONIC',type:'ASTROMECH',special:{}},'DEFAULT')",sandbox));
console.log('unknown rarity:       ',vm.runInContext("droidAttribute({name:'X',type:'WORKER',rarity:'NOPE'},'DEFAULT')",sandbox));

// The prose line no longer special-cases Workers.
console.log('\nprose (Worker):',vm.runInContext("droidGameplayAttribute({name:'ARG',type:'WORKER',rarity:'RARE'},'DEFAULT')",sandbox));
console.log('prose (Battle):',vm.runInContext("droidGameplayAttribute({name:'B',type:'BATTLE',rarity:'EPIC'},'GOLD')",sandbox));

// Real roster sweep: no worker should come out as N/A or NaN.
const droids=JSON.parse(fs.readFileSync(ROOT+'data/droids.json','utf8'));
const workers=droids.filter(d=>d.type==='WORKER'&&d.rarity!=='ICONIC');
const bad=[];
for(const d of workers)for(const v of sandbox.VARIANTS){
  const got=vm.runInContext(`droidAttribute(${JSON.stringify(d)},'${v}')`,sandbox);
  if(/N\/A|NaN|undefined/.test(got))bad.push(`${d.name} ${v} -> ${got}`);
}
console.log(`\n${workers.length} real Worker droids x 6 qualities, bad results: ${bad.length}`);
bad.slice(0,5).forEach(x=>console.log('  '+x));
console.log('\nPASS:',fails===0&&bad.length===0);
