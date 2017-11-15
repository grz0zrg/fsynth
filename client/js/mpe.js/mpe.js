var mpe =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _ = __webpack_require__(1);

	var _2 = _interopRequireDefault(_);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	module.exports = _2.default;

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _mpeInstrument = __webpack_require__(2);

	Object.defineProperty(exports, 'default', {
	  enumerable: true,
	  get: function get() {
	    return _mpeInstrument.mpeInstrument;
	  }
	});

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.mpeInstrument = undefined;

	var _redux = __webpack_require__(3);

	var _actions = __webpack_require__(16);

	var _middlewares = __webpack_require__(24);

	var _activeNoteUtils = __webpack_require__(25);

	var _reducers = __webpack_require__(28);

	var _reducers2 = _interopRequireDefault(_reducers);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	/**
	 * Creates a new instrument instance for processing MPE data
	 *
	 * @kind function
	 * @example
	 * import mpeInstrument from 'mpe';
	 *
	 * // Define `instrument` as an instance of `mpeInstrument`
	 * const instrument = mpeInstrument();
	 *
	 * // Request MIDI device access from the Web MIDI API
	 * navigator.requestMIDIAccess().then(access => {
	 *   // Iterate over the list of inputs returned
	 *   access.inputs.forEach(midiInput => {
	 *     // Send 'midimessage' events to the mpe.js `instrument` instance
	 *     midiInput.addEventListener(
	 *       'midimessage',
	 *       (event) => instrument.processMidiMessage(event.data)
	 *     );
	 *   });
	 * });
	 * @param {Object} options
	 * @param {Boolean} [options.log=false] Log instrument state to the console on
	 * change
	 * @param {Boolean} [options.normalize=false] For all notes, remap `timbre`,
	 * `noteOnVelocity`, `noteOffVelocity` and `pressure` between 0 and 1, remap
	 * `pitchBend` between -1 and 1
	 * @param {Boolean} [options.pitch=false] Adds a `pitch` property to all notes:
	 * uses scientific notation eg. `C4` when `true` or `'scientific'`, uses
	 * Helmholtz notation eg. `c'` when set to `'helmholtz'`
	 * @param {Boolean} [options.pitchBendRange=48] Converts `pitchBend` to the
	 * range specified, overriding `normalize` if both are set
	 * @return {Object} Instance representing an MPE compatible instrument
	 */
	var mpeInstrument = exports.mpeInstrument = function mpeInstrument(options) {
	  var defaults = {
	    log: false,
	    normalize: true,
	    pitch: false,
	    pitchBendRange: 48
	  };
	  var defaultedOptions = Object.assign({}, defaults, options);
	  var formatNote = _redux.compose.apply(undefined, _toConsumableArray([defaultedOptions.pitch && (0, _activeNoteUtils.addPitch)(defaultedOptions), defaultedOptions.pitchBendRange && (0, _activeNoteUtils.convertPitchBendRange)(defaultedOptions), defaultedOptions.normalize && _activeNoteUtils.normalize].filter(function (f) {
	    return f;
	  })));
	  var formatActiveNotes = function formatActiveNotes(notes) {
	    return notes.map(formatNote);
	  };
	  var middlewares = [defaultedOptions.log && (0, _middlewares.logger)(formatActiveNotes)].filter(function (f) {
	    return f;
	  });
	  var store = (0, _redux.createStore)(_reducers2.default, _redux.applyMiddleware.apply(undefined, _toConsumableArray(middlewares)));
	  var rawActiveNotes = function rawActiveNotes() {
	    return store.getState().activeNotes;
	  };

	  /**
	   * Lists active notes of the `mpeInstrument` instance
	   *
	   * @example
	   * import mpeInstrument from 'mpe';
	   *
	   * const instrument = mpeInstrument();
	   *
	   * instrument.activeNotes();
	   * // => []
	   *
	   * instrument.processMidiMessage([145, 60, 127]);
	   * instrument.activeNotes();
	   * // => [ { noteNumber: 60,
	   * //        channel: 2,
	   * //        noteOnVelocity: 1,
	   * //        pitchBend: 0,
	   * //        timbre: 0.5,
	   * //        pressure: 0 } ]
	   *
	   * @memberof mpeInstrument
	   * @instance
	   * @return {Array} Active note objects
	   * @method activeNotes
	   */
	  var activeNotes = function activeNotes() {
	    return formatActiveNotes(rawActiveNotes());
	  };

	  /**
	   * Clears all active notes
	   *
	   * @example
	   * import mpeInstrument from 'mpe';
	   *
	   * const instrument = mpeInstrument();
	   *
	   * instrument.activeNotes();
	   * // => []
	   *
	   * instrument.processMidiMessage([145, 60, 127]);
	   * instrument.activeNotes();
	   * // => [ { noteNumber: 60,
	   * //        channel: 2,
	   * //        noteOnVelocity: 1,
	   * //        pitchBend: 0,
	   * //        timbre: 0.5,
	   * //        pressure: 0 } ]
	   *
	   * instrument.clear();
	   * instrument.activeNotes()
	   * // => []
	   *
	   * @memberof mpeInstrument
	   * @instance
	   * @return {undefined}
	   */
	  var clear = function clear() {
	    return store.dispatch((0, _actions.clearActiveNotes)());
	  };

	  /**
	   * Reads an MPE message and updates `mpeInstrument` state
	   *
	   * @example
	   * import mpeInstrument from 'mpe';
	   *
	   * const instrument = mpeInstrument();
	   *
	   * // Trigger a note on, channel 2, middle C, max velocity
	   * instrument.processMidiMessage([145, 60, 127]);
	   * @memberof mpeInstrument
	   * @instance
	   * @param {Uint8Array} midiMessage An MPE MIDI message
	   * @return {undefined}
	   */
	  var processMidiMessage = function processMidiMessage(midiMessage) {
	    var actions = (0, _actions.generateMidiActions)(midiMessage, store.getState);
	    actions.forEach(store.dispatch);
	  };

	  /**
	   * Subscribes a callback to changes to the instance's active notes
	   *
	   * @example
	   * import mpeInstrument from 'mpe';
	   *
	   * const instrument = mpeInstrument();
	   *
	   * // Log `activeNotes` values to the console on change
	   * instrument.subscribe(console.log);
	   * @memberof mpeInstrument
	   * @instance
	   * @param {function} callback Callback for active note changes
	   * @return {function} Unsubscribe the callback
	   */
	  var subscribe = function subscribe(callback) {
	    var currentActiveNotes = rawActiveNotes();
	    return store.subscribe(function () {
	      var previousActiveNotes = currentActiveNotes;
	      currentActiveNotes = rawActiveNotes();
	      if (currentActiveNotes !== previousActiveNotes) {
	        callback(activeNotes());
	      }
	    });
	  };

	  return {
	    processMidiMessage: processMidiMessage,
	    clear: clear,
	    activeNotes: activeNotes,
	    subscribe: subscribe
	  };
	};

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;
	exports.compose = exports.applyMiddleware = exports.bindActionCreators = exports.combineReducers = exports.createStore = undefined;

	var _createStore = __webpack_require__(4);

	var _createStore2 = _interopRequireDefault(_createStore);

	var _combineReducers = __webpack_require__(11);

	var _combineReducers2 = _interopRequireDefault(_combineReducers);

	var _bindActionCreators = __webpack_require__(13);

	var _bindActionCreators2 = _interopRequireDefault(_bindActionCreators);

	var _applyMiddleware = __webpack_require__(14);

	var _applyMiddleware2 = _interopRequireDefault(_applyMiddleware);

	var _compose = __webpack_require__(15);

	var _compose2 = _interopRequireDefault(_compose);

	var _warning = __webpack_require__(12);

	var _warning2 = _interopRequireDefault(_warning);

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { "default": obj };
	}

	/*
	* This is a dummy function to check if the function name has been altered by minification.
	* If the function has been minified and NODE_ENV !== 'production', warn the user.
	*/
	function isCrushed() {}

	if (false) {
	  (0, _warning2["default"])('You are currently using minified code outside of NODE_ENV === \'production\'. ' + 'This means that you are running a slower development build of Redux. ' + 'You can use loose-envify (https://github.com/zertosh/loose-envify) for browserify ' + 'or DefinePlugin for webpack (http://stackoverflow.com/questions/30030031) ' + 'to ensure you have the correct code for your production build.');
	}

	exports.createStore = _createStore2["default"];
	exports.combineReducers = _combineReducers2["default"];
	exports.bindActionCreators = _bindActionCreators2["default"];
	exports.applyMiddleware = _applyMiddleware2["default"];
	exports.compose = _compose2["default"];

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	exports.__esModule = true;
	exports.ActionTypes = undefined;
	exports["default"] = createStore;

	var _isPlainObject = __webpack_require__(5);

	var _isPlainObject2 = _interopRequireDefault(_isPlainObject);

	var _symbolObservable = __webpack_require__(9);

	var _symbolObservable2 = _interopRequireDefault(_symbolObservable);

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { "default": obj };
	}

	/**
	 * These are private action types reserved by Redux.
	 * For any unknown actions, you must return the current state.
	 * If the current state is undefined, you must return the initial state.
	 * Do not reference these action types directly in your code.
	 */
	var ActionTypes = exports.ActionTypes = {
	  INIT: '@@redux/INIT'
	};

	/**
	 * Creates a Redux store that holds the state tree.
	 * The only way to change the data in the store is to call `dispatch()` on it.
	 *
	 * There should only be a single store in your app. To specify how different
	 * parts of the state tree respond to actions, you may combine several reducers
	 * into a single reducer function by using `combineReducers`.
	 *
	 * @param {Function} reducer A function that returns the next state tree, given
	 * the current state tree and the action to handle.
	 *
	 * @param {any} [initialState] The initial state. You may optionally specify it
	 * to hydrate the state from the server in universal apps, or to restore a
	 * previously serialized user session.
	 * If you use `combineReducers` to produce the root reducer function, this must be
	 * an object with the same shape as `combineReducers` keys.
	 *
	 * @param {Function} enhancer The store enhancer. You may optionally specify it
	 * to enhance the store with third-party capabilities such as middleware,
	 * time travel, persistence, etc. The only store enhancer that ships with Redux
	 * is `applyMiddleware()`.
	 *
	 * @returns {Store} A Redux store that lets you read the state, dispatch actions
	 * and subscribe to changes.
	 */
	function createStore(reducer, initialState, enhancer) {
	  var _ref2;

	  if (typeof initialState === 'function' && typeof enhancer === 'undefined') {
	    enhancer = initialState;
	    initialState = undefined;
	  }

	  if (typeof enhancer !== 'undefined') {
	    if (typeof enhancer !== 'function') {
	      throw new Error('Expected the enhancer to be a function.');
	    }

	    return enhancer(createStore)(reducer, initialState);
	  }

	  if (typeof reducer !== 'function') {
	    throw new Error('Expected the reducer to be a function.');
	  }

	  var currentReducer = reducer;
	  var currentState = initialState;
	  var currentListeners = [];
	  var nextListeners = currentListeners;
	  var isDispatching = false;

	  function ensureCanMutateNextListeners() {
	    if (nextListeners === currentListeners) {
	      nextListeners = currentListeners.slice();
	    }
	  }

	  /**
	   * Reads the state tree managed by the store.
	   *
	   * @returns {any} The current state tree of your application.
	   */
	  function getState() {
	    return currentState;
	  }

	  /**
	   * Adds a change listener. It will be called any time an action is dispatched,
	   * and some part of the state tree may potentially have changed. You may then
	   * call `getState()` to read the current state tree inside the callback.
	   *
	   * You may call `dispatch()` from a change listener, with the following
	   * caveats:
	   *
	   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
	   * If you subscribe or unsubscribe while the listeners are being invoked, this
	   * will not have any effect on the `dispatch()` that is currently in progress.
	   * However, the next `dispatch()` call, whether nested or not, will use a more
	   * recent snapshot of the subscription list.
	   *
	   * 2. The listener should not expect to see all state changes, as the state
	   * might have been updated multiple times during a nested `dispatch()` before
	   * the listener is called. It is, however, guaranteed that all subscribers
	   * registered before the `dispatch()` started will be called with the latest
	   * state by the time it exits.
	   *
	   * @param {Function} listener A callback to be invoked on every dispatch.
	   * @returns {Function} A function to remove this change listener.
	   */
	  function subscribe(listener) {
	    if (typeof listener !== 'function') {
	      throw new Error('Expected listener to be a function.');
	    }

	    var isSubscribed = true;

	    ensureCanMutateNextListeners();
	    nextListeners.push(listener);

	    return function unsubscribe() {
	      if (!isSubscribed) {
	        return;
	      }

	      isSubscribed = false;

	      ensureCanMutateNextListeners();
	      var index = nextListeners.indexOf(listener);
	      nextListeners.splice(index, 1);
	    };
	  }

	  /**
	   * Dispatches an action. It is the only way to trigger a state change.
	   *
	   * The `reducer` function, used to create the store, will be called with the
	   * current state tree and the given `action`. Its return value will
	   * be considered the **next** state of the tree, and the change listeners
	   * will be notified.
	   *
	   * The base implementation only supports plain object actions. If you want to
	   * dispatch a Promise, an Observable, a thunk, or something else, you need to
	   * wrap your store creating function into the corresponding middleware. For
	   * example, see the documentation for the `redux-thunk` package. Even the
	   * middleware will eventually dispatch plain object actions using this method.
	   *
	   * @param {Object} action A plain object representing “what changed”. It is
	   * a good idea to keep actions serializable so you can record and replay user
	   * sessions, or use the time travelling `redux-devtools`. An action must have
	   * a `type` property which may not be `undefined`. It is a good idea to use
	   * string constants for action types.
	   *
	   * @returns {Object} For convenience, the same action object you dispatched.
	   *
	   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
	   * return something else (for example, a Promise you can await).
	   */
	  function dispatch(action) {
	    if (!(0, _isPlainObject2["default"])(action)) {
	      throw new Error('Actions must be plain objects. ' + 'Use custom middleware for async actions.');
	    }

	    if (typeof action.type === 'undefined') {
	      throw new Error('Actions may not have an undefined "type" property. ' + 'Have you misspelled a constant?');
	    }

	    if (isDispatching) {
	      throw new Error('Reducers may not dispatch actions.');
	    }

	    try {
	      isDispatching = true;
	      currentState = currentReducer(currentState, action);
	    } finally {
	      isDispatching = false;
	    }

	    var listeners = currentListeners = nextListeners;
	    for (var i = 0; i < listeners.length; i++) {
	      listeners[i]();
	    }

	    return action;
	  }

	  /**
	   * Replaces the reducer currently used by the store to calculate the state.
	   *
	   * You might need this if your app implements code splitting and you want to
	   * load some of the reducers dynamically. You might also need this if you
	   * implement a hot reloading mechanism for Redux.
	   *
	   * @param {Function} nextReducer The reducer for the store to use instead.
	   * @returns {void}
	   */
	  function replaceReducer(nextReducer) {
	    if (typeof nextReducer !== 'function') {
	      throw new Error('Expected the nextReducer to be a function.');
	    }

	    currentReducer = nextReducer;
	    dispatch({ type: ActionTypes.INIT });
	  }

	  /**
	   * Interoperability point for observable/reactive libraries.
	   * @returns {observable} A minimal observable of state changes.
	   * For more information, see the observable proposal:
	   * https://github.com/zenparsing/es-observable
	   */
	  function observable() {
	    var _ref;

	    var outerSubscribe = subscribe;
	    return _ref = {
	      /**
	       * The minimal observable subscription method.
	       * @param {Object} observer Any object that can be used as an observer.
	       * The observer object should have a `next` method.
	       * @returns {subscription} An object with an `unsubscribe` method that can
	       * be used to unsubscribe the observable from the store, and prevent further
	       * emission of values from the observable.
	       */

	      subscribe: function subscribe(observer) {
	        if ((typeof observer === 'undefined' ? 'undefined' : _typeof(observer)) !== 'object') {
	          throw new TypeError('Expected the observer to be an object.');
	        }

	        function observeState() {
	          if (observer.next) {
	            observer.next(getState());
	          }
	        }

	        observeState();
	        var unsubscribe = outerSubscribe(observeState);
	        return { unsubscribe: unsubscribe };
	      }
	    }, _ref[_symbolObservable2["default"]] = function () {
	      return this;
	    }, _ref;
	  }

	  // When a store is created, an "INIT" action is dispatched so that every
	  // reducer returns their initial state. This effectively populates
	  // the initial state tree.
	  dispatch({ type: ActionTypes.INIT });

	  return _ref2 = {
	    dispatch: dispatch,
	    subscribe: subscribe,
	    getState: getState,
	    replaceReducer: replaceReducer
	  }, _ref2[_symbolObservable2["default"]] = observable, _ref2;
	}

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var getPrototype = __webpack_require__(6),
	    isHostObject = __webpack_require__(7),
	    isObjectLike = __webpack_require__(8);

	/** `Object#toString` result references. */
	var objectTag = '[object Object]';

	/** Used for built-in method references. */
	var objectProto = Object.prototype;

	/** Used to resolve the decompiled source of functions. */
	var funcToString = Function.prototype.toString;

	/** Used to check objects for own properties. */
	var hasOwnProperty = objectProto.hasOwnProperty;

	/** Used to infer the `Object` constructor. */
	var objectCtorString = funcToString.call(Object);

	/**
	 * Used to resolve the
	 * [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
	 * of values.
	 */
	var objectToString = objectProto.toString;

	/**
	 * Checks if `value` is a plain object, that is, an object created by the
	 * `Object` constructor or one with a `[[Prototype]]` of `null`.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.8.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a plain object,
	 *  else `false`.
	 * @example
	 *
	 * function Foo() {
	 *   this.a = 1;
	 * }
	 *
	 * _.isPlainObject(new Foo);
	 * // => false
	 *
	 * _.isPlainObject([1, 2, 3]);
	 * // => false
	 *
	 * _.isPlainObject({ 'x': 0, 'y': 0 });
	 * // => true
	 *
	 * _.isPlainObject(Object.create(null));
	 * // => true
	 */
	function isPlainObject(value) {
	  if (!isObjectLike(value) || objectToString.call(value) != objectTag || isHostObject(value)) {
	    return false;
	  }
	  var proto = getPrototype(value);
	  if (proto === null) {
	    return true;
	  }
	  var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
	  return typeof Ctor == 'function' && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
	}

	module.exports = isPlainObject;

