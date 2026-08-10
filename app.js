import { getEntries, saveEntry, deleteEntry, clearEntries, bulkSave } from './db.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const state = { entries: [], selectedType: 4, deferredPrompt: null };

const bristolInfo = {
  1:{name:'Hard pellets', short:'Pebble dash', desc:'Separate hard lumps'},
  2:{name:'Lumpy sausage', short:'The cobbled log', desc:'Sausage-shaped but lumpy'},
  3:{name:'Cracked sausage', short:'Cracked but capable', desc:'Sausage with surface cracks'},
  4:{name:'Smooth & soft', short:'Smooth operator', desc:'Smooth, soft and formed'},
  5:{name:'Soft blobs', short:'Soft landing', desc:'Soft blobs with clear edges'},
  6:{name:'Mushy pieces', short:'Bit of a situation', desc:'Fluffy or mushy pieces'},
  7:{name:'Liquid', short:'Code brown', desc:'Watery, no solid pieces'}
};

const saveQuips = {
  1:'A firm entry for the archives.',
  2:'Lumpy, but officially logged.',
  3:'Cracks and all — data secured.',
  4:'A textbook performance.',
  5:'Softly does it.',
  6:'Messy data is still good data.',
  7:'Rapid response documented.'
};

function uid(){ return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function todayParts(){ const d=new Date(); const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; return {date, time:d.toTimeString().slice(0,5)}; }
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }
function formatDate(ts){ return new Intl.DateTimeFormat(undefined,{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(ts)); }
function dayKey(value){ const d=value instanceof Date?value:new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function median(values){ if(!values.length)return null; const a=[...values].sort((x,y)=>x-y); const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; }
function mode(values){ if(!values.length)return null; const c={}; values.forEach(v=>c[v]=(c[v]||0)+1); return Object.entries(c).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? null; }

function stoolSvg(type, compact=false){
  const common=`viewBox="0 0 84 58" aria-hidden="true" focusable="false"`;
  const fill='#8b5a2b', dark='#68411e', hi='#aa7441';
  const shapes={
    1:`<g fill="${fill}" stroke="${dark}" stroke-width="2"><circle cx="20" cy="31" r="9"/><circle cx="39" cy="21" r="8"/><circle cx="56" cy="34" r="10"/><circle cx="35" cy="42" r="7"/></g>`,
    2:`<path d="M12 34 C15 19 28 16 37 22 C43 13 58 15 61 24 C73 24 76 37 67 43 C52 50 29 48 18 43 C13 41 11 38 12 34Z" fill="${fill}" stroke="${dark}" stroke-width="2"/><path d="M30 24l5 6M47 20l4 7M55 34l7 3M25 39l7-3" stroke="${hi}" stroke-width="3" stroke-linecap="round"/>`,
    3:`<path d="M9 35 C12 20 25 17 39 20 C54 17 70 24 73 34 C74 43 64 47 48 46 L24 46 C14 45 8 41 9 35Z" fill="${fill}" stroke="${dark}" stroke-width="2"/><path d="M29 22l-3 8 8 3-5 7M49 21l-4 8 7 4-5 8" fill="none" stroke="${hi}" stroke-width="3" stroke-linecap="round"/>`,
    4:`<path d="M8 36 C12 20 28 16 44 18 C61 19 73 26 74 35 C75 45 60 47 43 46 L24 46 C13 45 7 42 8 36Z" fill="${fill}" stroke="${dark}" stroke-width="2"/><path d="M20 31 C34 23 52 24 65 31" fill="none" stroke="${hi}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
    5:`<g fill="${fill}" stroke="${dark}" stroke-width="2"><path d="M9 37c0-10 7-17 16-17 8 0 14 6 14 14 0 9-7 13-16 13S9 44 9 37Z"/><path d="M38 31c0-9 7-15 16-15 11 0 19 8 19 18 0 9-8 13-18 13-11 0-17-7-17-16Z"/></g>`,
    6:`<path d="M9 39c-2-8 5-14 12-13-1-9 10-13 16-8 6-8 18-4 18 4 9-3 18 5 15 13 8 5 1 13-8 12H23C15 48 10 45 9 39Z" fill="${fill}" stroke="${dark}" stroke-width="2"/><circle cx="27" cy="32" r="3" fill="${hi}"/><circle cx="47" cy="29" r="4" fill="${hi}"/><circle cx="58" cy="39" r="3" fill="${hi}"/>`,
    7:`<path d="M12 37 C19 27 29 39 38 31 C47 22 57 37 72 28 L72 45 L12 45Z" fill="${fill}" opacity=".92"/><path d="M12 37 C19 27 29 39 38 31 C47 22 57 37 72 28" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round"/><path d="M23 26c3-7 8-7 11 0M52 20c3-6 8-6 11 0" fill="none" stroke="${hi}" stroke-width="2" stroke-linecap="round"/>`
  };
  return `<svg class="stool-svg${compact?' compact':''}" ${common}>${shapes[type]||shapes[4]}</svg>`;
}

function toast(message){ const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2200); }
function showScreen(name){
  $$('.screen').forEach(s=>s.classList.toggle('active',s.id===`screen-${name}`));
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));
  if(name==='history') renderHistory();
  if(name==='stats') renderStats();
  scrollTo({top:0,behavior:'smooth'});
}

