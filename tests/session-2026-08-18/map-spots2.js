// Extracts every marker centre from the map art. Markers are flat fills, so an
// exact-colour match isolates them from the gradiated map behind. Overlapping
// markers merge into one blob, so anything much larger than a single marker is
// split along its long axis into however many it is worth.
const fs=require('fs'),zlib=require('zlib');
function decodePNG(file){
  const buf=fs.readFileSync(file);let pos=8,width=0,height=0,colorType=0;const idat=[];
  while(pos<buf.length){
    const len=buf.readUInt32BE(pos),type=buf.toString('ascii',pos+4,pos+8),data=buf.subarray(pos+8,pos+8+len);
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);colorType=data[9]}
    else if(type==='IDAT')idat.push(data);else if(type==='IEND')break;
    pos+=12+len;
  }
  const channels={0:1,2:3,4:2,6:4}[colorType];
  const raw=zlib.inflateSync(Buffer.concat(idat));
  const stride=width*channels,out=Buffer.alloc(height*stride);let p=0;
  for(let y=0;y<height;y++){
    const filter=raw[p++],line=raw.subarray(p,p+stride);p+=stride;
    const cur=out.subarray(y*stride,(y+1)*stride),prev=y?out.subarray((y-1)*stride,y*stride):null;
    for(let x=0;x<stride;x++){
      const a=x>=channels?cur[x-channels]:0,b=prev?prev[x]:0,c=x>=channels&&prev?prev[x-channels]:0;
      let v=line[x];
      if(filter===1)v+=a;else if(filter===2)v+=b;else if(filter===3)v+=(a+b)>>1;
      else if(filter===4){const pa=Math.abs(b-c),pb=Math.abs(a-c),pc=Math.abs(a+b-2*c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c}
      cur[x]=v&255;
    }
  }
  return{width,height,channels,data:out};
}

const MARKERS=[
  {kind:'WORKER',      rgb:[20,224,5],   tol:18},
  {kind:'ASTROMECH',   rgb:[104,5,224],  tol:18},
  {kind:'BATTLE',      rgb:[255,0,0],    tol:18},
  {kind:'BUILD',       rgb:[0,21,255],   tol:18},
  {kind:'BLUEPRINT',   rgb:[157,164,157],tol:18},
  {kind:'LOUNGE',      rgb:[232,217,8],  tol:18},
  {kind:'LOUNGE_NOVA', rgb:[232,156,5],  tol:18},
  {kind:'LOUNGE_NOVA', rgb:[207,193,7],  tol:18},
  // The map's own dark corners sit around rgb(55,65,75), so the chip marker
  // needs a tight window to avoid swallowing the background.
  {kind:'UPGRADE_CHIP',rgb:[0,0,0],      tol:26},
];
const match=(r,g,b)=>{
  for(const m of MARKERS)
    if(Math.abs(r-m.rgb[0])<=m.tol&&Math.abs(g-m.rgb[1])<=m.tol&&Math.abs(b-m.rgb[2])<=m.tol)return m.kind;
  return null;
};
const TYPICAL=305;

// Split a merged blob into `parts` by ordering its pixels along the axis it is
// longest in and cutting into equal shares.
function split(px,parts){
  const xs=px.map(p=>p[0]),ys=px.map(p=>p[1]);
  const spanX=Math.max(...xs)-Math.min(...xs),spanY=Math.max(...ys)-Math.min(...ys);
  const key=spanX>=spanY?0:1;
  px.sort((a,b)=>a[key]-b[key]);
  const out=[],per=Math.floor(px.length/parts);
  for(let i=0;i<parts;i++){
    const chunk=px.slice(i*per,i===parts-1?px.length:(i+1)*per);
    out.push([chunk.reduce((s,p)=>s+p[0],0)/chunk.length,chunk.reduce((s,p)=>s+p[1],0)/chunk.length]);
  }
  return out;
}

function spots(file){
  const {width,height,channels,data}=decodePNG(file);
  const seen=new Uint8Array(width*height),out=[];
  const at=(x,y)=>{const i=(y*width+x)*channels;return match(data[i],data[i+1],data[i+2])};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x;
    if(seen[i])continue;
    const kind=at(x,y);
    if(!kind){seen[i]=1;continue}
    const stack=[[x,y]],px=[];seen[i]=1;
    while(stack.length){
      const [cx,cy]=stack.pop();px.push([cx,cy]);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=cx+dx,ny=cy+dy;
        if(nx<0||ny<0||nx>=width||ny>=height)continue;
        const j=ny*width+nx;
        if(seen[j]||at(nx,ny)!==kind)continue;
        seen[j]=1;stack.push([nx,ny]);
      }
    }
    if(px.length<80)continue;
    const parts=Math.max(1,Math.round(px.length/TYPICAL));
    for(const [cx,cy] of split(px,parts))
      out.push({kind,n:Math.round(px.length/parts),x:+(cx/width*100).toFixed(2),y:+(cy/height*100).toFixed(2)});
  }
  return out;
}

const result={};
for(const [floor,file] of [['downstairs',process.argv[2]],['upstairs',process.argv[3]]]){
  const byKind={};
  for(const s of spots(file))(byKind[s.kind]=byKind[s.kind]||[]).push(s);
  console.log(`\n=== ${floor} ===`);
  for(const kind of Object.keys(byKind).sort()){
    const list=byKind[kind].sort((a,b)=>a.y-b.y||a.x-b.x);
    console.log(`${kind} (${list.length})`);
    console.log('  '+JSON.stringify(list.map(s=>[s.x,s.y])));
    byKind[kind]=list.map(s=>[s.x,s.y]);
  }
  result[floor]=byKind;
}
fs.writeFileSync('map-spots.json',JSON.stringify(result,null,2));
console.log('\nwritten to map-spots.json');
