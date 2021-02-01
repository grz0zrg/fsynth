/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _ffs_address = _domain + ":3122",
    _dir_state = new Map(),
    _selected_files = new Map(),
    _file_check_state = null;

/***********************************************************
    Functions.
************************************************************/

var _minimizeFilesTree = function (key) {
    return function (ev) {
        if (ev.target.tagName === "INPUT") {
            return;
        }

        var target_elem = ev.currentTarget.nextElementSibling;

        if (target_elem.style.display) {
            target_elem.style.display = "";
            ev.currentTarget.firstElementChild.classList.remove('fs-rotate-text-right');

            _dir_state.set(key, true);
        } else {
            target_elem.style.display = "none";
            ev.currentTarget.firstElementChild.classList.add('fs-rotate-text-right');

            _dir_state.set(key, false);
        }
    };
};

var _onFmDragStart = function (e) {
    e.preventDefault();
    e.stopPropagation();
};

var _onFmDragOver = function (e) {
    e.preventDefault();
    e.stopPropagation();

    e.currentTarget.classList.add('fs-file-manager-dragover');

    e.dataTransfer.dropEffect = "copy";
};

var _onFmDragEnd = function (e) {
    e.currentTarget.classList.remove('fs-file-manager-dragover');

    e.preventDefault();
    e.stopPropagation();
};

var _onFmDragDrop = function (src_element, target, target_element_id, target_name) {
    return function (e) {
        e.preventDefault();
        e.stopPropagation();

        var files = e.dataTransfer.files;

        var form_data = new FormData();
        for (var i = 0; i < files.length; i++) {
            form_data.append('file', files[i]);
        }

        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'http://' + _ffs_address + '/uploads?target=' + encodeURI(target), true);
        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                var complete = (e.loaded / e.total * 100 | 0);

                _notification('Files upload status : ' + complete + '%', 2000);
            }
        };
        xhr.onerror = function () {
            _notification('File manager server error (is it up ?)', 4000);

            console.log(xhr.responseText);

            src_element.classList.remove('fs-file-manager-dragover');
        };
        xhr.onload = function () {
            if (xhr.status === 200) {
                _notification('Files upload status : done.', 2000);

                _refreshFileManager(target_element_id, target_name)();
            } else if (xhr.status === 500) {
                _notification('Files upload error (unsupported file format ?)', 4000)
            } else {
                _notification('Files upload error (unknown)', 4000)
            }

            src_element.classList.remove('fs-file-manager-dragover');
        };
        
        xhr.send(form_data);
    };
};

var _fileCheckboxOver = function (id) {
    return function (e) {
        if (_mouse_btn === _LEFT_MOUSE_BTN) {
            var checkbox = document.getElementById(id);

            if (_file_check_state === null) {
                _file_check_state = 1 - checkbox.checked;
            }

            checkbox.checked = _file_check_state;
        } else {
            _file_check_state = null;
        }

        e.stopPropagation();
        e.preventDefault();
    };
}

