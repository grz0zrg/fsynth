/* jslint browser: true */
/* jshint globalstrict: false */
/* global ndarray, ndarray_fft*/

/*  
    Short Time Fourier Transform

    Adapted and enhanced from Mikola Lysenko MIT licensed project "stft"
    
    More windowing functions were added and this module does not use "require" anymore
    
    TODO : Remove the need for ndarray and ndarray-fft...
    
    https://github.com/mikolalysenko/stft
*/

/*
    The MIT License (MIT)

    Copyright (c) 2013 Mikola Lysenko

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
*/

// Extend Math by Richard Meadows - 2013
// https://github.com/richardeoin/nodejs-fft-windowing/blob/master/windowing.js
Math.sinc = function(n) { return Math.sin(Math.PI*n)/(Math.PI*n); }
Math.bessi0 = function(x) {
	var ax = Math.abs(x);

	if (ax < 3.75) {
		y = x / 3.75; y = y * y;
		return 1.0 + y*(3.5156229+y*(3.0899424+y*(1.2067492+y*(0.2659732+y*(0.360768e-1+y*0.45813e-2)))));
   } else {
		y = 3.75 / ax;
		return (Math.exp(ax) / Math.sqrt(ax)) *
			(0.39894228+y*(0.1328592e-1+y*(0.225319e-2+y*(-0.157565e-2+y*(0.916281e-2+y*
			(-0.2057706e-1+y*(0.2635537e-1+y*(-0.1647633e-1+y*0.392377e-2))))))));
   }
}

