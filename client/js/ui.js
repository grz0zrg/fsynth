/* jslint browser: true */

/***********************************************************
    Fields.
************************************************************/

var _icon_class = {
            plus: "fs-plus-icon"
        },
    
    _selected_slice,
    
    _brush_helper_timeout,
    
    _midi_out_editor,
    
    _midi_out_dialog_id = "fs_midi_out_dialog",
    _midi_out_dialog,
    
    _paint_dialog_id = "fs_paint_dialog",
    _paint_dialog,
    
    _settings_dialog_id = "fs_settings_dialog",
    _settings_dialog,
    
    _midi_settings_dialog_id = "fs_midi_settings_dialog",
    _midi_settings_dialog,
    
    _help_dialog_id = "fs_help_dialog",
    _help_dialog,
    
    _analysis_dialog_id = "fs_analysis_dialog",
    _analysis_dialog,
    
    _record_dialog_id = "fs_record_dialog",
    _record_dialog,
    
    _outline_dialog_id = "fs_outline_dialog",
    _outline_dialog,

    _slices_dialog_id = "fs_slices_dialog",
    _slices_dialog,

    _samples_dialog_id = "fs_samples_dialog",
    _samples_dialog,

    _waves_dialog_id = "fs_waves_dialog",
    _waves_dialog,

    _impulses_dialog_id = "fs_impulses_dialog",
    _impulses_dialog,

    _faust_gens_dialog_id = "fs_faust_gens_dialog",
    _faust_gens_dialog,

    _faust_effs_dialog_id = "fs_faust_effs_dialog",
    _faust_effs_dialog,

    _slices_dialog_timeout = null,
    
    _import_dialog_id = "fs_import_dialog",
    _import_dialog,
    
    _quickstart_dialog_id = "fs_quickstart",
    _quickstart_dialog,
    
    _fas_dialog_id = "fs_fas_dialog",
    _fas_dialog,

    _fas_synth_params_dialog_id = "fs_fas_synth_params_dialog",
    _fas_synth_params_dialog,

    _fas_chn_notify_timeout,
    
    _wui_main_toolbar,

    _collapsible_id = 0,

    _fas_settings_collapses = {
        instruments: false,
        channels: true,
        actions: true,
        file_managers: true
    },
    
    _send_slices_settings_timeout,
    _add_slice_timeout,
    _remove_slice_timeout,

    _synthesis_types = ["Additive", "Spectral", "Granular", "PM/FM", "Subtractive", "Physical Model", "Wavetable", "Bandpass (M)", "Formant (M)", "Phase Distorsion (M)", "String resonance (M)", "Modal (M)", "Modulation", "In", "Faust"],
    _synthesis_enabled = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    _synthesis_params = [0, 3, 3, 2, 1, 2, 1, 1, 0, 0, 0, 0, 5, 0, 5],

    _efx = [{
            name: "Convolution",
            color: "#00ffff",
            params: [{
                name: "Impulse index (l)",
                type: 0,
                min: 0,
                step: 1,
                value: 0,
                decimals: 0
            }, {
                name: "Partition length (l)",
                type: [256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536],
                value: 4
            },
            {
                name: "Impulse index (r)",
                type: 0,
                min: 0,
                step: 1,
                value: 0,
                decimals: 0
            }, {
                name: "Partition length (r)",
                type: [256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536],
                value: 4
            },
            {
                name: "Dry (l)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 1,
                decimals: 4
            },
            {
                name: "Wet (l)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.02,
                decimals: 4
            },
            {
                name: "Dry (r)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 1,
                decimals: 4
            },
            {
                name: "Wet (r)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.02,
                decimals: 4
            }]
        },
        {
            name: "Zitareverb",
            color: "#00bfff",
            params: [{
                name: "In delay",
                type: 0,
                min: 0,
                step: 1,
                value: 60,
                decimals: 0
            }, {
                name: "Crossover freq.",
                type: 0,
                min: 0,
                step: 1,
                value: 200,
                decimals: 0
            }, {
                name: "RT60 low time",
                type: 0,
                min: 0,
                step: 0.1,
                value: 3.0,
                decimals: 4
            }, {
                name: "RT60 mid time",
                type: 0,
                min: 0,
                step: 0.1,
                value: 2.0,
                decimals: 4
            }, {
                name: "HF damping",
                type: 0,
                min: 0,
                step: 1,
                value: 6000.0,
                decimals: 4
            }, {
                name: "EQ1 frequency",
                type: 0,
                min: 0,
                step: 0.1,
                value: 315.0,
                decimals: 4
            }, {
                name: "EQ1 level",
                type: 0,
                min: 0,
                step: 0.1,
                value: 0,
                decimals: 4
            }, {
                name: "EQ2 frequency",
                type: 0,
                min: 0,
                step: 1,
                value: 1500.0,
                decimals: 4
            }, {
                name: "EQ2 level",
                type: 0,
                min: 0,
                step: 0.1,
                value: 0,
                decimals: 4
            }, {
                name: "Mix",
                type: 0,
                min: 0,
                step: 0.0001,
                value: 1,
                decimals: 4
            }, {
                name: "level",
                type: 0,
                step: 1,
                value: 0,
                decimals: 0
            }]
        },{
            name: "8 FDN Stereo Reverb",
            color: "#483d8b",
            params: [{
                name: "feedback",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.1,
                decimals: 4
            }, {
                name: "lpfreq",
                type: 0,
                min: 1000,
                step: 1,
                value: 10000,
                decimals: 0
            },
            {
                name: "Dry",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 1,
                decimals: 4
            },
            {
                name: "Wet",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.02,
                decimals: 4
            }]
        },{
            name: "Autowah",
            color: "#000080",
            params: [{
                name: "level (l)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.1,
                decimals: 4
            }, {
                name: "wah (l)",
                type: 0,
                min: 0,
                step: 0.0001,
                value: 0,
                decimals: 4
            }, {
                name: "mix (l)",
                type: 0,
                min: 0,
                max: 100,
                step: 1,
                value: 50,
                decimals: 0
            },{
                name: "level (r)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.1,
                decimals: 4
            }, {
                name: "wah (r)",
                type: 0,
                min: 0,
                step: 0.0001,
                value: 0,
                decimals: 4
            }, {
                name: "mix (r)",
                type: 0,
                min: 0,
                max: 100,
                step: 1,
                value: 50,
                decimals: 0
            }]
        },{
            name: "Phaser",
            color: "#9acd32",
            params: [{
                name: "MaxNotch1Freq",
                type: 0,
                min: 20,
                max: 10000,
                step: 1,
                value: 800,
                decimals: 0
            }, {
                name: "MinNotch1Freq",
                type: 0,
                min: 20,
                max: 5000,
                step: 1,
                value: 100,
                decimals: 0
            }, {
                name: "NotchWidth",
                type: 0,
                min: 10,
                max: 5000,
                step: 1,
                value: 100,
                decimals: 0
            }, {
                name: "NotchFreq",
                type: 0,
                min: 1.1,
                max: 4,
                step: 0.0001,
                value: 1.5,
                decimals: 4
            }, {
                name: "VibratoMode",
                type: 0,
                min: 0,
                max: 1,
                step: 1,
                value: 1,
                decimals: 0
            }, {
                name: "Depth",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 1,
                decimals: 4
            }, {
                name: "Feedback gain",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0,
                decimals: 4
            }, {
                name: "Invert",
                type: 0,
                min: 0,
                max: 1,
                step: 1,
                value: 1,
                decimals: 0
            }, {
                name: "level",
                type: 0,
                min: -60,
                max: 10,
                step: 1,
                value: 0,
                decimals: 0
            }, {
                name: "lfo bpm",
                type: 0,
                min: 24,
                max: 360,
                step: 1,
                value: 30,
                decimals: 0
            }]
        },{
            name: "Comb filter",
            color: "#daa520",
            params: [{
                name: "looptime (l)",
                type: 0,
                min: 0,
                max: 5,
                step: 0.0001,
                value: 0.1,
                decimals: 4
            }, {
                name: "revtime (l)",
                type: 0,
                min: 0,
                max: 10,
                step: 0.0001,
                value: 3.5,
                decimals: 4
            }, {
                name: "looptime (r)",
                type: 0,
                min: 0,
                max: 5,
                step: 0.0001,
                value: 0.1,
                decimals: 4
            }, {
                name: "revtime (r)",
                type: 0,
                min: 0,
                max: 10,
                step: 0.0001,
                value: 3.5,
                decimals: 4
            },
            {
                name: "Dry (l)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            },
            {
                name: "Wet (l)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            },
            {
                name: "Dry (r)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            },
            {
                name: "Wet (r)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            }]
        },{
            name: "Delay",
            color: "#8b008b",
            params: [{
                name: "delay time (l)",
                type: 0,
                min: 1,
                max: 120,
                step: 1,
                value: 1.0,
                decimals: 0
            }, {
                name: "feedback (l)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.000001,
                value: 0,
                decimals: 6
            },
            {
                name: "delay time (r)",
                type: 0,
                min: 1,
                max: 120,
                step: 1,
                value: 1.0,
                decimals: 0
            }, {
                name: "feedback (r)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.000001,
                value: 0,
                decimals: 6
            },
            {
                name: "Dry (l)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            },
            {
                name: "Wet (l)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            },
            {
                name: "Dry (r)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            },
            {
                name: "Wet (r)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            }]
        },{
            name: "Smooth Delay",
            color: "#ff4500",
            params: [{
                name: "maxdel (l)",
                type: 0,
                min: 0.0001,
                max: 20,
                step: 0.0001,
                value: 1,
                decimals: 4
            }, {
                name: "interp. time (l)",
                type: [64, 128, 256, 512, 1024, 2048, 4096],
                value: 3
            }, {
                name: "feedback (l)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.1,
                decimals: 4
            }, {
                name: "delay time (l)",
                type: 0,
                min: 0.0001,
                max: 20,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            },{
                name: "maxdel (r)",
                type: 0,
                min: 0.0001,
                max: 20,
                step: 0.0001,
                value: 1,
                decimals: 4
            }, {
                name: "interp. time (r)",
                type: [64, 128, 256, 512, 1024, 2048, 4096],
                value: 3
            }, {
                name: "feedback (r)",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.1,
                decimals: 4
            }, {
                name: "delay time (r)",
                type: 0,
                min: 0.0001,
                max: 20,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            }]
        },{
            name: "Decimator",
            color: "#ffff00",
            params: [{
                name: "bitdepth",
                type: 0,
                min: 1,
                max: 16,
                step: 1,
                value: 8,
                decimals: 0
            }, {
                name: "srate",
                type: 0,
                min: 1,
                max: 96000,
                step: 1,
                value: 10000,
                decimals: 0
            }, {
                name: "Dry",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            },
            {
                name: "Wet",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            }]
        },{
            name: "Distorsion",
            color: "#7cfc00",
            params: [{
                name: "pregain",
                type: 0,
                min: 0,
                max: 4,
                step: 0.0001,
                value: 2,
                decimals: 4
            },{
                name: "postgain",
                type: 0,
                min: 0,
                max: 4,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            },{
                name: "shape1",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0,
                decimals: 4
            },{
                name: "shape2",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0,
                decimals: 4
            }, {
                name: "Dry",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            },
            {
                name: "Wet",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            }]
        },{
            name: "Saturator",
            color: "#8a2be2",
            params: [{
                name: "drive",
                type: 0,
                min: 0,
                max: 20,
                step: 1,
                value: 1,
                decimals: 0
            }, {
                name: "dc offset",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0,
                decimals: 4
            }, {
                name: "Dry",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            },
            {
                name: "Wet",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            }]
        },{
            name: "Compressor",
            color: "#00ff7f",
            params: [{
                name: "ratio",
                type: 0,
                min: 0,
                max: 20,
                step: 0.1,
                value: 1,
                decimals: 1
            }, {
                name: "tresh",
                type: 0,
                min: -40,
                max: 40,
                step: 1,
                value: 0,
                decimals: 0
            }, {
                name: "attack",
                type: 0,
                min: 0,
                max: 4,
                step: 0.01,
                value: 0.1,
                decimals: 2
            }, {
                name: "release",
                type: 0,
                min: 0,
                max: 4,
                step: 0.01,
                value: 0.1,
                decimals: 2
            }]
        },{
            name: "Peak Limiter",
            color: "#dc143c",
            params: [{
                name: "attack",
                type: 0,
                min: 0,
                max: 4,
                step: 0.01,
                value: 0.01,
                decimals: 2
            }, {
                name: "release",
                type: 0,
                min: 0,
                max: 4,
                step: 0.01,
                value: 0.01,
                decimals: 2
            }, {
                name: "tresh",
                type: 0,
                min: -20,
                max: 40,
                step: 1,
                value: 0,
                decimals: 0
            }, {
                name: "Dry",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            },
            {
                name: "Wet",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            }]
        },{
            name: "Clip",
            color: "#696969",
            params: [{
                name: "tresh",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 1,
                decimals: 4
            }, {
                name: "Dry",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            },
            {
                name: "Wet",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            }]
        },{
            name: "Lowpass Butterworth",
            color: "#856b2f",
            params: [{
                name: "cutoff",
                type: 0,
                min: 1,
                max: 96000,
                step: 1,
                value: 1000,
                decimals: 0
            }]
        },{
            name: "Highpass Butterworth",
            color: "#0000ff",
            params: [{
                name: "cutoff",
                type: 0,
                min: 1,
                max: 96000,
                step: 1,
                value: 1000,
                decimals: 0
            }]
        },{
            name: "Bandpass Butterworth",
            color: "#ff00ff",
            params: [{
                name: "cutoff",
                type: 0,
                min: 1,
                max: 96000,
                step: 1,
                value: 1000,
                decimals: 0
            },{
                name: "bw",
                type: 0,
                min: 1,
                max: 96000,
                step: 1,
                value: 10,
                decimals: 0
            }]
        },{
            name: "Bandreject Butterworth",
            color: "#1e90ff",
            params: [{
                name: "cutoff",
                type: 0,
                min: 1,
                max: 96000,
                step: 1,
                value: 1000,
                decimals: 0
            },{
                name: "bw",
                type: 0,
                min: 1,
                max: 96000,
                step: 1,
                value: 1000,
                decimals: 0
            }]
        },{
            name: "Parametric EQ",
            color: "#db7093",
            params: [{
                name: "fc",
                type: 0,
                min: 1,
                max: 96000,
                step: 1,
                value: 1000,
                decimals: 0
            },{
                name: "v",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 1,
                decimals: 4
            },{
                name: "q",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 1,
                decimals: 4
            },{
                name: "eq mode",
                type: 0,
                min: 0,
                max: 2,
                step: 1,
                value: 0,
                decimals: 0
            }]
        },{
            name: "Moog LPF",
            color: "#eee8aa",
            params: [{
                name: "cutoff",
                type: 0,
                min: 1,
                step: 1,
                value: 1000,
                decimals: 0
            }, {
                name: "res",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.01,
                decimals: 4
            }]
        },{
            name: "Diode LPF",
            color: "#ff1493",
            params: [{
                name: "cutoff",
                type: 0,
                min: 1,
                step: 1,
                value: 1000,
                decimals: 0
            }, {
                name: "res",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.01,
                decimals: 4
            }]
        },{
            name: "Korg35 LPF",
            color: "#ffa07a",
            params: [{
                name: "cutoff",
                type: 0,
                min: 1,
                step: 1,
                value: 1000,
                decimals: 0
            }, {
                name: "res",
                type: 0,
                min: 0,
                max: 2,
                step: 0.0001,
                value: 1,
                decimals: 4
            }, {
                name: "saturation",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.01,
                decimals: 4
            }]
        },{
            name: "18db LPF",
            color: "#ee82ee",
            params: [{
                name: "cutoff",
                type: 0,
                min: 1,
                step: 1,
                value: 1000,
                decimals: 0
            }, {
                name: "res",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.8,
                decimals: 4
            }, {
                name: "saturation",
                type: 0,
                min: 0,
                max: 4,
                step: 0.0001,
                value: 2,
                decimals: 4
            }]
        },{
            name: "TB303 VCF",
            color: "#f0f8ff",
            params: [{
                name: "cutoff",
                type: 0,
                min: 1,
                step: 1,
                value: 500,
                decimals: 0
            }, {
                name: "res",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.8,
                decimals: 4
            }, {
                name: "distorsion",
                type: 0,
                min: 0,
                max: 4,
                step: 0.0001,
                value: 2,
                decimals: 4
            }, {
                name: "asym",
                type: 0,
                min: 0,
                max: 1,
                step: 0.0001,
                value: 0.5,
                decimals: 4
            }]
        },
        {
            name: "Fold",
            color: "#800040",
            params: [{
                name: "Increment",
                type: 0,
                min: 0,
                max: 2048,
                step: 1,
                value: 1,
                decimals: 0
            }]
        },
        {
            name: "DC block filter",
            color: "#80dd40",
            params: []
        },
        {
            name: "LPC",
            color: "#20dd40",
            params: [
                {
                    name: "Encoder frame size",
                    type: [64, 128, 256, 512, 1024, 2048, 4096],
                    value: 3
                }
            ]
        },
        {
            name: "Time-Stretcher",
            color: "#90aaaa",
            params: [{
                name: "Buffer length (secs)",
                type: 0,
                min: 0,
                step: 0.000001,
                value: 1,
                decimals: 6
            }, {
                name: "Number of repeats",
                type: 0,
                min: 0,
                step: 0.000001,
                value: 1.5,
                decimals: 6
            }]
        },
        {
            name: "Panner",
            color: "#90aaaa",
            params: [{
                name: "Type",
                type: [0, 1, 2, 3],
                value: 0
            }, {
                name: "Panning",
                type: 0,
                min: -1,
                max: 1,
                step: 0.000001,
                value: 0,
                decimals: 6
            }]
        },
        {
            name: "Faust",
            color: "#ffffff",
            params: [{
                name: "Effect ID",
                type: 0,
                min: 0,
                step: 1,
                value: 0,
                decimals: 0
            }, {
                name: "p0",
                type: 0,
                step: 0.000001,
                value: 0,
                decimals: 6
            }, {
                name: "p1",
                type: 0,
                step: 0.000001,
                value: 0,
                decimals: 6
            }, {
                name: "p2",
                type: 0,
                step: 0.000001,
                value: 0,
                decimals: 6
            }, {
                name: "p3",
                type: 0,
                step: 0.000001,
                value: 0,
                decimals: 6
            }, {
                name: "p4",
                type: 0,
                step: 0.000001,
                value: 0,
                decimals: 6
            }, {
                name: "p5",
                type: 0,
                step: 0.000001,
                value: 0,
                decimals: 6
            }, {
                name: "p6",
                type: 0,
                step: 0.000001,
                value: 0,
                decimals: 6
            }, {
                name: "p7",
                type: 0,
                step: 0.000001,
                value: 0,
                decimals: 6
            }, {
                name: "p8",
                type: 0,
                step: 0.000001,
                value: 0,
                decimals: 6
            }, {
                name: "p9",
                type: 0,
                step: 0.000001,
                value: 0,
                decimals: 6
            }]
        }],
    
    _fas_content_list = [];

/***********************************************************
    Functions.
************************************************************/

var _togglePlay = function (toggle_ev) {
    if (toggle_ev.state) {
        _pause();
    } else {
        _play();
    }
};

var _showHelpDialog = function () {
    WUI_Dialog.open(_help_dialog);
};

var _showSettingsDialog = function () {
    WUI_Dialog.open(_settings_dialog);
};

var _showMIDISettingsDialog = function () {
    WUI_Dialog.open(_midi_settings_dialog);
};

var _showMIDIOutDialog = function () {
    WUI_Dialog.open(_midi_out_dialog);
};

var _onChangeChannelSettings = function (instrument_index, target) {
    return function (value) {
        var v = parseFloat(value);

        //_chn_settings[channel].osc[value_index] = v;

        //_local_session_settings.chn_settings[channel] = _chn_settings[channel];
        //_saveLocalSessionSettings();

        //_fasNotify(_FAS_CHN_INFOS, { target: Math.floor(value_index / 2), chn: channel, value: v });
        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: target, value: v });

        var obj = { };
        obj["p" + (target - 3)] = v;

        _sendSliceUpdate(instrument_index, { instruments_settings : obj });

        var slice = _play_position_markers[instrument_index];
        slice.instrument_params["p" + (target - 3)] = v;
    };
};

var _toggleCollapse = function (element, cb) {
    return function (ev) {
        var elem = ev.target.ownerDocument.getElementById(element.id);

        elem.classList.toggle("fs-collapsible");
        elem.classList.toggle("fs-collapsed");

        ev.stopPropagation();

        if (cb) {
            if (elem.classList.contains("fs-collapsed")) {
                cb(true);
            } else {
                cb(false);
            }
        }
    };
};

var _applyCollapsible = function (element, bind_to, collapsed, cb) {
    element.id = "fs_collapsible_" + _collapsible_id;

    element.classList.add("fs-collapsible");

    if (collapsed) {
        element.classList.add("fs-collapsed");
    }

    if (element.classList.contains("fs-collapsed")) {
        element.classList.toggle("fs-collapsible");
    }    

    bind_to.addEventListener("click", _toggleCollapse(element, cb));

    bind_to.id = "fs_collapsible_target_" + _collapsible_id;

    if (element !== bind_to) {
        element.addEventListener("click", function (ev) {
            var elem = ev.target.ownerDocument.getElementById(element.id);
            var bto = ev.target.ownerDocument.getElementById(bind_to.id);

            if (elem.classList.contains("fs-collapsed")) {
                bto.dispatchEvent(new UIEvent('click'));
                bind_to.dispatchEvent(new UIEvent('click'));
            }

            ev.stopPropagation();
        });
    }

    _collapsible_id += 1;
};

var _updateSlicesDialog = function () {
    var slices_dialog_ul = document.createElement("ul");
    slices_dialog_ul.classList.add("fs-slices-list");
    var detached_window = WUI_Dialog.getDetachedDialog(_slices_dialog);
    var slices_dialog_content = null;
    var doc = null;

    if (detached_window) {
        doc = detached_window.document;
    } else {
        doc = document;
    }

    slices_dialog_content = doc.getElementById(_slices_dialog_id).getElementsByClassName('wui-dialog-content')[0];
    
    slices_dialog_content.innerHTML = "";

    if (!_play_position_markers.length) {
        slices_dialog_ul.innerHTML = '<li>No instruments.</li>';
    }

    var i = 0;
    for (i = 0; i < _play_position_markers.length; i += 1) {
        var play_position_marker = _play_position_markers[i];

        var slices_dialog_li = doc.createElement("li");

        var li_content = [
            "<span>CHN " + play_position_marker.output_channel + "</span>"];

        if (play_position_marker.mute) {
            //li_content.push("<span>MUTED</span>");
            slices_dialog_li.style = "text-decoration: line-through";
        }
        if (play_position_marker.audio_out) {
            li_content.push("<span>AUDIO OUT</span>");
        }
        if (play_position_marker.osc_out) {
            li_content.push("<span>OSC OUT</span>");
        }
        if (play_position_marker.midi_out.enabled) {
            li_content.push("<span>MIDI OUT</span>");
        }

        slices_dialog_li.addEventListener("click", _openSliceSettingsDialogFn(play_position_marker));
        slices_dialog_li.addEventListener("contextmenu", _showSliceSettingsMenuFn(play_position_marker.element, _slices_dialog));
        
        slices_dialog_li.innerHTML = play_position_marker.id + ": " + li_content.join(' - ');

        slices_dialog_ul.appendChild(slices_dialog_li);
    }

    slices_dialog_content.appendChild(slices_dialog_ul);

    _slices_dialog_timeout = setTimeout(_updateSlicesDialog, 3000);
};

var _openedSlicesDialog = function () {
    _updateSlicesDialog();

    _slices_dialog_timeout = setTimeout(_updateSlicesDialog, 3000);
};

var _closedSlicesDialog = function () {
    clearTimeout(_slices_dialog_timeout);
};

var _openSynthParameters = function () {
    WUI_Dialog.open(_fas_synth_params_dialog);
};

var _onChangeEfxParameter = function (chn, efx, efxi, pid) {
    return function (ev_value) {
        var value,
            elem = null,
            detached_window = null;
        
        detached_window = WUI_Dialog.getDetachedDialog(_fas_dialog);
        
        if (detached_window) {
            elem = detached_window.document.getElementById("fs_chn_" + chn + "_fx_" + efx + "_" + efxi);
        } else {
            elem = document.getElementById("fs_chn_" + chn + "_fx_" + efx + "_" + efxi);
        }

        if (this) {
            value = _efx[efx].params[pid].type[this.selectedIndex];
        } else {
            value = ev_value;
        }

        var slot = _parseInt10(elem.dataset.chn_fxid) / 3;
        var fvalue = parseFloat(value);

        _chn_settings[chn].efx[_parseInt10(elem.dataset.chn_fxid) + 2][pid] = fvalue;

        _local_session_settings.chn_settings[chn] = _chn_settings[chn];
        _saveLocalSessionSettings();

        _fasNotify(_FAS_CHN_FX_INFOS, { chn: chn, slot: slot, target: 2 + pid, value: fvalue });
    };
};

var _createChnFxSettings = function (chn, ind, efxi, id) {
    var dialog_id = null,
        dialog_element = document.createElement("div"),
        dialog_content = document.createElement("div"),

        slider_div = null,

        fieldset = null,
        legend = null,

        param = null,

        label = null,
        select = null,
        option = null,

        selected_option = 0,

        fx = _efx[ind],
        
        i = 0,
        j = 0;

    dialog_element.id = id + "_dialog";

    WUI_Dialog.destroy(dialog_element.id);

    fieldset = document.createElement("fieldset");
    legend = document.createElement("legend");

    fieldset.className = "fs-fieldset";
    legend.innerText = "Parameters";

    for (i = 0; i < fx.params.length; i += 1) {
        param = fx.params[i];

        if (Array.isArray(param.type)) {
            label = document.createElement("label");
            select = document.createElement("select");
            
            for (j = 0; j < param.type.length; j += 1) {
                option = document.createElement("option");
                option.innerHTML = param.type[j];
                
                select.appendChild(option);
            }

            label.classList.add("fs-input-label");
            label.style.width = "148px";
            label.innerHTML = param.name + ": &nbsp;";
            label.htmlFor = id + "_" + i + "_param";
            
            select.classList.add("fs-btn");
            select.style = "margin-top: 4px";
            select.dataset.chnId = chn;
            select.dataset.efxId = ind;
            select.id = label.htmlFor;

            selected_option = _chn_settings[chn].efx[efxi + 2][i];

            if (selected_option) {
                selected_option = _efx[ind].params[i].type.indexOf(selected_option);

                select.childNodes[selected_option].selected = true;
            } else {
                select.childNodes[_efx[ind].params[i].value].selected = true;
            }

            select.addEventListener("change", _onChangeEfxParameter(chn, ind, efxi, i));
            fieldset.appendChild(label);
            fieldset.appendChild(select);

            select.dispatchEvent(new UIEvent('change'));
        } else if (param.type == 0) {
            slider_div = document.createElement("div");
            slider_div.id = id + "_slider_" + i;

            WUI_RangeSlider.destroy(slider_div.id);

            var value = _chn_settings[chn].efx[efxi + 2][i];

            WUI_RangeSlider.create(slider_div, {
                width: 120,
                height: 8,
    
                min: param.min,
                max: param.max,
    
                bar: false,
    
                step: param.step,
                scroll_step: param.step,
    
                default_value: param.value,
                value: value !== undefined ? value : param.value,
    
                decimals: param.decimals,

                midi: true,
                
                title: param.name,
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeEfxParameter(chn, ind, efxi, i)
            });

            fieldset.appendChild(slider_div);
        }
    }

    fieldset.appendChild(legend);

    dialog_content.appendChild(fieldset);

    dialog_element.appendChild(dialog_content);
    document.body.appendChild(dialog_element);

    dialog_id = WUI_Dialog.create(dialog_element.id, {
        title: fx.name + " (" + chn + ":" + (efxi / 3) + ")",

        width: "auto",
        height: "auto",
    
        min_width: 340,
        min_height: 80,

        halign: "center",
        valign: "center",

        open: false,

        status_bar: false,
//        detachable: true,
        minimizable: true,
        draggable: true,
/*    
        on_detach: function (new_window) {

        },
*/  
    });
};

var _createSynthParametersContent = function () {
    var dialog_div = document.getElementById(_fas_synth_params_dialog).lastElementChild,
    
        detached_window = WUI_Dialog.getDetachedDialog(_fas_synth_params_dialog),    
    
        synth_type = 0,    
        chn_fieldset,
        chn_legend,

        slice,

        chn_genv_type_label,
        chn_genv_type_select,
        chn_genv_option,
        chn_genv_options = ["sine", "hann", "hamming", "tukey", "gaussian", "confined gaussian", "trapezoidal", "blackman", "blackman harris", "parzen", "nutall", "flattop", "kaiser"],
        
        chn_gden_input,
        chn_gmin_size_input,
        chn_gmax_size_input,

        gmin = 0.01,
        gmax = 0.1,
        gden = 0.00001,

        i = 0, j = 0;
    
    if (detached_window) {
        dialog_div = detached_window.document.body;
    }
    
    for (i = 0; i < _fas_content_list.length; i += 1) {
        WUI_RangeSlider.destroy(_fas_content_list[i]);
    }

    _fas_content_list = [];

    dialog_div.innerHTML = "";

    for (j = 0; j < _play_position_markers.length; j += 1) {
        //chn_settings = _chn_settings[j];
        slice = _play_position_markers[j];

        synth_type = slice.instrument_type;
/*
        synth_type = _chn_settings[j].osc[1];
*/
        if (_synthesis_params[synth_type] <= 0) {
            continue;
        }

        chn_fieldset = document.createElement("fieldset");
        chn_legend = document.createElement("legend");

        chn_fieldset.className = "fs-fieldset";
        
        chn_legend.innerHTML = "Instr. " + (j + 1) + " / " + _synthesis_types[synth_type];

        chn_fieldset.appendChild(chn_legend);

        // granular parameters
        if (_synthesis_types[synth_type] === "Granular") {
            chn_gmin_size_input = document.createElement("div");
            chn_gmin_size_input.id = "fs_chn_" + j + "_gmin";
            chn_gmax_size_input = document.createElement("div");
            chn_gmax_size_input.id = "fs_chn_" + j + "_gmax";
            chn_gden_input = document.createElement("div");
            chn_gden_input.id = "fs_chn_" + j + "_gden";


            chn_genv_type_label = document.createElement("label");
            chn_genv_type_select = document.createElement("select");
            
            for (i = 0; i < chn_genv_options.length; i += 1) {
                chn_genv_option = document.createElement("option");
                chn_genv_option.innerHTML = chn_genv_options[i];
                
                chn_genv_type_select.appendChild(chn_genv_option);
            }
            
            chn_genv_type_label.classList.add("fs-input-label");
            //chn_genv_type_label.style.display = "none";
            chn_genv_type_label.innerHTML = "Granular env: &nbsp;";
            chn_genv_type_label.htmlFor = "fs_chn_" + j + "_genv_type_settings";
            
            chn_genv_type_select.classList.add("fs-btn");
            chn_genv_type_select.style = "margin-top: 4px";
            //chn_genv_type_select.style.display = "none";
            chn_genv_type_select.dataset.chnId = j;
            chn_genv_type_select.id = chn_genv_type_label.htmlFor;

            chn_genv_type_select.childNodes[slice.instrument_params.p0].selected = true;

            gmin = slice.instrument_params.p1;
            gmax = slice.instrument_params.p2;
            gden = slice.instrument_params.p3;

            chn_genv_type_select.addEventListener("change", function() {
                var j = parseInt(this.dataset.chnId, 10),
                    value = parseInt(this.selectedIndex, 10);

                var slice = _play_position_markers[j];

                slice.instrument_params.p0 = value;

                _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: j, target: 3, value: value });

                _sendSliceUpdate(j, { instruments_settings : { p0: value } });
            });

            chn_fieldset.appendChild(chn_genv_type_label);
            chn_fieldset.appendChild(chn_genv_type_select);
            chn_fieldset.appendChild(chn_gmin_size_input);
            chn_fieldset.appendChild(chn_gmax_size_input);
            chn_fieldset.appendChild(chn_gden_input);

            _fas_content_list.push(WUI_RangeSlider.create(chn_gmin_size_input, {
                width: 120,
                height: 8,
    
                min: 0.0,
                max: 1.0,
    
                bar: false,
    
                step: 0.0000001,
                scroll_step: 0.0001,
    
                default_value: gmin,
                value: gmin,
    
                decimals: 7,

                midi: true,
                
                title: "Min. grain length",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 4)
            }));
            
            _fas_content_list.push(WUI_RangeSlider.create(chn_gmax_size_input, {
                width: 120,
                height: 8,
    
                min: 0.0,
                max: 1.0,
    
                bar: false,
    
                step: 0.0000001,
                scroll_step: 0.0001,
    
                default_value: gmax,
                value: gmax,

                midi: true,
                
                decimals: 7,
    
                title: "Max. grain length",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 5)
            }));
    
            _fas_content_list.push(WUI_RangeSlider.create(chn_gden_input, {
                width: 120,
                height: 8,
    
                min: 0.0,
                max: 1.0,
    
                bar: false,
    
                step: 0.0000001,
                scroll_step: 0.0001,
    
                default_value: gden,
                value: gden,

                midi: true,
                
                decimals: 7,
    
                title: "Spread",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 6)
            }));

            chn_genv_type_select.dispatchEvent(new UIEvent('change'));
        } else if (_synthesis_types[synth_type] === "Bandpass (M)") {
            var chn_order_label = document.createElement("label");
            var chn_order_select = document.createElement("select");
            var chn_order_options = ["2", "4", "6", "8"];
            
            for (i = 0; i < chn_order_options.length; i += 1) {
                var chn_order_option = document.createElement("option");
                chn_order_option.innerHTML = chn_order_options[i];
                
                chn_order_select.appendChild(chn_order_option);
            }
            
            chn_order_label.classList.add("fs-input-label");

            chn_order_label.innerHTML = "Filter order: &nbsp;";
            chn_order_label.htmlFor = "fs_chn_" + j + "_bp_order_settings";
            
            chn_order_select.classList.add("fs-btn");
            chn_order_select.style = "margin-top: 4px";

            chn_order_select.dataset.chnId = j;
            chn_order_select.id = chn_order_label.htmlFor;

            chn_order_select.childNodes[slice.instrument_params.p0].selected = true;

            chn_order_select.addEventListener("change", function() {
                var j = parseInt(this.dataset.chnId, 10),
                    value = parseInt(this.selectedIndex, 10);

                var slice = _play_position_markers[j];

                slice.instrument_params.p0 = value;

                _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: j, target: 3, value: value });

                _sendSliceUpdate(j, { instruments_settings : { p0: value } });
            });

            chn_fieldset.appendChild(chn_order_label);
            chn_fieldset.appendChild(chn_order_select);
        } else if (_synthesis_types[synth_type] === "Spectral") {
            var chn_input = document.createElement("div");
            chn_input.id = "fs_chn_" + j + "_chn_input";
            var chn_mode = document.createElement("div");
            chn_mode.id = "fs_chn_" + j + "_chn_mode";
            var switch_mode = document.createElement("div");
            switch_mode.id = "fs_chn_" + j + "_switch_mode";

            var chn_win_size_label = document.createElement("label");
            var chn_win_size_select = document.createElement("select");
            var chn_win_size_options = [32, 64, 128, 256, 512, 1024];
            
            for (i = 0; i < chn_win_size_options.length; i += 1) {
                var chn_win_size_option = document.createElement("option");
                chn_win_size_option.innerHTML = chn_win_size_options[i];
                
                chn_win_size_select.appendChild(chn_win_size_option);
            }
            
            chn_win_size_label.classList.add("fs-input-label");

            chn_win_size_label.innerHTML = "Window size: &nbsp;";
            chn_win_size_label.htmlFor = "fs_chn_" + j + "_win_size_settings";
            
            chn_win_size_select.classList.add("fs-btn");
            chn_win_size_select.style = "margin-top: 4px";

            chn_win_size_select.dataset.chnId = j;
            chn_win_size_select.id = chn_win_size_label.htmlFor;

            chn_win_size_select.childNodes[chn_win_size_options.indexOf(slice.instrument_params.p1)].selected = true;

            var input = slice.instrument_params.p0;
            var mode = slice.instrument_params.p2;
            var switch_mode_value = slice.instrument_params.p3;

            chn_win_size_select.addEventListener("change", function() {
                var j = parseInt(this.dataset.chnId, 10),
                    value = parseInt(this.selectedIndex, 10);

                var slice = _play_position_markers[j];

                slice.instrument_params.p1 = chn_win_size_options[value];

                _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: j, target: 4, value: chn_win_size_options[value] });

                _sendSliceUpdate(j, { instruments_settings : { p1: chn_win_size_options[value] } });
            });

            chn_fieldset.appendChild(chn_win_size_label);
            chn_fieldset.appendChild(chn_win_size_select);
            chn_fieldset.appendChild(chn_input);
            chn_fieldset.appendChild(chn_mode);
            chn_fieldset.appendChild(switch_mode);

            _fas_content_list.push(WUI_RangeSlider.create(chn_input, {
                width: 120,
                height: 8,
    
                min: 0,
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: input,
                value: input,
    
                decimals: 0,

                midi: true,
                
                title: "Source CHN / instrument",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 3)
            }));
            
            _fas_content_list.push(WUI_RangeSlider.create(chn_mode, {
                width: 120,
                height: 8,
    
                min: 0,
                max: 1,
    
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: mode,
                value: mode,

                midi: true,
                
                decimals: 0,
    
                title: "Mode (factor / direct)",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 5)
            }));

            _fas_content_list.push(WUI_RangeSlider.create(switch_mode, {
                width: 120,
                height: 8,
    
                min: 0,
                max: 1,
    
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: switch_mode_value,
                value: switch_mode_value,

                midi: true,
                
                decimals: 0,
    
                title: "Source mode",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 6)
            }));

            chn_win_size_select.dispatchEvent(new UIEvent('change'));
        } else if (_synthesis_types[synth_type] === "PM/FM") {
            var chn_wav1 = document.createElement("div"),
                chn_wav2 = document.createElement("div");

            chn_wav1.id = "fs_chn_" + j + "_chn_wav1";
            chn_wav2.id = "fs_chn_" + j + "_chn_wav2";

            var wav1 = slice.instrument_params.p0,
                wav2 = slice.instrument_params.p1;

            chn_fieldset.appendChild(chn_wav1);
            chn_fieldset.appendChild(chn_wav2);

            _fas_content_list.push(WUI_RangeSlider.create(chn_wav1, {
                width: 120,
                height: 8,
    
                min: -1,
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: wav1,
                value: wav1,
    
                decimals: 0,

                midi: true,
                
                title: "Wavetable (carrier)",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 3)
            }));

            _fas_content_list.push(WUI_RangeSlider.create(chn_wav2, {
                width: 120,
                height: 8,
    
                min: -1,
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: wav2,
                value: wav2,
    
                decimals: 0,

                midi: true,
                
                title: "Wavetable (modulator)",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 4)
            }));
        } else if (_synthesis_types[synth_type] === "Modulation") {
            var chn_mod = document.createElement("div"),
                chn_mod2 = document.createElement("div"),
                chn_mod3 = document.createElement("div"),
                chn_mod4 = document.createElement("div"),
                chn_mod5 = document.createElement("div");

            chn_mod.id = "fs_chn_" + j + "_chn_mod";
            chn_mod2.id = "fs_chn_" + j + "_chn_mod2";
            chn_mod3.id = "fs_chn_" + j + "_chn_mod3";
            chn_mod4.id = "fs_chn_" + j + "_chn_mod4";
            chn_mod4.id = "fs_chn_" + j + "_chn_mod5";

            var mode = slice.instrument_params.p0,
                mode2 = slice.instrument_params.p1,
                mode3 = slice.instrument_params.p2,
                mode4 = slice.instrument_params.p3,
                mode5 = slice.instrument_params.p4;

            chn_fieldset.appendChild(chn_mod);
            chn_fieldset.appendChild(chn_mod2);
            chn_fieldset.appendChild(chn_mod3);
            chn_fieldset.appendChild(chn_mod4);
            chn_fieldset.appendChild(chn_mod5);

            _fas_content_list.push(WUI_RangeSlider.create(chn_mod, {
                width: 120,
                height: 8,
    
                min: 0,
                max: 2,
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: mode,
                value: mode,
    
                decimals: 0,

                midi: true,
                
                title: "Mode",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 3)
            }));

            _fas_content_list.push(WUI_RangeSlider.create(chn_mod2, {
                width: 120,
                height: 8,
    
                min: 0,
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: mode2,
                value: mode2,
    
                decimals: 0,

                midi: true,
                
                title: "Chn / Instrument",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 4)
            }));

            _fas_content_list.push(WUI_RangeSlider.create(chn_mod3, {
                width: 120,
                height: 8,
    
                min: 0,
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: mode3,
                value: mode3,

                decimals: 0,

                midi: true,
                
                title: "Slot / param",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 5)
            }));

            _fas_content_list.push(WUI_RangeSlider.create(chn_mod4, {
                width: 120,
                height: 8,
    
                min: 0,
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: mode4,
                value: mode4,
    
                decimals: 0,

                midi: true,
                
                title: "Target",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 6)
            }));

            _fas_content_list.push(WUI_RangeSlider.create(chn_mod5, {
                width: 120,
                height: 8,
    
                min: 0,
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: mode5,
                value: mode5,
    
                decimals: 0,

                midi: true,
                
                title: "Easing (interpolation)",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 7)
            }));
        } else if (_synthesis_types[synth_type] === "Faust") {
            var chn_gen = document.createElement("div"),
                chn_p0 = document.createElement("div"),
                chn_p1 = document.createElement("div"),
                chn_p2 = document.createElement("div"),
                chn_p3 = document.createElement("div");
            chn_gen.id = "fs_chn_" + j + "_chn_gen";
            chn_p0.id = "fs_chn_" + j + "_chn_p0";
            chn_p1.id = "fs_chn_" + j + "_chn_p1";
            chn_p2.id = "fs_chn_" + j + "_chn_p2";
            chn_p3.id = "fs_chn_" + j + "_chn_p3";

            var gen = slice.instrument_params.p0,
                p0 = slice.instrument_params.p1,
                p1 = slice.instrument_params.p2,
                p2 = slice.instrument_params.p3,
                p3 = slice.instrument_params.p4;

            chn_fieldset.appendChild(chn_gen);
            chn_fieldset.appendChild(chn_p0);
            chn_fieldset.appendChild(chn_p1);
            chn_fieldset.appendChild(chn_p2);
            chn_fieldset.appendChild(chn_p3);

            _fas_content_list.push(WUI_RangeSlider.create(chn_gen, {
                width: 120,
                height: 8,
    
                min: 0,
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: gen,
                value: gen,
    
                decimals: 0,

                midi: true,
                
                title: "Generator ID",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 3)
            }));

            _fas_content_list.push(WUI_RangeSlider.create(chn_p0, {
                width: 120,
                height: 8,

                bar: false,
    
                step: 0.000001,
                scroll_step: 0.0001,
    
                default_value: p0,
                value: p0,
    
                decimals: 6,

                midi: true,
                
                title: "p0",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 4)
            }));

            _fas_content_list.push(WUI_RangeSlider.create(chn_p1, {
                width: 120,
                height: 8,
    
                bar: false,
    
                step: 0.000001,
                scroll_step: 0.0001,
    
                default_value: p1,
                value: p1,
    
                decimals: 6,

                midi: true,
                
                title: "p1",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 5)
            }));

            _fas_content_list.push(WUI_RangeSlider.create(chn_p2, {
                width: 120,
                height: 8,
    
                bar: false,
    
                step: 0.000001,
                scroll_step: 0.0001,
    
                default_value: p2,
                value: p2,
    
                decimals: 6,

                midi: true,
                
                title: "p2",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 6)
            }));

            _fas_content_list.push(WUI_RangeSlider.create(chn_p3, {
                width: 120,
                height: 8,
    
                bar: false,
    
                step: 0.000001,
                scroll_step: 0.0001,
    
                default_value: p3,
                value: p3,
    
                decimals: 6,

                midi: true,
                
                title: "p3",

                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 7)
            }));
        } else if (_synthesis_types[synth_type] === "Subtractive") {
            var chn_filter_type_label,
                chn_filter_type_select,
                chn_filter_option,
                chn_filters_option = ["Moog-ladder LPF", "Diode-ladder LPF", "Korg 35 LPF", "18db LPF"];

            chn_filter_type_label = document.createElement("label");
            chn_filter_type_select = document.createElement("select");
            
            for (i = 0; i < chn_filters_option.length; i += 1) {
                chn_filter_option = document.createElement("option");
                chn_filter_option.innerHTML = chn_filters_option[i];
                
                chn_filter_type_select.appendChild(chn_filter_option);
            }
            chn_filter_type_label.classList.add("fs-input-label");
            chn_filter_type_label.innerHTML = "Filter type: &nbsp;";
            chn_filter_type_label.htmlFor = "fs_chn_" + j + "_filter_type_settings";
            
            chn_filter_type_select.classList.add("fs-btn");
            chn_filter_type_select.style = "margin-top: 4px";
            chn_filter_type_select.dataset.chnId = j;
            chn_filter_type_select.id = chn_filter_type_label.htmlFor;

            var selected_option = slice.instrument_params.p0;
            chn_filter_type_select.childNodes[selected_option >= chn_filters_option.length ? 0 : selected_option].selected = true;

            chn_filter_type_select.addEventListener("change", function() {
                var j = parseInt(this.dataset.chnId, 10),
                    value = parseInt(this.selectedIndex, 10);

                var slice = _play_position_markers[j];

                slice.instrument_params.p0 = value;

                _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: j, target: 3, value: value });

                _sendSliceUpdate(j, { instruments_settings : { p0: value } });
            });
            chn_fieldset.appendChild(chn_filter_type_label);
            chn_fieldset.appendChild(chn_filter_type_select);

            chn_filter_type_select.dispatchEvent(new UIEvent('change'));
        } else if (_synthesis_types[synth_type] === "Physical Model") {
            var chn_model_type_label,
                chn_model_type_select,
                chn_model_option,
                chn_models_option = ["Karplus-strong", "Water drop", "Metal bar"];

                chn_model_type_label = document.createElement("label");
                chn_model_type_select = document.createElement("select");
            
            for (i = 0; i < chn_models_option.length; i += 1) {
                chn_model_option = document.createElement("option");
                chn_model_option.innerHTML = chn_models_option[i];
                
                chn_model_type_select.appendChild(chn_model_option);
            }
            chn_model_type_label.classList.add("fs-input-label");
            chn_model_type_label.innerHTML = "Model: &nbsp;";
            chn_model_type_label.htmlFor = "fs_chn_" + j + "_physical_model_type_settings";
            
            chn_model_type_select.classList.add("fs-btn");
            chn_model_type_select.style = "margin-top: 4px";
            chn_model_type_select.dataset.chnId = j;
            chn_model_type_select.id = chn_model_type_label.htmlFor;

            var selected_option = slice.instrument_params.p0;
            chn_model_type_select.childNodes[selected_option >= chn_models_option.length ? 0 : selected_option].selected = true;

            chn_model_type_select.addEventListener("change", function() {
                var j = parseInt(this.dataset.chnId, 10),
                    value = parseInt(this.selectedIndex, 10);

                var slice = _play_position_markers[j];

                slice.instrument_params.p0 = value;

                _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: j, target: 3, value: value });

                _sendSliceUpdate(j, { instruments_settings : { p0: value } });
    
            });
            chn_fieldset.appendChild(chn_model_type_label);
            chn_fieldset.appendChild(chn_model_type_select);

            chn_model_type_select.dispatchEvent(new UIEvent('change'));

            // droplet params
            var drop_tubes = document.createElement("div");

            drop_tubes.id = "fs_chn_" + j + "_drop_tubes";

            var tubes = slice.instrument_params.p1;

            chn_fieldset.appendChild(drop_tubes);

            _fas_content_list.push(WUI_RangeSlider.create(drop_tubes, {
                width: 120,
                height: 8,
    
                min: 1,
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: tubes,
                value: tubes,
    
                decimals: 0,

                midi: true,
                
                title: "Droplet tubes",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 4)
            }));

            var drop_deattack = document.createElement("div");

            drop_deattack.id = "fs_chn_" + j + "_drop_deattack";

            var deattack = slice.instrument_params.p2;

            chn_fieldset.appendChild(drop_deattack);

            _fas_content_list.push(WUI_RangeSlider.create(drop_deattack, {
                width: 120,
                height: 8,
    
                min: 0,
                bar: false,
    
                step: 0.0001,
                scroll_step: 0.0001,
    
                default_value: deattack,
                value: deattack,
    
                decimals: 4,

                midi: true,
                
                title: "Droplet deattack",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 5)
            }));

            // bar params
            var bar_bcl = document.createElement("div");

            bar_bcl.id = "fs_chn_" + j + "_bar_bcl";

            var bcl = slice.instrument_params.p1;

            chn_fieldset.appendChild(bar_bcl);

            _fas_content_list.push(WUI_RangeSlider.create(bar_bcl, {
                width: 120,
                height: 8,
    
                min: 1,
                max: 3,
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: bcl,
                value: bcl,
    
                decimals: 0,

                midi: true,
                
                title: "Bar boundary left",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 4)
            }));

            var bar_bcr = document.createElement("div");

            bar_bcr.id = "fs_chn_" + j + "_bar_bcr";

            var bcr = slice.instrument_params.p2;

            chn_fieldset.appendChild(bar_bcr);

            _fas_content_list.push(WUI_RangeSlider.create(bar_bcr, {
                width: 120,
                height: 8,
    
                min: 1,
                max: 3,
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: bcr,
                value: bcr,
    
                decimals: 0,

                midi: true,
                
                title: "Bar boundary right",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 5)
            }));

            var bar_vel = document.createElement("div");

            bar_vel.id = "fs_chn_" + j + "_bar_vel";

            var vel = slice.instrument_params.p3;

            chn_fieldset.appendChild(bar_vel);

            _fas_content_list.push(WUI_RangeSlider.create(bar_vel, {
                width: 120,
                height: 8,
    
                min: 0,
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: vel,
                value: vel,
    
                decimals: 0,

                midi: true,
                
                title: "Bar strike velocity",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 6)
            }));
        } else if (_synthesis_types[synth_type] === "Wavetable") {
            var chn_wav1 = document.createElement("div");

            chn_wav1.id = "fs_chn_" + j + "_chn_wav1";

            var wav1 = slice.instrument_params.p0;

            chn_fieldset.appendChild(chn_wav1);

            _fas_content_list.push(WUI_RangeSlider.create(chn_wav1, {
                width: 120,
                height: 8,
    
                min: 0,
                max: 1,
                bar: false,
    
                step: 1,
                scroll_step: 1,
    
                default_value: wav1,
                value: wav1,
    
                decimals: 0,

                midi: true,
                
                title: "Note-on reset",
    
                title_min_width: 140,
                value_min_width: 88,
    
                on_change: _onChangeChannelSettings(j, 3)
            }));
        }

        _applyCollapsible(chn_fieldset, chn_legend);

        dialog_div.appendChild(chn_fieldset);
    }

    if (dialog_div.innerHTML.length <= 0) {
        dialog_div.innerHTML = '<div style="padding: 8px; color: #ffffff">No parameters.</div>';
    }
};