var _renderFilesTree = function (dom_node, target_element_id, target) {
    return function (leaf_obj, dirname) {
        var dir_container = document.createElement('div');
        var header_container = document.createElement('div');
        var min_btn = document.createElement('div');
        var dir_name = document.createElement('div');
        var dir_content = document.createElement('div');
        var files_content = document.createElement('div');
        var dir_checkbox = document.createElement('input');

        dir_checkbox.type = 'checkbox';
        dir_checkbox.className = 'fs-file-manager-file-checkbox';
        dir_checkbox.id = "fs_" + target + '_' + window.btoa(leaf_obj.basepath);

        dir_checkbox.dataset.fullpath = window.btoa(leaf_obj.basepath);
        var basepath = dir_checkbox.dataset.fullpath;
        basepath = basepath.split('/');
        basepath.pop();
        basepath = basepath.join('/');
        dir_checkbox.dataset.basepath = basepath;
        dir_checkbox.dataset.filename = window.btoa(dirname);

        dir_container.classList.add('fs-file-manager-node');
        header_container.classList.add('fs-file-manager-header');
        min_btn.classList.add('fs-file-manager-min-btn');
        min_btn.classList.add('fs-rotate-text-right');
        min_btn.innerHTML = "&#8964;";
        dir_name.classList.add('fs-file-manager-dir-name');
        dir_content.classList.add('fs-file-manager-dir-content');
        files_content.classList.add('fs-file-manager-files-content');

        // drag & drop
        ['drag','dragstart'].forEach(function (event_name) {
            files_content.addEventListener(event_name, _onFmDragStart)
            header_container.addEventListener(event_name, _onFmDragStart)
        });

        ['dragover','dragenter'].forEach(function (event_name) {
            files_content.addEventListener(event_name, _onFmDragOver)
            header_container.addEventListener(event_name, _onFmDragOver)
        });

        ['dragleave','dragend'].forEach(function (event_name) {
            files_content.addEventListener(event_name, _onFmDragEnd)
            header_container.addEventListener(event_name, _onFmDragEnd)
        });

        header_container.addEventListener('drop', _onFmDragDrop(header_container, leaf_obj.basepath, target_element_id, target));
        files_content.addEventListener('drop', _onFmDragDrop(files_content, leaf_obj.basepath, target_element_id, target));
        //

        dir_content.style.display = "none";

        header_container.addEventListener("click", _minimizeFilesTree(leaf_obj.basepath));

        dir_name.innerText = dirname;

        var leaf = leaf_obj.leaf;

        leaf.forEach(_renderFilesTree(dir_content, target_element_id, target))

        if (leaf_obj.items) {
            var files = leaf_obj.items;

            dir_name.title += "Files : " + files.length;

            if (files.length > 1) {
                dir_name.title += ' [' + files[0].index + ',' + files[files.length - 1].index + ']';
            }

            var i = 0;
            for (i = 0; i < files.length; i += 1) {
                var file_container = document.createElement('div');
                var file_name = document.createElement('label');
                var checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'fs-file-manager-file-checkbox';
                checkbox.id = "fs_" + target + '_' + files[i].index;

                var f = _fileCheckboxOver(checkbox.id);

                checkbox.addEventListener('mouseleave', f);
                file_name.addEventListener('mouseleave', f);
                checkbox.addEventListener('mouseenter', f);
                file_name.addEventListener('mouseenter', f);

                file_container.classList.add('fs-file-manager-file-container');
                file_name.classList.add('fs-file-manager-file-name');

                file_name.setAttribute('for', checkbox.id);
                checkbox.dataset.fullpath = window.btoa(leaf_obj.basepath + "/" + files[i].filename);
                checkbox.dataset.filename = window.btoa(files[i].filename);
                checkbox.dataset.basepath = window.btoa(leaf_obj.basepath);

                file_name.innerText = files[i].index + " " + files[i].filename;
                file_name.dataset.clipboardText = files[i].float_index;
                file_name.title = files[i].float_index;

                file_container.appendChild(checkbox);
                file_container.appendChild(file_name);

                files_content.appendChild(file_container);
            }
        }

        dir_content.appendChild(files_content);

        header_container.appendChild(min_btn);
        header_container.appendChild(dir_checkbox);
        header_container.appendChild(dir_name);
        dir_container.appendChild(header_container);

        dir_container.appendChild(dir_content);

        dom_node.appendChild(dir_container);

        if (_dir_state.has(leaf_obj.basepath)) {
            var state = _dir_state.get(leaf_obj.basepath);
            if (state) {
                dir_content.style.display = "";
                min_btn.classList.remove('fs-rotate-text-right');
            } else {
                dir_content.style.display = "none";
                min_btn.classList.add('fs-rotate-text-right');    
            }
        }
    };
};

var _closeFileManager = function (target_element_id) {
    return function () {
        var element = document.getElementById(target_element_id).firstElementChild.nextElementSibling;

        element.innerHTML = '';
    };
};

