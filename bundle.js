(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
Vec2 = function(x, y) {
    this.x = x || 0;
    this.y = y || 0;
};

Vec2.prototype = {

    set: function(x, y) {
        this.x = x;
        this.y = y;
        return this;
    },

    clone: function() {
        return new Vec2(this.x, this.y);
    },

    toString: function() {
        return 'x=' + Math.round(this.x) + ' y=' + Math.round(this.y);
    },

    length: function() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },

    setLength: function(length) {
        if (this.isZero()) {
            this.set(
                Math.cos(this.rad()) * length,
                Math.sin(this.rad()) * length
            );
        }
        else {
            var scale = length / this.length();
            this.set(
                this.x * scale,
                this.y * scale
            );
        }
    },

    rad: function() {
        return Math.atan2(this.x, this.y);
    },

    distanceTo: function(vector) {
        var x = vector.x - this.x,
            y = vector.y - this.y,
            d = x * x + y * y;
        return d;
    },

    normalize: function(length) {
        if (length === undefined) {
            length = 1;
        }
        var current = this.length(),
            scale = current !== 0 ? length / current : 0,
            vector = new Vec2(this.x * scale, this.y * scale);
        return vector;
    },

    add: function(vector) {
        return new Vec2(this.x + vector.x, this.y + vector.y);
    },

    sub: function(vector) {
        return new Vec2(this.x - vector.x, this.y - vector.y);
    },

    multiplyScalar: function(scalar) {
        return new Vec2(this.x * scalar, this.y * scalar);
    },

    divideScalar: function(scalar) {
        return new Vec2(this.x / scalar, this.y / scalar);
    },

    isZero: function() {
        return this.x === 0 && this.y === 0;
    }

};

Vec2.prototype.contructor = Vec2;