function renderBristolPicker(){
  $('#bristolPicker').innerHTML = Object.entries(bristolInfo).map(([n,info])=>{
    const selected=Number(n)===state.selectedType;
    return `<button type="button" class="bristol-btn ${selected?'selected':''}" data-type="${n}" aria-pressed="${selected}">
      ${n==='4'?'<span class="ideal-badge">IDEAL</span>':''}
      <span class="bristol-number">${n}</span>
      ${stoolSvg(Number(n))}
      <strong>${escapeHtml(info.name)}</strong>
      <small>${escapeHtml(info.short)}</small>
    </button>`;
  }).join('');
  $$('.bristol-btn').forEach(btn=>btn.addEventListener('click',()=>{state.selectedType=Number(btn.dataset.type);renderBristolPicker();}));
}

function entryCard(e){
  const tags=(e.tags||[]).map(t=>`<span class="tag">#${escapeHtml(t)}</span>`).join('');
  const info=bristolInfo[e.bristolType]||bristolInfo[4];
  const extras=[e.location?`<span>⌖ ${escapeHtml(e.location)}</span>`:'',e.duration!==null&&e.duration!==''?`<span>◷ ${e.duration} min</span>`:'',e.colour?`<span>${escapeHtml(e.colour)}</span>`:''].filter(Boolean).join('');
  return `<article class="log-card" data-id="${e.id}">
    <div class="log-visual">${stoolSvg(e.bristolType,true)}<span class="mini-type">TYPE ${e.bristolType}</span></div>
    <div class="log-main">
      <div class="log-top">
        <div>
          <div class="log-title-line"><strong>${escapeHtml(info.short)}</strong><span class="type-pill">Type ${e.bristolType}</span></div>
          <div class="log-meta">${formatDate(e.timestamp)}</div>
        </div>
        <div class="icon-actions"><button class="icon-btn edit-entry" aria-label="Edit entry">✎</button><button class="icon-btn delete-entry" aria-label="Delete entry">×</button></div>
      </div>
      <div class="quality-row"><span class="quality-pill">Ease: ${escapeHtml(e.ease||'—')}</span><span class="quality-pill">Urgency: ${escapeHtml(e.urgency||'—')}</span></div>
      ${extras?`<div class="log-extras">${extras}</div>`:''}
      ${e.notes?`<p class="log-notes">${escapeHtml(e.notes)}</p>`:''}
      ${tags?`<div class="tags">${tags}</div>`:''}
    </div>
  </article>`;
}

function wireEntryActions(root=document){
  root.querySelectorAll('.edit-entry').forEach(btn=>btn.onclick=()=>editEntry(btn.closest('.log-card').dataset.id));
  root.querySelectorAll('.delete-entry').forEach(btn=>btn.onclick=()=>removeEntry(btn.closest('.log-card').dataset.id));
}

