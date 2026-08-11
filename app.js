import { getEntries, saveEntry, deleteEntry, clearEntries, bulkSave } from './db.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const APP_VERSION = '3.1.0';
const ONBOARDING_KEY = 'log-my-log-onboarding-v2.1';
const ACHIEVEMENT_KEY = 'log-my-log-achievements-v2.4';
const SUPABASE_URL = 'https://tltorblqdurqhtjcojti.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_J89f4SkcT-LNmv1KG-cfjQ_B5v9rbmS';
const CLOUD_LAST_SYNC_KEY = 'log-my-log-cloud-last-sync';
const CLOUD_LAST_USER_KEY = 'log-my-log-cloud-last-user';
const CLOUD_DELETE_QUEUE_KEY = 'log-my-log-cloud-delete-queue';
const state = { entries: [], selectedType: 4, deferredPrompt: null, swRegistration: null, pendingAchievement: null, statsDays: 30, reportDays: 30, cloudUser: null, cloudBusy: false, cloudCount: null };

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
  if(name==='report') renderHealthReport();
  if(name==='account') renderAccount();
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

function currentStreak(){ return streakForEntries(state.entries); }

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
  const debrief=dailyDebrief();
  insight.innerHTML=`<p class="kicker">The daily debrief</p>${debrief.type?`<div class="insight-icon">${stoolSvg(debrief.type,true)}</div>`:'<div class="debrief-mark">TODAY</div>'}<h3>${escapeHtml(debrief.title)}</h3><p class="muted">${escapeHtml(debrief.body)}</p><div class="insight-footer"><span>${escapeHtml(debrief.footer)}</span><strong>${escapeHtml(debrief.value)}</strong></div>`;
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

function achievementData(entries=state.entries){
  const n=entries.length;
  const activeDays=new Set(entries.map(e=>dayKey(e.timestamp))).size;
  const type4=entries.filter(e=>Number(e.bristolType)===4).length;
  const locations=new Set(entries.map(e=>(e.location||'').trim().toLowerCase()).filter(Boolean)).size;
  const tagged=entries.filter(e=>(e.tags||[]).length).length;
  const streak=streakForEntries(entries);
  const easy=entries.filter(e=>e.ease==='Easy').length;
  const early=entries.filter(e=>Number((e.time||'12:00').split(':')[0])<7).length;
  const late=entries.filter(e=>Number((e.time||'12:00').split(':')[0])>=22).length;
  return [
    {id:'first',icon:'✓',title:'First Flush',desc:'Log your first entry',unlocked:n>=1,progress:Math.min(n,1),goal:1},
    {id:'triple',icon:'III',title:'Triple Threat',desc:'Log 3 entries',unlocked:n>=3,progress:Math.min(n,3),goal:3},
    {id:'week',icon:'7',title:'Regular Customer',desc:'Log on 7 different days',unlocked:activeDays>=7,progress:Math.min(activeDays,7),goal:7},
    {id:'streak7',icon:'🔥',title:'On a Roll',desc:'Reach a 7-day logging streak',unlocked:streak>=7,progress:Math.min(streak,7),goal:7},
    {id:'type4',icon:'4',title:'Smooth Operator',desc:'Record 10 Type 4s',unlocked:type4>=10,progress:Math.min(type4,10),goal:10},
    {id:'easy10',icon:'↘',title:'Easy Does It',desc:'Record 10 easy visits',unlocked:easy>=10,progress:Math.min(easy,10),goal:10},
    {id:'locations',icon:'⌖',title:'Tour de Toilet',desc:'Log in 3 named locations',unlocked:locations>=3,progress:Math.min(locations,3),goal:3},
    {id:'tags',icon:'#',title:'Data Nerd',desc:'Add tags to 10 logs',unlocked:tagged>=10,progress:Math.min(tagged,10),goal:10},
    {id:'early',icon:'☀',title:'Early Bird',desc:'Log 5 times before 7am',unlocked:early>=5,progress:Math.min(early,5),goal:5},
    {id:'late',icon:'☾',title:'Night Shift',desc:'Log 5 times after 10pm',unlocked:late>=5,progress:Math.min(late,5),goal:5},
    {id:'fifty',icon:'50',title:'Serious Logger',desc:'Reach 50 logs',unlocked:n>=50,progress:Math.min(n,50),goal:50},
    {id:'hundred',icon:'100',title:'Centurion',desc:'Reach 100 logs',unlocked:n>=100,progress:Math.min(n,100),goal:100}
  ];
}

function streakForEntries(entries){
  if(!entries.length)return 0;
  const keys=new Set(entries.map(e=>dayKey(e.timestamp)));
  let d=new Date(); d.setHours(12,0,0,0);
  if(!keys.has(dayKey(d))) d.setDate(d.getDate()-1);
  let count=0;
  while(keys.has(dayKey(d))){ count++; d.setDate(d.getDate()-1); }
  return count;
}

function personalRecords(){
  if(!state.entries.length) return [];
  const byDay={};
  state.entries.forEach(e=>{ const k=dayKey(e.timestamp); (byDay[k]??=[]).push(e); });
  const busiest=Object.entries(byDay).sort((a,b)=>b[1].length-a[1].length)[0];
  const durations=state.entries.filter(e=>Number(e.duration)>0);
  const quickest=[...durations].sort((a,b)=>Number(a.duration)-Number(b.duration))[0];
  const longest=[...durations].sort((a,b)=>Number(b.duration)-Number(a.duration))[0];
  const locations=state.entries.map(e=>(e.location||'').trim()).filter(Boolean);
  const commonLocation=locations.length?mode(locations.map(x=>x.toLowerCase())):null;
  const prettyLocation=commonLocation?locations.find(x=>x.toLowerCase()===commonLocation):null;
  return [
    {icon:'🔥',label:'Current streak',value:`${currentStreak()} day${currentStreak()===1?'':'s'}`,sub:'keep the paperwork moving'},
    {icon:'▦',label:'Busiest day',value:`${busiest[1].length} log${busiest[1].length===1?'':'s'}`,sub:new Date(`${busiest[0]}T12:00`).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})},
    {icon:'⚡',label:'Quickest visit',value:quickest?`${quickest.duration} min`:'—',sub:quickest?'efficient business':'add durations to compete'},
    {icon:'⌛',label:'Longest visit',value:longest?`${longest.duration} min`:'—',sub:longest?'a proper sitting':'add durations to compete'},
    {icon:'⌖',label:'Home advantage',value:prettyLocation||'—',sub:prettyLocation?'most logged location':'name a few locations'},
    {icon:'★',label:'Perfect 4s',value:String(state.entries.filter(e=>Number(e.bristolType)===4).length),sub:'smooth operators logged'}
  ];
}