var _refreshFileManager = function (target_element_id, target) {
    return function () {
        var element = document.getElementById(target_element_id).firstElementChild.nextElementSibling;

        var req = new XMLHttpRequest();
        req.responseType = 'json';
        req.open('GET', 'http://' + _ffs_address + '/' + target, true);
        req.onerror = function () {
            _notification('File manager server error (is it up ?)');

            var error_elem = document.createElement('div');
            var reload_btn = document.createElement('div');
            reload_btn.className = 'fs-btn fs-btn-default';
            reload_btn.innerText = 'refresh';

            reload_btn.addEventListener('click', _refreshFileManager(target_element_id, target));

            error_elem.classList.add('fs-file-manager-error');

            error_elem.innerHTML = 'File manager server connection error...<br>Should be up at <span style="color: yellow; display: contents">' + 'http://' + _ffs_address + '</span><br><br>';

            error_elem.appendChild(reload_btn);
            element.appendChild(error_elem);
        };
        req.onload = function () {
            element.innerHTML = '';

            var file_index = 0;
            var leaf = new Map();
            var tree = { leaf: new Map(), basepath: target };
            leaf.set(target, tree);
            var json_response = req.response;
            var files = json_response.files;
            var empty_dirs = json_response.empty_dirs;

            // files
            var i = 0;
            for (i = 0; i < files.length; i += 1) {
                var dirs = files[i].split('/');

                var leaf_map = tree.leaf;
                var leaf_obj = tree;
                var j = 0;
                for (j = 0; j < dirs.length - 1; j += 1) {
                    var basepath = dirs.slice(0, j+1);
                    basepath = target + '/' + basepath.join('/');

                    var dir_name = dirs[j];

                    if (!leaf_map.has(dir_name)) {
                        leaf_map.set(dir_name, { leaf: new Map(), basepath: basepath });
                    }

                    leaf_obj = leaf_map.get(dir_name);
                    leaf_map = leaf_obj.leaf;
                }

                if (!leaf_obj.items) {
                    leaf_obj.items = [];
                }

                var filename = dirs[dirs.length - 1];
                leaf_obj.items.push({ filename: filename, index: file_index, float_index: _truncateDecimals(file_index / files.length, 7) });

                file_index += 1;
            }

            // add empty dirs (done in two pass to compute indexes easily)
            for (i = 0; i < empty_dirs.length; i += 1) {
                var dirs = empty_dirs[i].split('/');

                var leaf_map = tree.leaf;
                var leaf_obj = tree;
                var j = 0;
                for (j = 0; j < dirs.length; j += 1) {
                    var basepath = dirs.slice(0, j+1);
                    basepath = target + '/' + basepath.join('/');

                    var dir_name = dirs[j];
                    if (!leaf_map.has(dir_name)) {
                        leaf_map.set(dir_name, { leaf: new Map(), basepath: basepath });
                    }

                    leaf_obj = leaf_map.get(dir_name);
                    leaf_map = leaf_obj.leaf;
                }
            }

            var file_manager_container = document.createElement('div');
            var file_manager_node = document.createElement('div');

            file_manager_container.classList.add('fs-file-manager');
            file_manager_node.classList.add('fs-file-manager-node');
            
            leaf.forEach(_renderFilesTree(file_manager_node, target_element_id, target));

            file_manager_container.appendChild(file_manager_node);

            element.appendChild(file_manager_container);

            element.addEventListener('contextmenu', function (ev) {
                ev.preventDefault();

                if (ev.target.classList.contains('fs-file-manager-header') ||
                    ev.target.classList.contains('fs-file-manager-min-btn') ||
                    ev.target.classList.contains('fs-file-manager-dir-name')) {
                        WUI_CircularMenu.create(
                            {
                                x: _mx,
                                y: _my,
                
                                rx: 24,
                                ry: 24,

                                angle: -90,
                
                                item_width:  32,
                                item_height: 32
                            },
                            [
                                { icon: "fs-plus-icon", tooltip: "New directory",  on_click: function () {
                                    var dir_target = ev.target;
                                    if (ev.target.classList.contains('fs-file-manager-header')) {
                                        dir_target = ev.target.firstElementChild.nextElementSibling;
                                    } else if (ev.target.classList.contains('fs-file-manager-min-btn')) {
                                        dir_target = ev.target.nextElementSibling;
                                    } else if (ev.target.classList.contains('fs-file-manager-dir-name')) {
                                        dir_target = ev.target.previousElementSibling;
                                    }

                                    var target_path = window.atob(dir_target.dataset.fullpath);
                                    target_path = target_path.split('/');
                                    target_path.shift();
                                    target_path = target_path.join('/');

                                    var dir_name = window.prompt('Directory name', '');
                                    if (!dir_name || !dir_name.length) {
                                        return;
                                    }

                                    var directories = [target_path + '/' + dir_name];

                                    var xhr = new XMLHttpRequest();
                                    xhr.open('PUT', 'http://' + _ffs_address + '/' + target + '?action=create', true);
                                    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                                    xhr.onerror = function () {
                                        _notification('File manager server error (is it up ?)', 4000);
                            
                                        console.log(xhr.responseText);
                                    };
                                    xhr.onload = function () {
                                        if (xhr.status === 200) {
                                            _refreshFileManager(target_element_id, target)();
                                        } else {
                                            _notification('Files move / rename error (unknown)', 4000)
                                        }
                                    };
    
                                    xhr.send(JSON.stringify(directories));
                                } },
                                { icon: "fs-replace-icon", tooltip: "Move selected files here",  on_click: function () {
                                        var dir_target = ev.target;
                                        if (ev.target.classList.contains('fs-file-manager-header')) {
                                            dir_target = ev.target.firstElementChild.nextElementSibling;
                                        } else if (ev.target.classList.contains('fs-file-manager-min-btn')) {
                                            dir_target = ev.target.nextElementSibling;
                                        } else if (ev.target.classList.contains('fs-file-manager-dir-name')) {
                                            dir_target = ev.target.previousElementSibling;
                                        }

                                        var target_path = window.atob(dir_target.dataset.fullpath);
                                        target_path = target_path.split('/');
                                        target_path.shift();
                                        target_path = target_path.join('/');

                                        var selected_files = document.querySelectorAll("input[id^='fs_" + target + "_']:checked");

                                        if (!selected_files.length) {
                                            return;
                                        }

                                        var files = [];
        
                                        var i = 0;
                                        for (i = 0; i < selected_files.length; i += 1) {
                                            var fullpath = window.atob(selected_files[i].dataset.fullpath);
                                            fullpath = fullpath.split('/');
                                            fullpath.shift();
                                            fullpath = fullpath.join('/');
        
                                            files.push({ src: fullpath, dst: target_path });
                                        }
        
                                        var xhr = new XMLHttpRequest();
                                        xhr.open('PUT', 'http://' + _ffs_address + '/' + target + '?action=move', true);
                                        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                                        xhr.onerror = function () {
                                            _notification('File manager server error (is it up ?)', 4000);
                                
                                            console.log(xhr.responseText);
                                        };
                                        xhr.onload = function () {
                                            if (xhr.status === 200) {
                                                _refreshFileManager(target_element_id, target)();
                                            } else {
                                                _notification('Files move / rename error (unknown)', 4000)
                                            }
                                        };
        
                                        xhr.send(JSON.stringify(files));
                                    } }
                            ]);
                    return true;
                }

                WUI_CircularMenu.create(
                    {
                        x: _mx,
                        y: _my,
        
                        rx: 32,
                        ry: 32,

                        item_width:  32,
                        item_height: 32
                    },
                    [
                        { icon: "fs-audio-file-icon", tooltip: "Download selected files", on_click: function () {
                            var selected_files = document.querySelectorAll("input[id^='fs_" + target + "_']:checked");

                            if (!selected_files.length) {
                                return;
                            }

                            var files_to_download = [];

                            var i = 0;
                            for (i = 0; i < selected_files.length; i += 1) {
                                var fullpath = window.atob(selected_files[i].dataset.fullpath);
                                fullpath = fullpath.split('/');
                                fullpath.shift();
                                fullpath = fullpath.join('/');

                                files_to_download.push(fullpath);
                            }

                            var xhr = new XMLHttpRequest();
                            xhr.open("POST", 'http://' + _ffs_address + '/download/' + target, true);
                            xhr.responseType = 'blob';
                            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                            xhr.onerror = function () {
                                _notification('File manager server error (is it up ?)', 4000);
                    
                                console.log(xhr.responseText);
                            };
                            xhr.onreadystatechange = function() {
                                if (this.readyState == 4 && this.status == 200) {
                                    var blob = new Blob([this.response], {type: 'application/zip'});

                                    var url = URL.createObjectURL(xhr.response);
                                    var a = document.createElement("a");

                                    document.body.appendChild(a);
                                    a.style = "display: none";
                                    a.href = url;
                                    a.download = "";

                                    a.click();

                                    window.URL.revokeObjectURL(url);

                                    document.body.removeChild(a);
                                } else if (this.status == 200) {
                                    _notification('Files download error (unknown)', 4000)
                                }
                            };
                            xhr.send(JSON.stringify(files_to_download));
                        } },
                        { icon: "fs-code-icon", tooltip: "Rename selected file", on_click: function () {
                            var selected_files = document.querySelectorAll("input[id^='fs_" + target + "_']:checked");

                            if (!selected_files.length || selected_files.length > 1) {
                                _notification("Must select a single file to rename", 4000);
                                return;
                            }

                            var files_to_rename = [];

                            var file = selected_files[0];
                            var fullpath = window.atob(file.dataset.fullpath);
                            fullpath = fullpath.split('/');
                            fullpath.shift();
                            fullpath = fullpath.join('/');

                            var basepath = window.atob(file.dataset.basepath);
                            basepath = basepath.split('/');
                            basepath.shift();
                            basepath = basepath.join('/');
                            var filename = window.atob(file.dataset.filename);
                            var new_name = window.prompt('Rename file', filename)
                            if (!new_name || !new_name.length) {
                                return;
                            }

                            var file_obj = { src: fullpath, dst: basepath + new_name };

                            files_to_rename.push(file_obj);

                            var xhr = new XMLHttpRequest();
                            xhr.open('PUT', 'http://' + _ffs_address + '/' + target + '?action=rename', true);
                            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                            xhr.onerror = function () {
                                _notification('File manager server error (is it up ?)', 4000);
                    
                                console.log(xhr.responseText);
                            };
                            xhr.onload = function () {
                                if (xhr.status === 200) {
                                    _refreshFileManager(target_element_id, target)();
                                } else {
                                    _notification('Files move / rename error (unknown)', 4000)
                                }
                            };

                            xhr.send(JSON.stringify(files_to_rename));
                        } },
                        { icon: "fp-trash-icon", tooltip: "Delete selected files",  on_click: function () {
                                var selected_files = document.querySelectorAll("input[id^='fs_" + target + "_']:checked");

                                if (!selected_files.length) {
                                    return;
                                }

                                var files_to_delete = [];

                                var i = 0;
                                for (i = 0; i < selected_files.length; i += 1) {
                                    var fullpath = window.atob(selected_files[i].dataset.fullpath);
                                    fullpath = fullpath.split('/');
                                    fullpath.shift();
                                    fullpath = fullpath.join('/');

                                    files_to_delete.push(fullpath);
                                }

                                var xhr = new XMLHttpRequest();
                                xhr.open('DELETE', 'http://' + _ffs_address + '/' + target, true);
                                xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                                xhr.onerror = function () {
                                    _notification('File manager server error (is it up ?)', 4000);
                        
                                    console.log(xhr.responseText);
                                };
                                xhr.onload = function () {
                                    if (xhr.status === 200) {
                                        _refreshFileManager(target_element_id, target)();
                                    } else {
                                        _notification('Files deletion error (unknown)', 4000)
                                    }
                                };

                                xhr.send(JSON.stringify(files_to_delete));
                            } }
                    ]);
        
                return false;
            }, false);

            var clip = new Clipboard('.fs-file-manager-file-name');
        };
        req.send(null);
    };
};

/***********************************************************
    Init.
************************************************************/