module.exports = Vec2;

},{}],3:[function(require,module,exports){
/**
 * LSystems root namespace.
 *
 * @namespace LSystems
 */
if (typeof LSystems == "undefined" || !LSystems)
{
    var LSystems = {};
}

// Public constants
const ANTICLOCK  = '+';
const CLOCKWISE  = '-';
const PUSH       = '[';
const POP        = ']';
const COLOUR     = 'C';

const RAD = Math.PI/180.0;


/**
 * TurtleRenderer class
 *
 * @namespace LSystems
 * @class LSystems.TurtleRenderer
 */
(function()
{
    LSystems.TurtleRenderer = function(width, height)
    {
        if (width !== undefined && width !== null)
        {
            this._width = width;
        }
        if (height !== undefined && height !== null)
        {
            this._height = height;
        }

        this._colourList = ["rgba(140, 80, 60, 0.75)", "rgba(24, 180, 24, 0.75)", "rgba(48, 220, 48, 0.5)", "rgba(64, 255, 64, 0.5)"];
        this._constants = [];

        return this;
    };

    LSystems.TurtleRenderer.prototype =
    {
        /**
         * Rendering area width
         *
         * @property _width
         * @type number
         */
        _width: 0,

        /**
         * Rendering area height
         *
         * @property _height
         * @type number
         */
        _height: 0,

        /**
         * Rendering X coordinate offset
         *
         * @property _xOffset
         * @type number
         */
        _xOffset: 0,

        /**
         * Rendering Y coordinate offset
         *
         * @property _yOffset
         * @type number
         */
        _yOffset: 0,

        /**
         * Rendering distance units per forward turtle movement (default 10)
         *
         * @property _distance
         * @type number
         */
        _distance: 10,

        /**
         * Turning angle in degrees to use per turtle rotation (default 30.0)
         *
         * @property _angle
         * @type number
         */
        _angle: 30,

        /**
         * Minimum X coordinate reached during last processing phase
         *
         * @property _minx
         * @type number
         */
        _minx: 0,

        /**
         * Minimum Y coordinate reached during last processing phase
         *
         * @property _miny
         * @type number
         */
        _miny: 0,

        /**
         * Maximum X coordinate reached during last processing phase
         *
         * @property _maxx
         * @type number
         */
        _maxx: 0,

        /**
         * Maximum Y coordinate reached during last processing phase
         *
         * @property _maxy
         * @type number
         */
        _maxy: 0,

        /**
         * The maximum stack depth reached during processing
         *
         * @property _maxStackDepth
         * @type number
         */
        _maxStackDepth: 0,

        /**
         * Rendering stack
         *
         * @property _stack
         * @type object
         */
        _stack: null,

        /**
         * Colour list
         *
         * @property _colourList
         * @type object
         */
        _colourList: null,

        /**
         * Constant values to ignore during turtle rendering
         *
         * @property _constants
         * @type Array
         */
        _constants: null,

        /**
         * Render line width based on stack depth
         *
         * @property _renderLineWidths
         * @type boolean
         */
        _renderLineWidths: true,

        /**
         * Set rendering distance units per forward turtle movement.
         *
         * @method setDistance
         * @param distance {number} Distance units per forward turtle movement
         * @return {LSystems.TurtleRenderer} returns 'this' for method chaining
         */
        setDistance: function setDistance(distance)
        {
            this._distance = distance;
            return this;
        },

        /**
         * Set turning angle in degrees to use per turtle rotation.
         *
         * @method setDistance
         * @param angle {number} Turning angle in degrees to use per turtle rotation
         * @return {LSystems.TurtleRenderer} returns 'this' for method chaining
         */
        setAngle: function setAngle(angle)
        {
            this._angle = angle;
            return this;
        },

        setRenderLineWidths: function setRenderLineWidths(val)
        {
            this._renderLineWidths = val;
        },

        /**
         * Return the min/max coordinate values reached during last processing run.
         *
         * @method getMinMaxValues
         * @return {LSystems.Dimension} representing the min/max coordinate values.
         */
        getMinMaxValues: function getMinMaxValues()
        {
            return new LSystems.Dimension(this._minx, this._miny, this._maxx, this._maxy);
        },

        /**
         * Set the x/y coordinate offsets for coordinate translation during rendering.
         *
         * @method setOffsets
         * @param xOffset {number} x coord offset
         * @param yOffset {number} y coord offset
         */
        setOffsets: function(xOffset, yOffset)
        {
            if (xOffset !== undefined && xOffset !== null)
            {
                this._xOffset = xOffset;
            }
            if (yOffset !== undefined && yOffset !== null)
            {
                this._yOffset = yOffset;
            }
        },

        setConstants: function(constants)
        {
            this._constants = [];
            if (constants && constants.length !== 0)
            {
                for (var i=0; i<constants.length; i++)
                {
                    var c = constants.charAt(i);
                    if (c != ' ' && c != ',')
                    {
                        this._constants[c] = true;
                    }
                }
            }
        },

        /*
         * Process the command string and render
         *
         * @method process
         * @param cmds {string}    string of valid command characters
         * @param draw {boolean}   True if the turtle should draw, false otherwise
         */
        process: function process(cmds, draw)
        {
            this._stack = [];

            var angle = this._angle;
            var distance = this._distance;
            var lastX;
            var lastY;

            if (draw)
            {
                var canvas = document.getElementById('canvas');
                var ctx = canvas.getContext('2d');

                // clear the background
                ctx.save();
                //ctx.fillStyle = "rgb(255,255,255)";
                //ctx.fillRect(0, 0, WIDTH, HEIGHT);

                // offset as required
                ctx.translate(this._xOffset, 0);

                // initial colour if specific colouring not used
                ctx.strokeStyle = "rgb(0,0,0)";
            }

            // start at grid 0,0 facing north with no colour index
            var pos = new LSystems.Location(0.0, 0.0, 90.0, -1);

            // process each command in turn
            var yOffset = this._yOffset, maxStackDepth = this._maxStackDepth;
            var colourList = this._colourList, stack = this._stack;
            var renderLineWidths = this._renderLineWidths;
            var rad, width, colour, lastColour = null;
            var c, len = cmds.length;
            for (var i=0; i<len; i++)
            {
                c = cmds.charAt(i);

                switch (c)
                {
                    case COLOUR:
                    {
                        // get colour index from next character
                        pos.colour = (cmds.charAt(++i) - '0');
                        break;
                    }

                    case ANTICLOCK:
                    {
                        pos.heading += angle;
                        break;
                    }

                    case CLOCKWISE:
                    {
                        pos.heading -= angle;
                        break;
                    }

                    case PUSH:
                    {
                        stack.push(new LSystems.Location(pos.x, pos.y, pos.heading, pos.colour));
                        break;
                    }

                    case POP:
                    {
                        pos = stack.pop();
                        break;
                    }

                    default:
                    {
                        if (!this._constants[c])
                        {
                            lastX = pos.x;
                            lastY = pos.y;

                            // move the turtle
                            rad = pos.heading * RAD;
                            pos.x += distance * Math.cos(rad);
                            pos.y += distance * Math.sin(rad);

                            if (draw)
                            {
                                // render this element
                                if (renderLineWidths)
                                {
                                    width = (maxStackDepth - stack.length);
                                    ctx.lineWidth = width >= 1 ? width : 1;
                                }
                                colour = colourList[pos.colour];
                                if (colour && lastColour !== colour)
                                {
                                    ctx.strokeStyle = colour;
                                    lastColour = colour;
                                }
                                ctx.beginPath();
                                ctx.moveTo(lastX, HEIGHT - (lastY + yOffset));
                                ctx.lineTo(pos.x, HEIGHT - (pos.y + yOffset));
                                ctx.closePath();
                                ctx.stroke();
                            }
                            else
                            {
                                // remember min/max position
                                if (pos.x < this._minx) this._minx = pos.x;
                                else if (pos.x > this._maxx) this._maxx = pos.x;
                                if (pos.y < this._miny) this._miny = pos.y;
                                else if (pos.y > this._maxy) this._maxy = pos.y;
                                if (stack.length > this._maxStackDepth) this._maxStackDepth = stack.length;
                            }
                        }
                        break;
                    }
                }
            }

            // finalise rendering
            if (draw)
            {
                ctx.restore();
            }
        }
    };
})();

/**
 * LSystemsProcessor class
 *
 * @namespace LSystems
 * @class LSystems.LSystemsProcessor
 */
(function()
{
    LSystems.LSystemsProcessor = function()
    {
        this.rules = [];
        return this;
    };

    LSystems.LSystemsProcessor.prototype =
    {
        /**
         * Number of iterations to perform
         *
         * @property iterations
         * @type number
         */
        iterations: 1,

        /**
         * Root axiom
         *
         * @property axiom
         * @type string
         */
        axiom: null,

        /**
         * Array of rules to process
         *
         * @property rules
         * @type Array
         */
        rules: null,

        /**
         * Add a rule to the processor.
         *
         * @method process
         * @param rule {string}  Rules must be of form: F=FX
         */
        addRule: function addRule(rule)
        {
            if (rule.length < 2 || rule.charAt(1) !== '=')
            {
                throw "Rule must be of form: F=FX";
            }
            var rulePart = "";
            if (rule.length > 2)
            {
                rulePart = rule.substring(2);
            }

            this.rules[rule.charAt(0)] = rulePart;
        },

        /**
         * Generate the l-system command string based on the axiom, rules and number of iterations to perform.
         *
         * @method process
         */
        generate: function generate()
        {
            var ruleCount = this.rules.length;
            var axiom = null;
            var result = null;

            // process for each iteration
            for (var i = 0; i < this.iterations; i++)
            {
                if (i == 0)
                {
                    // start with user defined root axiom
                    axiom = this.axiom;
                }
                else
                {
                    // use last result as new axiom
                    axiom = result.toString();
                }

                result = new StringBuffer();

                // process each character of the Axiom
                for (var c, len = axiom.length, rule, rules=this.rules, n=0; n<len; n++)
                {
                    c = axiom.charAt(n);

                    // TODO: try array/strings etc.
                    rule = rules[c];
                    result.append(rule != null ? rule : c);

                    if (result.length() > 100000000)
                    {
                        throw "Generated command string too large! 100,000,000 commands max.";
                    }
                }
            }

            return result.toString();
        }
    };
})();


/**
 * Location structure class - all fields are public.
 *
 * @namespace LSystems
 * @class LSystems.Location
 */
(function()
{
    LSystems.Location = function(x, y, heading, colour)
    {
        this.x = x;
        this.y = y;
        this.heading = heading;
        this.colour = colour;

        return this;
    };

    LSystems.Location.prototype =
    {
        /**
         * X coordinate
         *
         * @property x
         * @type number
         */
        x: 0,

        /**
         * Y coordinate
         *
         * @property y
         * @type number
         */
        y: 0,

        /**
         * Heading angle
         *
         * @property heading
         * @type number
         */
        heading: 0,

        /**
         * Colour index
         *
         * @property colour
         * @type number
         */
        colour: 0
    };
})();


/**
 * Dimension structure class - all fields are public.
 *
 * @namespace LSystems
 * @class LSystems.Dimension
 */
(function()
{
    LSystems.Dimension = function(minx, miny, maxx, maxy)
    {
        this.minx = minx;
        this.miny = miny;
        this.maxx = maxx;
        this.maxy = maxy;

        return this;
    };

    LSystems.Dimension.prototype =
    {
        /**
         * Minimum X coordinate
         *
         * @property minx
         * @type number
         */
        minx: 0,

        /**
         * Minimum Y coordinate
         *
         * @property miny
         * @type number
         */
        miny: 0,

        /**
         * Maximum X coordinate
         *
         * @property heading
         * @type number
         */
        maxx: 0,

        /**
         * Maximum Y coordinate
         *
         * @property miny
         * @type number
         */
        maxy: 0
    };
})();


/**
 * StringBuffer object
 */
function StringBuffer(len)
{
    this.buffer = len ? new Array(len) : [];
    this.count = 0;
    return this;
}

StringBuffer.prototype.append = function append(s)
{
    this.buffer.push(s);
    this.count += s.length;
    return this;
};

StringBuffer.prototype.length = function length()
{
    return this.count;
};

StringBuffer.prototype.toString = function toString()
{
    return this.buffer.join("");
};

module.exports = LSystems;
},{}],4:[function(require,module,exports){
var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, { transparent: true });

// add render view to DOM
document.body.appendChild(renderer.view);

// create an new instance of a pixi stage
var stage = new PIXI.Container();

var pondContainer = new PIXI.Container();


var LSystems = require('./lsystem');
var canvas = document.getElementById('canvas');
HEIGHT = canvas.height;
WIDTH = canvas.width;
var context = canvas.getContext("2d");
context.clearRect(0,0,canvas.width,canvas.height);
context.fillStyle = "rgba(0, 0, 200, 0.5)";

var systems = [
    [
        5, 22, "", "F", "F=C0FF-[C1-F+F+F]+[C2+F-F-F]"
    ],
    [
        5, 25, "", "FX", "F=C0FF-[C1-F+F]+[C2+F-F]", "X=C0FF+[C1+F]+[C3-F]"
    ],
    [
        5, 27, "", "F", "F=C0FF[C1-F++F][C2+F--F]C3++F--F"
    ],

];

for (var i = 0, l = systems.length; i<l ; i++){
    var lsys = new LSystems.LSystemsProcessor();
    lsys.iterations = parseInt(systems[i][0]);
    lsys.axiom = systems[i][3];
    for(var j=4, lj = systems[i].length; j<lj; j++)
    {
        lsys.addRule(systems[i][j]);
    }
    var g_commands = lsys.generate();
    var g_renderer = new LSystems.TurtleRenderer(WIDTH, HEIGHT);
    g_renderer.setAngle(parseInt(systems[i][1]));
    g_renderer.setConstants(systems[i][2]);
    g_renderer.setRenderLineWidths(true);
    g_renderer.process(g_commands, false);
    // calc new distance based on screen res
    var oldDistance = 10.0;
    var newDistance;
    var dim = g_renderer.getMinMaxValues();;
    if (dim.maxx - dim.minx > dim.maxy - dim.miny)
    {
        // X has the largest delta - use that
        newDistance = (WIDTH / (dim.maxx - dim.minx)) * oldDistance;
    }
    else
    {
        // Y has the largest delta - use that
        newDistance = (HEIGHT / (dim.maxy - dim.miny)) * oldDistance;
    }

    // calc rendering offsets

    // scale min/max values by new distance
    dim.minx *= (newDistance / oldDistance);
    dim.maxx *= (newDistance / oldDistance);
    dim.miny *= (newDistance / oldDistance);
    dim.maxy *= (newDistance / oldDistance);

    var xoffset = (WIDTH / 2) - (((dim.maxx - dim.minx) / 2) + dim.minx);
    var yoffset = (HEIGHT / 2) - (((dim.maxy - dim.miny) / 2) + dim.miny);
    g_renderer.setOffsets(xoffset, yoffset);
    g_renderer.setDistance(newDistance);
    var before = new Date();
    g_renderer.process(g_commands, true);
    var after = new Date();
    var dataURL = canvas.toDataURL();
    var three =  PIXI.Sprite.fromImage(dataURL);
    three.anchor.x = three.anchor.y = 0;
    three.position.x = window.innerWidth / 3 * i - 100;
    pondContainer.addChild(three);
    context.clearRect(0, 0, canvas.width, canvas.height);
}


var Boids = require('boids');
var Vec2= require('./Vec2');

PIXI.Sprite.prototype.bringToFront = function() {
    if (this.parent) {
        var parent = this.parent;
        parent.removeChild(this);
        parent.addChild(this);
    }
}

var FISHES = 240;
var FLOCK = FISHES/4;
var PREDATORS = 6;

var attractors0 = [[Infinity, Infinity, 200, 0.2]];

var attractors1 = [[Infinity, Infinity, 200, 0.2]];

var predatorAtractor = [];

var boids1 = Boids({
    boids: FLOCK
    , speedLimit: 2
    , accelerationLimit: 0.7
    , attractors: attractors0
});
var boids2 = Boids({
    boids: FLOCK
    , speedLimit: 1.5
    , accelerationLimit: 0.6
    , attractors: attractors0
});
var boids3 = Boids({
    boids: FLOCK
    , speedLimit: 1.8
    , accelerationLimit: 0.9
    , attractors: attractors1
});
var boids0 = Boids({
    boids: FLOCK
    , speedLimit: 1.2
    , accelerationLimit: 0.9
    , attractors: attractors1
});

var predatorBoids = Boids({
    boids: FLOCK
    , speedLimit: 1.7
    , accelerationLimit: 0.5
    , attractors: predatorAtractor
    , separationDistance : 100
});

var boidData = new Array(4);
boidData[0] = boids0.boids;
boidData[1] = boids1.boids;
boidData[2] = boids2.boids;
boidData[3] = boids3.boids;
var predatorBoidData;


stage.addChild(pondContainer);

stage.interactive = true;



//pondContainer.addChild(bg);

//var fish = PIXI.Sprite.fromImage("displacement_fish2.jpg");//
//littleDudes.position.y = 100;
var padding = 0;
var bounds = new PIXI.Rectangle(-padding, -padding, window.innerWidth + padding * 2, window.innerHeight + padding * 2);
var fishs = [];
var predators = [];

document.body.onclick = function(e) {
    var halfHeight = bounds.height/2
        , halfWidth = bounds.width/2;

    attractors0[0][0] = e.x - halfWidth;
    attractors0[0][1] = e.y - halfHeight;

};

document.body.ondblclick = function(e) {
    var halfHeight = bounds.height/2
        , halfWidth = bounds.width/2;

    attractors1[0][0] = e.x - halfWidth;
    attractors1[0][1] = e.y - halfHeight;
};


for (var i = 0; i < FISHES; i++)
{
	var fishId = i % 4;
	fishId += 1;
	var fish =  PIXI.Sprite.fromImage("displacement_fish"+fishId+".png");
	fish.anchor.x = fish.anchor.y = 0.5;
    fish.lastLocation = new Vec2();
    fish.orientation = 0;
    fish.lastOrientation = 0;
	pondContainer.addChild(fish);
	fish.scale.x = fish.scale.y = 0.2 + Math.random() * 0.3;
    var mask = new PIXI.Graphics();
    var h = parseInt(20 + Math.random()*80);
    var w = parseInt(15 + Math.random()*40);
    fish.addChild(mask);
    mask.beginFill();
    mask.arc(0,0,w,Math.PI/2,Math.PI*3/2);
    mask.bezierCurveTo(80, 0, 140, -w/2, h, 0);
    mask.bezierCurveTo(140, 10,80, 0,  0, w);
    mask.endFill();
    mask.isMask = true;
    var eyes = new PIXI.Graphics();
    eyes.beginFill(0xFFFFFF);
    eyes.drawCircle(-2,-5, 5);
    eyes.drawCircle(-2,5, 5);
    eyes.beginFill(0x000000);
    eyes.drawCircle(-2,-5, 2);
    eyes.drawCircle(-2,5, 2);
    eyes.endFill();
    fish.addChild(eyes);
    fish.mask = mask;
	fishs.push(fish);

}

for (var i = 0; i < PREDATORS; i++) {

    var predator = PIXI.Sprite.fromImage("predator.png");
    predator.anchor.x = predator.anchor.y = 0.5;
    fish.scale.x = fish.scale.y = 0.01;
    var mask = new PIXI.Graphics();
    var h = parseInt(20 + Math.random()*80);
    var w = parseInt(15 + Math.random()*40);
    predator.addChild(mask);
    mask.beginFill();
    mask.arc(0,0,w,Math.PI/2,Math.PI*3/2);
    mask.bezierCurveTo(80, 0, 140, -w/2, h, 0);
    mask.bezierCurveTo(140, 10,80, 0,  0, w);
    mask.endFill();
    mask.isMask = true;
    var eyes = new PIXI.Graphics();
    eyes.beginFill(0xFFFFFF);
    eyes.drawCircle(-2,-5, 5);
    eyes.drawCircle(-2,5, 5);
    eyes.beginFill(0x000000);
    eyes.drawCircle(-2,-5, 2);
    eyes.drawCircle(-2,5, 2);
    eyes.endFill();
    predator.addChild(eyes);
    predator.mask = mask;
    pondContainer.addChild(predator);
    predator.lastLocation = new Vec2();
    predator.orientation = 0;
    predator.lastOrientation = 0;
    predators.push(predator);

}

requestAnimationFrame(animate);

function animate() {
    boids0.tick();
    boids1.tick();
    boids2.tick();
    boids3.tick();
    predatorBoids.tick();

    predatorBoidData = predatorBoids.boids;
    var halfHeight = bounds.height/2
        , halfWidth = bounds.width/2;
    predatorAtractor = [];
    while(attractors0.length > 1){
        attractors0.pop();
        attractors1.pop();
    }
    for (var i = 0, pl = predators.length, x, y; i < pl; i += 1) {
        var predator = predators[i];
        x = predatorBoidData[i][0];
        y = predatorBoidData[i][1];
        attr = [x, y, 300, -0.7];
        attractors0.push(attr);
        attractors1.push(attr);
        // wrap around the screen
        predatorBoidData[i][0] = x > halfWidth ? -halfWidth : -x > halfWidth ? halfWidth : x;
        predatorBoidData[i][1] = y > halfHeight ? -halfHeight : -y > halfHeight ? halfHeight : y;

        predator.position.x = x + halfWidth;
        predator.position.y = y + halfHeight;
        if (predator.position.x < bounds.x) predator.position.x += bounds.width;
        if (predator.position.x > bounds.x + bounds.width) predator.position.x -= bounds.width;

        if (predator.position.y < bounds.y) predator.position.y += bounds.height;
        if (predator.position.y > bounds.y + bounds.height) predator.position.y -= bounds.height;
        var locVector = new Vec2(predator.position.x - predator.lastLocation.x, predator.position.y - predator.lastLocation.y);
        predator.orientation = locVector.rad() + Math.PI/2;
        predator.rotation -= predator.orientation - predator.lastOrientation ;
        predator.lastOrientation = predator.orientation;
        predator.lastLocation.x =  predator.position.x;
        predator.lastLocation.y =  predator.position.y;
    }
    for (var i = 0, l = fishs.length, pl = predators.length, x, y; i < l; i += 1) {
        var fish = fishs[i];
        var fishId = i % 4;
        var idx = parseInt(i/4);
        x = boidData[fishId][idx][0];
        y = boidData[fishId][idx][1];
        predatorAtractor.push([x,y, 1500, 1]);
        // wrap around the screen
        boidData[fishId][idx][0] = x > halfWidth ? -halfWidth : -x > halfWidth ? halfWidth : x;
        boidData[fishId][idx][1] = y > halfHeight ? -halfHeight : -y > halfHeight ? halfHeight : y;


        fish.position.x = x + halfWidth;
        fish.position.y = y + halfHeight;
        if(fish.position.x < bounds.x)fish.position.x += bounds.width;
        if(fish.position.x > bounds.x + bounds.width)fish.position.x -= bounds.width;

        if(fish.position.y < bounds.y)fish.position.y += bounds.height;
        if(fish.position.y > bounds.y + bounds.height)fish.position.y -= bounds.height;
        var locVector = new Vec2(fish.position.x - fish.lastLocation.x, fish.position.y - fish.lastLocation.y);
        fish.orientation = locVector.rad() + Math.PI/2;
        fish.rotation -= fish.orientation - fish.lastOrientation ;
        fish.lastOrientation =fish.orientation;
        fish.lastLocation.x = fish.position.x;
        fish.lastLocation.y = fish.position.y;

    }
    renderer.render(stage);
    requestAnimationFrame( animate );
}


},{"./Vec2":2,"./lsystem":3,"boids":5}],5:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter
  , inherits = require('inherits')
  , sqrt = Math.sqrt
  , POSITIONX = 0
  , POSITIONY = 1
  , SPEEDX = 2
  , SPEEDY = 3
  , ACCELERATIONX = 4
  , ACCELERATIONY = 5

