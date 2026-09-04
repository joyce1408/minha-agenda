const savedEvents = JSON.parse(localStorage.getItem('ma-v2-events') || 'null');
const savedTasks = JSON.parse(localStorage.getItem('ma-v2-tasks') || 'null');
const savedReminders = JSON.parse(localStorage.getItem('ma-v2-reminders') || 'null');

const state = {
  date: new Date(),
  calendarView: 'day',
  filter: 'all',
  showSource: true,
  events: savedEvents || [
    {id:1,title:'Reunião financeira',date:isoDate(new Date()),time:'09:00',source:'microsoft',location:'Teams',done:false,reminder:true},
    {id:2,title:'Consulta / compromisso',date:isoDate(addDays(new Date(),1)),time:'14:30',source:'apple',location:'',done:false,reminder:true},
    {id:3,title:'Planejamento semanal',date:isoDate(addDays(new Date(),2)),time:'19:00',source:'google',location:'',done:false,reminder:false},
    {id:4,title:'Comprar materiais',date:isoDate(new Date()),time:'18:00',source:'local',location:'',done:false,reminder:true}
  ],
  tasks: savedTasks || [
    {id:1,title:'Revisar pendências do setor',date:isoDate(new Date()),done:false},
    {id:2,title:'Organizar documentos',date:isoDate(addDays(new Date(),1)),done:false}
  ],
  reminders: (savedReminders || [
    {id:1,text:'Marcar retorno e separar documentos'},
    {id:2,text:'Verificar compromissos da próxima semana'}
  ]).map(r => ({...r, done: Boolean(r.done)}))
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const sourceLabel = {apple:'Apple', google:'Google', microsoft:'Outlook / Teams', local:'Minha Agenda'};

function isoDate(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString().slice(0,10) }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x }
function fmtDate(d){ return new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).format(d) }
function fmtShort(s){ const [y,m,d]=s.split('-').map(Number); return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}` }
function pad(n){return String(n).padStart(2,'0')}
function save(){
  localStorage.setItem('ma-v2-events',JSON.stringify(state.events));
  localStorage.setItem('ma-v2-tasks',JSON.stringify(state.tasks));
  localStorage.setItem('ma-v2-reminders',JSON.stringify(state.reminders));
}
function eventsFor(date){
  const key=isoDate(date);
  return state.events.filter(e=>e.date===key).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'))
}
function sourceClass(s){return s}

function render(){
  $('#todayEyebrow').textContent = fmtDate(new Date());
  $('#currentDateLabel').textContent = fmtShort(isoDate(state.date));
  $('#summaryAll').textContent = eventsFor(new Date()).length;
  $('#summaryPending').textContent = state.events.filter(e=>!e.done).length;
  $('#summaryTasks').textContent = state.tasks.filter(t=>!t.done).length;
  $('#summaryUrgent').textContent = state.events.filter(e=>{
    const d=new Date(e.date+'T00:00:00'); const now=new Date();
    const diff=(d-new Date(now.getFullYear(),now.getMonth(),now.getDate()))/86400000;
    return diff>=0&&diff<=3&&!e.done
  }).length;
  renderCalendar(); renderUpcoming(); renderTasks(); renderReminders();
}

function renderCalendar(){
  const box=$('#calendarContent');
  if(state.calendarView==='day') box.innerHTML=renderDay();
  if(state.calendarView==='week') box.innerHTML=renderWeek();
  if(state.calendarView==='month') box.innerHTML=renderMonth();
  if(state.calendarView==='year') box.innerHTML=renderYear();
}
function renderDay(){
  const items=eventsFor(state.date), hours=Array.from({length:15},(_,i)=>i+7);
  return `<div class="calendar-day"><div class="day-head"><div><div class="eyebrow">DIA SELECIONADO</div><div class="day-title">${fmtDate(state.date)}</div></div><div class="source-badge">${items.length} evento(s)</div></div><div class="timeline">${hours.map(h=>{
    const inHour=items.filter(e=>(e.time||'').startsWith(pad(h)));
    return `<div class="hour-row"><div class="hour-label">${pad(h)}:00</div><div class="hour-slot">${inHour.map(eventChip).join('')}</div></div>`;
  }).join('')}</div></div>`;
}
function eventChip(e){
  return `<div class="event-chip ${sourceClass(e.source)} ${e.done?'done':''}"><strong>${e.time||'Sem horário'} · ${escapeHtml(e.title)}</strong><small>${e.location?escapeHtml(e.location)+' · ':''}${sourceLabel[e.source]}</small></div>`
}
function startOfWeek(d){const x=new Date(d); const day=x.getDay(); x.setDate(x.getDate()-(day===0?6:day-1)); return x}
function renderWeek(){
  const start=startOfWeek(state.date), times=Array.from({length:14},(_,i)=>i+8), days=Array.from({length:7},(_,i)=>addDays(start,i));
  const header=days.map(d=>`<div>${new Intl.DateTimeFormat('pt-BR',{weekday:'short'}).format(d)}<br><b>${pad(d.getDate())}</b></div>`).join('');
  let body='';
  times.forEach(h=>{
    body += `<div class="week-time">${pad(h)}</div>`;
    days.forEach(d=>{
      const items=eventsFor(d).filter(e=>(e.time||'').startsWith(pad(h)));
      body += `<div class="week-cell">${items.map(e=>`<div class="mini-event">${escapeHtml(e.time||'')} ${escapeHtml(e.title)}</div>`).join('')}</div>`;
    });
  });
  return `<div class="week-grid"><div class="week-header"><div></div>${header}</div><div class="week-body">${body}</div></div>`;
}
function renderMonth(){
  const y=state.date.getFullYear(),m=state.date.getMonth(),first=new Date(y,m,1),offset=(first.getDay()+6)%7,daysIn=new Date(y,m+1,0).getDate();
  const cells=[]; for(let i=0;i<offset;i++) cells.push('<div class="month-cell muted"></div>');
  for(let day=1;day<=daysIn;day++){
    const d=new Date(y,m,day), items=eventsFor(d);
    cells.push(`<div class="month-cell"><div class="month-day-number">${day}</div>${items.slice(0,3).map(e=>`<div class="mini-event">${escapeHtml(e.time||'')} ${escapeHtml(e.title)}</div>`).join('')}</div>`)
  }
  return `<div class="month-grid">${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(x=>`<div class="month-head">${x}</div>`).join('')}${cells.join('')}</div>`;
}
function renderYear(){
  const y=state.date.getFullYear();
  const names=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `<div class="year-grid">${names.map((name,m)=>{
    const days=new Date(y,m+1,0).getDate();
    return `<article class="year-month"><h3>${name}</h3><div class="year-month-grid">${Array.from({length:days},(_,i)=>{const d=new Date(y,m,i+1),has=eventsFor(d).length;return `<span class="${has?'has-event':''}">${i+1}</span>`}).join('')}</div></article>`
  }).join('')}</div>`;
}

function renderUpcoming(){
  const nowKey=isoDate(new Date());
  const list=[...state.events].filter(e=>e.date>=nowKey && !e.done).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,15);
  $('#upcomingList').innerHTML=list.length?list.map(e=>`<article class="agenda-card"><div class="time-col"><strong>${e.time||'—'}</strong><span>${fmtShort(e.date)}</span></div><div class="card-main"><h3>${escapeHtml(e.title)}</h3><p>${e.location?escapeHtml(e.location):'Sem local'}</p></div><button class="source-badge ${e.source}" onclick="toggleEvent(${e.id})">${state.showSource?sourceLabel[e.source]:'○'}</button></article>`).join(''):'<div class="panel muted">Nenhum compromisso encontrado.</div>';
}
window.toggleEvent=id=>{const e=state.events.find(x=>x.id===id); if(e){e.done=!e.done;save();render()}}

function renderTasks(){
  const pending=state.tasks.filter(t=>!t.done), completed=state.tasks.filter(t=>t.done);
  $('#taskList').innerHTML=`<div class="cards">${pending.length?pending.map(taskCard).join(''):'<div class="panel muted">Nenhuma tarefa pendente.</div>'}</div>${completed.length?`<div class="history-card standalone-history"><h3>Tarefas concluídas</h3>${completed.map(t=>`<div class="history-item done"><strong>${escapeHtml(t.title)}</strong><div>${fmtShort(t.date)}</div></div>`).join('')}</div>`:''}`;
}
function taskCard(t){
  return `<article class="task-card"><button class="check" onclick="toggleTask(${t.id})" aria-label="Concluir tarefa"></button><div><div class="task-title">${escapeHtml(t.title)}</div><div class="task-meta">${fmtShort(t.date)}</div></div></article>`
}
window.toggleTask=id=>{const t=state.tasks.find(x=>x.id===id); if(t){t.done=!t.done;save();render()}}

function renderReminders(){
  const pending=state.reminders.filter(r=>!r.done), completed=state.reminders.filter(r=>r.done);
  const pendingHtml=pending.length?pending.map(r=>`<article class="reminder-card"><span>${escapeHtml(r.text)}</span><div class="reminder-actions"><button class="complete-btn" onclick="convertReminder(${r.id})">Virar compromisso</button><button class="complete-btn" onclick="toggleReminder(${r.id})">Concluir</button></div></article>`).join(''):'<div class="panel muted">Nenhum lembrete pendente.</div>';
  const historyHtml=completed.length?`<div class="history-card standalone-history"><h3>Lembretes concluídos</h3>${completed.map(r=>`<div class="history-item done"><strong>${escapeHtml(r.text)}</strong><div>Concluído</div></div>`).join('')}</div>`:'';
  $('#reminderList').innerHTML=`<div class="cards">${pendingHtml}</div>${historyHtml}`;
}
window.toggleReminder=id=>{const r=state.reminders.find(x=>x.id===id);if(r){r.done=!r.done;save();render()}}
window.removeReminder=id=>{state.reminders=state.reminders.filter(r=>r.id!==id);save();render()}
window.convertReminder=id=>{
  const r=state.reminders.find(x=>x.id===id); if(!r)return;
  $('#eventTitle').value=r.text;
  $('#eventDate').value=isoDate(state.date);
  $('#eventTime').value='';
  $('#eventLocation').value='';
  $('#eventSource').value='local';
  $('#eventReminder').checked=true;
  $('#eventDialog').dataset.reminderId=String(id);
  $('#eventDialog').showModal();
}

function switchView(view){
  $$('.view').forEach(v=>v.classList.add('hidden')); $(`#${view}View`).classList.remove('hidden');
  $$('.nav-item,.mobile-bar button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const titles={agenda:['Agenda','Tudo organizado em um só lugar.'],tarefas:['Tarefas','Atividades que você precisa concluir.'],lembretes:['Lembretes','Anotações rápidas para não esquecer.'],conexoes:['Conexões','Prepare as fontes que formarão sua agenda unificada.'],configuracoes:['Configurações','Personalize a sua experiência.']};
  $('#pageTitle').textContent=titles[view][0]; $('#pageSubtitle').textContent=titles[view][1];
}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
$$('[data-calendar-view]').forEach(b=>b.addEventListener('click',()=>{state.calendarView=b.dataset.calendarView;$$('[data-calendar-view]').forEach(x=>x.classList.toggle('active',x===b));renderCalendar()}));
$('#prevDate').onclick=()=>{state.date=addDays(state.date,state.calendarView==='month'?-(new Date(state.date.getFullYear(),state.date.getMonth(),0).getDate()):state.calendarView==='year'?-365:state.calendarView==='week'?-7:-1);render()};
$('#nextDate').onclick=()=>{state.date=addDays(state.date,state.calendarView==='month'?new Date(state.date.getFullYear(),state.date.getMonth()+1,0).getDate():state.calendarView==='year'?365:state.calendarView==='week'?7:1);render()};
$('#todayBtn').onclick=()=>{state.date=new Date();render()};
$('#clearCompleted').onclick=()=>{state.events=state.events.filter(e=>!e.done);save();render()};
$('#newEventBtn').onclick=()=>{ $('#eventDialog').dataset.reminderId=''; $('#eventDate').value=isoDate(state.date); $('#eventForm').reset(); $('#eventDate').value=isoDate(state.date); $('#eventDialog').showModal() };
$('#closeDialog').onclick=()=>$('#eventDialog').close();
$('#cancelEvent').onclick=()=>$('#eventDialog').close();
$('#eventForm').addEventListener('submit',e=>{
  e.preventDefault();
  const reminderId=Number($('#eventDialog').dataset.reminderId||0);
  state.events.push({id:Date.now(),title:$('#eventTitle').value.trim(),date:$('#eventDate').value,time:$('#eventTime').value,location:$('#eventLocation').value.trim(),source:$('#eventSource').value,done:false,reminder:$('#eventReminder').checked});
  if(reminderId){const r=state.reminders.find(x=>x.id===reminderId);if(r)r.done=true;}
  save(); e.target.reset(); $('#eventDialog').dataset.reminderId=''; $('#eventDialog').close(); render();
});
$('#addReminderBtn').onclick=()=>{const v=$('#quickReminder').value.trim();if(!v)return;state.reminders.push({id:Date.now(),text:v,done:false});$('#quickReminder').value='';save();render()};
$('#themeBtn').onclick=()=>{document.body.classList.toggle('dark');$('#darkToggle').checked=document.body.classList.contains('dark');localStorage.setItem('ma-v2-dark',document.body.classList.contains('dark'))}
$('#darkToggle').onchange=e=>{document.body.classList.toggle('dark',e.target.checked);localStorage.setItem('ma-v2-dark',e.target.checked)}
$('#showSourceToggle').onchange=e=>{state.showSource=e.target.checked;renderUpcoming()}
$('#saveNameBtn').onclick=()=>{const v=$('#agendaName').value.trim()||'Minha Agenda';document.title=v;document.querySelector('.brand strong').textContent=v;alert('Nome salvo neste aparelho.')}
if(localStorage.getItem('ma-v2-dark')==='true'){document.body.classList.add('dark');$('#darkToggle').checked=true}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
render();
