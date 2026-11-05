/* ===== Audio: musica, ambiente, passi, versi dello zombie (Web Audio) ===== */
const AUD={on:false,ctx:null,master:null,music:null,musicGain:null,stepAcc:0,lastStep:0};
function aCtx(){return AUD.ctx}
function noiseBuf(sec,ctx){const n=Math.floor(ctx.sampleRate*sec),b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);
  let last=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;d[i]=last*3.2}return b}
function audioInit(){
  if(AUD.ctx)return;
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  const ctx=new C();AUD.ctx=ctx;
  const master=ctx.createGain();master.gain.value=.9;master.connect(ctx.destination);AUD.master=master;
  AUD.noise=noiseBuf(2.5,ctx);
  /* --- letto d'ambiente: vento basso + pioggia lontana --- */
  const bed=ctx.createGain();bed.gain.value=.0;bed.connect(master);
  const src=ctx.createBufferSource();src.buffer=AUD.noise;src.loop=true;
  const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=420;lp.Q.value=.6;
  src.connect(lp).connect(bed);src.start();
  const rain=ctx.createBufferSource();rain.buffer=AUD.noise;rain.loop=true;rain.playbackRate.value=1.7;
  const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2600;bp.Q.value=.5;
  const rg=ctx.createGain();rg.gain.value=.075;rain.connect(bp).connect(rg).connect(master);rain.start();
  const lfo=ctx.createOscillator();lfo.frequency.value=.055;const lg=ctx.createGain();lg.gain.value=.035;
  lfo.connect(lg).connect(bed.gain);bed.gain.value=.075;lfo.start();
  AUD.bed=bed;
  /* --- musica di sottofondo (traccia dell'utente) --- */
  const el=new Audio();el.src='bgm.ogg';el.loop=true;el.preload='auto';el.crossOrigin='anonymous';
  el.volume=.13;AUD.music=el;
  el.addEventListener('error',()=>{AUD.musicFail=true});
  AUD.on=true;
}
function audioStart(){
  audioInit();if(!AUD.ctx)return;
  if(AUD.ctx.state==='suspended')AUD.ctx.resume();
  if(AUD.music)AUD.music.play().catch(()=>{});
}
function audioToggle(){
  if(!AUD.ctx){audioStart();return true}
  const m=AUD.master.gain.value>0.01;
  AUD.master.gain.value=m?0:.9;
  if(AUD.music){if(m)AUD.music.pause();else AUD.music.play().catch(()=>{})}
  return !m;
}
/* passo su pietra bagnata */
function sfxStep(run,vol=1){
  const ctx=AUD.ctx;if(!ctx)return;const t=ctx.currentTime;
  const s=ctx.createBufferSource();s.buffer=AUD.noise;s.playbackRate.value=.8+Math.random()*.5;
  const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=(run?1500:1100)+Math.random()*500;f.Q.value=1.1;
  const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime((run?.42:.28)*vol,t+.006);
  g.gain.exponentialRampToValueAtTime(.0001,t+(run?.17:.22));
  s.connect(f).connect(g).connect(AUD.master);s.start(t);s.stop(t+.3);
  const w=ctx.createBufferSource();w.buffer=AUD.noise;w.playbackRate.value=2.4;
  const hf=ctx.createBiquadFilter();hf.type='highpass';hf.frequency.value=3200;
  const wg=ctx.createGain();wg.gain.setValueAtTime(0,t);wg.gain.linearRampToValueAtTime(.085*vol,t+.01);wg.gain.exponentialRampToValueAtTime(.0001,t+.13);
  w.connect(hf).connect(wg).connect(AUD.master);w.start(t);w.stop(t+.2);
}
/* strascico dei piedi dello zombie */
function sfxDrag(pan,vol){
  const ctx=AUD.ctx;if(!ctx||vol<.02)return;const t=ctx.currentTime;
  const s=ctx.createBufferSource();s.buffer=AUD.noise;s.playbackRate.value=.5+Math.random()*.2;
  const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=620+Math.random()*260;f.Q.value=2.2;
  const g=ctx.createGain();const d=.34+Math.random()*.2;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.24*vol,t+.12);g.gain.linearRampToValueAtTime(.0001,t+d);
  const p=ctx.createStereoPanner?ctx.createStereoPanner():null;if(p)p.pan.value=pan;
  s.connect(f).connect(g);(p?g.connect(p).connect(AUD.master):g.connect(AUD.master));s.start(t);s.stop(t+d+.1);
}
/* lamento con flanger + chorus */
function sfxMoan(pan,vol){
  const ctx=AUD.ctx;if(!ctx||vol<.02)return;const t=ctx.currentTime,dur=1.6+Math.random()*1.3;
  const out=ctx.createGain();out.gain.value=vol*.72;
  const p=ctx.createStereoPanner?ctx.createStereoPanner():null;
  if(p){out.connect(p);p.pan.value=pan;p.connect(AUD.master)}else out.connect(AUD.master);
  // flanger: ritardo corto modulato, con feedback
  const dry=ctx.createGain();dry.gain.value=.55;dry.connect(out);
  const fl=ctx.createDelay(0.05);fl.delayTime.value=.004;
  const flLfo=ctx.createOscillator();flLfo.frequency.value=.33;const flAmt=ctx.createGain();flAmt.gain.value=.0032;
  flLfo.connect(flAmt).connect(fl.delayTime);flLfo.start(t);flLfo.stop(t+dur+1);
  const fb=ctx.createGain();fb.gain.value=.62;fl.connect(fb);fb.connect(fl);
  const flG=ctx.createGain();flG.gain.value=.65;fl.connect(flG).connect(out);
  // chorus: secondo ritardo, più lento e profondo
  const ch=ctx.createDelay(0.06);ch.delayTime.value=.022;
  const chLfo=ctx.createOscillator();chLfo.frequency.value=.9;const chAmt=ctx.createGain();chAmt.gain.value=.006;
  chLfo.connect(chAmt).connect(ch.delayTime);chLfo.start(t);chLfo.stop(t+dur+1);
  const chG=ctx.createGain();chG.gain.value=.5;ch.connect(chG).connect(out);
  // sorgente: due oscillatori stonati + rumore di gola, filtrati come una voce
  const f1=ctx.createBiquadFilter();f1.type='bandpass';f1.frequency.value=520;f1.Q.value=5;
  const f2=ctx.createBiquadFilter();f2.type='bandpass';f2.frequency.value=1180;f2.Q.value=7;
  const mix=ctx.createGain();mix.gain.value=0;
  const env=mix.gain;const base=78+Math.random()*26;
  env.setValueAtTime(0,t);env.linearRampToValueAtTime(.5,t+.35);env.setValueAtTime(.5,t+dur*.6);env.linearRampToValueAtTime(0,t+dur);
  for(const [type,det,g0] of [['sawtooth',0,.5],['sawtooth',11,.4],['triangle',-7,.3]]){
    const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(base*(1+det/600),t);
    o.frequency.linearRampToValueAtTime(base*.78*(1+det/600),t+dur);
    const vib=ctx.createOscillator();vib.frequency.value=4.4+Math.random();const vg=ctx.createGain();vg.gain.value=3.2;
    vib.connect(vg).connect(o.frequency);vib.start(t);vib.stop(t+dur+.1);
    const og=ctx.createGain();og.gain.value=g0;o.connect(og).connect(mix);o.start(t);o.stop(t+dur+.1);
  }
  const br=ctx.createBufferSource();br.buffer=AUD.noise;br.loop=true;const bg=ctx.createGain();bg.gain.value=.12;
  const bf=ctx.createBiquadFilter();bf.type='bandpass';bf.frequency.value=900;bf.Q.value=1.4;
  br.connect(bf).connect(bg).connect(mix);br.start(t);br.stop(t+dur+.1);
  mix.connect(f1);mix.connect(f2);f1.connect(dry);f2.connect(dry);f1.connect(fl);f2.connect(fl);f1.connect(ch);f2.connect(ch);
}
/* passi del giocatore in base alla distanza percorsa */
function audioFootsteps(dt,speed,run){
  if(!AUD.ctx||speed<.2)return;
  AUD.stepAcc+=speed*dt;
  const stride=run?1.22:.78;
  if(AUD.stepAcc>=stride){AUD.stepAcc=0;sfxStep(run,run?1:.85)}
}