/***/ },
/* 6 */
/***/ function(module, exports) {

	"use strict";

	/* Built-in method references for those with the same name as other `lodash` methods. */
	var nativeGetPrototype = Object.getPrototypeOf;

	/**
	 * Gets the `[[Prototype]]` of `value`.
	 *
	 * @private
	 * @param {*} value The value to query.
	 * @returns {null|Object} Returns the `[[Prototype]]`.
	 */
	function getPrototype(value) {
	  return nativeGetPrototype(Object(value));
	}

	module.exports = getPrototype;

/***/ },
/* 7 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * Checks if `value` is a host object in IE < 9.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
	 */
	function isHostObject(value) {
	  // Many host objects are `Object` objects that can coerce to strings
	  // despite having improperly defined `toString` methods.
	  var result = false;
	  if (value != null && typeof value.toString != 'function') {
	    try {
	      result = !!(value + '');
	    } catch (e) {}
	  }
	  return result;
	}

	module.exports = isHostObject;

/***/ },
/* 8 */
/***/ function(module, exports) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	/**
	 * Checks if `value` is object-like. A value is object-like if it's not `null`
	 * and has a `typeof` result of "object".
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	 * @example
	 *
	 * _.isObjectLike({});
	 * // => true
	 *
	 * _.isObjectLike([1, 2, 3]);
	 * // => true
	 *
	 * _.isObjectLike(_.noop);
	 * // => false
	 *
	 * _.isObjectLike(null);
	 * // => false
	 */
	function isObjectLike(value) {
	  return !!value && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) == 'object';
	}

	module.exports = isObjectLike;

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {/* global window */
	'use strict';

	module.exports = __webpack_require__(10)(global || window || undefined);
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 10 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function symbolObservablePonyfill(root) {
		var result;
		var _Symbol = root.Symbol;

		if (typeof _Symbol === 'function') {
			if (_Symbol.observable) {
				result = _Symbol.observable;
			} else {
				result = _Symbol('observable');
				_Symbol.observable = result;
			}
		} else {
			result = '@@observable';
		}

		return result;
	};

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;
	exports["default"] = combineReducers;

	var _createStore = __webpack_require__(4);

	var _isPlainObject = __webpack_require__(5);

	var _isPlainObject2 = _interopRequireDefault(_isPlainObject);

	var _warning = __webpack_require__(12);

	var _warning2 = _interopRequireDefault(_warning);

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { "default": obj };
	}

	function getUndefinedStateErrorMessage(key, action) {
	  var actionType = action && action.type;
	  var actionName = actionType && '"' + actionType.toString() + '"' || 'an action';

	  return 'Given action ' + actionName + ', reducer "' + key + '" returned undefined. ' + 'To ignore an action, you must explicitly return the previous state.';
	}

	function getUnexpectedStateShapeWarningMessage(inputState, reducers, action) {
	  var reducerKeys = Object.keys(reducers);
	  var argumentName = action && action.type === _createStore.ActionTypes.INIT ? 'initialState argument passed to createStore' : 'previous state received by the reducer';

	  if (reducerKeys.length === 0) {
	    return 'Store does not have a valid reducer. Make sure the argument passed ' + 'to combineReducers is an object whose values are reducers.';
	  }

	  if (!(0, _isPlainObject2["default"])(inputState)) {
	    return 'The ' + argumentName + ' has unexpected type of "' + {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] + '". Expected argument to be an object with the following ' + ('keys: "' + reducerKeys.join('", "') + '"');
	  }

	  var unexpectedKeys = Object.keys(inputState).filter(function (key) {
	    return !reducers.hasOwnProperty(key);
	  });

	  if (unexpectedKeys.length > 0) {
	    return 'Unexpected ' + (unexpectedKeys.length > 1 ? 'keys' : 'key') + ' ' + ('"' + unexpectedKeys.join('", "') + '" found in ' + argumentName + '. ') + 'Expected to find one of the known reducer keys instead: ' + ('"' + reducerKeys.join('", "') + '". Unexpected keys will be ignored.');
	  }
	}

	function assertReducerSanity(reducers) {
	  Object.keys(reducers).forEach(function (key) {
	    var reducer = reducers[key];
	    var initialState = reducer(undefined, { type: _createStore.ActionTypes.INIT });

	    if (typeof initialState === 'undefined') {
	      throw new Error('Reducer "' + key + '" returned undefined during initialization. ' + 'If the state passed to the reducer is undefined, you must ' + 'explicitly return the initial state. The initial state may ' + 'not be undefined.');
	    }

	    var type = '@@redux/PROBE_UNKNOWN_ACTION_' + Math.random().toString(36).substring(7).split('').join('.');
	    if (typeof reducer(undefined, { type: type }) === 'undefined') {
	      throw new Error('Reducer "' + key + '" returned undefined when probed with a random type. ' + ('Don\'t try to handle ' + _createStore.ActionTypes.INIT + ' or other actions in "redux/*" ') + 'namespace. They are considered private. Instead, you must return the ' + 'current state for any unknown actions, unless it is undefined, ' + 'in which case you must return the initial state, regardless of the ' + 'action type. The initial state may not be undefined.');
	    }
	  });
	}

	/**
	 * Turns an object whose values are different reducer functions, into a single
	 * reducer function. It will call every child reducer, and gather their results
	 * into a single state object, whose keys correspond to the keys of the passed
	 * reducer functions.
	 *
	 * @param {Object} reducers An object whose values correspond to different
	 * reducer functions that need to be combined into one. One handy way to obtain
	 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
	 * undefined for any action. Instead, they should return their initial state
	 * if the state passed to them was undefined, and the current state for any
	 * unrecognized action.
	 *
	 * @returns {Function} A reducer function that invokes every reducer inside the
	 * passed object, and builds a state object with the same shape.
	 */
	function combineReducers(reducers) {
	  var reducerKeys = Object.keys(reducers);
	  var finalReducers = {};
	  for (var i = 0; i < reducerKeys.length; i++) {
	    var key = reducerKeys[i];
	    if (typeof reducers[key] === 'function') {
	      finalReducers[key] = reducers[key];
	    }
	  }
	  var finalReducerKeys = Object.keys(finalReducers);

	  var sanityError;
	  try {
	    assertReducerSanity(finalReducers);
	  } catch (e) {
	    sanityError = e;
	  }

	  return function combination() {
	    var state = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
	    var action = arguments[1];

	    if (sanityError) {
	      throw sanityError;
	    }

	    if (false) {
	      var warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action);
	      if (warningMessage) {
	        (0, _warning2["default"])(warningMessage);
	      }
	    }

	    var hasChanged = false;
	    var nextState = {};
	    for (var i = 0; i < finalReducerKeys.length; i++) {
	      var key = finalReducerKeys[i];
	      var reducer = finalReducers[key];
	      var previousStateForKey = state[key];
	      var nextStateForKey = reducer(previousStateForKey, action);
	      if (typeof nextStateForKey === 'undefined') {
	        var errorMessage = getUndefinedStateErrorMessage(key, action);
	        throw new Error(errorMessage);
	      }
	      nextState[key] = nextStateForKey;
	      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
	    }
	    return hasChanged ? nextState : state;
	  };
	}