function currentStreak(){
  if(!state.entries.length)return 0;
  const keys=new Set(state.entries.map(e=>dayKey(e.timestamp)));
  let d=new Date(); d.setHours(12,0,0,0);
  if(!keys.has(dayKey(d))){ d.setDate(d.getDate()-1); }
  let count=0;
  while(keys.has(dayKey(d))){ count++; d.setDate(d.getDate()-1); }
  return count;
}

function mostCommonTime(){
  if(!state.entries.length)return '—';
  const buckets=state.entries.map(e=>{
    const h=Number((e.time||'12:00').split(':')[0]);
    if(h<6)return 'Night owl'; if(h<12)return 'Morning'; if(h<17)return 'Afternoon'; if(h<22)return 'Evening'; return 'Night owl';
  });
  return mode(buckets)||'—';
}

function renderHome(){
  const total=state.entries.length;
  const today=dayKey(new Date());
  const todayCount=state.entries.filter(e=>dayKey(e.timestamp)===today).length;
  const avg=total?(state.entries.reduce((s,e)=>s+Number(e.bristolType),0)/total).toFixed(1):'—';
  const ideal=total?Math.round(state.entries.filter(e=>[3,4,5].includes(Number(e.bristolType))).length/total*100)+'%':'—';
  $('#homeStats').innerHTML=[['Today',todayCount,'entries today'],['All logs',total,'in the archive'],['Avg type',avg,'your midpoint'],['Types 3–5',ideal,'of all logs']].map(([label,val,sub])=>`<div class="stat-card"><strong>${val}</strong><span>${label}</span><small>${sub}</small></div>`).join('');
  $('#recentLogs').innerHTML=total?state.entries.slice(0,3).map(entryCard).join(''):`<div class="empty"><strong>No logs yet.</strong><span>Your throne awaits.</span></div>`;
  wireEntryActions($('#recentLogs'));

  const insight=$('#homeInsight');
  if(!total){ insight.innerHTML=`<p class="kicker">The daily debrief</p><h3>Nothing to report yet</h3><p class="muted">A few logs and this area will start spotting simple patterns.</p>`; return; }
  const common=Number(mode(state.entries.map(e=>Number(e.bristolType))));
  const streak=currentStreak();
  const time=mostCommonTime();
  const thisWeek=state.entries.filter(e=>(Date.now()-new Date(e.timestamp).getTime())<7*86400000).length;
  insight.innerHTML=`<p class="kicker">The daily debrief</p><div class="insight-icon">${stoolSvg(common,true)}</div><h3>${escapeHtml(bristolInfo[common].short)} is leading</h3><p class="muted">Type ${common} is your most common entry. You’ve logged <strong>${thisWeek}</strong> time${thisWeek===1?'':'s'} in the last 7 days${streak?` and your current streak is <strong>${streak} day${streak===1?'':'s'}</strong>`:''}.</p><div class="insight-footer"><span>Most common time</span><strong>${time}</strong></div>`;
}

function renderHistory(){
  const q=$('#searchInput').value.trim().toLowerCase();
  const tf=$('#typeFilter').value;
  const list=state.entries.filter(e=>{
    const hay=[e.notes,e.location,e.colour,e.ease,e.urgency,(e.tags||[]).join(' '),bristolInfo[e.bristolType]?.name,bristolInfo[e.bristolType]?.short].join(' ').toLowerCase();
    return (tf==='all'||String(e.bristolType)===tf)&&(!q||hay.includes(q));
  });
  $('#historySummary').textContent=state.entries.length?`${list.length} of ${state.entries.length} log${state.entries.length===1?'':'s'} showing.`:'Your complete paper trail. Figuratively.';
  $('#historyList').innerHTML=list.length?list.map(entryCard).join(''):`<div class="empty"><strong>Nothing matches.</strong><span>Try another search or Bristol type.</span></div>`;
  wireEntryActions($('#historyList'));
}

