

/* ═══ 01-core.js ═══ */

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
  loadStore();
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
                                '<button class="act-btn act-del" onclick="confirmDeleteInsp(\''+insp.id+'\',\''+escHtml(insp.name||'Sin nombre')+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>Eliminar</button>' +
      '</div>' +
      '<div class="sap" id="sap-'+insp.id+'"></div>';
    body.appendChild(card);
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


/* ═══ 02-form.js ═══ */

function newForm(){
  currentId = uid();
  rowCounts = {pal60:0,pal55:0,bol1200:0,bol1500:0,granel:0,barrido:0};
  obsState = {};
  clearFormUI();
  document.getElementById('form-title').value = 'Inspección ' + new Date().toLocaleDateString('es-AR');
  document.getElementById('save-status').textContent = '';
  show('s-form');
}

function loadInspection(id){
  loadStore();
  var insp = inspections.find(function(i){ return i.id===id; });
  if(!insp) return;
  currentId = id;
  rowCounts = {pal60:0,pal55:0,bol1200:0,bol1500:0,granel:0,barrido:0};
  obsState = {};
  clearFormUI();
  populateForm(insp);
  show('s-form');
}

function clearFormUI(){
  var ids = ['f-transporte','f-nombre','f-dni','f-patentes','f-shipment','f-remito','f-fecha-salida','f-hora-salida','f-bruto','f-tara','f-neto','f-cot','f-coa','f-imp','f-err'];
  ids.forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('f-camion').value='';
  document.getElementById('tipo-carga').value='';
  ['pal60','pal55','bol1200','bol1500','granel','barrido'].forEach(function(t){
    document.getElementById('bd-'+t).innerHTML='';
    document.getElementById('cb-'+t).classList.remove('on','has-data');
    calcTotalNeto(t);
  });
  document.querySelectorAll('.ck,.kck').forEach(function(c){ c.classList.remove('yes','no'); c.textContent=''; });
  setTimeout(renderPhotoSection, 50);
  document.querySelectorAll('.of input').forEach(function(i){ i.value=''; });
}

function populateForm(insp){
  document.getElementById('form-title').value = insp.name || '';
  var d = insp.data || {};
  var si = function(id,v){ var el=document.getElementById(id); if(el&&v!==undefined) el.value=v||''; };
  si('f-transporte',d.transporte); si('f-nombre',d.nombre); si('f-dni',d.dni);
  si('f-patentes',d.patentes); si('f-shipment',d.shipment);
  if(d.camion) document.getElementById('f-camion').value=d.camion;
  si('f-remito',d.remito); si('f-fecha-salida',d.fechaSalida); si('f-hora-salida',d.horaSalida);
  si('f-bruto',d.bruto); si('f-tara',d.tara); si('f-neto',d.neto);
  si('f-cot',d.cot); si('f-coa',d.coa); si('f-imp',d.imp); si('f-err',d.err);

  if(d.cargoType){
    document.getElementById('tipo-carga').value = d.cargoType;
    switchCargo(d.cargoType, true);
  }

  var cargoRows = d.cargoRows || {};
  ['pal60','pal55','bol1200','bol1500','granel','barrido'].forEach(function(t){
    var rows = cargoRows[t] || [];
    rows.forEach(function(row){ addRow(t, row); });
  });
  /* Recalc totals only for rows missing totalBolsas */
  ['pal60','pal55'].forEach(function(t){
    var mult = t==='pal60'?60:55;
    document.querySelectorAll('#bd-'+t+' tr').forEach(function(tr){
      var tbEl = tr.querySelector('.tb-i');
      if(tbEl && (!tbEl.value || tbEl.value === '' || tbEl.value === '—')){
        var bolsasInput = tr.querySelector('.bolsas-i');
        if(bolsasInput) recalcPal(bolsasInput, mult);
      }
    });
    if(typeof calcTotalNeto === 'function') calcTotalNeto(t);
    if(typeof calcTotalBolsas === 'function') calcTotalBolsas(t);
  });
  ['bol1200','bol1500'].forEach(function(t){
    if(typeof calcTotalNeto === 'function') calcTotalNeto(t);
  });
  if(typeof renderReadonlySummary === 'function') renderReadonlySummary();

  obsState = d.obsState || {};
  [0,1,2,3,4,'k0','k1','k2','k3'].forEach(function(r){ updateObs(r); });
  var obsDetails = d.obsDetails || [];
  document.querySelectorAll('.of input').forEach(function(inp,i){ inp.value = obsDetails[i]||''; });

  document.getElementById('save-status').textContent = 'Cargado · ' + new Date(insp.updatedAt).toLocaleString('es-AR');
}

/* ── CARGO ── */
function switchCargo(val, silent){
  document.querySelectorAll('.cargo-block').forEach(function(b){ b.classList.remove('on'); });
  if(val){
    var cb = document.getElementById('cb-'+val);
    if(cb){
      cb.classList.add('on');
    }
  }
  if(typeof renderReadonlySummary === 'function') renderReadonlySummary();
}

function addRow(type, data){
  var tbody = document.getElementById('bd-'+type);
  rowCounts[type]++;
  var n = rowCounts[type];
  var tr = document.createElement('tr');
  var d = data || {};

  // Helper: celda con input + botón OCR
  function ocrCell(cls, placeholder, val, field, extraAttrs){
    var attrs = extraAttrs || '';
    return '<td style="padding:0;"><div style="display:flex;align-items:center;gap:0;">' +
      '<input class="ti '+cls+'" type="text" placeholder="'+placeholder+'" value="'+escHtml(val||'')+'" '+attrs+' style="flex:1;min-width:0;">' +
      ocrBtnHtml(field) +
      '</div></td>';
  }

  if(type==='pal60'||type==='pal55'){
    var mult = type==='pal60'?60:55;
    var pallets = d.pallets||0;
    tr.innerHTML =
      ocrCell('ucase','Lote',d.lote,'lote','') +
      ocrCell('ucase','Producto',d.producto,'producto','') +
      '<td><div class="ccell"><button class="cbtn" onclick="chCnt(this,-1)">&#8722;</button><span class="cval">'+pallets+'</span><button class="cbtn" onclick="chCnt(this,1)">&#43;</button></div></td>'+
      '<td><input class="ti bolsas-i" type="text" placeholder="0" value="'+escHtml(d.bolsas||'')+'" oninput="recalcPal(this,'+mult+')"></td>'+
      '<td class="td-auto"><input class="ti tb-i" type="text" readonly placeholder="—" value="'+escHtml(d.totalBolsas!=null?String(d.totalBolsas):'')+'"></td>'+
      '<td class="td-auto"><input class="ti tk-i" type="text" readonly placeholder="—" value="'+escHtml(d.totalKs!=null?String(d.totalKs):'')+'"></td>';
    tr.querySelector('.cval')._mult = mult;
    tr.querySelector('.cval')._type = type;
    if(data){ tr.querySelector('.cval').textContent = pallets; }
    if(d.palletsInc) tr.dataset.palletsInc = d.palletsInc;

  } else if(type==='bol1200'||type==='bol1500'){
    var ks = type==='bol1200'?1200:1500;
    var bolsones = d.bolsones||0;
    tr.innerHTML =
      ocrCell('ucase','Lote',d.lote,'lote','') +
      ocrCell('ucase','Producto',d.producto,'producto','') +
      '<td><div class="ccell"><button class="cbtn" onclick="chCnt(this,-1)">&#8722;</button><span class="cval">'+bolsones+'</span><button class="cbtn" onclick="chCnt(this,1)">&#43;</button></div></td>'+
      '<td class="td-auto"><input class="ti tk-i" type="text" readonly placeholder="—" value="'+escHtml(d.totalKs||'')+'"></td>';
    tr.querySelector('.cval')._ksVal = ks;
    tr.querySelector('.cval')._type = type;

  } else if(type==='granel'){
    tr.innerHTML =
      ocrCell('ti-lote ucase','Lote',d.lote,'lote','maxlength="10" oninput="validateLote(this)" onblur="enforceLote(this)"') +
      ocrCell('ti-prod ucase','Producto',d.producto,'producto','') +
      '<td><input class="ti ucase" type="text" placeholder="Contenedor" value="'+escHtml(d.contenedor||'')+'"></td>'+
      '<td><input class="ti ucase" type="text" placeholder="Precinto" value="'+escHtml(d.precinto||'')+'"></td>';

  } else if(type==='barrido'){
    tr.innerHTML =
      ocrCell('ti-lote ucase','Lote',d.lote,'lote','maxlength="10" oninput="validateLote(this)" onblur="enforceLote(this)"') +
      ocrCell('ti-prod ucase','Producto',d.producto,'producto','') +
      '<td class="td-auto"><input class="ti tk-i" type="text" placeholder="KG" value="'+escHtml(d.ksEstimados||'')+'"></td>';
  }

  tbody.appendChild(tr);
  document.getElementById('cb-'+type).classList.add('has-data');
  calcTotalNeto(type);
}

function chCnt(btn, delta){
  var cell = btn.parentElement;
  var valEl = cell.querySelector('.cval');
  var cur = parseInt(valEl.textContent)||0;
  var next = Math.max(0, cur+delta);
  valEl.textContent = next;
  var tr = btn.closest('tr');
  if(valEl._mult) recalcPalFromTr(tr, valEl._mult);
  if(valEl._ksVal){
    var tk = tr.querySelector('.tk-i');
    if(tk){ tk.value = next * valEl._ksVal; calcTotalNeto(valEl._type||''); }
  }
}

function recalcPal(inp, mult){
  recalcPalFromTr(inp.closest('tr'), mult);
}
function recalcPalFromTr(tr, mult){
  var valEl = tr.querySelector('.cval');
  var pallets = valEl ? (parseInt(valEl.textContent)||0) : 0;
  var bolsasInp = tr.querySelector('.bolsas-i');
  var bolsas = bolsasInp ? (parseInt(bolsasInp.value)||0) : 0;
  var tb = (pallets*mult)+bolsas;
  var tk = tb*25;
  var tbEl = tr.querySelector('.tb-i'); if(tbEl) tbEl.value=tb;
  var tkEl = tr.querySelector('.tk-i'); if(tkEl) tkEl.value=tk;
  var cvEl = tr.querySelector('.cval'); if(cvEl && cvEl._type) calcTotalNeto(cvEl._type);
}

/* ── OBS ── */
document.querySelectorAll('.ck,.kck').forEach(function(cell){
  cell.addEventListener('click', function(){
    var r = this.dataset.r; var c = this.dataset.c;
    obsState[r] = (obsState[r]===c) ? null : c;
    updateObs(r);
  });
});
function updateObs(r){
  document.querySelectorAll('[data-r="'+r+'"]').forEach(function(c){ c.classList.remove('yes','no'); c.textContent=''; });
  if(obsState[r]==='si'){ var el=document.querySelector('[data-r="'+r+'"][data-c="si"]'); if(el){el.classList.add('yes');el.textContent='✓';} }
  if(obsState[r]==='no'){ var el=document.querySelector('[data-r="'+r+'"][data-c="no"]'); if(el){el.classList.add('no');el.textContent='✗';} }
}

/* ── NETO ── */
function calcNeto(){
  var b = parseFloat(document.getElementById('f-bruto').value)||0;
  var t = parseFloat(document.getElementById('f-tara').value)||0;
  document.getElementById('f-neto').value = b>0||t>0 ? (b-t) : '';
}

/* ── COLLECT DATA ── */
function collectData(){
  function gv(id){ var el=document.getElementById(id); return el?el.value:''; }
  var data = {
    transporte:gv('f-transporte'), nombre:gv('f-nombre'), dni:gv('f-dni'),
    patentes:gv('f-patentes'), shipment:gv('f-shipment'), camion:gv('f-camion'),
    remito:gv('f-remito'), fechaSalida:gv('f-fecha-salida'), horaSalida:gv('f-hora-salida'),
    bruto:gv('f-bruto'), tara:gv('f-tara'), neto:gv('f-neto'),
    cot:gv('f-cot'), coa:gv('f-coa'), imp:gv('f-imp'), err:gv('f-err'),
    cargoType: document.getElementById('tipo-carga').value,
    obsState: JSON.parse(JSON.stringify(obsState)),
    obsDetails: Array.from(document.querySelectorAll('.of input')).map(function(i){ return i.value; }),
    cargoRows: {}
  };

  ['pal60','pal55'].forEach(function(t){
    var mult = t==='pal60'?60:55;
    data.cargoRows[t] = Array.from(document.querySelectorAll('#bd-'+t+' tr')).map(function(tr){
      var inputs = tr.querySelectorAll('.ti');
      var cval = tr.querySelector('.cval');
      var tbEl = tr.querySelector('.tb-i');
      var tkEl = tr.querySelector('.tk-i');
      return {
        lote: inputs[0]?inputs[0].value:'',
        producto: inputs[1]?inputs[1].value:'',
        pallets: cval?parseInt(cval.textContent)||0:0,
        palletsInc: tr.dataset.palletsInc||'',
        bolsas: inputs[3]?inputs[3].value:'',
        totalBolsas: tbEl?tbEl.value:'',
        totalKs: tkEl?tkEl.value:''
      };
    });
  });
  ['bol1200','bol1500'].forEach(function(t){
    data.cargoRows[t] = Array.from(document.querySelectorAll('#bd-'+t+' tr')).map(function(tr){
      var inputs = tr.querySelectorAll('.ti');
      var cval = tr.querySelector('.cval');
      return {
        lote: inputs[0]?inputs[0].value:'',
        producto: inputs[1]?inputs[1].value:'',
        bolsones: cval?parseInt(cval.textContent)||0:0,
        totalKs: inputs[2]?inputs[2].value:''
      };
    });
  });
  data.cargoRows['granel'] = Array.from(document.querySelectorAll('#bd-granel tr')).map(function(tr){
    var inputs=tr.querySelectorAll('.ti');
    return{lote:inputs[0]?inputs[0].value:'',producto:inputs[1]?inputs[1].value:'',contenedor:inputs[2]?inputs[2].value:'',precinto:inputs[3]?inputs[3].value:''};
  });
  data.cargoRows['barrido'] = Array.from(document.querySelectorAll('#bd-barrido tr')).map(function(tr){
    var inputs=tr.querySelectorAll('.ti'); var tkI=tr.querySelector('.tk-i');
    return{lote:inputs[0]?inputs[0].value:'',producto:inputs[1]?inputs[1].value:'',ksEstimados:tkI?tkI.value:''};
  });

  return data;
}

