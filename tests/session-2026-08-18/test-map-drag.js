// The map markers must expose the same drag contract the list view's cards do,
// or dragging on the map will pick up nothing or drop onto the wrong slot.
const fs=require('fs');
const src=fs.readFileSync('c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js','utf8');
const grab=k=>{const i=src.indexOf(k);let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0){j++;break}}}return src.slice(i,j)};
const dragFn=grab('function attachSlotDragAndDrop'),mapFn=grab('function baseMapHtml');

const checks=[
  ['drag sources include map pins',      /querySelectorAll\('\.base-slot\.occupied\[draggable="true"\],\.map-pin\.filled\[draggable="true"\]'\)/.test(dragFn)],
  ['drop targets include map pins',      /querySelectorAll\('\.base-slot\[data-slot-index\],\.map-pin\[data-slot-station\]'\)/.test(dragFn)],
  ['highlights cleared on map pins too', /querySelectorAll\('\.base-slot,\.map-pin'\)/.test(dragFn)],
  // The handler reads station from data-slot-station and index from
  // data-slot-index, so every pin that can be dropped on needs both.
  ['filled pins carry station+index',    /class="map-pin filled[^"]*"[^>]*data-slot-station="\$\{station\}" data-slot-index="\$\{index\}"/.test(mapFn)],
  ['empty pins carry station+index',     /class="map-pin" style="\$\{pos\}" data-slot-station="\$\{station\}" data-slot-index="\$\{index\}"/.test(mapFn)],
  ['filled pins carry source+unit',      /draggable="true" data-source="\$\{occupant\.source\}" data-unit="\$\{occupant\.unit\}"/.test(mapFn)],
  ['portrait link opts out of dragging', /<a class="map-pin-face" draggable="false"/.test(mapFn)],
  ['unfinished builds are not draggable',/\$\{building\?'':drag\}/.test(mapFn)],
  ['drag respects the master switch',    /DRAG_AND_DROP_ENABLED\?" draggable|DRAG_AND_DROP_ENABLED\?` draggable/.test(mapFn)],
  // Locked and blueprint pins must not accept a droid.
  ['locked pins are not drop targets',   !/class="map-pin" style="\$\{pos\}"><span class="map-pin-face locked[\s\S]{0,80}data-slot-station/.test(mapFn)],
  ['blueprint pins are not drop targets',!/BLUEPRINT[\s\S]{0,400}?data-slot-station/.test(mapFn.slice(mapFn.indexOf("BLUEPRINT_STORAGE'"),mapFn.indexOf('const occupant')))],
];
let ok=true;
for(const [name,pass] of checks){if(!pass)ok=false;console.log(`  ${pass?'ok  ':'FAIL'} ${name}`)}

// Map toggle presentation.
console.log('\n  '+(/>Hide Map<|Hide Map'/.test(src)&&/Show Map/.test(src)?'ok  ':'FAIL ')+'button reads "Map" with a capital M');
console.log('  '+(/map:'M9 4 3 6\.5/.test(src)?'ok  ':'FAIL ')+'commandIcon has a map glyph');
console.log('  '+(/includes\('map'\)\)return'map'/.test(src)?'ok  ':'FAIL ')+'modernButtonIcon matches Map instead of falling back to detail');
console.log('  '+(!/id="toggleBaseMap"><svg/.test(src)?'ok  ':'FAIL ')+'toggle carries no second inline icon');
if(!/Show Map/.test(src)||!/map:'M9 4 3 6\.5/.test(src)||!/includes\('map'\)\)return'map'/.test(src)||/id="toggleBaseMap"><svg/.test(src))ok=false;

console.log('\nPASS:',ok);

