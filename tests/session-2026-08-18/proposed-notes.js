// Draft only. Validates the proposed entries against the live file without
// writing to it, so the ordering and ids can be checked before anything ships.
const fs=require('fs');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';
const live=JSON.parse(fs.readFileSync(ROOT+'data/patch-notes.json','utf8'));

// Sits ABOVE the Chopper entry (work done after Chopper went in).
const afterChopper=[
{
  "id": "2026-08-04-droidex-companions-builds",
  "date": "2026-08-04",
  "title": "Droidex tracking, Companion picks and Build completion",
  "summary": "The Droidex fills itself as you play, Optimise keeps your Companion slots stocked, and Build slots have to be marked complete.",
  "changes": [
    "Adding a droid records it in your Droidex, and upgrading records every quality it passes through, so Standard to Beskar fills Gold, Diamond and Rainbow too.",
    "Optimise can keep droids that would complete Droidex entries instead of selling them, and now tells you whether a droid is being kept for Rebirth, the Droidex or as a Companion.",
    "Optimise keeps your Companion slots filled with the boosts you choose: highest pickaxe level, craft speed or max health. Pick one and both slots use it, pick two and you get one of each.",
    "You can nominate preferred Iconic companions. Optimise slots them in if you own them, or tells you to go and buy them if you do not.",
    "Build slots show red until you press Complete. Unfinished builds stay out of the Droidex and Optimise will not try to move them. There is an auto complete option if you would rather skip the step."
  ],
  "showOnStartup": true
},
{
  "id": "2026-08-04-worker-attributes",
  "date": "2026-08-04",
  "title": "Worker crafting speeds",
  "summary": "Worker droids now show their real crafting speed instead of a general description.",
  "changes": [
    "Every Worker droid shows its exact Droid Crafting speed, from +0.2/sec for a Common Standard up to +2/sec for a Mythic Galactic."
  ],
  "showOnStartup": true
}];

// Sits BELOW the Chopper entry (work done before Chopper went in).
const beforeChopper=[
{
  "id": "2026-08-04-chip-sell-calculator",
  "date": "2026-08-04",
  "title": "Upgrade Chip sell values",
  "summary": "See what every droid is worth in Upgrade Chips and what your whole roster would fetch.",
  "changes": [
    "Every droid page shows what it sells for in Upgrade Chips. Standard quality and Iconics are worth nothing.",
    "A new Base panel totals what your roster would fetch, holding back the droids your next rebirth needs, including any you are still upgrading.",
    "Every total is also shown doubled for having BB-8 as your companion.",
    "It tells you how many chips you still need for the next rebirth and what is left owing once everything is sold."
  ],
  "showOnStartup": true
},
{
  "id": "2026-08-04-optimise-follow-up",
  "date": "2026-08-04",
  "title": "Optimise fixes and the classic plan",
  "summary": "Shorter plans, a button to go back to the old step order, and three Upgrade Chip slot fixes.",
  "changes": [
    "Droids now move straight between stations instead of being sent to the Lounge first, which makes most plans several steps shorter.",
    "Added a button to switch back to the original slot-by-slot plan if you prefer being told the exact slot to move into.",
    "The Upgrade Chip slot no longer gets emptied by selling the droid sitting in it.",
    "Optimise no longer sells a droid you are saving chips to upgrade for a rebirth."
  ],
  "showOnStartup": true
}];

const chopperAt=live.notes.findIndex(x=>x.id==='2026-08-04-chopper');
const merged=[...afterChopper,...live.notes.slice(0,chopperAt+1),...beforeChopper,...live.notes.slice(chopperAt+1)];

const ids=merged.map(x=>x.id);
console.log('entries: '+live.notes.length+' -> '+merged.length);
console.log('duplicate ids:',ids.length!==new Set(ids).size);
console.log('dates non-increasing:',merged.every((x,i)=>i===0||merged[i-1].date>=x.date));
console.log('every entry has the required fields:',merged.every(x=>x.id&&x.date&&x.title&&x.summary&&Array.isArray(x.changes)&&'showOnStartup' in x));
console.log('\norder as it will render:');
merged.slice(0,7).forEach((x,i)=>console.log(`  ${i+1}. ${x.date}  ${x.title}${x.id==='2026-08-04-chopper'?'   <-- existing':''}`));
fs.writeFileSync('proposed-notes.json',JSON.stringify([...afterChopper,...beforeChopper],null,2));