/***/ },
/* 12 */
/***/ function(module, exports) {

	'use strict';

	exports.__esModule = true;
	exports["default"] = warning;
	/**
	 * Prints a warning in the console if it exists.
	 *
	 * @param {String} message The warning message.
	 * @returns {void}
	 */
	function warning(message) {
	  /* eslint-disable no-console */
	  if (typeof console !== 'undefined' && typeof console.error === 'function') {
	    console.error(message);
	  }
	  /* eslint-enable no-console */
	  try {
	    // This error was thrown as a convenience so that if you enable
	    // "break on all exceptions" in your console,
	    // it would pause the execution at this line.
	    throw new Error(message);
	    /* eslint-disable no-empty */
	  } catch (e) {}
	  /* eslint-enable no-empty */
	}

/***/ },
/* 13 */
/***/ function(module, exports) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	exports.__esModule = true;
	exports["default"] = bindActionCreators;
	function bindActionCreator(actionCreator, dispatch) {
	  return function () {
	    return dispatch(actionCreator.apply(undefined, arguments));
	  };
	}

	/**
	 * Turns an object whose values are action creators, into an object with the
	 * same keys, but with every function wrapped into a `dispatch` call so they
	 * may be invoked directly. This is just a convenience method, as you can call
	 * `store.dispatch(MyActionCreators.doSomething())` yourself just fine.
	 *
	 * For convenience, you can also pass a single function as the first argument,
	 * and get a function in return.
	 *
	 * @param {Function|Object} actionCreators An object whose values are action
	 * creator functions. One handy way to obtain it is to use ES6 `import * as`
	 * syntax. You may also pass a single function.
	 *
	 * @param {Function} dispatch The `dispatch` function available on your Redux
	 * store.
	 *
	 * @returns {Function|Object} The object mimicking the original object, but with
	 * every action creator wrapped into the `dispatch` call. If you passed a
	 * function as `actionCreators`, the return value will also be a single
	 * function.
	 */
	function bindActionCreators(actionCreators, dispatch) {
	  if (typeof actionCreators === 'function') {
	    return bindActionCreator(actionCreators, dispatch);
	  }

	  if ((typeof actionCreators === 'undefined' ? 'undefined' : _typeof(actionCreators)) !== 'object' || actionCreators === null) {
	    throw new Error('bindActionCreators expected an object or a function, instead received ' + (actionCreators === null ? 'null' : typeof actionCreators === 'undefined' ? 'undefined' : _typeof(actionCreators)) + '. ' + 'Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?');
	  }

	  var keys = Object.keys(actionCreators);
	  var boundActionCreators = {};
	  for (var i = 0; i < keys.length; i++) {
	    var key = keys[i];
	    var actionCreator = actionCreators[key];
	    if (typeof actionCreator === 'function') {
	      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch);
	    }
	  }
	  return boundActionCreators;
	}

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _extends = Object.assign || function (target) {
	  for (var i = 1; i < arguments.length; i++) {
	    var source = arguments[i];for (var key in source) {
	      if (Object.prototype.hasOwnProperty.call(source, key)) {
	        target[key] = source[key];
	      }
	    }
	  }return target;
	};

	exports["default"] = applyMiddleware;

	var _compose = __webpack_require__(15);

	var _compose2 = _interopRequireDefault(_compose);

	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : { "default": obj };
	}

	/**
	 * Creates a store enhancer that applies middleware to the dispatch method
	 * of the Redux store. This is handy for a variety of tasks, such as expressing
	 * asynchronous actions in a concise manner, or logging every action payload.
	 *
	 * See `redux-thunk` package as an example of the Redux middleware.
	 *
	 * Because middleware is potentially asynchronous, this should be the first
	 * store enhancer in the composition chain.
	 *
	 * Note that each middleware will be given the `dispatch` and `getState` functions
	 * as named arguments.
	 *
	 * @param {...Function} middlewares The middleware chain to be applied.
	 * @returns {Function} A store enhancer applying the middleware.
	 */
	function applyMiddleware() {
	  for (var _len = arguments.length, middlewares = Array(_len), _key = 0; _key < _len; _key++) {
	    middlewares[_key] = arguments[_key];
	  }

	  return function (createStore) {
	    return function (reducer, initialState, enhancer) {
	      var store = createStore(reducer, initialState, enhancer);
	      var _dispatch = store.dispatch;
	      var chain = [];

	      var middlewareAPI = {
	        getState: store.getState,
	        dispatch: function dispatch(action) {
	          return _dispatch(action);
	        }
	      };
	      chain = middlewares.map(function (middleware) {
	        return middleware(middlewareAPI);
	      });
	      _dispatch = _compose2["default"].apply(undefined, chain)(store.dispatch);

	      return _extends({}, store, {
	        dispatch: _dispatch
	      });
	    };
	  };
	}

