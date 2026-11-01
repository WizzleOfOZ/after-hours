import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const DATA = process.env.DATA_FILE || path.join(__dirname, 'data', 'rooms.json');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const clients = new Set();
const rooms = new Map();
const sceneNames = ['Cabin Catastrophe', 'Vampire Problems', 'Grocery of the Dead', 'Love from Outer Space'];
const propsByScene = [
  [[235,175],[690,175],[380,435],[745,390]],
  [[210,400],[495,150],[770,235],[630,455]],
  [[180,245],[430,405],[740,180],[810,425]],
  [[250,160],[510,380],[740,170],[720,465]],
];
const pairsByStage = [
  [[[215,185],[785,410]],[[715,180],[265,410]],[[500,260],[500,470]]],
  [[[180,310],[800,190]],[[750,420],[245,185]],[[470,160],[560,440]]],
  [[[260,430],[740,200]],[[600,170],[320,230]],[[770,440],[475,360]]],
];
const now = () => Date.now();
const clamp = (v, low, high) => Math.min(high, Math.max(low, Number(v) || 0));
const cleanString = (s, max = 64) => String(s ?? '').trim().slice(0, max).replace(/[<>]/g, '');
const id = () => crypto.randomBytes(8).toString('hex');
function newRoom(code) {
  return {
    code, createdAt: now(), updatedAt: now(), phase: 'lobby',
    players: [],
    comedy: { scene: 0, props: [false,false,false,false], actor: {x:115,y:340}, traps: [], chaos:0, finished:false, hits:0, lastTrap:0, lastHit:0, stunnedUntil:0, effects:[] },
    blackout: {stage:0, pair:0, active:[0,0], chars:[{x:105,y:300},{x:895,y:300}], done:false, pulses:0},
    rooftop: { tab:'music', mood:'rose', track:0, queue:[], stars:[], plants:[], revealed:false, gifts:[null,null] },
    finale: { lanterns:[{x:240,y:470},{x:760,y:470}], ready:[false,false], done:false }
  };
}
function load() {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA, 'utf8'));
    for (const r of saved) if (r && /^[A-Z0-9]{6}$/.test(r.code)) {
      r.players = (r.players || []).slice(0,2).map(p => ({id:p.id, name:cleanString(p.name,22), connected:false}));
      rooms.set(r.code,r);
    }
  } catch {}
}
load();
function save() {
  fs.mkdirSync(path.dirname(DATA), {recursive:true});
  const arr = [...rooms.values()].map(r => ({...r, players:r.players.map(p=>({...p,connected:false}))}));
  fs.writeFileSync(DATA, JSON.stringify(arr), 'utf8');
}
let saveNeeded = false;
const mark = r => { r.updatedAt = now(); saveNeeded = true; };
setInterval(() => { if(saveNeeded){ saveNeeded=false; try {save()}catch(e){console.error('Save error',e)}} }, 4000).unref();
process.on('SIGTERM', () => {try {save()} catch {} process.exit(0)});
process.on('SIGINT', () => {try {save()} catch {} process.exit(0)});

