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
