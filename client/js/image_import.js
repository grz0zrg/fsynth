/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/



/***********************************************************
    Functions.
************************************************************/

var _imageProcessingDone = function (image_ready_cb, options) {
    return function (mdata) {
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
            
            if (options) {
                if (options.flip) {
                    tmp_canvas_context.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
                    tmp_canvas_context.translate(0, tmp_canvas.height);
                    tmp_canvas_context.scale(1, -1);
                    tmp_canvas_context.drawImage(image_element, 0, 0, tmp_canvas.width, tmp_canvas.height);

                    image_element.src = tmp_canvas.toDataURL();

                    image_element.onload = function () {
                        image_element.onload = null;

                        image_ready_cb(image_element);
                    };
                }
            } else {
                image_ready_cb(image_element);
            }
        };
    }
};

var _imageDataToInput = function (data, options) {
    _notification("image processing in progress...");
        
    _imageProcessor(data, _imageProcessingDone(function (image_element) {
            _addFragmentInput("image", image_element);
        }, options));
};

var _loadImageFromFile = function (file) {
    var img = new Image();

    _notification("loading image '" + file.name + "' (" + file.size + ")");

    img.onload = _fnToImageData(img, function (image_data) {
        _imageDataToInput(image_data);
        
        window.URL.revokeObjectURL(img.src);

        img.onload = null;
        img = null;
    });
    
    img.src = window.URL.createObjectURL(file);
};

var _loadImageFromURL = function (url, done_cb) {
    var img = new Image();
    
    img.onload = _fnToImageData(img, function (image_data) {
        _imageProcessor(image_data, _imageProcessingDone(done_cb));
        
        img.onload = null;
        img = null;
    });
        
    img.src = url;
};