function frame(data, opcode = 1) {
  const payload = Buffer.from(data);
  let h;
  if (payload.length < 126) h=Buffer.from([0x80|opcode,payload.length]);
  else if(payload.length < 65536){h=Buffer.alloc(4);h[0]=0x80|opcode;h[1]=126;h.writeUInt16BE(payload.length,2)}
  else {h=Buffer.alloc(10);h[0]=0x80|opcode;h[1]=127;h.writeBigUInt64BE(BigInt(payload.length),2)}
  return Buffer.concat([h,payload]);
}
function send(client, msg) {if(!client.socket.destroyed) {try {client.socket.write(frame(JSON.stringify(msg)))}catch{}}}
function broadcast(room, special=null) {
  const payload = {type:'state', room: roomView(room), event:special};
  for(const c of clients) if(c.room === room.code) send(c,payload);
}
function roomView(r) {
  return {code:r.code, phase:r.phase, players:r.players.map(p=>({name:p.name,connected:p.connected})), comedy:{...r.comedy},blackout:{...r.blackout},rooftop:{...r.rooftop},finale:{...r.finale}};
}
function uniqueCode(){let code;do{code=crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase()}while(rooms.has(code));return code}
function attach(client, room, playerId, name) {
  const pos=room.players.findIndex(p => p.id === playerId);
  let index=pos;
  if(index<0){if(room.players.length>=2){send(client,{type:'error',message:'This room already has two players.'});return}
    index=room.players.length;room.players.push({id:playerId,name:cleanString(name,22)||`Player ${index+1}`,connected:true});
  }
  const old=[...clients].find(c => c!==client&&c.room===room.code&&c.player===index);
  if(old){send(old,{type:'error',message:'Your player profile connected from another tab.'}); old.socket.end(frame('',8));}
  room.players[index].connected=true;client.room=room.code;client.player=index;
  send(client,{type:'welcome',index,code:room.code});mark(room);broadcast(room,{kind:'joined',who:index});
}
function resetComedy(r, idx) {r.comedy={scene:idx,props:[false,false,false,false], actor:{x:115,y:340},traps:[],chaos:r.comedy.chaos||0,finished:false,hits:r.comedy.hits||0,lastTrap:0,effects:[]}}
function resetBlackoutStage(r, idx) {r.blackout={stage:idx,pair:0,active:[0,0],chars:[{x:105,y:300},{x:895,y:300}],done:false,pulses:r.blackout.pulses||0}}
function handle(c,msg) {
  if(!msg || typeof msg!=='object')return;
  if(msg.type==='create'){
    if(c.room) return;
    const pid=cleanString(msg.playerId,60); if(pid.length<8)return send(c,{type:'error',message:'Invalid player profile.'});
    const code=uniqueCode(),r=newRoom(code);rooms.set(code,r);attach(c,r,pid,msg.name);return;
  }
  if(msg.type==='join'){
    if(c.room)return;
    const code=cleanString(msg.code,6).toUpperCase(), r=rooms.get(code);
    if(!r) return send(c,{type:'error',message:'Room not found. Check the six-character code.'});
    const pid=cleanString(msg.playerId,60); if(pid.length<8)return send(c,{type:'error',message:'Invalid player profile.'});
    attach(c,r,pid,msg.name);return;
  }
  const r=rooms.get(c.room); if(!r || c.player==null || !r.players[c.player]) return;
  const p=c.player, t=now();
  switch(msg.type){
    case 'phase': {
      if(p!==0 || r.players.length!==2)return;
      const next=cleanString(msg.value,20);
      if(!['lobby','comedy','blackout','rooftop','finale'].includes(next))return;
      r.phase=next;mark(r);broadcast(r,{kind:'phase',value:next});break;
    }
    case 'comedy:move': {
      if(r.phase!=='comedy'||r.comedy.finished||p!==(r.comedy.scene%2)||t<(r.comedy.stunnedUntil||0))return;
      const pos=r.comedy.actor, tx=clamp(msg.x,72,922),ty=clamp(msg.y,110,520);
      // Client sends 20 updates a second; limit anomalously large teleports.
      const dx=tx-pos.x,dy=ty-pos.y,d=Math.hypot(dx,dy),step=34;
      const k=d>step?step/d:1;
      pos.x=+(pos.x+dx*k).toFixed(1); pos.y=+(pos.y+dy*k).toFixed(1);
      let pickup=false;
      propsByScene[r.comedy.scene].forEach(([x,y],i)=>{if(!r.comedy.props[i]&&Math.hypot(x-pos.x,y-pos.y)<35){r.comedy.props[i]=true;r.comedy.chaos+=20;pickup=true}});
      for(const trap of r.comedy.traps){if(!trap.hit&&t-(r.comedy.lastHit||0)>650&&Math.hypot(trap.x-pos.x,trap.y-pos.y)<32){trap.hit=true;r.comedy.chaos+=35;r.comedy.hits++;r.comedy.lastHit=t;r.comedy.stunnedUntil=t+(trap.kind==='goo'?850:420); const vx=pos.x-trap.x||1,vy=pos.y-trap.y||-1,distance=Math.hypot(vx,vy);pos.x=clamp(pos.x+vx/distance*57,75,920);pos.y=clamp(pos.y+vy/distance*57,110,515);r.comedy.effects.push({x:trap.x,y:trap.y,kind:trap.kind,at:t});}}
      if(r.comedy.props.every(Boolean)&&pos.x>840&&pos.y>230&&pos.y<430){r.comedy.finished=true;r.comedy.chaos+=100;}
      if(pickup || r.comedy.finished)mark(r);
      break;
    }
    case 'comedy:trap':{
      if(r.phase!=='comedy'||r.comedy.finished||p===(r.comedy.scene%2)||t-r.comedy.lastTrap<1100)return;
      const kinds=['pie','spring','ghost','goo'];if(!kinds.includes(msg.kind))return;
      r.comedy.lastTrap=t;r.comedy.traps.push({id:id(),kind:msg.kind,x:clamp(msg.x,75,925),y:clamp(msg.y,110,520),hit:false,at:t});
      if(r.comedy.traps.length>24)r.comedy.traps.shift();mark(r);broadcast(r,{kind:'trap'});break;
    }
    case 'comedy:next':{
      if(r.phase!=='comedy'||p!==0||!r.comedy.finished)return;
      if(r.comedy.scene<3)resetComedy(r,r.comedy.scene+1);else r.phase='blackout';
      mark(r);broadcast(r,{kind:'scene'});break;
    }
    case 'blackout:move':{
      if(r.phase!=='blackout'||r.blackout.done)return;
      const pos=r.blackout.chars[p],tx=clamp(msg.x,65,935),ty=clamp(msg.y,95,540),dx=tx-pos.x,dy=ty-pos.y,d=Math.hypot(dx,dy),step=32,k=d>step?step/d:1;
      pos.x=+(pos.x+dx*k).toFixed(1);pos.y=+(pos.y+dy*k).toFixed(1);break;
    }
    case 'blackout:activate':{
      if(r.phase!=='blackout'||r.blackout.done)return;
      const b=r.blackout, pair=pairsByStage[b.stage]?.[b.pair], target=pair?.[p];if(!target)return;
      if(Math.hypot(b.chars[p].x-target[0],b.chars[p].y-target[1])>76)return;
      b.active[p]=t;
      if(b.active[1-p] && Math.abs(t-b.active[1-p])<8000){
        b.pair++;b.active=[0,0];b.pulses++;
        if(b.pair>=3)b.done=true;
        broadcast(r,{kind:'pulse',stage:b.stage,pair:b.pair});
      }else broadcast(r,{kind:'armed',who:p});
      mark(r);break;
    }
    case 'blackout:next':{
      if(r.phase!=='blackout'||!r.blackout.done||p!==0)return;
      if(r.blackout.stage<2)resetBlackoutStage(r,r.blackout.stage+1);else r.phase='rooftop';
      mark(r);broadcast(r,{kind:'stage'});break;
    }
    case 'roof:tab':{
      if(r.phase!=='rooftop'||!['music','stars','garden'].includes(msg.tab))return;
      r.rooftop.tab=msg.tab;mark(r);broadcast(r);break;
    }
    case 'roof:mood':{
      if(r.phase!=='rooftop'||!['rose','violet','rain','gold'].includes(msg.mood))return;
      r.rooftop.mood=msg.mood;mark(r);broadcast(r);break;
    }
    case 'roof:track':{
      if(r.phase!=='rooftop')return;
      r.rooftop.track=clamp(msg.index,0,3);mark(r);broadcast(r,{kind:'track'});break;
    }
    case 'roof:queue':{
      if(r.phase!=='rooftop')return;
      const title=cleanString(msg.title,65),url=String(msg.url||'').trim().slice(0,500);
      if(!title||!/^https:\/\//i.test(url)||!/^https:\/\/(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com|open\.spotify\.com|soundcloud\.com|music\.apple\.com)\//i.test(url))return;
      if(r.rooftop.queue.length>=12)return;
      r.rooftop.queue.push({title,url,by:p});mark(r);broadcast(r,{kind:'queue'});break;
    }
    case 'roof:star':{
      if(r.phase!=='rooftop'||r.rooftop.stars.length>=75)return;
      r.rooftop.stars.push({x:clamp(msg.x,80,920),y:clamp(msg.y,70,480),by:p});mark(r);broadcast(r,{kind:'star'});break;
    }
    case 'roof:plant':{
      if(r.phase!=='rooftop'||r.rooftop.plants.length>=42)return;
      if(!['rose','moon','fern','mushroom','lantern','crystal'].includes(msg.kind))return;
      r.rooftop.plants.push({x:clamp(msg.x,85,915),y:clamp(msg.y,315,525),kind:msg.kind,by:p});mark(r);broadcast(r,{kind:'plant'});break;
    }
    case 'roof:gift':{
      if(r.phase!=='rooftop'||r.rooftop.plants.filter(a=>a.by===p).length<2||r.rooftop.gifts[p])return;
      if(!['heart','moon','key','star'].includes(msg.kind))return;
      r.rooftop.gifts[p]=msg.kind;
      if(r.rooftop.gifts.every(Boolean))r.rooftop.revealed=true;
      mark(r);broadcast(r,{kind:'gift'});break;
    }
    case 'finale:move':{
      if(r.phase!=='finale'||r.finale.done)return;
      const lan=r.finale.lanterns[p];lan.x=clamp(msg.x,90,910);lan.y=clamp(msg.y,70,525);
      const near=Math.hypot(lan.x-500,lan.y-235)<95;r.finale.ready[p]=near;
      if(r.finale.ready.every(Boolean)){r.finale.done=true;mark(r);broadcast(r,{kind:'complete'});}break;
    }
    case 'reset':{
      if(p!==0)return;
      const prevPlayers=r.players;r.phase='lobby';
      const fresh=newRoom(r.code);r.comedy=fresh.comedy;r.blackout=fresh.blackout;r.rooftop=fresh.rooftop;r.finale=fresh.finale;r.players=prevPlayers;
      mark(r);broadcast(r,{kind:'reset'});break;
    }
  }
}
function closeClient(c) {
  if(!clients.has(c))return;
  clients.delete(c);const r=rooms.get(c.room);
  if(r&&r.players[c.player]){
    const replacement=[...clients].some(other=>other.room===r.code&&other.player===c.player);
    if(!replacement){r.players[c.player].connected=false;mark(r);broadcast(r,{kind:'left',who:c.player})}
  }
}
function parseFrames(c,chunk){
  c.buffer=Buffer.concat([c.buffer,chunk]);
  while(c.buffer.length>=2){
    const b=c.buffer,opcode=b[0]&15,masked=!!(b[1]&128);let size=b[1]&127,off=2;
    if(!masked){c.socket.destroy();return} // browser clients always mask
    if(size===126){if(b.length<4)return;size=b.readUInt16BE(2);off=4}
    else if(size===127){if(b.length<10)return;const n=b.readBigUInt64BE(2);if(n>65536n){c.socket.destroy();return}size=Number(n);off=10}
    if(size>65536){c.socket.destroy();return}
    if(b.length<off+4+size)return;
    const mask=b.subarray(off,off+4), payload=Buffer.from(b.subarray(off+4,off+4+size));
    for(let i=0;i<size;i++)payload[i]^=mask[i%4];
    c.buffer=b.subarray(off+4+size);
    if(opcode===8){c.socket.end(frame('',8));return}
    if(opcode===9){c.socket.write(frame(payload,10));continue}
    if(opcode===1){try{handle(c,JSON.parse(payload.toString('utf8')))}catch{send(c,{type:'error',message:'Invalid message.'})}}
  }
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.json':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/health') {res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({status:'ok',rooms:rooms.size}))}
  if(req.method!=='GET'){res.writeHead(405);return res.end('Method not allowed')}
  let requested;
  try {requested=decodeURIComponent(url.pathname)} catch {res.writeHead(400);return res.end('Bad request')}
  const resolved=path.resolve(PUBLIC,'.'+(requested==='/'?'/index.html':requested));
  if(!resolved.startsWith(PUBLIC+path.sep) && resolved!==path.join(PUBLIC,'index.html')){res.writeHead(403);return res.end('Forbidden')}
  fs.stat(resolved,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404);res.end('Not found');return}
    res.writeHead(200,{'Content-Type':mime[path.extname(resolved)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(resolved).pipe(res);
  });
});
server.on('upgrade',(req,socket)=>{
  if(req.url.split('?')[0]!=='/ws'||req.headers.upgrade?.toLowerCase()!=='websocket'){socket.destroy();return}
  const key=req.headers['sec-websocket-key'];if(typeof key!=='string'||!key){socket.destroy();return}
  const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  const c={socket,buffer:Buffer.alloc(0),room:null,player:null};clients.add(c);
  socket.on('data',chunk=>parseFrames(c,chunk));socket.on('close',()=>closeClient(c));socket.on('error',()=>closeClient(c));
});
setInterval(()=>{
  const t=now();
  for(const r of rooms.values()){
    if(r.phase==='comedy'){
      const old=r.comedy.traps.length;r.comedy.traps=r.comedy.traps.filter(trap=>t-trap.at<12000);
      r.comedy.effects=r.comedy.effects.filter(effect=>t-effect.at<3000);
      if(r.comedy.traps.length!==old)mark(r);
    }
    if(r.phase==='blackout'){
      let changed=false;for(let i=0;i<2;i++)if(r.blackout.active[i]&&t-r.blackout.active[i]>8000){r.blackout.active[i]=0;changed=true}
      if(changed)mark(r);
    }
    if(r.players.some(p=>p.connected))broadcast(r);
  }
},120).unref();
server.listen(PORT,HOST,()=>console.log(`After Hours ready: http://localhost:${PORT}`));
export {server,rooms};
