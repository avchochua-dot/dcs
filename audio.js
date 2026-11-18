/* AVC OTS 04.15 — procedural training sound, independent of plant control.
 * No recordings or network downloads. RPM controls pitch; P/gate controls texture.
 * Exported pure projection and event latch also run in the Node verification suite.
 */
(function(root){
 'use strict';
 const bounded=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:0));
 const alarmKey=a=>[a.area,a.id,a.code,a.t].join('|');
 const defaults={enabled:true,master:.55,machine:.65,alarm:.6,effects:.65,h1:1,h2:1};
 function settings(input={}){const out={...defaults,enabled:typeof input.enabled==='boolean'?input.enabled:true};for(const k of Object.keys(defaults))if(k!=='enabled'&&input[k]!==undefined)out[k]=bounded(input[k]);return out;}
 function projectUnit(unit,index=0){
  const s=unit.s||{},d=unit.devices||{},rpm=bounded(s.rpm,0,900),ratio=rpm/375;
  const gate=bounded(d.gate?.value??s.gate,0,100)/100;
  const bypass=bounded(d.bypass?.value??s.bypass,0,100)/100,dp=bounded(s.deltaP,0,100)/100;
  const spinning=rpm>.1,rotation=bounded(ratio),load=bounded(Math.max(0,+s.p||0)/105);
  const sc=s.workingMode==='SC'&&(+s.draft||100)<47.85;
  const wet=!sc&&(+s.inlet>1||+d.inlet?.value>1);
  const flow=wet?Math.max(load,gate*.78):0;
  return {index,rpm,load,gate,bypass,dp,spinning,trip:!!s.lockout,
   pitch:Math.max(8,50*ratio)*(index===1?1.003:1),
   rotor:spinning?(rotation**.7)*(.065+.045*load):0,
   rumble:spinning?(rotation**.8)*(.11+.19*flow):0,
   water:flow>0?Math.sqrt(flow)*.29:0,
   field:s.excited&&spinning?.025:0,
   bypassGain:bypass>.001&&dp>.001?.23*Math.sqrt(bypass)*Math.sqrt(dp):0,
   bypassFrequency:1000+2100*Math.sqrt(dp),waterFrequency:300+1250*flow,
   aux:(s.coolingPump||s.pumpA||s.pumpB||s.lift)?.026:0};
 }
 function projectPlant(plant){return {units:plant.units.map(projectUnit),alarms:plant.allAlarms||[],events:plant.events||[],time:plant.t||0};}
 class EventLatch {
  constructor(){this.hushed=new Set();this.lastId=0;this.initialized=false;}
  reset(plant){this.hushed.clear();this.lastId=Math.max(0,...(plant.events||[]).map(e=>e.id));this.initialized=true;
   for(const a of plant.allAlarms||[]){const m=/^UNIT-([12])$/.exec(a.area),silent=m?plant.units[+m[1]-1]?.s.silenced:plant.units.every(u=>u.s.silenced);if(silent)this.hushed.add(alarmKey(a));}
  }
  silence(plant){for(const a of plant.allAlarms||[])this.hushed.add(alarmKey(a));}
  read(plant){
   if(!this.initialized)this.reset(plant);
   const alarms=plant.allAlarms||[],keys=new Set(alarms.map(alarmKey));for(const k of this.hushed)if(!keys.has(k))this.hushed.delete(k);
   const pending=alarms.filter(a=>!a.ack&&a.priority!=='INFO'&&!this.hushed.has(alarmKey(a)));
   const horn=pending.some(a=>a.priority==='TRIP')?'trip':pending.length?'alarm':'none';
   const fresh=(plant.events||[]).filter(e=>e.id>this.lastId).sort((a,b)=>a.id-b.id);this.lastId=Math.max(this.lastId,...fresh.map(e=>e.id));
   // Only feedback emits a clack. Commands, failed movements and stale import logs cannot.
   const breakers=fresh.filter(e=>e.kind==='FEEDBACK'&&/^(?:CB\d+|ACB[-\w]*) (?:CLOSE|OPEN) POSITION\b/.test(e.message)).map(e=>({id:e.id,closed:/ CLOSE POSITION/.test(e.message),unit:e.area==='UNIT-1'?0:e.area==='UNIT-2'?1:null}));
   return {horn,pending:pending.length,breakers};
  }
 }
 function noiseBuffer(ctx){const n=ctx.sampleRate*6,b=ctx.createBuffer(1,n,ctx.sampleRate),data=b.getChannelData(0);let seed=72341;for(let i=0;i<n;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296)*2-1;}return b;}
 function smooth(param,value,time,tau=.16){param.setTargetAtTime(Number.isFinite(value)?value:0,time,tau);}
 class SoundEngine {
  constructor({contextFactory,storage}={}){this.factory=contextFactory;this.storage=storage;this.prefs=settings();try{this.prefs=settings(JSON.parse(storage?.getItem('avc-ots-audio-1')||'{}'));}catch{}
   this.ctx=null;this.error='';this.latch=new EventLatch();this.scene=null;this.paused=true;this.hidden=false;this.horn='none';this.pending=0;this.lastHorn='none';this.nextHorn=0;this.oneShots=new Set();this.shotCount=0;this.feedbackCount=0;
  }
  set(key,value){if(!Object.hasOwn(defaults,key))return;this.prefs=settings({...this.prefs,[key]:value});try{this.storage?.setItem('avc-ots-audio-1',JSON.stringify(this.prefs));}catch{}if(!this.prefs.enabled)this.cancelShots();this.apply();}
  async unlock(){
   try{if(!this.ctx){const C=root.AudioContext||root.webkitAudioContext;if(!this.factory&&!C)throw Error('Trình duyệt không hỗ trợ âm thanh mô phỏng.');this.init(this.factory?this.factory():new C());}
    if(this.ctx.state==='suspended')await this.ctx.resume();this.error='';this.apply();return this.ctx.state==='running';
   }catch(e){this.error='Chưa bật được âm thanh. Nhấn BẬT ÂM THANH để thử lại.';return false;}
  }
  init(ctx){
   this.ctx=ctx;this.master=ctx.createGain();this.master.gain.value=0;this.compressor=ctx.createDynamicsCompressor();this.compressor.threshold.value=-18;this.compressor.knee.value=18;this.compressor.ratio.value=5;this.compressor.attack.value=.005;this.compressor.release.value=.22;
   this.machineBus=ctx.createGain();this.alarmBus=ctx.createGain();this.effectsBus=ctx.createGain();for(const bus of [this.machineBus,this.alarmBus,this.effectsBus])bus.connect(this.compressor);
   this.compressor.connect(this.master);this.analyser=ctx.createAnalyser();this.analyser.fftSize=512;this.master.connect(this.analyser);this.analyser.connect(ctx.destination);this.meterData=new Float32Array(512);this.noise=noiseBuffer(ctx);
   this.voices=[0,1].map(i=>this.createVoice(i));this.apply();
  }
  createVoice(index){
   const c=this.ctx,pan=c.createStereoPanner();pan.pan.value=index? .27:-.27;pan.connect(this.machineBus);
   const trim=c.createGain();trim.connect(pan);
   const wave=c.createPeriodicWave(new Float32Array([0,0,0,0,0,0,0,0]),new Float32Array([0,1,.33,.18,.1,.06,.04,.02]));
   const rotor=c.createOscillator();rotor.setPeriodicWave(wave);const rotorGain=c.createGain();rotorGain.gain.value=0;rotor.connect(rotorGain);rotorGain.connect(trim);rotor.start();
   const hum=c.createOscillator();hum.frequency.value=100+(index?.35:0);const fieldGain=c.createGain();fieldGain.gain.value=0;hum.connect(fieldGain);fieldGain.connect(trim);hum.start();
   const layer=(type,frequency,q)=>{const src=c.createBufferSource();src.buffer=this.noise;src.loop=true;const filter=c.createBiquadFilter();filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;const gain=c.createGain();gain.gain.value=0;src.connect(filter);filter.connect(gain);gain.connect(trim);src.start(0,index?1.43:.17);return {src,filter,gain};};
   return {trim,rotor,rotorGain,hum,fieldGain,rumble:layer('lowpass',260,.7),water:layer('lowpass',1200,.65),bypass:layer('bandpass',2400,.65),aux:layer('bandpass',190,.8)};
  }
  reset(plant){this.latch.reset(plant);this.cancelShots();this.feedbackCount=0;this.horn='none';this.pending=0;this.lastHorn='none';this.nextHorn=0;this.scene=projectPlant(plant);}
  silence(plant){this.latch.silence(plant);this.cancelShots('horn');this.horn='none';this.lastHorn='none';}
  update(plant,{paused=false,hidden=false}={}){
   this.scene=projectPlant(plant);this.paused=paused;this.hidden=hidden;
   const events=this.latch.read(plant);this.horn=events.horn;this.pending=events.pending;
   const audible=this.prefs.enabled&&!paused&&!hidden;
   if(!audible)this.cancelShots();
   if(this.ctx&&audible){
    for(const e of events.breakers.slice(-4)){this.breaker(e.closed,e.unit);this.feedbackCount++;}
    if(this.horn!==this.lastHorn){this.cancelShots('horn');this.nextHorn=this.ctx.currentTime;this.lastHorn=this.horn;}
    if(this.horn!=='none'&&this.ctx.currentTime>=this.nextHorn){this.signal(this.horn);this.nextHorn=this.ctx.currentTime+(this.horn==='trip'?1.45:2.5);}
   }else this.lastHorn='none';
   this.apply();
  }
  apply(){if(!this.ctx)return;const t=this.ctx.currentTime,on=this.prefs.enabled&&!this.paused&&!this.hidden;
   smooth(this.master.gain,on?this.prefs.master:0,t,.04);smooth(this.machineBus.gain,this.prefs.machine,t);smooth(this.alarmBus.gain,this.prefs.alarm,t,.04);smooth(this.effectsBus.gain,this.prefs.effects,t,.04);
   this.voices.forEach((v,i)=>{const s=this.scene?.units[i]||projectUnit({s:{}},i);smooth(v.trim.gain,this.prefs[i?'h2':'h1'],t);smooth(v.rotor.frequency,s.pitch,t,.12);smooth(v.rotorGain.gain,s.rotor,t);smooth(v.fieldGain.gain,s.field,t);smooth(v.rumble.gain.gain,s.rumble,t);smooth(v.water.gain.gain,s.water,t);smooth(v.water.filter.frequency,s.waterFrequency,t);smooth(v.bypass.gain.gain,s.bypassGain,t,.08);smooth(v.bypass.filter.frequency,s.bypassFrequency,t,.12);smooth(v.aux.gain.gain,s.aux,t);});
  }
  register(src,gain,kind){const entry={src,gain,kind};this.oneShots.add(entry);this.shotCount++;src.onended=()=>{this.oneShots.delete(entry);try{src.disconnect();gain.disconnect();}catch{}};return entry;}
  tone(frequency,start,duration,volume,kind='horn'){
   const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(volume,start+.012);g.gain.setValueAtTime(volume,start+duration-.025);g.gain.linearRampToValueAtTime(0,start+duration);o.connect(g);g.connect(this.alarmBus);this.register(o,g,kind);o.start(start);o.stop(start+duration+.01);
  }
  signal(kind){if(!this.ctx)return;const t=this.ctx.currentTime+.01;if(kind==='trip'){for(let j=0;j<4;j++)this.tone(j%2?650:920,t+j*.21,.17,.19);}else{this.tone(740,t,.16,.16);this.tone(740,t+.27,.16,.16);}}
  breaker(closed,unit=null){
   if(!this.ctx)return;const c=this.ctx,t=c.currentTime+.01,src=c.createBufferSource();src.buffer=this.noise;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=closed?1400:1900;const g=c.createGain(),pan=c.createStereoPanner();pan.pan.value=unit===0?-.3:unit===1?.3:0;
   g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.33,t+.004);g.gain.exponentialRampToValueAtTime(.001,t+.16);src.connect(filter);filter.connect(g);g.connect(pan);pan.connect(this.effectsBus);this.register(src,g,'breaker');src.onended=()=>{for(const n of [src,filter,g,pan])try{n.disconnect();}catch{}for(const entry of this.oneShots)if(entry.src===src)this.oneShots.delete(entry);};src.start(t,closed?.7:1.6,.18);
  }
  cancelShots(kind){const t=this.ctx?.currentTime||0;for(const entry of [...this.oneShots]){if(kind&&entry.kind!==kind)continue;try{entry.gain.gain.cancelScheduledValues(t);entry.gain.gain.setTargetAtTime(0,t,.008);entry.src.stop(t+.04);}catch{}this.oneShots.delete(entry);}}
  test(kind){if(!this.ctx||!this.prefs.enabled||this.hidden||this.paused)return false;this.cancelShots();if(kind==='breaker')this.breaker(true);else this.signal(kind==='trip'?'trip':'alarm');return true;}
  status(){let rms=0;if(this.analyser){this.analyser.getFloatTimeDomainData(this.meterData);for(const v of this.meterData)rms+=v*v;rms=Math.sqrt(rms/this.meterData.length);}return {state:this.ctx?.state||'locked',error:this.error,enabled:this.prefs.enabled,paused:this.paused,hidden:this.hidden,horn:this.horn,pending:this.pending,db:rms>1e-7?Math.max(-80,20*Math.log10(rms)):-80,scene:this.scene,feedbackCount:this.feedbackCount,shots:this.oneShots.size};}
 }
 root.__AVCAudio={SoundEngine,EventLatch,projectUnit,projectPlant,settings};
})(typeof window!=='undefined'?window:globalThis);
