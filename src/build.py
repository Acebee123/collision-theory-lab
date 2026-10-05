from pathlib import Path
import json,re
root=Path(__file__).resolve().parent.parent
src=(root/'src/legacy-lab.html').read_text(encoding='utf-8')
src=re.sub(r'/\* Presentation-only refinement:.*?\.size-picker>span\{display:inline\}', '', src, flags=re.S)
start=src.index('  class CollisionModel {')
end=src.index("  if(typeof module",start)
src=src[:start]+'  const CollisionModel=global.Collision3DModel;\n'+src[end:]
css=(root/'src/immersive.css').read_text(encoding='utf-8')+'\n'+(root/'src/light-theme.css').read_text(encoding='utf-8')
src=src.replace('  class CollisionTheoryLab extends HTMLElement {','  const IMMERSIVE_CSS='+json.dumps(css)+';\n  class CollisionTheoryLab extends HTMLElement {')
methods=(root/'src/controller.js').read_text(encoding='utf-8')
# Retain the established UI/localisation and graph methods, replacing superseded controllers.
overrides=re.findall(r'^    (\w+)\(',methods,re.M)
unused=['visualHash','particleVisual','updateParticleVisuals','drawParticleShadow','atomMaterial','drawAtom','atom','drawBond','bond','drawMolecule','molecule','chamberMaterial','drawChamber','solidMaterial','drawSolidPiece','cube','makeSolidTransition','drawSolids','drawCollisionEffect','drawContactLight','drawParticles','drawReplay']
for name in set(overrides+unused):
    src=re.sub(r'^    '+name+r'\(.*?(?=^    [A-Za-z]\w*\(|^  \})','',src,flags=re.M|re.S)
src=src.replace('\n  }\n  global.CollisionTheoryLab', '\n'+methods+'\n  }\n  global.CollisionTheoryLab')
src=src.replace("temperature:m.temperature", "temperature:m.targetTemperature")
src=src.replace('m.temperature.toFixed(1)','m.targetTemperature.toFixed(1)')
src=src.replace("()=>this.showCollision('success')", "()=>this.showCollision(this.model.factor==='catalyst'?'low':'success')")
src=src.replace('unit=51,peak=', 'unit=Math.min(51,Math.max(25,(react-44)/1.45)),peak=')
# Existing graph methods already use the original light-theme palette.
extra={
 'Add catalyst · same energy':'Tambah mangkin · tenaga sama','Remove catalyst · same energy':'Buang mangkin · tenaga sama','7.4 Collision Theory':'7.4 Teori Perlanggaran','· 7.4 Collision Theory':'· 7.4 Teori Perlanggaran',
 'Drag gently to rotate':'Seret perlahan untuk putar',
 'Reset View':'Tetapkan Semula Pandangan','Sound off':'Bunyi dimatikan','Sound on':'Bunyi dihidupkan','Speed':'Kelajuan','Kinetic energy':'Tenaga kinetik','Collision energy':'Tenaga perlanggaran','Illustrative units':'Unit ilustrasi','Collisions':'Perlanggaran','Form 4 Chemistry':'Kimia Tingkatan 4','Following a collision':'Mengikuti perlanggaran','Energy and orientation check':'Semakan tenaga dan orientasi','Bonds rearrange continuously':'Ikatan disusun semula secara berterusan','Products form':'Hasil terbentuk','Returning to the chamber':'Kembali ke kebuk','Insufficient energy · molecules rebound':'Tenaga tidak mencukupi · molekul melantun','Wrong orientation · molecules rebound':'Orientasi salah · molekul melantun','Controlled example · live sample held':'Contoh terkawal · sampel langsung dijeda','Close molecule information':'Tutup maklumat molekul','Qualitative model · continuous sample · illustrative energies':'Model kualitatif · sampel berterusan · tenaga ilustrasi','3D · efficient mode':'3D · mod cekap','Compatibility view · WebGL unavailable':'Paparan serasi · WebGL tidak tersedia','Graphics paused · reload to restore':'Grafik dijeda · muat semula untuk pulih',
 '3D molecular chamber. Drag to rotate. Arrow keys rotate; Home resets the view.':'Kebuk molekul 3D. Seret untuk putar. Kekunci anak panah memutar; Home menetapkan semula pandangan.'}
extra.update({'Condition comparison':'Perbandingan keadaan','Molecules · fixed volume':'Molekul · isipadu tetap','Particle speed':'Kelajuan zarah','Activation barrier · Eₐ':'Halangan pengaktifan · Eₐ','Lowest setting':'Tetapan terendah','Cooler setting':'Tetapan lebih sejuk','Target':'Sasaran','Compare the same collision':'Bandingkan perlanggaran yang sama','More particles → more frequent collisions':'Lebih banyak zarah → perlanggaran lebih kerap','Increase concentration to add more particles':'Tingkatkan kepekatan untuk menambah zarah','Faster motion → more collisions with sufficient energy':'Gerakan lebih laju → lebih banyak perlanggaran bertenaga mencukupi','Increase temperature to see faster motion':'Tingkatkan suhu untuk melihat gerakan lebih laju','Lower barrier → more effective collisions · same speed':'Halangan lebih rendah → lebih banyak perlanggaran berkesan · kelajuan sama','Add a catalyst to lower the barrier · same speed':'Tambah mangkin untuk merendahkan halangan · kelajuan sama','More exposed sites · same solid volume':'Lebih banyak tapak terdedah · isipadu pepejal sama','Paused · press Play to see motion':'Dijeda · tekan Main untuk melihat gerakan','Slow motion is on · switch it off to compare speeds':'Gerak perlahan dihidupkan · matikan untuk membandingkan kelajuan'})
src=src.replace('  const IMMERSIVE_CSS=', '  Object.assign(MALAY,'+json.dumps(extra,ensure_ascii=False)+');\n  const IMMERSIVE_CSS=')
head='''
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 35% 0%,#f7faf5,#e9eeed 75%);color:#293c43;font-family:'Segoe UI',Arial,sans-serif}main{width:100%;max-width:none;margin:0;padding:0}html{min-width:280px}body{min-height:100vh}
'''
src=re.sub(r'<style>.*?</style>', '<style>'+head+'</style>',src,count=1,flags=re.S)
src=src.replace('content="#091821"','content="#e9eeed"')
bundle='\n'.join((root/p).read_text(encoding='utf-8') for p in ['vendor/three.min.js','src/simulation.js','src/scene.js','src/audio.js'])
src=src.replace('<script>','<script>\n'+bundle.replace('</script','<\\/script')+'\n',1)
src=src.replace('/* Collision Theory Lab. Dependency-free, embeddable custom element. */','/* Collision Theory Lab · Three.js r160 · MIT license bundled below. */')
license=(root/'vendor/THREE-LICENSE.txt').read_text(encoding='utf-8')
src=src.replace('</body>','<!-- Third-party license: '+license+' -->\n</body>')
(root/'outputs/collision-theory-lab.html').write_text(src,encoding='utf-8')
(root/'index.html').write_text(src,encoding='utf-8')
print('Built self-contained 3D lab:',len(src),'characters')
