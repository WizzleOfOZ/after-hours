import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const temp=mkdtempSync(path.join(os.tmpdir(),'after-hours-test-'));
const PORT=31000+Math.floor(Math.random()*10000);
const BASE=`http://127.0.0.1:${PORT}`;
class Client {
  constructor(){this.messages=[];this.waiting=[];this.socket=new WebSocket(`ws://127.0.0.1:${PORT}/ws`);this.socket.addEventListener('message',e=>{
    let message=JSON.parse(e.data);this.messages.push(message);
    if(this.messages.length>150)this.messages.shift();
    for(const w of [...this.waiting])if(w.pred(message)){this.waiting.splice(this.waiting.indexOf(w),1);w.resolve(message)}
  })}
  async open(){if(this.socket.readyState===1)return;await new Promise((r,j)=>{this.socket.addEventListener('open',r,{once:true});this.socket.addEventListener('error',j,{once:true})})}
  send(message){this.socket.send(JSON.stringify(message))}
  wait(pred,timeout=4000){const prev=this.messages.find(pred);if(prev)return Promise.resolve(prev);return new Promise((resolve,reject)=>{
    const w={pred,resolve};this.waiting.push(w);setTimeout(()=>{const i=this.waiting.indexOf(w);if(i!==-1){this.waiting.splice(i,1);reject(new Error('Timed out waiting for server event'))}},timeout).unref();
  })}
  state(check){return this.wait(m=>m.type==='state'&&check(m.room)).then(m=>m.room)}
  close(){this.socket.close()}
}
let child;
test('two player journey works from invitation through finale', {timeout:30000},async t=>{
  child=spawn(process.execPath,['server.js'],{cwd:process.cwd(),env:{...process.env,PORT:String(PORT),DATA_FILE:path.join(temp,'rooms.json')},stdio:['ignore','pipe','pipe']});
  t.after(()=>{child.kill('SIGTERM');rmSync(temp,{recursive:true,force:true})});
  let started=false;
  for(let i=0;i<50;i++) {try{const r=await fetch(BASE+'/health');if(r.ok){started=true;break}}catch{}await sleep(50)}
  assert.ok(started,'HTTP server started');
  const home=await fetch(BASE+'/');assert.equal(home.status,200);assert.match(await home.text(),/AFTER HOURS/);
  const js=await fetch(BASE+'/app.js');assert.equal(js.status,200);assert.match(await js.text(),/B-Movie/);
  const a=new Client();await a.open();a.send({type:'create',name:'Wizzle',playerId:'tester-one-12345'});
  const created=await a.wait(m=>m.type==='welcome');const code=created.code;assert.match(code,/^[A-F0-9]{6}$/);
  const b=new Client();await b.open();b.send({type:'join',code,name:'Kris',playerId:'tester-two-12345'});
  const joined=await b.wait(m=>m.type==='welcome');assert.equal(joined.index,1);
  const lobby=await a.state(r=>r.players.length===2 && r.players[1].connected);assert.equal(lobby.phase,'lobby');
  // Third participants cannot enter a room already containing two players.
  const trespass=new Client();await trespass.open();trespass.send({type:'join',code,name:'Third',playerId:'tester-three-12345'});
  assert.match((await trespass.wait(m=>m.type==='error')).message,/two players/);trespass.close();
  a.send({type:'phase',value:'comedy'});await b.state(r=>r.phase==='comedy');
  b.send({type:'comedy:trap',kind:'pie',x:215,y:185});const comedy=await a.state(r=>r.comedy.traps.length===1);assert.equal(comedy.comedy.traps[0].kind,'pie');
  // Guest cannot force advance to a new chapter.
  b.send({type:'phase',value:'finale'});await sleep(100);assert.equal((await a.state(r=>r.phase==='comedy')).phase,'comedy');
  a.send({type:'phase',value:'blackout'});await b.state(r=>r.phase==='blackout');
  // Each player travels to their own linked energy node.
  for(let i=0;i<7;i++){a.send({type:'blackout:move',x:215,y:185});b.send({type:'blackout:move',x:785,y:410})}
  await a.state(r=>Math.hypot(r.blackout.chars[0].x-215,r.blackout.chars[0].y-185)<70);
  await b.state(r=>Math.hypot(r.blackout.chars[1].x-785,r.blackout.chars[1].y-410)<70);
  a.send({type:'blackout:activate'});b.send({type:'blackout:activate'});
  const linked=await a.state(r=>r.blackout.pair===1);assert.equal(linked.blackout.pulses,1);
  a.send({type:'phase',value:'rooftop'});await b.state(r=>r.phase==='rooftop');
  a.send({type:'roof:star',x:350,y:200});b.send({type:'roof:star',x:490,y:180});
  assert.equal((await a.state(r=>r.rooftop.stars.length===2)).rooftop.stars.length,2);
  a.send({type:'roof:track',index:3});await b.state(r=>r.rooftop.track===3);
  a.send({type:'roof:queue',title:'Our Song',url:'https://youtu.be/abcdef'});await a.state(r=>r.rooftop.queue.length===1);
  for(const p of [a,b]){p.send({type:'roof:plant',x:400,y:450,kind:'rose'});p.send({type:'roof:plant',x:500,y:460,kind:'moon'})}
  await b.state(r=>r.rooftop.plants.length===4);
  a.send({type:'roof:gift',kind:'heart'});b.send({type:'roof:gift',kind:'moon'});
  assert.equal((await a.state(r=>r.rooftop.revealed)).rooftop.gifts[1],'moon');
  a.send({type:'phase',value:'finale'});await b.state(r=>r.phase==='finale');
  a.send({type:'finale:move',x:450,y:235});b.send({type:'finale:move',x:550,y:235});
  assert.ok((await a.state(r=>r.finale.done)).finale.done);
  a.close();b.close();
});
