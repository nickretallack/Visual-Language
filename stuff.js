var async, connecting_object, delay, dragging_object, dragging_offset, highlight, highlighted_objects, module, pretty_json, transform_position, unhighlight, unhighlight_all, valid_json, whitespace_split,
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
    controller: function($scope, $element, $attrs, interpreter) {
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
          if (from !== to && !((from instanceof interpreter.Input && to instanceof interpreter.Input) || (from instanceof interpreter.Output && to instanceof interpreter.Output))) {
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

module.controller('subroutine', function($scope, $routeParams, interpreter, $q) {
  return $q.when(interpreter.subroutines, function(subroutines) {
    return $scope.$root.current_object = subroutines[$routeParams.id];
  });
});

module.controller('library', function($scope, $q, interpreter) {
  var hide,
    _this = this;
  $scope.subroutines = interpreter.subroutines;
  hide = function() {
    return $scope.$root.overlay = null;
  };
  $scope.use = function(subroutine) {
    if (subroutine instanceof interpreter.Subroutine) {
      new interpreter.SubroutineApplication($scope.$root.current_object, V(0, 0), subroutine);
    } else {
      new interpreter.BuiltinApplication($scope.$root.current_object, V(0, 0), subroutine);
    }
    return hide();
  };
  $scope.use_value = function(subroutine) {
    new interpreter.Literal($scope.$root.current_object, V(0, 0), subroutine);
    return hide();
  };
  $scope.literal_text = '';
  return $scope.use_literal = function() {
    if (valid_json($scope.literal_text)) {
      new interpreter.Literal($scope.$root.current_object, V(0, 0), $scope.literal_text);
      $scope.literal_text = '';
      return hide();
    }
  };
});

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

module.controller('Controller', function($scope, $http, $location, interpreter, $q) {
  $scope.tab_click = function(tab) {
    return $scope.$root.overlay = $scope.$root.overlay === tab ? null : tab;
  };
  return $scope.new_graph = function() {
    return $q.when(interpreter.subroutines, function(subroutines) {
      var subroutine;
      subroutine = new interpreter.Subroutine;
      subroutines[subroutine.id] = subroutine;
      return $location.path("" + subroutine.id);
    });
  };
  /*
      saving = false
      start_saving = -> #setInterval save_state, 500 if not saving
      $scope.log = (expression) -> console.log expression
  
      $scope.import_export_text = ''
      $scope.subroutines = {}
      $scope.builtins = {}
      $scope.import = ->
          import_data valid_source $scope.import_export_text
          $scope.edit current_scope if current_scope
          start_saving()
  
      import_data = (source_data) =>
          data = load_state source_data
          for id, subroutine of data.subroutines
              $scope.subroutines[subroutine.id] = subroutine
          for id, builtin of data.builtins
              $scope.builtins[builtin.id] = builtin
  
      $scope.export_all = ->
          data =
              subroutines:$scope.subroutines
              builtins:$scope.builtins
              schema_version:schema_version
          $scope.import_export_text = pretty_json data
  
      $scope.export_subroutine = (subroutine) =>
          $scope.import_export_text = pretty_json subroutine.export()
  
      $scope.export_builtin = (builtin) =>
          $scope.import_export_text = pretty_json builtin.export()
  
      $scope.revert = ->
          $scope.subroutines = {}
          $scope.builtins = {}
          $scope.load_example_programs()
  
      $scope.initial_subroutine =
          name:''
          inputs:[]
          outputs:[]
      $scope.new_subroutine = angular.copy $scope.initial_subroutine
  
      $scope.delete_subroutine = (subroutine) =>
          if subroutine.id is current_scope.id
              $scope.current_object = null
              teardown_field()
          delete $scope.subroutines[subroutine.id]
  
      $scope.delete_builtin = (builtin) =>
          delete $scope.builtins[builtin.id]
  
      $scope.add_subroutine = =>
          subroutine = new Subroutine $scope.new_subroutine.name, $scope.new_subroutine.inputs, $scope.new_subroutine.outputs
  
          # first find all the connections
          in_connections = {}
          out_connections = {}
          for id, node of highlighted_objects
              for id, nib of node.inputs
                  for id, connection of nib.connections
                      in_connections[connection.connection.id] = connection.connection
              for id, nib of node.outputs
                  for id, connection of nib.connections
                      out_connections[connection.connection.id] = connection.connection
  
          # see which ones are contained in the system
          contained_connections = {}
          for id, connection of in_connections
              if connection.id of out_connections
                  contained_connections[connection.id] = connection
                  delete in_connections[connection.id]
                  delete out_connections[connection.id]
  
          # move the contained ones
          for id, connection of contained_connections
              current_scope.remove_connection connection
              subroutine.add_connection connection
  
          # clip the others
          for id, connection of in_connections
              connection.delete()
  
          for id, connection of out_connections
              connection.delete()
  
          # move the nodes
          for id, node of highlighted_objects
              current_scope.remove_node node
              subroutine.add_node node
  
          $scope.subroutines[subroutine.id] = subroutine
          $scope.new_subroutine = angular.copy $scope.initial_subroutine
          $scope.new_subroutine.inputs = []
          $scope.new_subroutine.outputs = []
          $scope.edit subroutine
  
      $scope.add_builtin = =>
          builtin = new Builtin {}
          $scope.builtins[builtin.id] = builtin
          $scope.edit builtin
  
      $scope.run_subroutine = (subroutine, output_index) ->
          subroutine.run output_index
  
      save_state = =>
          state =
              subroutines:$scope.subroutines
              builtins:$scope.builtins
              schema_version:schema_version
  
          localStorage.state = JSON.stringify state
  
      #system_arrow = make_arrow V(0,0), V(1,0), false
  */
});