/***/ },
/* 15 */
/***/ function(module, exports) {

	"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	exports.__esModule = true;
	exports["default"] = compose;
	/**
	 * Composes single-argument functions from right to left. The rightmost
	 * function can take multiple arguments as it provides the signature for
	 * the resulting composite function.
	 *
	 * @param {...Function} funcs The functions to compose.
	 * @returns {Function} A function obtained by composing the argument functions
	 * from right to left. For example, compose(f, g, h) is identical to doing
	 * (...args) => f(g(h(...args))).
	 */

	function compose() {
	  for (var _len = arguments.length, funcs = Array(_len), _key = 0; _key < _len; _key++) {
	    funcs[_key] = arguments[_key];
	  }

	  if (funcs.length === 0) {
	    return function (arg) {
	      return arg;
	    };
	  } else {
	    var _ret = function () {
	      var last = funcs[funcs.length - 1];
	      var rest = funcs.slice(0, -1);
	      return {
	        v: function v() {
	          return rest.reduceRight(function (composed, f) {
	            return f(composed);
	          }, last.apply(undefined, arguments));
	        }
	      };
	    }();

	    if ((typeof _ret === "undefined" ? "undefined" : _typeof(_ret)) === "object") return _ret.v;
	  }
	}

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.generateMidiActions = exports.clearActiveNotes = undefined;

	var _statusByteUtils = __webpack_require__(17);

	var _defaults = __webpack_require__(19);

	var defaults = _interopRequireWildcard(_defaults);

	var _actionTypes = __webpack_require__(21);

	var types = _interopRequireWildcard(_actionTypes);

	var _dataByteUtils = __webpack_require__(23);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

	var clearActiveNotes = exports.clearActiveNotes = function clearActiveNotes() {
	  return {
	    type: types.ALL_NOTES_OFF
	  };
	};

	var generateMidiActions = exports.generateMidiActions = function generateMidiActions(midiMessage, currentStateCallback) {
	  var channel = (0, _statusByteUtils.statusByteToChannel)(midiMessage[0]);
	  var dataBytes = midiMessage.slice(1);

	  var midiMessageType = (0, _statusByteUtils.statusByteClassifier)(midiMessage[0]);
	  var type = deriveActionType(midiMessageType, channel, dataBytes);
	  var baseData = { type: type, midiMessageType: midiMessageType, channel: channel, dataBytes: dataBytes };
	  var typeSpecificData = deriveTypeSpecificData(baseData, currentStateCallback);
	  var mainAction = Object.assign({}, baseData, typeSpecificData);
	  if (type === types.NOTE_OFF) {
	    return [mainAction, { type: types.NOTE_RELEASED }];
	  }
	  return [mainAction];
	};

	var deriveActionType = function deriveActionType(midiMessageType, channel, dataBytes) {
	  switch (midiMessageType) {
	    case types.NOTE_ON:
	      // A note on with velocity 0 is a treated as a note off
	      if (dataBytes[1] === 0) return types.NOTE_OFF;
            break;
	    case types.CONTROL_CHANGE:
	      // CC 74 is used for timbre messages
	      if (dataBytes[0] === 74) return types.TIMBRE;
	      // CC 123 on the master channel is an all notes off message
	      if (dataBytes[0] === 123 && channel === 1) return types.ALL_NOTES_OFF;
            break;
	  }
	  return midiMessageType;
	};

	var deriveTypeSpecificData = function deriveTypeSpecificData(baseData, currentStateCallback) {
	  var type = baseData.type,
	      midiMessageType = baseData.midiMessageType,
	      channel = baseData.channel,
	      dataBytes = baseData.dataBytes;

	  switch (type) {
	    case types.NOTE_ON:
	      {
	        // Note On messages bundle channelScope to set expression values at creation.
	        var channelScope = currentStateCallback().channelScopes[channel];
	        return { noteNumber: dataBytes[0], noteOnVelocity: dataBytes[1], channelScope: channelScope };
	      }
	    case types.NOTE_OFF:
	      // A note on with velocity 0 is treated as a note off with velocity 64
	      return midiMessageType === types.NOTE_ON ? { noteNumber: dataBytes[0], noteOffVelocity: defaults.NOTE_OFF_VELOCITY } : { noteNumber: dataBytes[0], noteOffVelocity: dataBytes[1] };
	    case types.PITCH_BEND:
	      // This Control Change message's data bytes are ordered [LSB, MSB].
	      return { pitchBend: (0, _dataByteUtils.dataBytesToUint14)(dataBytes.reverse()) };
	    case types.TIMBRE:
	      return { timbre: (0, _dataByteUtils.dataBytesToUint14)([dataBytes[1]]) };
	    case types.CHANNEL_PRESSURE:
	      return { pressure: (0, _dataByteUtils.dataBytesToUint14)(dataBytes) };
	  }
	};

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.statusByteToChannel = exports.statusByteClassifier = undefined;

	var _midiMessageTypes = __webpack_require__(18);

	var types = _interopRequireWildcard(_midiMessageTypes);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

	var statusByteClassifier = exports.statusByteClassifier = function statusByteClassifier(statusByte) {
	  var firstNibble = statusByte & 0xf0;
	  switch (firstNibble) {
	    case 0x80:
	      return types.NOTE_OFF;
	    case 0x90:
	      return types.NOTE_ON;
	    case 0xa0:
	      return types.AFTERTOUCH;
	    case 0xb0:
	      return types.CONTROL_CHANGE;
	    case 0xc0:
	      return types.PROGRAM_CHANGE;
	    case 0xd0:
	      return types.CHANNEL_PRESSURE;
	    case 0xe0:
	      return types.PITCH_BEND;
	    case 0xf0:
	      return types.SYSTEM_MESSAGE;
	  }
	  return types.UNCLASSIFIED;
	}; /**
	    * Maps MIDI messages contents to message types.
	    *
	    * MIDI message information derived from this table:
	    * https://www.midi.org/specifications/item/table-1-summary-of-midi-message
	    */

	var statusByteToChannel = exports.statusByteToChannel = function statusByteToChannel(statusByte) {
	  return (statusByte & 0x0f) + 1;
	};

/***/ },
/* 18 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	/**
	 * Constants to map MIDI messages contents to message types.
	 *
	 * MIDI message information derived from this table:
	 * https://www.midi.org/specifications/item/table-1-summary-of-midi-message
	 */

	var CHANNEL_MESSAGE = exports.CHANNEL_MESSAGE = 'CHANNEL_MESSAGE';
	var SYSTEM_MESSAGE = exports.SYSTEM_MESSAGE = 'SYSTEM_MESSAGE';
	var NOTE_ON = exports.NOTE_ON = 'NOTE_ON';
	var NOTE_OFF = exports.NOTE_OFF = 'NOTE_OFF';
	var AFTERTOUCH = exports.AFTERTOUCH = 'AFTERTOUCH';
	var CONTROL_CHANGE = exports.CONTROL_CHANGE = 'CONTROL_CHANGE';
	var PROGRAM_CHANGE = exports.PROGRAM_CHANGE = 'PROGRAM_CHANGE';
	var CHANNEL_PRESSURE = exports.CHANNEL_PRESSURE = 'CHANNEL_PRESSURE';
	var PITCH_BEND = exports.PITCH_BEND = 'PITCH_BEND';
	var CHANNEL_MODE = exports.CHANNEL_MODE = 'CHANNEL_MODE';
	var ALL_SOUND_OFF = exports.ALL_SOUND_OFF = 'ALL_SOUND_OFF';
	var RESET_ALL_CONTROLLERS = exports.RESET_ALL_CONTROLLERS = 'RESET_ALL_CONTROLLERS';
	var LOCAL_CONTROL = exports.LOCAL_CONTROL = 'LOCAL_CONTROL';
	var ALL_NOTES_OFF = exports.ALL_NOTES_OFF = 'ALL_NOTES_OFF';
	var SYSTEM_EXCLUSIVE = exports.SYSTEM_EXCLUSIVE = 'SYSTEM_EXCLUSIVE';
	var MIDI_TIME_CODE_QUARTER_FRAME = exports.MIDI_TIME_CODE_QUARTER_FRAME = 'MIDI_TIME_CODE_QUARTER_FRAME';
	var SONG_POSITION_POINTER = exports.SONG_POSITION_POINTER = 'SONG_POSITION_POINTER';
	var SONG_SELECT = exports.SONG_SELECT = 'SONG_SELECT';
	var TUNE_REQUEST = exports.TUNE_REQUEST = 'TUNE_REQUEST';
	var END_OF_EXCLUSIVE = exports.END_OF_EXCLUSIVE = 'END_OF_EXCLUSIVE';
	var TIMING_CLOCK = exports.TIMING_CLOCK = 'TIMING_CLOCK';
	var UNDEFINED = exports.UNDEFINED = 'UNDEFINED';
	var START = exports.START = 'START';
	var CONTINUE = exports.CONTINUE = 'CONTINUE';
	var STOP = exports.STOP = 'STOP';
	var ACTIVE_SENSING = exports.ACTIVE_SENSING = 'ACTIVE_SENSING';
	var RESET = exports.RESET = 'RESET';
	var UNCLASSIFIED = exports.UNCLASSIFIED = 'UNCLASSIFIED';

