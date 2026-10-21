const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=html.split('<script>')[1].split('</script>')[0].replace(/render\(\);\s*window.addEventListener\('resize',fitScreen\);/,'');
const storage=new Map(),ctx={localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},sessionStorage:{getItem:()=>null,setItem:()=>{}},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}},window:{addEventListener:()=>{},matchMedia:()=>({matches:true})},BBBOnline:{snapshot:null},console,setTimeout:()=>0,clearTimeout:()=>{},encodeURIComponent};
vm.createContext(ctx);const run=s=>vm.runInContext(s,ctx);run(source);run("render=()=>{};goto=s=>state.screen=s;");run(fs.readFileSync(path.join(root,'layout-data.js'),'utf8'));run(fs.readFileSync(path.join(root,'layout-v2.js'),'utf8'));
run("state.characters=[fresh('p1','Teste')];state.primary='p1';state.chosen=['p1'];state.playMode='local';state.controller='human';state.selectedBossId='boss-05';begin()");
assert.equal((run('battleScreen()').match(/v2-hp-thin/g)||[]).length,0,'No split bars before the actual split');
run("b().boss.hp=b().boss.maxHp/2;splitAtHalf('p1')");
let scene=run('battleScreen()');assert.equal((scene.match(/v2-hp-thin/g)||[]).length,2);assert.equal((scene.match(/hp-thin.webp/g)||[]).length,2);assert(scene.includes('PUPPET MASTER &amp; DUMMY'));
run("b().split.children[0].hp=25;b().split.children[1].hp=75");scene=run('battleScreen()');assert(scene.includes('data-hp-id="split-aoe" data-percent="25"'));assert(scene.includes('data-hp-id="split-normal" data-percent="75"'));
run("b().multiplayer=true;b().viewerId='p1';b().bossControllerId='controller'");scene=run('battleScreen()');assert.equal((scene.match(/v2-hp-thin/g)||[]).length,2);assert(!scene.includes('100 / 100 HP'));assert(scene.includes('aria-valuemax="100" aria-valuenow="25"'));
for(const [id,file,dead]of [['boss-02','stone-golem-battle.mp4','stone-golem-dead.webp'],['boss-03','queen-mothra-battle.mp4','queen-mothra-dead.webp']]){
 run(`state.selectedBossId='${id}';state.playMode='local';begin()`);
 assert(run('party()').includes(file),'Local selection includes correct video');assert(run('multiplayerCreate()').includes(file),'Multiplayer boss selection includes correct video');assert(run('battleScreen()').includes(file));
 run("b().outcome='victory';b().firstVictoryIds=['p1']");const victory=run('battleResultOverlay()');assert(victory.includes(dead));assert(!victory.includes('<video'));run("b().outcome='defeat'");assert(!run('battleResultOverlay()').includes(dead));
 assert(fs.existsSync(path.join(root,'assets',file)));assert(fs.existsSync(path.join(root,'assets',dead)));
}
console.log('PASS: Boss 5 splits into two thin independent bars only at half HP; local/multiplayer HP visibility preserved; Boss 2/3 selection videos and victory/death images verified.');
