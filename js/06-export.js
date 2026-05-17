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

/* ══ EXCEL AUDITORÍAS (SheetJS) ══ */
function exportExcelAudits(id){
  loadStore(); loadAuditStore();
  var insp=inspections.find(function(i){return i.id===id;});
  var d=insp?(insp.data||{}):{};
  var rel=audits.filter(function(a){return a.inspId===id;});
  if(!rel.length){showToast('No hay auditorias para exportar');return;}
  var wsData=[];
  rel.forEach(function(a,ri){
    var items=a.type==='comp'?ITEMS_COMP:ITEMS_ENL;
    var scores=a.scores||{};
    if(ri===0){
      var h=['Tipo','Conductor','Transporte','Patente','Auditor','Fecha','Hora inicio','Hora fin','% Acierto'];
      items.forEach(function(it,idx){if(!it.sec) h.push(it.id+' '+it.label);});
      wsData.push(h);
    }
    var v=[a.type==='comp'?'Comportamiento':'Enlonado',a.conductor||d.nombre||'',a.transporte||d.transporte||'',a.patente||d.patentes||'',a.auditor||'',a.fecha||'',a.horaInicio||'',a.horaFin||'',a.pctStr||Math.round(a.pct||0)+'%'];
    items.forEach(function(it,idx){if(!it.sec) v.push(scores['asel_'+a.type+'_'+idx]||'');});
    wsData.push(v);
  });
  var ws=XLSX.utils.aoa_to_sheet(wsData);
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Auditorias');
  var chofer=(d.nombre||'AUD').replace(/[^a-zA-Z0-9]/g,'_');
  var ship=(d.shipment||'').replace(/[^a-zA-Z0-9]/g,'_');
  XLSX.writeFile(wb,'Auditorias_'+chofer+'_'+ship+'.xlsx');
  showToast('Excel auditorias descargado');
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
  loadStore(); loadAuditStore(); loadPhotos();
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

  /* Excel auditorias */
  var rel=audits.filter(function(a){return a.inspId===id;});
  if(rel.length){
    var wsData2=[];
    rel.forEach(function(a,ri){
      var items=a.type==='comp'?ITEMS_COMP:ITEMS_ENL;
      var scores=a.scores||{};
      if(ri===0){var h=['Tipo','Conductor','Transporte','Patente','Auditor','Fecha','Hora inicio','Hora fin','% Acierto'];items.forEach(function(it){if(!it.sec)h.push(it.id+' '+it.label);});wsData2.push(h);}
      var v=[a.type==='comp'?'Comportamiento':'Enlonado',a.conductor||d.nombre||'',a.transporte||d.transporte||'',a.patente||d.patentes||'',a.auditor||'',a.fecha||'',a.horaInicio||'',a.horaFin||'',a.pctStr||Math.round(a.pct||0)+'%'];
      items.forEach(function(it,idx){if(!it.sec)v.push(scores['asel_'+a.type+'_'+idx]||'');});
      wsData2.push(v);
    });
    var ws2=XLSX.utils.aoa_to_sheet(wsData2);
    var wb2=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb2,ws2,'Auditorias');
    folder.file(base+'_Auditorias.xlsx',XLSX.write(wb2,{type:'array',bookType:'xlsx'}));

    /* PDF auditorias individuales (HTML idéntico a genAuditPDF) */
    rel.forEach(function(a,idx){
      var items=a.type==='comp'?ITEMS_COMP:ITEMS_ENL;
      var pdfHtml=buildAuditPDFHtml(a,items);
      var lbl=a.type==='comp'?'Comportamiento':'Enlonado';
      folder.file(base+'_Auditoria_'+lbl+'_'+(idx+1)+'.html',pdfHtml);
    });
  }

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