function isComplete(data){
  return !!(data.transporte && data.remito && data.cargoType);
}

/* ── SAVE ── */
function saveForm(){
  loadStore();
  var data = collectData();
  var _n = data.nombre ? data.nombre.trim() : '';
  var name = _n || document.getElementById('form-title').value.trim() || 'Inspección sin nombre';
  if(_n) document.getElementById('form-title').value = name;
  var status = isComplete(data) ? 'complete' : 'draft';
  var now = Date.now();
  var idx = inspections.findIndex(function(i){ return i.id===currentId; });
  var record = { id:currentId, name:name, status:status, createdAt: now, updatedAt:now, data:data };
  if(idx>=0){ record.createdAt = inspections[idx].createdAt||now; inspections[idx]=record; }
  else { inspections.push(record); }
  saveStore();
  document.getElementById('save-status').textContent = 'Guardado · ' + new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  showToast('Inspección guardada correctamente');
  var expRow = document.getElementById('form-export-row');
  if(expRow) expRow.style.display='flex';
}

/* ── PRINT ── */
function printForm(){
  saveForm();
  var data = collectData();
  var chofer = (data.nombre||'SIN-CHOFER').trim().replace(/[^a-zA-Z0-9À-ɏ ]/g,'').replace(/\s+/g,'_');
  var hoy = new Date();
  var fecha = hoy.getFullYear()+'-'+(String(hoy.getMonth()+1).padStart(2,'0'))+'-'+(String(hoy.getDate()).padStart(2,'0'));
  try{ document.title = 'INSPECCION_'+chofer+'_'+fecha; }catch(e){}
  window.print();
  setTimeout(function(){ document.title = 'Mis Inspecciones'; }, 2000);
}

function printInspection(id){
  loadStore();
  var insp = inspections.find(function(i){ return i.id===id; });
  if(!insp) return;
  var chofer = (insp.data && insp.data.nombre ? insp.data.nombre : insp.name||'SIN-CHOFER').trim().replace(/[^a-zA-Z0-9À-ɏ ]/g,'').replace(/\s+/g,'_');
  var hoy = new Date();
  var fecha = hoy.getFullYear()+'-'+(String(hoy.getMonth()+1).padStart(2,'0'))+'-'+(String(hoy.getDate()).padStart(2,'0'));
  try{ document.title = 'INSPECCION_'+chofer+'_'+fecha; }catch(e){}
  loadInspection(id);
  setTimeout(function(){
    show('s-form');
    window.print();
    setTimeout(function(){ document.title = 'Mis Inspecciones'; }, 2000);
  }, 200);
}

/* ── DELETE ── */
function confirmDelete(id, name){
  if(!confirm('¿Eliminar "' + name + '"?')) return;
  doDeleteInsp(id);
}
function confirmDeleteInsp(id, name){ confirmDelete(id, name); }
function closeModal(){ document.getElementById('del-modal').classList.remove('on'); }
function doDeleteInsp(id){
  loadStore(); inspections=inspections.filter(function(i){return i.id!==id;}); saveStore();
  renderHome(); showToast('Inspección eliminada');
}

/* ── TOAST ── */
function showToast(msg){
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 2400);
}

/* ── INIT ── */
loadStore();
renderHome();
document.addEventListener('visibilitychange', function(){
  if(document.visibilityState === 'visible'){
    var homeEl = document.getElementById('s-home');
    if(homeEl && homeEl.classList.contains('on')){
      loadStore(); renderHome();
    }
  }
});
window.addEventListener('storage', function(e){
  if(e.key === 'inspeccion_app_v1' || e.key === 'inspeccion_audits_v1'){
    loadStore(); renderHome();
  }
});

/* ── UPPERCASE FIELDS ── */
document.addEventListener('input', function(e){
  /* bold on product input */
  if(e.target.classList.contains('ti-prod')){
    var hasVal = e.target.value.trim().length > 0;
    e.target.style.fontWeight = hasVal ? '600' : '';
    e.target.style.fontSize = hasVal ? '12.5px' : '';
    checkProductoRepetido();
  }
  var el = e.target;
  if(el.classList.contains('ucase') || (el.tagName==='INPUT' && !el.classList.contains('no-ucase') && el.type==='text' && !el.closest('.of') && !el.closest('.obs-textarea') && !el.classList.contains('ti'))){
    var pos = el.selectionStart;
    el.value = el.value.toUpperCase();
    el.setSelectionRange(pos, pos);
  }
});

/* ======================================================
   ALL NEW JS — added to the bottom of the original script
   ====================================================== */

/* ── GLOBAL AUDIT STORE ── */


/* ═══ 03-audits.js ═══ */


/* ── AUTO NAME ── */
function autoNameForm(){
  var n = document.getElementById('f-nombre').value.trim();
  if(n) document.getElementById('form-title').value = n;
}

/* ── DEL ROW ── */
function delRow(type){
  var tbody = document.getElementById('bd-'+type);
  if(!tbody || tbody.rows.length === 0) return;
  tbody.deleteRow(tbody.rows.length - 1);
  rowCounts[type] = Math.max(0, rowCounts[type] - 1);
  if(tbody.rows.length === 0) document.getElementById('cb-'+type).classList.remove('has-data');
  calcTotalNeto(type);
  calcTotalBolsas(type);
  checkProductoRepetido();
  calcTolerancia();
}

/* ── TOTAL NETO ── */
function calcTotalNeto(type){
  var el = document.getElementById('tn-'+type);
  if(!el) return;
  var total = 0;
  document.querySelectorAll('#bd-'+type+' .tk-i').forEach(function(inp){
    total += parseFloat(inp.value) || 0;
  });
  el.textContent = total > 0 ? total.toLocaleString('es-AR') + ' KS' : '—';
}


/* ═══ 04-cargo-v3.js ═══ */

var _origCollectData = collectData;
collectData = function(){
  var data = _origCollectData();
  function gv(id){ var el=document.getElementById(id); return el?el.value:''; }
  data.patenteSemi = gv('f-patente-semi');
  data.cliente     = gv('f-cliente');
  data.destino     = gv('f-destino');
  data.fechaEntrada= gv('f-fecha-entrada');
  data.horaEntrada = gv('f-hora-entrada');
  data.cai         = gv('f-cai');
  return data;
};

/* ── POPULATE FORM PATCH (new fields) ── */
var _origPopForm = populateForm;
populateForm = function(insp){
  _origPopForm(insp);
  var d = insp.data||{};
  function si(id,v){ var el=document.getElementById(id); if(el&&v!==undefined) el.value=v||''; }
  si('f-patente-semi', d.patenteSemi);
  si('f-cliente',      d.cliente);
  si('f-destino',      d.destino);
  si('f-fecha-entrada',d.fechaEntrada);
  si('f-hora-entrada', d.horaEntrada);
  si('f-cai',          d.cai);
  /* restore k4 obs state */
  if(d.obsState && d.obsState['k4']) updateObs('k4');
  /* render photos */
  setTimeout(renderPhotoSection, 50);
};

