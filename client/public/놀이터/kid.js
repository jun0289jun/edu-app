// 공용 소리 (Web Audio, 오프라인/파일 실행 가능)
window.KID = (function(){
  var ctx;
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
    LB_URL:'',
    // API 규격:
    //  POST 본문(text/plain, JSON): {name, avatar, game, score, ts}  → (name,game)별 '최고점'만 남기고 갱신
    //  GET  응답(JSON): { games: { <게임키>: [ {name,avatar,score}, ... 점수 내림차순 ] , ... } }
    //  응답 헤더에 CORS 필요: Access-Control-Allow-Origin: *
    GAMES:{ starcatch:['⭐','별잡기'], snake:['🐍','뱀 게임'], maze:['🌀','미로'], kobasket:['🔤','한영바구니'],
            mathquiz:['🧮','계산기'], numbers:['🔢','숫자키'], typing:['⌨️','타자연습'], trace:['✍️','따라쓰기'] },
    profile:function(){ try{ return JSON.parse(localStorage.getItem('kid_profile')||'null'); }catch(e){ return null; } },
    setProfile:function(name,avatar){ try{ localStorage.setItem('kid_profile',JSON.stringify({name:String(name).slice(0,12),avatar:avatar||'🐥'})); this.flushQueue(); }catch(e){} },
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
      }catch(e){ cb(null,'error'); } }
  };
})();
try{ setTimeout(function(){ if(window.KID) KID.flushQueue(); },1200); }catch(e){}