function achievementData(){
  const n=state.entries.length;
  const activeDays=new Set(state.entries.map(e=>dayKey(e.timestamp))).size;
  const type4=state.entries.filter(e=>Number(e.bristolType)===4).length;
  const locations=new Set(state.entries.map(e=>(e.location||'').trim().toLowerCase()).filter(Boolean)).size;
  const tagged=state.entries.filter(e=>(e.tags||[]).length).length;
  return [
    {icon:'✓',title:'First Flush',desc:'Log your first entry',unlocked:n>=1,progress:Math.min(n,1),goal:1},
    {icon:'III',title:'Triple Threat',desc:'Log 3 entries',unlocked:n>=3,progress:Math.min(n,3),goal:3},
    {icon:'7',title:'Regular Customer',desc:'Log on 7 different days',unlocked:activeDays>=7,progress:Math.min(activeDays,7),goal:7},
    {icon:'4',title:'Smooth Operator',desc:'Record 10 Type 4s',unlocked:type4>=10,progress:Math.min(type4,10),goal:10},
    {icon:'⌖',title:'Tour de Toilet',desc:'Log in 3 named locations',unlocked:locations>=3,progress:Math.min(locations,3),goal:3},
    {icon:'#',title:'Data Nerd',desc:'Add tags to 10 logs',unlocked:tagged>=10,progress:Math.min(tagged,10),goal:10},
    {icon:'50',title:'Serious Logger',desc:'Reach 50 logs',unlocked:n>=50,progress:Math.min(n,50),goal:50},
    {icon:'100',title:'Centurion',desc:'Reach 100 logs',unlocked:n>=100,progress:Math.min(n,100),goal:100}
  ];
}

function renderStats(){
  const n=state.entries.length;
  const days=new Set(state.entries.map(e=>dayKey(e.timestamp))).size;
  const avgPerDay=days?(n/days).toFixed(1):'—';
  const avgType=n?(state.entries.reduce((s,e)=>s+Number(e.bristolType),0)/n).toFixed(1):'—';
  const idealPct=n?Math.round(state.entries.filter(e=>[3,4,5].includes(Number(e.bristolType))).length/n*100)+'%':'—';
  const weekCount=state.entries.filter(e=>(Date.now()-new Date(e.timestamp).getTime())<7*86400000).length;
  const durations=state.entries.map(e=>Number(e.duration)).filter(v=>Number.isFinite(v)&&v>0);
  const medDuration=median(durations);

  $('#statsCards').innerHTML=[['Total logs',n,'all time'],['Last 7 days',weekCount,'recent entries'],['Average type',avgType,'across all logs'],['Types 3–5',idealPct,'of your logs']].map(([l,v,s])=>`<div class="stat-card"><strong>${v}</strong><span>${l}</span><small>${s}</small></div>`).join('');

  const streak=currentStreak();
  $('#streakBadge').innerHTML=`<strong>${streak}</strong><span>day streak</span>`;

  const counts=Object.fromEntries([1,2,3,4,5,6,7].map(x=>[x,0]));
  state.entries.forEach(e=>counts[e.bristolType]++);
  const max=Math.max(1,...Object.values(counts));
  $('#typeChart').innerHTML=Object.entries(counts).map(([t,c])=>`<div class="bar-row"><div class="bar-label"><span>${t}</span>${escapeHtml(bristolInfo[t].name)}</div><div class="bar-track"><div class="bar-fill type-${t}" style="width:${(c/max)*100}%"></div></div><strong>${c}</strong></div>`).join('');
  $('#statsRangeLabel').textContent=n?`${n} entries`:'No entries yet';

  const now=new Date();
  const days14=[];
  for(let i=13;i>=0;i--){ const d=new Date(now); d.setHours(12,0,0,0); d.setDate(d.getDate()-i); const k=dayKey(d); days14.push({d,k,c:state.entries.filter(e=>dayKey(e.timestamp)===k).length}); }
  const maxDay=Math.max(1,...days14.map(x=>x.c));
  $('#dailyChart').innerHTML=days14.map(x=>`<div class="day-col" title="${x.k}: ${x.c}"><span class="day-count">${x.c||''}</span><div class="day-bar" style="height:${Math.max(3,(x.c/maxDay)*120)}px"></div><span class="day-label">${x.d.toLocaleDateString(undefined,{weekday:'short',day:'numeric'})}</span></div>`).join('');

  if(n){
    const common=Number(mode(state.entries.map(e=>Number(e.bristolType))));
    const time=mostCommonTime();
    $('#patternTitle').textContent=`${bristolInfo[common].short} appears most often`;
    $('#patternText').textContent=`Type ${common} is currently your most common Bristol type. These are simple summaries of your own logs, not medical conclusions.`;
    $('#patternFacts').innerHTML=`<div><span>Most common type</span><strong>Type ${common}</strong></div><div><span>Most common time</span><strong>${time}</strong></div><div><span>Active days</span><strong>${days}</strong></div><div><span>Typical duration</span><strong>${medDuration!==null?`${medDuration} min`:'—'}</strong></div>`;
  }else{
    $('#patternTitle').textContent='Start logging to reveal patterns';
    $('#patternText').textContent='Your own trends will appear here as your history grows.';
    $('#patternFacts').innerHTML='';
  }

  const achievements=achievementData();
  const unlocked=achievements.filter(a=>a.unlocked).length;
  $('#achievementCount').textContent=`${unlocked}/${achievements.length} unlocked`;
  $('#achievements').innerHTML=achievements.map(a=>`<article class="achievement ${a.unlocked?'unlocked':'locked'}"><div class="achievement-icon">${a.icon}</div><div><strong>${a.title}</strong><p>${a.desc}</p><div class="achievement-progress"><span style="width:${Math.min(100,a.progress/a.goal*100)}%"></span></div><small>${a.unlocked?'Unlocked':`${a.progress}/${a.goal}`}</small></div></article>`).join('');
}