/* ── CLEAR FORM PATCH ── */
var _origClearUI = clearFormUI;
clearFormUI = function(){
  _origClearUI();
  ['f-patente-semi','f-cliente','f-destino','f-fecha-entrada','f-hora-entrada','f-cai'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
};

/* ══════════════════════════════════════════
   PAL60/PAL55 ROW WITH PALLETS INCOMPLETOS
══════════════════════════════════════════ */
/* Override addRow to support new pal structure */
var _origAddRow = addRow;
addRow = function(type, data){
  if(type!=='pal60' && type!=='pal55'){
    _origAddRow(type, data);
    return;
  }
  var tbody = document.getElementById('bd-'+type);
  rowCounts[type]++;
  var n = rowCounts[type];
  var mult = type==='pal60' ? 60 : 55;
  var d = data||{};
  var palCom  = d.pallets||0;
  var palInc  = d.palletsInc||0;
  var tr = document.createElement('tr');
  tr.innerHTML =
    '<td style="width:18%"><div style="display:flex;align-items:center;gap:0;"><input class="ti ti-lote ucase" type="text" placeholder="Lote" maxlength="10" value="'+escHtml(d.lote||'')+'" oninput="validateLote(this)" onblur="enforceLote(this)" style="flex:1;min-width:0;">'+ocrBtnHtml('lote')+'</div></td>'+
    '<td style="width:20%"><div style="display:flex;align-items:center;gap:0;"><input class="ti ti-prod ucase" type="text" placeholder="Producto" value="'+escHtml(d.producto||'')+'" style="flex:1;min-width:0;">'+ocrBtnHtml('producto')+'</div></td>'+
    '<td style="width:72px;"><div class="ccell"><button class="cbtn" onclick="chCnt(this,-1)">&#8722;</button><span class="cval" data-type="'+type+'">'+palCom+'</span><button class="cbtn" onclick="chCnt(this,1)">&#43;</button></div></td>'+
    '<td style="width:240px;"><input class="ti pal-inc-nums" type="text" placeholder="bolsas pal. inc." value="'+escHtml(d.palletsIncNums||'')+'" oninput="recalcPalIncNums(this)" onfocus="palIncFocus(this)" onblur="palIncBlur(this)" style="font-size:11.5px;color:var(--auto-tx);background:var(--auto-bg);"></td>'+
    '<td style="width:72px;"><input class="ti" type="number" min="0" placeholder="0" value="'+escHtml(String(d.bolsas||''))+'" oninput="recalcPalV3(this,'+mult+')"></td>'+
    '<td class="td-auto" style="width:85px;"><input class="ti tb-i" type="text" readonly placeholder="—" value="'+escHtml(d.totalBolsas||'')+'"></td>'+
    '<td class="td-auto" style="width:72px;"><input class="ti tk-i" type="text" readonly placeholder="—" value="'+escHtml(d.totalKs||'')+'"></td>';
  var cv = tr.querySelector('.cval');
  cv._mult = mult; cv._type = type;
  if(data) cv.textContent = palCom;
  tbody.appendChild(tr);
  document.getElementById('cb-'+type).classList.add('has-data');
  calcTotalNeto(type);
  calcTotalBolsas(type);
  checkProductoRepetido();
  calcTolerancia();
};

function chCntInc(btn, delta){
  var valEl = btn.parentElement.querySelector('.cval-inc');
  var cur = parseInt(valEl.textContent)||0;
  valEl.textContent = Math.max(0, cur+delta);
  var tr = btn.closest('tr');
  var mult = tr.querySelector('.cval')._mult||60;
  recalcPalV3FromTr(tr, mult);
}

function recalcPalV3(inp, mult){
  recalcPalV3FromTr(inp.closest('tr'), mult);
}

function recalcPalV3FromTr(tr, mult){
  var palCom  = parseInt(tr.querySelector('.cval').textContent)||0;
  /* palInc is the sum of comma-sep numbers from the text field */
  var palIncEl = tr.querySelector('.pal-inc-nums');
  var palIncSum = 0;
  if(palIncEl){
    if(palIncEl._palIncSum !== undefined){
      palIncSum = palIncEl._palIncSum;
    } else {
      var expr = palIncEl.value.replace(/,/g,'+');
      palIncSum = expr.split('+').reduce(function(a,s){return a+(parseFloat(s.trim())||0);},0);
      palIncSum = Math.round(palIncSum);
    }
  }
  var bolsInp = tr.querySelector('input[type="number"]');
  var bolsExtra = bolsInp ? (parseInt(bolsInp.value)||0) : 0;
  /* total bolsas = pallets completos × mult + suma de números incompletos + bolsas extra */
  var totalBolsas = palCom * mult + Math.round(palIncSum) + bolsExtra;
  var kg = totalBolsas * 25;
  /* palIncSum from text field (no cval-inc counter anymore) */
  var tbEl = tr.querySelector('.tb-i'); if(tbEl) tbEl.value = totalBolsas;
  var tkEl = tr.querySelector('.tk-i'); if(tkEl) tkEl.value = kg;
  var cv = tr.querySelector('.cval'); if(cv && cv._type) calcTotalNeto(cv._type);
  calcTotalBolsas(cv ? (cv._type||'') : '');
  checkProductoRepetido();
  calcTolerancia();
}

/* Override chCnt for pal types to use new recalc */
var _origChCnt = chCnt;
chCnt = function(btn, delta){
  var valEl = btn.parentElement.querySelector('.cval');
  if(!valEl){ _origChCnt(btn,delta); return; }
  var cur = parseInt(valEl.textContent)||0;
  var next = Math.max(0, cur+delta);
  valEl.textContent = next;
  var tr = btn.closest('tr');
  if(valEl._mult){
    recalcPalV3FromTr(tr, valEl._mult);
  } else if(valEl._ksVal){
    var tk = tr.querySelector('.tk-i');
    if(tk){ tk.value = next * valEl._ksVal; calcTotalNeto(valEl._type||''); }
  }
};

/* ── COLLECT DATA FOR NEW PAL ROWS ── */
var _origCollect2 = collectData;
collectData = function(){
  var data = _origCollect2();
  ['pal60','pal55'].forEach(function(t){
    data.cargoRows[t] = Array.from(document.querySelectorAll('#bd-'+t+' tr')).map(function(tr){
      var loteI   = tr.querySelector('input[placeholder="Lote"]');
      var prodI   = tr.querySelector('input[placeholder="Producto"]');
      var cval    = tr.querySelector('.cval');
      var bolsI   = tr.querySelector('input[type="number"]');
      var tbI     = tr.querySelector('.tb-i');
      var tkI     = tr.querySelector('.tk-i');
      return{
        lote:       loteI ? loteI.value : '',
        producto:   prodI ? prodI.value : '',
        pallets:    cval  ? parseInt(cval.textContent)||0 : 0,
        palletsInc: 0,
        palletsIncNums: (function(){var el=tr.querySelector('.pal-inc-nums');return el?el.value:'';}()),
        bolsas:     bolsI ? bolsI.value : '',
        totalBolsas:tbI   ? tbI.value : '',
        totalKs:    tkI   ? tkI.value : ''
      };
    });
  });
  return data;
};

/* ── LOTE VALIDATION 10 chars ── */
function validateLote(inp){
  inp.value = inp.value.toUpperCase();
  if(inp.value.length > 10) inp.value = inp.value.slice(0,10);
  var filled = inp.value.length > 0;
  var complete = inp.value.length === 10;
  inp.style.fontWeight = filled ? '700' : '';
  inp.style.fontSize = filled ? '13px' : '';
  if(filled && !complete){
    inp.style.borderBottom = '2px solid #E24B4A';
    inp.title = 'Lote incompleto — requiere 10 caracteres ('+inp.value.length+'/10)';
  } else {
    inp.style.borderBottom = complete ? '2px solid #1D9E75' : '';
    inp.title = complete ? 'Lote completo' : '';
  }
}
function enforceLote(inp){
  if(inp.value.length > 0 && inp.value.length < 10){
    inp.style.borderBottom = '2px solid #E24B4A';
    inp.title = 'Lote incompleto — requiere 10 caracteres ('+inp.value.length+'/10)';
  }
}

function recalcPalIncNums(inp){
  /* strip any existing (N) suffix to work with raw expression */
  var raw = inp.value.replace(/\s*\(\d+\)\s*$/, '').trim();
  var expr = raw.replace(/,/g,'+');
  var parts = expr.split('+').map(function(s){ return parseFloat(s.trim())||0; }).filter(function(n){ return n > 0; });
  inp._palIncSum = Math.round(parts.reduce(function(a,b){return a+b;},0));
  inp._palIncCount = parts.length;
  inp._palIncRaw = raw;
  var tr = inp.closest('tr');
  var cv = tr ? tr.querySelector('.cval') : null;
  if(cv && cv._mult) recalcPalV3FromTr(tr, cv._mult);
}
function palIncFocus(inp){
  /* strip (N) on focus so user can edit raw expression */
  if(inp._palIncRaw !== undefined){
    inp.value = inp._palIncRaw;
  }
}
function palIncBlur(inp){
  /* re-parse and show (N) suffix */
  recalcPalIncNums(inp);
  if(inp._palIncCount > 0){
    inp.value = inp._palIncRaw + ' (' + inp._palIncCount + ')';
  }
}

/* ── TOTAL BOLSAS SUM ── */
function calcTotalBolsas(type){
  if(!type || (type!=='pal60' && type!=='pal55')) return;
  var total = 0;
  document.querySelectorAll('#bd-'+type+' .tb-i').forEach(function(inp){
    total += parseFloat(inp.value)||0;
  });
  var el = document.getElementById('total-bolsas-'+type);
  if(el) el.textContent = total > 0 ? total.toLocaleString('es-AR') : '—';
  /* store for tolerancia */
  window._totalBolsas = total;
  calcTolerancia();
}

/* ── PRODUCTO REPETIDO (>4 veces misma carga activa) ── */
function checkProductoRepetido(){
  var activeType = document.getElementById('tipo-carga') ? document.getElementById('tipo-carga').value : '';
  if(!activeType) return;
  var prods = [];
  document.querySelectorAll('#bd-'+activeType+' .ti-prod').forEach(function(inp){
    var v = inp.value.trim().toUpperCase();
    if(v) prods.push(v);
  });
  var freq = {};
  prods.forEach(function(p){ freq[p] = (freq[p]||0)+1; });
  var max = Math.max.apply(null, Object.values(freq).concat([0]));
  var ckSi = document.querySelector('.ck-prod[data-c="si"]');
  var ckNo = document.querySelector('.ck-prod[data-c="no"]');
  var obsEl = document.getElementById('obs-prod-rep');
  if(!ckSi) return;
  if(max > 4){
    ckSi.className='ck-prod ck yes'; ckSi.textContent='✓';
    ckNo.className='ck-prod ck'; ckNo.textContent='';
    if(obsEl){ obsEl.value='Requiere autorización'; obsEl.style.color='#b71c1c'; obsEl.style.fontWeight='500'; }
  } else {
    ckSi.className='ck-prod ck'; ckSi.textContent='';
    ckNo.className='ck-prod ck no'; ckNo.textContent='✗';
    if(obsEl){ obsEl.value=''; obsEl.style.color=''; obsEl.style.fontWeight=''; }
  }
}

/* ── TOLERANCIA ── */
function calcTolerancia(){
  var sel = document.getElementById('sel-tolerancia');
  var inpOtros = document.getElementById('inp-tolerancia-otros');
  var inpResult = document.getElementById('inp-tolerancia-result');
  var ckSi = document.querySelector('.ck-tol[data-c="si"]');
  var ckNo = document.querySelector('.ck-tol[data-c="no"]');
  if(!sel || !inpResult) return;

  var activeType = document.getElementById('tipo-carga') ? document.getElementById('tipo-carga').value : '';
  var totalBolsas = 0;
  if(activeType){
    document.querySelectorAll('#bd-'+activeType+' .tb-i').forEach(function(inp){ totalBolsas += parseFloat(inp.value)||0; });
  }

  var base = 0;
  if(sel.value==='1320') base = 1320;
  else if(sel.value==='1080') base = 1080;
  else if(sel.value==='otros'){
    base = parseFloat(inpOtros ? inpOtros.value : 0)||0;
    if(inpOtros) inpOtros.style.display='inline-block';
  }
  if(sel.value!=='otros' && inpOtros) inpOtros.style.display='none';

  if(base === 0 || totalBolsas === 0){ inpResult.value=''; return; }

  var diff = base - totalBolsas;
  var diffRounded = Math.ceil(diff);
  inpResult.value = diffRounded;

  var umbral = Math.ceil(0.005 * totalBolsas);
  if(!ckSi) return;
  if(diff > umbral){
    ckSi.className='ck-tol ck yes'; ckSi.textContent='✓';
    ckNo.className='ck-tol ck'; ckNo.textContent='';
    inpResult.style.background='#ffebee';
    inpResult.style.color='#b71c1c';
    inpResult.style.fontWeight='700';
    inpResult.style.borderColor='#ef9a9a';
  } else {
    ckSi.className='ck-tol ck'; ckSi.textContent='';
    ckNo.className='ck-tol ck no'; ckNo.textContent='✗';
    inpResult.style.background='';
    inpResult.style.color='';
    inpResult.style.fontWeight='';
    inpResult.style.borderColor='';
  }
}

/* ── AUDITORIAS: preselect 5 on build ── */

/* ═══ 05-photos.js ═══ */

/* ══════════════════════════════════════════════════════
   FOTOS — SECCIÓN 04bis
══════════════════════════════════════════════════════ */
var inspPhotos = {}; /* inspId → [dataURL, ...] */
var PHOTOS_KEY = 'inspeccion_photos_v1';

function loadPhotos(){
  try{ inspPhotos=JSON.parse(localStorage.getItem(PHOTOS_KEY)||'{}'); }catch(e){ inspPhotos={}; }
}
function savePhotos(){
  localStorage.setItem(PHOTOS_KEY, JSON.stringify(inspPhotos));
}
function getPhotosForInsp(id){
  return inspPhotos[id] || [];
}

function triggerPhotoAdd(source){
  /* source: 'camera' | 'gallery' */
  var inp = document.getElementById('photo-file-input');
  if(!inp) return;
  if(source === 'camera'){
    inp.setAttribute('capture','environment');
  } else {
    inp.removeAttribute('capture');
  }
  inp.value = '';
  inp.click();
}

function handlePhotoFile(inp){
  var files = Array.from(inp.files);
  if(!files.length) return;
  loadPhotos();
  var existing = inspPhotos[currentId] || [];
  var remaining = 4 - existing.length;
  if(remaining <= 0){ showToast('Máximo 4 fotos por inspección'); return; }
  var toAdd = files.slice(0, remaining);
  var processed = 0;
  toAdd.forEach(function(file){
    var reader = new FileReader();
    reader.onload = function(e){
      /* Compress photo to max 800px wide */
      var img = new Image();
      img.onload = function(){
        var canvas = document.createElement('canvas');
        var MAX = 1200;
        var ratio = Math.min(MAX/img.width, MAX/img.height, 1);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        var dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        if(!inspPhotos[currentId]) inspPhotos[currentId] = [];
        inspPhotos[currentId].push(dataUrl);
        processed++;
        if(processed === toAdd.length){
          savePhotos();
          renderPhotoSection();
          showToast(processed + ' foto' + (processed!==1?'s':'') + ' agregada' + (processed!==1?'s':''));
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function removePhoto(idx){
  if(!confirm('¿Eliminar esta foto?')) return;
  loadPhotos();
  if(inspPhotos[currentId]) inspPhotos[currentId].splice(idx, 1);
  savePhotos();
  renderPhotoSection();
}

function renderPhotoSection(){
  var grid = document.getElementById('photo-grid');
  var counter = document.getElementById('photo-counter');
  if(!grid) return;
  loadPhotos();
  var photos = inspPhotos[currentId] || [];
  if(counter) counter.textContent = photos.length + '/4';
  grid.innerHTML = '';
  photos.forEach(function(dataUrl, i){
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;border-radius:8px;overflow:hidden;background:#000;aspect-ratio:4/3;';
    var img = document.createElement('img');
    img.src = dataUrl;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    var del = document.createElement('button');
    del.innerHTML = '&#x2715;';
    del.style.cssText = 'position:absolute;top:5px;right:5px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:none;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;';
    del.onclick = (function(idx){ return function(){ removePhoto(idx); }; })(i);
    wrap.appendChild(img);
    wrap.appendChild(del);
    grid.appendChild(wrap);
  });
}





/* ══ EXCEL INSPECCIÓN (SheetJS) ══ */


/* ═══ 06-export.js ═══ */

function exportExcelInsp(id){
  loadStore();
  var insp = inspections.find(function(i){ return i.id===id; });
  if(!insp){ showToast('No se encontro la inspeccion'); return; }
  var d = insp.data||{};
  var cargoType = d.cargoType||'';
  var rows = (d.cargoRows&&d.cargoRows[cargoType]) ? d.cargoRows[cargoType] : [];
  var wsData = [['Conductor','Transporte','Patente tractor','Patente semi','Cliente','Destino','Orden/Shipment','Tipo camion']];
  var maxCols = Math.max(rows.length, 1);
  for(var i=1;i<=maxCols;i++) wsData[0]=wsData[0].concat(['Lote '+i,'Producto '+i,'Cant.Bolsas '+i,'Total bolsas '+i,'KG '+i]);
  wsData[0]=wsData[0].concat(['Remito','Fecha entrada','Hora entrada','Fecha salida','Hora salida','Bruto','Tara','Neto KS']);
  var row1=[d.nombre||'',d.transporte||'',d.patentes||'',d.patenteSemi||'',d.cliente||'',d.destino||'',d.shipment||'',d.camion||''];
  for(var j=0;j<maxCols;j++){var r=rows[j]||{}; row1=row1.concat([r.lote||'',r.producto||'',r.bolsas||'',r.totalBolsas||'',r.totalKs||'']);}
  row1=row1.concat([d.remito||'',d.fechaEntrada||'',d.horaEntrada||'',d.fechaSalida||'',d.horaSalida||'',d.bruto||'',d.tara||'',d.neto||'']);
  wsData.push(row1);
  var ws=XLSX.utils.aoa_to_sheet(wsData);
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Inspeccion');
  var chofer=(d.nombre||'INSP').replace(/[^a-zA-Z0-9]/g,'_');
  var ship=(d.shipment||'').replace(/[^a-zA-Z0-9]/g,'_');
  XLSX.writeFile(wb,'Inspeccion_'+chofer+'_'+ship+'.xlsx');
  showToast('Excel inspeccion descargado');
  return wb;
}

/* ══ PDF RESUMEN (carga el formulario e imprime — fiel a pantalla) ══ */
function exportPDFResumen(id){
  loadStore(); loadPhotos();
  var insp=inspections.find(function(i){return i.id===id;});
  if(!insp){showToast('No se encontro la inspeccion');return;}
  loadInspection(id);
  setTimeout(function(){
    show('s-form');
    setTimeout(function(){ window.print(); }, 300);
  },200);
}

/* ══ DESCARGAR TODO (ZIP) ══ */
function downloadAllFiles(id){
  loadStore(); loadPhotos();
  var insp=inspections.find(function(i){return i.id===id;});
  if(!insp){showToast('No se encontro la inspeccion');return;}
  var d=insp.data||{};
  var chofer=(d.nombre||'INSP').replace(/[^a-zA-Z0-9]/g,'_');
  var ship=(d.shipment||'').replace(/[^a-zA-Z0-9]/g,'_');
  var base=chofer+'_'+ship;

  if(typeof JSZip==='undefined'){showToast('Libreria ZIP no disponible');return;}
  var zip=new JSZip();
  var folder=zip.folder(base);

  /* Excel inspeccion */
  var wsData1=[['Conductor','Transporte','Patente tractor','Patente semi','Cliente','Destino','Orden/Shipment','Tipo camion']];
  var cargoType=d.cargoType||'';
  var rows=(d.cargoRows&&d.cargoRows[cargoType])?d.cargoRows[cargoType]:[];
  var maxC=Math.max(rows.length,1);
  for(var i=1;i<=maxC;i++) wsData1[0]=wsData1[0].concat(['Lote '+i,'Producto '+i,'Cant.Bolsas '+i,'Total bolsas '+i,'KG '+i]);
  wsData1[0]=wsData1[0].concat(['Remito','Fecha entrada','Hora entrada','Fecha salida','Hora salida','Bruto','Tara','Neto KS']);
  var r1=[d.nombre||'',d.transporte||'',d.patentes||'',d.patenteSemi||'',d.cliente||'',d.destino||'',d.shipment||'',d.camion||''];
  for(var j=0;j<maxC;j++){var rr=rows[j]||{};r1=r1.concat([rr.lote||'',rr.producto||'',rr.bolsas||'',rr.totalBolsas||'',rr.totalKs||'']);}
  r1=r1.concat([d.remito||'',d.fechaEntrada||'',d.horaEntrada||'',d.fechaSalida||'',d.horaSalida||'',d.bruto||'',d.tara||'',d.neto||'']);
  wsData1.push(r1);
  var ws1=XLSX.utils.aoa_to_sheet(wsData1);
  var wb1=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb1,ws1,'Inspeccion');
  folder.file(base+'_Inspeccion.xlsx',XLSX.write(wb1,{type:'array',bookType:'xlsx'}));


  /* PDF Resumen (HTML del formulario con fotos) */
  folder.file(base+'_Resumen.html', buildResumenPDFHtml(insp));

  /* Fotos como archivos separados */
  var photos=inspPhotos[id]||[];
  photos.forEach(function(dataUrl,idx){
    var parts=dataUrl.split(',');
    var raw=atob(parts[1]);
    var arr=new Uint8Array(raw.length);
    for(var k=0;k<raw.length;k++) arr[k]=raw.charCodeAt(k);
    folder.file(base+'_Foto_'+(idx+1)+'.jpg',arr,{binary:true});
  });

  /* Generate and download */
  zip.generateAsync({type:'blob'}).then(function(blob){
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url; a.download=base+'.zip';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('ZIP descargado: '+base+'.zip');
  });
}

/* ══ BUILD RESUMEN PDF HTML (réplica fiel del formulario en pantalla, fotos chicas al final) ══ */
function buildResumenPDFHtml(insp){
  var d=insp.data||{};
  var esc=function(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
  var fmtD=function(s){return s?s.split('-').reverse().join('/'):'';};

  /* --- CARGO TABLE --- */
  var ct=d.cargoType||'';
  var cargoH='';
  var cargoLabel={'pal60':'Paletizada × 60','pal55':'Paletizada × 55','bol1200':'Bolsones × 1200 KS','bol1500':'Bolsones × 1500 KS','granel':'Granel','barrido':'Barrido'};

  if(ct==='pal60'||ct==='pal55'){
    var mult=ct==='pal60'?60:55;
    var rws=(d.cargoRows&&d.cargoRows[ct])||[];
    if(rws.length){
      cargoH+='<div class="blbl">CARGA '+cargoLabel[ct].toUpperCase()+'</div>';
      cargoH+='<table class="ctbl"><thead><tr><th>#</th><th>LOTE</th><th>PRODUCTO</th><th>PAL. COM.</th><th>PAL. INC.</th><th>BOLSAS</th><th>CANT. BOLSAS</th><th>KG</th></tr></thead><tbody>';
      var totB=0, totK=0;
      rws.forEach(function(r,i){
        var tb=parseInt(r.totalBolsas)||0; var tk=parseInt(r.totalKs)||0;
        totB+=tb; totK+=tk;
        cargoH+='<tr><td class="rn">'+(i+1)+'</td><td class="b">'+esc(r.lote)+'</td><td>'+esc(r.producto)+'</td><td class="c">'+(r.pallets||0)+'</td><td class="sm">'+esc(r.palletsIncNums||'')+'</td><td class="c">'+(r.bolsas||0)+'</td><td class="c auto">'+tb+'</td><td class="c auto">'+tk+'</td></tr>';
      });
      cargoH+='</tbody></table>';
      cargoH+='<div class="tbar"><span class="tlbl">TOTAL NETO:</span><span class="tval">'+(totK>0?totK.toLocaleString('es-AR')+' KS':'—')+'</span></div>';
      cargoH+='<div class="tbar" style="border-top:0.5px solid #c5d9ee;border-radius:0;"><span class="tlbl">TOTAL BOLSAS:</span><span class="tval">'+(totB>0?totB.toLocaleString('es-AR'):'—')+'</span></div>';
    }
  } else if(ct==='bol1200'||ct==='bol1500'){
    var rws=(d.cargoRows&&d.cargoRows[ct])||[];
    if(rws.length){
      cargoH+='<div class="blbl">CARGA '+cargoLabel[ct].toUpperCase()+'</div>';
      cargoH+='<table class="ctbl"><thead><tr><th>#</th><th>LOTE</th><th>PRODUCTO</th><th>BOLSONES</th><th>KG</th></tr></thead><tbody>';
      var totK=0;
      rws.forEach(function(r,i){
        var tk=parseInt(r.totalKs)||0; totK+=tk;
        cargoH+='<tr><td class="rn">'+(i+1)+'</td><td class="b">'+esc(r.lote)+'</td><td>'+esc(r.producto)+'</td><td class="c">'+(r.bolsones||0)+'</td><td class="c auto">'+tk+'</td></tr>';
      });
      cargoH+='</tbody></table>';
      cargoH+='<div class="tbar"><span class="tlbl">TOTAL NETO:</span><span class="tval">'+(totK>0?totK.toLocaleString('es-AR')+' KS':'—')+'</span></div>';
    }
  } else if(ct==='granel'){
    var rws=(d.cargoRows&&d.cargoRows['granel'])||[];
    if(rws.length){
      cargoH+='<div class="blbl">GRANEL</div>';
      cargoH+='<table class="ctbl"><thead><tr><th>#</th><th>LOTE</th><th>PRODUCTO</th><th>CONTENEDOR</th><th>PRECINTO</th></tr></thead><tbody>';
      rws.forEach(function(r,i){
        cargoH+='<tr><td class="rn">'+(i+1)+'</td><td class="b">'+esc(r.lote)+'</td><td>'+esc(r.producto)+'</td><td>'+esc(r.contenedor)+'</td><td>'+esc(r.precinto)+'</td></tr>';
      });
      cargoH+='</tbody></table>';
    }
  } else if(ct==='barrido'){
    var rws=(d.cargoRows&&d.cargoRows['barrido'])||[];
    if(rws.length){
      cargoH+='<div class="blbl">BARRIDO</div>';
      cargoH+='<table class="ctbl"><thead><tr><th>#</th><th>LOTE</th><th>PRODUCTO</th><th>KG</th></tr></thead><tbody>';
      var totK=0;
      rws.forEach(function(r,i){
        var tk=parseInt(r.ksEstimados)||0; totK+=tk;
        cargoH+='<tr><td class="rn">'+(i+1)+'</td><td class="b">'+esc(r.lote)+'</td><td>'+esc(r.producto)+'</td><td class="c auto">'+tk+'</td></tr>';
      });
      cargoH+='</tbody></table>';
      cargoH+='<div class="tbar"><span class="tlbl">TOTAL NETO:</span><span class="tval">'+(totK>0?totK.toLocaleString('es-AR')+' KS':'—')+'</span></div>';
    }
  }

  /* --- OBS TABLE --- */
  var obsLabels=['Etiquetas','Carga mojada','Error de carga','Carga fajada y enlonada','Completa carga','Lote pedido','Pedidos adicionales en textos','>4 Lotes mismo producto','Tolerancia de bolsas rotas excedida','Observaciones generales'];
  var os=d.obsState||{};
  var od=d.obsDetails||[];
  var obsH='';
  obsLabels.forEach(function(lbl,i){
    var v=os[i]||'';
    var siMark=v==='si'?'✓':''; var noMark=v==='no'?'✗':'';
    var siStyle=v==='si'?'background:#e8f5e9;color:#1b5e20;font-weight:700;':'';
    var noStyle=v==='no'?'background:#ffebee;color:#b71c1c;font-weight:700;':'';
    obsH+='<tr><td class="ol">'+esc(lbl)+'</td><td class="ck" style="'+siStyle+'">'+siMark+'</td><td class="ck" style="'+noStyle+'">'+noMark+'</td><td class="of">'+esc(od[i]||'')+'</td></tr>';
  });

  /* --- EGRESO TABLE --- */
  var kItems=[{l:'CAI VIGENTE',k:'k4',v:d.cai},{l:'COT',k:'k0',v:d.cot},{l:'COA',k:'k1',v:d.coa},{l:'IMPUESTO MISIONES',k:'k2',v:d.imp},{l:'ERROR DE DESPACHO',k:'k3',v:d.err}];
  var egH='';
  kItems.forEach(function(it){
    var v=os[it.k]||'';
    var siMark=v==='si'?'✓':''; var noMark=v==='no'?'✗':'';
    var siStyle=v==='si'?'background:#e8f5e9;color:#1b5e20;font-weight:700;':'';
    var noStyle=v==='no'?'background:#ffebee;color:#b71c1c;font-weight:700;':'';
    egH+='<tr><td class="kl">'+esc(it.l)+'</td><td class="ck" style="'+siStyle+'">'+siMark+'</td><td class="ck" style="'+noStyle+'">'+noMark+'</td><td class="of">'+esc(it.v||'')+'</td></tr>';
  });

  /* --- FOTOS --- */
  loadPhotos();
  var photos=inspPhotos[insp.id]||[];
  var photosH='';
  if(photos.length){
    photosH='<div class="fcard"><div class="fh"><span class="fn">04</span><span class="ft2">Fotos de carga</span></div><div class="fb">';
    photosH+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">';
    photos.forEach(function(url){
      photosH+='<img src="'+url+'" style="width:100%;aspect-ratio:4/3;object-fit:cover;border:1px solid #cfe3f5;border-radius:5px;">';
    });
    photosH+='</div></div></div>';
  }

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mis Inspecciones — '+esc(d.nombre||insp.name)+'</title>'+
    '<style>'+
    'body{font-family:"IBM Plex Sans",Arial,sans-serif;font-size:12.5px;background:#eef4fb;color:#0a1929;margin:0;padding:0;}'+
    '.wrap{max-width:960px;margin:0 auto;padding:18px 16px 30px;}'+
    '.fcard{background:#fff;border:1px solid #cfe3f5;border-radius:9px;margin-bottom:14px;overflow:hidden;}'+
    '.fh{background:#0f3460;padding:11px 16px;display:flex;align-items:center;gap:8px;}'+
    '.fn{font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#90caf9;background:rgba(255,255,255,.1);padding:2px 7px;border-radius:20px;}'+
    '.ft2{font-size:12px;font-weight:500;color:#fff;letter-spacing:.2px;}'+
    '.fb{padding:16px;}'+
    '.fg{display:grid;gap:10px;margin-bottom:10px;}.fg3{grid-template-columns:1fr 1fr 1fr;}'+
    '.field label{display:block;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.6px;color:#455a72;margin-bottom:4px;}'+
    '.field .val{height:36px;border:1.5px solid #cfe3f5;border-radius:5px;padding:0 10px;font-size:12.5px;background:#f4f9ff;display:flex;align-items:center;color:#0a1929;overflow:hidden;white-space:nowrap;}'+
    '.blbl{font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#1565c0;margin-bottom:8px;padding-bottom:5px;border-bottom:1.5px solid #e3f2fd;}'+
    '.ctbl{width:100%;border-collapse:separate;border-spacing:0;border:1.5px solid #cfe3f5;border-radius:5px;overflow:hidden;}'+
    '.ctbl thead tr{background:#0f3460;}.ctbl th{padding:8px 9px;font-size:9px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#bbdefb;border-right:1px solid rgba(255,255,255,.07);text-align:left;}.ctbl th:last-child{border-right:none;}'+
    '.ctbl tbody tr{border-top:1px solid #cfe3f5;}.ctbl tbody tr:nth-child(even){background:#f4f9ff;}'+
    '.ctbl td{padding:5px 8px;vertical-align:middle;font-size:12px;border-right:1px solid #edf2f9;}.ctbl td:last-child{border-right:none;}'+
    '.rn{width:24px;text-align:center;background:#e8f4fd;font-size:10px;font-family:monospace;color:#7a9bb5;}'+
    '.c{text-align:center;}.b{font-weight:700;}.sm{font-size:10px;color:#0f3460;}'+
    '.auto{background:#e0f2fe;color:#0f3460;font-weight:500;font-family:monospace;font-size:11.5px;}'+
    '.tbar{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:7px 12px;background:#e0f2fe;border:1.5px solid #cfe3f5;border-top:none;border-radius:0 0 5px 5px;margin-bottom:2px;}'+
    '.tlbl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#0f3460;}'+
    '.tval{font-size:14px;font-weight:600;font-family:monospace;color:#0f3460;}'+
    /* OBS TABLE */
    '.otbl{width:100%;border-collapse:separate;border-spacing:0;border:1.5px solid #cfe3f5;border-radius:5px;overflow:hidden;}'+
    '.otbl thead tr{background:#0f3460;}.otbl th{padding:8px 12px;font-size:9px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#bbdefb;text-align:center;border-right:1px solid rgba(255,255,255,.07);}.otbl th:first-child{text-align:left;}.otbl th:last-child{border-right:none;}'+
    '.otbl tbody tr{border-top:1px solid #cfe3f5;}.otbl tbody tr:nth-child(even){background:#f4f9ff;}'+
    '.otbl td{padding:7px 12px;vertical-align:middle;font-size:12px;}'+
    '.ol{font-weight:500;color:#455a72;border-right:1px solid #cfe3f5;}'+
    '.ck{text-align:center;border-right:1px solid #cfe3f5;width:58px;font-size:16px;}'+
    '.of{font-size:12px;color:#0a1929;}'+
    /* EGRESO */
    '.kotbl{width:100%;border-collapse:separate;border-spacing:0;border:1.5px solid #cfe3f5;border-radius:5px;overflow:hidden;}'+
    '.kotbl thead tr{background:#0f3460;}.kotbl thead th{padding:8px 10px;font-size:9px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#bbdefb;text-align:center;border-right:1px solid rgba(255,255,255,.07);}.kotbl thead th:first-child{text-align:left;}.kotbl thead th:last-child{border-right:none;}'+
    '.kotbl tbody tr{border-top:1px solid #cfe3f5;}.kotbl tbody tr:nth-child(even){background:#f4f9ff;}'+
    '.kl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#455a72;background:#e8f4fd;border-right:1px solid #cfe3f5;padding:8px 11px;width:38%;}'+
    '.auto-val{background:#e0f2fe;color:#0f3460;font-weight:500;font-family:monospace;}'+
    '@media print{@page{margin:10mm;}body{background:#fff;}-webkit-print-color-adjust:exact;print-color-adjust:exact;.fcard{box-shadow:none;}}'+
    '</style></head><body><div class="wrap">'+

    /* === 01 TRANSPORTE === */
    '<div class="fcard"><div class="fh"><span class="fn">01</span><span class="ft2">Datos del transporte</span></div><div class="fb">'+
    '<div class="fg fg3">'+
    '<div class="field"><label>Transporte</label><div class="val">'+esc(d.transporte)+'</div></div>'+
    '<div class="field"><label>Nombre conductor</label><div class="val b">'+esc(d.nombre)+'</div></div>'+
    '<div class="field"><label>DNI</label><div class="val">'+esc(d.dni)+'</div></div>'+
    '</div>'+
    '<div class="fg fg3" style="margin-bottom:0;">'+
    '<div class="field"><label>Patente tractor</label><div class="val">'+esc(d.patentes)+'</div></div>'+
    '<div class="field"><label>Orden / Shipment</label><div class="val b">'+esc(d.shipment)+'</div></div>'+
    '<div class="field"><label>Tipo de camión</label><div class="val">'+esc(d.camion)+'</div></div>'+
    '</div>'+
    '<div class="fg fg3" style="margin-top:10px;margin-bottom:0;">'+
    '<div class="field"><label>Patente semi</label><div class="val">'+esc(d.patenteSemi)+'</div></div>'+
    '<div class="field"><label>Cliente</label><div class="val">'+esc(d.cliente)+'</div></div>'+
    '<div class="field"><label>Destino</label><div class="val">'+esc(d.destino)+'</div></div>'+
    '</div>'+
    '<div class="fg fg3" style="margin-top:10px;">'+

    '</div>'+
    '</div></div>'+

    /* === 02 TIPO DE CARGA === */
    '<div class="fcard"><div class="fh"><span class="fn">02</span><span class="ft2">Tipo de carga</span></div><div class="fb">'+
    '<div style="margin-bottom:10px;font-size:11px;"><b>TIPO:</b> '+esc(cargoLabel[ct]||ct)+'</div>'+
    cargoH+
    '</div></div>'+

    /* === 03 OBSERVACIONES === */
    '<div class="fcard"><div class="fh"><span class="fn">03</span><span class="ft2">Observaciones</span></div><div class="fb">'+
    '<table class="otbl"><thead><tr><th style="width:38%">Ítem</th><th style="width:58px">Sí</th><th style="width:58px">No</th><th>Detalle</th></tr></thead><tbody>'+obsH+'</tbody></table>'+
    '</div></div>'+

    /* === 04 FOTOS === */
    photosH+

    /* === 05 EGRESO === */
    '<div class="fcard"><div class="fh"><span class="fn">05</span><span class="ft2">Condiciones generales de egreso</span></div><div class="fb">'+
    '<div class="fg fg3">'+
    '<div class="field"><label>Número de Remito</label><div class="val">'+esc(d.remito)+'</div></div>'+
    '<div class="field"><label>Fecha de entrada</label><div class="val">'+esc(fmtD(d.fechaEntrada))+'</div></div>'+
    '<div class="field"><label>Hora de entrada</label><div class="val">'+esc(d.horaEntrada)+'</div></div>'+
    '</div>'+
    '<div class="fg fg3">'+
    '<div class="field"><label>Fecha de salida</label><div class="val">'+esc(fmtD(d.fechaSalida))+'</div></div>'+
    '<div class="field"><label>Hora de salida</label><div class="val">'+esc(d.horaSalida)+'</div></div>'+
    '<div class="field"></div>'+
    '</div>'+
    '<div class="fg fg3" style="margin-bottom:12px;">'+
    '<div class="field"><label>Peso bruto (KS)</label><div class="val">'+esc(d.bruto)+'</div></div>'+
    '<div class="field"><label>Tara (KS)</label><div class="val">'+esc(d.tara)+'</div></div>'+
    '<div class="field"><label>Neto (KS)</label><div class="val auto-val">'+esc(d.neto)+'</div></div>'+
    '</div>'+
    '<table class="kotbl"><thead><tr><th style="text-align:left;">Item</th><th>Sí</th><th>No</th><th style="text-align:left;">Número / Detalle</th></tr></thead><tbody>'+egH+'</tbody></table>'+
    '</div></div>'+

    '</div>'+
    '<scr'+'ipt>window.onload=function(){window.print();};<'+'/scr'+'ipt></body></html>';
}



var _mcCurrentType = '';
var _mcWizardStep  = 0;
var _mcEditIndex   = -1; /* -1 = nueva fila */
var _mcwForceInvalid = false;

/* Format lote as XXXX YYY ZZZ with invalid chars in red */
function formatLoteHtml(lote){


/* ═══ 07-modoCarga.js ═══ */

if(!lote || lote.length < 9) return escHtml(lote||'—');
  var p1 = lote.substr(0,4); /* prefix — always ok */
  var c5 = lote.charAt(4);
  var c6 = lote.charAt(5);
  var c7 = lote.charAt(6);
  var p3 = lote.substr(7);   /* counter: 2 or 3 chars */

  /* Validate each char */
  var c5ok = /^[A-Z]$/.test(c5);
  var validMonths = '123456789ABC';
  var c6ok = validMonths.indexOf(c6) !== -1;
  var validDays = '123456789ABCDEFGHIJKLMNOPQRSTUV';
  var c7ok = validDays.indexOf(c7) !== -1;
  var p3ok = /^[0-9]{2,3}$/.test(p3) && parseInt(p3) > 0;
  var lenOk = lote.length === 10;

  var hasError = !c5ok || !c6ok || !c7ok || !p3ok || !lenOk;
  var red = 'color:#ef5350;font-weight:900;';

  var html = escHtml(p1) + '&nbsp;';
  html += c5ok ? escHtml(c5) : '<span style="'+red+'">'+escHtml(c5)+'</span>';
  html += c6ok ? escHtml(c6) : '<span style="'+red+'">'+escHtml(c6)+'</span>';
  html += c7ok ? escHtml(c7) : '<span style="'+red+'">'+escHtml(c7)+'</span>';
  html += '&nbsp;';
  if(p3ok && lenOk){
    html += escHtml(p3);
  } else {
    html += '<span style="'+red+'">'+escHtml(p3)+'</span>';
  }

  if(hasError) html = '<span title="Lote con formato irregular">⚠️ </span>' + html;
  return html;
}

/* ── Abrir / cerrar ── */
function openModoCarga(){
  var tipo = document.getElementById('tipo-carga').value;
  if(!tipo){ showToast('Primero seleccioná el tipo de carga'); return; }
  _mcCurrentType = tipo;
  var labels = {
    'pal60':'Paletizada × 60','pal55':'Paletizada × 55',
    'bol1200':'Bolsones × 1200 KS','bol1500':'Bolsones × 1500 KS',
    'granel':'Granel','barrido':'Barrido'
  };
  document.getElementById('mc-titulo').textContent = 'Modo Carga';
  document.getElementById('mc-subtipo').textContent = labels[tipo]||tipo;
  mcRenderLista();
  document.getElementById('s-modo-carga').classList.add('on');
}

function closeModoCarga(){
  document.getElementById('s-modo-carga').classList.remove('on');
}

/* ── Render lista de filas cargadas ── */
function mcRenderLista(){
  var tipo = _mcCurrentType;
  var rows = mcGetRows(tipo);
  var lista = document.getElementById('mc-lista');
  var empty = document.getElementById('mc-empty');
  var countEl = document.getElementById('mc-count-filas');
  var totalEl = document.getElementById('mc-total-kg');

  /* conteo total KG */
  var totalKg = 0;
  rows.forEach(function(r){
    totalKg += parseFloat(r.totalKs)||0;
  });
  countEl.textContent = rows.length + ' fila' + (rows.length!==1?'s':'');
  totalEl.textContent = totalKg > 0 ? totalKg.toLocaleString('es-AR') + ' KS' : '';

  /* limpiar lista (mantener el empty) */
  Array.from(lista.children).forEach(function(el){
    if(el.id !== 'mc-empty') lista.removeChild(el);
  });

  if(rows.length === 0){
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  rows.forEach(function(r, i){
    var card = document.createElement('div');
    card.className = 'mc-card';

    var detail = mcBuildDetail(r, tipo);
    card.innerHTML =
      '<div class="mc-card-n">' + (i+1) + '</div>' +
      '<div class="mc-card-body">' +
        '<div class="mc-card-lote">' + formatLoteHtml(r.lote||'') + '</div>' +
        '<div class="mc-card-prod">' + escHtml(r.producto||'—') + '</div>' +
        (detail.chips ? '<div class="mc-card-nums">' + detail.chips + '</div>' : '') +
        (detail.total ? '<div class="mc-card-total">' + detail.total + '</div>' : '') +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">' +
        '<button style="width:36px;height:36px;border:1px solid rgba(66,165,245,.4);background:rgba(66,165,245,.15);color:#90caf9;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;" onclick="mcEditRow(' + i + ')" title="Editar">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
        '</button>' +
        '<button class="mc-card-del" onclick="mcDeleteRow(' + i + ')" title="Eliminar">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>' +
        '</button>' +
      '</div>';

    lista.appendChild(card);
  });
}

function mcBuildDetail(r, tipo){
  var chips = '';
  var total = '';
  if(tipo==='pal60'||tipo==='pal55'){
    if(r.pallets)                    chips += '<span class="mc-card-chip">🎯 ' + r.pallets + ' pal. comp.</span>';
    if(r.palletsInc && r.palletsInc.toString().trim()){ var _incParts = r.palletsInc.toString().split(/[,;]+/).map(function(s){return s.trim();}).filter(Boolean); chips += '<span class="mc-card-chip">📋 ' + escHtml(String(r.palletsInc)) + ' (' + _incParts.length + ')</span>'; }
    if(r.bolsas && parseInt(r.bolsas)) chips += '<span class="mc-card-chip">+' + r.bolsas + ' sueltas</span>';
    if(r.totalBolsas) total = '<span style="font-family:\'IBM Plex Mono\',monospace;font-size:26px;font-weight:900;color:#fff;">Σ ' + r.totalBolsas + '</span><span style="font-size:12px;color:var(--b300);margin-left:5px;">bolsas</span>';
  } else if(tipo==='bol1200'||tipo==='bol1500'){
    if(r.bolsones) total = '<span style="font-family:\'IBM Plex Mono\',monospace;font-size:26px;font-weight:900;color:#fff;">🛢 ' + r.bolsones + '</span><span style="font-size:12px;color:var(--b300);margin-left:5px;">bolsones</span>';
  } else if(tipo==='granel'){
    if(r.contenedor) chips += '<span class="mc-card-chip">📦 ' + escHtml(r.contenedor) + '</span>';
    if(r.precinto)   chips += '<span class="mc-card-chip">🔒 ' + escHtml(r.precinto) + '</span>';
  } else if(tipo==='barrido'){
    if(r.ksEstimados) total = '<span style="font-family:\'IBM Plex Mono\',monospace;font-size:26px;font-weight:900;color:#fff;">⚖ ' + r.ksEstimados + '</span><span style="font-size:12px;color:var(--b300);margin-left:5px;">KS</span>';
  }
  return { chips: chips, total: total };
}

/* ── Leer / escribir filas desde/hacia el DOM del formulario ── */
function mcGetRows(tipo){
  /* Lee el estado actual de la tabla del formulario */
  var rows = [];
  if(tipo==='pal60'||tipo==='pal55'){
    document.querySelectorAll('#bd-'+tipo+' tr').forEach(function(tr){
      var ins = tr.querySelectorAll('.ti');
      var cval = tr.querySelector('.cval');
      var tbEl = tr.querySelector('.tb-i');
      var tkEl = tr.querySelector('.tk-i');
      rows.push({
        lote:       ins[0]?ins[0].value:'',
        producto:   ins[1]?ins[1].value:'',
        pallets:    cval?parseInt(cval.textContent)||0:0,
        palletsInc: tr.dataset.palletsInc||'',
        bolsas:     ins[3]?ins[3].value:'',
        totalBolsas:tbEl?tbEl.value:'',
        totalKs:    tkEl?tkEl.value:''
      });
    });
  } else if(tipo==='bol1200'||tipo==='bol1500'){
    document.querySelectorAll('#bd-'+tipo+' tr').forEach(function(tr){
      var ins = tr.querySelectorAll('.ti');
      var cval = tr.querySelector('.cval');
      rows.push({
        lote:    ins[0]?ins[0].value:'',
        producto:ins[1]?ins[1].value:'',
        bolsones:cval?parseInt(cval.textContent)||0:0,
        totalKs: ins[2]?ins[2].value:''
      });
    });
  } else if(tipo==='granel'){
    document.querySelectorAll('#bd-granel tr').forEach(function(tr){
      var ins=tr.querySelectorAll('.ti');
      rows.push({lote:ins[0]?ins[0].value:'',producto:ins[1]?ins[1].value:'',contenedor:ins[2]?ins[2].value:'',precinto:ins[3]?ins[3].value:''});
    });
  } else if(tipo==='barrido'){
    document.querySelectorAll('#bd-barrido tr').forEach(function(tr){
      var ins=tr.querySelectorAll('.ti'); var tk=tr.querySelector('.tk-i');
      rows.push({lote:ins[0]?ins[0].value:'',producto:ins[1]?ins[1].value:'',ksEstimados:tk?tk.value:''});
    });
  }
  return rows;
}

function mcDeleteRow(idx){
  if(!confirm('¿Eliminar esta fila?')) return;
  var tbody = document.getElementById('bd-' + _mcCurrentType);
  if(!tbody || idx >= tbody.rows.length) return;
  tbody.deleteRow(idx);
  rowCounts[_mcCurrentType] = Math.max(0, rowCounts[_mcCurrentType]-1);
  if(tbody.rows.length===0) document.getElementById('cb-'+_mcCurrentType).classList.remove('has-data');
  calcTotalNeto(_mcCurrentType);
  calcTotalBolsas(_mcCurrentType);
  checkProductoRepetido();
  calcTolerancia();
  mcRenderLista();
}

/* ══ WIZARD ══ */
function openMCWizard(){
  _mcWizardStep = 0;
  _mcEditIndex  = -1;
  _mcwForceInvalid = false;
  /* reset campos */
  document.getElementById('mcw-l1').value = '';
  document.getElementById('mcw-l2').value = '';
  document.getElementById('mcw-l3').value = '';
  ['mcw-l1','mcw-l2','mcw-l3'].forEach(function(id){
    document.getElementById(id).classList.remove('ok');
  });
  document.getElementById('mcw-preview').textContent = '';
  document.getElementById('mcw-error-lote').textContent = '';
  document.getElementById('mcw-prod').value = '';
  document.getElementById('mcw-error-prod').textContent = '';
  document.getElementById('mcw-breadcrumb').style.display = 'none';
  document.getElementById('mcw-bc-lote').textContent = '';
  document.getElementById('mcw-bc-prod').textContent = '';
  document.getElementById('mcw-bc-prod').style.display = 'none';
  mcwRenderQtyBody();
  mcwGoStep(0);
  document.getElementById('mc-wizard').classList.add('on');
  setTimeout(function(){ document.getElementById('mcw-l1').focus(); }, 150);
}

function closeMCWizard(){
  document.getElementById('mc-wizard').classList.remove('on');
}

function mcwGoStep(n){
  _mcWizardStep = n;
  var steps = ['mcw-step-0','mcw-step-1','mcw-step-2'];
  var labels = ['Paso 1 — Lote','Paso 2 — Producto','Paso 3 — Cantidades'];
  var last   = mcwStepCount() - 1;
  steps.forEach(function(id,i){ document.getElementById(id).classList.toggle('on', i===n); });
  [0,1,2].forEach(function(i){
    var dot = document.getElementById('mcw-dot-'+i);
    if(i < n)      dot.className = 'mcw-dot done';
    else if(i===n) dot.className = 'mcw-dot active';
    else           dot.className = 'mcw-dot';
  });
  document.getElementById('mcw-step-label').textContent = labels[n]||'';
  document.getElementById('mcw-btn-prev').style.display = n>0?'':'none';
  document.getElementById('mcw-btn-next').textContent   = n===last ? '✓ Confirmar' : 'Siguiente →';

  /* Breadcrumb acumulado */
  var bc     = document.getElementById('mcw-breadcrumb');
  var bcLote = document.getElementById('mcw-bc-lote');
  var bcProd = document.getElementById('mcw-bc-prod');
  if(n >= 1){
    var v1 = document.getElementById('mcw-l1').value;
    var v2 = document.getElementById('mcw-l2').value;
    var v3 = document.getElementById('mcw-l3').value;
    /* Format: "C101  Q4U  878" — padded blocks */
    var parts = [v1, v2, v3].filter(Boolean);
    bcLote.textContent = parts.join('   ');
    bc.style.display = 'flex';
  } else {
    bc.style.display = 'none';
  }
  if(n >= 2){
    bcProd.textContent = document.getElementById('mcw-prod').value.trim().toUpperCase();
    bcProd.style.display = 'block';
  } else {
    bcProd.style.display = 'none';
  }

  /* auto-focus */
  setTimeout(function(){
    if(n===0) document.getElementById('mcw-l1').focus();
    if(n===1) document.getElementById('mcw-prod').focus();
  },100);
}

function mcwStepCount(){
  /* granel y barrido no tienen paso 3 de cantidades complejas — lo mostramos igual */
  return 3;
}

function mcwNext(){
  if(_mcWizardStep === 0){
    /* validar lote */
    var v1 = document.getElementById('mcw-l1').value.trim();
    var v2 = document.getElementById('mcw-l2').value.trim().toUpperCase();
    var v3 = document.getElementById('mcw-l3').value.trim().toUpperCase();
    var lote = (v1+v2+v3);
    if(!v1){
      document.getElementById('mcw-error-lote').textContent = 'Seleccioná el prefijo del lote';
      return;
    }
    if(lote.length < 9){
      document.getElementById('mcw-error-lote').textContent = 'Necesitás al menos 9 caracteres (tiene '+lote.length+')';
      return;
    }
    /* Collect ALL errors */
    var allErrors = [];
    if(lote.length === 9){
      allErrors.push('⚠️ Solo 9 caracteres ingresados de 10');
    }
    /* Validate chars 5-6-7 and counter (even if 9 chars — validate what's there) */
    var loteValidationErrors = validateLoteChars(v2, v3);
    allErrors = allErrors.concat(loteValidationErrors);

    if(allErrors.length > 0 && !_mcwForceInvalid){
      var errorHtml = '<div style="text-align:left;font-size:12px;line-height:1.7;">';
      allErrors.forEach(function(e){
        errorHtml += '<div style="padding:3px 0;">🔴 ' + escHtml(e) + '</div>';
      });
      errorHtml += '</div>';
      errorHtml += '<button onclick="_mcwForceInvalid=true;mcwNext();" style="margin-top:10px;padding:8px 20px;border:1.5px solid #ef9a9a;background:rgba(183,28,28,.25);color:#ef9a9a;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;width:100%;">⚠️ Cargar igual con errores</button>';
      document.getElementById('mcw-error-lote').innerHTML = errorHtml;
      return;
    }
    _mcwForceInvalid = false;
    /* Show decoded date info */
    var decoded = decodeLoteInfo(v2);
    if(decoded) document.getElementById('mcw-preview').textContent = v1+' · '+v2+' · '+v3+' — '+decoded;
    document.getElementById('mcw-error-lote').textContent = '';
    mcwGoStep(1);

  } else if(_mcWizardStep === 1){
    var prod = document.getElementById('mcw-prod').value.trim();
    if(!prod){ document.getElementById('mcw-error-prod').textContent = 'Ingresá el producto'; return; }
    document.getElementById('mcw-error-prod').textContent = '';
    mcwRenderQtyBody();
    mcwGoStep(2);

  } else if(_mcWizardStep === 2){
    mcwConfirm();
  }
}

function mcwPrev(){
  if(_mcWizardStep > 0) mcwGoStep(_mcWizardStep - 1);
}

/* Bloque dinámico de cantidades */
function mcwRenderQtyBody(){
  var tipo = _mcCurrentType;
  var body = document.getElementById('mcw-qty-body');
  body.innerHTML = '';

  if(tipo==='pal60'||tipo==='pal55'){
    var mult = tipo==='pal60'?60:55;
    document.getElementById('mcw-qty-sub').textContent = 'Completá pallets completos, incompletos y bolsas sueltas.';
    body.innerHTML =
      '<div class="mcw-num-row">' +
        '<div><div class="mcw-num-label">Pallets completos</div><div class="mcw-num-sub">×'+mult+' bolsas c/u</div></div>' +
        '<button class="mcw-cnt-btn" onclick="mcwCnt(\'mcw-pallets\',-1)">−</button>' +
        '<div class="mcw-cnt-val" id="mcw-pallets">0</div>' +
        '<button class="mcw-cnt-btn" onclick="mcwCnt(\'mcw-pallets\',1)">+</button>' +
      '</div>' +
      '<div style="margin-bottom:10px;">' +
        '<div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:6px;">Bolsas pallets incompletos</div>' +
        '<div style="font-size:11px;color:var(--b300);margin-bottom:8px;">Ingresá las bolsas de cada pallet incompleto separadas por coma. Ej: 58, 57</div>' +
        '<input id="mcw-pallets-inc" class="mcw-field" style="margin-bottom:0;font-size:22px;" placeholder="Ej: 58, 57" type="text" inputmode="numeric" oninput="mcwRecalcPal()">' +
      '</div>' +
      '<div class="mcw-num-row">' +
        '<div><div class="mcw-num-label">Bolsas sueltas extra</div><div class="mcw-num-sub">bolsas adicionales</div></div>' +
        '<button class="mcw-cnt-btn" onclick="mcwCnt(\'mcw-bolsas\',-1)">−</button>' +
        '<div class="mcw-cnt-val" id="mcw-bolsas">0</div>' +
        '<button class="mcw-cnt-btn" onclick="mcwCnt(\'mcw-bolsas\',1)">+</button>' +
      '</div>' +
      '<div class="mcw-result-chip" id="mcw-res-chip">Total: <span class="mcw-result-val" id="mcw-res-val">—</span></div>';
    mcwRecalcPal();

  } else if(tipo==='bol1200'||tipo==='bol1500'){
    var ks = tipo==='bol1200'?1200:1500;
    document.getElementById('mcw-qty-sub').textContent = 'Cantidad de bolsones.';
    body.innerHTML =
      '<div class="mcw-num-row">' +
        '<div><div class="mcw-num-label">Bolsones</div><div class="mcw-num-sub">×'+ks+' KS c/u</div></div>' +
        '<button class="mcw-cnt-btn" onclick="mcwCnt(\'mcw-bolsones\',-1)">−</button>' +
        '<div class="mcw-cnt-val" id="mcw-bolsones">0</div>' +
        '<button class="mcw-cnt-btn" onclick="mcwCnt(\'mcw-bolsones\',1)">+</button>' +
      '</div>' +
      '<div class="mcw-result-chip">Total: <span class="mcw-result-val" id="mcw-res-val">—</span></div>';
    mcwRecalcBol(ks);

  } else if(tipo==='granel'){
    document.getElementById('mcw-qty-sub').textContent = 'Contenedor y precinto.';
    body.innerHTML =
      '<input id="mcw-contenedor" class="mcw-field" placeholder="Contenedor" style="margin-bottom:12px;" oninput="this.value=this.value.toUpperCase()">' +
      '<input id="mcw-precinto"   class="mcw-field" placeholder="Precinto"   oninput="this.value=this.value.toUpperCase()">';

  } else if(tipo==='barrido'){
    document.getElementById('mcw-qty-sub').textContent = 'KG estimados.';
    body.innerHTML =
      '<input id="mcw-kg" class="mcw-field" placeholder="KG estimados" type="number" inputmode="decimal">';
  }
}

function mcwCnt(elId, delta){
  var el = document.getElementById(elId);
  if(!el) return;
  var v = Math.max(0, (parseInt(el.textContent)||0) + delta);
  el.textContent = v;
  if(_mcCurrentType==='pal60'||_mcCurrentType==='pal55'){
    mcwRecalcPal();
  } else {
    var ks = _mcCurrentType==='bol1200'?1200:1500;
    mcwRecalcBol(ks);
  }
}

function mcwParsePalInc(){
  /* Parse "58, 57" → suma las bolsas de pallets incompletos */
  var el = document.getElementById('mcw-pallets-inc');
  if(!el || !el.value.trim()) return { total: 0, parts: [] };
  var parts = el.value.split(/[,;\s]+/).filter(Boolean);
  var nums  = parts.map(function(p){ return parseInt(p)||0; }).filter(function(n){ return n>0; });
  return { total: nums.reduce(function(a,b){ return a+b; }, 0), parts: nums };
}

function mcwRecalcPal(){
  var tipo = _mcCurrentType;
  var mult = tipo==='pal60'?60:55;
  var palEl = document.getElementById('mcw-pallets');
  var bolEl = document.getElementById('mcw-bolsas');
  var resEl = document.getElementById('mcw-res-val');
  if(!palEl||!bolEl||!resEl) return;
  var pal    = parseInt(palEl.textContent)||0;
  var incData = mcwParsePalInc();
  var bol    = parseInt(bolEl.textContent)||0;
  var totalBol = pal*mult + incData.total + bol;
  var totalKs  = totalBol * 25;
  var parts = [];
  if(pal)              parts.push(pal + ' pal. comp.');
  if(incData.parts.length) parts.push(incData.parts.join(', '));
  if(bol)              parts.push(bol + ' bolsas sueltas');
  resEl.textContent = (parts.length ? parts.join(' + ') + ' = ' : '') + totalBol + ' bolsas · ' + totalKs.toLocaleString('es-AR') + ' KS';
}

function mcwRecalcBol(ks){
  var bolEl = document.getElementById('mcw-bolsones');
  var resEl = document.getElementById('mcw-res-val');
  if(!bolEl||!resEl) return;
  var n = parseInt(bolEl.textContent)||0;
  resEl.textContent = (n * ks).toLocaleString('es-AR') + ' KS';
}

/* ── Confirmar y agregar fila al formulario ── */
function mcwConfirm(){
  var tipo = _mcCurrentType;
  var lote = (
    document.getElementById('mcw-l1').value.trim() +
    document.getElementById('mcw-l2').value.trim().toUpperCase() +
    document.getElementById('mcw-l3').value.trim().toUpperCase()
  );
  var prod = document.getElementById('mcw-prod').value.trim().toUpperCase();
  var data = { lote: lote, producto: prod };

  /* Armar resumen para confirmación */
  var resumen = [];
  resumen.push('Lote: ' + lote);
  resumen.push('Producto: ' + prod);

  if(tipo==='pal60'||tipo==='pal55'){
    var mult = tipo==='pal60'?60:55;
    var pal     = parseInt(document.getElementById('mcw-pallets').textContent)||0;
    var incData = mcwParsePalInc();
    var bol     = parseInt(document.getElementById('mcw-bolsas').textContent)||0;
    var totalBol = pal*mult + incData.total + bol;
    var totalKs  = totalBol * 25;
    data.pallets    = pal;
    data.palletsInc = incData.parts.join(', ');
    data.bolsas     = bol;
    data.totalBolsas= totalBol;
    data.totalKs    = totalKs;
    if(pal)                  resumen.push('Pallets completos: ' + pal);
    if(incData.parts.length) resumen.push('Pallets incompletos: ' + incData.parts.join(', '));
    if(bol)                  resumen.push('Bolsas sueltas: ' + bol);
    resumen.push('Total: ' + totalBol + ' bolsas · ' + totalKs.toLocaleString('es-AR') + ' KS');

  } else if(tipo==='bol1200'||tipo==='bol1500'){
    var ks = tipo==='bol1200'?1200:1500;
    var n  = parseInt(document.getElementById('mcw-bolsones').textContent)||0;
    data.bolsones = n;
    data.totalKs  = n * ks;
    resumen.push('Bolsones: ' + n);
    resumen.push('Total: ' + (n * ks).toLocaleString('es-AR') + ' KS');

  } else if(tipo==='granel'){
    data.contenedor = (document.getElementById('mcw-contenedor').value||'').toUpperCase();
    data.precinto   = (document.getElementById('mcw-precinto').value||'').toUpperCase();
    if(data.contenedor) resumen.push('Contenedor: ' + data.contenedor);
    if(data.precinto)   resumen.push('Precinto: ' + data.precinto);

  } else if(tipo==='barrido'){
    data.ksEstimados = document.getElementById('mcw-kg').value||'';
    if(data.ksEstimados) resumen.push('KG estimados: ' + data.ksEstimados);
  }

  /* Mostrar confirmación */
  mcwShowConfirm(resumen, function(){
    addRow(tipo, data);
    if(typeof calcTotalBolsas === 'function'){
      calcTotalBolsas(tipo);
    }
    if(typeof calcTotalNeto === 'function'){
      calcTotalNeto(tipo);
    }
    calcTolerancia && calcTolerancia();
    checkProductoRepetido && checkProductoRepetido();
    closeMCWizard();
    mcRenderLista();
    if(typeof renderReadonlySummary === 'function') renderReadonlySummary();
    showToast('Fila agregada ✓');
  });
}

function mcwShowConfirm(resumen, onConfirm){
  var overlay = document.getElementById('mcw-confirm-overlay');
  var body    = document.getElementById('mcw-confirm-body');
  body.innerHTML = resumen.map(function(line, i){
    var isFirst  = i === 0;
    var isLast   = i === resumen.length - 1;
    var big = isFirst || isLast;
    return '<div style="padding:' + (big?'10px 0':'5px 0') + ';' +
      (i < resumen.length-1 ? 'border-bottom:1px solid rgba(255,255,255,.07);' : '') +
      (isLast ? 'margin-top:6px;' : '') + '">' +
      '<span style="font-family:\'IBM Plex Mono\',monospace;font-size:' +
      (isFirst ? '20px' : isLast ? '16px' : '13px') +
      ';font-weight:' + (big ? '800' : '400') +
      ';color:' + (isFirst ? '#90caf9' : isLast ? '#a5d6a7' : 'rgba(255,255,255,.8)') + ';">' +
      escHtml(line) + '</span></div>';
  }).join('');
  overlay.style.display = 'flex';
  document.getElementById('mcw-confirm-ok').onclick = function(){
    overlay.style.display = 'none';
    onConfirm();
  };
  document.getElementById('mcw-confirm-cancel').onclick = function(){
    overlay.style.display = 'none';
  };
}

/* ── Helpers para el wizard (campos lote) ── */
function mcwL1Change(el){
  el.classList.toggle('ok', el.value !== '');
  mcwUpdatePreview();
  if(el.value) setTimeout(function(){ document.getElementById('mcw-l2').focus(); document.getElementById('mcw-l2').select(); },50);
}
function mcwSegInput(el, nextId, maxLen){
  var pos = el.selectionStart;
  el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
  try{ el.setSelectionRange(pos,pos); }catch(e){}
  el.classList.toggle('ok', el.value.length===maxLen);
  if(el.value.length>=maxLen && nextId){
    var nx=document.getElementById(nextId); nx.focus(); nx.select();
  }
  mcwUpdatePreview();
}
function mcwSegKey(event, el, prevId, nextId){
  if(event.key==='Backspace' && el.value==='' && prevId){
    event.preventDefault();
    var prev=document.getElementById(prevId); prev.focus();
  }
  if(event.key==='Enter') mcwNext();
}
function mcwUpdatePreview(){
  var v1=document.getElementById('mcw-l1').value;
  var v2=document.getElementById('mcw-l2').value;
  var v3=document.getElementById('mcw-l3').value;
  var preview=document.getElementById('mcw-preview');
  preview.textContent = [v1,v2,v3].filter(Boolean).join(' · ');
}


/* ═══════════════════════════════════════════════════════════
   READONLY SUMMARY in formulario section 02
═══════════════════════════════════════════════════════════ */
function renderReadonlySummary(){
  var allTypes = ['pal60','pal55','bol1200','bol1500','granel','barrido'];
  var typeLabels = {'pal60':'Paletizada ×60','pal55':'Paletizada ×55','bol1200':'Bolsones ×1200','bol1500':'Bolsones ×1500','granel':'Granel','barrido':'Barrido'};

  allTypes.forEach(function(tipo){
    var container = document.getElementById('mc-readonly-'+tipo);
    if(!container) return;
    var tbody = document.getElementById('bd-'+tipo);
    if(!tbody || tbody.rows.length === 0){
      container.innerHTML = '';
      return;
    }
    var rows = mcGetRows(tipo);
    container.innerHTML = '';
    if(rows.length === 0) return;

    /* Grand total bolsas for this type */
    var grandTotal = 0;

    rows.forEach(function(r, i){
      var totalTxt = '';
      var totalSub = '';
      if(tipo==='pal60'||tipo==='pal55'){
        totalTxt = r.totalBolsas||'0';
        totalSub = 'bolsas';
        grandTotal += parseInt(r.totalBolsas)||0;
      } else if(tipo==='bol1200'||tipo==='bol1500'){
        totalTxt = r.bolsones||'0';
        totalSub = 'bolsones';
        grandTotal += parseInt(r.bolsones)||0;
      } else if(tipo==='granel'){
        totalTxt = r.contenedor||'—';
        totalSub = 'contenedor';
      } else if(tipo==='barrido'){
        totalTxt = r.ksEstimados||'0';
        totalSub = 'KS';
        grandTotal += parseFloat(r.ksEstimados)||0;
      }
      var loteHtml = formatLoteHtml(r.lote||'');
      var card = document.createElement('div');
      card.className = 'mc-ro-card';
      card.innerHTML =
        '<div class="mc-ro-n">'+(i+1)+'</div>'+
        '<div class="mc-ro-body">'+
          '<div class="mc-ro-lote">'+loteHtml+'</div>'+
          '<div class="mc-ro-prod">'+escHtml(r.producto||'—')+'</div>'+
        '</div>'+
        '<div class="mc-ro-total">'+escHtml(String(totalTxt))+'<small>'+totalSub+'</small></div>';
      container.appendChild(card);
    });

    /* Update existing total-bolsas field if present */
    var totalBolsasEl = document.getElementById('total-bolsas-'+tipo);
    if(totalBolsasEl){
      totalBolsasEl.textContent = grandTotal > 0 ? grandTotal.toLocaleString('es-AR') : '—';
    }
  });

  /* Show all cargo blocks that have data, regardless of selection */
  allTypes.forEach(function(tipo){
    var block = document.getElementById('cb-'+tipo);
    if(!block) return;
    var tbody = document.getElementById('bd-'+tipo);
    var hasData = tbody && tbody.rows.length > 0;
    if(hasData){
      block.classList.add('on');
      block.classList.add('has-data');
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   LOTE VALIDATION — 10 chars: 4(prefix)+3(año/mes/dia)+3(counter)
═══════════════════════════════════════════════════════════ */
function validateLoteChars(v2, v3){
  /* v2 = 3 chars: año(A-Z), mes(1-9,A-C), dia(1-9,A-V) */
  /* v3 = 2 or 3 chars: counter 01-999 */
  var errors = [];

  if(v2.length < 3){
    errors.push('El segundo grupo necesita 3 caracteres (tiene '+v2.length+')');
    return errors;
  }

  var c5 = v2.charAt(0); /* año */
  var c6 = v2.charAt(1); /* mes */
  var c7 = v2.charAt(2); /* dia */

  /* Char 5: year = A-Z only (never number) */
  if(/^[0-9]$/.test(c5)){
    errors.push('Carácter 5 (año): "'+c5+'" es un número — debe ser letra A-Z (A=2010, B=2011...)');
  } else if(!/^[A-Z]$/.test(c5)){
    errors.push('Carácter 5 (año): "'+c5+'" no es válido — debe ser letra A-Z (A=2010, B=2011...)');
  }

  /* Char 6: month = 1-9 for jan-sept, A=oct, B=nov, C=dic */
  var validMonths = '123456789ABC';
  if(validMonths.indexOf(c6) === -1){
    errors.push('Carácter 6 (mes): "'+c6+'" no es válido — debe ser 1-9 (ene-sept) ó A(oct), B(nov), C(dic)');
  }

  /* Char 7: day = 1-9 for days 1-9, A=10, B=11... V=31 */
  var validDays = '123456789ABCDEFGHIJKLMNOPQRSTUV';
  if(validDays.indexOf(c7) === -1){
    errors.push('Carácter 7 (día): "'+c7+'" no es válido — debe ser 1-9 ó A=10, B=11... V=31');
  }

  /* v3: counter — check what's there */
  if(v3.length > 0){
    if(!/^[0-9]+$/.test(v3)){
      errors.push('Contador (pos. 8-10): "'+v3+'" debe ser solo números (001 a 999)');
    } else if(v3.length === 3 && parseInt(v3) === 0){
      errors.push('Contador no puede ser 000');
    }
  }

  return errors;
}

function decodeLoteInfo(v2){
  /* Returns human-readable info about the lote date */
  if(v2.length !== 3) return '';
  var c5 = v2.charAt(0);
  var c6 = v2.charAt(1);
  var c7 = v2.charAt(2);

  var yearNum = 2010 + (c5.charCodeAt(0) - 65);
  var months = {'1':'Ene','2':'Feb','3':'Mar','4':'Abr','5':'May','6':'Jun','7':'Jul','8':'Ago','9':'Sep','A':'Oct','B':'Nov','C':'Dic'};
  var dayMap = '123456789ABCDEFGHIJKLMNOPQRSTUV';
  var dayNum = dayMap.indexOf(c7) + 1;

  var info = [];
  if(yearNum >= 2010 && yearNum <= 2040) info.push(yearNum);
  if(months[c6]) info.push(months[c6]);
  if(dayNum > 0 && dayNum <= 31) info.push('día ' + dayNum);
  return info.join(' / ');
}

/* ═══════════════════════════════════════════════════════════
   MODO CARGA — Edit mode & deduplication
═══════════════════════════════════════════════════════════ */
function mcEditRow(idx){
  /* Open wizard step 2 (cantidades) only, lote+prod locked */
  var tipo = _mcCurrentType;
  var rows = mcGetRows(tipo);
  if(idx < 0 || idx >= rows.length) return;
  var r = rows[idx];

  _mcEditIndex = idx;
  _mcWizardStep = 2;

  /* Set lote fields (locked) */
  var lote = r.lote||'';
  document.getElementById('mcw-l1').value = lote.length>=4 ? lote.substr(0,4) : '';
  document.getElementById('mcw-l2').value = lote.length>=7 ? lote.substr(4,3) : '';
  document.getElementById('mcw-l3').value = lote.length>=10 ? lote.substr(7,3) : '';
  document.getElementById('mcw-prod').value = r.producto||'';

  document.getElementById('mcw-breadcrumb').style.display = 'none';
  document.getElementById('mcw-bc-lote').textContent = '';
  document.getElementById('mcw-bc-prod').textContent = '';
  document.getElementById('mcw-bc-prod').style.display = 'none';

  mcwRenderQtyBody();

  /* Pre-fill quantities */
  if(tipo==='pal60'||tipo==='pal55'){
    var palEl = document.getElementById('mcw-pallets');
    if(palEl) palEl.textContent = r.pallets||0;
    var incEl = document.getElementById('mcw-pallets-inc');
    if(incEl) incEl.value = r.palletsInc||'';
    var bolEl = document.getElementById('mcw-bolsas');
    if(bolEl) bolEl.textContent = r.bolsas||0;
    mcwRecalcPal();
  } else if(tipo==='bol1200'||tipo==='bol1500'){
    var bolsEl = document.getElementById('mcw-bolsones');
    if(bolsEl) bolsEl.textContent = r.bolsones||0;
    var ks = tipo==='bol1200'?1200:1500;
    mcwRecalcBol(ks);
  } else if(tipo==='granel'){
    var cEl = document.getElementById('mcw-contenedor');
    if(cEl) cEl.value = r.contenedor||'';
    var pEl = document.getElementById('mcw-precinto');
    if(pEl) pEl.value = r.precinto||'';
  } else if(tipo==='barrido'){
    var kEl = document.getElementById('mcw-kg');
    if(kEl) kEl.value = r.ksEstimados||'';
  }

  mcwGoStep(2);
  document.getElementById('mc-wizard').classList.add('on');
}

/* Override mcwConfirm to handle edit mode and dedup */
var _origMcwConfirm = mcwConfirm;
mcwConfirm = function(){
  var tipo = _mcCurrentType;
  var lote = (
    document.getElementById('mcw-l1').value.trim() +
    document.getElementById('mcw-l2').value.trim().toUpperCase() +
    document.getElementById('mcw-l3').value.trim().toUpperCase()
  );
  var prod = document.getElementById('mcw-prod').value.trim().toUpperCase();

  /* ── Dedup check (only for new rows, not edits) ── */
  if(_mcEditIndex === -1){
    var rows = mcGetRows(tipo);
    for(var di=0; di<rows.length; di++){
      if(rows[di].lote === lote && rows[di].producto.toUpperCase() === prod){
        showToast('⚠️ Lote y producto ya cargado — se abre para editar cantidades');
        closeMCWizard();
        setTimeout(function(){ mcEditRow(di); }, 200);
        return;
      }
    }
  }

  /* ── If editing, delete old row first ── */
  if(_mcEditIndex >= 0){
    var tbody = document.getElementById('bd-'+tipo);
    if(tbody && _mcEditIndex < tbody.rows.length){
      tbody.deleteRow(_mcEditIndex);
      rowCounts[tipo] = Math.max(0, rowCounts[tipo]-1);
    }
    _mcEditIndex = -1;
  }

  /* Call original confirm logic */
  _origMcwConfirm();

  /* Update readonly summary */
  renderReadonlySummary();
};

/* Patch the original mcwConfirm to also update readonly */
var _origCloseMCWizard = closeMCWizard;
closeMCWizard = function(){
  _origCloseMCWizard();
  renderReadonlySummary();
};

/* Patch mcDeleteRow to update readonly */
var _origMcDeleteRow = mcDeleteRow;
mcDeleteRow = function(idx){
  _origMcDeleteRow(idx);
  renderReadonlySummary();
};


/* ═══ 08-entry-modal.js ═══ */

/* ═══════════════════════════════════════════
   MÓDULO INGRESO RÁPIDO — Lote / Producto
   ═══════════════════════════════════════════ */

var _emTarget    = null;
var _emFieldType = '';

/* ── Botón HTML (+) para addRow ── */
function ocrBtnHtml(field){
  var label = field === 'lote' ? 'Agregar Lote' : 'Agregar Producto';
  return '<button type="button" class="ocr-btn" title="'+label+'" '+
    'onclick="ocrOpenFromBtn(this,\''+field+'\')">+</button>';
}

/* ── Abrir modal desde botón de fila ── */
function ocrOpenFromBtn(btn, field){
  var td  = btn.closest('td') || btn.parentElement;
  var inp = td.querySelector('input.ti');
  if(!inp) return;
  _emTarget    = inp;
  _emFieldType = field;

  ['em-l1','em-l2','em-l3'].forEach(function(id){
    var el = document.getElementById(id);
    if(el){ el.value = ''; el.classList.remove('ok'); }
  });
  document.getElementById('em-lote-preview').textContent = '';
  document.getElementById('em-lote-error').textContent   = '';
  var prod = document.getElementById('em-prod');
  if(prod) prod.value = '';
  document.getElementById('em-prod-error').textContent = '';

  var isLote = (field === 'lote');
  document.getElementById('em-title').textContent        = isLote ? 'Ingresar Lote' : 'Ingresar Producto';
  document.getElementById('em-body-lote').style.display  = isLote ? '' : 'none';
  document.getElementById('em-body-prod').style.display  = isLote ? 'none' : '';

  document.getElementById('entry-modal').classList.add('on');

  setTimeout(function(){
    var first = isLote ? document.getElementById('em-l1') : document.getElementById('em-prod');
    if(first) first.focus();
  }, 80);
}

function emSegInput(el, nextId, maxLen){
  var pos = el.selectionStart;
  el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
  try{ el.setSelectionRange(pos, pos); }catch(e){}
  el.classList.toggle('ok', el.value.length === maxLen);
  if(el.value.length >= maxLen && nextId){
    var nx = document.getElementById(nextId);
    nx.focus(); nx.select();
  }
  emUpdatePreview();
}

function emSegKey(event, el, prevId, nextId){
  if(event.key === 'Backspace' && el.value === '' && prevId){
    event.preventDefault();
    var prev = document.getElementById(prevId);
    prev.focus();
    prev.setSelectionRange(prev.value.length, prev.value.length);
  }
  if(event.key === 'Enter') emConfirm();
}

function emUpdatePreview(){
  var v1 = document.getElementById('em-l1').value;
  var v2 = document.getElementById('em-l2').value;
  var v3 = document.getElementById('em-l3').value;
  var total = v1.length + v2.length + v3.length;
  var preview = document.getElementById('em-lote-preview');
  var error   = document.getElementById('em-lote-error');
  if(total === 0){
    preview.textContent = '';
    error.textContent   = '';
  } else {
    preview.textContent = [v1,v2,v3].filter(Boolean).join(' · ');
    error.textContent   = total < 10 ? (total + ' / 10 caracteres') : '';
  }
}

function emProdInput(){
  var el = document.getElementById('em-prod');
  var pos = el.selectionStart;
  el.value = el.value.toUpperCase();
  try{ el.setSelectionRange(pos, pos); }catch(e){}
  document.getElementById('em-prod-error').textContent = '';
}

function emConfirm(){
  if(!_emTarget) return;
  var val = '';
  if(_emFieldType === 'lote'){
    var v1 = document.getElementById('em-l1').value.trim();
    var v2 = document.getElementById('em-l2').value.trim();
    var v3 = document.getElementById('em-l3').value.trim();
    val = (v1+v2+v3).toUpperCase();
    if(val.length !== 10){
      document.getElementById('em-lote-error').textContent =
        'Necesitás exactamente 10 caracteres (tiene '+val.length+')';
      return;
    }
  } else {
    val = document.getElementById('em-prod').value.trim().toUpperCase();
    if(!val){
      document.getElementById('em-prod-error').textContent = 'Ingresá el producto';
      return;
    }
  }
  _emTarget.value = val;
  _emTarget.readOnly = true;
  _emTarget.classList.add('ti-confirmed');
  _emTarget.dispatchEvent(new Event('input',  {bubbles:true}));
  _emTarget.dispatchEvent(new Event('change', {bubbles:true}));
  emCancel();
  showToast('Campo completado ✓');
}

function emCancel(){
  document.getElementById('entry-modal').classList.remove('on');
  _emTarget = null;
}

document.addEventListener('DOMContentLoaded', function(){
  var em = document.getElementById('entry-modal');
  if(em) em.addEventListener('click', function(e){ if(e.target === this) emCancel(); });
});
