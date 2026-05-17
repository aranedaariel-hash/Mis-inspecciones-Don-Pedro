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
  loadAuditStore(); audits=audits.filter(function(a){return a.inspId!==id;}); saveAuditStore();
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
      loadStore(); loadAuditStore(); renderHome();
    }
  }
});
window.addEventListener('storage', function(e){
  if(e.key === 'inspeccion_app_v1' || e.key === 'inspeccion_audits_v1'){
    loadStore(); loadAuditStore(); renderHome();
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