function syncSegmented(){
  $$('.segmented-control').forEach(control=>{
    const select=$(`#${control.dataset.selectTarget}`);
    if(!select)return;
    control.querySelectorAll('button').forEach(button=>button.classList.toggle('selected',button.dataset.value===select.value));
  });
}

function resetForm(){
  $('#logForm').reset();
  const p=todayParts();
  $('#logDate').value=p.date; $('#logTime').value=p.time; $('#colour').value='Brown'; $('#entryId').value='';
  state.selectedType=4; $('#saveBtn').textContent='Save log'; $('#cancelEditBtn').hidden=true;
  renderBristolPicker(); syncSegmented();
  const details=$('.more-details'); if(details)details.open=false;
}

function editEntry(id){
  const e=state.entries.find(x=>x.id===id); if(!e)return;
  $('#entryId').value=e.id; $('#logDate').value=e.date; $('#logTime').value=e.time; state.selectedType=Number(e.bristolType);
  $('#ease').value=e.ease||''; $('#urgency').value=e.urgency||''; $('#colour').value=e.colour||'Brown'; $('#duration').value=e.duration??'';
  $('#location').value=e.location||''; $('#notes').value=e.notes||''; $('#tags').value=(e.tags||[]).join(', ');
  $('#saveBtn').textContent='Update log'; $('#cancelEditBtn').hidden=false; renderBristolPicker(); syncSegmented();
  if(e.location||e.notes||(e.tags||[]).length||e.duration) $('.more-details').open=true;
  showScreen('log');
}

async function removeEntry(id){
  if(!await confirmAction('Delete this log?','This entry will be removed from this device.'))return;
  await deleteEntry(id); await refresh(); toast('Log deleted');
}
async function refresh(){ state.entries=await getEntries(); renderHome(); renderHistory(); renderStats(); }

async function confirmAction(title,message){ const d=$('#confirmDialog'); $('#dialogTitle').textContent=title; $('#dialogMessage').textContent=message; d.showModal(); return new Promise(resolve=>{d.onclose=()=>resolve(d.returnValue==='confirm');}); }
function downloadFile(name,content,type){ const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000); }