var _chnFxMute = function (elem) {
    var id = null, chn, efx, muted, slot;

    slot = Array.from(elem.parentElement.children).indexOf(elem);

    id = slot * 3;
    chn = _parseInt10(elem.parentElement.dataset.chn);
    efx = _chn_settings[chn].efx;
    muted = efx[id + 1];

    efx[id + 1] = muted ? 0 : 1;

    if (muted) {
        elem.classList.remove("fs-fx-mute");
    } else {
        elem.classList.add("fs-fx-mute");
    }

    // save settings
    _local_session_settings.chn_settings[chn] = _chn_settings[chn];
    _saveLocalSessionSettings();

    _fasNotify(_FAS_CHN_FX_INFOS, { chn: chn, slot: slot, target: 1, value: efx[id + 1] });
};

var _onChnFxClick = function (ev) {
    if (ev.button == 1) {
        ev.preventDefault();

        _unfocus();

        _chnFxMute(ev.target);
    }
};

var _onChnFxDblClick = function (ev) {
    WUI_Dialog.open(ev.target.dataset.dialog_id);
};

var _onChnFxContextMenu = function (ev) {
    var elem = ev.target,
        mute_icon = elem.classList.contains("fx-fx-mute") ? "fs-unmute-icon" : "fs-mute-icon",
        mute_tooltip = elem.classList.contains("fx-fx-mute") ? "Unbypass" : "Bypass";

    ev.preventDefault();

    WUI_CircularMenu.create({
        element: elem,

        angle: 90,
        rx: 32,
        ry: 32,

        item_width:  32,
        item_height: 32,

        window: null
    }, [{
            icon: "fs-cross-45-icon", tooltip: "Delete", on_click: function () {
                var id = null, chn, efx, slot;

                var chn_nodes = Array.from(elem.parentElement.children);

                slot = chn_nodes.indexOf(elem);

                id = slot * 3;

                chn = _parseInt10(elem.parentElement.dataset.chn);
                efx = _chn_settings[chn].efx;

                efx.splice(id, 3);

                var next_elem = elem.nextElementSibling;

                elem.parentElement.removeChild(elem);

                if (next_elem) {
                    // must update all fx after
                    chn_nodes = Array.from(next_elem.parentElement.children);
                    while (next_elem) {
                        var fxid = chn_nodes.indexOf(next_elem);

                        next_elem.dataset.chn_fxid = fxid * 3;

                        WUI_Dialog.setTitle(next_elem.dataset.dialog_id, _efx[efx[id]].name + " (" + chn + ":" + fxid + ")");

                        next_elem = next_elem.nextElementSibling;
                    }
                }

                // save settings
                _local_session_settings.chn_settings[chn] = _chn_settings[chn];
                _saveLocalSessionSettings();

                _fasNotify(_FAS_CHN_FX_INFOS, { chn: chn, slot: slot, target: 0, value: -1 });

                WUI_Dialog.destroy(elem.dataset.dialog_id);
        }}, {
            icon: mute_icon, tooltip: mute_tooltip, on_click: function () {
                _chnFxMute(elem);
            }
        }]);

    return false;
};

