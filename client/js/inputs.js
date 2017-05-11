/* jslint browser: true */


var _imageProcessor = function (image_data, image_processing_done_cb) {
    var worker = new Worker("js/worker/image_processor.js");

    worker.onmessage = function (e) {
        _imageProcessingDone(e.data);
    };

    worker.postMessage({ img_width: image_data.width, img_height: image_data.height, buffer: image_data.data.buffer }, [image_data.data.buffer]);
};

var _removeInputChannel = function (input_id) {
    var fragment_input_data = _fragment_input_data[input_id],
        tracks,
        i;

    _gl.deleteTexture(_fragment_input_data.texture);

    if (_fragment_input_data.type === 1) {
        _fragment_input_data.video_elem.pause();
        _fragment_input_data.video_elem.src = "";

        tracks = _fragment_input_data.media_stream.getVideoTracks();
        if (tracks) {
            tracks[0].stop();
        }
        _fragment_input_data.video_elem = null;
    }

    _fragment_input_data.splice(input_id, 1);

    for (i = 0; i < _fragment_input_data.length; i += 1) {
        fragment_input_data = _fragment_input_data[i];

        fragment_input_data.elem.title = _input_channel_prefix + i;

        fragment_input_data.elem.input_id = i;
    }

    _compile();
};

var _createInputThumb = function (input_id, image, thumb_title) {
    var dom_image = document.createElement("img");

    if (image !== undefined) {
        dom_image.src = image.src;
    }

    dom_image.title = thumb_title;

    dom_image.input_id = input_id;

    dom_image.classList.add("fs-input-thumb");

    dom_image.addEventListener("click", function (ev) {
        WUI_CircularMenu.create(
            {
                element: dom_image,

                rx: 32,
                ry: 32,

                item_width:  32,
                item_height: 32
            },
            [
                { icon: "fs-gear-icon", tooltip: "Settings",  on_click: function () {
                        _createChannelSettingsDialog(dom_image.input_id);
                    } },
                /*{ icon: "fs-replace-icon", tooltip: "Replace",  on_click: function () {

                    } },*/
                { icon: "fs-cross-45-icon", tooltip: "Delete",  on_click: function () {
                        _input_panel_element.removeChild(dom_image);

                        _removeInputChannel(dom_image.input_id);
                    } }
            ]);
        });

    _input_panel_element.appendChild(dom_image);

    return dom_image;
};

var _addFragmentInput = function (type, input) {
    var input_thumb,

        data,
        image,
        texture,
        
        video_element,

        input_id = _fragment_input_data.length;

    if (type === "image") {
        data = _create2DTexture(input, false, true);

        _fragment_input_data.push({
                type: 0,
                image: data.image,
                texture: data.texture,
                flip: true,
                elem: null
            });

        input_thumb = input;

        _fragment_input_data[input_id].elem = _createInputThumb(input_id, input_thumb, _input_channel_prefix + input_id);

        _compile();
    } else if (type === "camera") {
        video_element = document.createElement('video');
        video_element.width = 320;
        video_element.height = 240;
        video_element.autoplay = true;
        video_element.loop = true;
        video_element.stream = null;

        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia  || navigator.msGetUserMedia || navigator.oGetUserMedia;

        if (navigator.getUserMedia) {
            navigator.getUserMedia({ video: { mandatory: { minWidth: 640, maxWidth: 1280, minHeight: 480, maxHeight: 720, minFrameRate: 30 }, optional: [ { minFrameRate: 60 } ] },
                audio: false }, function (media_stream) {
                    video_element.src = window.URL.createObjectURL(media_stream);

                    data = _create2DTexture(video_element, false, false);

                    _setTextureWrapS(data.texture, "clamp");
                    _setTextureWrapT(data.texture, "clamp");

                    _fragment_input_data.push({
                            type: 1,
                            image: data.image,
                            texture: data.texture,
                            video_elem: video_element,
                            flip: true,
                            elem: null,
                            media_stream: media_stream
                        });

                    _fragment_input_data[input_id].elem = _createInputThumb(input_id, { src: "data/ui-icons/camera.png"}, _input_channel_prefix + input_id);

                    _compile();
                }, function (e) {
                    _notification("Unable to capture WebCam.");
                });
        } else {
            _notification("Cannot capture audio/video, getUserMedia function is not supported by your browser.");
        }
    }
};