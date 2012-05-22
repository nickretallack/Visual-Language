var NodeView, animate, animations_counter, async, blab, connecting_object, delay, dissociate_exception, dragging_object, dragging_offset, editor_size, eval_expression, get_absolute_nib_position, get_nib_position, highlight, highlighted_objects, ignore_if_disconnected, last, make_arrow, make_connection, module, mouse_coords, obj_first, pretty_json, ray_cast_mouse, transform_position, unhighlight, unhighlight_all, update, valid_json, whitespace_split,
  __slice = Array.prototype.slice;

editor_size = V(window.innerWidth, window.innerHeight);

V(1, 1).plus(V(2, 2));

module = angular.module('vislang', []);

module.directive('nib', function() {
  return {
    template: "<div class=\"nib\"></div>",
    replace: true,
    transclude: true,
    require: '^subroutine',
    scope: {
      nib: 'accessor'
    },
    link: function(scope, element, attributes, controller) {
      var nib;
      console.log(arguments);
      nib = scope.nib();
      nib.view = $(element);
      element.bind('mousedown', function(event) {
        return scope.$apply(function() {
          return controller.click_nib(nib, event);
        });
      });
      return element.bind('mouseup', function(event) {
        return scope.$apply(function() {
          return controller.release_nib(nib, event);
        });
      });
    }
  };
});

module.directive('shrinkyInput', function() {
  return function(scope, element, attributes) {
    var $element, doppelganger;
    doppelganger = $("<span class=\"offscreen\"></span>");
    $element = $(element);
    doppelganger.css({
      padding: $element.css('padding'),
      border: $element.css('border'),
      'min-width': '3ex',
      position: 'absolute',
      left: '-9999px',
      top: '-9999px'
    });
    $(document.body).append(doppelganger);
    return scope.$watch(attributes.shrinkyInput, function(text) {
      doppelganger.text(text);
      return async(function() {
        $(element).css({
          width: doppelganger.width() + 2
        });
        return scope.draw_connections();
      });
    });
  };
});

async = setTimeout;

delay = function(time, procedure) {
  return setTimeout(procedure, time);
};

module.directive('connections', function() {
  return {
    link: function(scope, element, attributes) {}
  };
});

transform_position = function(position, editor_size) {
  return {
    x: position.y + editor_size.x / 2,
    y: position.x + editor_size.y / 2
  };
};

/*
module.directive 'node', ->
    link:(scope, element, attributes) ->
        node = scope.$eval attributes.node
*/