var _dragChnFx = function (ev) {
    ev.dataTransfer.setData("text", ev.target.id);

    ev.dataTransfer.dropEffect = "move";
};

var _dragOverChnFx = function (ev) {
    ev.preventDefault();
};

var _dropChnFx = function (ev) {
    ev.preventDefault();

    var data = ev.dataTransfer.getData("text"),
        detached_window = WUI_Dialog.getDetachedDialog(_fas_dialog),
        src_node = detached_window ? detached_window.document.getElementById(data) : document.getElementById(data),
        cpy_node = null,
        
        chn = null,
        efx = null,
        fxid = null,

        update = false,

        chn_content_node = ev.target;

    if (ev.target.classList.contains("fs-fx-chn-content")) {
        cpy_node = src_node.cloneNode(true);

        chn = _parseInt10(chn_content_node.dataset.chn);
        fxid = _parseInt10(cpy_node.dataset.fxid);

        cpy_node.innerText = "";
        cpy_node.style.width = "16px";
        cpy_node.style.border = "none";
        cpy_node.style.backgroundColor = _efx[fxid].color;
        cpy_node.style.borderLeft = "none";

        efx = _chn_settings[chn].efx;

        efx.push(fxid); // fx id
        efx.push(0); // muted
        efx.push([]); // params

        cpy_node.id = "fs_chn_" + chn + "_fx_" + fxid + "_" + (efx.length - 3);
        cpy_node.dataset.dialog_id = cpy_node.id + "_dialog";
        cpy_node.dataset.chn_fxid = (efx.length - 3);

        cpy_node.addEventListener("dragstart", _dragChnFx)
        ev.target.appendChild(cpy_node);

        cpy_node.addEventListener("auxclick", _onChnFxClick);
        cpy_node.addEventListener("contextmenu", _onChnFxContextMenu);

        cpy_node.addEventListener("dblclick", _onChnFxDblClick);
        _createChnFxSettings(chn, fxid, efx.length - 3, cpy_node.id);

        update = true;
    } else {
        if (ev.target.id !== src_node.id && ev.target.parentElement.classList.contains("fs-fx-chn-content")) {
            var curr_style = ev.target.style.backgroundColor,
                curr_title = ev.target.title,
                curr_class = ev.target.className,
                id = null, id2 = null;

            chn = _parseInt10(ev.target.parentElement.dataset.chn);
            efx = _chn_settings[chn].efx;

            ev.target.title = src_node.title;
            ev.target.className = src_node.className;

            fxid = _parseInt10(src_node.dataset.fxid);

            chn_content_node = ev.target.parentElement;
            
            id = Array.from(chn_content_node.children).indexOf(ev.target) * 3;

            if (src_node.parentElement.classList.contains("fs-fx-chn-content")) {
                id2 = Array.from(chn_content_node.children).indexOf(src_node) * 3;

                ev.target.style.backgroundColor = src_node.style.backgroundColor;

                src_node.style.backgroundColor = curr_style;
                src_node.title = curr_title;
                src_node.className = curr_class;

                var src_chn_fx_id = src_node.dataset.chn_fxid;
                src_node.dataset.chn_fxid = ev.target.dataset.chn_fxid;
                ev.target.dataset.chn_fxid = src_chn_fx_id;

                var src_dialog_id = src_node.dataset.dialog_id;
                src_node.dataset.dialog_id = ev.target.dataset.dialog_id;
                ev.target.dataset.dialog_id = src_dialog_id;

                var pfxid = efx[id2];
                var pfxmu = efx[id2+1];
                var pfxpa = efx[id2+2];

                efx[id2] = efx[id];
                efx[id2 + 1] = efx[id+1];
                efx[id2 + 2] = efx[id+2];
                efx[id] = pfxid;
                efx[id + 1] = pfxmu;
                efx[id + 2] = pfxpa;

                WUI_Dialog.setTitle(ev.target.dataset.dialog_id, _efx[efx[id]].name + " (" + chn + ":" + id / 3 + ")");
                WUI_Dialog.setTitle(src_node.dataset.dialog_id, _efx[efx[id2]].name + " (" + chn + ":" + id2 / 3 + ")");
            } else {
                efx[id] = fxid;
                efx[id + 1] = 0;
                efx[id + 2] = [];

                ev.target.style.backgroundColor = _efx[fxid].color;
                
                ev.target.dataset.chn_fxid = id;

                WUI_Dialog.destroy(ev.target.dataset.dialog_id);

                ev.target.id = "fs_chn_" + chn + "_fx_" + fxid + "_" + id;
                ev.target.dataset.dialog_id = ev.target.id + "_dialog";

                _createChnFxSettings(chn, fxid, id, ev.target.id);
            }

            update = true;
        }
    }

    if (update) {
        // save settings
        _local_session_settings.chn_settings[chn] = _chn_settings[chn];
        _saveLocalSessionSettings();
    
        var j = 0, k = 0, slot_index = 0;
        for (j = 0; j < _chn_settings[chn].efx.length; j += 3) {
            _fasNotify(_FAS_CHN_FX_INFOS, { chn: chn, slot: slot_index, target: 0, value: _chn_settings[chn].efx[j] });
            _fasNotify(_FAS_CHN_FX_INFOS, { chn: chn, slot: slot_index, target: 1, value: _chn_settings[chn].efx[j + 1] });

            var fx_settings = _chn_settings[chn].efx[j + 2];
            for (k = 0; k < fx_settings.length; k += 1) {
                _fasNotify(_FAS_CHN_FX_INFOS, { chn: chn, slot: slot_index, target: 2 + k, value: fx_settings[k] });
            }

            slot_index += 1;
        }
        _fasNotify(_FAS_CHN_FX_INFOS, { chn: chn, slot: slot_index, target: 0, value: -1 });
    }
};

