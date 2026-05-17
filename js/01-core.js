var STORE_KEY = 'inspeccion_app_v1';
var inspections = [];
var currentId = null;
var rowCounts = {};
var obsState = {};
var deleteTarget = null;

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function loadStore(){
  try{ inspections = JSON.parse(localStorage.getItem(STORE_KEY)||'[]'); }
  catch(e){ inspections = []; }
}
function saveStore(){
  localStorage.setItem(STORE_KEY, JSON.stringify(inspections));
}

function show(screenId){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('on'); });
  document.getElementById(screenId).classList.add('on');
}

function goHome(){
  show('s-home');
  loadStore();
  loadAuditStore();
  renderHome();
}

function tieneConductor(i){
  var nombre = (i.data && i.data.nombre) ? i.data.nombre.trim() : '';
  if(!nombre) nombre = (i.name||'').trim();
  /* exclude default names */
  if(nombre==='Inspección sin nombre' || nombre==='Sin nombre') return false;
  return nombre.length > 0;
}
function tieneCarga(i){
  var d = i.data||{};
  if(!d.cargoRows) return false;
  return ['pal60','pal55','bol1200','bol1500','granel','barrido'].some(function(t){
    var rows = d.cargoRows[t];
    return rows && rows.some(function(r){ return (r.lote||'').trim().length > 0; });
  });
}
function isPresentada(i){
  return tieneConductor(i);
}
function isCargada(i){
  var remito = (i.data && i.data.remito) ? i.data.remito.trim() : '';
  return tieneConductor(i) && tieneCarga(i) && remito.length === 0;
}
function setFilter(f){
  window._activeFilter = f;
  document.querySelectorAll('.stat-card').forEach(function(el){ el.classList.remove('active'); });
  var map = {presentadas:'fc-presentadas', cargada:'fc-cargada', remito:'fc-remito'};
  var btn = document.getElementById(map[f]);
  if(btn) btn.classList.add('active');
  renderHome();
}

function renderHome(){
  loadStore(); loadAuditStore();
  /* Count per filter */
  var cntPresentadas = inspections.filter(function(i){ return isPresentada(i); }).length;
  var cntCargada = inspections.filter(function(i){ return isCargada(i); }).length;
  var cntRemito = inspections.filter(function(i){ return i.data && i.data.remito && i.data.remito.trim(); }).length;
  document.getElementById('st-total').textContent = cntPresentadas;
  document.getElementById('st-draft').textContent = cntCargada;
  document.getElementById('st-done').textContent = cntRemito;
  var total = inspections.length;
  document.getElementById('folder-count').textContent = total + ' inspección' + (total!==1?'es':'') + ' guardada' + (total!==1?'s':'');

  var activeFilter = window._activeFilter || 'presentadas';
  var filtered = inspections.filter(function(i){
    if(activeFilter==='presentadas') return isPresentada(i);
    if(activeFilter==='cargada') return isCargada(i);
    if(activeFilter==='remito') return tieneConductor(i) && tieneCarga(i) && !!(i.data && (i.data.remito||'').trim().length > 0);
    return isPresentada(i);
  });
  var body = document.getElementById('folder-body');
  var empty = document.getElementById('empty-msg');

  /* Remove only cards, preserve empty-msg */
  Array.from(body.querySelectorAll('.insp-card')).forEach(function(el){ el.remove(); });

  if(!body || !empty){ return; }

  if(filtered.length === 0){
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  var sortedFiltered = filtered.slice().sort(function(a,b){ return (b.updatedAt||b.savedAt||0)-(a.updatedAt||a.savedAt||0); });
  sortedFiltered.forEach(function(insp){
    var card = document.createElement('div');
    card.className = 'insp-card';
    card.id = 'card-' + insp.id;

    var dateStr = new Date(insp.updatedAt).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
    var badge = insp.status === 'complete'
      ? '<span class="insp-badge badge-complete">Completa</span>'
      : '<span class="insp-badge badge-draft">Borrador</span>';

    var detail = [];
    if(insp.data && insp.data.transporte) detail.push(insp.data.transporte);
    if(insp.data && insp.data.shipment) detail.push('Ship: ' + insp.data.shipment);
    detail.push(dateStr);

    card.innerHTML =
      '<div class="insp-top" onclick="toggleCard(\''+insp.id+'\')">' +
        '<div class="insp-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:17px;height:17px;color:#1565c0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>' +
        '<div class="insp-meta">' +
          '<div class="insp-name">' + escHtml(insp.name || 'Sin nombre') + '</div>' +
          '<div class="insp-detail">' + escHtml(detail.join(' · ')) + '</div>' +
        '</div>' +
        badge +
        '<svg class="insp-expand" id="exp-'+insp.id+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</div>' +
      '<div class="insp-actions" id="act-'+insp.id+'">' +
        '<button class="act-btn act-load" onclick="loadInspection(\''+insp.id+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Cargar</button>' +
        '<button class="act-btn act-print" style="background:#e8f5e9;color:#1b5e20;border:1px solid #a5d6a7;" onclick="downloadAllFiles(\''+insp.id+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Descargar todo</button>' +
        '<button class="act-btn act-audit-comp" onclick="openAuditComp(\''+insp.id+'\')" >+ Comportamiento</button>' +
        '<button class="act-btn act-audit-enl" onclick="openAuditEnl(\''+insp.id+'\')" >+ Enlonado</button>' +
        '<button class="act-btn" style="background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;" id="sapbtn-'+insp.id+'" onclick="toggleSAP(\''+insp.id+'\')" >Auditorías</button>' +
        '<button class="act-btn act-del" onclick="confirmDeleteInsp(\''+insp.id+'\',\''+escHtml(insp.name||'Sin nombre')+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>Eliminar</button>' +
      '</div>' +
      '<div class="sap" id="sap-'+insp.id+'"></div>';
    body.appendChild(card);
    renderSAP(insp.id);
  });
}

function toggleCard(id){
  var act = document.getElementById('act-'+id);
  var exp = document.getElementById('exp-'+id);
  var isOpen = act.classList.contains('open');
  document.querySelectorAll('.insp-actions.open').forEach(function(el){ el.classList.remove('open'); });
  document.querySelectorAll('.insp-expand.open').forEach(function(el){ el.classList.remove('open'); });
  document.querySelectorAll('.sap.open').forEach(function(el){ el.classList.remove('open'); });
  if(!isOpen){ act.classList.add('open'); exp.classList.add('open'); }
}

function escHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── NEW / LOAD FORM ── */
