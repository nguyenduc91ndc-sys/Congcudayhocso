/*! 
 * QR Code generator library (TypeScript/JavaScript) - (MIT License)
 * Based on Nayuki QR Code Generator. https://www.nayuki.io/page/qr-code-generator-library
 * Compact build for offline rendering.
 */
"use strict";
var qrcodegen=(function(){
function QrCode(mask,modules,isFunc,ver,ecc){this.mask=mask;this.modules=modules;this.isFunc=isFunc;this.version=ver;this.errorCorrectionLevel=ecc;this.size=ver*4+17}
QrCode.Ecc={LOW:0,MEDIUM:1,QUARTILE:2,HIGH:3};
QrCode.encodeText=function(text,ecc){var segs=[QrSegment.makeSegments(text)].flat();return QrCode.encodeSegments(segs,ecc)};
QrCode.encodeSegments=function(segs,ecc,minVer=1,maxVer=40,mask=-1,boostEcl=true){
if(!(1<=minVer&&minVer<=maxVer&&maxVer<=40)||mask<-1||mask>7)throw"bad args";
for(var ver=minVer;;ver++){
var dataUsedBits=QrSegment.getTotalBits(segs,ver);if(dataUsedBits!=null&&dataUsedBits<=QrCode.getNumDataCodewords(ver,ecc)*8)break;
if(ver>=maxVer)throw"data too long";
}
for(var newEcc=ecc;boostEcl&&newEcc<3;newEcc++){
var cap=QrCode.getNumDataCodewords(ver,newEcc)*8;
if(QrSegment.getTotalBits(segs,ver)<=cap)ecc=newEcc;
}
var bb=[];
for(var i=0;i<segs.length;i++){
var seg=segs[i];
QrCode.appendBits(seg.mode.modeBits,4,bb);
QrCode.appendBits(seg.numChars,QrSegment.numCharCountBits(seg.mode,ver),bb);
for(var j=0;j<seg.bitData.length;j++)bb.push(seg.bitData[j]);
}
var dataCap=QrCode.getNumDataCodewords(ver,ecc)*8;
QrCode.appendBits(0,Math.min(4,dataCap-bb.length),bb);
QrCode.appendBits(0,(8-bb.length%8)%8,bb);
for(var pad=0;bb.length<dataCap;pad^=0xEC^0x11){QrCode.appendBits(pad?0x11:0xEC,8,bb)}
var dataCodewords=[];
for(var i2=0;i2<bb.length;i2+=8){
var b=0;for(var j2=0;j2<8;j2++)b=(b<<1)|bb[i2+j2];
dataCodewords.push(b);
}
var allCodewords=QrCode.addEccAndInterleave(dataCodewords,ver,ecc);
var modules=QrCode.makeBaseMatrix(ver);
var isFunc=QrCode.makeFunctionModules(ver);
QrCode.drawCodewords(modules,allCodewords);
QrCode.drawFormatBits(modules,isFunc,mask<0?0:mask,ecc);
QrCode.drawVersion(modules,isFunc,ver);
var bestMask=0,minPenalty=1/0;
for(var m=0;m<8;m++){
if(mask>=0&&m!=mask)continue;
var m2=QrCode.cloneMatrix(modules);
QrCode.applyMask(m2,isFunc,m);
QrCode.drawFormatBits(m2,isFunc,m,ecc);
var pen=QrCode.getPenaltyScore(m2);
if(pen<minPenalty){bestMask=m;minPenalty=pen}
}
QrCode.applyMask(modules,isFunc,bestMask);
QrCode.drawFormatBits(modules,isFunc,bestMask,ecc);
return new QrCode(bestMask,modules,isFunc,ver,ecc);
};
QrCode.prototype.getModule=function(x,y){return this.modules[y][x]};
QrCode.appendBits=function(val,len,bb){for(var i=len-1;i>=0;i--)bb.push((val>>>i)&1)};
QrCode.getNumDataCodewords=function(ver,ecc){return QrCode.getNumRawDataModules(ver)/8 - QrCode.ECC_CODEWORDS_PER_BLOCK[ecc][ver] * QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecc][ver]};
QrCode.getNumRawDataModules=function(ver){
var res=(16*ver+128)*ver+64;
if(ver>=2){var numAlign=Math.floor(ver/7)+2;res-= (25*numAlign-10)*numAlign-55; if(ver>=7)res-=36}
return res;
};
QrCode.makeBaseMatrix=function(ver){
var size=ver*4+17;
var m=new Array(size);for(var y=0;y<size;y++){m[y]=new Array(size).fill(false)}
return m;
};
QrCode.makeFunctionModules=function(ver){
var size=ver*4+17;
var isf=new Array(size);for(var y=0;y<size;y++){isf[y]=new Array(size).fill(false)}
function setFn(x,y){isf[y][x]=true}
function drawFinder(x,y){
for(var dy=-1;dy<=7;dy++)for(var dx=-1;dx<=7;dx++){
var xx=x+dx,yy=y+dy;
if(0<=xx&&xx<size&&0<=yy&&yy<size)setFn(xx,yy);
}
}
drawFinder(0,0);drawFinder(size-7,0);drawFinder(0,size-7);
for(var i=0;i<size;i++){setFn(6,i);setFn(i,6)}
var align=QrCode.getAlignmentPatternPositions(ver);
for(var i2=0;i2<align.length;i2++)for(var j2=0;j2<align.length;j2++){
if((i2==0&&j2==0)||(i2==0&&j2==align.length-1)||(i2==align.length-1&&j2==0))continue;
var x=align[i2],y=align[j2];
for(var dy=-2;dy<=2;dy++)for(var dx=-2;dx<=2;dx++)setFn(x+dx,y+dy);
}
for(var i3=0;i3<8;i3++){setFn(size-1-i3,8);setFn(8,size-1-i3)}
setFn(8,8);
for(var i4=0;i4<7;i4++){setFn(8,size-7+i4)}
if(ver>=7){
for(var i5=0;i5<6;i5++)for(var j5=0;j5<3;j5++){
setFn(size-11+j5,i5);
setFn(i5,size-11+j5);
}
}
return isf;
};
QrCode.getAlignmentPatternPositions=function(ver){
if(ver==1)return[];
var num=Math.floor(ver/7)+2;
var step=(ver==32)?26:Math.ceil((ver*4+17-13)/(num*2-2))*2;
var res=[6];
for(var pos=ver*4+17-7;res.length<num;pos-=step)res.splice(1,0,pos);
res.push(ver*4+17-7);
return res;
};
QrCode.cloneMatrix=function(m){return m.map(r=>r.slice())};
QrCode.drawCodewords=function(modules,codewords){
var size=modules.length;
var i=0;
for(var right=size-1;right>=1;right-=2){
if(right==6)right--;
for(var vert=0;vert<size;vert++){
for(var j=0;j<2;j++){
var x=right-j;
var y=((right+1)&2)==0?size-1-vert:vert;
if(modules[y][x]===false){
modules[y][x]= ((codewords[Math.floor(i/8)]>>> (7-(i&7))) &1)!=0;
i++;
}
}
}
}
};
QrCode.applyMask=function(mod,isFunc,mask){
var size=mod.length;
for(var y=0;y<size;y++)for(var x=0;x<size;x++){
if(isFunc[y][x])continue;
var invert=false;
switch(mask){
case 0: invert=(x+y)%2==0;break;
case 1: invert=y%2==0;break;
case 2: invert=x%3==0;break;
case 3: invert=(x+y)%3==0;break;
case 4: invert=(Math.floor(x/3)+Math.floor(y/2))%2==0;break;
case 5: invert=(x*y)%2+(x*y)%3==0;break;
case 6: invert=((x*y)%2+(x*y)%3)%2==0;break;
case 7: invert=((x+y)%2+(x*y)%3)%2==0;break;
default: throw"bad mask";
}
if(invert)mod[y][x]=!mod[y][x];
}
};
QrCode.drawFormatBits=function(mod,isFunc,mask,ecc){
var data=(ecc<<3)|mask;
var rem=data;
for(var i=0;i<10;i++)rem=(rem<<1)^((rem>>>9)*0x537);
var bits=((data<<10)|rem)^0x5412;
function set(x,y,b){mod[y][x]=b;isFunc[y][x]=true}
for(var i2=0;i2<=5;i2++)set(8,i2,((bits>>>i2)&1)!=0);
set(8,7,((bits>>>6)&1)!=0);
set(8,8,((bits>>>7)&1)!=0);
set(7,8,((bits>>>8)&1)!=0);
for(var i3=9;i3<15;i3++)set(14-i3,8,((bits>>>i3)&1)!=0);
for(var i4=0;i4<8;i4++)set(mod.length-1-i4,8,((bits>>>i4)&1)!=0);
for(var i5=8;i5<15;i5++)set(8,mod.length-15+i5,((bits>>>i5)&1)!=0);
set(8,mod.length-8,true);
};
QrCode.drawVersion=function(mod,isFunc,ver){
if(ver<7)return;
var rem=ver;
for(var i=0;i<12;i++)rem=(rem<<1)^((rem>>>11)*0x1F25);
var bits=(ver<<12)|rem;
function set(x,y,b){mod[y][x]=b;isFunc[y][x]=true}
for(var i2=0;i2<18;i2++){
var b=((bits>>>i2)&1)!=0;
var a=mod.length-11+(i2%3), c=Math.floor(i2/3);
set(a,c,b);
set(c,a,b);
}
};
QrCode.getPenaltyScore=function(mod){
var size=mod.length,pen=0;
for(var y=0;y<size;y++){
var runColor=mod[y][0],runLen=1;
for(var x=1;x<size;x++){
if(mod[y][x]==runColor){runLen++; if(runLen==5)pen+=3; else if(runLen>5)pen++}
else{runColor=mod[y][x];runLen=1}
}
}
for(var x=0;x<size;x++){
var runColor=mod[0][x],runLen=1;
for(var y=1;y<size;y++){
if(mod[y][x]==runColor){runLen++; if(runLen==5)pen+=3; else if(runLen>5)pen++}
else{runColor=mod[y][x];runLen=1}
}
}
for(var y2=0;y2<size-1;y2++)for(var x2=0;x2<size-1;x2++){
var c=mod[y2][x2];
if(c==mod[y2][x2+1]&&c==mod[y2+1][x2]&&c==mod[y2+1][x2+1])pen+=3;
}
function finderPenalty(line){
var p=0;
for(var i=0;i<line.length-10;i++){
if(line[i]&& !line[i+1]&& line[i+2]&& line[i+3]&& line[i+4]&& !line[i+5]&& line[i+6]&& !line[i+7]&& !line[i+8]&& !line[i+9]&& !line[i+10])p+=40;
if(!line[i]&& !line[i+1]&& !line[i+2]&& !line[i+3]&& line[i+4]&& !line[i+5]&& line[i+6]&& line[i+7]&& line[i+8]&& !line[i+9]&& line[i+10])p+=40;
}
return p;
}
for(var y3=0;y3<size;y3++)pen+=finderPenalty(mod[y3]);
for(var x3=0;x3<size;x3++){
var col=new Array(size);
for(var y4=0;y4<size;y4++)col[y4]=mod[y4][x3];
pen+=finderPenalty(col);
}
var black=0;
for(var y5=0;y5<size;y5++)for(var x4=0;x4<size;x4++)if(mod[y5][x4])black++;
var total=size*size;
var k=Math.abs(black*20-total*10)/total;
pen+=Math.floor(k)*10;
return pen;
};
QrCode.addEccAndInterleave=function(data,ver,ecc){
var numBlocks=QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecc][ver];
var blockEccLen=QrCode.ECC_CODEWORDS_PER_BLOCK[ecc][ver];
var rawCodewords=QrCode.getNumRawDataModules(ver)/8;
var numShortBlocks=numBlocks - rawCodewords%numBlocks;
var shortBlockLen=Math.floor(rawCodewords/numBlocks);
var blocks=[];
var rsDiv=QrCode.reedSolomonComputeDivisor(blockEccLen);
var k=0;
for(var i=0;i<numBlocks;i++){
var datLen=shortBlockLen - blockEccLen + (i>=numShortBlocks?1:0);
var dat=data.slice(k,k+datLen); k+=datLen;
var eccw=QrCode.reedSolomonComputeRemainder(dat,rsDiv);
if(i<numShortBlocks)dat.push(0);
blocks.push(dat.concat(eccw));
}
var result=[];
for(var i2=0;i2<blocks[0].length;i2++){
for(var j=0;j<blocks.length;j++){
if(i2!=shortBlockLen-blockEccLen || j>=numShortBlocks)result.push(blocks[j][i2]);
}
}
return result;
};
QrCode.reedSolomonComputeDivisor=function(deg){
var res=[1];
for(var i=0;i<deg;i++){
res.push(0);
for(var j=res.length-1;j>0;j--)res[j]=res[j]^QrCode.reedSolomonMultiply(res[j-1],QrCode.RS_GENERATOR[i]);
}
return res;
};
QrCode.reedSolomonComputeRemainder=function(data,div){
var res=new Array(div.length-1).fill(0);
for(var i=0;i<data.length;i++){
var factor=data[i]^res[0];
res.shift();res.push(0);
for(var j=0;j<res.length;j++)res[j]^=QrCode.reedSolomonMultiply(div[j],factor);
}
return res;
};
QrCode.reedSolomonMultiply=function(x,y){
var z=0;
for(var i=7;i>=0;i--){
z=((z<<1)^((z>>>7)*0x11D))&0xFF;
if(((y>>>i)&1)!=0)z^=x;
}
return z;
};
QrCode.RS_GENERATOR=[0,0];
QrCode.NUM_ERROR_CORRECTION_BLOCKS=[[],[],[],[]];
QrCode.ECC_CODEWORDS_PER_BLOCK=[[],[],[],[]];
(function initTables(){
const NUM_ERROR_CORRECTION_BLOCKS = [
[0,1,1,1,1,1,2,2,2,2,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25,26],
[0,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
[0,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
[0,1,2,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81]
];
const ECC_CODEWORDS_PER_BLOCK = [
[0,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
[0,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
[0,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
[0,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30]
];
for (let e=0;e<4;e++){QrCode.NUM_ERROR_CORRECTION_BLOCKS[e]=NUM_ERROR_CORRECTION_BLOCKS[e];QrCode.ECC_CODEWORDS_PER_BLOCK[e]=ECC_CODEWORDS_PER_BLOCK[e];}
const rsgen=[];
let x=1;
for(let i=0;i<256;i++){rsgen.push(x);x=QrCode.reedSolomonMultiply(x,2);}
QrCode.RS_GENERATOR=rsgen;
})();
function Mode(modeBits,numCharCountBits){this.modeBits=modeBits;this._numCharCountBits=numCharCountBits}
Mode.prototype.numCharCountBits=function(ver){return this._numCharCountBits[Math.floor((ver+7)/17)]}
QrCode.Mode={NUMERIC:new Mode(1,[10,12,14]),ALPHANUMERIC:new Mode(2,[9,11,13]),BYTE:new Mode(4,[8,16,16]),KANJI:new Mode(8,[8,10,12]),ECI:new Mode(7,[0,0,0])};
function QrSegment(mode,numChars,bitData){this.mode=mode;this.numChars=numChars;this.bitData=bitData}
QrSegment.makeBytes=function(data){
var bb=[];for(var i=0;i<data.length;i++)QrCode.appendBits(data[i],8,bb);
return new QrSegment(QrCode.Mode.BYTE,data.length,bb);
};
QrSegment.makeSegments=function(text){
var bytes=new TextEncoder().encode(text);
return [QrSegment.makeBytes(bytes)];
};
QrSegment.numCharCountBits=function(mode,ver){return mode.numCharCountBits(ver)};
QrSegment.getTotalBits=function(segs,ver){
var sum=0;
for(var i=0;i<segs.length;i++){
var seg=segs[i];
var ccb=QrSegment.numCharCountBits(seg.mode,ver);
if(seg.numChars>=1<<ccb)return null;
sum+=4+ccb+seg.bitData.length;
}
return sum;
};
return {QrCode:QrCode,QrSegment:QrSegment};
})();
