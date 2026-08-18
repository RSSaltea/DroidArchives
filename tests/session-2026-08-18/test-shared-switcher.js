// The shared-profile panel had no profile picker, so moving from one group
// profile to another meant returning to your own profiles first. Renders both
// panels for real and checks the picker is in each.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8'),css=fs.readFileSync(ROOT+'styles.css','utf8');
let fails=0;const ok=(l,c,x='')=>{if(!c)fails++;console.log(`  ${c?'ok  ':'FAIL'} ${l}${c?'':'  '+x}`)};
const grab=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const line=k=>src.split(/\r?\n/).find(l=>l.trimStart().startsWith(k));

const sb={console,escapeAttr:x=>String(x),cloudConnected:()=>true,supabaseReady:()=>true,
  activeProfileDoc:()=>sb.state.cloud.doc,activeProfile:()=>({name:'Mine'}),
  state:{sharedView:null,
    cloud:{user:{id:'me'},activeProfileId:'p1',status:'Synced',enabled:true,reconnecting:false,
      doc:{profiles:[{id:'p1',name:'Mine'},{id:'p2',name:'Second'}]}},
    groups:{workspace:[
      {id:'g1',name:'Clan Alpha',profiles:[
        {ownerId:'u2',ownerName:'Alexx',profileId:'p9',profileName:'Main',canEdit:true},
        {ownerId:'u3',ownerName:'Sam',profileId:'p4',profileName:'Alt',canEdit:false}]}]}},
  groupAvailableProfiles:g=>g.profiles.map(p=>({...p,isOwn:false}))};
vm.createContext(sb);
vm.runInContext(line('const GROUP_PROFILE_PREFIX='),sb);
vm.runInContext(grab('function groupProfileOptions'),sb);
vm.runInContext(grab('function profileSelectHtml'),sb);
vm.runInContext(grab('function cloudSidebarHtml'),sb);
const panel=()=>vm.runInContext('cloudSidebarHtml()',sb);
const openShared=(ownerId,ownerName,profileId,profileName,canEdit)=>{
  sb.state.sharedView={ownerId,ownerName,profileId,profileName,canEdit,saving:false};
};

console.log('=== one picker, built once and used by both panels ===');
ok('profileSelectHtml exists',src.includes('function profileSelectHtml(){'));
ok('the ordinary panel calls it rather than inlining its own',
  src.includes('${profileSelectHtml()}<small class="cloud-status">')||src.includes('${profileSelectHtml()}'),'not wired');
ok('the old inline copy is gone',!src.includes("const mine=profiles.map(p=>`<option value=\"${p.id}\" ${p.id===state.cloud.activeProfileId?'selected':''}"));

console.log('\n=== your own panel is unchanged ===');
{
  const html=panel();
  ok('has the picker',html.includes('<select id="cloudProfileSelect">'));
  ok('lists your profiles',html.includes('>Mine</option>')&&html.includes('>Second</option>'));
  ok('marks the active one',html.includes('<option value="p1" selected>'));
  ok('and still groups the shared ones separately',
    html.includes('<optgroup label="Your profiles">')&&html.includes('<optgroup label="Clan Alpha">'));
}

console.log('\n=== the shared panel now has the picker too ===');
{
  openShared('u2','Alexx','p9','Main',true);
  const html=panel();
  ok('it is the shared panel',html.includes('shared-cloud-panel')&&html.includes('Shared profile'));
  ok('the picker is there',html.includes('<select id="cloudProfileSelect">'),html.slice(0,200));
  ok('the profile you are in is the selected option',html.includes('value="group:g1:u2:p9" selected'));
  ok('the other group profile is offered',html.includes('value="group:g1:u3:p4"'));
  ok('and so are your own, to get back',html.includes('>Mine</option>'));
  ok('none of yours is marked selected while somebody else\'s base is on screen',
    !/<option value="p[12]" selected>/.test(html),html.match(/<option value="p[12]" selected>[^<]*/)?.[0]||'');
  ok('exactly one option is selected',(html.match(/ selected>/g)||[]).length===1,
    String((html.match(/ selected>/g)||[]).length));
  ok('the way out is still there',html.includes('data-shared-exit'));
}

console.log('\n=== a read-only shared profile can still be left by the picker ===');
{
  openShared('u3','Sam','p4','Alt',false);
  const html=panel();
  ok('read only is stated',html.includes('Read only'));
  ok('the picker is offered anyway',html.includes('<select id="cloudProfileSelect">'));
  ok('and no Save button is',!html.includes('cloudSyncNow'));
}
// decorateSharedView greys out the sidebar on a read-only profile. The picker has
// to survive that, or the control you need in order to leave is the one disabled.
ok('the picker is exempt from the read-only greying',
  src.includes("#baseSidebarControls select:not(#cloudProfileSelect)"),'still disabled');
ok('and so is the exit button, as before',
  src.includes("#baseSidebarControls button:not([data-shared-exit])"));

console.log('\n=== switching straight from one shared profile to another ===');
// The change handler already routed group values to openGroupProfile, and both
// entry points stand down from the shared view they find, so the picker only had
// to exist for this to work.
ok('the handler still routes group values to openGroupProfile',
  src.includes('await openGroupProfile(groupId,after.slice(0,cut2),after.slice(cut2+1))'));
ok('openGroupProfile leaves the shared profile it finds first',
  /if\(state\.sharedView\)await exitSharedProfile\(false\)/.test(src));
ok('switchCloudProfile does the same for your own',
  /function switchCloudProfile\(id\)\{if\(state\.sharedView\)\{exitSharedProfile\(false\)/.test(src));
// Nothing is logged on a group profile at all, and the plan-local recordings are
// keyed by profile, so hopping in and out costs you nothing you had recorded.
ok('and your own recordings survive the hop',
  !/async function openGroupProfile\(groupId,ownerId,profileId\)\{slotLogSession\.clear\(\)/.test(src));

console.log('\n=== the header dropdown gets it for free ===');
ok('the header renders the same panel',src.includes("cloudSidebarHtml().replace('<div class=\"side-rule\"></div>','')"));
ok('and attaches the same handlers',src.includes('attachCloudSidebarHandlers(host)'));

console.log('\n=== styled ===');
ok('the shared panel and the side field both have rules',
  css.includes('.shared-cloud-panel')&&css.includes('.side-field'));

console.log(fails?`\n${fails} FAILED`:'\nall passed');
process.exit(fails?1:0);
