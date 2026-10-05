/* Three.js presentation. Physics lives in simulation.js; all resources are pooled. */
(function(global){
 const T=global.THREE, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);}, mix=(a,b,t)=>a+(b-a)*t;
 class MolecularScene {
  constructor(lab){
   this.lab=lab;this.canvas=lab.$('particles');this.abort=new AbortController();this.focus=0;this.yaw=.16;this.pitch=.21;this.yawTarget=.16;this.pitchTarget=.21;this.hover=null;this.quality=1.6;this.cost=0;this.frameCount=0;this.lastSolidKey='';this.solidAlpha=0;
   this.origin=new T.Vector3();this.v=new T.Vector3();this.v2=new T.Vector3();this.axis=new T.Vector3(0,1,0);this.dummy=new T.Object3D();this.ray=new T.Raycaster();this.mouse=new T.Vector2();this.instanceMap=[[],[]];
   try{this.renderer=new T.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){this.fallback(e);return;}
   const r=this.renderer;r.setPixelRatio(Math.min(devicePixelRatio||1,this.quality));r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.05;r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;
   this.scene=new T.Scene();this.scene.background=new T.Color('#e5eeea');this.scene.fog=new T.FogExp2('#e5eeea',.018);
   this.camera=new T.PerspectiveCamera(39,1,.1,150);this.camera.position.set(6,6,29);this.target=new T.Vector3();this.focusPoint=new T.Vector3();
   this.scene.add(new T.HemisphereLight('#f3f8ed','#8ba293',1.5));
   const key=new T.DirectionalLight('#fffdf5',2.6);key.position.set(-9,16,10);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-15,right:15,top:13,bottom:-13,near:1,far:60});key.shadow.normalBias=.025;key.shadow.bias=-.0002;key.shadow.radius=3;this.scene.add(key);this.key=key;
   const rim=new T.DirectionalLight('#c0e5cf',1.6);rim.position.set(8,3,-10);this.scene.add(rim);
   const fill=new T.DirectionalLight('#d8d1e9',1.2);fill.position.set(-8,0,5);this.scene.add(fill);
   this.makeEnvironment();this.buildChamber();
   this.sphere=new T.SphereGeometry(1,28,20);this.cylinder=new T.CylinderGeometry(1,1,1,12);this.box=new T.BoxGeometry(.6,.6,.6);
   this.materials=[new T.MeshPhysicalMaterial({color:'#4a927e',metalness:.23,roughness:.25,clearcoat:.65,clearcoatRoughness:.2,envMapIntensity:.8,transparent:true}),new T.MeshPhysicalMaterial({color:'#8b80b2',metalness:.18,roughness:.28,clearcoat:.6,clearcoatRoughness:.2,envMapIntensity:.8,transparent:true})];
   this.atoms=this.materials.map(mat=>{const mesh=new T.InstancedMesh(this.sphere,mat,420);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.castShadow=true;mesh.frustumCulled=false;this.scene.add(mesh);return mesh;});
   this.bondMaterial=new T.MeshStandardMaterial({color:'#768b82',metalness:.48,roughness:.3,transparent:true});this.bonds=new T.InstancedMesh(this.cylinder,this.bondMaterial,300);this.bonds.instanceMatrix.setUsage(T.DynamicDrawUsage);this.bonds.frustumCulled=false;this.scene.add(this.bonds);
   this.trailGeometry=new T.BufferGeometry();this.trailArray=new Float32Array(108*6);this.trailGeometry.setAttribute('position',new T.BufferAttribute(this.trailArray,3));this.trails=new T.LineSegments(this.trailGeometry,new T.LineBasicMaterial({color:'#6e9186',transparent:true,opacity:.3,depthWrite:false}));this.scene.add(this.trails);
   const mineral=document.createElement('canvas');mineral.width=mineral.height=128;const mc=mineral.getContext('2d'),pixels=mc.createImageData(128,128);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,n=170+26*Math.sin(x*.14+Math.sin(y*.07)*3)+8*Math.sin(x*1.71+y*2.53);pixels.data[i]=n;pixels.data[i+1]=n;pixels.data[i+2]=n;pixels.data[i+3]=255;}mc.putImageData(pixels,0,0);this.mineralTexture=new T.CanvasTexture(mineral);
   this.solidMaterial=new T.MeshPhysicalMaterial({color:'#8c84bb',roughness:.58,metalness:.12,clearcoat:.3,bumpMap:this.mineralTexture,bumpScale:.027,transparent:true});this.solidMesh=new T.InstancedMesh(this.box,this.solidMaterial,216);this.solidMesh.castShadow=true;this.solidMesh.receiveShadow=true;this.solidMesh.frustumCulled=false;this.scene.add(this.solidMesh);this.solidCells=Array.from({length:216},()=>({x:0,y:0,z:0,tx:0,ty:0,tz:0}));
   this.siteMesh=new T.InstancedMesh(this.sphere,new T.MeshStandardMaterial({color:'#b8b2e1',emissive:'#504675',emissiveIntensity:.17,roughness:.5,transparent:true}),200);this.scene.add(this.siteMesh);
   this.demo=new T.Group();this.scene.add(this.demo);this.demoAtoms=Array.from({length:4},(_,i)=>{const m=new T.Mesh(this.sphere,this.materials[i<2?0:1].clone());m.castShadow=true;this.demo.add(m);return m;});
   this.demoBonds=Array.from({length:4},()=>{const m=new T.Mesh(this.cylinder,this.bondMaterial.clone());this.demo.add(m);return m;});
   this.markers=Array.from({length:2},()=>{const m=new T.Mesh(new T.TorusGeometry(.8,.018,6,48),new T.MeshBasicMaterial({color:'#466d5a',transparent:true,opacity:.65}));this.demo.add(m);return m;});
   this.energyGroup=new T.Group();this.demo.add(this.energyGroup);this.energyGroup.position.set(0,-1.65,0);this.energyTrack=new T.Mesh(new T.BoxGeometry(4.8,.055,.055),new T.MeshBasicMaterial({color:'#9aac9d'}));this.energyTrack.position.x=0;this.energyGroup.add(this.energyTrack);
   this.energyFill=new T.Mesh(new T.BoxGeometry(1,.12,.1),new T.MeshBasicMaterial({color:'#467f63'}));this.energyGroup.add(this.energyFill);this.threshold=new T.Mesh(new T.BoxGeometry(.035,.5,.1),new T.MeshBasicMaterial({color:'#a7784d'}));this.energyGroup.add(this.threshold);
   const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;const gc=glowCanvas.getContext('2d'),g=gc.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#dbffed');g.addColorStop(.15,'#a4ffdc90');g.addColorStop(1,'#a4ffdc00');gc.fillStyle=g;gc.fillRect(0,0,128,128);
   this.glowTexture=new T.CanvasTexture(glowCanvas);this.glow=new T.Sprite(new T.SpriteMaterial({map:this.glowTexture,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));this.demo.add(this.glow);this.glow.scale.set(3,3,1);
   this.eventGlows=Array.from({length:16},()=>{const s=new T.Sprite(this.glow.material.clone());s.visible=false;this.scene.add(s);return s;});
   this.highlight=new T.Mesh(new T.SphereGeometry(.9,24,12),new T.MeshBasicMaterial({color:'#497961',wireframe:true,transparent:true,opacity:.18,depthWrite:false}));this.scene.add(this.highlight);
   this.events();this.resize();lab.$('render-status').textContent='3D · WebGL';this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lab.$('render-status').textContent=lab.t('Graphics paused · reload to restore');lab.playing=false;lab.updateUI();});
  }
  makeEnvironment(){
   const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d'),g=ctx.createLinearGradient(0,0,0,256);g.addColorStop(0,'#f6faf1');g.addColorStop(.35,'#c2d4c6');g.addColorStop(.55,'#93a99a');g.addColorStop(1,'#61776a');ctx.fillStyle=g;ctx.fillRect(0,0,512,256);ctx.fillStyle='#ffffff';ctx.fillRect(85,18,160,35);ctx.fillStyle='#d5ddcd';ctx.fillRect(370,60,70,80);const texture=new T.CanvasTexture(c);texture.mapping=T.EquirectangularReflectionMapping;const gen=new T.PMREMGenerator(this.renderer);this.env=gen.fromEquirectangular(texture);this.scene.environment=this.env.texture;gen.dispose();texture.dispose();
  }
  buildChamber(){
   const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:'#cddcd1',roughness:.5,metalness:.35}));floor.rotation.x=-Math.PI/2;floor.position.y=-5.05;floor.receiveShadow=true;this.scene.add(floor);
   const base=new T.Mesh(new T.BoxGeometry(19.2,.32,10.2),new T.MeshStandardMaterial({color:'#a7beb0',metalness:.55,roughness:.32}));base.position.y=-4.82;base.receiveShadow=true;this.scene.add(base);
   const grid=new T.GridHelper(18,18,'#8fa799','#b0c3b8');grid.position.y=-4.62;grid.material.transparent=true;grid.material.opacity=.26;this.scene.add(grid);
   const edge=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(18,9,9)),new T.LineBasicMaterial({color:'#6b8c7c',transparent:true,opacity:.28}));this.scene.add(edge);
   const glass=new T.MeshPhysicalMaterial({color:'#bfd8c9',roughness:.1,metalness:.02,transparent:true,opacity:.045,side:T.DoubleSide,depthWrite:false,clearcoat:1});
   const back=new T.Mesh(new T.PlaneGeometry(18,9),glass);back.position.z=-4.5;this.scene.add(back);
   for(const side of [-1,1]){const panel=new T.Mesh(new T.PlaneGeometry(9,9),glass);panel.position.x=side*9;panel.rotation.y=Math.PI/2;this.scene.add(panel);}
   for(const x of [-9,9]){const rail=new T.Mesh(new T.CylinderGeometry(.04,.04,9,8),new T.MeshStandardMaterial({color:'#91ad9c',metalness:.75,roughness:.3}));rail.position.set(x,0,-4.5);this.scene.add(rail);}
  }
  resize(){if(this.fallbackMode)return;const r=this.canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();}
  resetView(){this.yawTarget=this.yaw+(Math.atan2(Math.sin(.16-this.yaw),Math.cos(.16-this.yaw)));this.pitchTarget=.21;}
  rotateView(yaw,pitch){this.yawTarget+=yaw;this.pitchTarget=clamp(this.pitchTarget+pitch,.02,1.45);}
  events(){
   let start=null;const listen=(name,fn)=>this.canvas.addEventListener(name,fn,{signal:this.abort.signal});
   listen('pointerdown',e=>{start={x:e.clientX,y:e.clientY,yaw:this.yawTarget,pitch:this.pitchTarget};this.canvas.setPointerCapture(e.pointerId);});
   listen('pointermove',e=>{if(start){const dx=e.clientX-start.x,dy=e.clientY-start.y;this.yawTarget=start.yaw-dx*.008;this.pitchTarget=clamp(start.pitch+dy*.005,.02,1.45);}else if(!this.lab.replay)this.hover=this.pick(e);});
   listen('pointerup',()=>{start=null;});
   listen('pointercancel',()=>start=null);listen('pointerleave',()=>this.hover=null);
  }
  pick(e){
   const rect=this.canvas.getBoundingClientRect();this.mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.camera.updateMatrixWorld();for(const mesh of this.atoms)mesh.computeBoundingSphere();this.ray.setFromCamera(this.mouse,this.camera);
   const hit=this.ray.intersectObjects(this.atoms,false)[0];if(hit){const type=this.atoms.indexOf(hit.object),p=this.instanceMap[type][hit.instanceId];if(p)return p;}
   // A small screen-space tolerance makes projected atoms usable on touch screens.
   let nearest=null,best=Infinity;for(const p of this.lab.model.particles){if(p.hidden>0||p.retiring||p.fade<.5)continue;this.v.set(p.x,p.y,p.z).project(this.camera);if(this.v.z>1)continue;const x=rect.left+(this.v.x+1)*rect.width/2,y=rect.top+(1-this.v.y)*rect.height/2,d=Math.hypot(e.clientX-x,e.clientY-y),limit=Math.max(10,rect.height*.7/(this.camera.position.distanceTo(this.v2.set(p.x,p.y,p.z))*Math.tan(this.camera.fov*Math.PI/360)));if(d<limit&&d<best){best=d;nearest=p;}}return nearest;
  }
  placeInstance(mesh,index,x,y,z,sx,sy,sz,axis){this.dummy.position.set(x,y,z);this.dummy.scale.set(sx,sy,sz);this.dummy.quaternion.identity();if(axis)this.dummy.quaternion.setFromUnitVectors(this.axis,axis);this.dummy.updateMatrix();mesh.setMatrixAt(index,this.dummy.matrix);}
  addAtom(type,x,y,z,r,p){const i=this.atomCounts[type]++;this.placeInstance(this.atoms[type],i,x,y,z,r,r,r);this.instanceMap[type][i]=p;}
  addBond(a,b,r=.11){this.v.set(b.x-a.x,b.y-a.y,b.z-a.z);const len=this.v.length();if(len<.001)return;this.v.multiplyScalar(1/len);this.placeInstance(this.bonds,this.bondCount++,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,r,len,r,this.v);}
  molecule(p,phase){
   if(p.hidden>0||p.fade<.001)return;const x=mix(p.px,p.x,phase),y=mix(p.py,p.y,phase),z=mix(p.pz,p.z,phase),f=smooth(p.fade),a={x:x-p.ax*.27,y:y-p.ay*.27,z:z-p.az*.27},b={x:x+p.ax*.27,y:y+p.ay*.27,z:z+p.az*.27};
   this.addAtom(p.type,a.x,a.y,a.z,.29*f,p);this.addAtom(p.type,b.x,b.y,b.z,.29*f,p);this.addBond(a,b,.1*f);
  }
  updateSolids(dt){
   const m=this.lab.model,key=m.factor==='surface'?'s'+m.n:'off';
   if(key!==this.lastSolidKey){this.lastSolidKey=key;const q=6/m.n;this.solidCells.forEach((c,i)=>{const ix=i%6,iy=Math.floor(i/6)%6,iz=Math.floor(i/36),spread=m.factor==='surface'?m.solidGap:0;c.tx=(ix-2.5)*.6+(Math.floor(ix/q)-(m.n-1)/2)*spread;c.ty=(iy-2.5)*.6+(Math.floor(iy/q)-(m.n-1)/2)*spread-.35;c.tz=(iz-2.5)*.6+(Math.floor(iz/q)-(m.n-1)/2)*spread;if(this.solidAlpha<.01){c.x=c.tx;c.y=c.ty;c.z=c.tz;}});}
   const k=this.lab.reducedMotion?1:1-Math.exp(-dt*5);this.solidAlpha=mix(this.solidAlpha,m.factor==='surface'?1:0,k);this.solidMaterial.opacity=this.solidAlpha*this.sampleOpacity;this.solidMesh.visible=this.solidMaterial.opacity>.01;this.siteMesh.visible=this.solidMesh.visible;this.siteMesh.material.opacity=this.solidMaterial.opacity;
   if(!this.solidMesh.visible)return;this.solidCells.forEach((c,i)=>{c.x=mix(c.x,c.tx,k);c.y=mix(c.y,c.ty,k);c.z=mix(c.z,c.tz,k);this.placeInstance(this.solidMesh,i,c.x,c.y,c.z,1,1,1);});this.solidMesh.instanceMatrix.needsUpdate=true;
   let site=0;for(const s of m.solids)for(const a of [0,1,2])for(const sign of [-1,1]){const p=[s.x,s.y,s.z];p[a]+=sign*(s.side/2+.016);this.placeInstance(this.siteMesh,site++,p[0],p[1],p[2],.07,.07,.07);}this.siteMesh.count=site;this.siteMesh.instanceMatrix.needsUpdate=true;
  }
  beginDemo(){const e=this.lab.lastCollision;this.focusPoint.set(e?clamp(e.x,-3,3):0,e?clamp(e.y,-1,1):0,e?clamp(e.z,-1,1):0);this.demo.position.copy(this.focusPoint);}
  renderDemo(){
   const r=this.lab.replay;if(!r)return;const t=r.time,reading=global.Collision3DModel.demo(r.kind,this.lab.model.ea),good=reading.effective;
   const approach=smooth((t-1.15)/2),contact=3.15,rearrange=good?smooth((t-3.8)/1.5):0,departure=smooth((t-5.5)/1.4),rebound=good?0:smooth((t-3.6)/2),distance=mix(2.8,r.kind==='wrong'?.62:.45,approach)+rebound*2.2;
   const points=[];for(let type=0;type<2;type++)for(let j=0;j<2;j++){const sign=j?1:-1,wrong=type===1&&r.kind==='wrong',x=(type?1:-1)*distance+(wrong?sign*.48:0),y=wrong?0:sign*.48,z=wrong?sign*.12:0;points.push({x:mix(x,(type?1:-1)*.48,rearrange),y:mix(y,sign*(.6+departure*1.65),rearrange),z:mix(z,sign*.15,rearrange)});}
   for(let i=0;i<4;i++){const atom=this.demoAtoms[i];atom.position.set(points[i].x,points[i].y,points[i].z);const compression=.05*Math.sin(clamp((t-contact)/.6,0,1)*Math.PI);atom.scale.set(.45*(1-compression),.45*(1+compression),.45);}
   const pairs=[[0,1],[2,3],[0,2],[1,3]];pairs.forEach(([a,b],i)=>{const mesh=this.demoBonds[i],alpha=i<2?1-rearrange:rearrange,p=points[a],q=points[b];this.v.set(q.x-p.x,q.y-p.y,q.z-p.z);mesh.position.set((p.x+q.x)/2,(p.y+q.y)/2,(p.z+q.z)/2);mesh.scale.set(.13,Math.max(.001,this.v.length()),.13);mesh.quaternion.setFromUnitVectors(this.axis,this.v.normalize());mesh.material.opacity=alpha;mesh.visible=alpha>.01;});
   this.markers.forEach((m,i)=>{m.visible=r.kind==='wrong'&&t>1.7&&t<6;m.position.set((i?1:-1)*distance,0,0);m.rotation.z=i?Math.PI/2:0;m.scale.set(i?1:.6,i?.6:1,1);m.material.color.set(t>3.2?'#a77352':'#577c66');});
   const ramp=smooth((t-2.5)/1.2),length=4.8*reading.energy/2.6*ramp;this.energyFill.scale.x=Math.max(.001,length);this.energyFill.position.x=-2.4+length/2;this.energyFill.material.color.set(good?'#467f63':'#aa7c55');this.threshold.position.x=-2.4+4.8*this.lab.displayEa/2.6;this.energyGroup.visible=t>1.4;
   this.glow.material.opacity=good?Math.sin(clamp((t-3.3)/.8,0,1)*Math.PI)*.65:.05;this.glow.visible=t>3.3&&t<4.1;
   const stage=t<1.2?'Following a collision':t<3.1?'Particles approach':t<3.8?'Energy and orientation check':good?(t<5.4?'Bonds rearrange continuously':t<7?'Products form':'Returning to the chamber'):(reading.orientation?'Insufficient energy · molecules rebound':'Wrong orientation · molecules rebound');
   if(r.stage!==stage){r.stage=stage;this.lab.$('replay-stage').textContent=this.lab.t(stage);}
   const checked=t>=3.3;this.lab.$('energy-check').className='check '+(checked?(reading.energy>=reading.ea?'pass':'fail'):'');this.lab.$('orientation-check').className='check '+(checked?(reading.orientation?'pass':'fail'):'');
   this.lab.$('energy-check').textContent=this.lab.t(checked?(reading.energy>=reading.ea?'✓ Energy ≥ Eₐ':'× Energy < Eₐ'):'Energy ≥ Eₐ');this.lab.$('orientation-check').textContent=this.lab.t(checked?(reading.orientation?'✓ Correct orientation':'× Wrong orientation'):'Correct orientation');
   this.lab.$('spatial-energy').hidden=t<1.3;this.lab.$('spatial-energy').textContent=this.lab.t('Collision energy')+' '+(reading.energy*ramp).toFixed(2)+'   /   Eₐ '+this.lab.displayEa.toFixed(2);
   this.lab.$('demo-note').textContent=this.lab.t('Controlled example · live sample held');
   if(!r.sounded&&t>=3.35){this.lab.sound?.impact(good);r.sounded=true;}
  }
  update(dt){
   if(this.fallbackMode){this.drawFallback();return;}const started=performance.now(),lab=this.lab,m=lab.model,r=lab.replay;
   const targetFocus=r?(lab.reducedMotion?(r.time<7.25?1:0):smooth(r.time/1.5)*(1-smooth((r.time-7.25)/1.5))):0;this.focus=mix(this.focus,targetFocus,lab.reducedMotion?1:1-Math.exp(-dt*5));
   // Clear the live sample before the close-up reaches it; restore it on return.
   this.sampleOpacity=1-smooth(this.focus/.65);
   this.yaw=mix(this.yaw,this.yawTarget,1-Math.exp(-dt*8));this.pitch=mix(this.pitch,this.pitchTarget,1-Math.exp(-dt*8));
   const dist=Math.max(21,30/this.camera.aspect),horizontal=Math.cos(this.pitch)*dist,ox=Math.sin(this.yaw)*horizontal,oy=Math.sin(this.pitch)*dist,oz=Math.cos(this.yaw)*horizontal;
   const closeDistance=Math.max(9,9/this.camera.aspect);this.camera.position.set(mix(ox,this.focusPoint.x+.45,this.focus),mix(oy,this.focusPoint.y+.7,this.focus),mix(oz,this.focusPoint.z+closeDistance,this.focus));this.target.set(this.focusPoint.x*this.focus,this.focusPoint.y*this.focus,this.focusPoint.z*this.focus);this.camera.lookAt(this.target);
   this.atomCounts=[0,0];this.bondCount=0;const phase=lab.playing&&!r?clamp(lab.accumulator*120,0,1):1;
   for(const p of m.particles)this.molecule(p,phase);
   for(const s of this.eventGlows)s.visible=false;let gi=0;
   for(const e of m.effects){if(e.effective&&e.age<1.3){const reform=smooth(e.age/.5),out=smooth((e.age-.45)/.7),alpha=smooth((1.3-e.age)/.25),points=[];
     for(let type=0;type<2;type++)for(const sign of [-1,1]){const original=e.a?.type===type?e.a:e.b?.type===type?e.b:null;const px=original?original.x:e.x+.25,py=original?original.y:e.y,pz=original?original.z:e.z;const p={x:mix(px+sign*(original?.ax||0)*.27,e.x+(type?1:-1)*.27,reform),y:mix(py+sign*(original?.ay||1)*.27,e.y+sign*(.4+out*.9),reform),z:mix(pz+sign*(original?.az||0)*.27,e.z+out*.3,reform)};points.push(p);this.addAtom(type,p.x,p.y,p.z,.29*alpha,null);}
     if(reform<1){this.addBond(points[0],points[1],.1*(1-reform));this.addBond(points[2],points[3],.1*(1-reform));}this.addBond(points[0],points[2],.1*reform*alpha);this.addBond(points[1],points[3],.1*reform*alpha);
    }
    if(gi<16&&e.age<.35){const s=this.eventGlows[gi++];s.visible=this.sampleOpacity>.01;s.position.set(e.x,e.y,e.z);s.scale.setScalar(e.effective?1.8:.65);s.material.opacity=(1-e.age/.35)*(e.effective?.5:.2)*this.sampleOpacity;}
   }
   for(let type=0;type<2;type++){this.atoms[type].count=this.atomCounts[type];this.atoms[type].instanceMatrix.needsUpdate=true;this.materials[type].opacity=this.sampleOpacity;this.atoms[type].visible=this.sampleOpacity>.01;}this.bonds.count=this.bondCount;this.bonds.instanceMatrix.needsUpdate=true;this.bondMaterial.opacity=this.sampleOpacity;this.bonds.visible=this.sampleOpacity>.01;
   let ti=0;for(const p of m.particles){if(ti>=108||p.hidden>0||p.retiring)continue;const i=ti++*6,tail=clamp((m.temperature-1)*.06,0,.12)*p.fade;this.trailArray.set([p.x,p.y,p.z,p.x-p.vx*tail,p.y-p.vy*tail,p.z-p.vz*tail],i);}this.trailGeometry.setDrawRange(0,ti*2);this.trailGeometry.attributes.position.needsUpdate=true;this.trails.visible=m.temperature>1.1&&lab.playing&&!r&&this.focus<.1;
   this.updateSolids(dt);this.demo.visible=!!r;this.renderDemo();
   const selected=this.hover;this.highlight.visible=!!selected&&!r&&selected.hidden<=0;
   if(this.highlight.visible)this.highlight.position.set(selected.x,selected.y,selected.z);
   this.renderer.render(this.scene,this.camera);this.cost=mix(this.cost,performance.now()-started,.025);this.frameMs=mix(this.frameMs||16,dt*1000,.01);this.frameCount++;
   if(this.frameCount>240&&(this.cost>22||this.frameMs>28)&&this.quality>1){this.quality=1;this.renderer.setPixelRatio(1);this.key.castShadow=false;lab.$('render-status').textContent=lab.t('3D · efficient mode');this.resize();}
   lab.$('particles').dataset.renderer='webgl';lab.$('particles').dataset.renderMs=this.cost.toFixed(2);lab.$('particles').dataset.frameMs=this.frameMs.toFixed(2);lab.$('particles').dataset.drawCalls=String(this.renderer.info.render.calls);lab.$('particles').dataset.depthRange='9';
  }
  fallback(error){this.fallbackMode=true;const replacement=this.canvas.cloneNode();this.canvas.replaceWith(replacement);this.canvas=replacement;this.ctx=this.canvas.getContext('2d');this.lab.$('render-status').textContent=this.lab.t('Compatibility view · WebGL unavailable');}
  drawFallback(){const r=this.canvas.getBoundingClientRect(),c=this.ctx;if(!c)return;this.canvas.width=r.width;this.canvas.height=r.height;c.fillStyle='#cddcd1';c.fillRect(0,0,r.width,r.height);const scale=Math.min(r.width/21,r.height/12);for(const p of this.lab.model.particles){const depth=1+p.z*.03,x=r.width/2+p.x*scale*depth,y=r.height/2-p.y*scale*depth;c.fillStyle=p.type?'#aa97ef':'#57d4d1';c.globalAlpha=this.lab.replay?.12:1;c.beginPath();c.arc(x,y,Math.max(2,.35*scale*depth),0,Math.PI*2);c.fill();}c.globalAlpha=1;
   const demo=this.lab.replay;if(demo){const reading=global.Collision3DModel.demo(demo.kind,this.lab.model.ea),t=demo.time,approach=smooth((t-1.15)/2),reform=reading.effective?smooth((t-3.8)/1.5):0,depart=smooth((t-5.5)/1.4),distance=mix(2.8,.45,approach)+(reading.effective?0:smooth((t-3.6)/2)*2.2),s=Math.min(r.width/9,r.height/8),points=[];for(let type=0;type<2;type++)for(const sign of [-1,1]){const wrong=type===1&&demo.kind==='wrong';points.push({x:mix((type?1:-1)*distance+(wrong?sign*.48:0),(type?1:-1)*.48,reform),y:mix(wrong?0:sign*.48,sign*(.6+depart*1.65),reform),type});}for(let i=0;i<4;i++){const p=points[i];c.fillStyle=p.type?'#aa97ef':'#57d4d1';c.beginPath();c.arc(r.width/2+p.x*s,r.height/2-p.y*s,.45*s,0,Math.PI*2);c.fill();}this.lab.$('replay-stage').textContent=this.lab.t(t<3.3?'Particles approach':reading.effective?'Products form':reading.orientation?'Insufficient energy · molecules rebound':'Wrong orientation · molecules rebound');this.lab.$('spatial-energy').hidden=false;this.lab.$('spatial-energy').textContent=this.lab.t('Collision energy')+' '+reading.energy.toFixed(2)+' / Eₐ '+reading.ea.toFixed(2);}
   this.canvas.dataset.renderer='compatibility';}
  dispose(){this.abort.abort();this.renderer?.dispose();this.scene?.traverse(o=>{o.geometry?.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});this.env?.dispose();this.glowTexture?.dispose();this.mineralTexture?.dispose();}
 }
 global.MolecularScene=MolecularScene;
})(window);
