
const savedEvents = JSON.parse(localStorage.getItem('ma-v2-events') || 'null');
const savedTasks = JSON.parse(localStorage.getItem('ma-v2-tasks') || 'null');
const savedReminders = JSON.parse(localStorage.getItem('ma-v2-reminders') || 'null');

const state = {
  date: new Date(),
  calendarView: 'day',
  filter: 'all',
  showSource: true,
  events: (savedEvents || [
    {id:1,title:'Reunião financeira',date:isoDate(new Date()),time:'09:00',source:'microsoft',location:'Teams',done:false,reminder:true},
    {id:2,title:'Consulta / compromisso',date:isoDate(addDays(new Date(),1)),time:'14:30',source:'apple',location:'',done:false,reminder:true},
    {id:3,title:'Planejamento semanal',date:isoDate(addDays(new Date(),2)),time:'19:00',source:'google',location:'',done:false,reminder:false},
    {id:4,title:'Comprar materiais',date:isoDate(new Date()),time:'18:00',source:'local',location:'',done:false,reminder:true}
  ]).map(e=>({...e, source:'local'})),
  tasks: savedTasks || [
    {id:1,title:'Revisar pendências do setor',date:isoDate(new Date()),done:false},
    {id:2,title:'Organizar documentos',date:isoDate(addDays(new Date(),1)),done:false}
  ],
  reminders: (savedReminders || [
    {id:1,text:'Marcar retorno e separar documentos'},
    {id:2,text:'Verificar compromissos da próxima semana'}
  ]).map(r => ({...r, done: Boolean(r.done)}))
};

state.events = state.events.map(e=>({...e, source:'local'}));
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const sourceLabel = {local:'Minha Agenda'};

