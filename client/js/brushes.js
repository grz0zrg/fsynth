/* jslint browser: true */

/***********************************************************
    Functions.
************************************************************/

var _onBrushClick = function (e) {
    var p = e.target.parentElement,
        brushes = document.getElementsByClassName("fs-brush"),
        i;
    
    for (i = 0; i < brushes.length; i += 1) {
        brushes[i].style.border = "";
    }

    if (p.classList.contains("fs-brush")) {
        p.style.border = "solid 1px #00ff00";
    } else {
        p.parentElement.style.border = "solid 1px #00ff00";
    }
    
    _paint_brush = p.getElementsByTagName('img')[0];
};

var _applyBrushEvents = function () {
    var brushes = document.getElementsByClassName("fs-brush"),
        i;
    
    for (i = 0; i < brushes.length; i += 1) {
        brushes[i].addEventListener("click", _onBrushClick);
    }
};

var _addBrush = function (dom_image) {
    var brushes_container = document.getElementById("fs_brushes_container"),
        
        brush_container = document.createElement("div"),
        brush_name = document.createElement("div"),
        brush_img_container = document.createElement("div"),
        
        brush_img = document.createElement("img");
    
    brush_img.src = dom_image.src;
    
    brush_img_container.appendChild(brush_img);
    
    brush_container.classList.add("fs-brush");

    brush_container.appendChild(brush_name);
    brush_container.appendChild(brush_img_container);
    
    brushes_container.appendChild(brush_container);
    
    _applyBrushEvents();
};