function dailyDebrief(){
  const today=dayKey(new Date());
  const todays=state.entries.filter(e=>dayKey(e.timestamp)===today);
  if(!todays.length) return {title:'No business yet today',body:'When nature calls, the debrief will assemble itself.',footer:'Current streak',value:`${currentStreak()} day${currentStreak()===1?'':'s'}`,type:null};
  const avg=(todays.reduce((s,e)=>s+Number(e.bristolType),0)/todays.length).toFixed(1);
  const mins=todays.reduce((s,e)=>s+(Number(e.duration)||0),0);
  const common=Number(mode(todays.map(e=>Number(e.bristolType))));
  const easy=todays.filter(e=>e.ease==='Easy').length;
  const parts=[`${todays.length} log${todays.length===1?'':'s'} today`,`average Type ${avg}`];
  if(mins) parts.push(`${mins} min on the throne`);
  if(easy) parts.push(`${easy} easy visit${easy===1?'':'s'}`);
  const verdict=Number(avg)>=3&&Number(avg)<=5?'A respectably balanced day so far.':Number(avg)<3?'Things are running on the firmer side today.':'Things are running on the looser side today.';
  return {title:todays.length>=3?'A busy day at the office':todays.length===2?'Double-header complete':'Today’s first report is in',body:`${parts.join(' · ')}. ${verdict}`,footer:'Today’s leader',value:`Type ${common}`,type:common};
}


function statsEntries(){
  if(!state.statsDays) return state.entries;
  const cutoff=Date.now()-state.statsDays*86400000;
  return state.entries.filter(e=>new Date(e.timestamp).getTime()>=cutoff);
}
function selectedContextTags(){
  return $$('.context-chips button.selected').map(b=>b.dataset.tag);
}
function syncContextChips(){
  const tags=$('#tags').value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  $$('.context-chips button').forEach(b=>b.classList.toggle('selected',tags.includes(b.dataset.tag)));
}
function toggleContextTag(tag){
  let tags=$('#tags').value.split(',').map(x=>x.trim()).filter(Boolean);
  const idx=tags.findIndex(x=>x.toLowerCase()===tag.toLowerCase());
  if(idx>=0) tags.splice(idx,1); else tags.push(tag);
  $('#tags').value=tags.join(', ');
  syncContextChips();
}
function renderCorrelations(entries){
  const el=$('#correlationInsights'); if(!el)return;
  const tags=['coffee','alcohol','spicy','dairy','high-fibre','takeaway','bloating','cramps','gas','nausea'];
  const label={'coffee':'☕ Coffee','alcohol':'🍷 Alcohol','spicy':'🌶️ Spicy','dairy':'🥛 Dairy','high-fibre':'🌾 High fibre','takeaway':'🥡 Takeaway','bloating':'Bloating','cramps':'Cramps','gas':'Gas','nausea':'Nausea'};
  const cards=tags.map(tag=>{
    const tagged=entries.filter(e=>(e.tags||[]).map(x=>String(x).toLowerCase()).includes(tag));
    if(tagged.length<2)return null;
    const avg=tagged.reduce((s,e)=>s+Number(e.bristolType),0)/tagged.length;
    const loose=tagged.filter(e=>Number(e.bristolType)>=5).length/tagged.length;
    const ideal=tagged.filter(e=>[3,4,5].includes(Number(e.bristolType))).length/tagged.length;
    return {tag,n:tagged.length,avg,loose,ideal};
  }).filter(Boolean).sort((a,b)=>b.n-a.n).slice(0,6);
  if(!cards.length){
    el.innerHTML='<div class="empty correlation-empty"><strong>Not enough context yet.</strong><span>Use the food, drink and symptom chips on a few logs and Log My Log will start comparing them.</span></div>';
    return;
  }
  el.innerHTML=cards.map(c=>`<article class="correlation-item"><span>${label[c.tag]||escapeHtml(c.tag)}</span><strong>Avg Type ${c.avg.toFixed(1)}</strong><p>${Math.round(c.ideal*100)}% Types 3–5 · ${Math.round(c.loose*100)}% Types 5–7</p><small>Based on ${c.n} tagged logs</small></article>`).join('');
}


