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
var _origBuildAuditTable = buildAuditTable;
buildAuditTable = function(items, tbodyId, type){
  _origBuildAuditTable(items, tbodyId, type);
  document.querySelectorAll('select[data-atype="'+type+'"]').forEach(function(sel){
    sel.value = '5';
    onScoreChange(sel);
  });
};

/* ── AUDIT % = % de acierto (pts obtenidos / pts posibles de relevados) ── */
var _origRecalcAuditTotal = recalcAuditTotal;
recalcAuditTotal = function(type){
  var sels = document.querySelectorAll('select[data-atype="'+type+'"]');
  var real=0, possible=0;
  sels.forEach(function(s){
    var pts = parseInt(s.dataset.pts)||0;
    var val = parseInt(s.value)||0;
    possible += pts;
    real += val;
  });
  var pct = possible > 0 ? Math.round(real/possible*100) : 0;
  var pctStr = pct + '%';
  var ts = document.getElementById('tscore-'+type); if(ts) ts.textContent=real;
  var tp = document.getElementById('tpct-'+type); if(tp) tp.textContent=pctStr;
  var px = type==='comp'?'ac':'ae';
  var hdr = document.getElementById(px+'-pct-hdr'); if(hdr) hdr.textContent=pctStr;
  return{real:real,pts:possible,pct:pct,pctStr:pctStr};
};




/* ══════════════════════════════════════════════════════
