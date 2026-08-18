// Group profiles belong in the profile switcher. Having to go to Groups, find the
// outlook and click View is three steps for something that is, to you, just
// another profile to look at.
const fs=require('fs');
const APP='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js';
let s=fs.readFileSync(APP,'utf8');
const NL='\r\n', J=a=>a.join(NL);
const sub=(from,to)=>{const n=s.split(from).length-1;if(n!==1){console.error('MATCHED '+n+'x:\n'+from.slice(0,170));process.exit(1)}s=s.split(from).join(to)};

// Everyone else's profiles, grouped by the group they are shared through. Your
// own are left out — they are already listed above, and showing them twice would
// make it look as though there were two of each.
sub("function cloudSidebarHtml(){",
J([ "// Group profiles rendered as <optgroup>s under your own, so switching to one is",
    "// the same gesture as switching to your own. Values are prefixed so the change",
    "// handler can tell the two apart.",
    "const GROUP_PROFILE_PREFIX='group:';",
    "function groupProfileOptions(){",
    "  if(!cloudConnected()||!state.groups.workspace.length)return'';",
    "  return state.groups.workspace.map(group=>{",
    "    const rows=groupAvailableProfiles(group).filter(item=>!item.isOwn);",
    "    if(!rows.length)return'';",
    "    const options=rows.map(item=>{",
    "      const value=`${GROUP_PROFILE_PREFIX}${group.id}:${item.ownerId}:${item.profileId}`;",
    "      const current=state.sharedView&&state.sharedView.profileId===item.profileId&&String(state.sharedView.ownerId)===String(item.ownerId);",
    "      return `<option value=\"${escapeAttr(value)}\" ${current?'selected':''}>${escapeAttr(item.ownerName)} · ${escapeAttr(item.profileName)}${item.canEdit?'':' (read only)'}</option>`;",
    "    }).join('');",
    "    return `<optgroup label=\"${escapeAttr(group.name||'Group')}\">${options}</optgroup>`;",
    "  }).join('');",
    "}",
    "function cloudSidebarHtml(){"]));

// Hang them off the same select.
sub("<label class=\"side-field\">Profile<select id=\"cloudProfileSelect\">${profiles.map(p=>`<option value=\"${p.id}\" ${p.id===state.cloud.activeProfileId?'selected':''}>${p.name}</option>`).join('')}</select></label>",
    "<label class=\"side-field\">Profile<select id=\"cloudProfileSelect\">${(()=>{const mine=profiles.map(p=>`<option value=\"${p.id}\" ${p.id===state.cloud.activeProfileId?'selected':''}>${p.name}</option>`).join(''),theirs=groupProfileOptions();return theirs?`<optgroup label=\"Your profiles\">${mine}</optgroup>${theirs}`:mine})()}</select></label>");

// One handler, two kinds of profile.
sub("root.querySelector('#cloudProfileSelect')?.addEventListener('change',e=>switchCloudProfile(e.target.value))",
J([ "root.querySelector('#cloudProfileSelect')?.addEventListener('change',async e=>{",
    "    const value=e.target.value;",
    "    if(!value.startsWith(GROUP_PROFILE_PREFIX))return switchCloudProfile(value);",
    "    // group:<groupId>:<ownerId>:<profileId> — ids can contain colons, so split",
    "    // off the first two and keep the remainder whole.",
    "    const rest=value.slice(GROUP_PROFILE_PREFIX.length),cut=rest.indexOf(':'),groupId=rest.slice(0,cut);",
    "    const after=rest.slice(cut+1),cut2=after.indexOf(':');",
    "    try{await openGroupProfile(groupId,after.slice(0,cut2),after.slice(cut2+1))}",
    "    catch(error){toast(error.message);route()}",
    "  })"]));

fs.writeFileSync(APP,s,'utf8');
console.log('group profiles added to the switcher');
