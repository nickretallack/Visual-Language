// Generated by CoffeeScript 1.3.3
(function() {
  var connecting_object, dragging_object, dragging_offset, highlight, highlighted_objects, is_valid_json, module, pretty_json, unhighlight, unhighlight_all, valid_json, whitespace_split;

  module = angular.module('vislang', []);

  window.async = setTimeout;

  window.delay = function(time, procedure) {
    return setTimeout(procedure, time);
  };

  module.run(function($rootScope) {
    return $rootScope.search = '';
  });

  module.filter('text_or_id', function() {
    return function(obj, length) {
      return obj.text || obj.id;
    };
  });

  module.directive('ace', function() {
    return {
      scope: {
        ace: '='
      },
      link: function(scope, element, attributes) {
        var JavaScriptMode, changing, editor, expression, session, set_value;
        expression = attributes.ace;
        JavaScriptMode = require("ace/mode/javascript").Mode;
        editor = ace.edit(element[0]);
        session = editor.getSession();
        session.setMode(new JavaScriptMode());
        changing = false;
        set_value = null;
        scope.$watch('ace', function(value) {
          if (value !== set_value) {
            changing = true;
            session.setValue(value);
            return changing = false;
          }
        });
        return session.on('change', function() {
          if (!changing) {
            return scope.$apply(function() {
              set_value = session.getValue();
              return scope.ace = set_value;
            });
          }
        });
      }
    };
  });

  module.directive('shrinkyInput', function() {
    return {
      link: function(scope, element, attributes, controller) {
        var $element, doppelganger;
        doppelganger = $("<span class=\"offscreen\"></span>");
        $element = $(element);
        doppelganger.css({
          padding: $element.css('padding'),
          border: $element.css('border'),
          'font-size': $element.css('font-size'),
          'min-width': '3ex',
          position: 'absolute',
          left: '-9999px',
          top: '-9999px'
        });
        $(document.body).append(doppelganger);
        return scope.$watch(attributes.shrinkyInput, function(text) {
          console.log(text);
          doppelganger.text(text + "M");
          return async(function() {
            return scope.$apply(function() {
              $(element).css({
                width: doppelganger.width() + 2
              });
              return scope.$emit('redraw-graph');
            });
          });
        });
      }
    };
  });

  module.config(function($routeProvider) {
    $routeProvider.when('/:id', {
      controller: 'subroutine',
      templateUrl: "subroutine.html"
    });
    return $routeProvider.when('', {
      templateUrl: "intro.html"
    });
  });

  module.controller('subroutine', function($scope, $routeParams, interpreter, $q) {
    return $q.when(interpreter.loaded, function() {
      return $scope.$root.current_object = interpreter.subroutines[$routeParams.id];
    });
  });

  module.controller('library', function($scope, $q, interpreter) {
    var _this = this;
    $scope.get_subroutines = function() {
      return _.values(interpreter.subroutines);
    };
    $scope.use = function(subroutine) {
      return new interpreter.Call($scope.$root.current_object, V(0, 0), subroutine);
    };
    $scope.use_value = function(user_input) {
      return interpreter.make_value($scope.$root.current_object, V(0, 0), user_input);
    };
    $scope.use_string_literal = function(text) {
      return interpreter.make_value($scope.$root.current_object, V(0, 0), text, true);
    };
    $scope.is_literal = function(thing) {
      return thing instanceof interpreter.Literal;
    };
    $scope.is_valid_json = is_valid_json;
    $scope.literal_text = '';
    $scope.use_literal = function() {
      if (valid_json($scope.literal_text)) {
        new interpreter.Value($scope.$root.current_object, V(0, 0), $scope.literal_text);
        $scope.literal_text = '';
        return hide();
      }
    };
    return $scope.name_subroutine = function(subroutine) {
      return subroutine.text || subroutine.id.slice(0, 21);
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
    if (results[0] === '') {
      results = results.slice(1);
    }
    return results;
  };

  is_valid_json = function(json) {
    try {
      JSON.parse(json);
      return true;
    } catch (exception) {
      return false;
    }
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
    var make_something;
    $scope.tab_click = function(tab) {
      return $scope.$root.overlay = $scope.$root.overlay === tab ? null : tab;
    };
    make_something = function(type) {
      return $q.when(interpreter.loaded, function() {
        var subroutine;
        subroutine = (new type).initialize();
        return $location.path("" + subroutine.id);
      });
    };
    $scope.new_graph = function() {
      return make_something(interpreter.Graph);
    };
    $scope.new_code = function() {
      return make_something(interpreter.JavaScript);
    };
    return $scope.new_graph_from_selection = function() {
      return $scope.$broadcast('new-graph-from-selection');
    };
    /*
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
    */

  });

}).call(this);