module.exports = Boids

function Boids(opts, callback) {
  if (!(this instanceof Boids)) return new Boids(opts, callback)
  EventEmitter.call(this)

  opts = opts || {};
  callback = callback || function(){};

  this.speedLimitRoot = opts.speedLimit || 0
  this.accelerationLimitRoot = opts.accelerationLimit || 1
  this.speedLimit = Math.pow(this.speedLimitRoot, 2)
  this.accelerationLimit = Math.pow(this.accelerationLimitRoot, 2)
  this.separationDistance = Math.pow(opts.separationDistance || 60, 2)
  this.alignmentDistance = Math.pow(opts.alignmentDistance || 180, 2)
  this.cohesionDistance = Math.pow(opts.cohesionDistance || 180, 2)
  this.separationForce = opts.separationForce || 0.15
  this.cohesionForce = opts.cohesionForce || 0.1
  this.alignmentForce = opts.alignmentForce || opts.alignment || 0.25
  this.attractors = opts.attractors || []

  var boids = this.boids = []
  for (var i = 0, l = opts.boids === undefined ? 50 : opts.boids; i < l; i += 1) {
    boids[i] = [
        Math.random()*25, Math.random()*25 // position
      , 0, 0                               // speed
      , 0, 0                               // acceleration
    ]
  }

  this.on('tick', function() {
    callback(boids)
  })
}
inherits(Boids, EventEmitter)

