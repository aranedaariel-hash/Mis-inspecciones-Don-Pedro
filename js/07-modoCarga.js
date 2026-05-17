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