function showSaveSuccess(entry,wasEditing){
  $('#successTitle').textContent=wasEditing?'Log updated.':'Log logged.';
  $('#successSummary').textContent=`Type ${entry.bristolType} · ${entry.ease} · ${entry.urgency} urgency`;
  $('#successQuip').textContent=wasEditing?'The record has been tidied up.':saveQuips[entry.bristolType];
  $('#successDialog').showModal();
}

$('#logForm').addEventListener('submit',async ev=>{
  ev.preventDefault();
  const id=$('#entryId').value||uid(), date=$('#logDate').value, time=$('#logTime').value;
  if(!date||!time)return;
  if(!$('#ease').value||!$('#urgency').value){ toast('Choose ease and urgency first'); return; }
  const entry={id,date,time,timestamp:new Date(`${date}T${time}:00`).toISOString(),bristolType:state.selectedType,ease:$('#ease').value,urgency:$('#urgency').value,colour:$('#colour').value,duration:$('#duration').value===''?null:Number($('#duration').value),location:$('#location').value.trim(),notes:$('#notes').value.trim(),tags:$('#tags').value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,12),updatedAt:new Date().toISOString()};
  const wasEditing=Boolean($('#entryId').value);
  await saveEntry(entry); await refresh(); resetForm(); showSaveSuccess(entry,wasEditing);
});

$$('.segmented-control').forEach(control=>{
  const select=$(`#${control.dataset.selectTarget}`); if(!select)return;
  control.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{ select.value=button.dataset.value; syncSegmented(); }));
  select.addEventListener('change',syncSegmented);
});

$$('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.nav)));
$('#quickLogBtn').onclick=()=>{resetForm();showScreen('log');};
$('#resetBtn').onclick=resetForm;
$('#cancelEditBtn').onclick=()=>{resetForm();showScreen('history');};
$('#searchInput').addEventListener('input',renderHistory);
$('#typeFilter').addEventListener('change',renderHistory);

$('#successDoneBtn').onclick=()=>{ $('#successDialog').close(); showScreen('home'); };
$('#successViewBtn').onclick=()=>{ $('#successDialog').close(); showScreen('history'); };
$('#successDialog').addEventListener('cancel',()=>showScreen('home'));

$('#exportJsonBtn').onclick=()=>downloadFile(`log-my-log-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({app:'Log My Log',version:2,exportedAt:new Date().toISOString(),entries:state.entries},null,2),'application/json');
$('#exportCsvBtn').onclick=()=>{ const cols=['id','date','time','bristolType','ease','urgency','colour','duration','location','notes','tags']; const esc=v=>`"${String(v??'').replaceAll('"','""')}"`; const rows=state.entries.map(e=>cols.map(c=>esc(c==='tags'?(e.tags||[]).join('|'):e[c])).join(',')); downloadFile(`log-my-log-${new Date().toISOString().slice(0,10)}.csv`,[cols.join(','),...rows].join('\n'),'text/csv'); };
$('#importJsonInput').onchange=async ev=>{ const file=ev.target.files?.[0]; if(!file)return; try{const data=JSON.parse(await file.text());const entries=Array.isArray(data)?data:data.entries;if(!Array.isArray(entries))throw new Error();const valid=entries.filter(e=>e&&e.id&&e.timestamp&&Number(e.bristolType)>=1&&Number(e.bristolType)<=7);await bulkSave(valid);await refresh();toast(`Imported ${valid.length} entries`);}catch{toast('That backup file is not valid.');}finally{ev.target.value='';} };
$('#deleteAllBtn').onclick=async()=>{ if(!await confirmAction('Delete every log?','This cannot be undone unless you have a backup.'))return; await clearEntries(); await refresh(); toast('All local data deleted'); };

window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); state.deferredPrompt=e; $('#installBtn').hidden=false; });
$('#installBtn').onclick=async()=>{ if(!state.deferredPrompt)return; state.deferredPrompt.prompt(); await state.deferredPrompt.userChoice; state.deferredPrompt=null; $('#installBtn').hidden=true; };
window.addEventListener('appinstalled',()=>toast('Log My Log installed'));
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=2').catch(console.error));

resetForm(); refresh();
if(new URLSearchParams(location.search).get('action')==='log')showScreen('log');
