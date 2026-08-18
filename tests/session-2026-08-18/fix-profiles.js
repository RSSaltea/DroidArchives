// Multi-profile. The log is deliberately one shared pool — how the game picks a
// slot is a property of the game, not of a save, so every profile's landings are
// evidence about the same question and pooling gets to a conclusion sooner.
// But each row has to say which profile it came from: profiles sit at different
// rebirths with different slots unlocked, and if one has a stale Base its rows
// need to be identifiable rather than quietly poisoning the scores.
const fs=require('fs');
const APP='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js';
let s=fs.readFileSync(APP,'utf8');
const NL='\r\n', J=a=>a.join(NL);
const sub=(from,to)=>{const n=s.split(from).length-1;if(n!==1){console.error('MATCHED '+n+'x:\n'+from.slice(0,170));process.exit(1)}s=s.split(from).join(to)};

sub("  rows.push({...row,at:new Date().toISOString(),rebirth:state.rebirth});",
J([ "  // Which save this came from. Profiles differ in rebirth and unlocked slots, so",
    "  // a row is only interpretable next to the profile that produced it.",
    "  const profile=activeProfile();",
    "  rows.push({...row,at:new Date().toISOString(),rebirth:state.rebirth,",
    "    profileId:profile?.id||'local',profile:profile?.name||'Local save'});"]));

// A plan belongs to the profile it was built from, so switching invalidates it.
sub("function applyProfileData(data){","function applyProfileData(data){slotLogSession.clear();");

// Say who contributed, so a profile pulling the numbers about can be spotted.
sub("    <p class=\"lab-why\">Leading: <strong>${best.name}</strong> at ${pct(best.hit,best.n)}%.",
J([ "    ${byProfile.length>1?`<p class=\"lab-why\">Across ${byProfile.length} profiles: ${byProfile.map(p=>`<strong>${p.name}</strong> ${p.n}`).join(', ')}. They are pooled on purpose — how the game picks a slot is the same question whatever save you are on — but if one of them has a Base that is out of date, its rows will drag the scores down, so check its share looks sane.</p>`:''}",
    "    <p class=\"lab-why\">Leading: <strong>${best.name}</strong> at ${pct(best.hit,best.n)}%."]));
sub("  const scores=slotLogScores(rows),stations=[...new Set(rows.map(r=>r.station))];",
J([ "  const scores=slotLogScores(rows),stations=[...new Set(rows.map(r=>r.station))];",
    "  const counts=new Map();",
    "  for(const row of rows){const key=row.profileId||'local';",
    "    counts.set(key,{name:row.profile||'Local save',n:(counts.get(key)?.n||0)+1})}",
    "  const byProfile=[...counts.values()].sort((a,b)=>b.n-a.n);"]));

fs.writeFileSync(APP,s,'utf8');
console.log('rows now carry their profile');
