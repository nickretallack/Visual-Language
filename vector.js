(function() {
  var Vector, css_properties,
    __slice = Array.prototype.slice;

  css_properties = ['top', 'left'];

  Vector = (function() {

    function Vector() {
      var components;
      components = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      this.components = components;
    }

    Vector.prototype.reduce = function(initial, action) {
      return _.reduce(this.components, action, initial);
    };

    Vector.prototype.fmap = function(action) {
      return (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return typeof result === "object" ? result : child;
      })(Vector, _.map(this.components, action), function() {});
    };

    Vector.prototype.vmap = function(vector, action) {
      return (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return typeof result === "object" ? result : child;
      })(Vector, _.map(_.zip(this.components, vector.components), function(components) {
        return action.apply(null, components);
      }), function() {});
    };

    Vector.prototype.magnitude = function() {
      return Math.sqrt(this.reduce(0, function(accumulator, component) {
        return accumulator + component * component;
      }));
    };

    Vector.prototype.scale = function(factor) {
      return this.fmap(function(component) {
        return component * factor;
      });
    };

    Vector.prototype.invert = function() {
      return this.scale(-1);
    };

    Vector.prototype.add = function(vector) {
      return this.vmap(vector, function(c1, c2) {
        return c1 + c2;
      });
    };

    Vector.prototype.subtract = function(vector) {
      return this.add(vector.invert());
    };

    Vector.prototype.as_css = function() {
      return {
        left: this.components[0],
        top: this.components[1]
      };
    };

    Vector.prototype.equals = function(vector) {
      return _.all(_.zip(this.components, vector.components), function(item) {
        return item[0] === item[1];
      });
    };

    Vector.prototype.distance = function(vector) {
      return this.minus(vector).magnitude();
    };

    Vector.prototype.unit = function() {
      return this.scale(1 / this.magnitude());
    };

    Vector.prototype.angle = function() {
      return Math.atan2(this.components[1], this.components[0]);
    };

    Vector.prototype.x = function() {
      return this.components[0] || 0;
    };

    Vector.prototype.y = function() {
      return this.components[1] || 0;
    };

    Vector.prototype.z = function() {
      return this.components[2] || 0;
    };

    return Vector;

  })();

  Vector.prototype.plus = Vector.prototype.add;

  Vector.prototype.minus = Vector.prototype.subtract;

  window.V = function() {
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return typeof result === "object" ? result : child;
    })(Vector, arguments, function() {});
  };

}).call(this);
