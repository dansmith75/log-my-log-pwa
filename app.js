import { getEntries, saveEntry, deleteEntry, clearEntries, bulkSave } from './db.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const APP_VERSION = '4.1.1';
const ONBOARDING_KEY = 'log-my-log-onboarding-v2.1';
const ACHIEVEMENT_KEY = 'log-my-log-achievements-v2.4';
const SUPABASE_URL = 'https://tltorblqdurqhtjcojti.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_J89f4SkcT-LNmv1KG-cfjQ_B5v9rbmS';
const CLOUD_LAST_SYNC_KEY = 'log-my-log-cloud-last-sync';
const CLOUD_LAST_USER_KEY = 'log-my-log-cloud-last-user';
const CLOUD_DELETE_QUEUE_KEY = 'log-my-log-cloud-delete-queue';
const AUTO_SYNC_KEY = 'log-my-log-auto-sync';
const CLOUD_SHADOW_KEY = 'log-my-log-cloud-shadow';
const WELCOME_TIP_KEY = 'log-my-log-welcome-tip-v3.3';
const REMINDER_SETTINGS_KEY = 'log-my-log-reminders-v4.1';
const REMINDER_LAST_SHOWN_KEY = 'log-my-log-reminder-last-shown';
const CAPTCHA_SITE_KEY = String(globalThis.LOG_MY_LOG_CAPTCHA_SITE_KEY||'').trim();
let captchaWidgetId = null;
const state = { entries: [], selectedType: 4, deferredPrompt: null, swRegistration: null, pendingAchievement: null, statsDays: 30, reportDays: 30, insightDays: 30, cloudUser: null, cloudBusy: false, cloudCount: null, cloudConflicts: 0, pendingUploads: 0 };

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
  if(name==='insights') renderInsights();
  if(name==='reminders') renderReminderSettings();
  if(name==='report') renderHealthReport();
  if(name==='account') renderAccount();
  scrollTo({top:0,behavior:'smooth'});
  const active=$(`#screen-${name}`);
  const heading=active?.querySelector('h2');
  if(heading){ heading.setAttribute('tabindex','-1'); heading.focus({preventScroll:true}); }
  document.title=name==='home'?'Log My Log':`${heading?.textContent||name} · Log My Log`;
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