/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.CHANNEL_SCOPES = exports.CHANNEL_SCOPE = exports.ACTIVE_NOTE = exports.NOTE_STATE = exports.NOTE_OFF_VELOCITY = exports.TIMBRE = exports.PRESSURE = exports.PITCH_BEND = exports.NOTE_ON_VELOCITY = undefined;

	var _noteStates = __webpack_require__(20);

	var noteStates = _interopRequireWildcard(_noteStates);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

	var NOTE_ON_VELOCITY = exports.NOTE_ON_VELOCITY = 64;
	var PITCH_BEND = exports.PITCH_BEND = 8192;
	var PRESSURE = exports.PRESSURE = 0;
	var TIMBRE = exports.TIMBRE = 8192;
	var NOTE_OFF_VELOCITY = exports.NOTE_OFF_VELOCITY = 64;
	var NOTE_STATE = exports.NOTE_STATE = noteStates.KEY_DOWN;

	var ACTIVE_NOTE = exports.ACTIVE_NOTE = {
	  noteOnVelocity: NOTE_ON_VELOCITY,
	  pitchBend: PITCH_BEND,
	  pressure: PRESSURE,
	  timbre: TIMBRE,
	  noteState: NOTE_STATE
	};

	var CHANNEL_SCOPE = exports.CHANNEL_SCOPE = {
	  pitchBend: PITCH_BEND,
	  timbre: TIMBRE,
	  pressure: PRESSURE
	};

	var CHANNEL_SCOPES = exports.CHANNEL_SCOPES = {
	  1: CHANNEL_SCOPE,
	  2: CHANNEL_SCOPE,
	  3: CHANNEL_SCOPE,
	  4: CHANNEL_SCOPE,
	  5: CHANNEL_SCOPE,
	  6: CHANNEL_SCOPE,
	  7: CHANNEL_SCOPE,
	  8: CHANNEL_SCOPE,
	  9: CHANNEL_SCOPE,
	  10: CHANNEL_SCOPE,
	  11: CHANNEL_SCOPE,
	  12: CHANNEL_SCOPE,
	  13: CHANNEL_SCOPE,
	  14: CHANNEL_SCOPE,
	  15: CHANNEL_SCOPE,
	  16: CHANNEL_SCOPE
	};

