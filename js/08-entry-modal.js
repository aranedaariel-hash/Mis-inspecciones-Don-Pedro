
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
