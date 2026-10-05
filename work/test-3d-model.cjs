const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {Collision3DModel:M}=require('../src/simulation.js');
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const velocities=m=>m.particles.filter(p=>!p.retiring).map(p=>[p.vx,p.vy,p.vz]);
const kinetic=m=>m.particles.filter(p=>!p.retiring).reduce((sum,p)=>sum+p.vx*p.vx+p.vy*p.vy+p.vz*p.vz,0);
const run=(m,seconds)=>{for(let i=0;i<seconds*120;i++)m.step(1/120);return m;};
const outcomes={};
for(const factor of ['concentration','temperature','surface','catalyst']){
 outcomes[factor]=[];
 for(const level of [0,1]){const m=new M();m.configure(factor,level);run(m,120);outcomes[factor].push({particles:m.count,collisions:m.collisions,effective:m.effective,temperature:m.temperature,ea:m.ea,volume:m.snapshot().solidVolume});assert.ok(m.particles.every(p=>Number.isFinite(p.x+p.y+p.z+p.vx+p.vy+p.vz)));assert.equal(m.series.at(-1).products,m.effective*2);}
 assert.ok(outcomes[factor][1].effective>outcomes[factor][0].effective,factor+' should increase successful collisions');
}
const catalyst=new M();catalyst.configure('catalyst',0);run(catalyst,1);const before=velocities(catalyst);catalyst.configure('catalyst',1);assert.deepEqual(velocities(catalyst),before);assert.equal(catalyst.temperature,1);assert.equal(catalyst.ea,.58);
const population=new M(),initial=velocities(population),energy=kinetic(population);population.configure('concentration',1);assert.deepEqual(velocities(population).slice(0,36),initial);near(kinetic(population)/2,energy);assert.equal(population.particles.filter(p=>p.fade===0).length,36);population.configure('concentration',0);assert.equal(population.particles.length,72);run(population,1);assert.equal(population.particles.length,36);
const warm=new M(),coldKE=kinetic(warm);warm.configure('temperature',1);near(kinetic(warm),coldKE);run(warm,.5);assert.ok(warm.temperature>2.4&&warm.temperature<2.6);run(warm,.5);near(kinetic(warm)/coldKE,warm.temperature,1e-7);assert.ok(warm.temperature>2.58);
const solid=new M();for(const level of [0,.5,1]){solid.configure('surface',level);near(solid.solids.reduce((sum,s)=>sum+s.side**3,0),3.6**3);near(solid.solids.reduce((sum,s)=>sum+6*s.side*s.side,0)/(6*3.6**2),solid.n);}
assert.equal(M.demo('low',1.45).effective,false);assert.equal(M.demo('low',.58).effective,true);assert.equal(M.demo('low',1.45).energy,M.demo('low',.58).energy);assert.equal(M.demo('wrong',.58).effective,false);assert.equal(M.demo('success',1.45).effective,true);
for(const ea of [.58,1.45]){assert.equal(M.qualifies(ea,ea,true),true);assert.equal(M.qualifies(ea-.001,ea,true),false);assert.equal(M.qualifies(ea+1,ea,false),false);}
const baseline=new M();run(baseline,10);for(const fps of [30,60,144]){const m=new M();let acc=0;for(let frame=0;frame<fps*10;frame++){acc+=1/fps;while(acc+1e-12>=1/120){m.step(1/120);acc-=1/120;}}assert.equal(m.collisions,baseline.collisions);assert.equal(m.effective,baseline.effective);near(m.time,baseline.time);}
const html=fs.readFileSync('outputs/collision-theory-lab.html','utf8');const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);assert.ok(!/<script[^>]+src=/.test(html));assert.ok(html.includes('Bahasa Melayu'));assert.ok(html.includes('200%'));
fs.writeFileSync('work/3d-test-results.json',JSON.stringify({passed:true,outcomes,deterministic:{collisions:baseline.collisions,effective:baseline.effective}},null,2));console.log(JSON.stringify({passed:true,outcomes},null,2));