function entriesBetweenDaysAgo(fromDaysAgo,toDaysAgo=0){
  const now=Date.now(),start=now-fromDaysAgo*86400000,end=now-toDaysAgo*86400000;
  return state.entries.filter(e=>{const t=new Date(e.timestamp).getTime();return t>=start&&t<end;});
}
function v4Average(values){
  const nums=values.filter(v=>Number.isFinite(v));
  return nums.length?nums.reduce((s,v)=>s+v,0)/nums.length:null;
}
function v4Percent(part,total){return total?Math.round(part/total*100):0;}
function baselineModel(days=30){
  const recent=entriesBetweenDaysAgo(days,0);
  const baseline=entriesBetweenDaysAgo(days*4,days);
  const stats=entries=>({
    n:entries.length,
    avgType:v4Average(entries.map(e=>Number(e.bristolType))),
    perWeek:entries.length/(days/7),
    idealPct:v4Percent(entries.filter(e=>[3,4,5].includes(Number(e.bristolType))).length,entries.length),
    highUrgencyPct:v4Percent(entries.filter(e=>e.urgency==='High').length,entries.length),
    difficultPct:v4Percent(entries.filter(e=>e.ease==='Difficult').length,entries.length)
  });
  return {days,recent,baseline,recentStats:stats(recent),baselineStats:stats(baseline)};
}
function v4TimeBucket(hour){
  if(hour>=5&&hour<9)return 'Early morning';
  if(hour>=9&&hour<12)return 'Morning';
  if(hour>=12&&hour<17)return 'Afternoon';
  if(hour>=17&&hour<22)return 'Evening';
  return 'Overnight';
}
function v4TopMode(values){
  if(!values.length)return null;
  const m={};values.forEach(v=>m[v]=(m[v]||0)+1);
  return Object.entries(m).sort((x,y)=>y[1]-x[1])[0]?.[0]||null;
}
function v4TagEntries(entries,tag){
  return entries.filter(e=>(e.tags||[]).map(x=>String(x).toLowerCase()).includes(tag));
}
function renderInsights(){
  if(!$('#baselineSummary'))return;
  const m=baselineModel(state.insightDays),r=m.recentStats,b=m.baselineStats;
  $('#baselineWindowLabel').textContent=`Last ${m.days} days compared with the previous ${m.days*3} days`;

  const cards=[
    ['Frequency',r.n?`${r.perWeek.toFixed(1)}/wk`:'—',b.n?`${r.perWeek-b.perWeek>=0?'+':''}${(r.perWeek-b.perWeek).toFixed(1)}/wk vs usual`:'Building baseline'],
    ['Average type',r.avgType!==null?r.avgType.toFixed(1):'—',b.avgType!==null?`${r.avgType-b.avgType>=0?'+':''}${(r.avgType-b.avgType).toFixed(1)} vs usual`:'Building baseline'],
    ['Types 3–5',r.n?`${r.idealPct}%`:'—',b.n?`${r.idealPct-b.idealPct>=0?'+':''}${r.idealPct-b.idealPct}% vs usual`:'Building baseline'],
    ['High urgency',r.n?`${r.highUrgencyPct}%`:'—',b.n?`${r.highUrgencyPct-b.highUrgencyPct>=0?'+':''}${r.highUrgencyPct-b.highUrgencyPct}% vs usual`:'Building baseline']
  ];
  $('#baselineSummary').innerHTML=cards.map(([label,value,sub])=>`<article class="baseline-card"><span>${label}</span><strong>${value}</strong><small>${sub}</small></article>`).join('');

  const changes=[];
  if(!r.n){
    changes.push(['Not enough recent data','Add a few logs in this period and comparisons will appear here.','neutral']);
  }else if(!b.n){
    changes.push(['Your baseline is still forming',`You have ${r.n} recent log${r.n===1?'':'s'}. Keep logging and Log My Log will learn your normal range.`,'neutral']);
  }else{
    const typeDiff=r.avgType-b.avgType;
    if(Math.abs(typeDiff)>=.35)changes.push([typeDiff>0?'Average type is higher':'Average type is lower',`Recent average Type ${r.avgType.toFixed(1)} versus your baseline of ${b.avgType.toFixed(1)}.`,typeDiff>0?'up':'down']);
    const freqDiff=r.perWeek-b.perWeek;
    if(Math.abs(freqDiff)>=1)changes.push([freqDiff>0?'You are logging more often':'You are logging less often',`${r.perWeek.toFixed(1)} per week recently versus ${b.perWeek.toFixed(1)} in your baseline.`,freqDiff>0?'up':'down']);
    const urgDiff=r.highUrgencyPct-b.highUrgencyPct;
    if(Math.abs(urgDiff)>=15)changes.push([urgDiff>0?'High urgency is showing up more':'High urgency is showing up less',`${r.highUrgencyPct}% recently versus ${b.highUrgencyPct}% in your baseline.`,urgDiff>0?'up':'down']);
    const easeDiff=r.difficultPct-b.difficultPct;
    if(Math.abs(easeDiff)>=15)changes.push([easeDiff>0?'Difficult passage is more common':'Difficult passage is less common',`${r.difficultPct}% recently versus ${b.difficultPct}% in your baseline.`,easeDiff>0?'up':'down']);
    if(!changes.length)changes.push(['Things look fairly steady','Your recent frequency, stool type, urgency and ease are close to your personal baseline.','steady']);
  }
  $('#changeInsights').innerHTML=changes.map(([title,text,tone])=>`<article class="change-insight ${tone}"><div class="change-dot"></div><div><strong>${title}</strong><p>${text}</p></div></article>`).join('');

  const recent=m.recent;
  const weekend=recent.filter(e=>[0,6].includes(new Date(e.timestamp).getDay()));
  const weekday=recent.filter(e=>![0,6].includes(new Date(e.timestamp).getDay()));
  const weekendAvg=v4Average(weekend.map(e=>Number(e.bristolType))),weekdayAvg=v4Average(weekday.map(e=>Number(e.bristolType)));
  const times=recent.map(e=>v4TimeBucket(new Date(e.timestamp).getHours()));
  const commonTime=v4TopMode(times);
  const locations=recent.map(e=>(e.location||'').trim()).filter(Boolean),commonLocation=v4TopMode(locations);
  const rhythm=[
    ['Most common time',commonTime||'Not enough data',commonTime?`${v4Percent(times.filter(x=>x===commonTime).length,times.length)}% of recent logs`:'Keep logging to build a pattern'],
    ['Weekend shift',(weekend.length>=2&&weekday.length>=2)?(Math.abs(weekendAvg-weekdayAvg)<.25?'Very similar':`Type ${weekendAvg.toFixed(1)} weekends`):'Building pattern',(weekend.length>=2&&weekday.length>=2)?(Math.abs(weekendAvg-weekdayAvg)<.25?'Weekends are close to weekdays':`${weekendAvg-weekdayAvg>0?'Higher':'Lower'} than weekday average Type ${weekdayAvg.toFixed(1)}`):'Needs a few weekday and weekend logs'],
    ['Most common location',commonLocation||'Not enough data',commonLocation?`${v4Percent(locations.filter(x=>x===commonLocation).length,locations.length)}% of logs with a location`:'Add locations if useful to you']
  ];
  $('#rhythmInsights').innerHTML=rhythm.map(([label,value,sub])=>`<article class="v4-insight-card"><span>${label}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(sub)}</small></article>`).join('');

  const tags=['coffee','alcohol','spicy','dairy','high-fibre','takeaway','bloating','cramps','gas','nausea'];
  const labels={coffee:'☕ Coffee',alcohol:'🍷 Alcohol',spicy:'🌶️ Spicy',dairy:'🥛 Dairy','high-fibre':'🌾 High fibre',takeaway:'🥡 Takeaway',bloating:'Bloating',cramps:'Cramps',gas:'Gas',nausea:'Nausea'};
  const overallAvg=v4Average(recent.map(e=>Number(e.bristolType)));
  const context=tags.map(tag=>{
    const matched=v4TagEntries(recent,tag);
    if(matched.length<3||overallAvg===null)return null;
    const avg=v4Average(matched.map(e=>Number(e.bristolType)));
    return {tag,n:matched.length,avg,diff:avg-overallAvg};
  }).filter(Boolean).sort((x,y)=>Math.abs(y.diff)-Math.abs(x.diff)).slice(0,6);

  $('#contextInsightsV4').innerHTML=context.length
    ? context.map(x=>`<article class="v4-insight-card"><span>${labels[x.tag]||escapeHtml(x.tag)}</span><strong>Avg Type ${x.avg.toFixed(1)}</strong><small>${x.diff>=0?'+':''}${x.diff.toFixed(1)} versus your recent average · ${x.n} tagged logs</small></article>`).join('')
    : '<div class="empty"><strong>Not enough repeated context yet.</strong><span>Use food, drink and symptom chips consistently and comparisons will appear here.</span></div>';
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
async function refresh(){ state.entries=await getEntries(); renderHome(); renderHistory(); renderStats(); if($('#screen-insights')?.classList.contains('active'))renderInsights(); }

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

$$('#insightsRange button').forEach(button=>button.addEventListener('click',()=>{
  state.insightDays=Number(button.dataset.insightDays);
  $$('#insightsRange button').forEach(b=>b.classList.toggle('active',b===button));
  renderInsights();
}));

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


function friendlyCloudError(err,fallback='Something went wrong. Please try again.'){const raw=String(err?.message||'').toLowerCase();if(!navigator.onLine)return 'You appear to be offline. Your local logs are safe.';if(raw.includes('invalid login')||raw.includes('invalid credentials'))return 'That email or password was not recognised.';if(raw.includes('email not confirmed'))return 'Please confirm your email address before signing in.';if(raw.includes('captcha'))return 'The bot check was not accepted. Please complete it again.';
  if(raw.includes('rate limit')||raw.includes('too many'))return 'Too many attempts. Please wait a little while and try again.';if(raw.includes('network')||raw.includes('fetch'))return 'Could not reach secure cloud storage. Your local logs are safe.';return fallback;}
function setBusy(button,busy,text){if(!button)return;if(busy){button.dataset.originalText=button.textContent;button.textContent=text;button.disabled=true;button.setAttribute('aria-busy','true');}else{button.textContent=button.dataset.originalText||button.textContent;button.disabled=false;button.removeAttribute('aria-busy');}}
// ===== V3.2 dependable Supabase sync =====
const V3_KEYS={
  deviceId:'log-my-log-device-id',
  deviceName:'log-my-log-device-name'
};

const supabaseClient = globalThis.supabase?.createClient
  ? globalThis.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    })
  : null;