var _createFasFxCard = function (elem, fxid, muted, chn, index) {
    var fx_card = document.createElement("div");

    fx_card.classList.add("fs-fx-card");

    fx_card.draggable = "true";

    fx_card.dataset.fxid = fxid;

    fx_card.addEventListener("dragstart", _dragChnFx);

    if (muted) {
        fx_card.classList.add("fs-fx-mute");
    }
    
    fx_card.id = "fs_chn_" + chn + "_fx_" + fxid;
    if (index !== undefined) {
        fx_card.id += "_" + index;
        fx_card.dataset.dialog_id = fx_card.id + "_dialog";
        fx_card.dataset.chn_fxid = index;
        fx_card.style.width = "16px";
        fx_card.style.border = "none";
        fx_card.style.backgroundColor = _efx[fxid].color;
    } else {
        fx_card.innerText = _efx[fxid].name;
        //fx_card.style.borderTop = "solid 2px " + _efx[fxid].color;
        fx_card.style.borderLeft = "solid 2px " + _efx[fxid].color;
    }

    fx_card.title = _efx[fxid].name;

    elem.appendChild(fx_card);

    return fx_card;
};

var _createFasFxContent = function (div) {
    var fx_fieldset = document.createElement("fieldset"),
        fx_fieldset_legend = document.createElement("legend"),

        fx_card = null,
        
        i = 0, j = 0;

    fx_fieldset.className = "fs-fieldset";
    
    fx_fieldset_legend.innerHTML = "Channels";
    
    fx_fieldset.appendChild(fx_fieldset_legend);

    _applyCollapsible(fx_fieldset, fx_fieldset_legend, _fas_settings_collapses.channels, function (collapsed) { _fas_settings_collapses.channels = collapsed; });

    // fx list
    var fx_div = document.createElement("div");
    fx_div.classList.add("fs-fx-container");
    for (i = 0; i < _efx.length; i += 1) {
        var fx_card = _createFasFxCard(fx_div, i);
    }

    fx_fieldset.appendChild(fx_div);

    div.appendChild(fx_fieldset);

    // channels
    for (i = 0; i < _chn_settings.length; i += 1) {
        var fx_chn_div = document.createElement("div"),
            fx_chn_legend = document.createElement("div"),
            fx_chn_content = document.createElement("div"),
            fx_chn_out_input = document.createElement("input"),
            
            chn_settings = _chn_settings[i],
            chn_fx = chn_settings.efx;

        fx_chn_div.style.display = "flex";
        fx_chn_content.classList.add("fs-fx-chn-content");

        fx_chn_content.addEventListener("dragover", _dragOverChnFx);
        fx_chn_content.addEventListener("drop", _dropChnFx);

        fx_chn_content.dataset.chn = i;

        fx_chn_out_input.type = "number";
        fx_chn_out_input.min = -1;
        fx_chn_out_input.step = 1;
        fx_chn_out_input.value = chn_settings.chn_output;
        fx_chn_out_input.classList.add("fs-fx-chn-out");

        fx_chn_legend.title = "mute / unmute channel";
        fx_chn_legend.innerHTML = (i + 1) + " :";
        fx_chn_legend.style.userSelect = "none";
        fx_chn_legend.classList.add("fs-fas-chn-id");

        if (chn_settings.muted) {
            fx_chn_legend.style.textDecoration = "line-through";
            fx_chn_legend.style.color = "red";
        }

        // channel device output
        fx_chn_out_input.addEventListener("change", function (e) {
            var chn_index = parseInt(this.previousElementSibling.dataset.chn, 10);
            
            var output_chn = _parseInt10(e.target.value);

            _chn_settings[chn_index].chn_output = output_chn;

            // save settings
            _local_session_settings.chn_settings[chn_index] = _chn_settings[chn_index];
            _saveLocalSessionSettings();
        
            _fasNotify(_FAS_CHN_INFOS, { target: 1, chn: chn_index, value: output_chn });
        });

        // mute channel
        fx_chn_legend.addEventListener("click", function (e) {
            e.preventDefault();

            var chn_index = parseInt(this.nextElementSibling.dataset.chn, 10);

            var muted = _chn_settings[chn_index].muted;
            if (muted) {
                this.style.textDecoration = "none";
                this.style.color = "white";

                _chn_settings[chn_index].muted = 0;
                muted = 0;
            } else {
                this.style.textDecoration = "line-through";
                this.style.color = "red";

                _chn_settings[chn_index].muted = 1;
                muted = 1;
            }

            // save settings
            _local_session_settings.chn_settings[chn_index] = _chn_settings[chn_index];
            _saveLocalSessionSettings();
        
            _fasNotify(_FAS_CHN_INFOS, { target: 0, chn: chn_index, value: muted });

            //_sendSliceUpdate(instrument_index, { instruments_settings : { muted: slice.instrument_muted } }); 
        });

        // channel action menu
        fx_chn_legend.addEventListener("contextmenu", function (e) {
            e.preventDefault();

            var actions = [];
            var deleteAction = { icon: "fs-cross-45-icon", tooltip: "Delete unused channels (start at the last used one)", on_click: function () {
                // disable channels (probably help performances)
                for (var j = _output_channels; j < _chn_settings.length; j += 1) {
                    _fasNotify(_FAS_CHN_INFOS, { target: 1, chn: j, value: -1 });
                }

                _chn_settings.splice(_output_channels);

                _createFasSettingsContent();
                _saveLocalSessionSettings();
            } };

            actions.push(deleteAction);

            WUI_CircularMenu.create({
                element: e.target,
        
                angle: 90,
                rx: 0,
                ry: 0,
        
                item_width:  32,
                item_height: 32,
        
                window: null
            }, actions);
        });

        fx_chn_div.appendChild(fx_chn_legend);
        fx_chn_div.appendChild(fx_chn_content);
        fx_chn_div.appendChild(fx_chn_out_input);

        fx_fieldset.appendChild(fx_chn_div);

        if (chn_fx) {
            for (j = 0; j < chn_fx.length; j += 3) {
                fx_card = _createFasFxCard(fx_chn_content, chn_fx[j], chn_fx[j + 1], i, j);
                fx_card.addEventListener("auxclick", _onChnFxClick);
                fx_card.addEventListener("contextmenu", _onChnFxContextMenu);
                fx_card.addEventListener("dblclick", _onChnFxDblClick);

                _createChnFxSettings(i, chn_fx[j], j, fx_card.id);
            }
        }
    }
};

var _createFasSettingsButton = function (node, title, click_fn) {
    var btn = document.createElement("button");

    btn.innerHTML = title;
    btn.className = "fs-btn fs-btn-default";

    btn.style.width = "180px";
    btn.style.display = "block";
    btn.style.marginLeft = "auto";
    btn.style.marginRight = "auto";

    btn.addEventListener("click", click_fn);

    node.appendChild(btn);
};