function entriesInPeriod(days, offsetPeriods=0){
  const now=Date.now();
  const end=now-(offsetPeriods*days*86400000);
  const start=end-(days*86400000);
  return state.entries.filter(e=>{
    const t=new Date(e.timestamp).getTime();
    return t>=start && t<end;
  });
}
function pct(n,d){ return d?Math.round(n/d*100):0; }
function deltaText(current,previous,suffix=''){
  if(previous===null || previous===undefined || !Number.isFinite(previous)) return 'No previous comparison';
  const diff=current-previous;
  if(Math.abs(diff)<0.05) return `No meaningful change${suffix}`;
  return `${diff>0?'+':''}${diff.toFixed(1)}${suffix} vs previous period`;
}
function distribution(entries,field,values){
  return values.map(value=>({value,count:entries.filter(e=>String(e[field]||'')===String(value)).length}));
}
function reportContextRows(entries){
  const tags=['coffee','alcohol','spicy','dairy','high-fibre','takeaway','bloating','cramps','gas','nausea'];
  const labels={'coffee':'Coffee','alcohol':'Alcohol','spicy':'Spicy food','dairy':'Dairy','high-fibre':'High fibre','takeaway':'Takeaway','bloating':'Bloating','cramps':'Cramps','gas':'Gas','nausea':'Nausea'};
  return tags.map(tag=>{
    const matched=entries.filter(e=>(e.tags||[]).map(x=>String(x).toLowerCase()).includes(tag));
    if(matched.length<2) return null;
    const avg=matched.reduce((s,e)=>s+Number(e.bristolType),0)/matched.length;
    return {label:labels[tag],count:matched.length,avg,ideal:pct(matched.filter(e=>[3,4,5].includes(Number(e.bristolType))).length,matched.length)};
  }).filter(Boolean).sort((a,b)=>b.count-a.count).slice(0,6);
}
function reportModel(days){
  const entries=entriesInPeriod(days,0);
  const previous=entriesInPeriod(days,1);
  const n=entries.length;
  const prevN=previous.length;
  const avgType=n?entries.reduce((s,e)=>s+Number(e.bristolType),0)/n:null;
  const prevAvg=prevN?previous.reduce((s,e)=>s+Number(e.bristolType),0)/prevN:null;
  const idealCount=entries.filter(e=>[3,4,5].includes(Number(e.bristolType))).length;
  const highUrgency=entries.filter(e=>e.urgency==='High').length;
  const difficult=entries.filter(e=>e.ease==='Difficult').length;
  const durations=entries.map(e=>Number(e.duration)).filter(v=>Number.isFinite(v)&&v>0);
  const dates=entries.map(e=>new Date(e.timestamp));
  const periodEnd=new Date();
  const periodStart=new Date(Date.now()-days*86400000);
  const dateFmt=new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'});
  const typeDist=[1,2,3,4,5,6,7].map(type=>({type,count:entries.filter(e=>Number(e.bristolType)===type).length}));
  const easeDist=distribution(entries,'ease',['Easy','Normal','Difficult']);
  const urgencyDist=distribution(entries,'urgency',['Low','Medium','High']);
  const mostCommonType=n?Number(mode(entries.map(e=>Number(e.bristolType)))):null;
  const locationValues=entries.map(e=>(e.location||'').trim()).filter(Boolean);
  const commonLocation=locationValues.length?mode(locationValues):null;
  const hours=dates.map(d=>d.getHours());
  let commonTime='—';
  if(hours.length){
    const bins=[
      {name:'Early morning',from:5,to:9},
      {name:'Morning',from:9,to:12},
      {name:'Afternoon',from:12,to:17},
      {name:'Evening',from:17,to:22},
      {name:'Overnight',from:22,to:29}
    ];
    const scored=bins.map(b=>({name:b.name,count:hours.filter(h=>{
      const hh=h<5?h+24:h;
      return hh>=b.from&&hh<b.to;
    }).length})).sort((a,b)=>b.count-a.count);
    commonTime=scored[0]?.count?scored[0].name:'—';
  }
  return {
    days,entries,previous,n,prevN,avgType,prevAvg,
    idealPct:pct(idealCount,n),
    highUrgencyPct:pct(highUrgency,n),
    difficultPct:pct(difficult,n),
    medianDuration:median(durations),
    period:`${dateFmt.format(periodStart)} – ${dateFmt.format(periodEnd)}`,
    generated:new Intl.DateTimeFormat(undefined,{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date()),
    typeDist,easeDist,urgencyDist,mostCommonType,commonLocation,commonTime,
    contexts:reportContextRows(entries)
  };
}
function reportBars(items,labelFn,maxValue){
  const max=Math.max(1, maxValue || 0, ...items.map(x=>x.count));
  return items.map(item=>`
    <div class="report-bar-row">
      <span>${escapeHtml(labelFn(item))}</span>
      <div class="report-bar-track"><i style="width:${item.count/max*100}%"></i></div>
      <strong>${item.count}</strong>
    </div>`).join('');
}
function renderHealthReport(){
  const r=reportModel(state.reportDays);
  const el=$('#healthReport'); if(!el)return;
  if(!r.n){
    el.innerHTML=`<div class="card report-empty"><h3>No logs in this period</h3><p class="muted">There are no entries in the last ${r.days} days. Choose a longer report period or add more logs first.</p></div>`;
    return;
  }
  const weekly=(r.n/r.days*7);
  const prevWeekly=(r.prevN/r.days*7);
  const avgDisplay=r.avgType!==null?r.avgType.toFixed(1):'—';
  const contextHtml=r.contexts.length?r.contexts.map(c=>`<tr><td>${escapeHtml(c.label)}</td><td>${c.count}</td><td>Type ${c.avg.toFixed(1)}</td><td>${c.ideal}%</td></tr>`).join(''):`<tr><td colspan="4" class="muted">Not enough repeated food, drink or symptom tags in this period.</td></tr>`;
  el.innerHTML=`
    <article class="clinical-report">
      <header class="clinical-report-header">
        <div>
          <span class="clinical-brand">LOG MY LOG</span>
          <h1>Bowel habit summary</h1>
          <p>${escapeHtml(r.period)} · ${r.days}-day report</p>
        </div>
        <div class="clinical-generated"><span>Generated</span><strong>${escapeHtml(r.generated)}</strong></div>
      </header>

      <div class="clinical-disclaimer">
        This report summarises user-entered records. It does not diagnose a condition and should be interpreted alongside clinical history and professional assessment.
      </div>

      <section class="clinical-metrics">
        <div><span>Recorded bowel movements</span><strong>${r.n}</strong><small>${weekly.toFixed(1)} per week · ${deltaText(weekly,prevWeekly,'/wk')}</small></div>
        <div><span>Average Bristol type</span><strong>${avgDisplay}</strong><small>${r.prevAvg!==null?deltaText(r.avgType,r.prevAvg):'No previous comparison'}</small></div>
        <div><span>Types 3–5</span><strong>${r.idealPct}%</strong><small>of recorded entries</small></div>
        <div><span>High urgency</span><strong>${r.highUrgencyPct}%</strong><small>of recorded entries</small></div>
        <div><span>Difficult passage</span><strong>${r.difficultPct}%</strong><small>of recorded entries</small></div>
        <div><span>Median duration</span><strong>${r.medianDuration!==null?`${r.medianDuration} min`:'—'}</strong><small>where duration was recorded</small></div>
      </section>

      <section class="clinical-section two-column-report">
        <div>
          <h2>Bristol stool distribution</h2>
          <div class="report-bars">${reportBars(r.typeDist,x=>`Type ${x.type}`,Math.max(...r.typeDist.map(x=>x.count)))}</div>
        </div>
        <div class="clinical-summary-box">
          <h2>Pattern summary</h2>
          <dl>
            <div><dt>Most common Bristol type</dt><dd>${r.mostCommonType?`Type ${r.mostCommonType}`:'—'}</dd></div>
            <div><dt>Most common time period</dt><dd>${escapeHtml(r.commonTime)}</dd></div>
            <div><dt>Most recorded location</dt><dd>${escapeHtml(r.commonLocation||'—')}</dd></div>
            <div><dt>Previous-period logs</dt><dd>${r.prevN}</dd></div>
          </dl>
        </div>
      </section>

      <section class="clinical-section two-column-report">
        <div>
          <h2>Ease</h2>
          <div class="report-bars">${reportBars(r.easeDist,x=>x.value)}</div>
        </div>
        <div>
          <h2>Urgency</h2>
          <div class="report-bars">${reportBars(r.urgencyDist,x=>x.value)}</div>
        </div>
      </section>

      <section class="clinical-section">
        <h2>Recorded context</h2>
        <p class="clinical-note">The associations below are descriptive only. A tag appearing with a stool type does not establish that it caused the outcome.</p>
        <div class="clinical-table-wrap">
          <table class="clinical-table">
            <thead><tr><th>Context</th><th>Tagged logs</th><th>Average type</th><th>Types 3–5</th></tr></thead>
            <tbody>${contextHtml}</tbody>
          </table>
        </div>
      </section>

      <footer class="clinical-report-footer">
        <span>Log My Log v${APP_VERSION}</span>
        <span>Locally generated health summary</span>
      </footer>
    </article>`;
}
function printableReportHtml(){
  const r=reportModel(state.reportDays);
  const report=$('#healthReport')?.innerHTML||'';
  const style=`
    *{box-sizing:border-box}body{margin:0;background:#fff;color:#17251e;font:14px/1.45 Arial,sans-serif}
    .clinical-report{max-width:900px;margin:0 auto;padding:32px}
    .clinical-report-header{display:flex;justify-content:space-between;gap:30px;border-bottom:3px solid #173a2b;padding-bottom:18px}
    .clinical-brand{font-size:10px;letter-spacing:.16em;font-weight:700}.clinical-report h1{font-size:28px;margin:5px 0}
    .clinical-report h2{font-size:16px;margin:0 0 12px}.clinical-report p{margin:4px 0}
    .clinical-generated{text-align:right}.clinical-generated span,.clinical-generated strong{display:block}.clinical-generated span{font-size:11px;color:#667269;text-transform:uppercase}
    .clinical-disclaimer{margin:18px 0;padding:12px 14px;background:#f0f3f0;border-left:4px solid #173a2b;font-size:12px}
    .clinical-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}
    .clinical-metrics>div{border:1px solid #d8ddd9;border-radius:8px;padding:12px}.clinical-metrics span,.clinical-metrics small{display:block;color:#637068}
    .clinical-metrics strong{display:block;font-size:23px;margin:4px 0}.clinical-section{border-top:1px solid #d8ddd9;padding:20px 0}
    .two-column-report{display:grid;grid-template-columns:1fr 1fr;gap:28px}.report-bar-row{display:grid;grid-template-columns:70px 1fr 28px;gap:8px;align-items:center;margin:7px 0}
    .report-bar-track{height:10px;background:#e8ece9;border-radius:6px;overflow:hidden}.report-bar-track i{display:block;height:100%;background:#173a2b}
    .clinical-summary-box dl{margin:0}.clinical-summary-box dl div{display:flex;justify-content:space-between;gap:15px;border-bottom:1px solid #e5e8e5;padding:7px 0}
    dt{color:#637068}dd{margin:0;font-weight:700}.clinical-note{font-size:12px;color:#637068}
    table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #dfe3e0;padding:8px}th{font-size:11px;text-transform:uppercase}
    .clinical-report-footer{border-top:1px solid #d8ddd9;margin-top:22px;padding-top:12px;display:flex;justify-content:space-between;color:#637068;font-size:11px}
    @page{size:A4;margin:12mm}@media print{.clinical-report{padding:0}.clinical-section{break-inside:avoid}.clinical-metrics{break-inside:avoid}}
  `;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Log My Log ${r.days}-day health summary</title><style>${style}</style></head><body>${report}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));<\/script></body></html>`;
}
function printHealthReport(){
  if(!reportModel(state.reportDays).n){ toast('There are no logs in this report period'); return; }
  const win=window.open('','_blank');
  if(!win){ toast('Allow pop-ups to print the report'); return; }
  win.document.open();
  win.document.write(printableReportHtml());
  win.document.close();
}

function renderStats(){
  const entries=statsEntries();
  const n=entries.length;
  const days=new Set(entries.map(e=>dayKey(e.timestamp))).size;
  const avgPerDay=days?(n/days).toFixed(1):'—';
  const avgType=n?(entries.reduce((s,e)=>s+Number(e.bristolType),0)/n).toFixed(1):'—';
  const idealPct=n?Math.round(entries.filter(e=>[3,4,5].includes(Number(e.bristolType))).length/n*100)+'%':'—';
  const weekCount=entries.filter(e=>(Date.now()-new Date(e.timestamp).getTime())<7*86400000).length;
  const durations=entries.map(e=>Number(e.duration)).filter(v=>Number.isFinite(v)&&v>0);
  const medDuration=median(durations);

  $('#statsCards').innerHTML=[['Total logs',n,'all time'],['Last 7 days',weekCount,'recent entries'],['Average type',avgType,'across all logs'],['Types 3–5',idealPct,'of your logs']].map(([l,v,s])=>`<div class="stat-card"><strong>${v}</strong><span>${l}</span><small>${s}</small></div>`).join('');

  const streak=currentStreak();
  $('#streakBadge').innerHTML=`<strong>${streak}</strong><span>day streak</span>`;

  const counts=Object.fromEntries([1,2,3,4,5,6,7].map(x=>[x,0]));
  entries.forEach(e=>counts[e.bristolType]++);
  const max=Math.max(1,...Object.values(counts));
  $('#typeChart').innerHTML=Object.entries(counts).map(([t,c])=>`<div class="bar-row"><div class="bar-label"><span>${t}</span>${escapeHtml(bristolInfo[t].name)}</div><div class="bar-track"><div class="bar-fill type-${t}" style="width:${(c/max)*100}%"></div></div><strong>${c}</strong></div>`).join('');
  $('#statsRangeLabel').textContent=n?`${n} entries · ${state.statsDays?`last ${state.statsDays} days`:'all time'}`:'No entries yet';

  const now=new Date();
  const days14=[];
  for(let i=13;i>=0;i--){ const d=new Date(now); d.setHours(12,0,0,0); d.setDate(d.getDate()-i); const k=dayKey(d); days14.push({d,k,c:entries.filter(e=>dayKey(e.timestamp)===k).length}); }
  const maxDay=Math.max(1,...days14.map(x=>x.c));
  $('#dailyChart').innerHTML=days14.map(x=>`<div class="day-col" title="${x.k}: ${x.c}"><span class="day-count">${x.c||''}</span><div class="day-bar" style="height:${Math.max(3,(x.c/maxDay)*120)}px"></div><span class="day-label">${x.d.toLocaleDateString(undefined,{weekday:'short',day:'numeric'})}</span></div>`).join('');

  if(n){
    const common=Number(mode(entries.map(e=>Number(e.bristolType))));
    const time=mostCommonTime();
    $('#patternTitle').textContent=`${bristolInfo[common].short} appears most often`;
    $('#patternText').textContent=`Type ${common} is currently your most common Bristol type. These are simple summaries of your own logs, not medical conclusions.`;
    $('#patternFacts').innerHTML=`<div><span>Most common type</span><strong>Type ${common}</strong></div><div><span>Most common time</span><strong>${time}</strong></div><div><span>Active days</span><strong>${days}</strong></div><div><span>Typical duration</span><strong>${medDuration!==null?`${medDuration} min`:'—'}</strong></div>`;
  }else{
    $('#patternTitle').textContent='Start logging to reveal patterns';
    $('#patternText').textContent='Your own trends will appear here as your history grows.';
    $('#patternFacts').innerHTML='';
  }

  const records=personalRecords();
  $('#personalRecords').innerHTML=records.length?records.map(r=>`<article class="record-item"><div class="record-icon">${r.icon}</div><span>${escapeHtml(r.label)}</span><strong>${escapeHtml(r.value)}</strong><small>${escapeHtml(r.sub)}</small></article>`).join(''):`<div class="empty records-empty"><strong>No records yet.</strong><span>Your first log automatically sets several personal bests.</span></div>`;

  renderCorrelations(entries);

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
  renderBristolPicker(); syncSegmented(); syncContextChips();
  const details=$('.more-details'); if(details)details.open=false;
}

function editEntry(id){
  const e=state.entries.find(x=>x.id===id); if(!e)return;
  $('#entryId').value=e.id; $('#logDate').value=e.date; $('#logTime').value=e.time; state.selectedType=Number(e.bristolType);
  $('#ease').value=e.ease||''; $('#urgency').value=e.urgency||''; $('#colour').value=e.colour||'Brown'; $('#duration').value=e.duration??'';
  $('#location').value=e.location||''; $('#notes').value=e.notes||''; $('#tags').value=(e.tags||[]).join(', '); syncContextChips();
  $('#saveBtn').textContent='Update log'; $('#cancelEditBtn').hidden=false; renderBristolPicker(); syncSegmented();
  if(e.location||e.notes||(e.tags||[]).length||e.duration) $('.more-details').open=true;
  showScreen('log');
}

async function removeEntry(id){
  if(!await confirmAction('Delete this log?','This entry will be removed from this device and from your signed-in cloud account on the next sync.'))return;
  queueCloudDeletion(id);
  await deleteEntry(id); await refresh(); toast('Log deleted');
  if(state.cloudUser&&navigator.onLine){
    flushCloudDeletions().then(()=>refreshCloudCount()).catch(err=>console.error('Cloud delete pending',err));
  }
}
async function refresh(){ state.entries=await getEntries(); renderHome(); renderHistory(); renderStats(); }

async function confirmAction(title,message){ const d=$('#confirmDialog'); $('#dialogTitle').textContent=title; $('#dialogMessage').textContent=message; d.showModal(); return new Promise(resolve=>{d.onclose=()=>resolve(d.returnValue==='confirm');}); }
function downloadFile(name,content,type){ const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000); }

function newlyUnlocked(beforeEntries,afterEntries){
  const before=new Set(achievementData(beforeEntries).filter(a=>a.unlocked).map(a=>a.id));
  return achievementData(afterEntries).filter(a=>a.unlocked&&!before.has(a.id));
}

function showAchievementUnlock(achievement){
  if(!achievement)return;
  $('#achievementUnlockIcon').textContent=achievement.icon;
  $('#achievementUnlockTitle').textContent=achievement.title;
  $('#achievementUnlockText').textContent=achievement.desc;
  $('#achievementDialog').showModal();
}

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
  const beforeEntries=[...state.entries];
  await saveEntry(entry); await refresh();
  pushOneQuietly(entry);
  if(!wasEditing) state.pendingAchievement=newlyUnlocked(beforeEntries,state.entries)[0]||null;
  resetForm(); showSaveSuccess(entry,wasEditing);
});

$$('.segmented-control').forEach(control=>{
  const select=$(`#${control.dataset.selectTarget}`); if(!select)return;
  control.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{ select.value=button.dataset.value; syncSegmented(); }));
  select.addEventListener('change',syncSegmented);
});


