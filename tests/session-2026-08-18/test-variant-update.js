// Confirms the new-variant entry is the card the homepage picks, that the
// countdown lands on the time from the screenshot, and that the word "Event"
// never appears in what gets rendered.
const fs=require('fs'),vm=require('vm');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const src=fs.readFileSync(ROOT+'app.js','utf8');
const grab=k=>{const i=src.indexOf(k);if(i<0)throw new Error('missing '+k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const grabLine=k=>src.slice(src.indexOf(k)).split('\n')[0];

const index=JSON.parse(fs.readFileSync(ROOT+'data/events/index.json','utf8'));
const events=index.events.map(f=>JSON.parse(fs.readFileSync(ROOT+'data/events/'+f,'utf8')));
console.log('events loaded:',events.map(e=>e.id).join(', '));

const sandbox={console,state:{events}};
vm.createContext(sandbox);
vm.runInContext(grabLine('const eventRetentionMs='),sandbox);
vm.runInContext(grab('function eventOccurrence'),sandbox);
vm.runInContext(grab('function currentEvent'),sandbox);
vm.runInContext(grabLine('const shortDuration=')||'const shortDuration=ms=>String(ms);',sandbox);
vm.runInContext(grab('function eventStatus'),sandbox);

// The moment from the screenshot: 21:13 BST on 9 Aug 2026 = 20:13 UTC.
const shot=new Date('2026-08-09T20:13:00Z');
const picked=vm.runInContext(`currentEvent(new Date(${shot.getTime()}))`,sandbox);
console.log('\ncard shown at screenshot time:',picked&&picked.id);
console.log('  category (the eyebrow):',JSON.stringify(picked&&picked.category));
console.log('  name:',JSON.stringify(picked&&picked.name));

const ms=picked.start-shot.getTime();
const d=Math.floor(ms/86400000),h=Math.floor(ms/3600000)%24,m=Math.floor(ms/60000)%60;
console.log(`\ncountdown at that moment: ${String(d).padStart(2,'0')}:${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} (screenshot showed 05:23:46)`);

const status=vm.runInContext(`eventStatus(currentEvent(new Date(${shot.getTime()})),new Date(${shot.getTime()}))`,sandbox);
console.log('status label:',status&&status.label,'| state:',status&&status.state);

// Reproduce the markup fragment the shell builds for the card.
const e=picked;
const markup=`<div class="event-art">${e.image?`<img src="${e.image}">`:''}</div><div><p class="eyebrow">${e.category||'Event'}</p><h2>${e.name}</h2><p>${e.description||''}</p>`;
console.log('\nrendered text:');
console.log('  eyebrow:',e.category||'Event');
console.log('  heading:',e.name);
console.log('  body:',e.description);
console.log('\ncontains the word "event":',/event/i.test(markup.replace(/class="[^"]*"/g,'')));
console.log('mentions D-O:',/D-O/.test(e.description));
console.log('handles missing image:',!e.image&&markup.includes('<div class="event-art"></div>'));