Boids.prototype.tick = function() {
  var boids = this.boids
    , sepDist = this.separationDistance
    , sepForce = this.separationForce
    , cohDist = this.cohesionDistance
    , cohForce = this.cohesionForce
    , aliDist = this.alignmentDistance
    , aliForce = this.alignmentForce
    , speedLimit = this.speedLimit
    , accelerationLimit = this.accelerationLimit
    , accelerationLimitRoot = this.accelerationLimitRoot
    , speedLimitRoot = this.speedLimitRoot
    , size = boids.length
    , current = size
    , sforceX, sforceY
    , cforceX, cforceY
    , aforceX, aforceY
    , spareX, spareY
    , attractors = this.attractors
    , attractorCount = attractors.length
    , distSquared
    , currPos
    , targPos
    , length
    , target

  while (current--) {
    sforceX = 0; sforceY = 0
    cforceX = 0; cforceY = 0
    aforceX = 0; aforceY = 0
    currPos = boids[current]

    // Attractors
    target = attractorCount
    while (target--) {
      attractor = attractors[target]
      spareX = currPos[0] - attractor[0]
      spareY = currPos[1] - attractor[1]
      distSquared = spareX*spareX + spareY*spareY

      if (distSquared < attractor[2]*attractor[2]) {
        length = sqrt(spareX*spareX+spareY*spareY)
        boids[current][SPEEDX] -= (attractor[3] * spareX / length) || 0
        boids[current][SPEEDY] -= (attractor[3] * spareY / length) || 0
      }
    }

    target = size
    while (target--) {
      if (target === current) continue
      spareX = currPos[0] - boids[target][0]
      spareY = currPos[1] - boids[target][1]
      distSquared = spareX*spareX + spareY*spareY

      if (distSquared < sepDist) {
        sforceX += spareX
        sforceY += spareY
      } else {
        if (distSquared < cohDist) {
          cforceX += spareX
          cforceY += spareY
        }
        if (distSquared < aliDist) {
          aforceX += boids[target][SPEEDX]
          aforceY += boids[target][SPEEDY]
        }
      }
    }

    // Separation
    length = sqrt(sforceX*sforceX + sforceY*sforceY)
    boids[current][ACCELERATIONX] += (sepForce * sforceX / length) || 0
    boids[current][ACCELERATIONY] += (sepForce * sforceY / length) || 0
    // Cohesion
    length = sqrt(cforceX*cforceX + cforceY*cforceY)
    boids[current][ACCELERATIONX] -= (cohForce * cforceX / length) || 0
    boids[current][ACCELERATIONY] -= (cohForce * cforceY / length) || 0
    // Alignment
    length = sqrt(aforceX*aforceX + aforceY*aforceY)
    boids[current][ACCELERATIONX] -= (aliForce * aforceX / length) || 0
    boids[current][ACCELERATIONY] -= (aliForce * aforceY / length) || 0
  }
  current = size

  // Apply speed/acceleration for
  // this tick
  while (current--) {
    if (accelerationLimit) {
      distSquared = boids[current][ACCELERATIONX]*boids[current][ACCELERATIONX] + boids[current][ACCELERATIONY]*boids[current][ACCELERATIONY]
      if (distSquared > accelerationLimit) {
        ratio = accelerationLimitRoot / sqrt(distSquared)
        boids[current][ACCELERATIONX] *= ratio
        boids[current][ACCELERATIONY] *= ratio
      }
    }

    boids[current][SPEEDX] += boids[current][ACCELERATIONX]
    boids[current][SPEEDY] += boids[current][ACCELERATIONY]

    if (speedLimit) {
      distSquared = boids[current][SPEEDX]*boids[current][SPEEDX] + boids[current][SPEEDY]*boids[current][SPEEDY]
      if (distSquared > speedLimit) {
        ratio = speedLimitRoot / sqrt(distSquared)
        boids[current][SPEEDX] *= ratio
        boids[current][SPEEDY] *= ratio
      }
    }

    boids[current][POSITIONX] += boids[current][SPEEDX]
    boids[current][POSITIONY] += boids[current][SPEEDY]
  }

  this.emit('tick', boids)
}

},{"events":1,"inherits":6}],6:[function(require,module,exports){
module.exports = inherits

function inherits (c, p, proto) {
  proto = proto || {}
  var e = {}
  ;[c.prototype, proto].forEach(function (s) {
    Object.getOwnPropertyNames(s).forEach(function (k) {
      e[k] = Object.getOwnPropertyDescriptor(s, k)
    })
  })
  c.prototype = Object.create(p.prototype, e)
  c.super = p
}

//function Child () {
//  Child.super.call(this)
//  console.error([this
//                ,this.constructor
//                ,this.constructor === Child
//                ,this.constructor.super === Parent
//                ,Object.getPrototypeOf(this) === Child.prototype
//                ,Object.getPrototypeOf(Object.getPrototypeOf(this))
//                 === Parent.prototype
//                ,this instanceof Child
//                ,this instanceof Parent])
//}
//function Parent () {}
//inherits(Child, Parent)
//new Child

},{}]},{},[4]);