function autoSyncEnabled(){
  const raw=localStorage.getItem(AUTO_SYNC_KEY);
  return raw===null ? true : raw==='true';
}
function setAutoSync(enabled){
  localStorage.setItem(AUTO_SYNC_KEY,String(Boolean(enabled)));
  renderAccount();
}
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
function lastSyncRaw(){ return localStorage.getItem(CLOUD_LAST_SYNC_KEY); }
function formatLastSync(){
  const raw=lastSyncRaw();
  if(!raw)return 'Never';
  const d=new Date(raw);
  if(Number.isNaN(d.getTime()))return 'Never';
  const mins=Math.round((Date.now()-d.getTime())/60000);
  if(mins<1)return 'Just now';
  if(mins<60)return `${mins}m ago`;
  if(mins<1440)return `${Math.round(mins/60)}h ago`;
  return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);
}
function shadowMap(){
  try{return JSON.parse(localStorage.getItem(CLOUD_SHADOW_KEY)||'{}')}catch{return {}}
}
function saveShadowMap(map){
  localStorage.setItem(CLOUD_SHADOW_KEY,JSON.stringify(map));
}
function deleteQueue(){
  try{return JSON.parse(localStorage.getItem(CLOUD_DELETE_QUEUE_KEY)||'[]')}catch{return []}
}
function saveDeleteQueue(items){
  localStorage.setItem(CLOUD_DELETE_QUEUE_KEY,JSON.stringify(items));
}
function ownedPendingDeletes(){
  const uid=state.cloudUser?.id||localStorage.getItem(CLOUD_LAST_USER_KEY);
  return uid?deleteQueue().filter(x=>x.userId===uid).length:0;
}
function localFingerprint(entry){
  return JSON.stringify({
    timestamp:entry.timestamp,bristolType:Number(entry.bristolType),
    ease:entry.ease||'',urgency:entry.urgency||'',colour:entry.colour||'',
    duration:entry.duration??null,location:entry.location||'',notes:entry.notes||'',
    tags:Array.isArray(entry.tags)?entry.tags:[]
  });
}
function cloudFingerprint(row){
  return JSON.stringify({
    timestamp:row.timestamp,bristolType:Number(row.bristol_type),
    ease:row.ease||'',urgency:row.urgency||'',colour:row.colour||'',
    duration:row.duration??null,location:row.location||'',notes:row.notes||'',
    tags:Array.isArray(row.tags)?row.tags:[]
  });
}
function updatePendingUploadEstimate(){
  if(!state.cloudUser){ state.pendingUploads=0; return 0; }
  const shadow=shadowMap();
  state.pendingUploads=state.entries.filter(e=>shadow[e.id]!==localFingerprint(e)).length;
  return state.pendingUploads;
}
function syncHealth(){
  if(!state.cloudUser)return {label:'Local only',kind:'local'};
  if(!navigator.onLine)return {label:`Offline · ${updatePendingUploadEstimate()+ownedPendingDeletes()} pending`,kind:'warning'};
  if(state.cloudBusy)return {label:'Syncing…',kind:'working'};
  const pending=updatePendingUploadEstimate()+ownedPendingDeletes();
  if(state.cloudConflicts>0)return {label:`${state.cloudConflicts} conflict${state.cloudConflicts===1?'':'s'} resolved`,kind:'warning'};
  if(pending>0)return {label:`${pending} change${pending===1?'':'s'} waiting`,kind:'warning'};
  return {label:'Synced',kind:'healthy'};
}
function renderAccount(){
  const device=ensureDeviceIdentity();
  const signedIn=Boolean(state.cloudUser);
  if($('#authSignedOut'))$('#authSignedOut').hidden=signedIn;
  if($('#authSignedIn'))$('#authSignedIn').hidden=!signedIn;

  if($('#deviceIdLabel'))$('#deviceIdLabel').textContent=device.id;
  if($('#deviceNameLabel'))$('#deviceNameLabel').textContent=device.name;
  if($('#deviceNameInput'))$('#deviceNameInput').value=device.name;
  if($('#signedOutLocalCount'))$('#signedOutLocalCount').textContent=state.entries.length;

  const pill=$('#syncStatusPill');
  if(!signedIn){
    if(pill){pill.textContent='Local only';pill.className='sync-status-pill local';}
    return;
  }

  updatePendingUploadEstimate();
  const health=syncHealth();
  if(pill){
    pill.textContent=health.label;
    pill.className=`sync-status-pill ${health.kind==='healthy'?'ready':'local'}`;
  }
  $('#accountEmail').textContent=state.cloudUser.email||'Signed-in account';loadProfile();if($('#accountSummary')){const cloudText=state.cloudCount===null?'checking cloud storage':`${state.cloudCount} log${state.cloudCount===1?'':'s'} protected in cloud storage`;$('#accountSummary').textContent=`Signed in · ${syncHealth().label} · ${cloudText}`;}
  $('#localLogCount').textContent=state.entries.length;
  $('#cloudLogCount').textContent=state.cloudCount===null?'—':state.cloudCount;
  $('#pendingSyncCount').textContent=state.pendingUploads+ownedPendingDeletes();
  $('#conflictCount').textContent=state.cloudConflicts;
  $('#syncLastDetail').textContent=`Last sync: ${formatLastSync()}`;
  $('#signedInDeviceName').textContent=device.name;
  $('#signedInDeviceId').textContent=device.id;

  const toggle=$('#autoSyncToggle');
  if(toggle)toggle.checked=autoSyncEnabled();
  if($('#autoSyncLabel'))$('#autoSyncLabel').textContent=autoSyncEnabled()?'On':'Off';

  const hb=$('#syncHealthBadge');
  if(hb){
    hb.className=`sync-health ${health.kind}`;
    hb.querySelector('strong').textContent=health.label;
  }

  if($('#diagAccount'))$('#diagAccount').textContent=state.cloudUser.email||'—';
  if($('#diagDevice'))$('#diagDevice').textContent=device.name;
  if($('#diagLocal'))$('#diagLocal').textContent=state.entries.length;
  if($('#diagCloud'))$('#diagCloud').textContent=state.cloudCount===null?'—':state.cloudCount;
  if($('#diagPendingDeletes'))$('#diagPendingDeletes').textContent=ownedPendingDeletes();
  if($('#diagPendingUploads'))$('#diagPendingUploads').textContent=state.pendingUploads;
  if($('#diagLastSync'))$('#diagLastSync').textContent=formatLastSync();
  if($('#diagStatus'))$('#diagStatus').textContent=health.label;
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
    if(state.cloudUser&&navigator.onLine){
      await refreshCloudCount();
      if(autoSyncEnabled())setTimeout(()=>syncNow({quiet:true}),500);
    }
  }catch(err){
    console.error(err);
    setAuthMessage('Could not initialise cloud sign-in. Local logging still works.',true);
  }
  supabaseClient.auth.onAuthStateChange((event,session)=>{
    state.cloudUser=session?.user||null;
    if(event==='PASSWORD_RECOVERY')setTimeout(openPasswordRecovery,0);
    if(state.cloudUser)localStorage.setItem(CLOUD_LAST_USER_KEY,state.cloudUser.id);
    state.cloudCount=null;
    state.cloudConflicts=0;
    setTimeout(async()=>{
      renderAccount();
      if(state.cloudUser&&navigator.onLine){
        await refreshCloudCount();
        if(autoSyncEnabled()&&['SIGNED_IN','TOKEN_REFRESHED','INITIAL_SESSION'].includes(event))syncNow({quiet:true});
      }
    },0);
  });
}

