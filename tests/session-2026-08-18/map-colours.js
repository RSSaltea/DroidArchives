// Census of flat, saturated colours in the map art. The markers are drawn as
// solid fills so they show up as large runs of one exact colour; everything else
// (outlines, glow, background) is either pale or gradiated.
const fs=require('fs'),zlib=require('zlib');
function decodePNG(file){
  const buf=fs.readFileSync(file);let pos=8,width=0,height=0,depth=0,colorType=0;const idat=[];
  while(pos<buf.length){
    const len=buf.readUInt32BE(pos),type=buf.toString('ascii',pos+4,pos+8),data=buf.subarray(pos+8,pos+8+len);
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);depth=data[8];colorType=data[9]}
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
for(const file of process.argv.slice(2)){
  const {width,height,channels,data}=decodePNG(file);
  const counts=new Map();
  for(let i=0;i<width*height;i++){
    const o=i*channels,r=data[o],g=data[o+1],b=data[o+2];
    const max=Math.max(r,g,b),min=Math.min(r,g,b);
    // Skip the pale blue map and its white glow: markers are either strongly
    // saturated or a distinctly mid grey.
    const saturated=max-min>90, midGrey=max-min<20&&max>120&&max<200;
    if(!saturated&&!midGrey)continue;
    const key=`${r},${g},${b}`;counts.set(key,(counts.get(key)||0)+1);
  }
  console.log(`\n=== ${file.split(/[\\/]/).pop()} ===`);
  [...counts].filter(([,n])=>n>=150).sort((a,b)=>b[1]-a[1])
    .forEach(([c,n])=>console.log(`  rgb(${c})`.padEnd(24)+`${n} px`));
}
