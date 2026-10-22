const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=html.split('<script>')[1].split('</script>')[0].replace(/render\(\);\s*window.addEventListener\('resize',fitScreen\);/,'');
const storage=new Map(),ctx={localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},sessionStorage:{getItem:()=>null,setItem:()=>{}},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}},window:{addEventListener:()=>{},matchMedia:()=>({matches:true})},BBBOnline:{snapshot:null},console,setTimeout:()=>0,clearTimeout:()=>{},encodeURIComponent};
vm.createContext(ctx);const run=s=>vm.runInContext(s,ctx);run(source);run("render=()=>{};goto=s=>state.screen=s;");run(fs.readFileSync(path.join(root,'layout-data.js'),'utf8'));run(fs.readFileSync(path.join(root,'layout-v2.js'),'utf8'));

run("state.characters=[fresh('p1','Teste')];state.primary='p1';state.chosen=['p1'];state.playMode='local';state.controller='human'");
for(const id of ['mantis','boss-02','boss-03']){
 run(`state.selectedBossId='${id}';begin()`);
 for(const screen of ['party()','multiplayerCreate()','battleScreen()']){
  const markup=run(screen);assert(markup.includes('<video'));assert(!markup.includes('poster='),'Video cannot flash a still-image poster');assert(!markup.includes('boss-still-media'),'Video and still must not be rendered together');
 }
 run("b().outcome='victory';b().firstVictoryIds=['p1']");assert(!run('battleResultOverlay()').includes('<video'),'Results remain static images');
}
const expected={'boss-04':'xiongmao','boss-05':'puppet-master','boss-06':'ice-lord','boss-07':'dot','boss-08':'trikster','boss-09':'crabinator'};
for(const [id,asset]of Object.entries(expected)){
 run(`state.selectedBossId='${id}';begin()`);
 for(const screen of ['party()','multiplayerCreate()','battleScreen()']){
  const markup=run(screen);assert(!markup.includes('<video'));assert(markup.includes(`assets/${asset}.webp`));assert(markup.includes('boss-still-media'));assert(/preserveAspectRatio="xMidY(?:Mid|Min) slice"/.test(markup),'Still preserves its proportions');
 }
 assert(fs.existsSync(path.join(root,'assets',asset+'.webp')));
 run("b().outcome='victory';b().firstVictoryIds=['p1']");assert(run('battleResultOverlay()').includes(`assets/${asset}.webp`));
}
run("state.selectedBossId='boss-05';begin();b().boss.hp=100;splitAtHalf('p1')");let scene=run('battleScreen()');assert(scene.includes('assets/dummy.webp'));assert(scene.includes('assets/puppet-master.webp'));assert.equal((scene.match(/v2-hp-thin/g)||[]).length,2);
run("state.selectedBossId='boss-07';begin();b().boss.hp=80;latchNewBossAbilities(b())");assert.equal(run('bossName()'),'Black Hole');scene=run('battleScreen()');assert(scene.includes('assets/black-hole.webp'));assert(!scene.includes('assets/black-hole.svg'));assert(fs.existsSync(path.join(root,'assets','black-hole.webp')));
console.log('PASS: Video-only panels without poster/underlay; static results; eight new artworks; Puppet split and Black Hole transformation; preserved image proportions.');