/***/ },
/* 20 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	var OFF = exports.OFF = 0;
	var KEY_DOWN = exports.KEY_DOWN = 1;
	var SUSTAINED = exports.SUSTAINED = 2;
	var KEY_DOWN_AND_SUSTAINED = exports.KEY_DOWN_AND_SUSTAINED = 3;

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _midiMessageTypes = __webpack_require__(18);

	Object.keys(_midiMessageTypes).forEach(function (key) {
	  if (key === "default" || key === "__esModule") return;
	  Object.defineProperty(exports, key, {
	    enumerable: true,
	    get: function get() {
	      return _midiMessageTypes[key];
	    }
	  });
	});

	var _mpeMessageTypes = __webpack_require__(22);

	Object.keys(_mpeMessageTypes).forEach(function (key) {
	  if (key === "default" || key === "__esModule") return;
	  Object.defineProperty(exports, key, {
	    enumerable: true,
	    get: function get() {
	      return _mpeMessageTypes[key];
	    }
	  });
	});

/***/ },
/* 22 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	var TIMBRE = exports.TIMBRE = 'TIMBRE';
	var NOTE_RELEASED = exports.NOTE_RELEASED = 'NOTE_RELEASED';

/***/ },
/* 23 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	/**
	 * Scales 7-bit values into the 14-bit range.
	 *
	 * @param {uint8} input Input 7-bit integer.
	 * @returns {uint16} Scaled 14-bit integer.
	 */
	var scale7To14Bit = exports.scale7To14Bit = function scale7To14Bit(input) {
	  if (input > 127) {
	    throw new RangeError("scale7To14Bit takes a 7-bit integer.\n" + ("scale7To14Bit(" + input + ") is invalid."));
	  }
	  if (input <= 64) {
	    return input << 7;
	  }
	  return input / 127 * 16383;
	};

	/**
	 * Converts one or two MIDI data bytes into normalized 14-bit values.
	 *
	 * @param {uint8} midiDataBytes The encoded data from a standard MIDI message.
	 * @returns {uint16} Normalized 14-bit integer representation of the inputs.
	 */
	var dataBytesToUint14 = exports.dataBytesToUint14 = function dataBytesToUint14(midiDataBytes) {
	  // Discard identifier bit.
	  var midiDataByteContents = midiDataBytes.map(function (dataByte) {
	    return 127 & dataByte;
	  });
	  switch (midiDataBytes.length) {
	    case 1:
	      // With one 7-bit value, scale to a 14-bit integer.
	      return scale7To14Bit(midiDataByteContents[0]);
	    case 2:
	      // With two 7-bit values, combine to make one 14-bit integer
	      return (midiDataByteContents[0] << 7) + midiDataByteContents[1];
	  }
	  throw new Error("midiDataToMpeValue takes one or two 8-bit integers.\n" + ("midiDataToMpeValue(" + midiDataBytes + ") is invalid."));
	};

	var int7ToUnsignedFloat = exports.int7ToUnsignedFloat = function int7ToUnsignedFloat(v) {
	  return v <= 64 ? 0.5 * v / 64 : 0.5 + 0.5 * (v - 64) / 63;
	};

	var int14ToUnsignedFloat = exports.int14ToUnsignedFloat = function int14ToUnsignedFloat(v) {
	  return v <= 8192 ? 0.5 * v / 8192 : 0.5 + 0.5 * (v - 8192) / 8191;
	};

	var int14ToSignedFloat = exports.int14ToSignedFloat = function int14ToSignedFloat(v) {
	  return v <= 8192 ? v / 8192 - 1 : (v - 8192) / 8191;
	};

