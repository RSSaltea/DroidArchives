const fs=require('fs');
const P='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js';
let s=fs.readFileSync(P,'utf8');

// 1. Compact pill row for the three boosts instead of three wrapping checkboxes.
const boostsFrom='<label class="side-field">Companion boosts';
const boostsTo='</small></label><label class="side-field">Preferred companions';
const bi=s.indexOf(boostsFrom), bj=s.indexOf(boostsTo, bi);
if(bi<0||bj<0) throw new Error('boost block not found');
const newBoosts='<div class="side-field side-pillfield">Companion boosts<div class="side-pills">'
  +'${COMPANION_GOALS.map(g=>`<label class="side-pill"><input type="checkbox" data-companion-goal="${g.id}" ${companionGoals().includes(g.id)?\'checked\':\'\'}><span>${g.short}</span></label>`).join(\'\')}'
  +'</div><small class="flawless-bonus">A Companion slot is stocked for each boost picked.</small></div>';
s = s.slice(0,bi) + newBoosts + s.slice(bj + '</small></label>'.length);

// 2. Shorter listbox so it stops dominating the column.
s = s.replace('<select id="sidePreferredCompanions" multiple size="4">','<select id="sidePreferredCompanions" multiple size="3">');
s = s.replace('These take a Companion slot ahead of any boost. Ctrl-click to pick several.','Taken ahead of any boost. Ctrl-click for several.');

// 3. Collapse the whole Optimise block behind a disclosure so the sidebar is
//    short by default; the controls are all still one click away.
const start = s.indexOf('<div class="side-field side-pillfield">Companion boosts');
const end = s.indexOf('<button class="btn danger super-rebirth-button"', start);
if(start<0||end<0) throw new Error('group bounds not found');
const block = s.slice(start,end);
const wrapped = '<details class="side-group" ${optimiseSettingsOpen()?\'open\':\'\'}><summary>Optimise settings<em>${optimiseSettingsSummary()}</em></summary><div class="side-group-body">'
  + block + '</div></details>';
s = s.slice(0,start) + wrapped + s.slice(end);

// 4. Remember whether the group was open, and summarise it when closed.
const helper = `const optimiseSettingsOpen=()=>localStorage.getItem('droid-archive-optimise-settings-open')==='1';
const optimiseSettingsSummary=()=>{const boosts=companionGoals().length,preferred=preferredCompanions().length;return \`\${boosts} boost\${boosts===1?'':'s'}\${preferred?\` · \${preferred} preferred\`:''}\`};
`;
s = s.replace('function renderBaseSidebar(', helper + 'function renderBaseSidebar(');

// 5. Persist the open/closed state.
const hook = "host.querySelectorAll('[data-companion-goal]')";
s = s.replace(hook, "host.querySelector('details.side-group')?.addEventListener('toggle',e=>localStorage.setItem('droid-archive-optimise-settings-open',e.target.open?'1':'0'));"+hook);

fs.writeFileSync(P,s);
console.log('done');
