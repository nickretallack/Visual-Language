(function() {
  var Vector, css_properties;

  css_properties = ['top', 'left'];

  Vector = (function() {

    function Vector() {
      var object;
      if (typeof arguments[0] === 'object') {
        object = arguments[0];
        if ((object.x != null) && (object.y != null)) {
          this.x = object.x, this.y = object.y;
        } else if ((object.left != null) && (object.top != null)) {
          this.x = object.left, this.y = object.top;
        }
      } else {
        this.x = arguments[0], this.y = arguments[1];
      }
    }

    Vector.prototype.components = function() {
      return [this.x, this.y];
    };

    Vector.prototype.reduce = function(initial, action) {
      return _.reduce(this.components(), action, initial);
    };

    Vector.prototype.fmap = function(action) {
      return (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return typeof result === "object" ? result : child;
      })(Vector, _.map(this.components(), action), function() {});
    };

    Vector.prototype.vmap = function(vector, action) {
      return (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return typeof result === "object" ? result : child;
      })(Vector, _.map(_.zip(this.components(), vector.components()), function(components) {
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
        left: this.x,
        top: this.y
      };
    };

    Vector.prototype.equals = function(vector) {
      return _.all(_.zip(this.components(), vector.components()), function(item) {
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
      return Math.atan2(this.y, this.x);
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
