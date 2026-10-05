    mountImmersive(){
      if(this.scene3d)return;
      if(this.$('render-status')){this.sound=new global.LabAudio();this.scene3d=new global.MolecularScene(this);return;}
      const style=document.createElement('style');style.textContent=IMMERSIVE_CSS;this.shadowRoot.append(style);
      const vessel=this.shadowRoot.querySelector('.vessel');
      vessel.insertAdjacentHTML('beforeend',`<div class="scene-footer"><div class="scene-hint teaching"><span>Drag gently to rotate</span><span class="render-status" id="render-status">Starting 3D</span></div><button class="btn" id="reset-view">Reset View</button></div>`);
      this.$('replay').insertAdjacentHTML('beforeend','<div class="spatial-energy" id="spatial-energy" hidden></div><div class="demo-note" id="demo-note"></div>');
      this.shadowRoot.querySelector('.replay-options').insertAdjacentHTML('beforeend','<button id="compare-catalyst" hidden>Add catalyst · same energy</button>');
      this.$('compare-catalyst').addEventListener('click',()=>{this.setFactor('catalyst',this.model.ea<1?0:1);this.playing=true;this.updateUI();});
      this.$('particles').tabIndex=0;this.$('particles').setAttribute('aria-label','3D molecular chamber. Drag to rotate. Arrow keys rotate; Home resets the view.');
      const actions=this.shadowRoot.querySelector('.actions');for(const id of ['reset','slow','play'])actions.prepend(this.$(id));
      actions.insertAdjacentHTML('beforeend','<button class="btn sound-label" id="sound" aria-pressed="false">Sound off</button>');
      this.shadowRoot.querySelector('.left').append(actions);
      const right=this.shadowRoot.querySelector('.right');right.append(this.shadowRoot.querySelector('.rate-box'));right.insertAdjacentHTML('beforeend','<div class="live-stats"><div><strong id="total-collisions">0</strong><span>Collisions</span></div><div><strong id="total-products">0</strong><span>Products</span></div></div>');
      this.shadowRoot.querySelector('.workspace').insertAdjacentHTML('beforeend','<div class="studio-foot"><span><b>Form 4 Chemistry</b> · 7.4 Collision Theory</span><span>Qualitative model · continuous sample · illustrative energies</span></div>');
      this.sound=new global.LabAudio();this.scene3d=new global.MolecularScene(this);
      this.$('sound').addEventListener('click',()=>{this.sound.enable(!this.sound.enabled);this.$('sound').textContent=this.sound.enabled?'Sound on':'Sound off';this.$('sound').setAttribute('aria-pressed',String(this.sound.enabled));this.localizeUI();});
      this.$('reset-view').addEventListener('click',()=>this.scene3d.resetView());
      this.$('particles').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home')this.scene3d.resetView();else this.scene3d.rotateView(e.key==='ArrowLeft'?.12:e.key==='ArrowRight'?-.12:0,e.key==='ArrowUp'?.08:e.key==='ArrowDown'?-.08:0);}});
      this.localizeUI();
    }
    connectedCallback(){if(this.frame)return;this.mountImmersive();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this);this.resizeObserver.observe(this.$('particles'));this.resize();this.updateUI();this.last=0;this.frame=requestAnimationFrame(t=>this.tick(t));}
    disconnectedCallback(){cancelAnimationFrame(this.frame);this.frame=0;this.resizeObserver?.disconnect();this.scene3d?.dispose();this.sound?.dispose();this.scene3d=null;}
    setFactor(factor,level=0){
      const preserveDemo=this.replay&&factor==='catalyst'&&this.model.factor==='catalyst';
      if(this.replay&&!preserveDemo)this.backToParticles(false);
      this.model.configure(factor,level);this.$('factor-range').value=this.model.level*100;
      if(preserveDemo){this.replay.time=1.5;this.replay.stage='';this.replay.sounded=false;}
      this.updateUI();this.updateMeters();this.emitState();
    }
    reset(){this.model=new CollisionModel();this.replay=null;this.beforeReplayPlaying=null;this.panel=null;this.$('replay').hidden=true;this.$('playback').open=false;this.playing=!this.reducedMotion;this.slow=false;this.labels=true;this.recent=[];this.bubbles=[];this.lastCollision=null;this.accumulator=0;this.lastSampleTime=-1;this.displayEa=1.45;this.scene3d?.resetView();this.$('factor-range').value=0;this.updateUI();this.updateMeters();this.emitState();}
    showCollision(kind='success'){
      if(!['success','wrong','low'].includes(kind))throw new RangeError('Unknown collision example');
      if(!this.replay){this.beforeReplayPlaying=this.playing;this.scene3d?.beginDemo();}
      this.replay={kind,time:0,stage:'',sounded:false};this.playing=true;this.$('replay').hidden=false;
      this.shadowRoot.querySelectorAll('[data-case]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.case===kind)));this.updateUI();this.emitState();
    }
    backToParticles(emit=true){this.replay=null;this.$('replay').hidden=true;if(this.beforeReplayPlaying!==null)this.playing=this.beforeReplayPlaying;this.beforeReplayPlaying=null;this.updateUI();if(emit)this.emitState();}
    setPanel(panel){this.panel=panel;this.updateUI();this.resize();this.emitState();}
    resize(){
      this.scene3d?.resize();for(const id of ['energy','energy-spread','rate','experiment']){const canvas=this.$(id),r=canvas.getBoundingClientRect();if(!r.width||!r.height)continue;const dpr=Math.min(global.devicePixelRatio||1,2),cw=Math.round(r.width*dpr),ch=Math.round(r.height*dpr);if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}const ctx=canvas.getContext('2d'),scale=this.displayScale||1;ctx.setTransform(dpr*scale,0,0,dpr*scale,0,0);this.contexts[id]={ctx,w:r.width/scale,h:r.height/scale};}this.graphClock=1;
    }
    tick(now){
      const dt=this.last?Math.min((now-this.last)/1000,.08):0;this.last=now;this.frameDt=dt;this.visualClock+=dt;const simDt=dt*(this.slow?.25:1);
      if(this.playing){
        if(this.replay){this.replay.time+=simDt;if(this.replay.time>=8.9)this.backToParticles();}
        else{this.accumulator+=simDt;while(this.accumulator>=1/120){const events=this.model.step(1/120);this.recent.push(...events);for(const event of events){this.lastCollision={...event,stamp:this.visualClock};if(event.effective)this.bubbles.push({age:0,x:38+(Math.sin(event.time*21.79)+1)*14.5});this.dispatchEvent(new CustomEvent('lab-collision',{detail:{time:event.time,energy:event.energy,activationEnergy:event.ea,orientation:event.orientation,effective:event.effective},bubbles:true,composed:true}));}this.accumulator-=1/120;}for(const b of this.bubbles)b.age+=simDt;this.bubbles=this.bubbles.filter(b=>b.age<3.2);}
      }
      if(!this.playing)this.model.updatePopulation(dt);
      if(this.model.time-(this.lastSampleTime??-1)>=.5){this.lastSampleTime=this.model.time;this.dispatchEvent(new CustomEvent('lab-sample',{detail:this.model.snapshot(),bubbles:true,composed:true}));}
      const blend=this.reducedMotion?1:1-Math.exp(-dt*6);this.displayEa=lerp(this.displayEa,this.model.ea,blend);this.displayTemperature=lerp(this.displayTemperature,this.model.temperature,blend);
      this.uiClock+=dt;if(this.uiClock>.15){this.updateMeters();this.uiClock=0;this.$('total-collisions').textContent=this.model.collisions;this.$('total-products').textContent=this.model.effective*2;this.$('speed').textContent=this.t(`Thermal speed · ${Math.sqrt(this.model.temperature).toFixed(2)}×`);}
      this.$('compare-catalyst').hidden=this.model.factor!=='catalyst';const compareText=this.t(this.model.ea<1?'Remove catalyst · same energy':'Add catalyst · same energy');if(this.$('compare-catalyst').textContent!==compareText)this.$('compare-catalyst').textContent=compareText;
      this.scene3d?.update(dt);this.graphClock=(this.graphClock||0)+dt;if(this.graphClock>.075){this.draw();this.graphClock=0;}this.frame=requestAnimationFrame(t=>this.tick(t));
    }
    draw(){this.drawEnergy();this.drawEnergySpread();this.drawRate();this.drawExperiment();}
    collisionReading(){if(this.replay){const r=this.replay;return {...CollisionModel.demo(r.kind,this.model.ea),alpha:1,progress:ease((r.time-2.5)/1.2)};}if(!this.lastCollision)return null;const age=this.visualClock-this.lastCollision.stamp;return age<2?{...this.lastCollision,alpha:clamp((2-age)/.5,0,1)}:null;}
    drawEnergySpread(){
      const c=this.clear('energy-spread');if(!c)return;const {ctx,w,h}=c,left=24,right=w-12,bottom=h-25,temperature=this.displayTemperature;
      const x=e=>left+e/7*(right-left),density=e=>2/Math.sqrt(Math.PI)*Math.pow(1.5/temperature,1.5)*Math.sqrt(e)*Math.exp(-1.5*e/temperature),y=e=>bottom-40*density(e);
      ctx.font='10px "Segoe UI",sans-serif';ctx.fillStyle=COLORS.muted;ctx.fillText(this.t('Kinetic energy distribution'),left,13,w-30);
      ctx.beginPath();ctx.moveTo(x(this.displayEa),bottom);for(let e=this.displayEa;e<=7;e+=.025)ctx.lineTo(x(e),y(e));ctx.lineTo(right,bottom);ctx.closePath();ctx.fillStyle='#7faa8952';ctx.fill();ctx.strokeStyle='#819ca0';ctx.lineWidth=1.6;ctx.beginPath();for(let e=0;e<=7;e+=.025){if(e===0)ctx.moveTo(x(e),y(e));else ctx.lineTo(x(e),y(e));}ctx.stroke();
      if(this.model.factor==='catalyst'){ctx.strokeStyle='#9ba9ad';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(x(1.45),bottom-30);ctx.lineTo(x(1.45),bottom);ctx.stroke();ctx.setLineDash([]);}
      ctx.strokeStyle='#507a5d';ctx.beginPath();ctx.moveTo(x(this.displayEa),bottom-32);ctx.lineTo(x(this.displayEa),bottom);ctx.stroke();ctx.fillStyle='#41654a';ctx.fillText('Eₐ',x(this.displayEa)+4,bottom-24);ctx.strokeStyle=COLORS.line;ctx.beginPath();ctx.moveTo(left,bottom);ctx.lineTo(right,bottom);ctx.stroke();ctx.textAlign='center';ctx.font='9px "Segoe UI",sans-serif';ctx.fillStyle=COLORS.muted;ctx.fillText(this.t('Kinetic energy →  ·  shaded fraction ≥ Eₐ'),w/2,h-3,w-8);ctx.textAlign='left';
    }