/* ══ BUILD AUDIT PDF HTML (formato idéntico a genAuditPDF / planillas DOW-SGL) ══ */
function buildAuditPDFHtml(a,items){
  var isComp=a.type==='comp';
  var titulo=isComp?'AUDITORIA DE COMPORTAMIENTO DE CHOFERES EXTERNOS':'AUDITORIA ENLONADO EXTERNOS DE CAMIONES';
  var hC=isComp?'#8b0000':'#1a237e';
  var instr=isComp
    ? '<p>La siguiente planilla es para ser usada como guía para realizar la auditoría de comportamiento de choferes externos.</p><p><b>5</b> Cumple el 100% &nbsp;|&nbsp; <b>3</b> No cumple el 100% (desviación menor) &nbsp;|&nbsp; <b>1</b> No cumple (desviación mayor)</p><p>Cada desviación debe quedar registrada. El auditor deberá informar en forma inmediata a Dow las desviaciones mayores. El auditor debe verificar que las anteriores se cumplieron.</p>'
    : '<p>La siguiente planilla es para ser usada como guía para realizar la auditoría de enlonado externos de camiones.</p><p><b>5</b> Cumple el 100% &nbsp;|&nbsp; <b>3</b> No cumple el 100% (desviación menor) &nbsp;|&nbsp; <b>1</b> No cumple (desviación mayor)</p><p>Cada desviación debe quedar registrada. El auditor deberá informar en forma inmediata las desviaciones mayores.</p>';
  var scores=a.scores||{};
  var totalPts=items.reduce(function(s,it){return s+(it.pts||0);},0);
  var esc=function(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
  var fd=a.fecha?a.fecha.split('-').reverse().join('/'):'';
  var pn=parseFloat(a.pct)||0;
  var rowsH='';
  items.forEach(function(item,idx){
    if(item.sec){
      rowsH+='<tr><td colspan="5" style="background:#e8eaf6;font-weight:bold;color:#1a237e;padding:6px 8px;border:1px solid #ccc;font-size:11px;">'+item.id+'&nbsp;&nbsp;'+item.label+'</td></tr>';
    } else {
      var k='asel_'+a.type+'_'+idx;var sc=scores[k]||'';
      var pct=(sc&&item.pts)?Math.round(parseInt(sc)/item.pts*100)+'%':'0%';
      var pad=item.sub?'padding-left:20px;font-style:italic;':'';
      var bg=sc==='5'?'#e8f5e9':sc==='3'?'#fff8e1':sc==='1'?'#ffebee':'#fff';
      rowsH+='<tr><td style="border:1px solid #ccc;padding:5px 7px;font-size:10px;color:#7a9bb5;'+pad+'">'+item.id+'</td>'+
        '<td style="border:1px solid #ccc;padding:5px 7px;'+pad+'">'+item.label+'</td>'+
        '<td style="border:1px solid #ccc;padding:5px 7px;text-align:center;width:55px;">'+item.pts+'</td>'+
        '<td style="border:1px solid #ccc;padding:5px 7px;text-align:center;width:75px;background:'+bg+';font-weight:bold;font-size:14px;">'+sc+'</td>'+
        '<td style="border:1px solid #ccc;padding:5px 7px;text-align:center;width:55px;font-size:11px;">'+pct+'</td></tr>';
    }
  });
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+titulo+'</title>'+
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
    '<tbody>'+rowsH+
    '<tr class="tot"><td colspan="2" style="text-align:right;font-size:10px;text-transform:uppercase;color:#bf360c;border:1px solid #ccc;">Puntaje obtenido</td>'+
    '<td style="border:1px solid #ccc;text-align:center;">'+totalPts+'</td>'+
    '<td style="border:1px solid #ccc;text-align:center;font-size:17px;color:#e65100;">'+esc(a.totalReal)+'</td>'+
    '<td style="border:1px solid #ccc;text-align:center;font-size:14px;color:#e65100;">'+Math.round(pn)+'%</td></tr>'+
    '</tbody></table>'+
    '<div style="font-size:10px;font-weight:bold;margin-bottom:5px;text-transform:uppercase;color:#455a72;">Hoja de observaciones:</div>'+
    '<div class="ob">'+esc(a.obs||'Sin observaciones registradas.')+'</div>'+
    '<div class="ft">DOW RESTRICTED — For internal use only</div>'+
    '<scr'+'ipt>window.onload=function(){window.print();};<'+'/scr'+'ipt></body></html>';
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
