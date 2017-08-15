/* jslint browser: true */

/***********************************************************
    Functions.
************************************************************/

var _onBrushClick = function (e) {
    var p = e.target.parentElement,
        brushes = e.hasOwnProperty("fs_detached_event") ? e.target.ownerDocument.getElementsByClassName("fs-brush") : document.getElementsByClassName("fs-brush"),
        detached_dialog = WUI_Dialog.getDetachedDialog(_paint_dialog),
        i;
    
    for (i = 0; i < brushes.length; i += 1) {
        brushes[i].style.border = "";
    }

    if (p.classList.contains("fs-brush")) {
        p.style.border = "solid 1px #00ff00";
    } else if (p.parentElement.classList.contains("fs-brushes")) {
        return;
    } else {
        p.parentElement.style.border = "solid 1px #00ff00";
    }
    
    _paint_brush = p.getElementsByTagName('img')[0];
    
    if (detached_dialog && !e.hasOwnProperty("fs_detached_event")) {
        e.fs_detached_event = true;
        
        _onBrushClick(e);
    } else {
        _drawBrushHelper();
    }
};

var _applyBrushEvents = function (doc) {
    var brushes = doc.getElementsByClassName("fs-brush"),
        i;
    
    for (i = 0; i < brushes.length; i += 1) {
        brushes[i].addEventListener("click", _onBrushClick);
    }
};

var _addBrush = function (dom_image, id, detached) {
    var detached_dialog = WUI_Dialog.getDetachedDialog(_paint_dialog),
        
        doc = detached ? detached_dialog.document : document,
        
        brushes_container = doc.getElementById("fs_brushes_container"),
        
        brush_container = doc.createElement("div"),
        brush_name = doc.createElement("div"),
        brush_img_container = doc.createElement("div"),
        
        brush_img = doc.createElement("img");

    if (id) {
        brush_img.dataset.inputId = id;
    }
    
    brush_img.src = dom_image.src;
    
    brush_img_container.appendChild(brush_img);
    
    brush_container.classList.add("fs-brush");

    brush_container.appendChild(brush_name);
    brush_container.appendChild(brush_img_container);
    
    brushes_container.appendChild(brush_container);
    
    _applyBrushEvents(doc);
    
    if (detached_dialog && !detached) {
        _addBrush(dom_image, id, true);
    }
};

var _delBrush = function (id, detached) {
    if (id === undefined) {
        return;
    }
    
    var detached_dialog = WUI_Dialog.getDetachedDialog(_paint_dialog),
        
        doc = detached ? detached_dialog.document : document,
        
        brushes = doc.getElementsByClassName("fs-brush"),
        img,
        i;
    
    for (i = 0; i < brushes.length; i += 1) {
        img = brushes[i].getElementsByTagName('img')[0];

        if (parseInt(img.dataset.inputId, 10) === id) {
            brushes[i].parentElement.removeChild(brushes[i]);
            break;
        }
    }
    
    if (detached_dialog && !detached) {
        _delBrush(id, true);
    }
};

var _addPreloaded = function () {
    var i= 0;
    
    for (i = 1; i < 20; i += 1) {
        _loadImageFromURL("data/brushes/" + i + ".png", _addBrush);
    }
};


/***********************************************************
    Init.
************************************************************/

_applyBrushEvents(document);

// preload bundled brushes
_addPreloaded();