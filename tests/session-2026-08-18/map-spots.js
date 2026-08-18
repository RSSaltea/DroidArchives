// Final extraction: match the exact flat colours the markers are drawn in, group
// touching pixels, and emit centres as percentages so the overlay scales.
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

// Colours read straight off the artwork.
const MARKERS=[
  {kind:'WORKER',    rgb:[20,224,5]},
  {kind:'ASTROMECH', rgb:[104,5,224]},
  {kind:'BATTLE',    rgb:[255,0,0]},
  {kind:'BUILD',     rgb:[0,21,255]},
  {kind:'BLUEPRINT', rgb:[157,164,157]},
  {kind:'LOUNGE',    rgb:[232,217,8]},
  {kind:'LOUNGE_NOVA', rgb:[232,156,5]},
  {kind:'LOUNGE_NOVA', rgb:[207,193,7]},
];
const TOL=18;
const match=(r,g,b)=>{
  for(const m of MARKERS)
    if(Math.abs(r-m.rgb[0])<=TOL&&Math.abs(g-m.rgb[1])<=TOL&&Math.abs(b-m.rgb[2])<=TOL)return m.kind;
  return null;
};

function spots(file){
  const {width,height,channels,data}=decodePNG(file);
  const seen=new Uint8Array(width*height),out=[];
  const at=(x,y)=>{const i=(y*width+x)*channels;return match(data[i],data[i+1],data[i+2])};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x;
    if(seen[i])continue;
    const kind=at(x,y);
    if(!kind){seen[i]=1;continue}
    const stack=[[x,y]];let sx=0,sy=0,n=0,minx=x,miny=y,maxx=x,maxy=y;seen[i]=1;
    while(stack.length){
      const [cx,cy]=stack.pop();sx+=cx;sy+=cy;n++;if(cx<minx)minx=cx;if(cx>maxx)maxx=cx;if(cy<miny)miny=cy;if(cy>maxy)maxy=cy;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=cx+dx,ny=cy+dy;
        if(nx<0||ny<0||nx>=width||ny>=height)continue;
        const j=ny*width+nx;
        if(seen[j])continue;
        if(at(nx,ny)!==kind)continue;
        seen[j]=1;stack.push([nx,ny]);
      }
    }
    if(n>=80)out.push({kind,n,x:+(sx/n/width*100).toFixed(2),y:+(sy/n/height*100).toFixed(2),box:[minx,miny,maxx,maxy]});
  }
  return{width,height,out};
}

const result={};
for(const [floor,file] of [['downstairs',process.argv[2]],['upstairs',process.argv[3]]]){
  const {out}=spots(file);
  const byKind={};
  for(const s of out)(byKind[s.kind]=byKind[s.kind]||[]).push(s);
  console.log(`\n=== ${floor} ===`);
  for(const kind of Object.keys(byKind).sort()){
    // Reading order: top to bottom, then left to right.
    const list=byKind[kind].sort((a,b)=>a.y-b.y||a.x-b.x);
    console.log(`${kind} (${list.length})  sizes ${list.map(s=>s.n).join(',')}`);
    console.log('  '+JSON.stringify(list.map(s=>[s.x,s.y])));
  }
  result[floor]=byKind;
}
fs.writeFileSync('map-spots.json',JSON.stringify(result,null,2));
console.log('\nwritten to map-spots.json');