$$('.context-chips button').forEach(button=>button.addEventListener('click',()=>toggleContextTag(button.dataset.tag)));
$('#tags').addEventListener('input',syncContextChips);
$$('#statsRange button').forEach(button=>button.addEventListener('click',()=>{
  state.statsDays=Number(button.dataset.days);
  $$('#statsRange button').forEach(b=>b.classList.toggle('active',b===button));
  renderStats();
}));

$$('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.nav)));
$('#quickLogBtn').onclick=()=>{resetForm();showScreen('log');};
$('#resetBtn').onclick=resetForm;
$('#cancelEditBtn').onclick=()=>{resetForm();showScreen('history');};
$('#searchInput').addEventListener('input',renderHistory);
$('#typeFilter').addEventListener('change',renderHistory);

function finishSuccess(destination){ $('#successDialog').close(); showScreen(destination); if(state.pendingAchievement){ const a=state.pendingAchievement; state.pendingAchievement=null; setTimeout(()=>showAchievementUnlock(a),180); } }
$('#successDoneBtn').onclick=()=>finishSuccess('home');
$('#successViewBtn').onclick=()=>finishSuccess('history');
$('#successDialog').addEventListener('cancel',()=>finishSuccess('home'));
$('#achievementUnlockBtn').onclick=()=>$('#achievementDialog').close();


$('#openReportBtn').onclick=()=>showScreen('report');
$$('#reportRange button').forEach(button=>button.addEventListener('click',()=>{
  state.reportDays=Number(button.dataset.reportDays);
  $$('#reportRange button').forEach(b=>b.classList.toggle('active',b===button));
  renderHealthReport();
}));
$('#printReportBtn').onclick=printHealthReport;

$('#exportJsonBtn').onclick=()=>downloadFile(`log-my-log-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({app:'Log My Log',version:APP_VERSION,exportedAt:new Date().toISOString(),entries:state.entries},null,2),'application/json');
$('#exportCsvBtn').onclick=()=>{ const cols=['id','date','time','bristolType','ease','urgency','colour','duration','location','notes','tags']; const esc=v=>`"${String(v??'').replaceAll('"','""')}"`; const rows=state.entries.map(e=>cols.map(c=>esc(c==='tags'?(e.tags||[]).join('|'):e[c])).join(',')); downloadFile(`log-my-log-${new Date().toISOString().slice(0,10)}.csv`,[cols.join(','),...rows].join('\n'),'text/csv'); };
$('#importJsonInput').onchange=async ev=>{ const file=ev.target.files?.[0]; if(!file)return; try{const data=JSON.parse(await file.text());const entries=Array.isArray(data)?data:data.entries;if(!Array.isArray(entries))throw new Error();const valid=entries.filter(e=>e&&e.id&&e.timestamp&&Number(e.bristolType)>=1&&Number(e.bristolType)<=7);await bulkSave(valid);await refresh();toast(`Imported ${valid.length} entries`);}catch{toast('That backup file is not valid.');}finally{ev.target.value='';} };
$('#deleteAllBtn').onclick=async()=>{ if(!await confirmAction('Delete every log?','This cannot be undone unless you have a backup. If signed in, these logs will also be removed from your cloud account on the next sync.'))return; state.entries.forEach(e=>queueCloudDeletion(e.id)); await clearEntries(); await refresh(); if(state.cloudUser&&navigator.onLine)flushCloudDeletions().then(()=>refreshCloudCount()).catch(console.error); toast('All local data deleted'); };


// ===== V3.1 Supabase account, sync, device identity and encrypted backups =====
const V3_KEYS={
  deviceId:'log-my-log-device-id',
  deviceName:'log-my-log-device-name'
};

const supabaseClient = globalThis.supabase?.createClient
  ? globalThis.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    })
  : null;

