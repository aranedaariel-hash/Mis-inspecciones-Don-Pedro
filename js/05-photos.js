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