module.directive('subroutine', function() {
  return {
    link: function(scope, element, attributes) {},
    controller: function($scope, $element, $attrs) {
      var $$element, canvas, canvas_offset, draw, header_height, nib_center, nib_offset, resize_canvas, subroutine,
        _this = this;
      $$element = $($element);
      $scope.position = function(node) {
        var position;
        position = transform_position(node.position, $scope.editor_size);
        return {
          left: position.x + 'px',
          top: position.y + 'px'
        };
      };
      $scope.pairs = function(node) {
        var index, pairs, _ref;
        pairs = [];
        for (index = 0, _ref = Math.max(node.inputs.length, node.outputs.length); 0 <= _ref ? index < _ref : index > _ref; 0 <= _ref ? index++ : index--) {
          pairs.push({
            input: node.inputs[index],
            output: node.outputs[index]
          });
        }
        return pairs;
      };
      $scope.mouse_position = V(0, 0);
      $element.bind('mousemove', function(event) {
        return $scope.$apply(function() {
          var mouse_delta, new_mouse_position, node, _i, _len, _ref;
          new_mouse_position = V(event.clientX, event.clientY);
          mouse_delta = $scope.mouse_position.minus(new_mouse_position);
          $scope.mouse_position = new_mouse_position;
          _ref = $scope.dragging;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            node = _ref[_i];
            node.position = node.position.plus(V(-mouse_delta.y, -mouse_delta.x));
          }
          return draw();
        });
      });
      $element.bind('mouseup', function(event) {
        return $scope.$apply(function() {
          $scope.dragging = [];
          $scope.drawing = null;
          return draw();
        });
      });
      $scope.dragging = [];
      $scope.click_node = function(node, $event) {
        console.log("click node");
        $event.preventDefault();
        return $scope.dragging = [node];
      };
      $scope.drawing = null;
      this.click_nib = $scope.click_nib = function(nib, $event) {
        console.log("click nib");
        $event.preventDefault();
        $event.stopPropagation();
        return $scope.drawing = nib;
      };
      this.release_nib = $scope.release_nib = function(nib) {
        var from, to, _ref;
        if ($scope.drawing) {
          _ref = [nib, $scope.drawing], from = _ref[0], to = _ref[1];
          if (from !== to && !((from instanceof Input && to instanceof Input) || (from instanceof Output && to instanceof Output))) {
            return from.connect(to);
          }
        }
      };
      $scope.evaluate_output = function(output) {
        return subroutine.run(output);
      };
      $scope.literal_text = '';
      $scope.use_literal = function() {
        if (valid_json($scope.literal_text)) {
          new Literal(V(0, 0), $scope.literal_text);
          return $scope.literal_text = '';
        }
      };
      $scope.use = function(subroutine) {
        if (subroutine instanceof Subroutine) {
          return new SubroutineApplication(V(0, 0), subroutine);
        } else {
          return new BuiltinApplication(V(0, 0), builtin);
        }
      };
      $scope.use_value = function(subroutine) {
        return new Literal(V(0, 0), subroutine);
      };
      $scope.draw_connections = function() {
        return draw();
      };
      subroutine = $scope.$eval($attrs.subroutine);
      header_height = 30;
      nib_center = V(5, 5);
      canvas_offset = V(0, header_height);
      nib_offset = canvas_offset.minus(nib_center);
      canvas = $element.find('canvas')[0];
      draw = function() {
        return async(function() {
          var c, connection, end_position, id, input_element, input_position, line_height, nib_position, output_element, output_position, _ref;
          if (subroutine) {
            line_height = 16;
            c = canvas.getContext('2d');
            c.clearRect.apply(c, [0, 0].concat(__slice.call($scope.editor_size.components())));
            _ref = subroutine.connections;
            for (id in _ref) {
              connection = _ref[id];
              input_element = connection.input.view;
              output_element = connection.output.view;
              if (input_element && output_element) {
                input_position = V(input_element.offset()).subtract(nib_offset);
                output_position = V(output_element.offset()).subtract(nib_offset);
                c.beginPath();
                c.moveTo.apply(c, input_position.components());
                c.lineTo.apply(c, output_position.components());
                c.stroke();
              }
            }
            if ($scope.drawing) {
              nib_position = V($scope.drawing.view.offset()).subtract(nib_offset);
              end_position = $scope.mouse_position.subtract(canvas_offset);
              c.beginPath();
              c.moveTo.apply(c, nib_position.components());
              c.lineTo.apply(c, end_position.components());
              return c.stroke();
            }
          }
        });
      };
      resize_canvas = function() {
        var _ref;
        $scope.editor_size = V($$element.width(), $$element.height());
        _ref = $scope.editor_size.components(), canvas.width = _ref[0], canvas.height = _ref[1];
        return draw();
      };
      $(window).on('resize', function() {
        return $scope.$apply(resize_canvas);
      });
      return resize_canvas();
    }
  };
});

module.config(function($routeProvider) {
  $routeProvider.when('/:id', {
    controller: 'subroutine',
    template: "subroutine.html"
  });
  return $routeProvider.when('', {
    template: "intro.html"
  });
});

module.controller('subroutine', function($scope, $routeParams, subroutines, $q) {
  return $q.when(subroutines, function(subroutines) {
    return $scope.current_object = subroutines[$routeParams.id];
  });
});

module.controller('library', function($scope, subroutines, $q) {
  return $scope.subroutines = subroutines;
});

/*
<ul class="inputs"><li ng-repeat="input in node.inputs">{{input.text}}</li></ul>
<ul class="outputs"><li ng-repeat="output in node.outputs">{{output.text}}</li></ul>


module.directive 'subroutine', ->
    (scope, element, attributes) ->
        graphics = Raphael element[0], editor_size.components()...
        scope.$watch attributes.subroutine, (subroutine) ->
            graphics.clear()
            for id, node of subroutine.nodes
                new NodeView graphics, node
*/

blab = function() {
  return console.log(arguments);
};

NodeView = (function() {

  function NodeView(graphics, node) {
    var corner_position, editor_offset, position, size, text_width;
    this.graphics = graphics;
    this.node = node;
    this.set = graphics.set();
    size = V(50, 50);
    editor_offset = editor_size.scale(0.5);
    position = V(node.position).plus(editor_offset);
    position.y = editor_size.y - position.y;
    this.text = graphics.text(position.x, position.y + 10, node.text);
    this.text.attr('text-anchor', 'middle');
    this.set.push(this.text);
    text_width = this.text.getBBox().width;
    corner_position = position.minus(V(text_width / 2, 0));
    this.shape = graphics.rect(corner_position.x - 5, corner_position.y, text_width + 10, size.y);
    this.shape.attr('fill', 'blue');
    this.set.push(this.shape);
    this.shape.drag(blab, blab, blab);
  }

  return NodeView;

})();

