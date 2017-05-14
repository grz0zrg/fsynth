/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/



/***********************************************************
    Functions.
************************************************************/

var _imageProcessingDone = function (mdata) {
    var tmp_canvas = document.createElement('canvas'),
        tmp_canvas_context = tmp_canvas.getContext('2d'),
        
        image_data = tmp_canvas_context.createImageData(mdata.img_width, mdata.img_height),
        
        image_element;
    
    image_data.data.set(new Uint8ClampedArray(mdata.data));

    tmp_canvas.width  = image_data.width;
    tmp_canvas.height = image_data.height;

    tmp_canvas_context.putImageData(image_data, 0, 0);

    image_element = document.createElement("img");
    image_element.src = tmp_canvas.toDataURL();
    image_element.width = image_data.width;
    image_element.height = image_data.height;

    image_element.onload = function () {
        image_element.onload = null;
        
        _addFragmentInput("image", image_element);
    };
};

var _imageDataToInput = function (data) {
    _notification("image processing in progress...");
        
    _imageProcessor(data, _imageProcessingDone);
};

var _loadImageFromFile = function (file) {
    var img = new Image(),
        
        tmp_canvas = document.createElement('canvas'),
        tmp_canvas_context = tmp_canvas.getContext('2d'),
        
        tmp_image_data;

    _notification("loading image '" + file.name + "' (" + file.size + ")");
    
    img.onload = function () {
        tmp_canvas.width  = img.naturalWidth;
        tmp_canvas.height = img.naturalHeight;

        tmp_canvas_context.translate(0, tmp_canvas.height);
        tmp_canvas_context.scale(1, -1);
        tmp_canvas_context.drawImage(img, 0, 0, tmp_canvas.width, tmp_canvas.height);

        tmp_image_data = tmp_canvas_context.getImageData(0, 0, tmp_canvas.width, tmp_canvas.height);

        _imageDataToInput(tmp_image_data);
        
        img.onload = null;
        img = null;
    };
    img.src = window.URL.createObjectURL(file);
};