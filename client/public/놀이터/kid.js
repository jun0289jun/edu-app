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
    // 최고점수 (localStorage)
    hiGet:function(key){ return parseInt(localStorage.getItem('hi_'+key)||'0',10); },
    hiSet:function(key,score){ var h=this.hiGet(key); if(score>h){ localStorage.setItem('hi_'+key,String(score)); return true; } return false; },
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
    }
  };
})();
