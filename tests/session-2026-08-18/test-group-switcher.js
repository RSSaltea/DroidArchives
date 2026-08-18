// Group profiles should sit in the ordinary profile switcher, grouped by group
// and labelled with whose they are, rather than needing a trip to Group Outlook.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log(`  ${c?'ok  ':'FAIL'} ${l}${c?'':'  '+x}`)};
const grab=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const line=k=>src.split(/\r?\n/).find(l=>l.trimStart().startsWith(k));

const sb={console,escapeAttr:x=>String(x),cloudConnected:()=>true,
  state:{sharedView:null,cloud:{user:{id:'me'},doc:{profiles:[]}},groups:{workspace:[
    {id:'g1',name:'Clan Alpha',profiles:[
      {ownerId:'u2',ownerName:'Alexx',profileId:'p9',profileName:'Main',canEdit:true},
      {ownerId:'u3',ownerName:'Sam',profileId:'p4',profileName:'Alt',canEdit:false}]},
    {id:'g2',name:'Testers',profiles:[
      {ownerId:'u4',ownerName:'Kim',profileId:'p7',profileName:'Grind',canEdit:true}]}]}},
  groupAvailableProfiles:g=>[...g.profiles.map(p=>({...p,isOwn:false})),
    {isOwn:true,ownerName:'You',profileName:'Mine',ownerId:'me',profileId:'p1'}]};
vm.createContext(sb);
vm.runInContext(line('const GROUP_PROFILE_PREFIX='),sb);
vm.runInContext(grab('function groupProfileOptions'),sb);
const html=()=>vm.runInContext('groupProfileOptions()',sb);

console.log('=== group profiles appear in the switcher ===');
ok('one optgroup per group, named after it',
  /<optgroup label="Clan Alpha">/.test(html())&&/<optgroup label="Testers">/.test(html()));
ok('each option says whose profile it is',/>Alexx · Main</.test(html()));
ok('read-only ones are marked',/Sam · Alt \(read only\)</.test(html()));
ok('editable ones are not cluttered with a label',/Alexx · Main<\/option>/.test(html()));
ok('your own profiles are not repeated inside the groups',!html().includes('You ·'));

console.log('\n=== the value carries everything needed to open it ===');
ok('prefixed so it cannot be mistaken for one of yours',html().includes('value="group:g1:u2:p9"'));
ok('and the prefix is a named constant',src.includes("const GROUP_PROFILE_PREFIX='group:'"));

console.log('\n=== which one you are viewing is shown as selected ===');
sb.state.sharedView={ownerId:'u3',profileId:'p4'};
ok("the group profile you are in is the selected option",/Sam · Alt[\s\S]{0,20}/.test(html())&&/value="group:g1:u3:p4" selected/.test(html()),html());
sb.state.sharedView=null;

console.log('\n=== nothing shown when there is nothing to show ===');
sb.cloudConnected=()=>false;
ok('signed out, no group options',html()==='');
sb.cloudConnected=()=>true;
sb.state.groups.workspace=[];
ok('no groups, no optgroups',html()==='');
sb.state.groups.workspace=[{id:'g3',name:'Empty',profiles:[]}];
ok('a group with only your own profiles is skipped entirely',html()==='');

console.log('\n=== wiring ===');
ok('one change handler serves both kinds',
  src.includes("if(!value.startsWith(GROUP_PROFILE_PREFIX))return switchCloudProfile(value)"));
ok('group values open the shared profile',src.includes('await openGroupProfile(groupId,'));
ok('ids are split off the front, so ids containing colons survive',
  src.includes("rest.indexOf(':')")&&src.includes("after.indexOf(':')"));
ok('a failure to open is reported rather than swallowed',src.includes('catch(error){toast(error.message);route()}'));
ok('your own profiles get their own labelled section once groups exist',
  src.includes('<optgroup label="Your profiles">'));

console.log(fails?`\n${fails} FAILURE(S)`:'\nPASS: true');
process.exit(fails?1:0);