function makeDeviceId(){
  return globalThis.crypto?.randomUUID
    ? crypto.randomUUID()
    : `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}
function ensureDeviceIdentity(){
  let id=localStorage.getItem(V3_KEYS.deviceId);
  if(!id){ id=makeDeviceId(); localStorage.setItem(V3_KEYS.deviceId,id); }
  let name=localStorage.getItem(V3_KEYS.deviceName);
  if(!name){ name='This device'; localStorage.setItem(V3_KEYS.deviceName,name); }
  return {id,name};
}
function saveDeviceName(){
  const input=$('#deviceNameInput');
  const value=input?.value.trim();
  if(!value){ toast('Enter a device name'); return; }
  localStorage.setItem(V3_KEYS.deviceName,value);
  renderAccount();
  toast('Device name saved');
}
function setAuthMessage(message,isError=false){
  const el=$('#authMessage'); if(!el)return;
  el.textContent=message;
  el.classList.toggle('auth-error',isError);
}
function setSyncMessage(message,isError=false){
  const el=$('#syncMessage'); if(!el)return;
  el.textContent=message;
  el.classList.toggle('auth-error',isError);
}
function formatLastSync(){
  const raw=localStorage.getItem(CLOUD_LAST_SYNC_KEY);
  if(!raw)return 'Never';
  const d=new Date(raw);
  if(Number.isNaN(d.getTime()))return 'Never';
  const mins=Math.round((Date.now()-d.getTime())/60000);
  if(mins<1)return 'Just now';
  if(mins<60)return `${mins}m ago`;
  if(mins<1440)return `${Math.round(mins/60)}h ago`;
  return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'}).format(d);
}
function renderAccount(){
  const device=ensureDeviceIdentity();
  const signedIn=Boolean(state.cloudUser);
  $('#authSignedOut').hidden=signedIn;
  $('#authSignedIn').hidden=!signedIn;

  if($('#deviceIdLabel')) $('#deviceIdLabel').textContent=device.id;
  if($('#deviceNameLabel')) $('#deviceNameLabel').textContent=device.name;
  if($('#deviceNameInput')) $('#deviceNameInput').value=device.name;
  if($('#signedOutLocalCount')) $('#signedOutLocalCount').textContent=state.entries.length;

  const pill=$('#syncStatusPill');
  if(signedIn){
    pill.textContent=navigator.onLine?'Cloud connected':'Signed in · offline';
    pill.className=`sync-status-pill ${navigator.onLine?'ready':'local'}`;
    $('#accountEmail').textContent=state.cloudUser.email||'Signed-in account';
    $('#localLogCount').textContent=state.entries.length;
    $('#cloudLogCount').textContent=state.cloudCount===null?'—':state.cloudCount;
    $('#lastSyncLabel').textContent=formatLastSync();
    $('#signedInDeviceName').textContent=device.name;
    $('#signedInDeviceId').textContent=device.id;
  }else{
    pill.textContent='Local only';
    pill.className='sync-status-pill local';
  }
}
async function initialiseCloudAuth(){
  if(!supabaseClient){
    console.error('Supabase client library did not load');
    setAuthMessage('Cloud library is unavailable. Local logging still works.',true);
    return;
  }
  try{
    const {data,error}=await supabaseClient.auth.getSession();
    if(error)throw error;
    state.cloudUser=data.session?.user||null;
    if(state.cloudUser)localStorage.setItem(CLOUD_LAST_USER_KEY,state.cloudUser.id);
    renderAccount();
    if(state.cloudUser&&navigator.onLine) refreshCloudCount();
  }catch(err){
    console.error(err);
    setAuthMessage('Could not initialise cloud sign-in. Local logging still works.',true);
  }
  supabaseClient.auth.onAuthStateChange((event,session)=>{
    state.cloudUser=session?.user||null;
    if(state.cloudUser)localStorage.setItem(CLOUD_LAST_USER_KEY,state.cloudUser.id);
    state.cloudCount=null;
    setTimeout(()=>{
      renderAccount();
      if(state.cloudUser&&navigator.onLine) refreshCloudCount();
    },0);
  });
}
async function signUpCloud(){
  if(!supabaseClient)return setAuthMessage('Cloud library is unavailable.',true);
  const email=$('#authEmail')?.value.trim();
  const password=$('#authPassword')?.value||'';
  if(!email)return setAuthMessage('Enter your email address.',true);
  if(password.length<8)return setAuthMessage('Use a password of at least 8 characters.',true);
  setAuthMessage('Creating your account…');
  try{
    const redirectTo=`${location.origin}${location.pathname}`;
    const {data,error}=await supabaseClient.auth.signUp({
      email,password,options:{emailRedirectTo:redirectTo}
    });
    if(error)throw error;
    if(data.session){
      state.cloudUser=data.user;
      renderAccount();
      setSyncMessage('Account created. Your local logs have not been uploaded yet.');
    }else{
      setAuthMessage('Check your email to confirm the account, then return here and sign in.');
    }
  }catch(err){
    console.error(err);
    setAuthMessage(err.message||'Could not create account.',true);
  }
}
async function signInCloud(){
  if(!supabaseClient)return setAuthMessage('Cloud library is unavailable.',true);
  const email=$('#authEmail')?.value.trim();
  const password=$('#authPassword')?.value||'';
  if(!email||!password)return setAuthMessage('Enter your email and password.',true);
  setAuthMessage('Signing in…');
  try{
    const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
    if(error)throw error;
    state.cloudUser=data.user;
    localStorage.setItem(CLOUD_LAST_USER_KEY,data.user.id);
    setAuthMessage('');
    renderAccount();
    await refreshCloudCount();
    setSyncMessage(state.entries.length
      ? `${state.entries.length} local log${state.entries.length===1?'':'s'} ready to merge. Tap Sync now when you're ready.`
      : 'Signed in. Tap Sync now to download your cloud history.');
  }catch(err){
    console.error(err);
    setAuthMessage(err.message||'Could not sign in.',true);
  }
}
async function signOutCloud(){
  if(!supabaseClient)return;
  try{
    const {error}=await supabaseClient.auth.signOut();
    if(error)throw error;
    state.cloudUser=null;
    state.cloudCount=null;
    renderAccount();
    toast('Signed out — local logs remain on this device');
  }catch(err){
    console.error(err); toast('Could not sign out');
  }
}
function localToCloud(entry,userId){
  return {
    id:entry.id,
    user_id:userId,
    timestamp:entry.timestamp,
    bristol_type:Number(entry.bristolType),
    ease:entry.ease||null,
    urgency:entry.urgency||null,
    colour:entry.colour||null,
    duration:entry.duration===null||entry.duration===''?null:Number(entry.duration),
    location:entry.location||null,
    notes:entry.notes||null,
    tags:Array.isArray(entry.tags)?entry.tags:[],
    updated_at:entry.updatedAt||entry.timestamp||new Date().toISOString(),
    deleted_at:null
  };
}
function cloudToLocal(row){
  const d=new Date(row.timestamp);
  const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const time=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return {
    id:row.id,date,time,timestamp:row.timestamp,
    bristolType:Number(row.bristol_type),
    ease:row.ease||'',urgency:row.urgency||'',colour:row.colour||'Brown',
    duration:row.duration===null?null:Number(row.duration),
    location:row.location||'',notes:row.notes||'',tags:Array.isArray(row.tags)?row.tags:[],
    updatedAt:row.updated_at||row.timestamp
  };
}
async function fetchAllCloudLogs(){
  if(!supabaseClient||!state.cloudUser)return [];
  const rows=[];
  const pageSize=1000;
  for(let from=0;;from+=pageSize){
    const {data,error}=await supabaseClient.from('logs')
      .select('*')
      .is('deleted_at',null)
      .order('timestamp',{ascending:false})
      .range(from,from+pageSize-1);
    if(error)throw error;
    rows.push(...(data||[]));
    if(!data||data.length<pageSize)break;
  }
  return rows;
}
async function refreshCloudCount(){
  if(!supabaseClient||!state.cloudUser||!navigator.onLine)return;
  try{
    const {count,error}=await supabaseClient.from('logs')
      .select('id',{count:'exact',head:true})
      .is('deleted_at',null);
    if(error)throw error;
    state.cloudCount=count??0;
    renderAccount();
  }catch(err){
    console.error(err);
    state.cloudCount=null;
    renderAccount();
  }
}
function deleteQueue(){
  try{return JSON.parse(localStorage.getItem(CLOUD_DELETE_QUEUE_KEY)||'[]')}catch{return []}
}
function saveDeleteQueue(items){
  localStorage.setItem(CLOUD_DELETE_QUEUE_KEY,JSON.stringify(items));
}
function queueCloudDeletion(id){
  const owner=state.cloudUser?.id||localStorage.getItem(CLOUD_LAST_USER_KEY);
  if(!owner)return;
  const q=deleteQueue();
  if(!q.some(x=>x.id===id&&x.userId===owner))q.push({id,userId:owner,queuedAt:new Date().toISOString()});
  saveDeleteQueue(q);
}
async function flushCloudDeletions(){
  if(!supabaseClient||!state.cloudUser||!navigator.onLine)return;
  const q=deleteQueue();
  const mine=q.filter(x=>x.userId===state.cloudUser.id);
  if(!mine.length)return;
  const ids=mine.map(x=>x.id);
  const {error}=await supabaseClient.from('logs').delete().in('id',ids);
  if(error)throw error;
  saveDeleteQueue(q.filter(x=>x.userId!==state.cloudUser.id||!ids.includes(x.id)));
}
async function pushEntriesToCloud(entries){
  if(!supabaseClient||!state.cloudUser||!entries.length)return;
  const rows=entries.map(e=>localToCloud(e,state.cloudUser.id));
  const {error}=await supabaseClient.from('logs').upsert(rows,{onConflict:'id'});
  if(error)throw error;
}
async function pushOneQuietly(entry){
  if(!state.cloudUser||!navigator.onLine)return;
  try{
    await pushEntriesToCloud([entry]);
    localStorage.setItem(CLOUD_LAST_SYNC_KEY,new Date().toISOString());
    refreshCloudCount();
  }catch(err){
    console.error('Background cloud push failed',err);
  }
}
async function syncNow(){
  if(state.cloudBusy)return;
  if(!state.cloudUser)return toast('Sign in first');
  if(!navigator.onLine)return toast('You are offline — local logging still works');
  state.cloudBusy=true;
  $('#syncNowBtn').disabled=true;
  setSyncMessage('Syncing…');
  try{
    await flushCloudDeletions();
    const cloudRows=await fetchAllCloudLogs();
    const cloudById=new Map(cloudRows.map(r=>[r.id,r]));
    const localById=new Map(state.entries.map(e=>[e.id,e]));
    const toUpload=[];
    const toDownload=[];

    for(const local of state.entries){
      const cloud=cloudById.get(local.id);
      if(!cloud){ toUpload.push(local); continue; }
      const localTime=new Date(local.updatedAt||local.timestamp).getTime();
      const cloudTime=new Date(cloud.updated_at||cloud.timestamp).getTime();
      if(localTime>cloudTime+500)toUpload.push(local);
      else if(cloudTime>localTime+500)toDownload.push(cloudToLocal(cloud));
    }
    for(const cloud of cloudRows){
      if(!localById.has(cloud.id))toDownload.push(cloudToLocal(cloud));
    }

    if(toUpload.length)await pushEntriesToCloud(toUpload);
    if(toDownload.length)await bulkSave(toDownload);
    await refresh();

    const finalCloud=await fetchAllCloudLogs();
    state.cloudCount=finalCloud.length;
    localStorage.setItem(CLOUD_LAST_SYNC_KEY,new Date().toISOString());
    renderAccount();
    setSyncMessage(`Synced. ${toUpload.length} uploaded · ${toDownload.length} downloaded · ${state.entries.length} local.`);
    toast('Cloud sync complete');
  }catch(err){
    console.error(err);
    setSyncMessage(err.message||'Sync failed. Your local logs are unchanged.',true);
    toast('Cloud sync failed — local logs are safe');
  }finally{
    state.cloudBusy=false;
    if($('#syncNowBtn'))$('#syncNowBtn').disabled=false;
  }
}

