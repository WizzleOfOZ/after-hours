/* AFTER HOURS — a playable, synchronized 2-person canvas adventure */
const $ = s => document.querySelector(s);
const landing = $('#landing'), experience = $('#experience'), lobbyPanel = $('#lobbyPanel'), playPanel = $('#playPanel');
const canvas = $('#world'), ctx = canvas.getContext('2d');
const W=1000,H=600;
const storedIdKey='after-hours-profile-id';
let playerId=localStorage.getItem(storedIdKey);
if(!playerId){playerId=globalThis.crypto?.randomUUID?.()||'profile-'+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem(storedIdKey,playerId)}
const nameInput=$('#playerName'),codeInput=$('#roomCode');
nameInput.value=localStorage.getItem('after-hours-name')||'';
const params = new URLSearchParams(location.search);
if(params.get('room'))codeInput.value=params.get('room').toUpperCase().slice(0,6);
let ws=null,room=null,myIndex=null,assignedCode=null,connectionTimer=null,selectedTrap='pie',selectedPlant='rose',selectedGift='heart',sceneKey='',lastToast='',toastTimeout=null;
let lastMoveAt=0, lastClickAt=0, soundOn=false, audio=null, audioTick=null, audioStep=-1;
const keys=new Set();
const scenes=['Cabin Catastrophe','Vampire Problems','Grocery of the Dead','Love from Outer Space'];
const sceneSub=['The killer is late. The cabin is definitely not up to code.','A vampire aristocrat with a very serious chandelier problem.','Everything is on sale. The zombies are not impressed.','The alien invasion has been outsourced to two amateurs.'];
const sceneProps=[[[235,175],[690,175],[380,435],[745,390]],[[210,400],[495,150],[770,235],[630,455]],[[180,245],[430,405],[740,180],[810,425]],[[250,160],[510,380],[740,170],[720,465]]];
const pairs=[[[[215,185],[785,410]],[[715,180],[265,410]],[[500,260],[500,470]]],[[[180,310],[800,190]],[[750,420],[245,185]],[[470,160],[560,440]]],[[[260,430],[740,200]],[[600,170],[320,230]],[[770,440],[475,360]]]];
const stages=['The Collapsing Lobby','The Phantom Ballroom','The Broken Tower'];
const music=[{name:'Midnight Drive',feel:'Warm synthwave · 84 BPM',notes:[220,261.63,329.63,392,329.63,261.63,220,196],bass:[110,110,130.81,130.81,164.81,164.81,98,98],bpm:84}, {name:'Velvet Static',feel:'Dark lounge · 72 BPM',notes:[196,246.94,293.66,246.94,220,261.63,293.66,220],bass:[98,98,110,110,123.47,123.47,110,110],bpm:72}, {name:'Rosewater',feel:'Dream-pop · 66 BPM',notes:[261.63,329.63,392,440,392,329.63,293.66,261.63],bass:[130.81,130.81,146.83,146.83,174.61,174.61,130.81,130.81],bpm:66}, {name:'Afterglow',feel:'Moonlit ambient · 60 BPM',notes:[329.63,392,440,523.25,440,392,349.23,329.63],bass:[164.81,164.81,174.61,174.61,196,196,164.81,164.81],bpm:60}];
const getMyName=()=>nameInput.value.trim().slice(0,22)||'Wizzle';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const send = obj => { if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj)) };
function notify(text){const e=$('#toast');e.textContent=text;e.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>e.classList.remove('show'),1700)}
function err(text){$('#landingError').textContent=text}
function connect(mode,code=''){
  if(ws && ws.readyState<=1){ws.onclose=null;ws.close()}
  localStorage.setItem('after-hours-name',getMyName());
  $('#createRoom').disabled=true;$('#joinRoom').disabled=true;err('Connecting to the city...');
  let socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/ws`);ws=socket;
  socket.onopen=()=>{err('');send({type:mode,code,playerId,name:getMyName()})};
  socket.onmessage=e=>{
    let msg;try{msg=JSON.parse(e.data)}catch{return}
    if(msg.type==='welcome'){
      myIndex=msg.index;assignedCode=msg.code;history.replaceState({},'',location.pathname+'?room='+assignedCode);
      landing.hidden=true;experience.hidden=false;err('');
    }else if(msg.type==='error'){
      if(!room){err(msg.message);$('#createRoom').disabled=false;$('#joinRoom').disabled=false}else notify(msg.message)
    }else if(msg.type==='state'){
      const old=room;room=msg.room;
      if(msg.event && old){
        const event=msg.event;
        if(event.kind==='pulse')beep('win');
        if(event.kind==='complete')beep('win');
        if(event.kind==='phase'||event.kind==='stage'||event.kind==='scene')beep('transition');
        if(event.kind==='gift'&&room.rooftop.revealed)beep('win');
      }
      renderUi();
    }
  };
  socket.onclose=()=>{
    $('#createRoom').disabled=false;$('#joinRoom').disabled=false;
    if(assignedCode){$('#topStatus').innerHTML='<i class="dot"></i><span>RECONNECTING...</span>';clearTimeout(connectionTimer);connectionTimer=setTimeout(()=>connect('join',assignedCode),1700)}
    else err('Connection lost. Please try again.');
  };
  socket.onerror=()=>{if(!room)err('Cannot reach the server. Make sure it is running.')};
}
$('#createRoom').onclick=()=>connect('create');
$('#joinRoom').onclick=()=>{let c=codeInput.value.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(c))return err('Enter a valid six-character invite code.');connect('join',c)};
codeInput.addEventListener('keydown',e=>{if(e.key==='Enter')$('#joinRoom').click()});
nameInput.addEventListener('keydown',e=>{if(e.key==='Enter')$('#createRoom').click()});
const inviteUrl=()=>`${location.origin}${location.pathname}?room=${encodeURIComponent(room.code)}`;
$('#copyInvite').onclick=async()=>{try{await navigator.clipboard.writeText(inviteUrl());notify('Invitation copied')}catch{prompt('Copy invitation:',inviteUrl())}};
$('#copyCode').onclick=async()=>{try{await navigator.clipboard.writeText(room.code);notify('Room code copied')}catch{prompt('Copy room code:',room.code)}};
$('#startNight').onclick=()=>send({type:'phase',value:'comedy'});
const roomModal=$('#roomModal');
function showRoomModal(){if(!room)return;roomModal.hidden=false;$('#modalCode').textContent=room.code;
  const levels=[['comedy','01 · LAUGH','B-Movie Meltdown'],['blackout','02 · COOPERATE','The Blackout'],['rooftop','03 · CONNECT','Our Frequency'],['finale','04 · THE END','Lantern Finale']];
  $('#modalChapters').innerHTML=levels.map(([phase,number,name])=>`<button class="room-chapter ${room.phase===phase?'current':''}" data-phase="${phase}" ${myIndex!==0?'disabled':''}><span>${number}</span><strong>${name}</strong></button>`).join('');
  $('#modalNote').textContent=myIndex===0?'As host, you can revisit or skip to any experience. Your shared creations remain saved.':'Only the host changes experiences. Ask your person where you should go together.';
}
$('#backToHub').onclick=showRoomModal;
$('#closeRoomModal').onclick=()=>roomModal.hidden=true;
roomModal.addEventListener('click',e=>{if(e.target===roomModal)roomModal.hidden=true;const target=e.target.closest('[data-phase]');if(target&&myIndex===0){send({type:'phase',value:target.dataset.phase});roomModal.hidden=true}});
$('#modalCopy').onclick=async()=>{try{await navigator.clipboard.writeText(inviteUrl());notify('Invite copied')}catch{prompt('Copy invitation:',inviteUrl())}};
window.addEventListener('keydown',e=>{if(e.key==='Escape')roomModal.hidden=true});
function controlsTemplate(){
  if(room.phase==='comedy'){
    const g=room.comedy,actor=g.scene%2,isActor=myIndex===actor;
    return `<div class="aside-kicker">ACT I · THE COMEDY</div><h3 class="aside-title">${isActor?'You are the star.':'You are the director.'}</h3><p class="side-copy">${isActor?'Collect all four glowing props, then reach the EXIT sign on the right. Your person gets to make the journey hilariously difficult.':'Select a ridiculous prop, then click anywhere on the set to place it. Your job is to make the movie spectacularly chaotic—not stop your person forever.'}</p>
      <div class="stat-grid"><div class="stat"><strong>${g.props.filter(Boolean).length}<small> / 4</small></strong><small>PROPS RECOVERED</small></div><div class="stat"><strong>${g.chaos}</strong><small>CHAOS POINTS</small></div></div>
      ${isActor?`<div class="key-row"><span class="keycap">WASD</span> Move through the set</div><div class="key-row"><span class="keycap">SHIFT</span> Run for your life</div><p class="support-note">Arrow keys also work. A trap makes a funny effect but never ends your round.</p>`:`<div class="pick-tools">${[['pie','🥧','Flying pie'],['spring','✹','Jack-in-box'],['ghost','👻','Ghost'],['goo','◉','Slime']].map(([kind,ico,title])=>`<button class="tool ${selectedTrap===kind?'selected':''}" data-trap="${kind}"><span>${ico}</span>${title}</button>`).join('')}</div><p class="support-note">Click on the game world to set a trap. A new trap is available about every second.</p>`}
      ${g.finished?`<div class="grand-finale">Scene complete! The audience goes wild.</div>${myIndex===0?`<button class="primary-btn block" data-action="comedy-next">${g.scene===3?'ENTER THE BLACKOUT':'NEXT DISASTER'} ↗</button>`:'<p class="ok-msg">Waiting for the host to move to the next scene.</p>'}`:''}
      <div class="aside-footer"><span class="pill">SCENE ${g.scene+1} / 4</span><span id="sessionMessage">TWO-PLAYER LIVE</span></div>`;
  }
  if(room.phase==='blackout'){
    const b=room.blackout,role=myIndex===0?'PHYSICAL WORLD':'SPIRIT WORLD',target=pairs[b.stage][Math.min(b.pair,2)][myIndex],armed=!!b.active[myIndex];
    return `<div class="aside-kicker">ACT II · THE ADVENTURE</div><h3 class="aside-title">${role==='SPIRIT WORLD'?'Beyond the veil.':'Hold the world together.'}</h3><p class="side-copy">${myIndex===0?'You can activate the amber machinery. Your person exists in the spectral world and must answer your signal.':'You can activate the violet spirit seals. Coordinate with your person to restore the city’s power.'}</p>
    <div class="stat-grid"><div class="stat"><strong>${b.pair}<small> / 3</small></strong><small>LINKS RESTORED</small></div><div class="stat"><strong>${b.pulses}</strong><small>TOTAL POWER PULSES</small></div></div>
    <div class="progress-mini">${[0,1,2].map(i=>`<i class="${i<b.pair?'done':''}"></i>`).join('')}</div>
    <div class="key-row"><span class="keycap">WASD</span> Move through your world</div><div class="key-row"><span class="keycap">E</span> Activate nearby energy node</div><p class="support-note">Find your glowing node and stand near it. You both have 8 seconds to activate your matching nodes. Talk to each other!</p>
    <p class="ok-msg">${armed?'Your node is charged. Your person has 8 seconds to answer.':'Your current node glows with a guiding ring.'}</p>
    ${b.done?`<div class="grand-finale">The circuit is alive.</div>${myIndex===0?`<button class="primary-btn block" data-action="blackout-next">${b.stage===2?'TO THE ROOFTOP':'ENTER NEXT AREA'} ↗</button>`:'<p class="ok-msg">Waiting for the host to move ahead.</p>'}`:''}
    <div class="aside-footer"><span class="pill">CHAPTER ${b.stage+1} / 3</span><span id="sessionMessage">${role}</span></div>`;
  }
  if(room.phase==='rooftop'){
    const r=room.rooftop;
    const nav=`<div class="row-buttons">${[['music','♪ MUSIC'],['stars','✧ STARS'],['garden','❀ GARDEN']].map(([tab,label])=>`<button data-tab="${tab}" class="mini-btn ${r.tab===tab?'on':''}">${label}</button>`).join('')}</div>`;
    let content='';
    if(r.tab==='music'){
      content=`<p class="side-copy">Choose original ambient tracks for your rooftop. Change the lights, or add links to real songs you want to hear together.</p><div class="song-list">${music.map((m,i)=>`<button class="song ${r.track===i?'on':''}" data-track="${i}"><span>${esc(m.name)}<br/><small>${esc(m.feel)}</small></span>${r.track===i?'◉':'▷'}</button>`).join('')}</div><p class="field-label">ROOFTOP ATMOSPHERE</p><div class="row-buttons">${[['rose','Rose'],['violet','Violet'],['rain','Rain'],['gold','Gold']].map(([k,n])=>`<button class="mini-btn ${r.mood===k?'on':''}" data-mood="${k}">${n}</button>`).join('')}</div>
      <p class="field-label">YOUR SONGS · OPTIONAL LINKS</p><input class="queue-input" id="songTitle" placeholder="Song title" maxlength="65"/><input class="queue-input" id="songUrl" placeholder="YouTube / Spotify / SoundCloud URL"/><button class="secondary-btn block" data-action="queue-add">ADD TO SHARED JUKEBOX +</button><div class="queue-list">${r.queue.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">♪ ${esc(s.title)} <small>by ${esc(room.players[s.by]?.name)}</small> ↗</a>`).join('')}</div><p class="support-note">The original in-browser soundtrack is locally synthesized. External songs open on each device; start them together in the music service.</p>`;
    }else if(r.tab==='stars'){
      content=`<p class="side-copy">Click anywhere in the open night sky to add a star. Every new star joins your constellation. Keep drawing until you've made something neither of you could have made alone.</p><div class="stat-grid"><div class="stat"><strong>${r.stars.length}</strong><small>STARS PLACED</small></div><div class="stat"><strong>${r.stars.filter(x=>x.by===myIndex).length}</strong><small>YOUR LIGHTS</small></div></div><p class="key-row"><span class="keycap">CLICK</span> Place a glowing star</p><p class="support-note">Gold and pink stars show whose contribution is whose. They connect into one shared sky.</p>`;
    }else{
      content=`<p class="side-copy">Build a little world together. Select something lovely—or wonderfully strange—then click the lower garden terrace to plant it.</p><div class="pick-tools">${[['rose','✿','Rose'],['moon','✾','Moonflower'],['fern','❧','Fern'],['mushroom','♠','Mushroom'],['lantern','✧','Lantern'],['crystal','◇','Crystal']].map(([k,s,n])=>`<button data-plant="${k}" class="tool ${selectedPlant===k?'selected':''}"><span>${s}</span>${n}</button>`).join('')}</div><div class="stat-grid"><div class="stat"><strong>${r.plants.length}</strong><small>GARDEN OBJECTS</small></div><div class="stat"><strong>${r.plants.filter(x=>x.by===myIndex).length}</strong><small>YOUR CONTRIBUTIONS</small></div></div>${r.revealed?'<div class="ok-msg">Both surprises are here. You built this together.</div>':`<p class="field-label">A SECRET SYMBOL TO GIVE</p><div class="row-buttons">${[['heart','♥'],['moon','☾'],['key','⚿'],['star','✦']].map(([k,v])=>`<button class="mini-btn ${selectedGift===k?'on':''}" data-gift="${k}">${v}</button>`).join('')}</div><button class="secondary-btn block" data-action="roof-gift" ${r.plants.filter(x=>x.by===myIndex).length<2||r.gifts[myIndex]?'disabled':''}>${r.gifts[myIndex]?'YOUR SURPRISE IS READY ✓':'SEAL YOUR SURPRISE ✧'}</button><p class="support-note">Each person plants at least two objects, then leaves their surprise. Both surprises appear together.</p>`}`;
    }
    return `<div class="aside-kicker">ACT III · THE RECONNECTION</div><h3 class="aside-title">Our Frequency</h3>${nav}${content}<button class="primary-btn block long-cta" data-action="to-finale" ${myIndex!==0?'disabled':''}>WATCH THE LANTERNS RISE ↗</button><p class="support-note">${myIndex===0?'Move on whenever you both feel ready. You can come back later.':'The host can start the finale when you are both ready.'}</p><div class="aside-footer"><span class="pill">NO TIMERS. NO SCORES.</span><span id="sessionMessage">TAKE YOUR TIME</span></div>`;
  }
  if(room.phase==='finale'){
    const f=room.finale;
    return `<div class="aside-kicker">THE FINALE · UNTIL NEXT MIDNIGHT</div><h3 class="aside-title">A light for each of you.</h3><p class="side-copy">There are two lanterns beneath the city skyline. Each of you controls your own. Bring both lights together beneath the moon to release them into the sky.</p><div class="key-row"><span class="keycap">CLICK</span> Move your lantern</div><div class="key-row"><span class="keycap">CENTER</span> Bring it beneath the moon</div><p class="ok-msg">${f.done?'You found each other. The night is yours.':f.ready[myIndex]?'Your lantern is in place. Waiting for your person.':'Both lanterns must reach the glowing center.'}</p>${f.done?`<div class="grand-finale">Until the next midnight. ✧</div><button class="secondary-btn block" data-action="save-keepsake">SAVE OUR KEEPSAKE ↓</button>${myIndex===0?'<button class="primary-btn block" data-action="replay">START A NEW NIGHT ↗</button>':''}`:''}<p class="support-note">Your stars and garden remain in this private room. A keepsake saves a personalized image of the night.</p><div class="aside-footer"><span class="pill">THE END · FOR NOW</span><span id="sessionMessage">MADE FOR TWO</span></div>`;
  }
  return '';
}
function renderUi(){
  if(!room)return;
  const phase=room.phase, players=room.players;
  $('#roomBadge').textContent=room.code;$('#largeCode').textContent=room.code;
  $('#topStatus').innerHTML=`<i class="dot"></i><span>${players.filter(p=>p.connected).length} / 2 PRESENT · PRIVATE ROOM</span>`;
  $('#avatars').innerHTML=players.map((p,i)=>`<div class="avatar ${i===1?'second':''} ${p.connected?'':'off'}"><div class="avatar-dot">${esc(p.name[0]?.toUpperCase()||'?')}</div><div><strong>${esc(p.name)} ${i===myIndex?'(you)':''}</strong><small>${p.connected?'HERE WITH YOU':'AWAY'}</small></div></div>`).join('')+(players.length<2?'<div class="avatar off"><div class="avatar-dot">?</div><div><strong>Waiting for two</strong><small>INVITED PERSON</small></div></div>':'');
  const order=['lobby','comedy','blackout','rooftop','finale'],phaseNum=order.indexOf(phase);
  $('#chapterProgress').innerHTML=order.slice(1).map((x,i)=>`<i class="${phaseNum>=i+1?'active':''}"></i>`).join('');
  $('#chapterNote').textContent=['THE INVITATION','ACT I · LAUGHTER','ACT II · TOGETHER','ACT III · CLOSER','THE FINAL LIGHT'][phaseNum]||'';
  lobbyPanel.hidden=phase!=='lobby';playPanel.hidden=phase==='lobby';$('#lobbyFootnote').hidden=phase!=='lobby';
  $('#soundButton').hidden=phase==='lobby';
  $('#waitingText').hidden=players.length===2;
  $('#startNight').hidden=players.length<2||myIndex!==0;
  $('#guestWaiting').hidden=myIndex===0||players.length<2;
  const titles={lobby:['ACT 00 · THE ARRIVAL','The invitation','Tonight starts with a single invite.'],comedy:['ACT I · FIRST, WE LAUGH','B-Movie Meltdown','Make the worst horror movie the city has ever seen.'],blackout:['ACT II · THEN, WE FIND OUR WAY','The Blackout','Two worlds. Two sets of abilities. One way out.'],rooftop:['ACT III · FINALLY, WE SLOW DOWN','Our Frequency','Above the city, there is nowhere else you need to be.'],finale:['THE FINALE · JUST US','Until the Next Midnight','One last moment to keep.']};
  $('#actLabel').textContent=titles[phase][0];$('#actTitle').textContent=titles[phase][1];$('#actIntro').textContent=titles[phase][2];
  if(phase==='lobby')return;
  const key=phase+'|'+(room.comedy?.scene)+'|'+room.comedy?.finished+'|'+room.comedy?.props.filter(Boolean).length+'|'+room.comedy?.chaos+'|'+room.blackout?.stage+'|'+room.blackout?.pair+'|'+room.blackout?.done+'|'+room.blackout?.active?.[myIndex]+'|'+room.rooftop?.tab+'|'+room.rooftop?.mood+'|'+room.rooftop?.track+'|'+room.rooftop?.queue?.length+'|'+room.rooftop?.stars?.length+'|'+room.rooftop?.plants?.length+'|'+room.rooftop?.revealed+'|'+room.rooftop?.gifts?.[myIndex]+'|'+room.finale?.done+'|'+room.finale?.ready?.[myIndex]+'|'+selectedTrap+'|'+selectedPlant+'|'+selectedGift;
  if(sceneKey!==key){
    const currentTitle=$('#songTitle')?.value,currentUrl=$('#songUrl')?.value;
    $('#sideContent').innerHTML=controlsTemplate();
    if(currentTitle&&$('#songTitle'))$('#songTitle').value=currentTitle;
    if(currentUrl&&$('#songUrl'))$('#songUrl').value=currentUrl;
    sceneKey=key;
  }
  if(phase==='comedy'){
    $('#levelTag').textContent=`MOVIE SET ${String(room.comedy.scene+1).padStart(2,'0')}`;
    $('#levelTitle').textContent=scenes[room.comedy.scene];
    $('#canvasHint').textContent=myIndex===room.comedy.scene%2?'WASD TO MOVE · SHIFT TO RUN · GET TO EXIT':'SELECT A TRAP · CLICK TO DROP IT · MAKE IT RIDICULOUS';
    $('#gameCount').textContent=room.comedy.finished?'CUT! THAT’S A WRAP':`${room.comedy.props.filter(Boolean).length} OF 4 PROPS`;
  }else if(phase==='blackout'){
    $('#levelTag').textContent=`BLACKOUT ${String(room.blackout.stage+1).padStart(2,'0')}`;
    $('#levelTitle').textContent=stages[room.blackout.stage];
    $('#canvasHint').textContent='WASD TO MOVE · E NEAR THE GLOWING NODE';
    $('#gameCount').textContent=`${room.blackout.pair} / 3 CIRCUITS`;
  }else if(phase==='rooftop'){
    $('#levelTag').textContent='THE CITY ABOVE';$('#levelTitle').textContent='Your private rooftop';
    $('#canvasHint').textContent=room.rooftop.tab==='music'?'SET THE MOOD · LISTEN TOGETHER':room.rooftop.tab==='stars'?'CLICK THE SKY TO DRAW YOUR CONSTELLATION':'CLICK THE TERRACE TO BUILD YOUR GARDEN';
    $('#gameCount').textContent='NO RUSH · JUST TWO';
  }else{
    $('#levelTag').textContent='ONE LAST LIGHT';$('#levelTitle').textContent='The sky is ours';
    $('#canvasHint').textContent=room.finale.done?'OUR NIGHT, OUR STORY':'CLICK THE MOONLIT CENTER TO GUIDE YOUR LANTERN';
    $('#gameCount').textContent='✦';
  }
}
$('#sideContent').addEventListener('click',e=>{
  const btn=e.target.closest('button');if(!btn||!room)return;
  if(btn.dataset.trap){selectedTrap=btn.dataset.trap;sceneKey='';renderUi();beep('click')}
  if(btn.dataset.plant){selectedPlant=btn.dataset.plant;sceneKey='';renderUi();beep('click')}
  if(btn.dataset.gift){selectedGift=btn.dataset.gift;sceneKey='';renderUi();beep('click')}
  if(btn.dataset.tab)send({type:'roof:tab',tab:btn.dataset.tab});
  if(btn.dataset.track){send({type:'roof:track',index:Number(btn.dataset.track)});beep('click')}
  if(btn.dataset.mood)send({type:'roof:mood',mood:btn.dataset.mood});
  switch(btn.dataset.action){
    case 'comedy-next':send({type:'comedy:next'});break;
    case 'blackout-next':send({type:'blackout:next'});break;
    case 'queue-add':{
      const title=$('#songTitle').value.trim(),url=$('#songUrl').value.trim();
      if(!title||!url)return notify('Add both a title and a URL');
      if(!/^https:\/\/(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com|open\.spotify\.com|soundcloud\.com|music\.apple\.com)\//i.test(url))return notify('Use a supported music service URL');
      send({type:'roof:queue',title,url});$('#songTitle').value='';$('#songUrl').value='';break;
    }
    case 'roof-gift':send({type:'roof:gift',kind:selectedGift});break;
    case 'to-finale':send({type:'phase',value:'finale'});break;
    case 'save-keepsake':downloadKeepsake();break;
    case 'replay':if(confirm('Start a new night? This resets the shared garden and stars for this room.'))send({type:'reset'});break;
  }
});
function coords(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}}
canvas.addEventListener('pointerdown',e=>{
  if(!room)return;const {x,y}=coords(e);const t=Date.now();if(t-lastClickAt<100)return;lastClickAt=t;
  if(room.phase==='comedy'&&!room.comedy.finished&&myIndex!==room.comedy.scene%2){send({type:'comedy:trap',x,y,kind:selectedTrap});beep('click')}
  if(room.phase==='rooftop'){
    if(room.rooftop.tab==='stars'&&y<485){send({type:'roof:star',x,y});beep('star')}
    if(room.rooftop.tab==='garden'&&y>=315){send({type:'roof:plant',x,y,kind:selectedPlant});beep('star')}
  }
  if(room.phase==='finale'&&!room.finale.done){send({type:'finale:move',x,y});beep('star')}
});
canvas.addEventListener('pointermove',e=>{
  if(!room||room.phase!=='finale'||!e.buttons||room.finale.done)return;
  const {x,y}=coords(e);if(Date.now()-lastClickAt>100){lastClickAt=Date.now();send({type:'finale:move',x,y})}
});
window.addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','e','E'].includes(e.key))e.preventDefault();
  keys.add(e.key.toLowerCase());
  if((e.key==='e'||e.key==='E')&&room?.phase==='blackout'){send({type:'blackout:activate'});beep('click')}
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
function moveLoop(){
  if(!room||myIndex==null)return;
  let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
  let dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  if(!dx&&!dy)return;
  const t=Date.now();if(t-lastMoveAt<52)return;lastMoveAt=t;
  const v=Math.hypot(dx,dy),spd=keys.has('shift')?26:15;dx=dx/v*spd;dy=dy/v*spd;
  if(room.phase==='comedy'&&myIndex===room.comedy.scene%2&&!room.comedy.finished){const p=room.comedy.actor;send({type:'comedy:move',x:p.x+dx,y:p.y+dy})}
  if(room.phase==='blackout'&&!room.blackout.done){const p=room.blackout.chars[myIndex];send({type:'blackout:move',x:p.x+dx,y:p.y+dy})}
}
setInterval(moveLoop,30);
// Original generative mini soundtrack; no external audio assets or restricted songs.
function setupAudio(){if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume()}
function tone(freq,duration=.20,kind='sine',gain=.022,delay=0){
  if(!audio||!soundOn)return;
  const oscillator=audio.createOscillator(),amp=audio.createGain(),start=audio.currentTime+delay;
  oscillator.type=kind;oscillator.frequency.setValueAtTime(freq,start);
  amp.gain.setValueAtTime(.0001,start);amp.gain.exponentialRampToValueAtTime(gain,start+.018);amp.gain.exponentialRampToValueAtTime(.0001,start+duration);
  oscillator.connect(amp);amp.connect(audio.destination);oscillator.start(start);oscillator.stop(start+duration+.02);
}
function beep(kind){if(!soundOn)return;setupAudio();if(kind==='star'){tone(660,.16,'sine',.017);tone(880,.23,'sine',.009,.09)}else if(kind==='win'){tone(440,.22,'triangle',.025);tone(554.4,.25,'triangle',.022,.15);tone(659,.36,'triangle',.02,.3)}else if(kind==='transition'){tone(261.6,.55,'sine',.016);tone(392,.65,'sine',.014,.17)}else tone(360,.11,'triangle',.015)}
$('#soundButton').onclick=()=>{
  soundOn=!soundOn;
  $('#soundButton span').textContent=soundOn?'Sound on':'Sound off';
  if(soundOn){setupAudio();beep('star')}
};
setInterval(()=>{
  if(!room||!soundOn||room.phase==='lobby')return;
  const m=music[room.phase==='rooftop'||room.phase==='finale'?room.rooftop.track:(room.phase==='blackout'?1:0)];
  const ms=60000/m.bpm/2,step=Math.floor(Date.now()/ms);
  if(audioStep===step)return;audioStep=step;
  const ix=((step%8)+8)%8;
  tone(m.notes[ix],ms/1000*.8,'sine',room.phase==='rooftop'?.012:.009);
  if(ix%2===0)tone(m.bass[ix],ms/1000*1.5,'triangle',.009);
},85);
// Canvas utilities
function rect(x,y,w,h,color,r=0){ctx.fillStyle=color;if(r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}else ctx.fillRect(x,y,w,h)}
function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,Math.PI*2);ctx.fillStyle=color;ctx.fill()}
function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');circle(x,y,r,g)}
function text(str,x,y,size=14,color='#fff',font='sans',align='left'){ctx.fillStyle=color;ctx.textAlign=align;ctx.font=font==='serif'?`italic ${size}px Georgia`:`${size}px system-ui`;ctx.fillText(str,x,y);ctx.textAlign='left'}
function rand(i){const s=Math.sin(i*93.713+3.67)*43758.545;return s-Math.floor(s)}
function gradient(a,b){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,a);g.addColorStop(1,b);rect(0,0,W,H,g)}
function starsSky(t,count=90){for(let i=0;i<count;i++){const x=rand(i+2)*W,y=rand(i+128)*425,r=.5+rand(i+16)*1.7;ctx.globalAlpha=.17+Math.max(0,Math.sin(t*.001+i*3))*.55;circle(x,y,r,i%5===0?'#ffc7df':'#fff0e8')}ctx.globalAlpha=1}
function skyline(t,mood='rose'){
  let top=mood==='violet'?'#1c183d':mood==='gold'?'#49314c':mood==='rain'?'#111d34':'#39203e';
  gradient(top,'#0c0b1a');glow(560,120,330,mood==='gold'?'#c99d5538':'#c16d9b37');starsSky(t);
  // Moon and its soft halo
  glow(765,142,160,'#f2b4d332');circle(765,142,68,mood==='gold'?'#f2d6aa':'#eac5dc');circle(788,126,65,top);
  for(let layer=0;layer<3;layer++){
    let base=420+layer*49;
    for(let i=0;i<35;i++){
      const x=i*37+(layer*17)%35, h=35+rand(i+layer*99)*145/(layer*.7+1),w=27+rand(i+layer*39)*25;
      const c=['#2b213b','#20182f','#15111f'][layer];rect(x,base-h,w,h+170,c);
      if(layer>0)for(let py=base-h+13;py<base-9;py+=17)for(let px=x+8;px<x+w-4;px+=12)if(rand(px*.2+py*.5)>.48){rect(px,py,3,6,layer===2?'#e9aa9f59':'#e9acbe66')}
    }
  }
  rect(0,531,W,69,'#100d19');line(0,531,W,531,'#d99cb75c',3);
  if(mood==='rain'){ctx.strokeStyle='#c4cdfb35';ctx.lineWidth=1;for(let i=0;i<95;i++){let x=(rand(i+57)*1050+t*.06*(1+rand(i+12)))%1050,y=(rand(i+183)*620+t*.17*(1+rand(i+200)))%630;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-10,y+23);ctx.stroke()}}
}
function pillar(x,style){ctx.save();glow(x,410,90,style+'22');rect(x-11,140,22,370,'#262333');rect(x-17,140,34,16,style+'77');rect(x-17,493,34,16,style+'77');ctx.restore()}
function studioBackground(scene,t){
  const palette=[['#25213a','#221022','#a66083'],['#31172b','#1d0f22','#b474a8'],['#1b2940','#10151e','#79b6bd'],['#1a2240','#151126','#b581e9']][scene];gradient(palette[0],palette[1]);
  for(let i=0;i<11;i++){rect(i*110-12,50,6,480,'#ffffff0a');rect(i*110+37,50,5,480,'#ffffff06')}
  for(let i=0;i<6;i++){const x=110+i*160;glow(x,90,180,palette[2]+'35');line(x,0,x,75,'#cba5ae5c',2);circle(x,77,7,'#f5cecc')}
  rect(46,98,907,442,'#090c17a0',12);
  const floor=ctx.createLinearGradient(0,100,0,550);floor.addColorStop(0,'#2e1f38');floor.addColorStop(1,'#0e0c18');rect(60,110,880,430,floor,10);
  for(let i=0;i<=10;i++)line(65+i*88,112,65+i*88,534,'#ce91aa0e',1);
  for(let i=0;i<=8;i++)line(65,112+i*53,937,112+i*53,'#ce91aa11',1);
  // Distinct interactive movie sets.
  if(scene===0){
    rect(375,117,255,118,'#4c3246',7);rect(394,139,216,85,'#241523');for(let i=0;i<7;i++)line(395+i*31,140,395+i*31,220,'#865a6c55',3);
    rect(432,240,140,70,'#604334',10);rect(446,235,108,17,'#a17158',3);rect(485,240,35,70,'#1d111c');
    circle(492,170,25,'#f5bd67');glow(492,170,53,'#f6af5b55');
  }else if(scene===1){
    for(let i=0;i<4;i++)pillar(228+i*182,'#ba83a9');
    rect(448,134,118,84,'#4d234a',7);circle(507,168,25,'#d3adc8');line(507,134,507,218,'#f5c5c599',2);rect(490,260,80,75,'#65283c',7);
  }else if(scene===2){
    for(let i=0;i<4;i++){let x=174+i*196;rect(x,130,99,320,'#3b4850',7);for(let j=0;j<5;j++)rect(x+12,148+j*54,74,14,['#ca7c77','#c9b28e','#779f91'][j%3],3)}
    rect(430,270,150,38,'#6d8d93',6);
  }else{
    circle(492,226,83,'#683c83');glow(492,228,120,'#be7ce66c');circle(492,226,51,'#1d244f');for(let i=0;i<8;i++){const a=i/8*Math.PI*2;circle(492+78*Math.cos(a),226+78*Math.sin(a),7,'#d2a0ed')}
    for(let i=0;i<4;i++){rect(160+i*194,398,90,74,'#3c3865',10);circle(205+i*194,426,15,'#e89dd3')}
  }
  rect(856,235,72,196,'#3d354e',6);rect(859,269,65,91,'#0d1b20',5);glow(893,295,45,'#6feba63f');text('EXIT',894,249,15,'#b0f9ce','sans','center');
  for(let i=0;i<12;i++){const y=113+i*34;rect(61,y,6,12,'#ffffff0b');rect(933,y,6,12,'#ffffff0b')}
  // film grain drawn as tiny light specks, deterministic
  for(let i=0;i<38;i++){const x=65+rand(i+scene*20)*864,y=120+rand(i+121)*390;circle(x,y,.6,'#f7c3cb47')}
}
function comicProp(i,x,y,t,done){if(done)return;glow(x,y,30,'#e8ad8265');circle(x,y+13,15,'#080a17');ctx.save();ctx.translate(x,y+Math.sin(t*.004+i)*5);ctx.rotate(Math.sin(t*.002+i)*.15);rect(-11,-13,22,24,'#f5c6a5',3);rect(-7,-19,14,8,'#fff1e6',2);text(['✦','☠','★','♥'][i],0,4,17,'#8d435e','sans','center');ctx.restore()}
function character(x,y,color,role,t){
  glow(x,y,50,color+'38');circle(x,y+16,18,'#00000070');
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*.003+x)*.06);
  ctx.beginPath();ctx.moveTo(-16,13);ctx.lineTo(-20,31);ctx.lineTo(0,19);ctx.lineTo(21,31);ctx.lineTo(15,12);ctx.closePath();ctx.fillStyle=color;ctx.fill();
  circle(0,-5,16,'#f7dbca');rect(-16,-25,32,10,role==='spectral'?'#a6b3fb':'#382038',7);rect(-11,-37,22,18,role==='spectral'?'#8b80e0':'#583351',5);
  circle(-6,-6,2,'#312237');circle(6,-6,2,'#312237');circle(0,2,3,'#cc758b');ctx.restore();
}
function trapDraw(trap,t){const colors={pie:'#f8bb9f',spring:'#f8dba2',ghost:'#b8b2ff',goo:'#a3e8b9'};glow(trap.x,trap.y,39,colors[trap.kind]+'55');circle(trap.x,trap.y,19,trap.hit?'#ffffff28':'#0c0d20');text({pie:'🥧',spring:'✹',ghost:'♧',goo:'◉'}[trap.kind],trap.x,trap.y+9,27,colors[trap.kind],'sans','center');if(trap.hit)circle(trap.x,trap.y,24,'#ffffff18')}
function drawComedy(t){const g=room.comedy;studioBackground(g.scene,t);sceneProps[g.scene].forEach(([x,y],i)=>comicProp(i,x,y,t,g.props[i]));g.traps.forEach(a=>trapDraw(a,t));
  for(const effect of g.effects){let age=(Date.now()-effect.at)/2800,sz=35+age*85;glow(effect.x,effect.y,sz,`rgba(255,195,220,${Math.max(0,.25-age*.25)})`);text(['SPLAT!','BOING!','BOO!','SQUISH!'][['pie','spring','ghost','goo'].indexOf(effect.kind)],effect.x,effect.y-age*47,Math.max(14,33-age*15),'#f2c8df','serif','center')}
  character(g.actor.x,g.actor.y,'#e681ac','actor',t);
  if(g.props.every(Boolean)) {glow(894,337,90,'#8cf9bc7a');ctx.strokeStyle='#a7edba';ctx.lineWidth=3;ctx.strokeRect(863,270,57,93)}
  if(g.finished){rect(200,225,600,136,'#090a17d9',12);text('THAT’S A WRAP!',500,293,39,'#f5c7d7','serif','center');text('A beautiful disaster, made by two.',500,329,18,'#fbe8ed','sans','center')}
}
function blackoutBackground(stage,t){const palettes=[['#17213a','#150f24','#d8a477'],['#2c1b3b','#160f24','#bc94e6'],['#152a43','#0b1425','#8cceff']][stage];gradient(palettes[0],palettes[1]);
  for(let i=0;i<18;i++){let x=50+i*52;line(x,110,x,540,palettes[2]+'18',1)}for(let j=0;j<10;j++)line(50,110+j*45,950,110+j*45,palettes[2]+'18',1);
  rect(48,100,904,452,'#070c1f58',12);ctx.strokeStyle=palettes[2]+'55';ctx.lineWidth=2;ctx.strokeRect(49,102,902,448);
  if(stage===0){
    for(let i=0;i<5;i++)pillar(155+i*174,'#d4a27f');rect(396,158,210,80,'#2c1f33',10);text('THE GRAND LOBBY',501,205,17,'#a37b91','sans','center');
    for(let i=0;i<3;i++)circle(273+i*224,413,28,'#414055');
  }else if(stage===1){
    circle(500,321,203,'#4b2b5688');circle(500,321,161,'#1a1830');
    for(let i=0;i<12;i++){const a=(i/12)*Math.PI*2;circle(500+180*Math.cos(a),321+180*Math.sin(a),7,'#d5b2db70')}
    glow(500,160,100,'#f3cbbe62');for(let i=0;i<7;i++){const x=380+i*40,y=162+Math.abs(i-3)*12;line(500,117,x,y,'#c9b5cf99');circle(x,y,7,'#fad7cb')}
  }else{
    for(let i=0;i<3;i++){rect(170+i*264,188,115,268,'#232f4b',8);circle(226+i*264,280,40,'#17213c');glow(226+i*264,280,60,'#8ac4e940')}
    ctx.save();ctx.translate(500,302);ctx.rotate(t*.0002);for(let a=0;a<6;a++){line(0,0,Math.cos(a*Math.PI/3)*120,Math.sin(a*Math.PI/3)*120,'#6c9ed368',8)}ctx.restore();
  }
  for(let i=0;i<35;i++){const x=rand(i+30)*W,y=105+rand(i+170)*440,r=rand(i+10)*1.8;circle(x,y,r,'#d5d5f579')}
}
function drawNode(pt,color,isArmed,t,me){const [x,y]=pt;const pulse=Math.sin(t*.004)*7;glow(x,y,55,color+'4c');ctx.lineWidth=isArmed?5:3;ctx.strokeStyle=isArmed?'#fff4df':color;ctx.beginPath();ctx.arc(x,y,28+pulse,0,Math.PI*2);ctx.stroke();circle(x,y,19,isArmed?'#fff9ea':color);text(isArmed?'✓':'✦',x,y+7,21,'#191022','sans','center');if(me){text('YOUR NODE',x,y-52,12,'#ffecf5','sans','center')}}
function drawBlackout(t){const b=room.blackout;blackoutBackground(b.stage,t);const p=pairs[b.stage][Math.min(b.pair,2)];
  for(let i=0;i<2;i++){const color=i===0?'#efa98c':'#a69bff';drawNode(p[i],color,!!b.active[i],t,myIndex===i)}
  // An energy string links the two players without replacing distinct objectives.
  ctx.setLineDash([7,12]);line(b.chars[0].x,b.chars[0].y,b.chars[1].x,b.chars[1].y,'#b9aed648',2);ctx.setLineDash([]);
  character(b.chars[0].x,b.chars[0].y,'#eba17f','physical',t);character(b.chars[1].x,b.chars[1].y,'#a99eff','spectral',t);
  text(room.players[0]?.name||'Physical',b.chars[0].x,b.chars[0].y-44,13,'#ffd8be','sans','center');text(room.players[1]?.name||'Spirit',b.chars[1].x,b.chars[1].y-44,13,'#dcd3ff','sans','center');
  if(b.active[0]||b.active[1]){
    const time=Math.max(...b.active),left=Math.max(0,8-(Date.now()-time)/1000);
    rect(370,535,260,15,'#282037',8);rect(370,535,left/8*260,15,'#ca95cb',8);
    text(`${left.toFixed(1)}s TO LINK`,500,526,13,'#ffe5f2','sans','center');
  }
  if(b.done){rect(210,230,580,122,'#0a0b1bdf',10);text('THE CIRCUIT IS ALIVE',500,287,34,'#dcbce8','serif','center');text('You did that together.',500,322,18,'#e7dfe9','sans','center')}
}
function terrace(t,mood){skyline(t,mood);const floor=ctx.createLinearGradient(0,400,0,600);floor.addColorStop(0,'#4d334c');floor.addColorStop(1,'#1b1424');rect(0,455,1000,145,floor);rect(0,443,1000,13,'#c393ac');for(let i=0;i<14;i++)line(i*89-160,465,500+(i-7)*44,600,'#f0c5d91e');for(let i=0;i<6;i++)line(0,466+i*35,1000,466+i*35,'#f0c5d91a');
  // wrought iron balustrade behind the terrace
  for(let i=0;i<28;i++){let x=i*40;line(x,370,x,445,'#271728',5);circle(x,388,7,'#a76e88')}
  line(0,378,W,378,'#bb829f',8);line(0,444,W,444,'#bd8da5',5);
  glow(115,454,130,'#f0a19e28');glow(880,448,130,'#edb9a036');
  // rooftop seats
  rect(70,414,125,34,'#381f37',9);rect(84,400,94,20,'#bf8194',7);rect(65,443,16,18,'#301e36');rect(185,443,16,18,'#301e36');
  rect(813,413,125,34,'#382033',9);rect(828,398,93,20,'#bc7d98',7);
}
function drawPlant(p,t){const x=p.x,y=p.y,c=p.by===0?'#ef9cbb':'#b8a0f3';glow(x,y,32,c+'2b');line(x,y,x,y-24,'#7cb99a',4);
  if(p.kind==='rose'){circle(x,y-32,13,'#bf4e84');for(let i=0;i<5;i++)circle(x+Math.cos(i*1.257)*9,y-34+Math.sin(i*1.257)*9,6,'#e39bb2');circle(x,y-34,6,'#ffe2dc')}
  else if(p.kind==='moon'){for(let i=0;i<7;i++){let a=i*Math.PI*2/7;circle(x+Math.cos(a)*11,y-32+Math.sin(a)*11,7,'#dcd4ff')}circle(x,y-32,7,'#f9e4a0')}
  else if(p.kind==='fern'){for(let i=0;i<7;i++){const xx=x+Math.sin(i*.8)*13;line(x,y,xx,y-15-i*7,'#6fbd91',3);circle(xx,y-15-i*7,5,'#9acda2')}}
  else if(p.kind==='mushroom'){rect(x-3,y-24,7,20,'#eec6a5',3);ctx.beginPath();ctx.ellipse(x,y-24,17,10,0,Math.PI,Math.PI*2);ctx.closePath();ctx.fillStyle='#df7fa0';ctx.fill();circle(x-5,y-31,2,'#fff9df');circle(x+7,y-28,2,'#fff9df')}
  else if(p.kind==='lantern'){line(x,y-10,x,y-42,'#c6a3aa',2);glow(x,y-34,31,'#ffda9e66');rect(x-10,y-44,20,25,'#f3c4ad',4);rect(x-6,y-40,12,17,'#ef9b6e',2)}
  else if(p.kind==='crystal'){ctx.beginPath();ctx.moveTo(x,y-50);ctx.lineTo(x+17,y-31);ctx.lineTo(x+11,y-11);ctx.lineTo(x-11,y-11);ctx.lineTo(x-17,y-31);ctx.closePath();ctx.fillStyle='#a9a1e7';ctx.fill();line(x,y-50,x,y-11,'#e0d4fe',2)}
  circle(x,y+2,11,'#1c1924');circle(x,y+1,8,'#4b364a');
}
function constellation(stars,t){
  for(let i=0;i<stars.length;i++){
    let s=stars[i];if(i>0){let prev=stars[i-1];line(prev.x,prev.y,s.x,s.y,'#edbbdf90',1.6);glow((prev.x+s.x)/2,(prev.y+s.y)/2,12,'#d9a8df15')}
    let c=s.by===0?'#f1b5be':'#bdb1ff';glow(s.x,s.y,24,c+'74');circle(s.x,s.y,4,c);circle(s.x,s.y,1.5,'#fff');
  }
}
function drawRooftop(t){const r=room.rooftop;terrace(t,r.mood);const sky=r.tab==='stars';if(sky){rect(0,0,W,455,'#10101b60');constellation(r.stars,t);text('A CONSTELLATION OF TWO',500,96,23,'#f4dbe9','serif','center')}
  else if(r.tab==='music'){
    glow(500,450,110,'#f2bbcb64');circle(500,446,77,'#1a1424');circle(500,446,54,'#3d2b47');circle(500,446,42,'#e49cbd');circle(500,446,14,'#241426');
    ctx.save();ctx.translate(500,446);ctx.rotate(t*.0003);for(let i=0;i<12;i++){const a=i*Math.PI/6;circle(Math.cos(a)*35,Math.sin(a)*35,2,'#f7e6dd')}ctx.restore();
    text('NOW PLAYING',500,305,13,'#dec0d4','sans','center');text(music[r.track].name,500,346,39,'#fff0f4','serif','center');
    for(let i=0;i<30;i++){const h=12+Math.abs(Math.sin(i*.7+t*.003))*33;rect(350+i*10,374-h/2,4,h,'#edb8d08a',4)}
  }else{
    rect(0,465,W,135,'#3e2a37bd');text('THE LITTLE WORLD WE MADE',500,116,26,'#efd4e6','serif','center');
    r.plants.forEach(p=>drawPlant(p,t));
    if(r.revealed){glow(500,375,120,'#f1b2cb55');const sym={heart:'♥',moon:'☾',key:'⚿',star:'✦'};text(sym[r.gifts[0]]||'✦',448,362,45,'#ffb8cb','sans','center');text(sym[r.gifts[1]]||'✦',552,362,45,'#c2b4ff','sans','center');text('TWO SURPRISES, ONE GARDEN',500,401,14,'#ffe5f4','sans','center')}
  }
  if(r.tab==='music'&&r.queue.length){text(`${r.queue.length} SHARED SONG${r.queue.length===1?'':'S'} WAITING`,500,547,12,'#e3bbc8','sans','center')}
}
function drawLantern(x,y,color,t){glow(x,y,80,color+'6c');ctx.save();ctx.translate(x,y+Math.sin(t*.002+x)*9);ctx.beginPath();ctx.moveTo(-20,-20);ctx.lineTo(20,-20);ctx.lineTo(27,23);ctx.lineTo(-27,23);ctx.closePath();ctx.fillStyle=color;ctx.fill();rect(-23,-24,46,6,'#4d314b',3);rect(-24,25,48,6,'#352837',3);glow(0,0,43,'#fbdba47f');ctx.restore()}
function drawFinale(t){terrace(t,room.rooftop.mood);const f=room.finale;constellation(room.rooftop.stars,t);room.rooftop.plants.forEach(p=>drawPlant(p,t));
  glow(500,235,170,'#f9d6cc3f');ctx.strokeStyle='#f6d8d8a8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(500,235,92+Math.sin(t*.003)*8,0,Math.PI*2);ctx.stroke();
  if(f.done){
    for(let i=0;i<55;i++){const x=450+rand(i+22)*100,y=450-rand(i+61)*400-(t*.025)%(550);glow(x,y,18,'#f4b79b33');circle(x,y,2,'#fff0dc')}
    drawLantern(474,177,'#f8bbbd',t);drawLantern(526,177,'#c4adf8',t);
    text('UNTIL THE NEXT MIDNIGHT',500,320,37,'#fff1ea','serif','center');text('The night is ours to keep.',500,354,17,'#ffe4f1','sans','center');
  }else{
    f.lanterns.forEach((l,i)=>drawLantern(l.x,l.y,i===0?'#f3a1b3':'#bba6f4',t));
    text('BRING YOUR LIGHTS TOGETHER',500,100,20,'#ffe5ec','serif','center');
    text('↓  BOTH LANTERNS GO HERE  ↓',500,150,13,'#f4cadb','sans','center');
    text(room.players[0]?.name||'You',f.lanterns[0].x,f.lanterns[0].y+56,13,'#f5d4e5','sans','center');
    text(room.players[1]?.name||'Your person',f.lanterns[1].x,f.lanterns[1].y+56,13,'#e1d5ff','sans','center');
  }
}
function draw(t){requestAnimationFrame(draw);if(!room||room.phase==='lobby')return;
  ctx.save();ctx.clearRect(0,0,W,H);
  if(room.phase==='comedy')drawComedy(t);
  else if(room.phase==='blackout')drawBlackout(t);
  else if(room.phase==='rooftop')drawRooftop(t);
  else if(room.phase==='finale')drawFinale(t);
  // vignette and subtle grain; native canvas at high-DPI stays sharp when scaled.
  const shade=ctx.createRadialGradient(500,300,150,500,300,640);shade.addColorStop(0,'#00000000');shade.addColorStop(1,'#0000009a');rect(0,0,W,H,shade);
  ctx.restore();
}
requestAnimationFrame(draw);
function downloadKeepsake(){
  if(!room)return;
  const image=document.createElement('canvas');image.width=1600;image.height=1000;
  const c=image.getContext('2d');const g=c.createLinearGradient(0,0,0,1000);g.addColorStop(0,'#261a3c');g.addColorStop(1,'#0d0a17');c.fillStyle=g;c.fillRect(0,0,1600,1000);
  c.fillStyle='#f5bdcb';c.font='24px Georgia';c.textAlign='center';c.fillText('A F T E R   H O U R S',800,90);
  c.fillStyle='#fff0e9';c.font='italic 75px Georgia';c.fillText('Until the Next Midnight',800,180);
  c.font='26px Georgia';c.fillStyle='#d3b2cc';c.fillText(`${room.players.map(p=>p.name).join('  ✦  ')}    ·    ${new Date().toLocaleDateString()}`,800,235);
  // sky in a framed panel
  c.fillStyle='#151528';c.fillRect(115,280,1370,495);c.strokeStyle='#9d698c';c.lineWidth=3;c.strokeRect(115,280,1370,495);
  const st=room.rooftop.stars;st.forEach((s,i)=>{const x=115+s.x*1.37,y=280+s.y*.93;if(i){const p=st[i-1];c.beginPath();c.moveTo(115+p.x*1.37,280+p.y*.93);c.lineTo(x,y);c.strokeStyle='#efbdd190';c.lineWidth=2;c.stroke()}c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fillStyle=s.by===0?'#f3a7c4':'#b3a7ed';c.fill()});
  const flowers=['rose','moon','fern','mushroom','lantern','crystal'];
  room.rooftop.plants.forEach(p=>{const x=115+p.x*1.37,y=280+p.y*.93;c.font='36px Georgia';c.fillStyle=p.by===0?'#efa5bb':'#b9a5f6';c.fillText(({rose:'✿',moon:'✾',fern:'❧',mushroom:'♠',lantern:'✧',crystal:'◇'})[p.kind],x,y)});
  c.fillStyle='#ead1df';c.font='italic 35px Georgia';c.fillText('One city. Two hearts. Our night.',800,845);c.font='16px system-ui';c.fillStyle='#a18da8';c.fillText(`STARS ${st.length}    ·    GARDEN MEMORIES ${room.rooftop.plants.length}    ·    CHAOS ${room.comedy.chaos}`,800,904);
  const a=document.createElement('a');a.download=`after-hours-${room.code}.png`;a.href=image.toDataURL('image/png');a.click();notify('Your keepsake is saved');
}