/***/ },
/* 24 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	var currentActiveNotes = void 0;

	/* eslint-disable no-console */
	var logger = exports.logger = function logger(formatActiveNotes) {
	  return function (store) {
	    return function (next) {
	      return function (action) {
	        var result = next(action);
	        var previousActiveNotes = currentActiveNotes;
	        currentActiveNotes = store.getState().activeNotes;
	        if (currentActiveNotes !== previousActiveNotes) {
	          console.log('active notes:', formatActiveNotes(currentActiveNotes));
	        }
	        return result;
	      };
	    };
	  };
	};
	/* eslint-enable no-console */

/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.findActiveNoteIndexesByChannel = exports.findActiveNoteIndex = exports.convertPitchBendRange = exports.createPitchBendConverter = exports.addPitch = exports.addHelmholtzPitch = exports.addScientificPitch = exports.normalize = undefined;

	var _redux = __webpack_require__(3);

	var _objectUtils = __webpack_require__(26);

	var _dataByteUtils = __webpack_require__(23);

	var _noteNumberUtils = __webpack_require__(27);

	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	var NORMALIZE_NOTE_TRANSFORMATIONS = {
	  noteOnVelocity: _dataByteUtils.int7ToUnsignedFloat,
	  noteOffVelocity: _dataByteUtils.int7ToUnsignedFloat,
	  pitchBend: _dataByteUtils.int14ToSignedFloat,
	  pressure: _dataByteUtils.int14ToUnsignedFloat,
	  timbre: _dataByteUtils.int14ToUnsignedFloat
	};

	var normalize = exports.normalize = function normalize(note) {
	  return (0, _objectUtils.transformObject)(note, NORMALIZE_NOTE_TRANSFORMATIONS);
	};

	var addScientificPitch = exports.addScientificPitch = function addScientificPitch(action) {
	  return typeof action.noteNumber === 'undefined' ? action : Object.assign({}, action, { pitch: (0, _noteNumberUtils.toScientificPitch)(action.noteNumber) });
	};

	var addHelmholtzPitch = exports.addHelmholtzPitch = function addHelmholtzPitch(action) {
	  return typeof action.noteNumber === 'undefined' ? action : Object.assign({}, action, { pitch: (0, _noteNumberUtils.toHelmholtzPitch)(action.noteNumber) });
	};

	var addPitch = exports.addPitch = function addPitch(_ref) {
	  var pitch = _ref.pitch;
	  return pitch === 'helmholtz' ? addHelmholtzPitch : addScientificPitch;
	};

	var createPitchBendConverter = exports.createPitchBendConverter = function createPitchBendConverter(pitchBendRange, normalize) {
	  var conversionFunctions = [pitchBendRange && function (v) {
	    return v * parseFloat(pitchBendRange);
	  }, !normalize && _dataByteUtils.int14ToSignedFloat].filter(function (f) {
	    return f;
	  });
	  return _redux.compose.apply(undefined, _toConsumableArray(conversionFunctions));
	};

	var convertPitchBendRange = exports.convertPitchBendRange = function convertPitchBendRange(_ref2) {
	  var pitchBendRange = _ref2.pitchBendRange,
	      normalize = _ref2.normalize;
	  return function (action) {
	    return Object.assign({}, action, { pitchBend: createPitchBendConverter(pitchBendRange, normalize)(action.pitchBend) });
	  };
	};

	var findActiveNoteIndex = exports.findActiveNoteIndex = function findActiveNoteIndex(state, action) {
	  var channel = action.channel,
	      noteNumber = action.noteNumber;

	  return state.findIndex(function (activeNote) {
	    return activeNote.channel === channel && activeNote.noteNumber === noteNumber;
	  });
	};

	var findActiveNoteIndexesByChannel = exports.findActiveNoteIndexesByChannel = function findActiveNoteIndexesByChannel(state, action) {
	  return state.reduce(function (indexes, activeNote, index) {
	    return activeNote.channel === action.channel ? [].concat(_toConsumableArray(indexes), [index]) : indexes;
	  }, []);
	};