var _createFasSettingsContent = function () {
    var dialog_div = document.getElementById(_fas_dialog).lastElementChild,
        detached_window = WUI_Dialog.getDetachedDialog(_fas_dialog),

        load_samples_btn = document.createElement("button"),
        load_faust_gens_btn = document.createElement("button"),
        load_faust_effs_btn = document.createElement("button"),
        load_wavs_btn = document.createElement("button"),
        load_imps_btn = document.createElement("button"),
        open_synth_params_btn = document.createElement("button"),
        
        synthesis_matrix_fieldset = document.createElement("fieldset"),
        actions_fieldset = document.createElement("fieldset"),
        files_fieldset = document.createElement("fieldset"),

        synthesis_matrix_table = document.createElement("table"),
        
        synthesis_matrix_fieldset_legend = document.createElement("legend"),
        
        actions_fieldset_legend = document.createElement("legend"),

        files_fieldset_legend = document.createElement("legend"),

        ck_tmp = [],

        chn_settings,

        row,
        cell,
        checkbox,

        triggered = true,
        
        i = 0, j = 0;
    
    if (detached_window) {
        dialog_div = detached_window.document.body;
    }
    
    // fieldset
    synthesis_matrix_fieldset.className = "fs-fieldset";
    actions_fieldset.className = "fs-fieldset";
    files_fieldset.className = "fs-fieldset";
    
    dialog_div.style = "overflow: auto";
    dialog_div.innerHTML = "";
    
    synthesis_matrix_fieldset_legend.innerHTML = "Instruments";
    actions_fieldset_legend.innerHTML = "Actions";
    files_fieldset_legend.innerHTML = "File managers";
    
    synthesis_matrix_fieldset.appendChild(synthesis_matrix_fieldset_legend);
    actions_fieldset.appendChild(actions_fieldset_legend);
    files_fieldset.appendChild(files_fieldset_legend);

    _applyCollapsible(synthesis_matrix_fieldset, synthesis_matrix_fieldset_legend, _fas_settings_collapses.instruments, function (collapsed) { _fas_settings_collapses.instruments = collapsed; });
    _applyCollapsible(actions_fieldset, actions_fieldset_legend, _fas_settings_collapses.actions, function (collapsed) { _fas_settings_collapses.actions = collapsed; });
    _applyCollapsible(files_fieldset, files_fieldset_legend, _fas_settings_collapses.file_managers, function (collapsed) { _fas_settings_collapses.file_managers = collapsed; });

    // synthesis matrix
    synthesis_matrix_table.className = "fs-matrix";
    synthesis_matrix_fieldset.appendChild(synthesis_matrix_table);

    row = document.createElement("tr");
    row.className = "fs-matrix-first-row";
    cell = document.createElement("th");
    row.appendChild(cell);
    for (i = 0; i < _play_position_markers.length; i += 1) {
//        chn_settings = _chn_settings[i];

        cell = document.createElement("th");
        cell.innerHTML = i + 1;

        row.appendChild(cell);
    }

    synthesis_matrix_table.appendChild(row); 
    
    for (i = 0; i < _output_channels; i += 1) {
        var chn_settings = _chn_settings[i];

        if (!chn_settings) {
            _chn_settings[i] = {
                efx: []
            };
        }
    }

    for (i = 0; i < _synthesis_types.length; i += 1) {
        if (!_synthesis_enabled[i]) {
            continue;
        }

        row = document.createElement("tr");

        cell = document.createElement("th");
        cell.className = "fs-matrix-first-cell";
        var label = document.createElement("label");
        label.htmlFor = "radio_instr_type" + i;
        label.innerHTML = _synthesis_types[i];
        cell.appendChild(label);
        row.appendChild(cell);
        
        for (j = 0; j < _play_position_markers.length; j += 1) {
//            chn_settings = _chn_settings[j];

            cell = document.createElement("th");
            cell.className = "fs-matrix-ck-cell";
            checkbox = document.createElement("input");
            checkbox.name = j;
            checkbox.value = i;
            checkbox.type = "radio";
            checkbox.id = "radio_instr_type" + i;

            // create channel settings if it does not exist
/*
            if (!chn_settings) {
                _chn_settings[j] = {
                    osc: [0, 0, 1, 0],
                    efx: []
                };
                chn_settings = _chn_settings[j];
            }
          
            // check synthesis type from saved settings
            if (chn_settings.osc[1] === i) {
                checkbox.checked = true;
            }
*/
            if (_play_position_markers[j].instrument_type == i) {
                checkbox.checked = true;
            }

            checkbox.addEventListener("change", function () {
                var instrument_index = parseInt(this.name, 10);

                var synth_type = parseInt(this.value, 10);

                //var osc_settings = _chn_settings[chn].osc;
                //var synth_type = osc_settings[1];
                var slice = _play_position_markers[instrument_index];

                // load default settings
                if (!triggered) {
                    _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 0, value: synth_type });

                    slice.instrument_type = synth_type;

                    if (_synthesis_types[synth_type] === "Physical Model") {
                        //_chn_settings[chn].osc = [0, synth_type, 1, 0, 2, 0];
                        //_fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 0, value: synth_type });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 1, chn: chn, value: 0 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 2, chn: chn, value: 0 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 3, value: 0 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 4, value: 1 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 5, value: 1 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 6, value: 500 });

                        slice.instrument_params.p0 = 0;
                        slice.instrument_params.p1 = 1;
                        slice.instrument_params.p2 = 1;
                        slice.instrument_params.p3 = 500;
                    } else if (_synthesis_types[synth_type] === "Wavetable") {
                        //_chn_settings[chn].osc = [0, synth_type, 1, 0, 2, 0];
                        //_fasNotify(_FAS_INSTRUMENT_INFOS, { target: 0, chn: chn, value: synth_type });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 1, chn: chn, value: 1 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 3, value: 0 });

                        slice.instrument_params.p0 = 0;
                    } else if (_synthesis_types[synth_type] === "Bandpass (M)") {
                        //_chn_settings[chn].osc = [0, synth_type, 1, 0, 2, 0];
                        //_fasNotify(_FAS_INSTRUMENT_INFOS, { target: 0, chn: chn, value: synth_type });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 1, chn: chn, value: 1 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 3, value: 0 });

                        slice.instrument_params.p0 = 0;
                    } else if (_synthesis_types[synth_type] === "Subtractive") {
                        //_chn_settings[chn].osc = [0, synth_type, 1, 0, 2, 0];
                        //_fasNotify(_FAS_INSTRUMENT_INFOS, { target: 0, chn: chn, value: synth_type });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 1, chn: chn, value: 0 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 2, chn: chn, value: 0 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 3, value: 0 });

                        slice.instrument_params.p0 = 0;
                    } else if (_synthesis_types[synth_type] === "PM/FM") {
                        //_chn_settings[chn].osc = [0, synth_type, 1, 0, 2, -1, 3, -1];
                        //_fasNotify(_FAS_INSTRUMENT_INFOS, { target: 0, chn: chn, value: synth_type });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 1, chn: chn, value: 0 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 2, chn: chn, value: -1 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 3, chn: chn, value: -1 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 3, value: -1 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 4, value: -1 });

                        slice.instrument_params.p0 = -1;
                        slice.instrument_params.p1 = -1;
                    } else if (_synthesis_types[synth_type] === "Modulation") {
                        //_chn_settings[chn].osc = [0, synth_type, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0];
                        //_fasNotify(_FAS_INSTRUMENT_INFOS, { target: 0, chn: chn, value: synth_type });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 1, chn: chn, value: 0 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 2, chn: chn, value: 0 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 3, chn: chn, value: 0 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 4, chn: chn, value: 0 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 5, chn: chn, value: 0 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 6, chn: chn, value: 0 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 3, value: 0 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 4, value: 0 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 5, value: 0 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 6, value: 0 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 7, value: 0 });

                        slice.instrument_params.p0 = 0;
                        slice.instrument_params.p1 = 0;
                        slice.instrument_params.p2 = 0;
                        slice.instrument_params.p3 = 0;
                        slice.instrument_params.p4 = 0;
                    } else if (_synthesis_types[synth_type] === "Granular") {
                        //_chn_settings[chn].osc = [0, synth_type, 1, 0, 2, 1, 3, 0.01, 4, 0.1, 5, 0.00001];
                        //_fasNotify(_FAS_INSTRUMENT_INFOS, { target: 0, chn: chn, value: synth_type });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 1, chn: chn, value: 0 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 2, chn: chn, value: 1 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 3, chn: chn, value: 0.01 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 4, chn: chn, value: 0.1 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 5, chn: chn, value: 0.00001 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 3, value: 1 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 4, value: 0.01 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 5, value: 0.1 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 6, value: 0.00001 });

                        slice.instrument_params.p0 = 1;
                        slice.instrument_params.p1 = 0.01;
                        slice.instrument_params.p2 = 0.1;
                        slice.instrument_params.p3 = 0.00001;
                    } else if (_synthesis_types[synth_type] === "Spectral") {
                        //_chn_settings[chn].osc = [0, synth_type, 1, 0, 2, 0, 3, 1024, 4, 0];
                        //_fasNotify(_FAS_INSTRUMENT_INFOS, { target: 0, chn: chn, value: synth_type });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 1, chn: chn, value: 0 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 2, chn: chn, value: 1 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 3, chn: chn, value: 1024 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 4, chn: chn, value: 0 });   
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 3, value: 1 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 4, value: 1024 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 5, value: 0 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 6, value: 0 });
                        
                        slice.instrument_params.p0 = 1;
                        slice.instrument_params.p1 = 1024;
                        slice.instrument_params.p2 = 0;
                        slice.instrument_params.p3 = 0;
                    } else if (_synthesis_types[synth_type] === "Faust") {
                        //_chn_settings[chn].osc = [0, synth_type, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0];
                        //_fasNotify(_FAS_INSTRUMENT_INFOS, { target: 0, chn: chn, value: synth_type });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 1, chn: chn, value: 0 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 2, chn: chn, value: 0 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 3, chn: chn, value: 0 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 4, chn: chn, value: 0 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 5, chn: chn, value: 0 });
                        //_fasNotify(_FAS_CHN_INFOS, { target: 6, chn: chn, value: 0 }); 
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 3, value: 0 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 4, value: 0 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 5, value: 0 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 6, value: 0 });
                        _fasNotify(_FAS_INSTRUMENT_INFOS, { instrument: instrument_index, target: 7, value: 0 });

                        slice.instrument_params.p0 = 0;
                        slice.instrument_params.p1 = 0;
                        slice.instrument_params.p2 = 0;
                        slice.instrument_params.p3 = 0;
                        slice.instrument_params.p4 = 0;
                    } else {
                        //_fasNotify(_FAS_CHN_INFOS, { target: 0, chn: chn, value: synth_type });
                    }

                    _submitSliceUpdate(5, instrument_index, { instruments_settings : { type: synth_type } }); 
                }

                // save settings
                //_local_session_settings.chn_settings[chn] = _chn_settings[chn];
                //_saveLocalSessionSettings();
            
                _createSynthParametersContent();
            });

            ck_tmp.push(checkbox);

            cell.appendChild(checkbox);
            row.appendChild(cell);
        }

        // trigger change event on checked ones
        for (j = 0; j < ck_tmp.length; j += 1) {
            checkbox = ck_tmp[j];
            if (checkbox.checked) {
                checkbox.dispatchEvent(new UIEvent('change'));
            }
        }
        ck_tmp = [];

        synthesis_matrix_table.appendChild(row);
    }

    // open parameters button
    open_synth_params_btn.innerHTML = "Parameters";
    open_synth_params_btn.className = "fs-btn fs-btn-default";

    open_synth_params_btn.style.width = "180px";
    open_synth_params_btn.style.display = "block";
    open_synth_params_btn.style.marginLeft = "auto";
    open_synth_params_btn.style.marginRight = "auto";
    open_synth_params_btn.style.marginTop = "12px";
    
    open_synth_params_btn.addEventListener("click", _openSynthParameters);

    synthesis_matrix_fieldset.appendChild(open_synth_params_btn);
    
    // load sample action
    load_samples_btn.innerHTML = "Reload samples / grains";
    load_samples_btn.className = "fs-btn fs-btn-default";

    load_samples_btn.style.width = "180px";
    load_samples_btn.style.display = "block";
    load_samples_btn.style.marginLeft = "auto";
    load_samples_btn.style.marginRight = "auto";
    
    load_samples_btn.addEventListener("click", function () {
        _fasNotify(_FAS_ACTION, { type: 0 });
    });

    // load Faust gens action
    load_faust_gens_btn.innerHTML = "Reload Faust generators";
    load_faust_gens_btn.className = "fs-btn fs-btn-default";

    load_faust_gens_btn.style.width = "180px";
    load_faust_gens_btn.style.display = "block";
    load_faust_gens_btn.style.marginLeft = "auto";
    load_faust_gens_btn.style.marginRight = "auto";

    load_faust_gens_btn.addEventListener("click", function () {
        _fasNotify(_FAS_ACTION, { type: 2 });
    });

    // load Faust effs action
    load_faust_effs_btn.innerHTML = "Reload Faust effects";
    load_faust_effs_btn.className = "fs-btn fs-btn-default";

    load_faust_effs_btn.style.width = "180px";
    load_faust_effs_btn.style.display = "block";
    load_faust_effs_btn.style.marginLeft = "auto";
    load_faust_effs_btn.style.marginRight = "auto";

    load_faust_effs_btn.addEventListener("click", function () {
        _fasNotify(_FAS_ACTION, { type: 3 });
    });

    // load wavs action
    load_wavs_btn.innerHTML = "Reload waves (wavetable)";
    load_wavs_btn.className = "fs-btn fs-btn-default";

    load_wavs_btn.style.width = "180px";
    load_wavs_btn.style.display = "block";
    load_wavs_btn.style.marginLeft = "auto";
    load_wavs_btn.style.marginRight = "auto";

    load_wavs_btn.addEventListener("click", function () {
        _fasNotify(_FAS_ACTION, { type: 6 });
    });

    // load wavs action
    load_imps_btn.innerHTML = "Reload impulses";
    load_imps_btn.className = "fs-btn fs-btn-default";

    load_imps_btn.style.width = "180px";
    load_imps_btn.style.display = "block";
    load_imps_btn.style.marginLeft = "auto";
    load_imps_btn.style.marginRight = "auto";

    load_imps_btn.addEventListener("click", function () {
        _fasNotify(_FAS_ACTION, { type: 7 });
    });

    actions_fieldset.appendChild(load_samples_btn);
    actions_fieldset.appendChild(load_wavs_btn);
    actions_fieldset.appendChild(load_imps_btn);
    actions_fieldset.appendChild(load_faust_gens_btn);
    actions_fieldset.appendChild(load_faust_effs_btn);

    _createFasSettingsButton(files_fieldset, "Grains / samples", function () { WUI_Dialog.open(_samples_dialog); });
    _createFasSettingsButton(files_fieldset, "Waves (wavetable)", function () { WUI_Dialog.open(_waves_dialog); });
    _createFasSettingsButton(files_fieldset, "Impulses", function () { WUI_Dialog.open(_impulses_dialog); });
    _createFasSettingsButton(files_fieldset, "Faust generators", function () { WUI_Dialog.open(_faust_gens_dialog); });
    _createFasSettingsButton(files_fieldset, "Faust effects", function () { WUI_Dialog.open(_faust_effs_dialog); });
    
    dialog_div.appendChild(synthesis_matrix_fieldset);
    _createFasFxContent(dialog_div);
    dialog_div.appendChild(actions_fieldset); 
    dialog_div.appendChild(files_fieldset);

    _createSynthParametersContent();

    triggered = false;
};

var _showFasDialog = function (toggle_ev) {
    _createFasSettingsContent();
    WUI_Dialog.open(_fas_dialog);
};

var _toggleFas = function (toggle_ev) {
    if (toggle_ev.state) {
        document.getElementById("fs_fas_status").style = "";
        
        _fasEnable();
    } else {
        document.getElementById("fs_fas_status").style = "display: none";
        
        _fasDisable();
    }
};

var _toggleGridInfos = function (toggle_ev) {
    _xyf_grid = toggle_ev.state;
};

var _showSpectrumDialog = function () {
    var analysis_dialog_content = document.getElementById(_analysis_dialog_id).childNodes[2];
    
    _analysis_canvas = document.createElement("canvas");
    _analysis_canvas_ctx = _analysis_canvas.getContext('2d');
    
    _analysis_canvas_tmp = document.createElement("canvas");
    _analysis_canvas_tmp_ctx = _analysis_canvas_tmp.getContext('2d');
    
    _analysis_canvas.width = 380;
    _analysis_canvas.height = 380;
    
    _analysis_canvas_tmp.width = _analysis_canvas.width;
    _analysis_canvas_tmp.height = _analysis_canvas.height;
    
    analysis_dialog_content.innerHTML = "";
    analysis_dialog_content.appendChild(_analysis_canvas);
    
    _connectAnalyserNode();
    
    WUI_Dialog.open(_analysis_dialog);
};

var _showRecordDialog = function () {
    _record = true;

    //if (_record) {
    //    _record = false;
        
    //    WUI_Dialog.close(_record_dialog);
    //} else {
    //   _record = true;
        
    WUI_Dialog.open(_record_dialog);
    //}
};

var _onImportDialogClose = function () {
    WUI_ToolBar.toggle(_wui_main_toolbar, 13);
    
    WUI_Dialog.close(_import_dialog);
    
    _updateImportWidgets();
};

var _onRecordDialogClose = function () {
    //WUI_ToolBar.toggle(_wui_main_toolbar, 7);
    
    // reattach the correct canvas
    var previous_canvas = _record_canvas;
    
    _record_canvas = _canvas.ownerDocument.getElementById("fs_record_canvas");
    _record_canvas_ctx = _record_canvas.getContext('2d');
    _record_canvas_ctx.drawImage(previous_canvas, 0, 0);
    
    _record = false;
};

var _showOutlineDialog = function () {
    WUI_Dialog.open(_outline_dialog);
};

var _showImportDialog = function (toggle_ev) {
    if (toggle_ev.state) {
        WUI_Dialog.open(_import_dialog);
    } else {
        WUI_Dialog.close(_import_dialog);
    }

    _updateImportWidgets();
};

var _toggleMIDIRecord = function (toggle_ev) {
    if (toggle_ev.state) {
        _record_type = 3;
    } else {
        _record_type = 1;
    }
};

var _toggleOSCRecord = function (toggle_ev) {
    if (toggle_ev.state) {
        _record_type = 2;
    } else {
        _record_type = 1;
    }
};

var _toggleAUDIORecord = function (toggle_ev) {
    _record_type = 1;
};

var _toggleALLRecord = function (toggle_ev) {
    if (toggle_ev.state) {
        _record_type = 0;
    } else {
        _record_type = 1;
    }
};

var _toggleAdditiveRecord = function () {
    if (_record_opts.f === _record_opts.additive) {
        _record_opts.f = _record_opts.default;
    } else {
        _record_opts.f = _record_opts.additive;
    }
};

var _toggleSubstractiveRecord = function () {
    if (_record_opts.f === _record_opts.substractive) {
        _record_opts.f = _record_opts.default;
    } else {
        _record_opts.f = _record_opts.substractive;
    }
};

var _toggleMultiplyRecord = function () {
    if (_record_opts.f === _record_opts.multiply) {
        _record_opts.f = _record_opts.default;
    } else {
        _record_opts.f = _record_opts.multiply;
    }
};

