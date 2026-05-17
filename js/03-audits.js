var AUDIT_KEY = 'inspeccion_audits_v1';
var audits = [];
var curAuditInspId = null, curAuditType = null, curAuditId = null;

function loadAuditStore(){
  try{ audits = JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]'); }
  catch(e){ audits = []; }
}
function saveAuditStore(){ localStorage.setItem(AUDIT_KEY, JSON.stringify(audits)); }

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

/* ── SAP (saved audits panel) ── */
function toggleSAP(inspId){
  loadAuditStore();
  var sap = document.getElementById('sap-'+inspId);
  var btn = document.getElementById('sapbtn-'+inspId);
  if(!sap) return;
  var opening = !sap.classList.contains('open');
  sap.classList.toggle('open');
  if(opening){
    renderSAP(inspId);
    if(btn) btn.textContent = 'Ocultar';
  } else {
    var cnt = audits.filter(function(a){ return a.inspId===inspId; }).length;
    if(btn) btn.textContent = cnt ? 'Auditorías ('+cnt+')' : 'Auditorías';
  }
}

function renderSAP(inspId){
  var sap = document.getElementById('sap-'+inspId);
  if(!sap) return;
  sap.innerHTML = '';
  var rel = audits.filter(function(a){ return a.inspId===inspId; });
  if(rel.length === 0){ sap.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:#7a9bb5;">Sin auditorías asociadas.</div>'; return; }
  var wrap = document.createElement('div');
  wrap.style.cssText = 'padding:8px 14px 12px;';
  rel.forEach(function(a){
    var lbl = a.type==='comp' ? 'Comportamiento' : 'Enlonado';
    var displayName = (a.conductor && a.conductor.trim()) ? a.conductor.trim() : (a.auditor||'Sin nombre');
    var dotC = a.type==='comp' ? '#8b0000' : '#1a237e';
    var pn = parseFloat(a.pct)||0;
    var pctBg = pn>=80 ? 'background:#e8f5e9;color:#1b5e20;' : pn>=50 ? 'background:#fff8e1;color:#7c5a00;' : 'background:#ffebee;color:#b71c1c;';
    var fd = a.fecha ? a.fecha.split('-').reverse().join('/') : '—';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:8px 10px;background:#fff;border:1px solid #cfe3f5;border-radius:5px;margin-bottom:6px;flex-wrap:wrap;';
    var dot = document.createElement('div');
    dot.style.cssText = 'width:8px;height:8px;border-radius:50%;flex-shrink:0;background:'+dotC;
    var info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:120px;';
    var _dname = (a.conductor && a.conductor.trim()) ? a.conductor.trim() : (a.auditor||'Sin nombre');
    info.innerHTML = '<div style="font-size:11.5px;font-weight:500;color:#0a1929;">'+escHtml(lbl+' — '+_dname)+'</div>'+
      '<div style="font-size:10px;color:#7a9bb5;margin-top:1px;">'+escHtml(fd+' · '+(a.horaInicio||'—')+' → '+(a.horaFin||'—'))+'</div>';
    var pctEl = document.createElement('span');
    pctEl.style.cssText = 'font-size:11px;font-family:monospace;font-weight:600;padding:2px 8px;border-radius:10px;'+pctBg;
    pctEl.textContent = Math.round(pn)+'%';
    function mkBtn(label, color, borderC, cb){
      var b = document.createElement('button');
      b.style.cssText = 'padding:4px 10px;font-size:10px;border-radius:4px;background:#fff;color:'+color+';border:1px solid '+borderC+';cursor:pointer;font-weight:500;white-space:nowrap;';
      b.textContent = label;
      b.onclick = cb;
      return b;
    }
    row.appendChild(dot); row.appendChild(info); row.appendChild(pctEl);
    row.appendChild(mkBtn('Cargar','#0f3460','#cfe3f5',(function(id){return function(){loadAuditById(id);};})(a.id)));
    row.appendChild(mkBtn('PDF','#0f3460','#cfe3f5',(function(id){return function(){exportAuditById(id);};})(a.id)));
    row.appendChild(mkBtn('Eliminar','#b71c1c','#fecaca',(function(id,lb){return function(){confirmDelAudit(id,lb);};})(a.id,lbl)));
    wrap.appendChild(row);
  });
  sap.appendChild(wrap);
}

/* ── DELETE AUDIT ── */
function confirmDelAudit(id, lbl){
  if(!confirm('¿Eliminar la auditoría "'+lbl+'"? Esta acción no se puede deshacer.')) return;
  doDelAudit(id);
}
function doDelAudit(id){
  loadAuditStore();
  audits = audits.filter(function(a){ return a.id!==id; });
  saveAuditStore();
  renderHome();
  showToast('Auditoría eliminada');
}

/* ── OPEN AUDITS ── */
function openAuditComp(inspId){
  loadAuditStore();
  curAuditInspId = inspId; curAuditType = 'comp'; curAuditId = uid();
  buildAuditTable(ITEMS_COMP, 'comp-tbody', 'comp');
  var d = getInspData(inspId)||{};
  document.getElementById('ac-transporte').value = d.transporte||'';
  document.getElementById('ac-conductor').value  = d.nombre||'';
  document.getElementById('ac-patente').value    = d.patentes||'';
  document.getElementById('ac-auditor').value    = d.auditor||'';
  document.getElementById('ac-obs').value = '';
  document.getElementById('ac-pct-hdr').textContent = '0,00%';
  document.getElementById('ac-fecha').value = new Date().toISOString().split('T')[0];
  document.getElementById('ac-hi').value = '';
  document.getElementById('ac-hf').value = '';
  document.getElementById('ac-status').textContent = '';
  show('s-audit-comp');
}

function openAuditEnl(inspId){
  loadAuditStore();
  curAuditInspId = inspId; curAuditType = 'enl'; curAuditId = uid();
  buildAuditTable(ITEMS_ENL, 'enl-tbody', 'enl');
  var d = getInspData(inspId)||{};
  document.getElementById('ae-transporte').value = d.transporte||'';
  document.getElementById('ae-conductor').value  = d.nombre||'';
  document.getElementById('ae-patente').value    = d.patentes||'';
  document.getElementById('ae-auditor').value    = d.auditor||'';
  document.getElementById('ae-obs').value = '';
  document.getElementById('ae-pct-hdr').textContent = '0,00%';
  document.getElementById('ae-fecha').value = new Date().toISOString().split('T')[0];
  document.getElementById('ae-hi').value = '';
  document.getElementById('ae-hf').value = '';
  document.getElementById('ae-status').textContent = '';
  show('s-audit-enl');
}

function loadAuditById(auditId){
  loadAuditStore();
  var a = audits.find(function(x){ return x.id===auditId; });
  if(!a){ showToast('No se encontró la auditoría'); return; }
  curAuditInspId = a.inspId; curAuditType = a.type; curAuditId = a.id;
  var px = a.type==='comp' ? 'ac' : 'ae';
  buildAuditTable(a.type==='comp'?ITEMS_COMP:ITEMS_ENL, a.type+'-tbody', a.type);
  document.getElementById(px+'-transporte').value = a.transporte||'';
  document.getElementById(px+'-conductor').value  = a.conductor||'';
  document.getElementById(px+'-patente').value    = a.patente||'';
  document.getElementById(px+'-auditor').value    = a.auditor||'';
  document.getElementById(px+'-fecha').value      = a.fecha||'';
  document.getElementById(px+'-hi').value         = a.horaInicio||'';
  document.getElementById(px+'-hf').value         = a.horaFin||'';
  document.getElementById(px+'-obs').value        = a.obs||'';
  var scores = a.scores||{};
  Object.keys(scores).forEach(function(k){
    var sel = document.getElementById(k);
    if(sel){ sel.value = scores[k]; onScoreChange(sel); }
  });
  document.getElementById(px+'-status').textContent = 'Cargado';
  show('s-audit-'+a.type);
}

function closeAudit(){ show('s-home'); renderHome(); }

/* ── SAVE AUDIT ── */
function saveAudit(type){
  loadAuditStore();
  var px = type==='comp' ? 'ac' : 'ae';
  var totals = recalcAuditTotal(type);
  var scores = {};
  document.querySelectorAll('select[data-atype="'+type+'"]').forEach(function(s){ scores[s.id] = s.value; });
  var rec = {
    id: curAuditId, inspId: curAuditInspId, type: type,
    conductor: document.getElementById(px+'-conductor').value,
    transporte: document.getElementById(px+'-transporte').value,
    patente:    document.getElementById(px+'-patente').value,
    auditor:    document.getElementById(px+'-auditor').value,
    fecha:      document.getElementById(px+'-fecha').value,
    horaInicio: document.getElementById(px+'-hi').value,
    horaFin:    document.getElementById(px+'-hf').value,
    obs:        document.getElementById(px+'-obs').value,
    scores: scores,
    totalReal: totals.real, totalPts: totals.pts,
    pct: totals.pct, pctStr: totals.pctStr,
    savedAt: Date.now()
  };
  var idx = audits.findIndex(function(a){ return a.id===curAuditId; });
  if(idx>=0) audits[idx]=rec; else audits.push(rec);
  saveAuditStore();
  document.getElementById(px+'-status').textContent = 'Guardado · '+new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  showToast('Auditoría guardada');
}

/* ── EXPORT AUDIT PDF ── */
function exportAuditPDF(type){
  saveAudit(type);
  loadAuditStore();
  var a = audits.find(function(x){ return x.id===curAuditId; });
  if(a) genAuditPDF(a, type==='comp'?ITEMS_COMP:ITEMS_ENL);
}
function exportAuditById(auditId){
  loadAuditStore();
  var a = audits.find(function(x){ return x.id===auditId; });
  if(!a){ showToast('No se encontró'); return; }
  genAuditPDF(a, a.type==='comp'?ITEMS_COMP:ITEMS_ENL);
}

function genAuditPDF(a, items){
  var isComp = a.type==='comp';
  var titulo = isComp ? 'AUDITORIA DE COMPORTAMIENTO DE CHOFERES EXTERNOS' : 'AUDITORIA ENLONADO EXTERNOS DE CAMIONES';
  var hC = isComp ? '#8b0000' : '#1a237e';
  var instr = isComp
    ? '<p>La siguiente planilla es para ser usada como guía para realizar la auditoría de comportamiento de choferes externos.</p><p><b>5</b> Cumple el 100% &nbsp;|&nbsp; <b>3</b> No cumple el 100% (desviación menor) &nbsp;|&nbsp; <b>1</b> No cumple (desviación mayor)</p><p>Cada desviación debe quedar registrada. El auditor deberá informar en forma inmediata a Dow las desviaciones mayores. El auditor debe verificar que las anteriores se cumplieron.</p>'
    : '<p>La siguiente planilla es para ser usada como guía para realizar la auditoría de enlonado externos de camiones.</p><p><b>5</b> Cumple el 100% &nbsp;|&nbsp; <b>3</b> No cumple el 100% (desviación menor) &nbsp;|&nbsp; <b>1</b> No cumple (desviación mayor)</p><p>Cada desviación debe quedar registrada. El auditor deberá informar en forma inmediata las desviaciones mayores.</p>';
  var scores = a.scores||{};
  var totalPts = items.reduce(function(s,it){return s+(it.pts||0);},0);
  var rows = '';
  items.forEach(function(item, idx){
    if(item.sec){
      rows += '<tr><td colspan="5" style="background:#e8eaf6;font-weight:bold;color:#1a237e;padding:6px 8px;border:1px solid #ccc;font-size:11px;">'+item.id+'&nbsp;&nbsp;'+item.label+'</td></tr>';
    } else {
      var k = 'asel_'+a.type+'_'+idx;
      var sc = scores[k]||'';
      var pct = (sc&&item.pts) ? Math.round(parseInt(sc)/item.pts*100)+'%' : '0%';
      var pad = item.sub ? 'padding-left:20px;font-style:italic;' : '';
      var bg = sc==='5'?'#e8f5e9':sc==='3'?'#fff8e1':sc==='1'?'#ffebee':'#fff';
      rows += '<tr><td style="border:1px solid #ccc;padding:5px 7px;font-size:10px;color:#7a9bb5;'+pad+'">'+item.id+'</td>'+
              '<td style="border:1px solid #ccc;padding:5px 7px;'+pad+'">'+item.label+'</td>'+
              '<td style="border:1px solid #ccc;padding:5px 7px;text-align:center;width:55px;">'+item.pts+'</td>'+
              '<td style="border:1px solid #ccc;padding:5px 7px;text-align:center;width:75px;background:'+bg+';font-weight:bold;font-size:14px;">'+sc+'</td>'+
              '<td style="border:1px solid #ccc;padding:5px 7px;text-align:center;width:55px;font-size:11px;">'+pct+'</td></tr>';
    }
  });
  var pn = parseFloat(a.pct)||0;
  var fd = a.fecha ? a.fecha.split('-').reverse().join('/') : '';
  var esc = function(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+titulo+'</title>'+
    '<style>body{font-family:Arial,sans-serif;font-size:12px;margin:0;padding:16px;}'+
    '.hbar{background:'+hC+';color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}'+
    '.hbar h1{font-size:13px;font-weight:bold;margin:0;}.hbar small{font-size:11px;opacity:.8;}'+
    '.instr{border:1px solid #ffe082;background:#fffde7;padding:10px 13px;font-size:11px;line-height:1.75;margin-bottom:10px;}.instr p{margin-bottom:3px;}'+
    '.mt{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:11px;}.mt td{border:1px solid #c5d9ee;padding:5px 8px;}'+
    '.ml{font-weight:bold;background:#e8f0fa;color:#455a72;width:90px;font-size:10px;text-transform:uppercase;}'+
    '.at{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px;}'+
    '.at th{background:#1a237e;color:#b3c6f0;padding:7px 8px;text-align:left;font-size:10px;letter-spacing:.5px;text-transform:uppercase;}'+
    '.at th.ac{text-align:center;}.tot td{background:#fff3e0;font-weight:bold;}'+
    '.ob{border:1px solid #ccc;padding:10px;min-height:60px;font-size:11px;white-space:pre-wrap;}'+
    '.ft{font-size:10px;color:#999;margin-top:16px;text-align:center;border-top:1px solid #eee;padding-top:8px;}'+
    '@media print{@page{margin:12mm;}}</style></head><body>'+
    '<div class="hbar"><h1>'+titulo+'</h1><small>Página 1 de 1</small></div>'+
    '<div class="instr">'+instr+'</div>'+
    '<table class="mt">'+
    '<tr><td class="ml">Transporte</td><td>'+esc(a.transporte)+'</td><td class="ml">Conductor</td><td colspan="3">'+esc(a.conductor)+'</td></tr>'+
    '<tr><td class="ml">Auditor</td><td>'+esc(a.auditor)+'</td><td class="ml">Fecha</td><td>'+esc(fd)+'</td><td class="ml">Patente</td><td>'+esc(a.patente)+'</td></tr>'+
    '<tr><td class="ml">Hora inicio</td><td>'+esc(a.horaInicio)+'</td><td class="ml">Hora final</td><td>'+esc(a.horaFin)+'</td>'+
    '<td colspan="2" style="text-align:right;font-size:18px;font-weight:bold;color:#e65100;border:none;">'+esc(a.pctStr||Math.round(pn)+'%')+'</td></tr>'+
    '</table>'+
    '<table class="at"><thead><tr><th style="width:48px;">#</th><th>1,0 — Actitud del personal</th>'+
    '<th class="ac" style="width:55px;">Pts. Posibles</th><th class="ac" style="width:75px;">Pts. Reales</th><th class="ac" style="width:55px;">% Total</th></tr></thead>'+
    '<tbody>'+rows+
    '<tr class="tot"><td colspan="2" style="text-align:right;font-size:10px;text-transform:uppercase;color:#bf360c;border:1px solid #ccc;">Puntaje obtenido</td>'+
    '<td style="border:1px solid #ccc;text-align:center;">'+totalPts+'</td>'+
    '<td style="border:1px solid #ccc;text-align:center;font-size:17px;color:#e65100;">'+esc(a.totalReal)+'</td>'+
    '<td style="border:1px solid #ccc;text-align:center;font-size:14px;color:#e65100;">'+Math.round(pn)+'%</td></tr>'+
    '</tbody></table>'+
    '<div style="font-size:10px;font-weight:bold;margin-bottom:5px;text-transform:uppercase;color:#455a72;">Hoja de observaciones:</div>'+
    '<div class="ob">'+esc(a.obs||'Sin observaciones registradas.')+'</div>'+
    '<div class="ft">DOW RESTRICTED — For internal use only</div>';
  html += '<scr'+'ipt>window.onload=function(){window.print();};<'+'/scr'+'ipt></body></html>';
  var w = window.open('','_blank');
  if(w){ w.document.write(html); w.document.close(); }
  else { showToast('Permitir ventanas emergentes para exportar PDF'); }
}

/* ── AUDIT TABLE ── */
var ITEMS_COMP = [
  {id:'1,1',label:'Prohibido fumar',pts:5},
  {id:'1,2',label:'Respeta la velocidad máxima y se acerca al sector de carga a paso de hombre',pts:5},
  {id:'1,3',label:'Tiene el cinturón de seguridad abrochado cuando el camión está en movimiento',pts:5},
  {id:'1,4',label:'No utiliza celular cuando el camión está en movimiento',pts:5},
  {id:'1,5',label:'Apaga el motor cuando estaciona en el sector de carga',pts:5},
  {id:'1,6',label:'Retira la llave del contacto',pts:5},
  {id:'1,7',label:'Desciende del camión utilizando los tres puntos de apoyo',pts:5},
  {id:'1,8',label:'Utiliza los elementos de protección personal obligatorios:',pts:null,sec:true},
  {id:'1.8.1',label:'Casco',pts:5,sub:true},
  {id:'1.8.2',label:'Calzado de seguridad',pts:5,sub:true},
  {id:'1.8.3',label:'Anteojos de seguridad',pts:5,sub:true},
  {id:'1.8.4',label:'Guantes',pts:5,sub:true},
  {id:'1.8.5',label:'Ropa adecuada',pts:5,sub:true},
  {id:'1,9',label:'Colocó las calzas para evitar movimientos involuntarios del camión',pts:5},
  {id:'1,10',label:'Retira las tapas que falten, en forma segura',pts:5},
  {id:'1,11',label:'Cumple con los procedimientos vigentes en el sector',pts:5},
  {id:'1,12',label:'Es respetuoso de las normas y las indicaciones del personal',pts:5}
];

var ITEMS_ENL = [
  {id:'1,1',label:'Ingresa al enlonador con las barandas altas y las fajas colocadas y tensadas',pts:5},
  {id:'1,2',label:'Apaga el motor cuando estaciona en el sector de enlonado',pts:5},
  {id:'1,3',label:'Retira la llave del contacto',pts:5},
  {id:'1,4',label:'Desciende del camión utilizando los tres puntos de apoyo',pts:5},
  {id:'1,5',label:'Utiliza los elementos de protección personal obligatorios:',pts:null,sec:true},
  {id:'1.5.1',label:'Casco',pts:5,sub:true},
  {id:'1.5.2',label:'Calzado de seguridad',pts:5,sub:true},
  {id:'1.5.3',label:'Chaleco reflectivo',pts:5,sub:true},
  {id:'1.5.4',label:'Anteojos de seguridad',pts:5,sub:true},
  {id:'1.5.5',label:'Guantes',pts:5,sub:true},
  {id:'1.5.6',label:'Ropa adecuada',pts:5,sub:true},
  {id:'1,6',label:'Colocó las calzas para evitar movimientos involuntarios del camión',pts:5},
  {id:'1,7',label:'Dispone de la lona en un cajón o sobre el chasis del tractor para evitar sacar fajas',pts:5},
  {id:'1,8',label:'Engancha al menos el 50% de los tiros/sogas de laterales de la lona a la percha de 13 metros de largo',pts:5},
  {id:'1,90',label:'Finalizado el pasaje de la lona colocó la percha de elevación en su máximo punto de elevación (tope) sobre el costado "Oeste" (lado oficina)',pts:5},
  {id:'1,10',label:'Accedió al chasis por la escalera habilitada para tal fin',pts:5},
  {id:'1,11',label:'Es respetuoso de las normas y las indicaciones del personal',pts:5}
];

function buildAuditTable(items, tbodyId, type){
  var tbody = document.getElementById(tbodyId);
  if(!tbody) return;
  tbody.innerHTML = '';
  var totalPts = items.reduce(function(s,it){return s+(it.pts||0);},0);
  items.forEach(function(item, idx){
    var tr = document.createElement('tr');
    if(item.sec){
      tr.className = 'asec';
      tr.innerHTML = '<td colspan="5">'+item.id+'&nbsp;&nbsp;'+item.label+'</td>';
    } else {
      var k = 'asel_'+type+'_'+idx;
      tr.className = item.sub ? 'asub' : '';
      tr.innerHTML =
        '<td class="an">'+item.id+'</td>'+
        '<td>'+item.label+'</td>'+
        '<td class="ac">'+item.pts+'</td>'+
        '<td class="ac"><select class="score-sel" id="'+k+'" data-atype="'+type+'" data-pts="'+item.pts+'" onchange="onScoreChange(this)">'+
        '<option value="">—</option><option value="5">5</option><option value="3">3</option><option value="1">1</option></select></td>'+
        '<td class="pct-val" id="pv_'+k+'">—</td>';
    }
    tbody.appendChild(tr);
  });
  var tot = document.createElement('tr');
  tot.className = 'atotal';
  tot.innerHTML = '<td colspan="2" class="atotal-label">Puntaje obtenido</td>'+
    '<td class="ac">'+totalPts+'</td>'+
    '<td class="ac"><span class="total-score" id="tscore-'+type+'">0</span></td>'+
    '<td class="ac"><span class="total-pct" id="tpct-'+type+'">0%</span></td>';
  tbody.appendChild(tot);
}

function onScoreChange(sel){
  sel.className = 'score-sel';
  if(sel.value==='5') sel.classList.add('s5');
  else if(sel.value==='3') sel.classList.add('s3');
  else if(sel.value==='1') sel.classList.add('s1');
  var pts = parseInt(sel.dataset.pts)||0;
  var pv = document.getElementById('pv_'+sel.id);
  if(pv) pv.textContent = sel.value ? Math.round(parseInt(sel.value)/pts*100)+'%' : '—';
  recalcAuditTotal(sel.dataset.atype);
}

function recalcAuditTotal(type){
  var sels = document.querySelectorAll('select[data-atype="'+type+'"]');
  var real = 0, pts = 0, filled = 0, total = 0;
  sels.forEach(function(s){
    pts += parseInt(s.dataset.pts)||0;
    real += parseInt(s.value)||0;
    total++;
    if(s.value) filled++;
  });
  var pctPuntos = pts > 0 ? (real/pts*100) : 0;
  var pctRelevados = total > 0 ? (filled/total*100) : 0;
  var pctStr = pctRelevados.toFixed(0)+'% relevados';
  var ts = document.getElementById('tscore-'+type); if(ts) ts.textContent = real;
  var tp = document.getElementById('tpct-'+type); if(tp) tp.textContent = Math.round(pctRelevados)+'%';
  var px = type==='comp' ? 'ac' : 'ae';
  var hdr = document.getElementById(px+'-pct-hdr'); if(hdr) hdr.textContent = filled+'/'+total+' ítems';
  return {real:real, pts:pts, pct:pctRelevados, pctStr:pctRelevados.toFixed(1)+'%'};
}

function getInspData(id){
  loadStore();
  var insp = inspections.find(function(i){ return i.id===id; });
  return insp ? insp.data : null;
}


/* ======================================================
   V3 JS ADDITIONS
   ====================================================== */

/* ── COLLECT DATA PATCH (new fields) ── */