last = function(list) {
  return list[list.length - 1];
};

obj_first = function(obj) {
  var item, key;
  for (key in obj) {
    item = obj[key];
    return item;
  }
};

update = function() {
  return renderer.render(scene, camera);
};

animations_counter = 0;

animate = function(field) {
  requestAnimationFrame((function() {
    return animate(field);
  }), field);
  animations_counter += 1;
  return update();
};

eval_expression = function(expression) {
  return eval("(" + expression + ")");
};

/* FACTORIES
*/

make_connection = function(source, target) {
  var input, output;
  if (source.model instanceof Input) {
    input = source.model;
    output = target.model;
  } else {
    input = target.model;
    output = source.model;
  }
  return new Connection(input, output);
};

make_arrow = function(source, target, scoped) {
  var arrow, color, line, line_geometry, line_material;
  if (scoped == null) scoped = true;
  arrow = new THREE.Object3D();
  color = 0x888888;
  if ('three' in source) source = source.three();
  if ('three' in target) target = target.three();
  line_geometry = new THREE.Geometry();
  line_material = new THREE.LineBasicMaterial({
    color: color,
    linewidth: 3
  });
  line_geometry.vertices.push(new THREE.Vertex(source));
  line_geometry.vertices.push(new THREE.Vertex(target));
  line = new THREE.Line(line_geometry, line_material);
  if (scoped) current_scope.view.add(line);
  return line;
};

/* CORE HELPERS
*/

ray_cast_mouse = function() {
  var forward, intersections, mouse, ray;
  mouse = mouse_coords(event).three();
  mouse.z = 1;
  forward = new THREE.Vector3(0, 0, -1);
  ray = new THREE.Ray(mouse, forward);
  intersections = ray.intersectScene(scene);
  if (intersections.length > 0) return (last(intersections)).object.parent;
};

mouse_coords = function(event) {
  return V(event.offsetX, editor_size.y - event.offsetY);
};

get_nib_position = function(nib) {
  if (nib.parent instanceof Node) {
    return Vector.from(nib.view.position).plus(nib.view.parent.position).three();
  } else {
    return Vector.from(nib.view.position).three();
  }
};

get_absolute_nib_position = function(nib) {
  return Vector.from(get_nib_position(nib)).plus(half_editor_size).three();
};

/* INTERACTION
*/

dragging_object = null;

connecting_object = null;

dragging_offset = V(0, 0);

highlighted_objects = {};

highlight = function(node) {
  node.view.children[0].material = highlighted_node_material;
  return highlighted_objects[node.id] = node;
};

unhighlight = function(node) {
  node.view.children[0].material = node_material;
  return delete highlighted_objects[node.id];
};

unhighlight_all = function() {
  var id, obj, _results;
  _results = [];
  for (id in highlighted_objects) {
    obj = highlighted_objects[id];
    _results.push(unhighlight(obj));
  }
  return _results;
};

whitespace_split = function(input) {
  var results;
  results = input.split(/\s+/);
  if (results[0] === '') results = results.slice(1);
  return results;
};

valid_json = function(json) {
  try {
    return JSON.parse(json);
  } catch (exception) {
    if (exception instanceof SyntaxError) {
      alert("" + exception + " Invalid JSON: " + json);
      return false;
    } else {
      throw exception;
    }
  }
};

pretty_json = function(obj) {
  return JSON.stringify(obj, void 0, 2);
};