function bytesToB64(bytes){
  let binary=''; bytes.forEach(b=>binary+=String.fromCharCode(b)); return btoa(binary);
}
function b64ToBytes(value){
  const binary=atob(value); return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
async function deriveBackupKey(password,salt){
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),{name:'PBKDF2'},false,['deriveKey']);
  return crypto.subtle.deriveKey(
    {name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},
    material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']
  );
}
async function exportEncryptedBackup(){
  const password=$('#backupPassword')?.value||'';
  if(password.length<8){toast('Use a password of at least 8 characters');return;}
  try{
    const salt=crypto.getRandomValues(new Uint8Array(16));
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const key=await deriveBackupKey(password,salt);
    const plain=new TextEncoder().encode(JSON.stringify({
      format:'log-my-log-encrypted-backup',version:1,
      exportedAt:new Date().toISOString(),entries:state.entries
    }));
    const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plain);
    const payload={format:'log-my-log-encrypted',version:1,salt:bytesToB64(salt),iv:bytesToB64(iv),data:bytesToB64(new Uint8Array(encrypted))};
    downloadFile(`log-my-log-encrypted-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(payload,null,2),'application/json');
    toast('Encrypted backup exported');
  }catch(err){console.error(err);toast('Could not create encrypted backup');}
}
async function importEncryptedBackup(file){
  const password=$('#backupPassword')?.value||'';
  if(password.length<8){toast('Enter the backup password first');return;}
  try{
    const parsed=JSON.parse(await file.text());
    if(parsed.format!=='log-my-log-encrypted')throw new Error('Wrong backup format');
    const salt=b64ToBytes(parsed.salt),iv=b64ToBytes(parsed.iv),data=b64ToBytes(parsed.data);
    const key=await deriveBackupKey(password,salt);
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,data);
    const payload=JSON.parse(new TextDecoder().decode(plain));
    if(!Array.isArray(payload.entries))throw new Error('No entries');
    await bulkSave(payload.entries); await refresh();
    toast(`Imported ${payload.entries.length} entries`);
  }catch(err){console.error(err);toast('Could not decrypt backup — check the password');}
  finally{if($('#importEncryptedInput'))$('#importEncryptedInput').value='';}
}
function bindV3AccountEvents(){
  $('#openAccountBtn')?.addEventListener('click',()=>showScreen('account'));
  $('#saveDeviceNameBtn')?.addEventListener('click',saveDeviceName);
  $('#signInBtn')?.addEventListener('click',signInCloud);
  $('#signUpBtn')?.addEventListener('click',signUpCloud);
  $('#signOutBtn')?.addEventListener('click',signOutCloud);
  $('#syncNowBtn')?.addEventListener('click',syncNow);
  $('#exportEncryptedBtn')?.addEventListener('click',exportEncryptedBackup);
  $('#importEncryptedInput')?.addEventListener('change',e=>{
    const file=e.target.files?.[0]; if(file)importEncryptedBackup(file);
  });
}

function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function syncInstallUI(){
  const installed=isStandalone();
  const canInstall=Boolean(state.deferredPrompt) && !installed;
  $('#installBtn').hidden=!canInstall;
  $('#onboardingInstallBtn').hidden=!canInstall;
  $('#settingsInstallBtn').hidden=installed;
  $('#appModeBadge').hidden=!installed;
  if(installed) $('#updateStatus').textContent=`Installed app · v${APP_VERSION}`;
}

async function promptInstall(){
  if(isStandalone()){
    toast('Log My Log is already installed');
    return;
  }
  if(!state.deferredPrompt){
    toast('Install is not available here yet — try the browser app menu.');
    return;
  }
  state.deferredPrompt.prompt();
  const choice=await state.deferredPrompt.userChoice;
  state.deferredPrompt=null;
  syncInstallUI();
  if(choice.outcome==='accepted') toast('Installing Log My Log…');
}

function updateConnectionUI(){
  const online=navigator.onLine;
  $('#offlineBanner').hidden=online;
  $('#connectionStatus').textContent=online?'Online':'Offline';
  $('#connectionStatus').classList.toggle('offline',!online);
}

function showOnboarding(force=false){
  if(!force && localStorage.getItem(ONBOARDING_KEY)==='seen') return;
  const d=$('#onboardingDialog');
  if(!d.open) d.showModal();
}

function finishOnboarding(goToLog=false){
  localStorage.setItem(ONBOARDING_KEY,'seen');
  const d=$('#onboardingDialog');
  if(d.open) d.close();
  if(goToLog){ resetForm(); showScreen('log'); }
}

function showUpdateReady(registration){
  state.swRegistration=registration||state.swRegistration;
  $('#updateBanner').hidden=false;
  $('#updateStatus').textContent='A new version is ready. Reload to update.';
}

async function registerServiceWorker(){
  if(!('serviceWorker' in navigator)){
    $('#updateStatus').textContent='Service workers are not supported in this browser.';
    return;
  }
  try{
    const reg=await navigator.serviceWorker.register('./sw.js?v=3.1');
    state.swRegistration=reg;
    if(reg.waiting && navigator.serviceWorker.controller) showUpdateReady(reg);
    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing;
      if(!worker)return;
      $('#updateStatus').textContent='Checking the new app version…';
      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed'){
          if(navigator.serviceWorker.controller) showUpdateReady(reg);
          else $('#updateStatus').textContent=`Offline app ready · v${APP_VERSION}`;
        }
      });
    });
  }catch(err){
    console.error(err);
    $('#updateStatus').textContent='Could not initialise offline support.';
  }
}

window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  state.deferredPrompt=e;
  syncInstallUI();
});
window.addEventListener('appinstalled',()=>{
  state.deferredPrompt=null;
  syncInstallUI();
  toast('Log My Log installed');
});
window.matchMedia('(display-mode: standalone)').addEventListener?.('change',syncInstallUI);
window.addEventListener('online',()=>{ updateConnectionUI(); renderAccount(); if(state.cloudUser)refreshCloudCount(); toast('Back online'); });
window.addEventListener('offline',()=>{ updateConnectionUI(); renderAccount(); toast('Offline mode — your logs still save locally'); });

$('#installBtn').onclick=promptInstall;
$('#settingsInstallBtn').onclick=promptInstall;
$('#onboardingInstallBtn').onclick=promptInstall;
$('#showOnboardingBtn').onclick=()=>showOnboarding(true);
$('#closeOnboardingBtn').onclick=()=>finishOnboarding(false);
$('#onboardingStartBtn').onclick=()=>finishOnboarding(true);
$('#onboardingDialog').addEventListener('cancel',ev=>{ ev.preventDefault(); finishOnboarding(false); });

$('#checkUpdateBtn').onclick=async()=>{
  if(!state.swRegistration){ toast('Offline support is still starting'); return; }
  $('#updateStatus').textContent='Checking for updates…';
  try{
    await state.swRegistration.update();
    if(state.swRegistration.waiting) showUpdateReady(state.swRegistration);
    else {
      $('#updateStatus').textContent=`You’re on the current app version · v${APP_VERSION}`;
      toast('You’re up to date');
    }
  }catch{
    $('#updateStatus').textContent='Could not check for updates. Try again when online.';
  }
};

$('#reloadUpdateBtn').onclick=()=>{
  const reg=state.swRegistration;
  if(reg?.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
  else location.reload();
};
let refreshing=false;
navigator.serviceWorker?.addEventListener('controllerchange',()=>{
  if(refreshing)return;
  refreshing=true;
  location.reload();
});

bindV3AccountEvents();
ensureDeviceIdentity();
initialiseCloudAuth();
updateConnectionUI();
syncInstallUI();
resetForm();
refresh().then(()=>{
  if(new URLSearchParams(location.search).get('action')==='log') showScreen('log');
  setTimeout(()=>showOnboarding(false),250);
});
window.addEventListener('load',registerServiceWorker);
