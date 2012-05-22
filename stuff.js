var animate, animations_counter, async, blab, connecting_object, delay, dragging_object, dragging_offset, eval_expression, highlight, highlighted_objects, last, module, mouse_coords, obj_first, pretty_json, transform_position, unhighlight, unhighlight_all, update, valid_json, whitespace_split,
  __slice = Array.prototype.slice;

module = angular.module('vislang', []);

async = setTimeout;

delay = function(time, procedure) {
  return setTimeout(procedure, time);
};

transform_position = function(position, editor_size) {
  return {
    x: position.y + editor_size.x / 2,
    y: position.x + editor_size.y / 2
  };
};

module.directive('nib', function() {
  return {
    template: "<div class=\"nib\"></div>",
    replace: true,
    require: '^subroutine',
    scope: {
      nib: 'accessor'
    },
    link: function(scope, element, attributes, controller) {
      var nib;
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
  return {
    require: '^subroutine',
    link: function(scope, element, attributes, controller) {
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
          return controller.draw();
        });
      });
    }
  };
});

module.directive('subroutine', function() {
  return {
    link: function(scope, element, attributes) {},
    controller: function($scope, $element, $attrs) {
      var $$element, canvas, canvas_offset, draw, header_height, nib_center, nib_offset, resize_canvas, subroutine;
      $$element = $($element);
      subroutine = $scope.$eval($attrs.subroutine);
      $scope.dragging = [];
      $scope.drawing = null;
      $scope.evaluate_output = function(output) {
        return subroutine.run(output);
      };
      /* Node and nib interaction
      */
      $scope.position = function(node) {
        var position;
        position = transform_position(node.position, $scope.editor_size);
        return {
          left: position.x + 'px',
          top: position.y + 'px'
        };
      };
      $scope.click_node = function(node, $event) {
        $event.preventDefault();
        return $scope.dragging = [node];
      };
      this.click_nib = $scope.click_nib = function(nib, $event) {
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
      $element.bind('mouseup', function(event) {
        return $scope.$apply(function() {
          $scope.dragging = [];
          $scope.drawing = null;
          return draw();
        });
      });
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
      /* Drawing the Connection Field
      */
      header_height = 30;
      nib_center = V(5, 5);
      canvas_offset = V(0, header_height);
      nib_offset = canvas_offset.minus(nib_center);
      canvas = $element.find('canvas')[0];
      this.draw = draw = function() {
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
    return $scope.$root.current_object = subroutines[$routeParams.id];
  });
});

module.controller('library', function($scope, subroutines, $q) {
  var hide,
    _this = this;
  $scope.subroutines = subroutines;
  hide = function() {
    return $scope.$root.overlay = null;
  };
  $scope.use = function(subroutine) {
    if (subroutine instanceof Subroutine) {
      new SubroutineApplication($scope.$root.current_object, V(0, 0), subroutine);
    } else {
      new BuiltinApplication($scope.$root.current_object, V(0, 0), subroutine);
    }
    return hide();
  };
  $scope.use_value = function(subroutine) {
    new Literal($scope.$root.current_object, V(0, 0), subroutine);
    return hide();
  };
  $scope.literal_text = '';
  return $scope.use_literal = function() {
    if (valid_json($scope.literal_text)) {
      new Literal($scope.$root.current_object, V(0, 0), $scope.literal_text);
      $scope.literal_text = '';
      return hide();
    }
  };
});

blab = function() {
  return console.log(arguments);
};

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

mouse_coords = function(event) {
  return V(event.offsetX, editor_size.y - event.offsetY);
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
  $scope.tab_click = function(tab) {
    return $scope.$root.overlay = $scope.$root.overlay === tab ? null : tab;
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
    subroutine = new Subroutine($scope.new_subroutine.name, $scope.new_subroutine.inputs, $scope.new_subroutine.outputs);
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