module.controller('Controller', function($scope, $http, $location) {
  var import_data, save_state, saving, start_saving,
    _this = this;
  $scope.overlay = null;
  $scope.tab_click = function(tab) {
    return $scope.overlay = $scope.overlay === tab ? null : tab;
  };
  saving = false;
  start_saving = function() {};
  $scope.log = function(expression) {
    return console.log(expression);
  };
  $scope.import_export_text = '';
  $scope.subroutines = {};
  $scope.builtins = {};
  $scope["import"] = function() {
    import_data(valid_source($scope.import_export_text));
    if (current_scope) $scope.edit(current_scope);
    return start_saving();
  };
  import_data = function(source_data) {
    var builtin, data, id, subroutine, _ref, _ref2, _results;
    data = load_state(source_data);
    _ref = data.subroutines;
    for (id in _ref) {
      subroutine = _ref[id];
      $scope.subroutines[subroutine.id] = subroutine;
    }
    _ref2 = data.builtins;
    _results = [];
    for (id in _ref2) {
      builtin = _ref2[id];
      _results.push($scope.builtins[builtin.id] = builtin);
    }
    return _results;
  };
  $scope.export_all = function() {
    var data;
    data = {
      subroutines: $scope.subroutines,
      builtins: $scope.builtins,
      schema_version: schema_version
    };
    return $scope.import_export_text = pretty_json(data);
  };
  $scope.export_subroutine = function(subroutine) {
    return $scope.import_export_text = pretty_json(subroutine["export"]());
  };
  $scope.export_builtin = function(builtin) {
    return $scope.import_export_text = pretty_json(builtin["export"]());
  };
  $scope.revert = function() {
    $scope.subroutines = {};
    $scope.builtins = {};
    return $scope.load_example_programs();
  };
  $scope.initial_subroutine = {
    name: '',
    inputs: [],
    outputs: []
  };
  $scope.new_subroutine = angular.copy($scope.initial_subroutine);
  $scope.delete_subroutine = function(subroutine) {
    if (subroutine.id === current_scope.id) {
      $scope.current_object = null;
      teardown_field();
    }
    return delete $scope.subroutines[subroutine.id];
  };
  $scope.delete_builtin = function(builtin) {
    return delete $scope.builtins[builtin.id];
  };
  $scope.add_subroutine = function() {
    var connection, contained_connections, id, in_connections, nib, node, out_connections, subroutine, _ref, _ref2, _ref3, _ref4;
    subroutine = new SubRoutine($scope.new_subroutine.name, $scope.new_subroutine.inputs, $scope.new_subroutine.outputs);
    in_connections = {};
    out_connections = {};
    for (id in highlighted_objects) {
      node = highlighted_objects[id];
      _ref = node.inputs;
      for (id in _ref) {
        nib = _ref[id];
        _ref2 = nib.connections;
        for (id in _ref2) {
          connection = _ref2[id];
          in_connections[connection.connection.id] = connection.connection;
        }
      }
      _ref3 = node.outputs;
      for (id in _ref3) {
        nib = _ref3[id];
        _ref4 = nib.connections;
        for (id in _ref4) {
          connection = _ref4[id];
          out_connections[connection.connection.id] = connection.connection;
        }
      }
    }
    contained_connections = {};
    for (id in in_connections) {
      connection = in_connections[id];
      if (connection.id in out_connections) {
        contained_connections[connection.id] = connection;
        delete in_connections[connection.id];
        delete out_connections[connection.id];
      }
    }
    for (id in contained_connections) {
      connection = contained_connections[id];
      current_scope.remove_connection(connection);
      subroutine.add_connection(connection);
    }
    for (id in in_connections) {
      connection = in_connections[id];
      connection["delete"]();
    }
    for (id in out_connections) {
      connection = out_connections[id];
      connection["delete"]();
    }
    for (id in highlighted_objects) {
      node = highlighted_objects[id];
      current_scope.remove_node(node);
      subroutine.add_node(node);
    }
    $scope.subroutines[subroutine.id] = subroutine;
    $scope.new_subroutine = angular.copy($scope.initial_subroutine);
    $scope.new_subroutine.inputs = [];
    $scope.new_subroutine.outputs = [];
    return $scope.edit(subroutine);
  };
  $scope.add_builtin = function() {
    var builtin;
    builtin = new Builtin({});
    $scope.builtins[builtin.id] = builtin;
    return $scope.edit(builtin);
  };
  $scope.run_subroutine = function(subroutine, output_index) {
    return subroutine.run(output_index);
  };
  return save_state = function() {
    var state;
    state = {
      subroutines: $scope.subroutines,
      builtins: $scope.builtins,
      schema_version: schema_version
    };
    return localStorage.state = JSON.stringify(state);
  };
});

module.factory('subroutines', function($q, $http) {
  var source_data;
  if (false) {
    source_data = JSON.parse(localStorage.state);
  } else {
    source_data = $q.defer();
    $http.get('examples.json').success(function(data) {
      return source_data.resolve(data);
    });
  }
  return $q.when(source_data.promise, function(source_data) {
    var data, subroutines;
    data = load_state(source_data);
    subroutines = $.extend(data.builtins, data.subroutines);
    return subroutines;
  });
});

dissociate_exception = function(procedure) {
  try {
    return procedure();
  } catch (exception) {
    return setTimeout(function() {
      throw exception;
    });
  }
};

ignore_if_disconnected = function(procedure) {
  try {
    return procedure();
  } catch (exception) {
    if (!(exception instanceof NotConnected)) throw exception;
  }
};
