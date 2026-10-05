/* Three-dimensional, fixed-step qualitative chemistry model. No renderer dependency. */
(function(global){
  'use strict';
  const B=2.7, R=.43, BOX=[9,4.5,4.5], clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  class Collision3DModel {
    constructor(seed=7124){this.seed=seed;this.nextId=0;this.particles=[];this.effects=[];this.events=[];this.solids=[];this.time=0;this.collisions=0;this.effective=0;this.series=[{time:0,products:0}];this.sampleAt=0;this.temperature=1;this.solidBlend=0;this.configure('concentration',0);this.particles.forEach(p=>p.fade=1);}
    random(){this.seed=(1664525*this.seed+1013904223)>>>0;return (this.seed+1)/4294967297;}
    normal(){return Math.sqrt(-2*Math.log(this.random()))*Math.cos(Math.PI*2*this.random());}
    direction(){const z=2*this.random()-1,a=this.random()*Math.PI*2,r=Math.sqrt(1-z*z);return [r*Math.cos(a),r*Math.sin(a),z];}
    static qualifies(energy,ea,orientation){return energy>=ea&&orientation;}
    static demo(kind,ea){const energy=kind==='low'?.96:1.94,orientation=kind!=='wrong';return {energy,ea,orientation,effective:this.qualifies(energy,ea,orientation)};}
    configure(factor,level){
      if(!['concentration','temperature','surface','catalyst'].includes(factor))throw new RangeError('Unknown factor: '+factor);
      this.factor=factor;this.level=clamp(Number(level)||0,0,1);
      if(factor==='surface')this.level=Math.round(this.level*2)/2;if(factor==='catalyst')this.level=this.level>=.5?1:0;
      this.targetTemperature=factor==='temperature'?1+3*this.level:1;
      this.ea=factor==='catalyst'&&this.level>=.5?.58:1.45;
      this.n=factor==='surface'?1+Math.round(this.level*2):1;
      this.count=factor==='concentration'?36+4*Math.round(this.level*18):36;
      const active=this.particles.filter(p=>!p.retiring);
      if(active.length>this.count)active.slice(this.count).forEach(p=>p.retiring=true);
      for(let i=active.length;i<this.count;i++)this.particles.push(this.create(i));
      this.particles.forEach((p,i)=>{p.type=factor==='surface'?0:i%2;});
      const old=this.solids;this.solids=[];
      if(factor==='surface'){
        const side=3.6/this.n,gap=this.solidGap=1.5;
        for(let x=0;x<this.n;x++)for(let y=0;y<this.n;y++)for(let z=0;z<this.n;z++)this.solids.push({x:(x-(this.n-1)/2)*(side+gap),y:(y-(this.n-1)/2)*(side+gap)-.35,z:(z-(this.n-1)/2)*(side+gap),side});
        for(const p of this.particles)if(this.insideSolid(p,.5)){this.place(p);p.fade=0;}
      }
      this.conditionAt=this.time;
    }
    create(i){
      const d=this.direction(),axis=this.direction();
      // The same 18 deterministic speed quantiles are repeated as population grows.
      // Quantiles of the 3D Maxwell kinetic-energy distribution, normalised to mean E=1.
      const energies=[.077,.171,.251,.326,.401,.477,.556,.639,.727,.823,.928,1.047,1.185,1.351,1.561,1.850,2.311,3.450];
      const speed=B*Math.sqrt(2*energies[i%18]*this.temperature);
      const p={id:this.nextId++,x:0,y:0,z:0,vx:d[0]*speed,vy:d[1]*speed,vz:d[2]*speed,ax:axis[0],ay:axis[1],az:axis[2],spin:(this.random()-.5)*1.3,type:this.factor==='surface'?0:i%2,cooldown:0,fade:0,hidden:0};
      this.place(p);p.px=p.x;p.py=p.y;p.pz=p.z;return p;
    }
    insideSolid(p,pad=R){return this.solids.some(s=>Math.abs(p.x-s.x)<s.side/2+pad&&Math.abs(p.y-s.y)<s.side/2+pad&&Math.abs(p.z-s.z)<s.side/2+pad);}
    place(p){for(let t=0;t<500;t++){p.x=(this.random()*2-1)*8.2;p.y=(this.random()*2-1)*3.8;p.z=(this.random()*2-1)*3.8;if(!this.insideSolid(p)&&!this.particles.some(q=>q!==p&&Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z)<R*2))break;}p.px=p.x;p.py=p.y;p.pz=p.z;}
    record(x,y,z,energy,orientation,success,a,b){
      this.collisions++;if(success)this.effective++;
      const e={time:this.time,x,y,z,energy,ea:this.ea,orientation,effective:success,age:0,a:a?{...a}:null,b:b?{...b}:null};this.effects.push(e);this.events.push(e);return e;
    }
    updatePopulation(dt){for(const p of this.particles)p.fade=clamp(p.fade+dt*(p.retiring?-2.5:2.5),0,1);this.particles=this.particles.filter(p=>!p.retiring||p.fade>0);}
    step(dt){
      this.time+=dt;this.events=[];this.updatePopulation(dt);
      const temp=this.temperature+(this.targetTemperature-this.temperature)*(1-Math.exp(-dt*5));
      const thermal=Math.sqrt(temp/this.temperature);this.temperature=temp;
      for(const e of this.effects)e.age+=dt;this.effects=this.effects.filter(e=>e.age<(e.effective?1.4:.35));
      for(const p of this.particles){
        p.vx*=thermal;p.vy*=thermal;p.vz*=thermal;
        p.cooldown=Math.max(0,p.cooldown-dt);
        p.px=p.x;p.py=p.y;p.pz=p.z;
        if(p.hidden>0){p.hidden-=dt;if(p.hidden<=0){this.place(p);p.fade=0;}continue;}
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
        const ang=p.spin*dt,c=Math.cos(ang),s=Math.sin(ang),ax=p.ax;p.ax=ax*c-p.az*s;p.az=ax*s+p.az*c;
        for(const [pos,vel,limit] of [['x','vx',BOX[0]],['y','vy',BOX[1]],['z','vz',BOX[2]]]){if(p[pos]<-limit+R){p[pos]=-limit+R;p[vel]=Math.abs(p[vel]);}if(p[pos]>limit-R){p[pos]=limit-R;p[vel]=-Math.abs(p[vel]);}}
        for(const solid of this.solids){
          const h=solid.side/2,qx=clamp(p.x,solid.x-h,solid.x+h),qy=clamp(p.y,solid.y-h,solid.y+h),qz=clamp(p.z,solid.z-h,solid.z+h),dx=p.x-qx,dy=p.y-qy,dz=p.z-qz,d=Math.hypot(dx,dy,dz);
          if(d>=R||d<.00001)continue;const nx=dx/d,ny=dy/d,nz=dz/d,v=p.vx*nx+p.vy*ny+p.vz*nz;
          p.x=qx+nx*(R+.002);p.y=qy+ny*(R+.002);p.z=qz+nz*(R+.002);
          if(v>=0)continue;
          const energy=(p.vx*p.vx+p.vy*p.vy+p.vz*p.vz)/(2*B*B),orientation=Math.abs(p.ax*nx+p.ay*ny+p.az*nz)<.7,success=Collision3DModel.qualifies(energy,this.ea,orientation);
          if(p.cooldown<=0&&!p.retiring){this.record(qx,qy,qz,energy,orientation,success,p,null);if(success){p.hidden=1.3;p.fade=0;}}p.cooldown=.25;
          p.vx-=2*v*nx;p.vy-=2*v*ny;p.vz-=2*v*nz;
        }
      }
      this.particles=this.particles.filter(p=>!p.retiring||p.fade>0);
      for(let i=0;i<this.particles.length;i++)for(let j=i+1;j<this.particles.length;j++){
        const a=this.particles[i],b=this.particles[j];if(a.hidden>0||b.hidden>0||a.retiring||b.retiring)continue;
        const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=Math.hypot(dx,dy,dz);if(d>=2*R||d<.00001)continue;
        const nx=dx/d,ny=dy/d,nz=dz/d,rvx=a.vx-b.vx,rvy=a.vy-b.vy,rvz=a.vz-b.vz,v=rvx*nx+rvy*ny+rvz*nz,over=(2*R-d)/2;
        a.x-=nx*over;a.y-=ny*over;a.z-=nz*over;b.x+=nx*over;b.y+=ny*over;b.z+=nz*over;if(v<=0)continue;
        const energy=(rvx*rvx+rvy*rvy+rvz*rvz)/(4*B*B),orientation=Math.abs(a.ax*b.ax+a.ay*b.ay+a.az*b.az)>.65&&Math.abs(a.ax*nx+a.ay*ny+a.az*nz)<.82;
        const relevant=this.factor!=='surface'&&a.type!==b.type&&a.cooldown<=0&&b.cooldown<=0,success=relevant&&Collision3DModel.qualifies(energy,this.ea,orientation);
        if(relevant)this.record((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,energy,orientation,success,a,b);
        a.vx-=v*nx;a.vy-=v*ny;a.vz-=v*nz;b.vx+=v*nx;b.vy+=v*ny;b.vz+=v*nz;
        if(success){a.hidden=b.hidden=1.3;a.fade=b.fade=0;a.cooldown=b.cooldown=1.6;}
      }
      if(this.time>=this.sampleAt){this.series.push({time:this.time,products:this.effective*2});this.sampleAt=this.time+.5;if(this.series.length>241)this.series.shift();}
      return this.events;
    }
    snapshot(){return {factor:this.factor,level:this.level,particleCount:this.count,temperatureRelative:this.temperature,targetTemperature:this.targetTemperature,activationEnergy:this.ea,solidPieces:this.factor==='surface'?this.n**3:0,exposedAreaRelative:this.n,solidVolume:this.factor==='surface'?3.6**3:0,time:this.time,collisions:this.collisions,effectiveCollisions:this.effective,products:this.effective*2,series:this.series.map(p=>({...p}))};}
  }
  global.Collision3DModel=Collision3DModel;if(typeof module!=='undefined')module.exports={Collision3DModel};
})(typeof window!=='undefined'?window:globalThis);
