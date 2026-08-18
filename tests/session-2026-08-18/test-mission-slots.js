// Astromech slots 1,3,5,7,9 are mission slots: R2-D2 first, then CB-23, then the
// other Astromech Iconics, then the highest tier owned.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log(`  ${c?'ok  ':'FAIL'} ${l}${c?'':'  '+x}`)};

console.log('=== the constant matches "slots 1, 3, 5, 7 and 9" ===');
const m=/const ASTROMECH_MISSION_SLOTS=(\[[^\]]*\])/.exec(src);
const idx=JSON.parse(m[1]);
ok('indices are 0,2,4,6,8',JSON.stringify(idx)==='[0,2,4,6,8]',JSON.stringify(idx));
ok('which the Base shows as 1,3,5,7,9',idx.map(i=>i+1).join(',')==='1,3,5,7,9');

console.log('\n=== the ranking function, run for real ===');
const line=k=>src.split(/\r?\n/).filter(l=>l.includes(k));
const sandbox={console,state:{droids:[
  {name:'R2-D2',type:'ASTROMECH',rarity:'ICONIC'},{name:'CB-23',type:'ASTROMECH',rarity:'ICONIC'},
  {name:'BB-8',type:'ASTROMECH',rarity:'ICONIC'},{name:'PLAIN',type:'ASTROMECH',rarity:'MYTHIC'},
  {name:'WEAK',type:'ASTROMECH',rarity:'COMMON'}]},
  isIconic:d=>d?.rarity==='ICONIC'};
vm.createContext(sandbox);
vm.runInContext(`const missionRank=`+/const missionRank=unit=>\{[\s\S]*?\};/.exec(src)[0].slice('const missionRank='.length),sandbox);
const rank=n=>vm.runInContext(`missionRank({name:${JSON.stringify(n)}})`,sandbox);
ok('R2-D2 outranks everything',rank('R2-D2')===0);
ok('CB-23 is next',rank('CB-23')===1);
ok('other Astromech Iconics follow',rank('BB-8')===2);
ok('ordinary Astromechs last',rank('PLAIN')===3&&rank('WEAK')===3);
ok('R2-D2 < CB-23 < BB-8 < PLAIN',rank('R2-D2')<rank('CB-23')&&rank('CB-23')<rank('BB-8')&&rank('BB-8')<rank('PLAIN'));

console.log('\n=== the pass is wired in where it has to be ===');
ok('runs after the Companion pass',src.indexOf('const missionPicks=')>src.indexOf('const companionPicks='));
ok('runs before the general/sell pass',src.indexOf('const missionPicks=')<src.indexOf('||missionPicks.has(key))continue'));
ok('mission picks are skipped by the general pass',/companionPicks\.has\(key\)\|\|missionPicks\.has\(key\)\)continue/.test(src));
ok('mission picks never reach the sell list',src.includes('||missionPicks.has(key))continue'));
ok('the preview explains why one is held',src.includes('missionKept.get(key)'));
ok('ties break on rarity then variant',/rarityRank\(db\)-rarityRank\(da\)\|\|VARIANTS\.indexOf\(b\.variant\)-VARIANTS\.indexOf\(a\.variant\)/.test(src));
ok('only Astromechs are considered',src.includes(`?.type==='ASTROMECH'}`));
ok('locked droids are left alone',/missionPicks[\s\S]{0,400}lockedKeys\.has\(key\)/.test(src));

console.log('\n=== shared by both plans ===');
ok('lives in optimisedPlacements, which classic and route both use',
  src.indexOf('const missionPicks=')>src.indexOf('function optimisedPlacements')&&
  src.indexOf('const missionPicks=')<src.indexOf('function optimiseStepPlan'));

console.log(fails?`\n${fails} FAILURE(S)`:'\nPASS: true');
process.exit(fails?1:0);
