// Crops a region of a PNG and scales it up, so the rb labels can be read
// against the dot they belong to without guessing.
const fs=require('fs'),zlib=require('zlib');
const[,,file,x0,y0,x1,y1,scale,out]=process.argv;
const S=Number(scale||3);

function decodePNG(f){
  const buf=fs.readFileSync(f);
  let pos=8,width=0,height=0,colorType=0;const idat=[];
  while(pos<buf.length){
    const len=buf.readUInt32BE(pos),type=buf.toString('ascii',pos+4,pos+8),data=buf.subarray(pos+8,pos+8+len);
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);colorType=data[9]}
    else if(type==='IDAT')idat.push(data);else if(type==='IEND')break;
    pos+=12+len;
  }
  const channels={0:1,2:3,4:2,6:4}[colorType];
  const raw=zlib.inflateSync(Buffer.concat(idat));
  const stride=width*channels,o=Buffer.alloc(height*stride);let p=0;
  for(let y=0;y<height;y++){
    const filter=raw[p++],line=raw.subarray(p,p+stride);p+=stride;
    const cur=o.subarray(y*stride,(y+1)*stride),prev=y?o.subarray((y-1)*stride,y*stride):null;
    for(let x=0;x<stride;x++){
      const a=x>=channels?cur[x-channels]:0,b=prev?prev[x]:0,c=x>=channels&&prev?prev[x-channels]:0;
      let v=line[x];
      if(filter===1)v+=a;else if(filter===2)v+=b;else if(filter===3)v+=(a+b)>>1;
      else if(filter===4){const pa=Math.abs(b-c),pb=Math.abs(a-c),pc=Math.abs(a+b-2*c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c}
      cur[x]=v&255;
    }
  }
  return{width,height,channels,data:o};
}
function encodePNG(w,h,rgb){
  const stride=w*3,raw=Buffer.alloc(h*(stride+1));
  for(let y=0;y<h;y++){raw[y*(stride+1)]=0;rgb.copy(raw,y*(stride+1)+1,y*stride,(y+1)*stride)}
  const chunk=(type,data)=>{
    const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
    const td=Buffer.concat([Buffer.from(type,'ascii'),data]);
    const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(td)>>>0);
    return Buffer.concat([len,td,crc]);
  };
  let table=null;
  function crc32(b){
    if(!table){table=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;table[n]=c>>>0}}
    let c=0xFFFFFFFF;for(const v of b)c=table[(c^v)&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;
  }
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}

const img=decodePNG(file);
const X0=Math.max(0,Number(x0)),Y0=Math.max(0,Number(y0));
const X1=Math.min(img.width,Number(x1)),Y1=Math.min(img.height,Number(y1));
const w=(X1-X0)*S,h=(Y1-Y0)*S,rgb=Buffer.alloc(w*h*3);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const sx=X0+Math.floor(x/S),sy=Y0+Math.floor(y/S),o=(sy*img.width+sx)*img.channels,d=(y*w+x)*3;
  rgb[d]=img.data[o];rgb[d+1]=img.data[o+1];rgb[d+2]=img.data[o+2];
}
fs.writeFileSync(out,encodePNG(w,h,rgb));
console.log(`${out}  ${w}x${h}  (source ${img.width}x${img.height}, region ${X0},${Y0} -> ${X1},${Y1})`);
