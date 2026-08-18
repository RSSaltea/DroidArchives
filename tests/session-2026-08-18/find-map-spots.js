// Decodes the map PNGs and locates every coloured marker, so slot positions come
// from the artwork itself rather than being eyeballed. Prints centres as
// percentages of the image so the overlay scales with whatever size it renders.
const fs=require('fs'),zlib=require('zlib');

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
  if(depth!==8)throw new Error('unexpected bit depth '+depth);
  const channels={0:1,2:3,4:2,6:4}[colorType];
  if(!channels)throw new Error('unsupported colour type '+colorType);
  const raw=zlib.inflateSync(Buffer.concat(idat));
  const stride=width*channels,out=Buffer.alloc(height*stride);
  let p=0;
  for(let y=0;y<height;y++){
    const filter=raw[p++];
    const line=raw.subarray(p,p+stride);p+=stride;
    const cur=out.subarray(y*stride,(y+1)*stride),prev=y?out.subarray((y-1)*stride,y*stride):null;
    for(let x=0;x<stride;x++){
      const a=x>=channels?cur[x-channels]:0,b=prev?prev[x]:0,c=x>=channels&&prev?prev[x-channels]:0;
      let v=line[x];
      if(filter===1)v+=a; else if(filter===2)v+=b; else if(filter===3)v+=(a+b)>>1;
      else if(filter===4){const pa=Math.abs(b-c),pb=Math.abs(a-c),pc=Math.abs(a+b-2*c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c}
      cur[x]=v&255;
    }
  }
  return{width,height,channels,data:out};
}

// The markers are strongly saturated; the map behind them is pale blue, white or
// dark grey, so saturation plus hue separates them cleanly.
function classify(r,g,b){
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  if(max<60)return null;
  if(d<30)return max>110&&max<200?'grey':null;   // the blueprint dot is a mid grey
  if(d/max<0.45)return null;
  let h;
  if(max===r)h=60*(((g-b)/d)%6); else if(max===g)h=60*((b-r)/d+2); else h=60*((r-g)/d+4);
  if(h<0)h+=360;
  if(h<18||h>=330)return 'red';
  if(h<45)return 'orange';
  if(h<70)return 'yellow';
  if(h<170)return 'green';
  if(h<250)return 'blue';
  if(h<330)return 'purple';
  return null;
}

function blobs(file){
  const img=decodePNG(file),{width,height,channels,data}=img;
  const label=new Int32Array(width*height).fill(-1);
  const found=[];
  const at=(x,y)=>{const i=(y*width+x)*channels;return classify(data[i],data[i+1],data[i+2])};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x;
    if(label[i]!==-1)continue;
    const kind=at(x,y);
    if(!kind){label[i]=-2;continue}
    const id=found.length,stack=[[x,y]];let sx=0,sy=0,n=0,sr=0,sg=0,sb=0;
    label[i]=id;
    while(stack.length){
      const [cx,cy]=stack.pop();sx+=cx;sy+=cy;n++;
      const q=(cy*width+cx)*channels;sr+=data[q];sg+=data[q+1];sb+=data[q+2];
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=cx+dx,ny=cy+dy;
        if(nx<0||ny<0||nx>=width||ny>=height)continue;
        const j=ny*width+nx;
        if(label[j]!==-1)continue;
        if(at(nx,ny)!==kind){label[j]=-2;continue}
        label[j]=id;stack.push([nx,ny]);
      }
    }
    found.push({kind,n,x:sx/n,y:sy/n,r:Math.round(sr/n),g:Math.round(sg/n),b:Math.round(sb/n)});
  }
  return{img,spots:found.filter(s=>s.n>=60)};
}

for(const file of process.argv.slice(2)){
  const {img,spots}=blobs(file);
  console.log(`\n=== ${file.split(/[\\/]/).pop()}  ${img.width}x${img.height} ===`);
  const byKind={};
  for(const s of spots)(byKind[s.kind]=byKind[s.kind]||[]).push(s);
  for(const kind of Object.keys(byKind).sort()){
    const list=byKind[kind].sort((a,b)=>a.y-b.y||a.x-b.x);
    console.log(`${kind} (${list.length})`);
    list.forEach(s=>console.log(`    [`+(s.x/img.width*100).toFixed(2)+`,`+(s.y/img.height*100).toFixed(2)+`]  rgb(`+s.r+`,`+s.g+`,`+s.b+`)  px=`+s.n));
  }
}