function captchaConfigured(){
  return Boolean(CAPTCHA_SITE_KEY);
}
function captchaToken(){
  return document.querySelector('#signupCaptcha input[name="cf-turnstile-response"]')?.value
    || document.querySelector('input[name="cf-turnstile-response"]')?.value
    || '';
}
function resetSignupCaptcha(){
  if(globalThis.turnstile&&captchaWidgetId!==null){
    try{globalThis.turnstile.reset(captchaWidgetId);}catch(err){console.error(err);}
  }
}
function renderSignupCaptcha(){
  const wrap=$('#signupCaptchaWrap'),host=$('#signupCaptcha');
  if(!wrap||!host)return;
  wrap.hidden=!captchaConfigured();
  if(!captchaConfigured()){
    if($('#captchaStatus'))$('#captchaStatus').textContent='Bot protection is not configured yet.';
    return;
  }
  const attempt=()=>{
    if(captchaWidgetId!==null)return;
    if(!globalThis.turnstile){setTimeout(attempt,150);return;}
    try{
      captchaWidgetId=globalThis.turnstile.render('#signupCaptcha',{
        sitekey:CAPTCHA_SITE_KEY,
        theme:'light',
        callback:()=>{if($('#captchaStatus'))$('#captchaStatus').textContent='Check complete.';},
        'expired-callback':()=>{if($('#captchaStatus'))$('#captchaStatus').textContent='The check expired. Please complete it again.';},
        'error-callback':()=>{if($('#captchaStatus'))$('#captchaStatus').textContent='The bot check could not load. Please try again.';}
      });
    }catch(err){console.error(err);}
  };
  attempt();
}