var _saveRecord = function () {
    var data_url = _record_canvas.toDataURL('image/png'),
        win;
    
    win = window.open();
    win.document.write("<img src='"+data_url+"'/>");
};

var _rewindRecording = function () {
    _record_position = 0;
    
    _record_canvas_ctx.clearRect(0, 0, _record_canvas.width, _record_canvas.height);
};

var _addRecordInput = function () {
    var tmp_image_data;

    tmp_image_data = _record_canvas_ctx.getImageData(0, 0, _record_canvas.width, _record_canvas.height);
    
    _imageDataToInput(tmp_image_data);
};

var _drawBrushHelper = function () {
    if (_paint_brush === null) {
        return;
    }
    
    var scale_x  = _paint_scalex,
        scale_y  = _paint_scaley,
        img    = _paint_brush,
        brush_width,
        brush_height,
        drawing_x,
        drawing_y,
        info_y = 0,
        info_txt = "",
        canvas_width_d2  = _c_helper.width / 2,
        canvas_height_d2 = _c_helper.height / 2;
    
    brush_width  = img.naturalWidth * scale_x;
    brush_height = img.naturalHeight * scale_y;
    
    // clear
    _c_helper.width = _c_helper.width;

    drawing_x = canvas_width_d2 - brush_width / 2;
    drawing_y = canvas_height_d2 - brush_height / 2;

    _c_helper_ctx.save();
    _c_helper_ctx.translate(canvas_width_d2, canvas_height_d2);
    _c_helper_ctx.rotate(_paint_angle);
    _c_helper_ctx.translate(drawing_x - canvas_width_d2, drawing_y - canvas_height_d2);
    _c_helper_ctx.scale(scale_x, scale_y);
    _c_helper_ctx.globalAlpha = _paint_opacity;
    _c_helper_ctx.drawImage(img, 0, 0);
    _c_helper_ctx.restore();
    
    brush_width = parseInt(brush_width, 10);
    brush_height = parseInt(brush_height, 10);
    
    if (brush_height > (window.innerHeight - 224)) {
        info_y = canvas_height_d2;
    } else {
        info_y = drawing_y + brush_height + 24;
    }
    
    if (img.naturalWidth === brush_width && img.naturalHeight === brush_height) {
        info_txt = parseInt(brush_width, 10) + "x" + parseInt(brush_height, 10);
    } else {
        info_txt = img.naturalWidth + "x" + img.naturalHeight + " - " + parseInt(brush_width, 10) + "x" + parseInt(brush_height, 10);
    }
    
    _c_helper_ctx.font = "14px Arial";
    _c_helper_ctx.textAlign = "center";
    _c_helper_ctx.fillStyle = "white";
    _c_helper_ctx.fillText(info_txt, canvas_width_d2, info_y);

    WUI.fadeIn(_c_helper);
    
    clearTimeout(_brush_helper_timeout);
    _brush_helper_timeout = setTimeout(function () {
            WUI.fadeOut(_c_helper);
        }, 2000);
};

/***********************************************************
    Init.
************************************************************/

