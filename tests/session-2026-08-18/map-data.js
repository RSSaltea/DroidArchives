// The real MAP_SPOTS out of app.js, so tests measure against the actual layout.
const fs=require('fs');
const src=fs.readFileSync('c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/app.js','utf8');
const i=src.indexOf('const MAP_SPOTS=');
const body=src.slice(i+'const MAP_SPOTS='.length, src.indexOf('\n};',i)+3).replace(/;\s*$/,'');
module.exports={MAP_FLOORS:['downstairs','upstairs'],MAP_SPOTS:eval('('+body+')')};