var STFT = new (function() {
    /***********************************************************
        Private section.
        
        Fields.
    ************************************************************/
    
    var _forward_window = null,
        
        _inverse_window = null;
    
    /***********************************************************
        Private section.
        
        Functions.
    ************************************************************/
    
    var _triangularWindowAnalysis = function (length, index) {
        return 2 / length * (length / 2 - Math.abs(index - (length - 1) / 2));  
    };
    
    var _hannWindowAnalysis = function (length, index) {
        return 0.5 * (1 - Math.cos(Math.PI * 2 * index / (length - 1)));
    };
    
    var _hammingWindowAnalysis = function (length, index) {
        return 0.54 - 0.46 * Math.cos(Math.PI * 2 * index / (length - 1));
    };
    
    var _bartlettWindowAnalysis = function (length, index) {
        return 2 / (length - 1) * ((length - 1) / 2 - Math.abs(index - (length - 1) / 2));
    };
    
    var _bartlettHannWindowAnalysis = function (length, index) {
        return 0.62 - 0.48 * Math.abs(index / (length - 1) - 0.5) - 0.38 * Math.cos(Math.PI * 2 * index / (length - 1));
    };
    
    var _blackmanWindowAnalysis = function (length, index, alpha) {
        var a0 = (1 - alpha) / 2;
        var a1 = 0.5;
        var a2 = alpha / 2;

        return a0 - a1 * Math.cos(DSP.TWO_PI * index / (length - 1)) + a2 * Math.cos(4 * Math.PI * index / (length - 1));
    };

    var _cosineWindowAnalysis = function (length, index) {
        return Math.cos(Math.PI * index / (length - 1) - Math.PI / 2);
    };
    
    var _gaussWindowAnalysis = function (length, index, alpha) {
        return Math.pow(Math.E, -0.5 * Math.pow((index - (length - 1) / 2) / (alpha * (length - 1) / 2), 2));
    };
    
    var _lanczosWindowAnalysis = function (length, index) {
        var x = 2 * index / (length - 1) - 1;
        return Math.sin(Math.PI * x) / (Math.PI * x);
    };
    
    var _rectangularWindowAnalysis = function (length, index) {
        return 1;
    };

    var _hannWindowSynthesis = function (length, index) {
        return _hannWindowAnalysis(length, index) * 2.0 / 3.0;
    };
    
    var _kaiser = function (points, n, alpha) {
        if (!alpha) { alpha = 3; }
            return Math.bessi0(Math.PI*alpha*Math.sqrt(1-Math.pow((2*n/(points-1))-1, 2))) / Math.bessi0(Math.PI*alpha);
    };
    
    var _nuttall = function (points, n) {
        return 0.355768 - 0.487396*Math.cos(2*Math.PI*n/(points-1))
            + 0.144232*Math.cos(4*Math.PI*n/(points-1))
            - 0.012604*Math.cos(6*Math.PI*n/(points-1));
    };
    
    var _flatTop = function (points, n) {
        return 1 - 1.93*Math.cos(2*Math.PI*n/(points-1))
            + 1.29*Math.cos(4*Math.PI*n/(points-1))
            - 0.388*Math.cos(6*Math.PI*n/(points-1))
            + 0.032*Math.cos(8*Math.PI*n/(points-1));
    };
    
    var _getAnalysisWindowFunction = function (type) {
        if (type === "hann") {
            return _hannWindowAnalysis;
        } else if (type === "triangular") {
            return _triangularWindowAnalysis;
        } else if (type === "hamming") {
            return _hammingWindowAnalysis;
        } else if (type === "bartlett") {
            return _bartlettWindowAnalysis;
        } else if (type === "bartlettHann") {
            return _bartlettHannWindowAnalysis;
        } else if (type === "blackman") {
            return _blackmanWindowAnalysis;
        } else if (type === "cosine") {
            return _cosineWindowAnalysis;
        } else if (type === "gauss") {
            return _gaussWindowAnalysis;
        } else if (type === "lanczos") {
            return _lanczosWindowAnalysis;
        } else if (type === "rectangular") {
            return _rectangularWindowAnalysis;
        } else if (type === "kaiser") {
            return _kaiser;
        } else if (type === "nutall") {
            return _nuttall;
        } else if (type === "flattop") {
            return _flatTop;
        } else {
            return _hannWindowAnalysis;
        }
    };
    
    /***********************************************************
        Public section.
        
        Functions.
    ************************************************************/

    this.initializeForwardWindow = function (frame_size, type_or_func, alpha) {
        _forward_window = new Float32Array(frame_size);
        
        if (alpha === undefined) {
            alpha = 0.16;   
        }

        var i = 0,
            
            func = null;
        
        if (typeof(type) === "function") {
            func = type_or_func;
        } else {
            func = _getAnalysisWindowFunction(type_or_func);
        }
        
        for (i = 0; i < frame_size; i += 1) {
            _forward_window[i] = func(frame_size, i, alpha);
        }
    };
    
    this.initializeInverseWindow = function (frame_size, type) {
        _inverse_window = new Float32Array(frame_size);

        var i = 0,
            
            func = _hannWindowSynthesis;
        
        // TODO : more types
        
        for (i = 0; i < frame_size; i += 1) {
            _inverse_window[i] = func(i / (frame_size-1));
        }
    };
    
    this.forward = function (frame_size, onstft, hop_size) {
        var hop_size = hop_size || frame_size>>>2,
            buffer   = new Float32Array(frame_size * 2),
            out_x    = new Float32Array(frame_size),
            out_y    = new Float32Array(frame_size),
            ptr      = 0,
            window   = _forward_window,
            real     = ndarray(out_x),
            imag     = ndarray(out_y);
  
        return function stft(frame) {
            var n = frame_size,
                i, j, k,
                W = window, B = buffer, X = out_x, Y = out_y;
        
            // Copy data into buffer
            B.set(frame, ptr);
            ptr += n;
    
            // Emit frames
            for(j=0; j+n<=ptr; j+=hop_size) {
                for(i=0; i<n; ++i) {
                    X[i] = B[i+j] * W[i];
                }
                
                for(i=0; i<n; ++i) {
                    Y[i] = 0.0;
                }
            
                ndarray_fft(1, real, imag);
                onstft(X, Y);
            }
    
            // shift buffer backwards
            k = ptr;
            for(i=0; j<k; ++i, ++j) {
                B[i] = B[j];
            }
            ptr = i;
        };
    };

    this.inverse = function (frame_size, onistft, hop_size) {
        var hop_size = hop_size || frame_size>>>2,
            buffer   = new Float32Array(frame_size * 2),
            output   = buffer.subarray(0, frame_size),
            sptr     = 0,
            eptr     = 0,
            window   = _inverse_window,
            real     = ndarray(window),
            imag     = ndarray(window);
  
        return function istft(X, Y) {
            var n = frame_size,
                i, j, k,
                W = window, B = buffer;
    
            // FFT input signal
            real.data = X;
            imag.data = Y;
            ndarray_fft(-1, real, imag);

            // Overlap-add
            k = eptr;
            for(i=0, j=sptr; j<k; ++i, ++j) {
                B[j] += W[i] * X[i];
            }
            
            for(; i < n; ++i, ++j) {
                B[j] = W[i] * X[i];
            }
            
            sptr += hop_size;
            eptr = j;

            // Emit frames
            while(sptr >= n) {
                onistft(output);
                
                for(i=0, j=n; i<n; ++i, ++j) {
                    B[i] = B[j];
                }
                
                eptr -= n;
                sptr -= n;
            }
        };
    };
})();