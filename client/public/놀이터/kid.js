// 공용 소리 (Web Audio, 오프라인/파일 실행 가능)
window.KID = (function(){
  var ctx;
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function ac(){ try{ if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)(); if(ctx.state==='suspended') ctx.resume(); }catch(e){} return ctx; }
  function tone(freq,dur,type,vol,when){
    try{ var c=ac(); if(!c) return; var t=c.currentTime+(when||0);
      var o=c.createOscillator(), g=c.createGain();
      o.type=type||'sine'; o.frequency.value=freq; g.gain.value=vol||0.14;
      o.connect(g); g.connect(c.destination); o.start(t);
      g.gain.exponentialRampToValueAtTime(0.0008, t+(dur||0.15)); o.stop(t+(dur||0.15));
    }catch(e){}
  }
  return {
    click:function(){ tone(600,0.08,'square',0.10); },
    pop:  function(){ tone(880,0.09,'triangle',0.16); },
    type: function(){ tone(380+Math.random()*380,0.05,'sine',0.09); },
    good: function(){ tone(660,0.12,'sine',0.15); tone(880,0.16,'sine',0.15,0.11); tone(1180,0.22,'sine',0.15,0.24); },
    bad:  function(){ tone(180,0.28,'sawtooth',0.10); },
    star: function(){ tone(1046,0.10,'triangle',0.16); tone(1568,0.14,'triangle',0.16,0.09); },
    fanfare:function(){ [523,659,784,1046].forEach(function(f,i){ tone(f,0.2,'triangle',0.16,i*0.12); }); },
    // 숫자 → 한국어 (12333 → "만이천삼백삼십삼", 100000000 → "일억")
    numKor:function(n){
      n=parseInt(n,10); if(isNaN(n)) return String(n);
      if(n===0) return '영';
      var neg=n<0; n=Math.abs(n);
      var D=['','일','이','삼','사','오','육','칠','팔','구'];
      var S=['','십','백','천'];      // 일의자리~천의자리
      var B=['','만','억','조','경'];  // 4자리 묶음 단위
      var groups=[], s=String(n);
      while(s.length){ groups.unshift(s.slice(-4)); s=s.slice(0,-4); }
      var out='';
      for(var gi=0; gi<groups.length; gi++){
        var g=parseInt(groups[gi],10); if(g===0) continue;
        var bIdx=groups.length-1-gi;         // 0=일단위,1=만,2=억,3=조...
        var gs=String(g), w='';
        for(var i=0;i<gs.length;i++){
          var d=parseInt(gs[i],10); if(d===0) continue;
          var pos=gs.length-1-i;             // 0=일,1=십,2=백,3=천
          w += (d===1 && pos>0) ? S[pos] : D[d]+S[pos];  // 십/백/천의 1은 '일' 생략
        }
        // 만은 계수 1이면 '만'(일만 아님), 억·조는 '일억'·'일조' 유지
        if(bIdx===1 && g===1) w='만'; else w+=B[bIdx];
        out+=w;
      }
      return (neg?'마이너스 ':'')+out;
    },
    // 최고점수 (localStorage)
    hiGet:function(key){ return parseInt(localStorage.getItem('hi_'+key)||'0',10); },
    hiSet:function(key,score){ var h=this.hiGet(key); if(score>h){ localStorage.setItem('hi_'+key,String(score)); this.submitScore(key,score); return true; } return false; },
    // 음성 읽어주기 (Web Speech API). lang: 'ko'(기본) | 'en'
    speak:function(text,lang){
      try{
        if(!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        var u=new SpeechSynthesisUtterance(String(text));
        u.lang=(lang==='en')?'en-US':'ko-KR';
        u.rate=parseFloat(localStorage.getItem('tts_rate')||'0.8'); u.pitch=1.05;
        var vs=window.speechSynthesis.getVoices().filter(function(v){ return v.lang && v.lang.toLowerCase().indexOf(u.lang.slice(0,2))===0; });
        if(vs.length) u.voice=vs[0];
        window.speechSynthesis.speak(u);
      }catch(e){}
    },

    // ===== 온라인 랭킹 (리더보드) =====
    // ▼ Manus가 만든 API 주소를 여기에 넣으세요. 비어있으면 오프라인(로컬 기록만).
    LB_URL:'/api/leaderboard',
    PROFILES_URL:'/api/profiles',   // 프로필 목록(있으면 사용, 없으면 랭킹에서 유추)
    WORKS_URL:'/api/works',
    // API 규격:
    //  POST 본문(text/plain, JSON): {name, avatar, game, score, ts}  → (name,game)별 '최고점'만 남기고 갱신
    //  GET  응답(JSON): { games: { <게임키>: [ {name,avatar,score}, ... 점수 내림차순 ] , ... } }
    //  응답 헤더에 CORS 필요: Access-Control-Allow-Origin: *
    GAMES:{ starcatch:['⭐','별잡기'], snake:['🐍','뱀 게임'], maze:['🌀','미로'], kobasket:['🔤','한영바구니'],
            mathquiz:['🧮','계산기'], numbers:['🔢','숫자키'], typing:['⌨️','타자연습'], trace:['✍️','따라쓰기'] },
    profile:function(){ try{ return JSON.parse(localStorage.getItem('kid_profile')||'null'); }catch(e){ return null; } },
    profiles:function(){ try{ return JSON.parse(localStorage.getItem('kid_profiles')||'[]'); }catch(e){ return []; } },
    setProfile:function(name,avatar){ try{
      name=String(name).slice(0,12); avatar=avatar||'🐥'; var p={name:name,avatar:avatar};
      localStorage.setItem('kid_profile',JSON.stringify(p));
      var list=this.profiles(), i=-1; for(var k=0;k<list.length;k++){ if(list[k].name===name){ i=k; break; } }
      if(i>=0) list[i]=p; else list.push(p);
      localStorage.setItem('kid_profiles',JSON.stringify(list.slice(0,20)));
      this.saveProfileServer(name,avatar);   // 서버에도 등록 → 다른 기기에서 보임
      this.flushQueue();
    }catch(e){} },
    removeProfile:function(name,cb){ try{ var list=this.profiles().filter(function(x){return x.name!==name;});
      localStorage.setItem('kid_profiles',JSON.stringify(list));
      var cur=this.profile(); if(cur&&cur.name===name) localStorage.removeItem('kid_profile');
      this.deleteProfileServer(name,cb);   // 서버에서도 삭제(점수·작품 포함)
    }catch(e){ if(cb)cb(false); } },
    deleteProfileServer:function(name,cb){ if(!this.PROFILES_URL){ if(cb)cb(false); return; }
      try{ fetch(this.PROFILES_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({action:'delete',name:name})}).then(function(r){ if(cb)cb(r.ok); }).catch(function(){ if(cb)cb(false); }); }
      catch(e){ if(cb)cb(false); } },
    // 서버에 프로필 등록(이름·아바타). 실패해도 조용히 넘어감.
    saveProfileServer:function(name,avatar,oldName,cb){ if(!this.PROFILES_URL){if(cb)cb(false);return;}
      try{ fetch(this.PROFILES_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({name:name,avatar:avatar,oldName:oldName||''})})
        .then(function(r){if(cb)cb(r.ok);}).catch(function(){if(cb)cb(false);}); }catch(e){if(cb)cb(false);} },
    renameProfile:function(oldName,name,avatar,cb){ try{
      oldName=String(oldName||'').slice(0,12); name=String(name||'').slice(0,12); avatar=avatar||'🐥';
      if(!oldName||!name){if(cb)cb(false);return;}
      var list=this.profiles().filter(function(p){return p.name!==oldName&&p.name!==name;});
      list.push({name:name,avatar:avatar});
      localStorage.setItem('kid_profiles',JSON.stringify(list.slice(0,20)));
      var cur=this.profile(); if(cur&&cur.name===oldName)localStorage.setItem('kid_profile',JSON.stringify({name:name,avatar:avatar}));
      try{
        var works=JSON.parse(localStorage.getItem('kid_shared_works')||'[]');
        works.forEach(function(w){
          if(w.owner===oldName){w.owner=name;w.ownerAvatar=avatar;}
          if(Array.isArray(w.recipients))w.recipients=w.recipients.map(function(x){return x===oldName?name:x;});
        });
        localStorage.setItem('kid_shared_works',JSON.stringify(works));
      }catch(e){}
      this.saveProfileServer(name,avatar,oldName,function(ok){if(cb)cb(ok);});
    }catch(e){if(cb)cb(false);} },
    // 서버 친구목록 조회. 전용 엔드포인트 없으면 랭킹 데이터에서 유추. 로컬과 병합(이름 dedupe).
    fetchProfiles:function(cb){ var self=this, local=this.profiles();
      function merge(serverList){ var map={}, smap={}, out=[];
        (serverList||[]).forEach(function(p){ if(p&&p.name&&!map[p.name]){ map[p.name]=1; smap[p.name]=1; out.push({name:p.name,avatar:p.avatar||'🐥',pin:p.pin||null}); } });
        local.forEach(function(p){ if(p&&p.name&&!map[p.name]){ map[p.name]=1; out.push({name:p.name,avatar:p.avatar||'🐥',pin:p.pin||null});
          if(!smap[p.name] && location.protocol!=='file:') self.saveProfileServer(p.name,p.avatar||'🐥','',null);
        } });
        cb(out); }
      function derive(){ self.fetchRanks(function(d){ var list=[],seen={},g=(d&&d.games)||{};
        Object.keys(g).forEach(function(k){ (g[k]||[]).forEach(function(r){ if(r&&r.name&&!seen[r.name]){ seen[r.name]=1; list.push({name:r.name,avatar:r.avatar||'🐥'}); } }); });
        merge(list); }); }
      if(!this.PROFILES_URL){ derive(); return; }
      try{ fetch(this.PROFILES_URL,{method:'GET'}).then(function(r){ if(!r.ok) throw 0; return r.json(); })
        .then(function(d){ merge((d&&d.profiles)||[]); }).catch(derive);
      }catch(e){ derive(); } },
    // ===== 가족 작품 공유 =====
    _saveWorkLocal:function(work){
      try{
        var list=JSON.parse(localStorage.getItem('kid_shared_works')||'[]');
        work.id=work.id||('local-'+Date.now()+'-'+Math.random().toString(36).slice(2));
        list.unshift(work);
        localStorage.setItem('kid_shared_works',JSON.stringify(list.slice(0,100)));
        return true;
      }catch(e){return false;}
    },
    _getWorksLocal:function(profile,type){
      try{return JSON.parse(localStorage.getItem('kid_shared_works')||'[]').filter(function(w){
        return w&&w.type===type&&(w.recipients||[]).indexOf(profile)>=0;
      });}catch(e){return [];}
    },
    // 이미지 dataURL을 서버 한도(1.6MB) 아래로 축소·재인코딩. 실패하면 원본 그대로.
    _compressImage:function(dataURL,cb){
      try{
        if(typeof dataURL!=='string' || dataURL.indexOf('data:image')!==0){ cb(dataURL); return; }
        var img=new Image();
        img.onload=function(){
          try{
            var MAX=1280, w=img.width||MAX, h=img.height||MAX;
            if(w>MAX||h>MAX){ var s=Math.min(MAX/w,MAX/h); w=Math.round(w*s); h=Math.round(h*s); }
            var c=document.createElement('canvas'); c.width=w; c.height=h;
            var cx=c.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,w,h); cx.drawImage(img,0,0,w,h);
            var q=0.82, out=c.toDataURL('image/jpeg',q), tries=0;
            while(out.length>1400000 && tries<6){ q=Math.max(0.35,q-0.12); out=c.toDataURL('image/jpeg',q); tries++; }
            cb(out.length<dataURL.length?out:dataURL);
          }catch(e){ cb(dataURL); }
        };
        img.onerror=function(){ cb(dataURL); };
        img.src=dataURL;
      }catch(e){ cb(dataURL); }
    },
    shareWork:function(type,content,title,cb){
      var self=this,p=this.profile(); cb=cb||function(){};
      if(!p||!p.name){ cb(false,'먼저 이름을 골라요!'); return; }
      this.fetchProfiles(function(list){
        list=(list||[]).filter(function(x){ return x&&x.name&&x.name!==p.name; });
        if(!list.length){ cb(false,'보낼 친구가 아직 없어요'); return; }
        var old=document.getElementById('kid-share-modal'); if(old)old.remove();
        var modal=document.createElement('div'); modal.id='kid-share-modal';
        modal.style.cssText='position:fixed;inset:0;background:#0009;z-index:999;display:flex;align-items:center;justify-content:center;padding:14px;';
        var panel=document.createElement('div');
        panel.style.cssText='background:#fff;border-radius:24px;padding:18px;width:min(540px,95vw);max-height:86vh;overflow:auto;text-align:center;box-shadow:0 12px 40px #0006;';
        panel.innerHTML='<h2 style="margin:0 0 14px;font-size:28px">🎁 누구에게 보낼까?</h2>';
        var grid=document.createElement('div'); grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;';
        var chosen={};
        list.forEach(function(friend){
          var b=document.createElement('button'); b.type='button';
          b.style.cssText='border:4px solid transparent;border-radius:18px;background:#f1f5ff;padding:14px 8px;font:800 20px Malgun Gothic;cursor:pointer;';
          b.innerHTML='<div style="font-size:44px">'+esc(friend.avatar||'🐥')+'</div>'+esc(friend.name);
          b.onclick=function(){ chosen[friend.name]=!chosen[friend.name]; b.style.borderColor=chosen[friend.name]?'#5b6cf0':'transparent'; self.pop(); };
          grid.appendChild(b);
        });
        var actions=document.createElement('div'); actions.style.cssText='display:flex;gap:10px;margin-top:16px;';
        var cancel=document.createElement('button'); cancel.textContent='닫기'; cancel.style.cssText='flex:1;border:0;border-radius:16px;padding:14px;font-size:20px;font-weight:800;';
        var send=document.createElement('button'); send.textContent='🎁 보내기'; send.style.cssText='flex:2;border:0;border-radius:16px;padding:14px;background:#8be78b;font-size:22px;font-weight:800;';
        cancel.onclick=function(){ modal.remove(); };
        send.onclick=function(){
          var recipients=Object.keys(chosen).filter(function(k){return chosen[k];});
          if(!recipients.length){ send.textContent='친구를 골라요!'; self.bad(); return; }
          send.disabled=true; send.textContent='보내는 중…';
          function doSend(finalContent){
            var body={owner:p.name,ownerAvatar:p.avatar||'🐥',type:type,title:title||'',content:finalContent,recipients:recipients,ts:Date.now()};
            try{ fetch(self.WORKS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)})
              .then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(){self.good();modal.remove();cb(true,'🎁 보냈어요!');})
              .catch(function(){if(self._saveWorkLocal(body)){self.good();modal.remove();cb(true,'🎁 보냈어요!');return;}send.disabled=false;send.textContent='다시 보내기';self.bad();cb(false,'저장 공간을 확인해요');}); }
            catch(e){if(self._saveWorkLocal(body)){self.good();modal.remove();cb(true,'🎁 보냈어요!');return;}send.disabled=false;send.textContent='다시 보내기';cb(false,'저장 공간을 확인해요');}
          }
          if(type==='memo'){ doSend(content); } else { self._compressImage(content,doSend); }  // 사진·그림은 축소 후 전송
        };
        actions.appendChild(cancel); actions.appendChild(send); panel.appendChild(grid); panel.appendChild(actions); modal.appendChild(panel);
        modal.onclick=function(e){if(e.target===modal)modal.remove();}; document.body.appendChild(modal);
      });
    },
    openInbox:function(type,onOpen,cb){
      var self=this,p=this.profile(); cb=cb||function(){};
      if(!p||!p.name){cb(false,'먼저 이름을 골라요!');return;}
      function showInbox(works){
          works=(works||[]).filter(function(w){return w.owner!==p.name;});
          var old=document.getElementById('kid-inbox-modal');if(old)old.remove();
          var modal=document.createElement('div');modal.id='kid-inbox-modal';modal.style.cssText='position:fixed;inset:0;background:#0009;z-index:999;display:flex;align-items:center;justify-content:center;padding:14px;';
          var panel=document.createElement('div');panel.style.cssText='background:#fff;border-radius:24px;padding:18px;width:min(720px,95vw);max-height:88vh;overflow:auto;box-shadow:0 12px 40px #0006;';
          panel.innerHTML='<div style="display:flex;align-items:center"><h2 style="flex:1;margin:0 0 14px;font-size:28px">🎁 받은 작품</h2><button id="kid-inbox-close" style="border:0;border-radius:14px;padding:10px 16px;font-size:18px;font-weight:800">닫기</button></div>';
          var grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;';
          if(!works.length)grid.innerHTML='<p style="font-size:20px;font-weight:800;color:#777">아직 받은 작품이 없어요.</p>';
          works.forEach(function(w){
            var card=document.createElement('button');card.type='button';card.style.cssText='border:0;border-radius:18px;background:#f4f6fa;padding:10px;text-align:left;overflow:hidden;cursor:pointer;font-family:inherit;';
            var preview=type==='memo'?'<div style="font-size:19px;font-weight:800;white-space:pre-wrap;max-height:120px;overflow:hidden">'+esc(w.content)+'</div>':'<img alt="" style="width:100%;height:140px;object-fit:contain;background:#fff;border-radius:12px" src="'+esc(w.content)+'">';
            card.innerHTML=preview+'<div style="margin-top:8px;font-size:17px;font-weight:800">'+esc(w.ownerAvatar||'🐥')+' '+esc(w.owner)+'</div>';
            card.onclick=function(){self.pop();modal.remove();onOpen(w);};grid.appendChild(card);
          });
          panel.appendChild(grid);modal.appendChild(panel);document.body.appendChild(modal);
          panel.querySelector('#kid-inbox-close').onclick=function(){modal.remove();};modal.onclick=function(e){if(e.target===modal)modal.remove();};cb(true);
      }
      try{fetch(this.WORKS_URL+'?profile='+encodeURIComponent(p.name)+'&type='+encodeURIComponent(type))
        .then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(data){showInbox(data.works||[]);})
        .catch(function(){showInbox(self._getWorksLocal(p.name,type));});}
      catch(e){showInbox(this._getWorksLocal(p.name,type));}
    },
    // 신기록 시 hiSet에서 자동 호출 (게임 코드 수정 불필요)
    submitScore:function(game,score){
      var p=this.profile(); if(!p||!p.name||!this.LB_URL) return;
      this._send({name:p.name,avatar:p.avatar,game:game,score:score,ts:Date.now()});
    },
    _send:function(rec){ var self=this;
      try{ fetch(this.LB_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(rec)})
        .then(function(r){ if(!r.ok) throw 0; }).catch(function(){ self._queue(rec); });
      }catch(e){ this._queue(rec); } },
    _queue:function(rec){ try{ var q=JSON.parse(localStorage.getItem('kid_lbq')||'[]'); q.push(rec); if(q.length>200)q=q.slice(-200); localStorage.setItem('kid_lbq',JSON.stringify(q)); }catch(e){} },
    // 오프라인 중 쌓인 점수를 온라인 되면 전송
    flushQueue:function(){ if(!this.LB_URL) return; var q; try{ q=JSON.parse(localStorage.getItem('kid_lbq')||'[]'); }catch(e){ return; }
      if(!q.length) return; localStorage.removeItem('kid_lbq'); var self=this; q.forEach(function(rec){ self._send(rec); }); },
    fetchRanks:function(cb){ if(!this.LB_URL){ cb(null,'offline'); return; }
      try{ fetch(this.LB_URL,{method:'GET'}).then(function(r){ return r.json(); })
        .then(function(d){ cb(d,null); }).catch(function(){ cb(null,'error'); });
      }catch(e){ cb(null,'error'); } },
    // 게임 화면 구석에 그 게임 '1등' 배지 (데이터 있을 때만 표시, 탭하면 랭킹으로)
    showTop:function(game){
      this.fetchRanks(function(d,e){
        if(e||!d||!d.games) return; var arr=d.games[game]; if(!arr||!arr.length) return;
        if(document.getElementById('kidtop')) return;
        var t=arr[0], el=document.createElement('div'); el.id='kidtop';
        el.style.cssText='position:fixed;bottom:10px;left:10px;z-index:30;background:#fff;border-radius:14px;'+
          'padding:6px 12px;font-size:15px;font-weight:800;box-shadow:0 3px 8px #0004;display:flex;gap:6px;align-items:center;cursor:pointer;opacity:.92;';
        el.innerHTML='🏆<span style="font-size:19px">'+esc(t.avatar||'🐥')+'</span><span>'+esc(t.name)+'</span><span style="color:#ff7f3a">'+(parseInt(t.score,10)||0)+'</span>';
        el.onclick=function(){ location.href='랭킹.html'; };
        document.body.appendChild(el);
      });
    },

    // ===== 개인 작품 서버 백업 (캐시 삭제해도 유지) =====
    // 저장: 나만 볼 수 있는 작품을 서버 DB에 백업 (recipients=[] = 공유 없음)
    _selfSave:function(type,content,id,title,cb){
      var p=this.profile();
      if(!p||!p.name||!this.WORKS_URL){if(cb)cb(false);return;}
      try{fetch(this.WORKS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({id:String(id),owner:p.name,ownerAvatar:p.avatar||'🐥',
          type:type,title:title||'',content:content,recipients:[],ts:Date.now()})})
        .then(function(r){if(cb)cb(r.ok);}).catch(function(){if(cb)cb(false);});}
      catch(e){if(cb)cb(false);}
    },
    // 로드: 서버에서 내가 저장한 작품 목록 반환
    _selfLoad:function(type,cb){
      var p=this.profile();
      if(!p||!p.name||!this.WORKS_URL){cb([]);return;}
      try{fetch(this.WORKS_URL+'?profile='+encodeURIComponent(p.name)+'&type='+encodeURIComponent(type))
        .then(function(r){if(!r.ok)throw 0;return r.json();})
        .then(function(d){cb((d.works||[]).filter(function(w){return w.owner===p.name;}));})
        .catch(function(){cb([]);});}
      catch(e){cb([]);}
    },
    // 삭제: 서버에서 특정 작품 제거
    _selfDelete:function(id,cb){
      var p=this.profile();
      if(!p||!p.name||!this.WORKS_URL){if(cb)cb(false);return;}
      try{fetch(this.WORKS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({action:'delete',id:String(id),owner:p.name})})
        .then(function(r){if(cb)cb(r.ok);}).catch(function(){if(cb)cb(false);});}
      catch(e){if(cb)cb(false);}
    }
  };
})();
try{ setTimeout(function(){ if(window.KID) KID.flushQueue(); },1200); }catch(e){}
// 게임 페이지면 파일명으로 자동 인식해 1등 배지 표시(게임 코드 수정 불필요)
(function(){ var map={'별잡기':'starcatch','뱀':'snake','미로':'maze','한영바구니':'kobasket','계산기':'mathquiz','숫자키':'numbers','타자연습':'typing','따라쓰기':'trace'};
  try{ var f=decodeURIComponent((location.pathname.split('/').pop()||'')).replace(/\.html$/,''); var g=map[f];
    if(g) window.addEventListener('load',function(){ try{ if(window.KID) KID.showTop(g); }catch(e){} }); }catch(e){} })();
