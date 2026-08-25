// Roster grouping, the fusion hint switch, and the Fusion Outlook now showing
// every droid rather than trailing off into "+2 more".
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.resolve(__dirname,'..','..')+'/';
const src=fs.readFileSync(ROOT+'app.js','utf8'),LINES=src.split(/\r?\n/);
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log('  '+(c?'ok  ':'FAIL')+' '+l+(c?'':'  -> '+x))};
const pick=k=>LINES.find(l=>l.trimStart().startsWith(k));
const grab=k=>{const i=src.indexOf(k);if(i<0)throw Error('missing '+k);let d=0,j=src.indexOf('{',i),st=false;
  for(;j<src.length;j++){if(src[j]==='{'){d++;st=true}else if(src[j]==='}'){d--;if(st&&d===0){j++;break}}}return src.slice(i,j)};

console.log('=== one roster card per droid and quality ===');
{
  const start=LINES.findIndex(l=>l.includes('const rosterGroups=[];'));
  const block=LINES.slice(start,start+3).join('\n');
  const sb={state:{owned:[
    {name:'MO-TRAK',variant:'BESKAR',qty:1},
    {name:'MO-TRAK',variant:'GALACTIC',qty:1},
    {name:'R6',variant:'GALACTIC',qty:1},
    {name:'R6',variant:'GALACTIC',qty:1,preferred:'WORKER',preferredSlot:3},
    {name:'R6',variant:'GALACTIC',qty:2,preferred:'BUILD'},
    {name:'BB-8',variant:'DEFAULT',qty:1}]}};
  vm.createContext(sb);
  const groups=vm.runInContext(block+'; rosterGroups',sb);
  ok('six stored rows collapse to four cards',groups.length===4,'got '+groups.length);
  const r6=groups.find(g=>g.name==='R6');
  ok('three R6 rows read as a single x4',r6.qty===4,'x'+r6.qty);
  ok('and removing from it targets the newest of those rows',r6.last===4,'row '+r6.last);
  ok('two qualities of one droid stay apart',groups.filter(g=>g.name==='MO-TRAK').length===2);
  ok('the total still adds up',groups.reduce((s,g)=>s+g.qty,0)===7);
}

console.log('');
console.log('=== the fusion hint in the droid picker can be switched off ===');
{
  let store={};
  const sb={localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v}}};
  vm.createContext(sb);
  for(const k of ['const escapeAttr=','const fusionRecipes=','const fusionDroid=','const fusionOwnedCount=']) vm.runInContext(pick(k),sb);
  for(const k of ['function fusionNeed(','const fusionHintsEnabled=','function fusionUsesHtml(']) vm.runInContext(grab(k),sb);
  sb.state={fusion:JSON.parse(fs.readFileSync(ROOT+'data/fusion.json','utf8')),
    droids:JSON.parse(fs.readFileSync(ROOT+'data/droids.json','utf8')),owned:[{name:'ARG',variant:'DEFAULT',qty:1}]};
  const html=n=>vm.runInContext('fusionUsesHtml('+JSON.stringify(n)+')',sb);
  ok('on by default',html('ARG').includes('fusion-uses'));
  ok('it names what the droid fuses into',html('MOUSE').includes('WHL-EX'));
  ok('a droid that fuses into nothing stays blank',html('CB-23')==='');
  store['droid-archive-picker-fusion-hints']='0';
  ok('switched off it renders nothing at all',html('ARG')===''&&html('MOUSE')==='');
  store['droid-archive-picker-fusion-hints']='1';
  ok('and comes back when switched on',html('ARG').includes('fusion-uses'));
}

console.log('');
console.log('=== the Outlook lists every droid, and expands ===');
{
  const outlook=grab('function fusionOutlookHtml(');
  ok('the rarity row no longer truncates',!outlook.includes('names.slice(0,6)'),'still slicing');
  ok('the roll route no longer truncates',!outlook.includes('pool.slice(0,5)'),'still slicing');
  ok('and nothing in it says "+N more"',!/\+\$\{[^}]*\} more/.test(outlook));
  const sb={};vm.createContext(sb);
  vm.runInContext('const VARIANTS='+JSON.stringify(['DEFAULT','GOLD','DIAMOND','RAINBOW','BESKAR','GALACTIC','STELLAR'])+';',sb);
  for(const k of ['const escapeAttr=','const norm=','const variantStep=','const variantLabel=','const variantText=','const fusionDroid=']) vm.runInContext(pick(k),sb);
  for(const k of ['function fusionStock(','function imageFor(','function picture(','function fusionPoolDetailHtml(']) vm.runInContext(grab(k),sb);
  vm.runInContext('function requirementLocations(){return new Map([["B2 HEAVY:DIAMOND","Battle 2"],["R6:DIAMOND","Worker 5"]])}',sb);
  sb.state={images:JSON.parse(fs.readFileSync(ROOT+'data/image-manifest.json','utf8')),
    droids:JSON.parse(fs.readFileSync(ROOT+'data/droids.json','utf8')),
    owned:[{name:'B2 HEAVY',variant:'DIAMOND',qty:1},{name:'GUNRUNNER',variant:'RAINBOW',qty:2},
           {name:'HAUL-R',variant:'DIAMOND',qty:1},{name:'R6',variant:'DIAMOND',qty:1}]};
  const panel=vm.runInContext("fusionPoolDetailHtml(['B2 HEAVY','GUNRUNNER','HAUL-R','R6'],'DIAMOND')",sb);
  ok('the panel is a disclosure, closed until asked',panel.startsWith('<details')&&!panel.includes(' open'));
  ok('it holds a card per droid',(panel.match(/fusion-pool-card/g)||[]).length===4);
  ok('each card carries a portrait',(panel.match(/<img/g)||[]).length===4);
  ok('a placed droid says where it stands',panel.includes('Battle 2')&&panel.includes('Worker 5'));
  ok('an unplaced one says so',panel.includes('Not placed'));
  ok('a quality above the floor is shown as held',panel.includes('Rainbow'),'Gunrunner holds Rainbow, above the Diamond floor');
  ok('and a duplicate is counted',panel.includes('&times;2'));
  ok('an empty pool renders nothing',vm.runInContext("fusionPoolDetailHtml([],'DIAMOND')",sb)==='');
}

console.log('');
console.log(fails?fails+' failed':'all passed');
process.exit(fails?1:0);