function isoDate(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString().slice(0,10) }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x }
function fmtDate(d){ return new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).format(d) }
function fmtShort(s){ const [y,m,d]=s.split('-').map(Number); return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}` }
function pad(n){return String(n).padStart(2,'0')}
function deadlineFor(item){
  const date=item?.date; if(!date)return null;
  const time=item.time || (item.deadlineTime || '23:59');
  const d=new Date(`${date}T${time}:00`);
  return Number.isNaN(d.getTime())?null:d;
}
function urgencyFor(item){
  const deadline=deadlineFor(item); if(!deadline)return {level:'none',label:'Sem prazo',days:null};
  const diff=deadline.getTime()-Date.now();
  const days=diff/86400000;
  if(diff<0)return {level:'overdue',label:'Atrasado',days};
  if(days<=1)return {level:'urgent',label:'Vence hoje',days};
  if(days<=7)return {level:'soon',label:`Faltam ${Math.ceil(days)} dias`,days};
  return {level:'safe',label:`Faltam ${Math.ceil(days)} dias`,days};
}
function batteryMarkup(item){
  const u=urgencyFor(item);
  if(u.level==='none')return '';
  const fill=u.level==='safe'?3:u.level==='soon'?2:1;
  return `<span class="deadline-status ${u.level}" title="${escapeHtml(u.label)}"><span class="battery-icon" aria-hidden="true"><i></i><i></i><i></i></span><span>${escapeHtml(u.label)}</span></span>`;
}
function isUrgent(item){const u=urgencyFor(item);return u.level==='urgent'||u.level==='overdue'}
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
  $('#summaryUrgent').textContent = [...state.events,...state.tasks].filter(x=>!x.done&&isUrgent(x)).length;
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
  return `<div class="event-chip local ${e.done?'done':''}" onclick='openEventEditor(${JSON.stringify(String(e.id))})' role="button" tabindex="0"><div class="event-chip-main"><button class="quick-check ${e.done?'checked':''}" type="button" onclick='event.stopPropagation();toggleEvent(${JSON.stringify(String(e.id))})' aria-label="${e.done?'Reabrir':'Concluir'} compromisso">${e.done?'✓':''}</button><div><strong>${e.time||'Sem horário'} · ${escapeHtml(e.title)}</strong><small>${e.location?escapeHtml(e.location)+' · ':''}Minha Agenda</small></div></div>${batteryMarkup(e)}</div>`
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
    cells.push(`<div class="month-cell"><div class="month-day-number">${day}</div>${items.slice(0,3).map(e=>`<div class="mini-event" title="${escapeHtml(urgencyFor(e).label)}"><span class="mini-time">${escapeHtml(e.time||'')}</span> ${escapeHtml(e.title)}</div>`).join('')}</div>`)
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
  const now=Date.now();
  let list=[...state.events].filter(e=>!e.done && deadlineFor(e)?.getTime()>=now);
  if(state.filter==='pending') list=list.filter(e=>!e.done);
  if(state.filter==='urgent') list=list.filter(e=>isUrgent(e));
  list.sort((a,b)=>deadlineFor(a)-deadlineFor(b));
  list=list.slice(0,15);
  $('#upcomingList').innerHTML=list.length?list.map(e=>`<article class="agenda-card"><button class="quick-check card-check" type="button" onclick='toggleEvent(${JSON.stringify(String(e.id))})' aria-label="Concluir compromisso">${e.done?'✓':''}</button><div class="time-col"><strong>${e.time||'—'}</strong><span>${fmtShort(e.date)}</span></div><div class="card-main"><h3>${escapeHtml(e.title)}</h3><p>${e.location?escapeHtml(e.location):'Sem local'}</p>${batteryMarkup(e)}</div><div class="event-actions"><button class="icon-btn" type="button" onclick='openEventEditor(${JSON.stringify(String(e.id))})' title="Editar" aria-label="Editar">✎</button><button class="icon-btn danger" type="button" onclick='deleteEvent(${JSON.stringify(String(e.id))})' title="Excluir" aria-label="Excluir">×</button></div></article>`).join(''):'<div class="panel muted">Nenhum compromisso encontrado para este filtro.</div>';
}
window.toggleEvent=id=>{const e=state.events.find(x=>String(x.id)===String(id)); if(e){e.done=!e.done;save();render()}}

function renderTasks(){
  const pending=state.tasks.filter(t=>!t.done), completed=state.tasks.filter(t=>t.done);
  $('#taskList').innerHTML=`<div class="cards">${pending.length?pending.map(taskCard).join(''):'<div class="panel muted">Nenhuma tarefa pendente.</div>'}</div>${completed.length?`<div class="history-card standalone-history"><h3>Tarefas concluídas</h3>${completed.map(t=>`<div class="history-item done"><div><strong>${escapeHtml(t.title)}</strong><div>${fmtShort(t.date)}</div></div><button class="complete-btn" onclick="toggleTask(${t.id})">Reabrir</button></div>`).join('')}</div>`:''}`;
}
function taskCard(t){
  return `<article class="task-card"><button class="quick-check" onclick="toggleTask(${t.id})" aria-label="Concluir tarefa"></button><div class="task-content"><div class="task-title">${escapeHtml(t.title)}</div><div class="task-meta">${fmtShort(t.date)}</div>${batteryMarkup(t)}</div></article>`
}
window.toggleTask=id=>{const t=state.tasks.find(x=>String(x.id)===String(id)); if(t){t.done=!t.done;save();render()}}

function renderReminders(){
  const pending=state.reminders.filter(r=>!r.done), completed=state.reminders.filter(r=>r.done);
  const pendingHtml=pending.length?pending.map(r=>`<article class="reminder-card"><span>${escapeHtml(r.text)}</span><div class="reminder-actions"><button class="complete-btn" onclick="convertReminder(${r.id})">Virar compromisso</button><button class="complete-btn" onclick="toggleReminder(${r.id})">Concluir</button></div></article>`).join(''):'<div class="panel muted">Nenhum lembrete pendente.</div>';
  const historyHtml=completed.length?`<div class="history-card standalone-history"><h3>Lembretes concluídos</h3>${completed.map(r=>`<div class="history-item done"><div><strong>${escapeHtml(r.text)}</strong><div>Concluído</div></div><button class="complete-btn" onclick="toggleReminder(${r.id})">Reabrir</button></div>`).join('')}</div>`:'';
  $('#reminderList').innerHTML=`<div class="cards">${pendingHtml}</div>${historyHtml}`;
}
window.toggleReminder=id=>{const r=state.reminders.find(x=>String(x.id)===String(id));if(r){r.done=!r.done;save();render()}}
window.removeReminder=id=>{state.reminders=state.reminders.filter(r=>r.id!==id);save();render()}
window.convertReminder=id=>{
  const r=state.reminders.find(x=>String(x.id)===String(id)); if(!r)return;
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
  const titles={agenda:['Agenda','Tudo organizado em um só lugar.'],tarefas:['Tarefas','Atividades que você precisa concluir.'],lembretes:['Lembretes','Anotações rápidas para não esquecer.'],configuracoes:['Configurações','Personalize a sua experiência.']};
  $('#pageTitle').textContent=titles[view][0]; $('#pageSubtitle').textContent=titles[view][1];
}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{
  const f=b.dataset.filter;
  state.filter=f;
  if(f==='tasks'){switchView('tarefas');return;}
  switchView('agenda');
  if(f==='all')state.date=new Date();
  render();
  setTimeout(()=>$('#upcomingList')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
}));
$$('[data-calendar-view]').forEach(b=>b.addEventListener('click',()=>{state.calendarView=b.dataset.calendarView;$$('[data-calendar-view]').forEach(x=>x.classList.toggle('active',x===b));renderCalendar()}));
$('#prevDate').onclick=()=>{state.date=addDays(state.date,state.calendarView==='month'?-(new Date(state.date.getFullYear(),state.date.getMonth(),0).getDate()):state.calendarView==='year'?-365:state.calendarView==='week'?-7:-1);render()};
$('#nextDate').onclick=()=>{state.date=addDays(state.date,state.calendarView==='month'?new Date(state.date.getFullYear(),state.date.getMonth()+1,0).getDate():state.calendarView==='year'?365:state.calendarView==='week'?7:1);render()};
$('#todayBtn').onclick=()=>{state.date=new Date();render()};
$('#clearCompleted').onclick=()=>{state.events=state.events.filter(e=>!e.done);save();render()};
function resetEventDialog(){
  $('#eventDialog').dataset.reminderId='';
  $('#eventDialog').dataset.editingId='';
  $('#eventDialogEyebrow').textContent='NOVO COMPROMISSO';
  $('#eventDialogTitle').textContent='Adicionar à minha agenda';
  $('#saveEventBtn').textContent='Salvar compromisso';
  $('#deleteEventBtn').style.display='none';
  $('#eventForm').reset();
  $('#eventDate').value=isoDate(state.date);
  $('#eventReminder').checked=true;
}
$('#newEventBtn').onclick=()=>{resetEventDialog();$('#eventDialog').showModal()};
window.openEventEditor=id=>{
  const ev=state.events.find(x=>String(x.id)===String(id)); if(!ev)return;
  $('#eventDialog').dataset.editingId=String(ev.id); $('#eventDialog').dataset.reminderId='';
  $('#eventDialogEyebrow').textContent='EDITAR COMPROMISSO';
  $('#eventDialogTitle').textContent='Editar compromisso';
  $('#saveEventBtn').textContent='Salvar alterações';
  $('#deleteEventBtn').style.display='inline-flex';
  $('#eventTitle').value=ev.title||''; $('#eventDate').value=ev.date||isoDate(state.date); $('#eventTime').value=ev.time||'';
  $('#eventLocation').value=ev.location||''; $('#eventSource').value=ev.source||'local'; $('#eventReminder').checked=ev.reminder!==false;
  $('#eventDialog').showModal();
};
window.deleteEvent=async id=>{
  const ev=state.events.find(x=>String(x.id)===String(id)); if(!ev)return;
  if(!confirm(`Excluir o compromisso "${ev.title}"?`))return;
  state.events=state.events.filter(x=>String(x.id)!==String(id)); save(); render();
};
$('#deleteEventBtn').onclick=async()=>{const id=$('#eventDialog').dataset.editingId;if(id){$('#eventDialog').close();await deleteEvent(id)}};
$('#closeDialog').onclick=()=>$('#eventDialog').close();
$('#cancelEvent').onclick=()=>$('#eventDialog').close();
$('#eventForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const editingId=$('#eventDialog').dataset.editingId||'';
  const reminderId=Number($('#eventDialog').dataset.reminderId||0);
  const payload={title:$('#eventTitle').value.trim(),date:$('#eventDate').value,time:$('#eventTime').value,location:$('#eventLocation').value.trim(),source:'local',reminder:$('#eventReminder').checked};
  if(editingId){
    const ev=state.events.find(x=>String(x.id)===String(editingId)); if(!ev)return;
    Object.assign(ev,payload,{source:'local'});
    save(); $('#eventDialog').close(); resetEventDialog(); render();
    return;
  }
  const newEvent={id:Date.now(),...payload,done:false};
  state.events.push(newEvent);
  if(reminderId){const r=state.reminders.find(x=>x.id===reminderId);if(r)r.done=true;}
  save(); e.target.reset(); resetEventDialog(); $('#eventDialog').close(); render(); scheduleNotifications();
});
$('#addReminderBtn').onclick=()=>{const v=$('#quickReminder').value.trim();if(!v)return;state.reminders.push({id:Date.now(),text:v,done:false});$('#quickReminder').value='';save();render()};
$('#themeBtn').onclick=()=>{document.body.classList.toggle('dark');$('#darkToggle').checked=document.body.classList.contains('dark');localStorage.setItem('ma-v2-dark',document.body.classList.contains('dark'))}
$('#darkToggle').onchange=e=>{document.body.classList.toggle('dark',e.target.checked);localStorage.setItem('ma-v2-dark',e.target.checked)}
$('#showSourceToggle').onchange=e=>{state.showSource=e.target.checked;renderUpcoming()}
$('#saveNameBtn').onclick=()=>{const v=$('#agendaName').value.trim()||'Minha Agenda';document.title=v;document.querySelector('.brand strong').textContent=v;alert('Nome salvo neste aparelho.')}
function applyProfilePhoto(){
  const data=localStorage.getItem('ma-v2-photo');
  const targets=[$('#brandAvatar'),$('#topAvatar')];
  targets.forEach(el=>{if(!el)return;el.innerHTML=data?`<img src="${data}" alt="Minha foto">`:'＋'});
}
function openPhotoPicker(){const input=$('#photoInput');if(!input)return;try{if(typeof input.showPicker==='function')input.showPicker();else input.click()}catch{input.click()}}
$('#brandAvatar')?.addEventListener('click',e=>{e.preventDefault();openPhotoPicker()});
$('#topAvatar')?.addEventListener('click',e=>{e.preventDefault();openPhotoPicker()});
$('#removePhotoBtn').onclick=()=>{localStorage.removeItem('ma-v2-photo');applyProfilePhoto()};
$('#photoInput').addEventListener('change',e=>{
  const file=e.target.files?.[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const max=500, scale=Math.min(1,max/Math.max(img.width,img.height));
      const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(img.width*scale)); c.height=Math.max(1,Math.round(img.height*scale));
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      try{localStorage.setItem('ma-v2-photo',c.toDataURL('image/jpeg',0.82));applyProfilePhoto()}catch(err){alert('Não foi possível salvar esta foto. Tente uma imagem menor.')}
    };
    img.src=reader.result;
  };
  reader.readAsDataURL(file);
  e.target.value='';
});
/* Browser notifications */
function updateNotificationStatus(){
  const el=$('#notificationStatus'); if(!el)return;
  if(!('Notification' in window)){el.textContent='Este navegador não oferece notificações.';return}
  const p=Notification.permission;
  el.textContent=p==='granted'?'Notificações ativadas neste navegador.':p==='denied'?'Notificações bloqueadas no navegador.':'Notificações ainda não autorizadas.';
}
async function enableNotifications(){
  if(!('Notification' in window)){updateNotificationStatus();return}
  const p=await Notification.requestPermission(); updateNotificationStatus(); if(p==='granted') scheduleNotifications();
}
function showAgendaNotification(ev){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  try{new Notification('Minha Agenda',{body:`${ev.title}${ev.time?' às '+ev.time:''}`,icon:'assets/agenda-icon-192.png',tag:'agenda-'+ev.id})}catch{}
}
function scheduleNotifications(){
  if(window.__agendaNotifTimer)clearInterval(window.__agendaNotifTimer);
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  const check=()=>{
    const now=Date.now();
    state.events.filter(e=>e.reminder&&!e.done&&e.time).forEach(e=>{
      const due=new Date(`${e.date}T${e.time}:00`).getTime();
      if(Math.abs(due-now)<=30000 && localStorage.getItem('ma-notified-'+e.id)!=='1'){
        showAgendaNotification(e);localStorage.setItem('ma-notified-'+e.id,'1');
      }
    });
  };
  check(); window.__agendaNotifTimer=setInterval(check,30000);
}
$('#enableNotificationsBtn')?.addEventListener('click',e=>{e.preventDefault();enableNotifications()});
$('#testNotificationBtn')?.addEventListener('click',e=>{e.preventDefault();if('Notification' in window && Notification.permission==='granted')showAgendaNotification({id:'test',title:'Teste de notificação da Minha Agenda',time:''});else enableNotifications()});
updateNotificationStatus();

applyProfilePhoto();
if(localStorage.getItem('ma-v2-dark')==='true'){document.body.classList.add('dark');$('#darkToggle').checked=true}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
render();
scheduleNotifications();

  