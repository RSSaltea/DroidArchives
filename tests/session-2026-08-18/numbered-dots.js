// Pulls the marker dots out of the numbered maps and matches each one to the
// slot already recorded in MAP_SPOTS, so the colour->station mapping is read off
// the artwork rather than guessed from the label text.
const fs=require('fs'),zlib=require('zlib');
const ROOT='c:/Users/admin/OneDrive/Desktop/Droid Tycoon Helper/';

function decodePNG(file){
  const buf=fs.readFileSync(file);
  let pos=8,width=0,height=0,depth=0,colorType=0;const idat=[];
  while(pos<buf.length){
    const len=buf.readUInt32BE(pos),type=buf.toString('ascii',pos+4,pos+8),data=buf.subarray(pos+8,pos+8+len);
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);depth=data[8];colorType=data[9]}
    else if(type==='IDAT')idat.push(data);
    else if(type==='IEND')break;
    pos+=12+len;
  }
  const channels={0:1,2:3,4:2,6:4}[colorType];
  const raw=zlib.inflateSync(Buffer.concat(idat));
  const stride=width*channels,out=Buffer.alloc(height*stride);
  let p=0;
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

// Saturated marker colours only - the base art is blue-grey/white line work.
const classify=(r,g,b)=>{
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
  if(mx<60&&g<60&&b<60&&r<60)return'black';
  if(mx-mn<70)return null;
  if(r>170&&g<90&&b<90)return'red';
  if(r>150&&g>90&&g<190&&b<80)return'orange';
  if(r>170&&g>170&&b<110)return'yellow';
  if(g>130&&r<140&&b<140)return'green';
  if(b>150&&r>90&&r<190&&g<110)return'purple';
  if(b>160&&r<110&&g<130)return'blue';
  return null;
};

function dots(file){
  const img=decodePNG(file),{width,height,channels,data}=img;
  const seen=new Uint8Array(width*height),clusters=[];
  const at=(x,y)=>{const o=(y*width+x)*channels;return classify(data[o],data[o+1],data[o+2])};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const idx=y*width+x;if(seen[idx])continue;
    const col=at(x,y);if(!col){seen[idx]=1;continue}
    const stack=[[x,y]],px=[];seen[idx]=1;
    while(stack.length){
      const[cx,cy]=stack.pop();px.push([cx,cy]);
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;
        const ni=ny*width+nx;if(seen[ni])continue;
        if(at(nx,ny)!==col)continue;
        seen[ni]=1;stack.push([nx,ny]);
      }
    }
    if(px.length<90)continue;  // drop antialiasing specks and thin label glyphs
    const sx=px.reduce((a,p)=>a+p[0],0)/px.length,sy=px.reduce((a,p)=>a+p[1],0)/px.length;
    const xs=px.map(p=>p[0]),ys=px.map(p=>p[1]);
    const w=Math.max(...xs)-Math.min(...xs)+1,h=Math.max(...ys)-Math.min(...ys)+1;
    if(w>40||h>40||w/h>2.2||h/w>2.2)continue;  // dots are small and round
    clusters.push({colour:col,x:+(sx/width*100).toFixed(2),y:+(sy/height*100).toFixed(2),n:px.length});
  }
  return clusters;
}

// MAP_SPOTS as it stands, to match dots back to known slots.
const app=fs.readFileSync(ROOT+'app.js','utf8');
const start=app.indexOf('const MAP_SPOTS=');
const end=app.indexOf('\n};',start)+3;
const MAP_SPOTS=eval('('+app.slice(start+'const MAP_SPOTS='.length,end).replace(/;\s*$/,'')+')');

for(const floor of['downstairs','upstairs']){
  const file=ROOT+`assets/map/map numbered ${floor}.png`;
  if(!fs.existsSync(file)){console.log(`\n### ${floor}: no file`);continue}
  const found=dots(file);
  console.log(`\n### ${floor} — ${found.length} dots`);
  const byColour={};
  for(const d of found)(byColour[d.colour]||(byColour[d.colour]=[])).push(d);
  for(const[col,list]of Object.entries(byColour)){
    // Which MAP_SPOTS group do these sit on top of?
    const votes={};
    for(const d of list){
      let best=null;
      for(const[key,pts]of Object.entries(MAP_SPOTS[floor]||{}))
        for(const[px,py]of pts){
          const dist=Math.hypot(px-d.x,py-d.y);
          if(!best||dist<best.dist)best={key,dist};
        }
      if(best&&best.dist<4)votes[best.key]=(votes[best.key]||0)+1;
    }
    const guess=Object.entries(votes).sort((a,b)=>b[1]-a[1]);
    console.log(`  ${col.padEnd(7)} x${String(list.length).padStart(2)}  -> ${guess.map(([k,v])=>`${k}(${v})`).join(', ')||'no MAP_SPOTS match'}`);
    list.sort((a,b)=>a.y-b.y||a.x-b.x).forEach(d=>console.log(`        [${d.x},${d.y}]`));
  }
}
console.log('\nMAP_SPOTS group sizes:');
for(const floor of['downstairs','upstairs'])
  for(const[k,v]of Object.entries(MAP_SPOTS[floor]||{}))console.log(`  ${floor}.${k}: ${v.length}`);