async function signUpCloud(){
  if(!supabaseClient)return setAuthMessage('Cloud library is unavailable.',true);
  const email=$('#authEmail')?.value.trim();
  const password=$('#authPassword')?.value||'';
  if(!email)return setAuthMessage('Enter your email address.',true);
  if(password.length<8)return setAuthMessage('Use a password of at least 8 characters.',true);
  const captcha=captchaToken();
  if(captchaConfigured()&&!captcha)return setAuthMessage('Complete the bot check before creating the account.',true);
  setAuthMessage('Creating your account…');
  try{
    const redirectTo=`${location.origin}${location.pathname}`;
    const {data,error}=await supabaseClient.auth.signUp({
      email,
      password,
      options:{emailRedirectTo:redirectTo,...(captcha?{captchaToken:captcha}:{})}
    });
    if(error)throw error;
    if(data.session){
      state.cloudUser=data.user; renderAccount();
      setSyncMessage('Account created. Automatic sync will merge your local history.');
      if(autoSyncEnabled())syncNow({quiet:true});
    }else setAuthMessage('Check your email to confirm the account, then return here and sign in.');
  }catch(err){console.error(err);setAuthMessage(friendlyCloudError(err,'Could not create the account. Please try again.'),true);}finally{resetSignupCaptcha();}
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
    setSyncMessage(autoSyncEnabled()?'Signed in. Syncing automatically…':'Signed in. Tap Sync now when you are ready.');
    if(autoSyncEnabled())syncNow({quiet:true});
  }catch(err){console.error(err);setAuthMessage(friendlyCloudError(err,'Could not sign in. Please try again.'),true);}
}
async function forgotPassword(){
  if(!supabaseClient)return;
  const email=$('#authEmail')?.value.trim();
  if(!email)return setAuthMessage('Enter your email address first.',true);
  try{
    const redirectTo=`${location.origin}${location.pathname}`;
    const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo});
    if(error)throw error;
    setAuthMessage('Password-reset email sent. Check your inbox.');
  }catch(err){console.error(err);setAuthMessage(friendlyCloudError(err,'Could not send the reset email. Please try again.'),true);}
}
async function sendPasswordResetForCurrentUser(){
  const email=state.cloudUser?.email;
  if(!email)return;
  try{
    const redirectTo=`${location.origin}${location.pathname}`;
    const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo});
    if(error)throw error;
    toast('Password-reset email sent');
  }catch(err){console.error(err);toast('Could not send reset email');}
}
async function changeAccountEmail(){
  const email=$('#newEmailInput')?.value.trim();
  if(!email)return toast('Enter a new email address');
  try{
    const {error}=await supabaseClient.auth.updateUser({email});
    if(error)throw error;
    $('#changeEmailDialog')?.close();
    toast('Email change requested — check your inbox');
  }catch(err){console.error(err);toast(friendlyCloudError(err,'Could not change the email address.'));}
}
async function signOutCloud(){
  if(!supabaseClient)return;
  try{
    const {error}=await supabaseClient.auth.signOut();
    if(error)throw error;
    state.cloudUser=null;state.cloudCount=null;state.cloudConflicts=0;state.pendingUploads=0;
    renderAccount();
    toast('Signed out — local logs remain on this device');
  }catch(err){console.error(err);toast('Could not sign out');}
}
function localToCloud(entry,userId){
  return {
    id:entry.id,user_id:userId,timestamp:entry.timestamp,
    bristol_type:Number(entry.bristolType),
    ease:entry.ease||null,urgency:entry.urgency||null,colour:entry.colour||null,
    duration:entry.duration===null||entry.duration===''?null:Number(entry.duration),
    location:entry.location||null,notes:entry.notes||null,
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
    id:row.id,date,time,timestamp:row.timestamp,bristolType:Number(row.bristol_type),
    ease:row.ease||'',urgency:row.urgency||'',colour:row.colour||'Brown',
    duration:row.duration===null?null:Number(row.duration),location:row.location||'',
    notes:row.notes||'',tags:Array.isArray(row.tags)?row.tags:[],
    updatedAt:row.updated_at||row.timestamp
  };
}
async function fetchAllCloudLogs(){
  if(!supabaseClient||!state.cloudUser)return [];
  const rows=[]; const pageSize=1000;
  for(let from=0;;from+=pageSize){
    const {data,error}=await supabaseClient.from('logs').select('*').is('deleted_at',null).order('timestamp',{ascending:false}).range(from,from+pageSize-1);
    if(error)throw error;
    rows.push(...(data||[]));
    if(!data||data.length<pageSize)break;
  }
  return rows;
}
async function refreshCloudCount(){
  if(!supabaseClient||!state.cloudUser||!navigator.onLine)return;
  try{
    const {count,error}=await supabaseClient.from('logs').select('id',{count:'exact',head:true}).is('deleted_at',null);
    if(error)throw error;
    state.cloudCount=count??0;renderAccount();
  }catch(err){console.error(err);state.cloudCount=null;renderAccount();}
}
function queueCloudDeletion(id){
  const owner=state.cloudUser?.id||localStorage.getItem(CLOUD_LAST_USER_KEY);
  if(!owner)return;
  const q=deleteQueue();
  if(!q.some(x=>x.id===id&&x.userId===owner))q.push({id,userId:owner,queuedAt:new Date().toISOString()});
  saveDeleteQueue(q);
  const shadow=shadowMap(); delete shadow[id]; saveShadowMap(shadow);
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
async function clearCloudData(){
  if(!state.cloudUser)return;
  const ok=await confirmAction('Clear all cloud logs?','This removes cloud copies for your account but leaves the logs on this device. Automatic sync will be turned off so they are not immediately uploaded again.');
  if(!ok)return;
  try{
    const {error}=await supabaseClient.from('logs').delete().eq('user_id',state.cloudUser.id);
    if(error)throw error;
    setAutoSync(false);
    saveShadowMap({});
    state.cloudCount=0;
    state.pendingUploads=state.entries.length;
    renderAccount();
    toast('Cloud data cleared — local logs kept');
  }catch(err){console.error(err);toast('Could not clear cloud data');}
}
async function pushOneQuietly(entry){
  renderAccount();
  if(!state.cloudUser||!navigator.onLine||!autoSyncEnabled())return;
  try{
    await pushEntriesToCloud([entry]);
    const shadow=shadowMap();shadow[entry.id]=localFingerprint(entry);saveShadowMap(shadow);
    localStorage.setItem(CLOUD_LAST_SYNC_KEY,new Date().toISOString());
    await refreshCloudCount();renderAccount();
  }catch(err){console.error('Background cloud push failed',err);renderAccount();}
}
async function syncNow(options={}){
  const quiet=Boolean(options.quiet);
  if(state.cloudBusy)return;
  if(!state.cloudUser){if(!quiet)toast('Sign in first');return;}
  if(!navigator.onLine){if(!quiet)toast('You are offline — local logging still works');renderAccount();return;}
  state.cloudBusy=true;state.cloudConflicts=0;
  if($('#syncNowBtn'))$('#syncNowBtn').disabled=true;
  if(!quiet)setSyncMessage('Syncing…');
  renderAccount();

  try{
    await flushCloudDeletions();
    const cloudRows=await fetchAllCloudLogs();
    const cloudById=new Map(cloudRows.map(r=>[r.id,r]));
    const localById=new Map(state.entries.map(e=>[e.id,e]));
    const shadow=shadowMap();
    const toUpload=[],toDownload=[];
    let conflicts=0;

    for(const local of state.entries){
      const cloud=cloudById.get(local.id);
      if(!cloud){toUpload.push(local);continue;}

      const localFp=localFingerprint(local);
      const cloudFp=cloudFingerprint(cloud);
      const baseFp=shadow[local.id]||null;
      const localChanged=baseFp?localFp!==baseFp:false;
      const cloudChanged=baseFp?cloudFp!==baseFp:false;

      if(localChanged&&cloudChanged&&localFp!==cloudFp){
        conflicts++;
        const localTime=new Date(local.updatedAt||local.timestamp).getTime();
        const cloudTime=new Date(cloud.updated_at||cloud.timestamp).getTime();
        if(localTime>=cloudTime)toUpload.push(local);
        else toDownload.push(cloudToLocal(cloud));
      }else if(localChanged&&localFp!==cloudFp){
        toUpload.push(local);
      }else if(cloudChanged&&localFp!==cloudFp){
        toDownload.push(cloudToLocal(cloud));
      }else if(!baseFp&&localFp!==cloudFp){
        const localTime=new Date(local.updatedAt||local.timestamp).getTime();
        const cloudTime=new Date(cloud.updated_at||cloud.timestamp).getTime();
        if(localTime>=cloudTime)toUpload.push(local);
        else toDownload.push(cloudToLocal(cloud));
      }
    }

    for(const cloud of cloudRows){
      if(!localById.has(cloud.id))toDownload.push(cloudToLocal(cloud));
    }

    if(toUpload.length)await pushEntriesToCloud(toUpload);
    if(toDownload.length)await bulkSave(toDownload);
    await refresh();

    const finalRows=await fetchAllCloudLogs();
    const finalIds=new Set(finalRows.map(r=>r.id));
    const finalShadow={};

    // Successful sync establishes a fresh common baseline.
    // Use the local representation after refresh so the pending detector
    // compares like-for-like on the next render.
    for(const entry of state.entries){
      if(finalIds.has(entry.id)) finalShadow[entry.id]=localFingerprint(entry);
    }
    saveShadowMap(finalShadow);

    state.cloudCount=finalRows.length;
    state.cloudConflicts=conflicts;
    state.pendingUploads=0;
    localStorage.setItem(CLOUD_LAST_SYNC_KEY,new Date().toISOString());
    renderAccount();

    const msg=conflicts
      ? `Synced with ${conflicts} conflict${conflicts===1?'':'s'} resolved using the newer edit.`
      : `Synced. ${toUpload.length} uploaded · ${toDownload.length} downloaded.`;
    setSyncMessage(msg);
    if(!quiet)toast('Cloud sync complete');
  }catch(err){
    console.error(err);
    setSyncMessage(friendlyCloudError(err,'Sync did not complete. Your local logs are unchanged.'),true);
    if(!quiet)toast('Cloud sync failed — local logs are safe');
  }finally{
    state.cloudBusy=false;
    if($('#syncNowBtn'))$('#syncNowBtn').disabled=false;
    renderAccount();
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
  $('#forgotPasswordBtn')?.addEventListener('click',forgotPassword);
  $('#saveRecoveredPasswordBtn')?.addEventListener('click',saveRecoveredPassword);
  $('#profileCountry')?.addEventListener('change',()=>populateProfileRegions(''));
  $('#saveProfileBtn')?.addEventListener('click',saveProfile);
  $('#deleteAccountBtn')?.addEventListener('click',openDeleteAccount);
  $('#confirmDeleteAccountBtn')?.addEventListener('click',deleteMyAccount);
  $('#signOutBtn')?.addEventListener('click',signOutCloud);
  $('#syncNowBtn')?.addEventListener('click',()=>syncNow());
  $('#autoSyncToggle')?.addEventListener('change',e=>{
    setAutoSync(e.target.checked);
    toast(e.target.checked?'Automatic sync on':'Automatic sync off');
    if(e.target.checked&&state.cloudUser&&navigator.onLine)syncNow({quiet:true});
  });
  $('#changePasswordBtn')?.addEventListener('click',sendPasswordResetForCurrentUser);
  $('#changeEmailBtn')?.addEventListener('click',()=>$('#changeEmailDialog')?.showModal());
  $('#confirmChangeEmailBtn')?.addEventListener('click',changeAccountEmail);
  $('#clearCloudBtn')?.addEventListener('click',clearCloudData);
  $('#exportEncryptedBtn')?.addEventListener('click',exportEncryptedBackup);
  $('#importEncryptedInput')?.addEventListener('change',e=>{
    const file=e.target.files?.[0]; if(file)importEncryptedBackup(file);
  });
}


function renderWelcomeTip(){
  const tip=$('#welcomeTip');
  if(!tip)return;
  tip.hidden=localStorage.getItem(WELCOME_TIP_KEY)==='dismissed';
}
function dismissWelcomeTip(){
  localStorage.setItem(WELCOME_TIP_KEY,'dismissed');
  renderWelcomeTip();
}

function openPasswordRecovery(){const x=$('#passwordRecoveryDialog');if(x&&!x.open)x.showModal();}
async function saveRecoveredPassword(){const password=$('#recoveryPassword')?.value||'',confirm=$('#recoveryPasswordConfirm')?.value||'',msg=$('#recoveryMessage');if(password.length<8){msg.textContent='Use at least 8 characters.';return;}if(password!==confirm){msg.textContent='Those passwords do not match.';return;}const btn=$('#saveRecoveredPasswordBtn');setBusy(btn,true,'Saving…');try{const {error}=await supabaseClient.auth.updateUser({password});if(error)throw error;$('#passwordRecoveryDialog')?.close();toast('Password updated — you are signed in');}catch(err){console.error(err);msg.textContent=friendlyCloudError(err,'Could not update the password. Please request a fresh reset link.');}finally{setBusy(btn,false);}}

const PROFILE_REGIONS={
  GB:["Bedfordshire","Berkshire","Bristol","Buckinghamshire","Cambridgeshire","Cheshire","Cornwall","Cumbria","Derbyshire","Devon","Dorset","Durham","East Sussex","Essex","Gloucestershire","Greater London","Greater Manchester","Hampshire","Herefordshire","Hertfordshire","Isle of Wight","Kent","Lancashire","Leicestershire","Lincolnshire","Merseyside","Norfolk","North Yorkshire","Northamptonshire","Northumberland","Nottinghamshire","Oxfordshire","Rutland","Shropshire","Somerset","South Yorkshire","Staffordshire","Suffolk","Surrey","Tyne and Wear","Warwickshire","West Midlands","West Sussex","West Yorkshire","Wiltshire","Worcestershire","Scotland","Wales","Northern Ireland"],
  IE:["Carlow","Cavan","Clare","Cork","Donegal","Dublin","Galway","Kerry","Kildare","Kilkenny","Laois","Leitrim","Limerick","Longford","Louth","Mayo","Meath","Monaghan","Offaly","Roscommon","Sligo","Tipperary","Waterford","Westmeath","Wexford","Wicklow"],
  US:["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming","District of Columbia"],
  CA:["Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland and Labrador","Northwest Territories","Nova Scotia","Nunavut","Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon"],
  AU:["Australian Capital Territory","New South Wales","Northern Territory","Queensland","South Australia","Tasmania","Victoria","Western Australia"],
  NZ:["Auckland","Bay of Plenty","Canterbury","Gisborne","Hawke's Bay","Manawatū-Whanganui","Marlborough","Nelson","Northland","Otago","Southland","Taranaki","Tasman","Waikato","Wellington","West Coast"]
};
function populateProfileRegions(selected=''){
  const country=$('#profileCountry')?.value||'', select=$('#profileRegion'); if(!select)return;
  const regions=PROFILE_REGIONS[country]||["Other / not listed"];
  select.innerHTML='<option value="">Not specified</option>'+regions.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('');
  if(selected && !regions.includes(selected)){const o=document.createElement('option');o.value=selected;o.textContent=selected;select.appendChild(o);}
  select.value=selected||'';
}
async function loadProfile(){
  if(!state.cloudUser){
    for(const id of ['profileFirstName','profileSurname','profileNickname','profileMobile','profileYearOfBirth']){
      if($(`#${id}`))$(`#${id}`).value='';
    }
    if($('#profileCountry'))$('#profileCountry').value='';
    populateProfileRegions('');
    return;
  }
  try{
    const {data,error}=await supabaseClient.from('profiles')
      .select('first_name,surname,nickname,mobile,year_of_birth,country,region')
      .eq('id',state.cloudUser.id)
      .maybeSingle();
    if(error)throw error;
    const profile=data||{};
    if($('#profileFirstName'))$('#profileFirstName').value=profile.first_name||'';
    if($('#profileSurname'))$('#profileSurname').value=profile.surname||'';
    if($('#profileNickname'))$('#profileNickname').value=profile.nickname||'';
    if($('#profileMobile'))$('#profileMobile').value=profile.mobile||'';
    if($('#profileYearOfBirth'))$('#profileYearOfBirth').value=profile.year_of_birth||'';
    if($('#profileCountry'))$('#profileCountry').value=profile.country||'';
    populateProfileRegions(profile.region||'');
    if($('#profileMessage'))$('#profileMessage').textContent=data
      ? 'Stored securely in your private profile.'
      : 'No profile saved yet — every field is optional.';
  }catch(err){
    console.error('Could not load profile',err);
    if($('#profileMessage'))$('#profileMessage').textContent=friendlyCloudError(err,'Could not load your profile. Your logs are unaffected.');
  }
}
async function saveProfile(){
  if(!state.cloudUser){toast('Sign in to save your profile');return;}
  const currentYear=new Date().getFullYear();
  const yearRaw=$('#profileYearOfBirth')?.value.trim()||'';
  const yearOfBirth=yearRaw?Number(yearRaw):null;
  if(yearOfBirth!==null&&(!Number.isInteger(yearOfBirth)||yearOfBirth<1900||yearOfBirth>currentYear)){
    if($('#profileMessage'))$('#profileMessage').textContent=`Enter a year between 1900 and ${currentYear}, or leave it blank.`;
    return;
  }
  const btn=$('#saveProfileBtn');setBusy(btn,true,'Saving…');
  const profile={
    id:state.cloudUser.id,
    first_name:$('#profileFirstName')?.value.trim()||null,
    surname:$('#profileSurname')?.value.trim()||null,
    nickname:$('#profileNickname')?.value.trim()||null,
    mobile:$('#profileMobile')?.value.trim()||null,
    year_of_birth:yearOfBirth,
    country:$('#profileCountry')?.value||null,
    region:$('#profileRegion')?.value||null,
    updated_at:new Date().toISOString()
  };
  try{
    const {error}=await supabaseClient.from('profiles').upsert(profile,{onConflict:'id'});
    if(error)throw error;
    await loadProfile();
    if($('#profileMessage'))$('#profileMessage').textContent='Profile saved.';
    toast('Profile saved');
  }catch(err){
    console.error(err);
    if($('#profileMessage'))$('#profileMessage').textContent=friendlyCloudError(err,'Could not save your profile.');
  }finally{setBusy(btn,false);}
}
function openDeleteAccount(){
  if(!state.cloudUser){toast('Sign in before deleting your account');return;}
  if($('#deleteAccountConfirm'))$('#deleteAccountConfirm').value='';
  if($('#deleteAccountMessage'))$('#deleteAccountMessage').textContent='This cannot be undone.';
  $('#deleteAccountDialog')?.showModal();
}
async function deleteMyAccount(){
  if($('#deleteAccountConfirm')?.value.trim()!=='DELETE'){if($('#deleteAccountMessage'))$('#deleteAccountMessage').textContent='Type DELETE exactly to confirm.';return;}
  const btn=$('#confirmDeleteAccountBtn');setBusy(btn,true,'Deleting…');
  try{
    const {error}=await supabaseClient.rpc('delete_my_account');if(error)throw error;
    try{await supabaseClient.auth.signOut();}catch(_){}
    state.cloudUser=null;state.cloudCount=null;$('#deleteAccountDialog')?.close();toast('Account deleted. Local logs remain on this device.');showScreen('settings');
  }catch(err){console.error(err);if($('#deleteAccountMessage'))$('#deleteAccountMessage').textContent=friendlyCloudError(err,'Could not delete the account. Please try again.');}
  finally{setBusy(btn,false);}
}

function defaultReminderSettings(){
  return {enabled:false,time:'19:00',days:[1,2,3,4,5,6,0],missedDay:true};
}
function loadReminderSettings(){
  try{
    return {...defaultReminderSettings(),...JSON.parse(localStorage.getItem(REMINDER_SETTINGS_KEY)||'{}')};
  }catch{return defaultReminderSettings();}
}
function saveReminderSettings(settings){
  localStorage.setItem(REMINDER_SETTINGS_KEY,JSON.stringify(settings));
}
function renderReminderSettings(){
  if(!$('#reminderEnabled'))return;
  const settings=loadReminderSettings();
  $('#reminderEnabled').checked=Boolean(settings.enabled);
  $('#reminderTime').value=settings.time||'19:00';
  $('#missedDayNudge').checked=settings.missedDay!==false;
  $$('#reminderDays button').forEach(btn=>{
    const selected=(settings.days||[]).includes(Number(btn.dataset.day));
    btn.classList.toggle('active',selected);
    btn.setAttribute('aria-pressed',String(selected));
  });
  $('#reminderControls').classList.toggle('reminder-disabled',!settings.enabled);
  renderNotificationPermission();
  updateReminderStatus();
}
function currentReminderSettingsFromUI(){
  return {
    enabled:Boolean($('#reminderEnabled')?.checked),
    time:$('#reminderTime')?.value||'19:00',
    days:$$('#reminderDays button.active').map(btn=>Number(btn.dataset.day)),
    missedDay:Boolean($('#missedDayNudge')?.checked)
  };
}
function saveRemindersFromUI(){
  const settings=currentReminderSettingsFromUI();
  if(settings.enabled&&!settings.days.length){
    $('#reminderStatus').textContent='Choose at least one reminder day.';
    return;
  }
  saveReminderSettings(settings);
  renderReminderSettings();
  toast(settings.enabled?'Reminders saved':'Reminders turned off');
}
function renderNotificationPermission(){
  const text=$('#notificationPermissionText'),button=$('#enableNotificationsBtn');
  if(!text||!button)return;
  if(!('Notification' in window)){
    text.textContent='Browser notifications are not supported here. In-app nudges still work.';
    button.hidden=true;return;
  }
  button.hidden=false;
  if(Notification.permission==='granted'){
    text.textContent='Notifications are enabled on this device.';
    button.textContent='Enabled';
    button.disabled=true;
  }else if(Notification.permission==='denied'){
    text.textContent='Notifications are blocked in the browser. In-app nudges still work.';
    button.textContent='Blocked';
    button.disabled=true;
  }else{
    text.textContent='Optional. Allows reminders while Log My Log is open.';
    button.textContent='Enable notifications';
    button.disabled=false;
  }
}
async function requestReminderNotifications(){
  if(!('Notification' in window))return toast('Notifications are not supported here');
  try{
    const result=await Notification.requestPermission();
    renderNotificationPermission();
    toast(result==='granted'?'Notifications enabled':'Notification permission was not enabled');
  }catch(err){
    console.error(err);toast('Could not request notification permission');
  }
}
function todayHasLog(date=new Date()){
  const key=dayKey(date);
  return state.entries.some(e=>dayKey(e.timestamp)===key);
}
function selectedReminderDay(date,settings){
  return (settings.days||[]).includes(date.getDay());
}
function minutesNow(date=new Date()){
  return date.getHours()*60+date.getMinutes();
}
function reminderMinutes(settings){
  const [h,m]=String(settings.time||'19:00').split(':').map(Number);
  return (Number.isFinite(h)?h:19)*60+(Number.isFinite(m)?m:0);
}
function reminderShownKey(date=new Date()){
  return dayKey(date);
}
function showReminderPrompt(title,body){
  const today=reminderShownKey();
  if(localStorage.getItem(REMINDER_LAST_SHOWN_KEY)===today)return;
  localStorage.setItem(REMINDER_LAST_SHOWN_KEY,today);
  if('Notification' in window&&Notification.permission==='granted'&&document.visibilityState==='visible'){
    try{new Notification(title,{body,icon:'icons/icon-192.png',tag:'log-my-log-reminder'});}catch(err){console.error(err);}
  }
  toast(body);
}
function checkDueReminder(){
  const settings=loadReminderSettings();
  if(!settings.enabled)return;
  const now=new Date();
  if(!selectedReminderDay(now,settings))return;
  if(todayHasLog(now))return;
  if(minutesNow(now)<reminderMinutes(settings))return;
  showReminderPrompt('Log My Log','No log recorded today — add one if there is anything worth tracking.');
}
function checkMissedDayNudge(){
  const settings=loadReminderSettings();
  if(!settings.enabled||settings.missedDay===false)return;
  const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  if(!selectedReminderDay(yesterday,settings)||todayHasLog(yesterday))return;
  const key=`missed-${dayKey(yesterday)}`;
  if(sessionStorage.getItem(key))return;
  sessionStorage.setItem(key,'shown');
  const status=$('#a11yStatus');if(status)status.textContent='Yesterday has no log recorded.';
  setTimeout(()=>toast('Yesterday has no log recorded — that is fine. Add one only if you meant to.'),600);
}
function updateReminderStatus(){
  const el=$('#reminderStatus');if(!el)return;
  const s=loadReminderSettings();
  if(!s.enabled){el.textContent='Reminders are off on this device.';return;}
  const days=(s.days||[]).length===7?'every day':`${(s.days||[]).length} selected day${(s.days||[]).length===1?'':'s'}`;
  el.textContent=`Reminder set for ${s.time} on ${days}.`;
}
function startReminderClock(){
  checkDueReminder();
  window.setInterval(checkDueReminder,60000);
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
    const reg=await navigator.serviceWorker.register('./sw.js?v=4.1.1');
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
window.addEventListener('online',()=>{ updateConnectionUI(); renderAccount(); if(state.cloudUser){refreshCloudCount(); if(autoSyncEnabled())syncNow({quiet:true});} toast('Back online'); });
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

$('#dismissWelcomeTip')?.addEventListener('click',dismissWelcomeTip);
renderWelcomeTip();
$('#reminderEnabled')?.addEventListener('change',()=>{
  $('#reminderControls')?.classList.toggle('reminder-disabled',!$('#reminderEnabled').checked);
});
$$('#reminderDays button').forEach(btn=>btn.addEventListener('click',()=>{
  btn.classList.toggle('active');
  btn.setAttribute('aria-pressed',String(btn.classList.contains('active')));
}));
$('#saveReminderBtn')?.addEventListener('click',saveRemindersFromUI);
$('#enableNotificationsBtn')?.addEventListener('click',requestReminderNotifications);
renderReminderSettings();
renderSignupCaptcha();
startReminderClock();
setTimeout(checkMissedDayNudge,900);

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

document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){checkDueReminder();checkMissedDayNudge();}});