var _uiInit = function () {
    _xhrContent("data/md/quickstart.md", function (md_content) {
        document.getElementById("fs_quickstart_content").innerHTML = _showdown_converter.makeHtml(md_content);
    });
    
    _xhrContent("data/md/uniforms.md", function (md_content) {
        var md_fieldset = document.createElement("fieldset"),
            md_fieldset_legend = document.createElement("legend"), 
            md_content_div = document.createElement("div"),
            doc_uniforms = document.getElementById("fs_documentation_uniforms");
        
        md_fieldset.className = "fs-fieldset";
        md_content_div.className = "fs-md-uniforms";
        
        md_fieldset_legend.innerHTML = "Pre-defined uniforms";
    
        md_fieldset.appendChild(md_fieldset_legend);
        md_fieldset.appendChild(md_content_div);
        doc_uniforms.appendChild(md_fieldset);

        _applyCollapsible(md_fieldset, md_fieldset_legend);

        md_content_div.innerHTML = _showdown_converter.makeHtml(md_content);
    });

    _xhrContent("data/md/pjs.md", function (md_content) {
        var md_fieldset = document.createElement("fieldset"),
            md_fieldset_legend = document.createElement("legend"), 
            md_content_div = document.createElement("div"),
            doc_uniforms = document.getElementById("fs_documentation_pjs");
        
        md_fieldset.className = "fs-fieldset";
        md_content_div.className = "fs-md-uniforms";
        
        md_fieldset_legend.innerHTML = "Pre-defined variables";
    
        md_fieldset.appendChild(md_fieldset_legend);
        md_fieldset.appendChild(md_content_div);
        doc_uniforms.appendChild(md_fieldset);

        _applyCollapsible(md_fieldset, md_fieldset_legend);

        md_content_div.innerHTML = _showdown_converter.makeHtml(md_content);

        md_content_div.innerHTML += '<br><br><a href="https://processing.org/reference/">Processing.js reference</a>';
    });
    
    // may don't scale at all in the future!
    var settings_ck_globaltime_elem = document.getElementById("fs_settings_ck_globaltime"),
        settings_ck_polyinfos_elem = document.getElementById("fs_settings_ck_polyinfos"),
        settings_ck_oscinfos_elem = document.getElementById("fs_settings_ck_oscinfos"),
        settings_ck_hlmatches_elem = document.getElementById("fs_settings_ck_hlmatches"),
        settings_ck_lnumbers_elem = document.getElementById("fs_settings_ck_lnumbers"),
        settings_ck_inerrors_elem = document.getElementById("fs_settings_ck_inerrors"),
        settings_ck_osderrors_elem = document.getElementById("fs_settings_ck_osderrors"),
        settings_ck_xscrollbar_elem = document.getElementById("fs_settings_ck_xscrollbar"),
        settings_ck_feedback_elem = document.getElementById("fs_settings_ck_feedback"),
        settings_ck_osc_out_elem = document.getElementById("fs_settings_ck_oscout"),
        settings_ck_osc_in_elem = document.getElementById("fs_settings_ck_oscin"),
        settings_ck_slices_elem = document.getElementById("fs_settings_ck_slices"),
        settings_ck_quickstart_elem = document.getElementById("fs_settings_ck_quickstart"),
        settings_ck_audio_elem = document.getElementById("fs_settings_ck_audio"),
        settings_ck_show_slice_chn_elem = document.getElementById("fs_settings_ck_show_slice_chn"),
        settings_ck_show_toolbar_title = document.getElementById("fs_settings_ck_show_toolbar_title"),
        
        fs_settings_show_toolbar_title = localStorage.getItem('fs-show-toolbar-title'),
        fs_settings_fps = localStorage.getItem('fs-fps'),
        fs_settings_compile_delay = localStorage.getItem("fs-compile-delay"),
        fs_settings_note_lifetime = localStorage.getItem('fs-note-lifetime'),
        fs_settings_max_polyphony = localStorage.getItem('fs-max-polyphony'),
        fs_settings_show_globaltime = localStorage.getItem('fs-show-globaltime'),
        fs_settings_show_polyinfos = localStorage.getItem('fs-show-polyinfos'),
        fs_settings_show_oscinfos = localStorage.getItem('fs-show-oscinfos'),
        fs_settings_hlmatches = localStorage.getItem('fs-editor-hl-matches'),
        fs_settings_lnumbers = localStorage.getItem('fs-editor-show-linenumbers'),
        fs_settings_xscrollbar = localStorage.getItem('fs-editor-advanced-scrollbar'),
        fs_settings_feedback = localStorage.getItem('fs-feedback'),
        fs_settings_osc_in = localStorage.getItem('fs-osc-in'),
        fs_settings_osc_out = localStorage.getItem('fs-osc-out'),
        fs_settings_quickstart = localStorage.getItem('fs-quickstart'),
        fs_settings_audio = localStorage.getItem('fs-audio'),
        fs_settings_show_slice_chn = localStorage.getItem('fs-show-slice-chn'),
        fs_settings_inerrors = localStorage.getItem('fs-editor-show-inerrors'),
        fs_settings_osderrors = localStorage.getItem('fs-editor-show-osderrors');
    
    _settings_dialog = WUI_Dialog.create(_settings_dialog_id, {
            title: "Session & global settings",

            width: "320px",
            height: "auto",

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: false,
            minimizable: true,
            draggable: true,
        
            header_btn: [
                {
                    title: "Help",
                    on_click: function () {
                        window.open(_documentation_link + "settings/"); 
                    },
                    class_name: "fs-help-icon"
                }
            ]
    });
    
    if (fs_settings_osc_in === "true") {
        settings_ck_osc_in_elem.checked = true;
    } else {
        settings_ck_osc_in_elem.checked = false;
    }
    
    if (fs_settings_osc_out === "true") {
        settings_ck_osc_out_elem.checked = true;
    } else {
        settings_ck_osc_out_elem.checked = false;
    }
    
    if (fs_settings_feedback === "true") {
        _feedback.enabled = true;
        settings_ck_feedback_elem.checked = true;
    } else if (fs_settings_feedback === null) {
        if (_feedback.enabled) {
            settings_ck_feedback_elem.checked = true;
        } else {
            settings_ck_feedback_elem.checked = false;
        }
    } else {
        _feedback.enabled = false;
        settings_ck_feedback_elem.checked = false;
    }
    
    if (fs_settings_max_polyphony) {
        _keyboard.polyphony_max = _parseInt10(fs_settings_max_polyphony);
    }
    
    if (fs_settings_note_lifetime) {
        _keyboard.note_lifetime = _parseInt10(fs_settings_note_lifetime);
    }

    if (fs_settings_fps) {
        _fas.fps = _parseInt10(fs_settings_fps);
    }

    if (fs_settings_compile_delay) {
        _compile_delay_ms = _parseInt10(fs_settings_compile_delay);
    }
    
    if (fs_settings_show_globaltime !== null) {
        _show_globaltime = (fs_settings_show_globaltime === "true");
    }
    
    if (fs_settings_show_oscinfos !== null) {
        _show_oscinfos = (fs_settings_show_oscinfos === "true");
    }
    
    if (fs_settings_show_polyinfos !== null) {
        _show_polyinfos = (fs_settings_show_polyinfos === "true");
    }

    if (fs_settings_hlmatches !== null) {
        _cm_highlight_matches = (fs_settings_hlmatches === "true");
    }
        
    if (fs_settings_lnumbers !== null) {
        _cm_show_linenumbers = (fs_settings_lnumbers === "true");
    }
        
    if (fs_settings_inerrors !== null) {
        _cm_show_inerrors = (fs_settings_inerrors === "true");
    }

    if (fs_settings_osderrors !== null) {
        _cm_show_osderrors = (fs_settings_osderrors === "true");
    }

    if (fs_settings_xscrollbar !== null) {
        _cm_advanced_scrollbar = (fs_settings_xscrollbar === "true");
    }
/*
    if (fs_settings_quickstart  === "true") {
        settings_ck_quickstart_elem.checked = true;
    } else {
        settings_ck_quickstart_elem.checked = false;
    }
*/  
    _quickstart_on_startup = fs_settings_quickstart;
    
    if (_cm_advanced_scrollbar) {
        settings_ck_xscrollbar_elem.checked = true;
    } else {
        settings_ck_xscrollbar_elem.checked = false;
    }
    
    if (_show_oscinfos) {
        settings_ck_oscinfos_elem.checked = true;
    } else {
        settings_ck_oscinfos_elem.checked = false;
    }
    
    if (_show_polyinfos) {
        settings_ck_polyinfos_elem.checked = true;
    } else {
        settings_ck_polyinfos_elem.checked = false;
    }

    if (_show_globaltime) {
        settings_ck_globaltime_elem.checked = true;
    } else {
        settings_ck_globaltime_elem.checked = false;
    }
    
    if (_cm_highlight_matches) {
        settings_ck_hlmatches_elem.checked = true;
    } else {
        settings_ck_hlmatches_elem.checked = false;
    }
    
    if (_cm_show_linenumbers) {
        settings_ck_lnumbers_elem.checked = true;
    } else {
        settings_ck_lnumbers_elem.checked = false;
    }

    if (_cm_show_inerrors) {
        settings_ck_inerrors_elem.checked = true;
    } else {
        settings_ck_inerrors_elem.checked = false;
    }

    if (_cm_show_osderrors) {
        settings_ck_osderrors_elem.checked = true;
    } else {
        settings_ck_osderrors_elem.checked = false;
    }

    if (fs_settings_audio !== null) {
        _audio_off = !(fs_settings_audio === "true");
    }

    if (_audio_off) {
        settings_ck_audio_elem.checked = true;
    } else {
        settings_ck_audio_elem.checked = false;
    }

    if (fs_settings_show_slice_chn === "true") {
        settings_ck_show_slice_chn_elem.checked = true;
    } else {
        settings_ck_show_slice_chn_elem.checked = false;
    }

    if (fs_settings_show_toolbar_title === "true") {
        settings_ck_show_toolbar_title.checked = true;
    } else {
        settings_ck_show_toolbar_title.checked = false;
    }

    settings_ck_osc_in_elem.addEventListener("change", function () {
            if (this.checked) {
                _osc.in = true;
                
                _oscEnable();
            } else {
                _osc.in = false;
                
                _oscDisable();
            }
        
            localStorage.setItem('fs-osc-in', this.checked);
        });
    
    settings_ck_osc_out_elem.addEventListener("change", function () {
            if (this.checked) {
                _osc.out = true;
                
                _oscEnable();
            } else {
                _osc.out = false;
                
                _oscDisable();
            }
        
            localStorage.setItem('fs-osc-out', this.checked);
        });

    settings_ck_feedback_elem.addEventListener("change", function () {
            //var buffer_target_element = document.getElementById("fs_buffer_target");

            if (this.checked) {
                _feedback.enabled = true;

               // buffer_target_element.style.display = "";
            } else {
                _feedback.enabled = false;
/*
                buffer_target_element.style.display = "none";

                if (_isWorkspaceActive("fs_buffer_target")) {
                    _showWorkspace(0)();
                }
*/
            }
        
            localStorage.setItem('fs-feedback', this.checked);
        
            _buildFeedback();
        });
    
    settings_ck_oscinfos_elem.addEventListener("change", function () {
            _show_oscinfos = this.checked;
        
            if (!_show_oscinfos) {
                _osc_infos.innerHTML = "";
            }
        
            localStorage.setItem('fs-show-oscinfos', _show_oscinfos);
        });
    
    settings_ck_polyinfos_elem.addEventListener("change", function () {
            _show_polyinfos = this.checked;
        
            if (!_show_polyinfos) {
                _poly_infos_element.innerHTML = "";
            }
        
            localStorage.setItem('fs-show-polyinfos', _show_polyinfos);
        });
    
    settings_ck_slices_elem.addEventListener("change", function () {
            var elements = document.getElementsByClassName("play-position-marker"),
                i = 0;
        
            if (!this.checked) {
                for(i = elements.length - 1; i >= 0; --i) {
                    elements[i].classList.add("fs-hide");
                }   
            } else {
                for(i = elements.length - 1; i >= 0; --i) {
                    elements[i].classList.remove("fs-hide");
                } 
            }
        });

    settings_ck_globaltime_elem.addEventListener("change", function () {
            _show_globaltime = this.checked;
        
            if (!_show_globaltime) {
                _time_infos.innerHTML = "";
            }
        
            localStorage.setItem('fs-show-globaltime', _show_globaltime);
        });
    
    settings_ck_hlmatches_elem.addEventListener("change", function () {
            _cm_highlight_matches = this.checked;
        
            if (_cm_highlight_matches) {
                _code_editor_settings.highlightSelectionMatches = _code_editor_highlight;
                
                _applyEditorsOption("highlightSelectionMatches", _code_editor_highlight);
            } else {
                delete _code_editor_settings.highlightSelectionMatches;
                
                _applyEditorsOption("highlightSelectionMatches", null);
            }
        
            localStorage.setItem('fs-editor-hl-matches', _cm_highlight_matches);
        });

    settings_ck_lnumbers_elem.addEventListener("change", function () {
            _cm_show_linenumbers = this.checked;
        
            _code_editor_settings.lineNumbers = _cm_show_linenumbers;
        
            _applyEditorsOption("lineNumbers", _cm_show_linenumbers);
        
            localStorage.setItem('fs-editor-show-linenumbers', _cm_show_linenumbers);
        });

    settings_ck_inerrors_elem.addEventListener("change", function () {
            _cm_show_inerrors = this.checked;
        
            localStorage.setItem('fs-editor-show-inerrors', _cm_show_inerrors);

            _glsl_compilation();
        });

    settings_ck_osderrors_elem.addEventListener("change", function () {
            _cm_show_osderrors = this.checked;
        
            localStorage.setItem('fs-editor-show-osderrors', _cm_show_osderrors);

            _fail("");

            _glsl_compilation();
        });

    settings_ck_xscrollbar_elem.addEventListener("change", function () {
            _cm_advanced_scrollbar = this.checked;
        
            if (_cm_advanced_scrollbar) {
                _code_editor_settings.scrollbarStyle = "overlay";
                
                _applyEditorsOption("scrollbarStyle", "overlay");
            } else {
                _code_editor_settings.scrollbarStyle = "native";
                
                _applyEditorsOption("scrollbarStyle", "native");
            }
        
            localStorage.setItem('fs-editor-advanced-scrollbar', _cm_advanced_scrollbar);
        });
/*
    settings_ck_quickstart_elem.addEventListener("change", function () {
            _quickstart_on_startup = this.checked;
        
            localStorage.setItem('fs-quickstart', _quickstart_on_startup);
        
            if (!_quickstart_on_startup) {
                WUI_Dialog.close(_quickstart_dialog);
            }
        });
*/  

    settings_ck_audio_elem.addEventListener("change", function () {
        if (this.checked) {
            _audio_off = true;
            _fasDisable();
        } else {
            _audio_off = false;
            _fasEnable();
        }
    
        localStorage.setItem('fs-audio', !this.checked);
    });

    settings_ck_show_slice_chn_elem.addEventListener("change", function () {
        if (this.checked) {
            _show_output_channels = true;
        } else {
            _show_output_channels = false;
        }

        _updateSliceChnVisibility();
    
        localStorage.setItem('fs-show-slice-chn', this.checked);
    });

    settings_ck_show_toolbar_title.addEventListener("change", function () {
        localStorage.setItem('fs-show-toolbar-title', this.checked);
    });
    
    settings_ck_oscinfos_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_polyinfos_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_globaltime_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_hlmatches_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_lnumbers_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_inerrors_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_osderrors_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_xscrollbar_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_feedback_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_osc_in_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_osc_out_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_slices_elem.dispatchEvent(new UIEvent('change'));
//    settings_ck_quickstart_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_audio_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_show_slice_chn_elem.dispatchEvent(new UIEvent('change'));
    settings_ck_show_toolbar_title.dispatchEvent(new UIEvent('change'));
    
    _midi_settings_dialog = WUI_Dialog.create(_midi_settings_dialog_id, {
            title: "MIDI I/O",

            width: "320px",
            height: "480px",
        
            min_height: 120,

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: true,
            minimizable: true,
            draggable: true,
        
            on_detach: function (new_window) {
                new_window.document.body.style.overflow = "hidden";
            },
        
            header_btn: [
                {
                    title: "Help",
                    on_click: function () {
                        window.open(_documentation_link + "midi/"); 
                    },
                    class_name: "fs-help-icon"
                }
            ]
        });
    
    _record_dialog = WUI_Dialog.create(_record_dialog_id, {
            title: "Recording...",

            width: "auto",
            height: "auto",

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: true,
            minimizable: false,
            draggable: true,
        
            on_close: _onRecordDialogClose,

            header_btn: [
                {
                    title: "Help",
                    on_click: function () {
                        window.open(_documentation_link + "record_dialog/"); 
                    },
                    class_name: "fs-help-icon"
                }
            ],
        
            on_detach: function (new_window) {
                var previous_canvas = _record_canvas;
                
                _record_canvas = new_window.document.getElementById("fs_record_canvas");
                _record_canvas_ctx = _record_canvas.getContext('2d');

                _record_canvas_ctx.drawImage(previous_canvas, 0, 0);
            }
        });
    
    
    _fas_dialog = WUI_Dialog.create(_fas_dialog_id, {
            title: "Audio Server",

            width: "auto",
            height: "auto",
        
            min_width: 340,
            min_height: 80,

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: true,
            minimizable: true,
            draggable: true,
        
            on_detach: function (new_window) {
                _createFasSettingsContent();
            },
        
            header_btn: [
                {
                    title: "Help",
                    on_click: function () {
                        window.open(_documentation_link + "audio_server/"); 
                    },
                    class_name: "fs-help-icon"
                }
            ]
        });
    
    _fas_synth_params_dialog = WUI_Dialog.create(_fas_synth_params_dialog_id, {
        title: "Instruments parameters",

        width: "auto",
        height: "auto",
    
        min_width: 340,
        min_height: 80,

        halign: "center",
        valign: "center",

        open: false,

        status_bar: false,
        detachable: true,
        minimizable: true,
        draggable: true,
    
        on_detach: function (new_window) {
            _createSynthParametersContent();
        },
    
        header_btn: [
            {
                title: "Help",
                on_click: function () {
                    window.open(_documentation_link + "audio_server/"); 
                },
                class_name: "fs-help-icon"
            }
        ]
    });
    
    _import_dialog = WUI_Dialog.create(_import_dialog_id, {
            title: "Import dialog (images etc.)",

            width: "620px",
            height: "auto",
            min_height: "80px",

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: true,
            minimizable: true,
            draggable: true,

            on_detach: function (new_window) {
                var detached_dropzone = new_window.document.getElementById("fs_import_dropzone");
                _createImportDropzone(detached_dropzone);

                _createImportListeners(new_window.document);

                _updateImportWidgets(new_window.document);
            },
        
            on_close: _onImportDialogClose,
        
            header_btn: [
                {
                    title: "Help",
                    on_click: function () {
                        window.open(_documentation_link + "import/"); 
                    },
                    class_name: "fs-help-icon"
                }
            ]
        });
    
    WUI_ToolBar.create("fs_import_toolbar", {
                allow_groups_minimize: false
            },
            {
                acts: [
                    {
                        icon: "fs-image-file-icon",
                        on_click: (function () { _loadFile("image")(); }),
                        tooltip: "Image",
                        text: "Img"
                    },
                    {
                        icon: "fs-audio-file-icon",
                        on_click: (function () { _loadFile("audio")(); }),
                        tooltip: "Audio",
                        text: "Snd"
                    },
                    {
                        icon: "fs-video-icon",
                        on_click: (function () { _loadFile("video")(); }),
                        tooltip: "Video",
                        text: "Vid"
                    },
                    {
                        icon: "fs-camera-icon",
                        on_click: (function () { _addFragmentInput("camera"); }),
                        tooltip: "Webcam",
                        text: "Cam"
                    },
                    {
                        icon: "fs-mic-icon",
                        on_click: (function () { _addFragmentInput("mic"); }),
                        tooltip: "Microphone",
                        text: "Mic"
                    },
                    {
                        icon: "fs-dsk-icon",
                        on_click: (function () { _addFragmentInput("desktop"); }),
                        tooltip: "Desktop",
                        text: "Dsk"
                    },
                    {
                        icon: "fs-canvas-icon",
                        on_click: (function () { _addFragmentInput("canvas"); }),
                        tooltip: "Cvs",
                        text: "Cvs"
                    },
                    {
                        icon: "fs-pjs-icon",
                        on_click: (function () { _addFragmentInput("processing.js"); }),
                        tooltip: "Pjs",
                        text: "Pjs"
                    }
                ]
            });
    
    _outline_dialog = WUI_Dialog.create(_outline_dialog_id, {
            title: "GLSL Outline",

            width: "380px",
            height: "auto",
        
            min_height: 32,

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: true,
            minimizable: true,
            draggable: true,
        
            on_detach: function (new_window) {
                new_window.document.body.style.overflow = "hidden";
            },

            on_open: function () {
                _updateOutline(0);
                _updateOutline(1);
            }
        });
    
    WUI_Dialog.create("fs_username_dialog", {
        title: "Global Username",

        width: "280px",
        height: "auto",
    
        min_height: 32,

        halign: "center",
        valign: "center",

        open: false,
        modal: true,

        status_bar: false,
        detachable: false,
        draggable: true,

        on_open: function () {
            var input = document.getElementById("fs_username_input");

            input.focus();
            input.select();
        }
    });

    _slices_dialog = WUI_Dialog.create(_slices_dialog_id, {
        title: "Instruments",

        width: "280px",
        height: "auto",
    
        min_height: 16,

        halign: "center",
        valign: "center",

        on_open: _openedSlicesDialog,
        on_close: _closedSlicesDialog,

        open: false,

        status_bar: false,
        detachable: true,
        draggable: true,
        minimizable: true,
    
        header_btn: [
            {
                title: "Help",
                on_click: function () {
                    window.open(_documentation_link + "instruments/"); 
                },
                class_name: "fs-help-icon"
            }
        ]
    });
    
    _samples_dialog = WUI_Dialog.create(_samples_dialog_id, {
        title: "File Manager - Grains / samples",

        width: "480px",
        height: "540px",
    
        min_height: 16,

        halign: "center",
        valign: "center",

        on_open: _refreshFileManager(_samples_dialog_id, "grains"),
        on_close: _closeFileManager(_samples_dialog_id),
        on_detach: _refreshFileManager(_samples_dialog_id, "grains"),

        open: false,

        status_bar: false,
        detachable: true,
        draggable: true,
        minimizable: true,
        resizable: true,
    
        header_btn: [
            {
                title: "Help",
                on_click: function () {
                    window.open(_documentation_link + "tools/#ffs-audio-server-files-manager"); 
                },
                class_name: "fs-help-icon"
            }
        ]
    });

    _waves_dialog = WUI_Dialog.create(_waves_dialog_id, {
        title: "File Manager - Waves (wavetable)",

        width: "480px",
        height: "540px",
    
        min_height: 16,

        halign: "center",
        valign: "center",

        on_open: _refreshFileManager(_waves_dialog_id, "waves"),
        on_close: _closeFileManager(_waves_dialog_id),
        on_detach: _refreshFileManager(_waves_dialog_id, "waves"),

        open: false,

        status_bar: false,
        detachable: true,
        draggable: true,
        minimizable: true,
        resizable: true,
    
        header_btn: [
            {
                title: "Help",
                on_click: function () {
                    window.open(_documentation_link + "tools/#ffs-audio-server-files-manager"); 
                },
                class_name: "fs-help-icon"
            }
        ]
    });

    _impulses_dialog = WUI_Dialog.create(_impulses_dialog_id, {
        title: "File Manager - Impulses",

        width: "480px",
        height: "540px",
    
        min_height: 16,

        halign: "center",
        valign: "center",

        on_open: _refreshFileManager(_impulses_dialog_id, "impulses"),
        on_close: _closeFileManager(_impulses_dialog_id),
        on_detach: _refreshFileManager(_impulses_dialog_id, "impulses"),

        open: false,

        status_bar: false,
        detachable: true,
        draggable: true,
        minimizable: true,
        resizable: true,
    
        header_btn: [
            {
                title: "Help",
                on_click: function () {
                    window.open(_documentation_link + "tools/#ffs-audio-server-files-manager"); 
                },
                class_name: "fs-help-icon"
            }
        ]
    });

    _faust_gens_dialog = WUI_Dialog.create(_faust_gens_dialog_id, {
        title: "File Manager - Faust generators",

        width: "480px",
        height: "540px",
    
        min_height: 16,

        halign: "center",
        valign: "center",

        on_open: _refreshFileManager(_faust_gens_dialog_id, "generators"),
        on_close: _closeFileManager(_faust_gens_dialog_id),
        on_detach: _refreshFileManager(_faust_gens_dialog_id, "generators"),

        open: false,

        status_bar: false,
        detachable: true,
        draggable: true,
        minimizable: true,
        resizable: true,
    
        header_btn: [
            {
                title: "Help",
                on_click: function () {
                    window.open(_documentation_link + "tools/#ffs-audio-server-files-manager"); 
                },
                class_name: "fs-help-icon"
            }
        ]
    });

    _faust_effs_dialog = WUI_Dialog.create(_faust_effs_dialog_id, {
        title: "File Manager - Faust effects",

        width: "480px",
        height: "540px",
    
        min_height: 16,

        halign: "center",
        valign: "center",

        on_open: _refreshFileManager(_faust_effs_dialog_id, "effects"),
        on_close: _closeFileManager(_faust_effs_dialog_id),
        on_detach: _refreshFileManager(_faust_effs_dialog_id, "effects"),

        open: false,

        status_bar: false,
        detachable: true,
        draggable: true,
        minimizable: true,
        resizable: true,
    
        header_btn: [
            {
                title: "Help",
                on_click: function () {
                    window.open(_documentation_link + "tools/#ffs-audio-server-files-manager"); 
                },
                class_name: "fs-help-icon"
            }
        ]
    });
/*
    _analysis_dialog = WUI_Dialog.create(_analysis_dialog_id, {
            title: "Audio analysis",

            width: "380px",
            height: "380px",

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: false,
            draggable: true,
        
            on_close: _disconnectAnalyserNode
        });
*/

    _help_dialog = WUI_Dialog.create(_help_dialog_id, {
            title: "Fragment - Help",

            width: "440px",
            height: "auto",

            halign: "center",
            valign: "center",

            open: false,

            status_bar: false,
            detachable: true,
            draggable: true,
            minimizable: true,
            
            top: 200
        });
    
    _paint_dialog = WUI_Dialog.create(_paint_dialog_id, {
            title: "Paint tools",

            width: "400px",
            height: "520px",

            halign: "center",
            valign: "center",

            open: false,

            detachable: true,
            resizable: true,

            status_bar: false,
            draggable: true,
            minimizable: true,
        
            on_detach: function (new_window) {
                new_window.document.body.style.overflow = "hidden";
            },
        
            header_btn: [
                {
                    title: "Help",
                    on_click: function () {
                        window.open(_documentation_link + "canvas_import/"); 
                    },
                    class_name: "fs-help-icon"
                }
            ]
        });
    
    _quickstart_dialog = WUI_Dialog.create(_quickstart_dialog_id, {
            title: "Fragment Quickstart guide",

            width: Math.min(Math.round(window.innerWidth * 0.9), 840) + "px",
            height: Math.min(Math.round(window.innerHeight * 0.9), 740) + "px",

            halign: "center",
            valign: "center",

            open: _quickstart_on_startup,

            detachable: true,

            status_bar: true,
            status_bar_content: _motd,
            draggable: true,
            minimizable: true,
        
            header_btn: [
                {
                    title: "Help",
                    on_click: function () {
                        window.open(_documentation_link + "getting_started/"); 
                    },
                    class_name: "fs-help-icon"
                }
            ]
    });

    WUI_Tabs.create("fs_help_tabs", {
        height: "auto"
    });

    WUI_ToolBar.create("fs_record_toolbar", {
                allow_groups_minimize: false
            },
            {
                ctrl: [
                    {
                        icon: "fs-reset-icon",
                        on_click: _rewindRecording,
                        tooltip: "Reset recording"
                    }
                ],
                type: [
                    {
                        icon: "fs-midi-icon",
                        type: "toggle",
                        toggle_state: false,
                        on_click: _toggleMIDIRecord,
                        tooltip: "Only show MIDI output",
                        toggle_group: 0
                    },
                    {
                        icon: "fs-osc-icon",
                        type: "toggle",
                        toggle_state: false,
                        on_click: _toggleOSCRecord,
                        tooltip: "Only show OSC output",
                        toggle_group: 0
                    },
                    {
                        icon: "fs-fas-icon",
                        type: "toggle",
                        toggle_state: true,
                        on_click: _toggleAUDIORecord,
                        tooltip: "Only show AUDIO output",
                        toggle_group: 0
                    },
                    {
                        icon: "fs-all-icon",
                        type: "toggle",
                        toggle_state: false,
                        on_click: _toggleALLRecord,
                        tooltip: "Show all output",
                        toggle_group: 0
                    }
                ],
                opts: [
                    {
                        icon: "fs-plus-symbol-icon",
                        type: "toggle",
                        toggle_state: false,
                        on_click: _toggleAdditiveRecord,
                        tooltip: "Additive",
                        toggle_group: 1
                    },
                    {
                        icon: "fs-minus-symbol-icon",
                        type: "toggle",
                        toggle_state: false,
                        on_click: _toggleSubstractiveRecord,
                        tooltip: "Substractive",
                        toggle_group: 1
                    },
                    {
                        icon: "fs-multiply-symbol-icon",
                        type: "toggle",
                        toggle_state: false,
                        on_click: _toggleMultiplyRecord,
                        tooltip: "Multiply",
                        toggle_group: 1
                    }
                ],
                acts: [
                    {
                        icon: "fs-plus-icon",
                        on_click: _addRecordInput,
                        tooltip: "Add as input"
                    },
                    {
                        icon: "fs-audio-file-icon",
                        on_click: _exportRecord,
                        tooltip: "Export as .wav (additive synthesis)"
                    },
                    {
                        icon: "fs-save-icon",
                        on_click: _saveRecord,
                        tooltip: "Save as PNG"
                    }
                ]
            });
    
    WUI_ToolBar.create("fs_paint_toolbar", {
            allow_groups_minimize: false
        },
        {
            acts: [
                {
                    icon: "fs-eraser-icon",
                    on_click: function () {
                        _canvasInputClear(_selected_input_canvas);
                        _canvasInputUpdate(_selected_input_canvas);
                    },
                    tooltip: "Clear canvas"
                },
                {
                    icon: "fs-lockx-icon",
                    type: "toggle",
                    toggle_state: false,
                    on_click: function () {
                        _paint_lock_x = !_paint_lock_x;
                    },
                    tooltip: "Lock horizontal axis"
                },
                {
                    icon: "fs-locky-icon",
                    type: "toggle",
                    toggle_state: false,
                    on_click: function () {
                        _paint_lock_y = !_paint_lock_y;
                    },
                    tooltip: "Lock vertical axis"
                },
                {
                    icon: "fs-dice-icon",
                    type: "toggle",
                    toggle_state: false,
                    on_click: function () {
                        _paint_random = !_paint_random;
                    },
                    tooltip: "Randomize scale, opacity and angle"
                }
            ],
            compositing: [
                {
                    text: "Compositing",
                    tooltip: "Compositing method",
                    type: "dropdown",
                    
                    orientation: "s",
                    dropdown_items_width: "80px",

                    items: [
                      {
                        title: "source-over",
                        on_click: _setPaintCompositingMode("source-over")
                      },
                      {
                        title: "source-in",
                        on_click: _setPaintCompositingMode("source-in")
                      },
                      {
                        title: "source-out",
                        on_click: _setPaintCompositingMode("source-out")
                      },
                      {
                        title: "source-atop",
                        on_click: _setPaintCompositingMode("source-atop")
                      },
                      {
                        title: "destination-over",
                        on_click: _setPaintCompositingMode("destination-over")
                      },
                      {
                        title: "destination-in",
                        on_click: _setPaintCompositingMode("destination-in")
                      },
                      {
                        title: "destination-out",
                        on_click: _setPaintCompositingMode("destination-out")
                      },
                      {
                        title: "destination-atop",
                        on_click: _setPaintCompositingMode("destination-atop")
                      },
                      {
                        title: "lighter",
                        on_click: _setPaintCompositingMode("lighter")
                      },
                      {
                        title: "copy",
                        on_click: _setPaintCompositingMode("copy")
                      },
                      {
                        title: "xor",
                        on_click: _setPaintCompositingMode("xor")
                      },
                      {
                        title: "multiply",
                        on_click: _setPaintCompositingMode("multiply")
                      },
                      {
                        title: "screen",
                        on_click: _setPaintCompositingMode("screen")
                      },
                      {
                        title: "overlay",
                        on_click: _setPaintCompositingMode("overlay")
                      },
                      {
                        title: "darken",
                        on_click: _setPaintCompositingMode("darken")
                      },
                      {
                        title: "lighten",
                        on_click: _setPaintCompositingMode("lighten")
                      },
                      {
                        title: "color-dodge",
                        on_click: _setPaintCompositingMode("color-dodge")
                      },
                      {
                        title: "color-burn",
                        on_click: _setPaintCompositingMode("color-burn")
                      },
                      {
                        title: "hard-light",
                        on_click: _setPaintCompositingMode("hard-light")
                      },
                      {
                        title: "soft-light",
                        on_click: _setPaintCompositingMode("soft-light")
                      },
                      {
                        title: "difference",
                        on_click: _setPaintCompositingMode("difference")
                      },
                      {
                        title: "exclusion",
                        on_click: _setPaintCompositingMode("exclusion")
                      },
                      {
                        title: "hue",
                        on_click: _setPaintCompositingMode("hue")
                      },
                      {
                        title: "saturation",
                        on_click: _setPaintCompositingMode("saturation")
                      },
                      {
                        title: "color",
                        on_click: _setPaintCompositingMode("color")
                      },
                      {
                        title: "luminosity",
                        on_click: _setPaintCompositingMode("luminosity")
                      }
                    ]
                }
            ]
        });

    _wui_main_toolbar = WUI_ToolBar.create("fs_middle_toolbar", {
            allow_groups_minimize: false,
            show_groups_title: localStorage.getItem('fs-show-toolbar-title') === "true" ? true : false,
            groups_title_orientation: "s"
        },
        {
            "Help": [
                {
                    id: "fs_tb_help",
                    icon: "fs-help-icon",
                    on_click: _showHelpDialog,
                    tooltip: "Help"
                }
            ],
            "Social": [
                {
                    id: "fs_tb_chat",
                    icon: "fs-discuss-icon",
                    on_click: function () {
                        WUI_Dialog.open(_discuss_dialog_id);
                    },
                    tooltip: "Session chat"
                },
                {
                    id: "fs_tb_forum",
                    icon: "fs-board-icon",
                    on_click: function () {
                        window.open("https://quiet.fsynth.com", '_blank');
                    },
                    tooltip: "Message board"
                }
            ],
            "Settings": [
                {
                    id: "fs_tb_settings",
                    icon: "fs-gear-icon",
                    on_click: _showSettingsDialog,
                    tooltip: "Settings"
                },
                {
                    id: "fs_tb_midi_settings",
                    icon: "fs-midi-icon",
                    on_click: _showMIDISettingsDialog,
                    tooltip: "MIDI Settings"
                }
            ],
            "Transport": [
                {
                    id: "fs_tb_reset",
                    icon: "fs-reset-icon",
                    on_click: _rewind,
                    tooltip: "Rewind (globalTime = 0)"
                },
                {
                    id: "fs_tb_pause",
                    icon: "fs-pause-icon",
                    type: "toggle",
                    toggle_state: (_fs_state === 1 ? true : false),
                    on_click: _togglePlay,
                    tooltip: "Play/Pause"
                },
                {
                    id: "fs_tb_record",
                    icon: "fs-record-icon",
                    on_click: _showRecordDialog,
                    tooltip: "Record"
                }
            ],
            "Synth": [
                {
                    id: "fs_tb_fas_settings",
                    icon: "fs-fas-icon",
                    on_click: _showFasDialog,
                    tooltip: "Audio server settings"
                }
            ],
            "Tools": [
                {
                    id: "fs_tb_shadertoy",

                    icon: "fs-shadertoy-icon",

                    toggle_state: false,

                    tooltip: "Convert Shadertoy shader",

                    on_click: function () {
                        var input_code  = _current_code_editor.editor.getValue(),
                            output_code = input_code;

                        output_code = output_code.replace(/void\s+mainImage\s*\(\s*out\s+vec4\s*[a-zA-Z]+,\s*(in)?\s+vec2\s+[a-zA-Z]+\s*\)/, "void main ()");
                        output_code = output_code.replace(/fragCoord/g, "gl_FragCoord");
                        output_code = output_code.replace(/fragColor/g, "gl_FragColor");
                        output_code = output_code.replace(/iResolution/g, "resolution");
                        output_code = output_code.replace(/iTime/g, "globalTime");
                        output_code = output_code.replace(/iMouse/g, "mouse");
                        output_code = output_code.replace(/iChannel/g, "iInput");

                        _current_code_editor.editor.setValue(output_code);

                        _compile();
                    }
                },
                {
                    id: "fs_tb_xyf",
                    icon: "fs-xyf-icon",
                    type: "toggle",
                    toggle_state: _xyf_grid,
                    on_click: _toggleGridInfos,
                    tooltip: "Hide/Show mouse hover axis grid"
                }/*, // DISABLED
                {
                    icon: "fs-spectrum-icon",
                    on_click: _showSpectrumDialog,
                    tooltip: "Audio analysis dialog"
                }*/,
                {
                    id: "fs_tb_outline",
                    icon: "fs-function-icon",
                    on_click: _showOutlineDialog,
                    tooltip: "Outline"
                },
                {
                    id: "fs_tb_code",
                    icon: "fs-code-icon",
                    on_click: _detachCodeEditor,
                    tooltip: "Clone the GLSL editor into a separate window"
                }
            ],
            "Import": [
/*
                // DISABLED
                {
                    icon: "fs-controls-icon",
                    on_click: _showControlsDialog,
                    tooltip: "Controllers input"
                },
*/
                {
                    id: "fs_tb_import",
                    icon: _icon_class.plus,
                    type: "toggle",
                    on_click: _showImportDialog,
                    tooltip: "Import Fragment input"
                }
            ]
        });
    
    WUI_RangeSlider.create("fs_paint_slider_delay",  {
            width: 120,
            height: 8,

            min: 0,
            max: 500,

            step: 1,

            midi: true,
        
            default_value: _paint_delay,
            value: _paint_delay,

            title: "Brush spacing",

            title_min_width: 110,
            value_min_width: 48,

            configurable: {
                min: {},
                max: {},
                step: {},
                scroll_step: {}
            },

            on_change: function (value) {
                _paint_delay = parseFloat(value);
            }
        });
    
    WUI_RangeSlider.create("fs_paint_slider_scalex",  {
            width: 120,
            height: 8,

            min: 0,
            max: 10,

            //step: "any",

            midi: true,
        
            default_value: _paint_scalex,
            value: _paint_scalex,

            title: "Brush scale x",

            title_min_width: 110,
            value_min_width: 48,

            configurable: {
                min: {},
                max: {},
                step: {},
                scroll_step: {}
            },

            on_change: function (value) {
                _paint_scalex = value;
                
                _drawBrushHelper();
            }
        });
    
    WUI_RangeSlider.create("fs_paint_slider_scaley",  {
            width: 120,
            height: 8,

            min: 0,
            max: 10,

            //step: "any",
        
            midi: true,
        
            default_value: _paint_scaley,
            value: _paint_scaley,

            title: "Brush scale y",

            title_min_width: 110,
            value_min_width: 48,

            configurable: {
                min: {},
                max: {},
                step: {},
                scroll_step: {}
            },

            on_change: function (value) {
                _paint_scaley = parseFloat(value);
                
                _drawBrushHelper();
            }
        });
    
    WUI_RangeSlider.create("fs_paint_slider_opacity", {
            width: 120,
            height: 8,

            min: 0.0,
            max: 1.0,

            //step: "any",
            scroll_step: 0.01,

            midi: true,

            default_value: _paint_opacity,
            value: _paint_opacity,

            title: "Brush opacity",

            title_min_width: 110,
            value_min_width: 48,
        
            configurable: {
                step: {},
                scroll_step: {}
            },

            on_change: function (value) {
                _paint_opacity = parseFloat(value);
                
                _drawBrushHelper();
            }
        });

    WUI_RangeSlider.create("fs_paint_slider_angle", {
            width: 120,
            height: 8,

            min: 0.0,
            max: 360.0,

            //step: "any",
            scroll_step: 0.01,

            midi: true,

            default_value: _paint_angle,
            value: _paint_angle,

            title: "Brush angle",

            title_min_width: 110,
            value_min_width: 48,
        
            configurable: {
                step: {},
                scroll_step: {}
            },

            on_change: function (value) {
                _paint_angle = _degToRad(parseFloat(value));
                
                _drawBrushHelper();
            }
        });

    WUI_RangeSlider.create("fs_score_width_input", {
            width: 120,
            height: 8,

            min: 0,

            bar: false,

            step: 1,
            scroll_step: 1,

            default_value: _canvas_width,
            value: _canvas_width,

            title: "Score width",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (new_width) { _updateScore({ width: new_width }, true); }
        });

    WUI_RangeSlider.create("fs_score_height_input", {
            width: 120,
            height: 8,

            min: 16,

            bar: false,

            step: 1,
            scroll_step: 1,

            default_value: _canvas_height,
            value: _canvas_height,

            title: "Score height (resolution)",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (new_height) { _updateScore({ height: new_height }, true); }
        });

    WUI_RangeSlider.create("fs_score_base_input", {
            width: 120,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 0.01,
        
            decimals: 2,

            default_value: 16.34,
            value: 16.34,

            title: "Score base frequency",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (new_base_freq) { _updateScore({ base_freq: new_base_freq }, true); }
        });

    WUI_RangeSlider.create("fs_score_octave_input", {
            width: 120,
            height: 8,

            min: 1,

            bar: false,

            step: 1,
            scroll_step: 1,

            default_value: 10,
            value: 10,

            title: "Score octave range",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (new_range) { _updateScore({ octave: new_range }, true); }
        });
    
    WUI_RangeSlider.create("fs_settings_max_polyphony", {
            width: 120,
            height: 8,

            min: 1,
        
            bar: false,

            step: 1,
            scroll_step: 1,

            default_value: _keyboard.polyphony_max,
            value: _keyboard.polyphony_max,

            title: "Polyphony",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (polyphony) {
                if (polyphony <= 0) {
                    return;
                }
                
                _keyboard.polyphony_max = polyphony;
                
                localStorage.setItem('fs-max-polyphony', _keyboard.polyphony_max);
                
                _keyboard.data = [];
                _keyboard.data_length = _keyboard.polyphony_max * _keyboard.data_components;

                _MIDInotesCleanup();
                
                _compile();
            }
        });
    
    WUI_RangeSlider.create("fs_settings_note_lifetime", {
            width: 120,
            height: 8,

            min: 0,
        
            bar: false,

            step: "any",
            scroll_step: 10,

            default_value: _keyboard.note_lifetime,
            value: _keyboard.note_lifetime,

            title: "Note lifetime (ms)",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (note_lifetime) {
                if (note_lifetime <= 0) {
                    return;
                }
                
                _keyboard.note_lifetime = note_lifetime;
                
                localStorage.setItem('fs-note-lifetime', _keyboard.note_lifetime);
            }
        });

        WUI_RangeSlider.create("fs_settings_fps", {
            width: 120,
            height: 8,

            min: 1,
        
            bar: false,

            step: 1,
            scroll_step: 1,

            default_value: _fas.fps,
            value: _fas.fps,

            title: "FPS / Slices data rate",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (fps) {
                if (fps <= 0) {
                    return;
                }
                
                _fas.fps = fps;
                
                localStorage.setItem('fs-fps', _fas.fps);

                _fasNotify(_FAS_SYNTH_INFOS, { target: 0, value: _fas.fps });
            }
        });

        WUI_RangeSlider.create("fs_settings_compile_delay", {
            width: 120,
            height: 8,

            min: 0,
            max: 5000,
        
            bar: false,

            step: 1,
            scroll_step: 10,

            default_value: _compile_delay_ms,
            value: _compile_delay_ms,

            title: "Compile delay (ms)",

            title_min_width: 140,
            value_min_width: 88,

            on_change: function (delay) {
                if (delay < 0) {
                    return;
                }
                
                _compile_delay_ms = delay;
                
                localStorage.setItem('fs-compile-delay', _compile_delay_ms);
            }
        });

    WUI_RangeSlider.create("mst_slider", {
            width: 100,
            height: 8,

            min: 0.0,
            max: 1.0,

            bar: false,

            step: "any",
            scroll_step: 0.0001,
        
            decimals: 4,

            midi: true,

            default_value: _volume,
            value: _volume,

            title: "Gain",

            title_min_width: 32,
            value_min_width: 48,

            on_change: function (value) {
                _local_session_settings.gain = value;
                _saveLocalSessionSettings();

                _setGain(value);

                _fasNotify(_FAS_SYNTH_INFOS, { target: 1, value: _audio_infos.gain });
            }
        });
    
    WUI_RangeSlider.create("fs_import_audio_gain_settings", {
            width: 100,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 0.0001,
        
            decimals: 4,

            midi: false,

            default_value: _audio_import_settings.gain,
            value: _audio_import_settings.gain,

            title: "Gain factor",

            title_min_width: 84,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.gain = value;
            }
        });

    WUI_RangeSlider.create("fs_import_audio_deviation_settings", {
            width: 100,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 0.0001,
        
            decimals: 4,

            midi: false,

            default_value: _audio_import_settings.deviation,
            value: _audio_import_settings.deviation,

            title: "Deviation",

            title_min_width: 84,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.deviation = value;
            }
        });
    
    WUI_RangeSlider.create("fs_import_audio_padding_settings", {
            width: 100,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 16,

            midi: false,

            default_value: _audio_import_settings.padding,
            value: _audio_import_settings.padding,

            title: "Padding",

            title_min_width: 84,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.padding = parseInt(value, 10);
            }
        });
    
    WUI_RangeSlider.create("fs_import_audio_pps_settings", {
            width: 100,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 1,

            midi: false,

            default_value: _audio_import_settings.pps,
            value: _audio_import_settings.pps,

            title: "PPS",

            title_min_width: 84,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.pps = parseInt(value, 10);
            }
        });

    WUI_RangeSlider.create("fs_import_audio_height_settings", {
            width: 100,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 1,

            midi: false,

            default_value: _audio_import_settings.height,
            value: _audio_import_settings.height,

            title: "Height",

            title_min_width: 84,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.height = parseInt(value, 10);
            }
        });
    
    WUI_RangeSlider.create("fs_import_audio_minfreq_settings", {
            width: 100,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 0.1,

            midi: false,

            default_value: _audio_import_settings.minfreq,
            value: _audio_import_settings.minfreq,

            title: "Min. freq.",

            title_min_width: 84,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.minfreq = value;
            }
        });
    
    WUI_RangeSlider.create("fs_import_audio_maxfreq_settings", {
            width: 100,
            height: 8,

            min: 0,

            bar: false,

            step: "any",
            scroll_step: 0.1,

            midi: false,

            default_value: _audio_import_settings.maxfreq,
            value: _audio_import_settings.maxfreq,

            title: "Max. freq.",

            title_min_width: 84,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.maxfreq = value;
            }
        });
    
        WUI_RangeSlider.create("fs_import_cam_width", {
            width: 100,
            height: 8,

            min: 1,

            bar: false,

            step: 1,
            scroll_step: 1,

            midi: false,

            default_value: _audio_import_settings.cam_width,
            value: _audio_import_settings.cam_width,

            title: "Cam. width",

            title_min_width: 84,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.cam_width = value;
            }
        });

        WUI_RangeSlider.create("fs_import_cam_height", {
            width: 100,
            height: 8,

            min: 1,

            bar: false,

            step: 1,
            scroll_step: 1,

            midi: false,

            default_value: _audio_import_settings.cam_height,
            value: _audio_import_settings.cam_height,

            title: "Cam. height",

            title_min_width: 84,
            value_min_width: 64,

            on_change: function (value) {
                _audio_import_settings.cam_height = value;
            }
        });
    
    // initialize collapsable elements
    var collapsibles = document.querySelectorAll(".fs-collapsible"),
        legends,
        i, j;
    for (i = 0; i < collapsibles.length; i += 1) {
        legends = collapsibles[i].getElementsByClassName("fs-collapsible-legend");
        if (legends.length > 0) {
            _applyCollapsible(collapsibles[i], legends[0]);
        }    
    }
    
    // now useless, just safe to remove!
    _utterFailRemove();
};