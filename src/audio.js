(function(global){
 class LabAudio{
  constructor(){this.enabled=false;}
  enable(value){this.enabled=value;if(value){this.ctx ||= new (global.AudioContext||global.webkitAudioContext)();this.ctx.resume();}}
  impact(success){if(!this.enabled||!this.ctx)return;const c=this.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(success?520:210,t);o.frequency.exponentialRampToValueAtTime(success?290:150,t+.18);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.25);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.28);}
  dispose(){this.ctx?.close();}
 }
 global.LabAudio=LabAudio;
})(window);