/***/ },
/* 26 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	var transformObject = exports.transformObject = function transformObject(object) {
	  var transformations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

	  var changedValues = Object.keys(transformations).reduce(function (acc, key) {
	    if (typeof object[key] !== 'undefined') {
	      acc[key] = transformations[key](object[key]);
	    }
	    return acc;
	  }, {});

	  return Object.assign({}, object, changedValues);
	};

/***/ },
/* 27 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	var PITCH_CLASS_NUMBER_TO_PITCH_NAME = {
	  0: 'C',
	  1: 'C#',
	  2: 'D',
	  3: 'Eb',
	  4: 'E',
	  5: 'F',
	  6: 'F#',
	  7: 'G',
	  8: 'Ab',
	  9: 'A',
	  10: 'Bb',
	  11: 'B'
	};

	var toPitchClassNumber = exports.toPitchClassNumber = function toPitchClassNumber(noteNumber) {
	  return Math.floor(noteNumber % 12);
	};

	var toOctaveNumber = exports.toOctaveNumber = function toOctaveNumber(noteNumber) {
	  return Math.floor(noteNumber / 12) - 1;
	};

	var toPitchClassName = exports.toPitchClassName = function toPitchClassName(noteNumber) {
	  return PITCH_CLASS_NUMBER_TO_PITCH_NAME[toPitchClassNumber(noteNumber)];
	};

	var toHelmholtzCommas = exports.toHelmholtzCommas = function toHelmholtzCommas(noteNumber) {
	  var numCommas = Math.max(-1 * toOctaveNumber(noteNumber) + 2, 0);
	  return new Array(numCommas).fill(',').join('');
	};

	var toHelmholtzApostrophes = exports.toHelmholtzApostrophes = function toHelmholtzApostrophes(noteNumber) {
	  var numApostrophes = Math.max(toOctaveNumber(noteNumber) - 3, 0);
	  return new Array(numApostrophes).fill('\'').join('');
	};

	var toHelmholtzPitchName = exports.toHelmholtzPitchName = function toHelmholtzPitchName(noteNumber) {
	  return noteNumber >= 48 ? toPitchClassName(noteNumber).toLowerCase() : toPitchClassName(noteNumber);
	};

	var toHelmholtzPitch = exports.toHelmholtzPitch = function toHelmholtzPitch(noteNumber) {
	  return '' + toHelmholtzPitchName(noteNumber) + toHelmholtzCommas(noteNumber) + toHelmholtzApostrophes(noteNumber);
	};

	var toScientificPitch = exports.toScientificPitch = function toScientificPitch(noteNumber) {
	  return '' + toPitchClassName(noteNumber) + toOctaveNumber(noteNumber);
	};

/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _redux = __webpack_require__(3);

	var _activeNotes = __webpack_require__(29);

	var _activeNotes2 = _interopRequireDefault(_activeNotes);

	var _channelScopes = __webpack_require__(30);

	var _channelScopes2 = _interopRequireDefault(_channelScopes);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	exports.default = (0, _redux.combineReducers)({
	  channelScopes: _channelScopes2.default,
	  activeNotes: _activeNotes2.default
	});

/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _actionTypes = __webpack_require__(21);

	var types = _interopRequireWildcard(_actionTypes);

	var _defaults = __webpack_require__(19);

	var defaults = _interopRequireWildcard(_defaults);

	var _noteStates = __webpack_require__(20);

	var noteStates = _interopRequireWildcard(_noteStates);

	var _activeNoteUtils = __webpack_require__(25);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	var activeNotes = function activeNotes() {
	  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
	  var action = arguments[1];

	  if (!types[action.type]) {
	    return state;
	  }
	  switch (action.type) {
	    case types.NOTE_ON:
	      return [].concat(_toConsumableArray(state), [activeNote({}, action)]);
	    case types.NOTE_OFF:
	      {
	        var noteIndex = (0, _activeNoteUtils.findActiveNoteIndex)(state, action);
	        return noteIndex >= 0 ? [].concat(_toConsumableArray(state.slice(0, noteIndex)), [activeNote(state[noteIndex], action)], _toConsumableArray(state.slice(noteIndex + 1))) : state;
	      }
	    case types.PITCH_BEND:
	    case types.CHANNEL_PRESSURE:
	    case types.TIMBRE:
	      {
	        var noteIndexes = (0, _activeNoteUtils.findActiveNoteIndexesByChannel)(state, action);
	        noteIndexes.forEach(function (noteIndex) {
	          state = [].concat(_toConsumableArray(state.slice(0, noteIndex)), [activeNote(state[noteIndex], action)], _toConsumableArray(state.slice(noteIndex + 1)));
	        });
	        return state;
	      }
	    case types.NOTE_RELEASED:
	      return state.length ? state.filter(function (activeNote) {
	        return activeNote.noteState !== noteStates.OFF;
	      }) : state;
	    case types.ALL_NOTES_OFF:
	      return [];
	  }
	  return state;
	};

	var activeNote = function activeNote() {
	  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : defaults.ACTIVE_NOTE;
	  var action = arguments[1];
	  var noteNumber = action.noteNumber,
	      channel = action.channel,
	      channelScope = action.channelScope,
	      noteOnVelocity = action.noteOnVelocity,
	      noteOffVelocity = action.noteOffVelocity,
	      pitch = action.pitch,
	      pitchBend = action.pitchBend,
	      pressure = action.pressure,
	      timbre = action.timbre;

	  switch (action.type) {
	    case types.NOTE_ON:
	      return Object.assign({}, state, { noteNumber: noteNumber, channel: channel, noteOnVelocity: noteOnVelocity }, pitch && { pitch: pitch }, channelScope);
	    case types.NOTE_OFF:
	      return Object.assign({}, state, { noteOffVelocity: noteOffVelocity, noteState: noteStates.OFF });
	    case types.PITCH_BEND:
	      return Object.assign({}, state, { pitchBend: pitchBend });
	    case types.CHANNEL_PRESSURE:
	      return Object.assign({}, state, { pressure: pressure });
	    case types.TIMBRE:
	      return Object.assign({}, state, { timbre: timbre });
	  }
	  return state;
	};

	exports.default = activeNotes;

/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _actionTypes = __webpack_require__(21);

	var types = _interopRequireWildcard(_actionTypes);

	var _defaults = __webpack_require__(19);

	var defaults = _interopRequireWildcard(_defaults);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

	function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

	var channelScopes = function channelScopes() {
	  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : defaults.CHANNEL_SCOPES;
	  var action = arguments[1];

	  if (!types[action.type]) {
	    return state;
	  }
	  var channel = action.channel;

	  return Object.assign({}, state, _defineProperty({}, channel, channelScope(state[channel], action)));
	};

	var channelScope = function channelScope(state, action) {
	  switch (action.type) {
	    case types.PITCH_BEND:
	      return Object.assign({}, state, { pitchBend: action.pitchBend });
	    case types.CHANNEL_PRESSURE:
	      return Object.assign({}, state, { pressure: action.pressure });
	    case types.TIMBRE:
	      return Object.assign({}, state, { timbre: action.timbre });
	    case types.NOTE_ON:
	    case types.NOTE_OFF:
	      return defaults.CHANNEL_SCOPE;
	  }
	  return state;
	};

	exports.default = channelScopes;

/***/ }
/******/ ]);