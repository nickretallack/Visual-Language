// Generated by CoffeeScript 1.4.0
(function() {
  var connecting_object, dragging_object, dragging_offset, is_valid_json, module, pretty_json, valid_json;

  module = angular.module('vislang', []);

  window.async = setTimeout;

  window.delay = function(time, procedure) {
    return setTimeout(procedure, time);
  };

  module.run(function($rootScope) {
    return $rootScope.search = '';
  });

  module.filter('value_representation', function(interpreter) {
    return function(obj) {
      if (obj instanceof interpreter.BaseType) {
        return "<" + obj.constructor.name + ": \"" + (obj.get_name()) + "\">";
      } else {
        try {
          return JSON.stringify(obj);
        } catch (error) {
          return "(unprintable)";
        }
      }
    };
  });

  module.filter('text_or_id', function() {
    return function(obj) {
      if (obj.text) {
        return obj.text;
      } else if (obj.value) {
        return obj.value;
      } else {
        return obj.id;
      }
    };
  });

  module.filter('value_or_id', function() {
    return function(obj) {
      if (obj.value) {
        return obj.value;
      } else {
        return obj.id;
      }
    };
  });

  module.filter('is_valid_json', function() {
    return is_valid_json;
  });

  module.filter('node_type', function(interpreter) {
    return function(obj) {
      if (obj instanceof interpreter.Call) {
        return 'call';
      } else {
        return 'value';
      }
    };
  });

  module.filter('syntax', function(interpreter) {
    return function(obj) {
      var result;
      return result = obj instanceof interpreter.CoffeeScript ? 'coffee' : obj instanceof interpreter.JavaScript ? 'javascript' : obj instanceof interpreter.JSON ? 'json' : 'plain';
    };
  });

  module.filter('isa', function(interpreter) {
    return function(obj, type) {
      try {
        return obj instanceof interpreter[type];
      } catch (error) {
        return console.log('yeah');
      }
    };
  });

  module.filter('implementation_type', function(interpreter) {
    return function(it) {
      if (it instanceof interpreter.Lambda) {
        return 'lambda';
      } else if (it instanceof interpreter.Graph) {
        return 'graph';
      } else if (it instanceof interpreter.JavaScript) {
        return 'javascript';
      } else if (it instanceof interpreter.CoffeeScript) {
        return 'coffeescript';
      } else if (it instanceof interpreter.Text) {
        return 'string';
      } else if (it instanceof interpreter.JSON) {
        return 'json';
      } else if (it instanceof interpreter.Symbol) {
        return 'symbol';
      }
    };
  });

  module.filter('editor_type', function(interpreter) {
    return function(obj) {
      if (obj instanceof interpreter.Lambda) {
        return 'lambda';
      } else if (obj instanceof interpreter.Type) {
        return 'type';
      } else if (obj instanceof interpreter.Graph) {
        return 'graph';
      } else if (obj instanceof interpreter.Code) {
        return 'code';
      } else if (obj instanceof interpreter.Symbol) {
        return 'symbol';
      } else if (obj instanceof interpreter.Literal) {
        return 'literal';
      }
    };
  });

  module.directive('ace', function($interpolate) {
    return {
      require: '?ngModel',
      link: function(scope, element, attributes, ngModel) {
        var changing, editor, read, session;
        editor = ace.edit(element[0]);
        session = editor.getSession();
        attributes.$observe('syntax', function(syntax) {
          var SyntaxMode;
          if (syntax && syntax !== 'plain') {
            SyntaxMode = require("ace/mode/" + syntax).Mode;
            return session.setMode(new SyntaxMode());
          }
        });
        if (!ngModel) {
          return;
        }
        changing = false;
        ngModel.$render = function() {
          changing = true;
          session.setValue(ngModel.$viewValue || '');
          return changing = false;
        };
        read = function() {
          return ngModel.$setViewValue(session.getValue());
        };
        return session.on('change', function() {
          if (!changing) {
            return scope.$apply(read);
          }
        });
      }
    };
  });

  module.directive('shrinkyInput', function($timeout) {
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
          doppelganger.text(text + "M");
          return $timeout(function() {
            $(element).css({
              width: doppelganger.width() + 2
            });
            return scope.$emit('redraw-graph');
          });
        });
      }
    };
  });

  module.directive('runtimeGraphics', function(interpreter) {
    return {
      link: function(scope, element, attributes) {
        var runtime;
        runtime = scope.$eval(attributes.runtimeGraphics);
        return element.append(runtime.graphics_element);
      }
    };
  });

  module.controller('subroutine', function($scope, $routeParams, interpreter, $q) {
    var definition, delete_nib;
    definition = null;
    $q.when(interpreter.loaded, function() {
      return definition = $scope.$root.definition = interpreter.subroutines[$routeParams.id];
    });
    $scope.evaluate_output = function(output) {
      var runtime;
      $scope.stop_debugging();
      runtime = new interpreter.Runtime({
        graphics_element: $("<div></div>"),
        definition: definition
      });
      $scope.$root.runtime = window.runtime = runtime;
      console.log(runtime);
      return runtime.run(output);
    };
    $scope.new_input = function() {
      definition.add_input();
      return async(function() {
        return $('.subroutine-input:last input:first').focus();
      });
    };
    $scope.new_output = function() {
      definition.add_output();
      return async(function() {
        return $('.subroutine-output:last input:first').focus();
      });
    };
    delete_nib = function(nib, direction, type) {
      var def, id, names, uses;
      uses = interpreter.find_nib_uses(nib, direction);
      names = (function() {
        var _results;
        _results = [];
        for (id in uses) {
          def = uses[id];
          _results.push(def.text);
        }
        return _results;
      })();
      return definition["delete_" + type](nib);
    };
    $scope.delete_input = function(nib) {
      return delete_nib(nib, 'to', 'input');
    };
    return $scope.delete_output = function(nib) {
      return delete_nib(nib, 'from', 'output');
    };
  });

  module.controller('debugger', function($scope, $location) {
    $scope.debug = function() {
      $scope.$root.debugger_scope = $scope.$root.runtime.scope;
      $scope.$root.runtime.cleanup();
      $scope.$root.debug_step = 0;
      $scope.$root["debugger"] = true;
      return $scope.update_trace();
    };
    $scope.stop_debugging = function() {
      return $scope.$root["debugger"] = false;
    };
    $scope.next = function() {
      if ($scope.debug_step < $scope.runtime.threads[0].traces.length - 1) {
        $scope.$root.debug_step += 1;
        return $scope.update_trace();
      }
    };
    $scope.previous = function() {
      if ($scope.debug_step > 0) {
        $scope.$root.debug_step -= 1;
        return $scope.update_trace();
      }
    };
    return $scope.update_trace = function() {
      var new_location, _ref;
      $scope.current_trace = (_ref = $scope.runtime) != null ? _ref.threads[0].traces[$scope.debug_step] : void 0;
      new_location = "/" + $scope.current_trace.graph.id;
      if ($location.path() === new_location) {
        return $scope.$broadcast("redraw-graph");
      } else {
        return $location.path(new_location);
      }
    };
  });

  module.config(function($routeProvider) {
    $routeProvider.when('/:id', {
      controller: 'subroutine',
      templateUrl: "subroutine.html"
    });
    $routeProvider.when('/:id/run', {
      controller: 'subroutine',
      templateUrl: 'run.html'
    });
    return $routeProvider.when('', {
      templateUrl: "intro.html"
    });
  });

  module.controller('library', function($scope, $q, interpreter, $filter) {
    var sequence;
    sequence = ['graph', 'coffeescript', 'javascript', 'symbol', 'json', 'string'];
    $scope.sort = function(item) {
      var type_order;
      type_order = sequence.indexOf($filter('implementation_type')(item));
      return [type_order, item.text];
    };
    $scope.get_subroutines = function() {
      return _.values(interpreter.subroutines);
    };
    $scope.use = function(subroutine) {
      return new interpreter.Call({
        graph: $scope.$root.definition,
        position: V(0, 0),
        implementation: subroutine
      });
    };
    $scope.new_symbol = function(user_input) {
      var symbol;
      symbol = new interpreter.Symbol({
        text: user_input
      });
      return new interpreter.Value({
        graph: $scope.$root.definition,
        position: V(0, 0),
        implementation: symbol
      });
    };
    $scope.use_value = function(user_input) {
      return interpreter.make_value($scope.$root.definition, V(0, 0), user_input);
    };
    $scope.use_string_literal = function(text) {
      return interpreter.make_value($scope.$root.definition, V(0, 0), text, true);
    };
    $scope.is_literal = function(thing) {
      return thing instanceof interpreter.Literal;
    };
    return $scope.search_filter = function(item) {
      var query, search_field;
      query = new RegExp(RegExp.escape($scope.search), 'i');
      search_field = function(field) {
        if (item[field]) {
          return Boolean(item[field].match(query));
        }
      };
      if (search_field('text')) {
        return true;
      }
      if (item instanceof interpreter.Literal) {
        return search_field('value');
      } else if (item instanceof interpreter.Code) {
        return (search_field('memo_implementation')) || (search_field('output_implementation'));
      }
    };
  });

  /* INTERACTION
  */


  dragging_object = null;

  connecting_object = null;

  dragging_offset = V(0, 0);

  is_valid_json = function(json) {
    try {
      window.JSON.parse(json);
      return true;
    } catch (exception) {
      return false;
    }
  };

  valid_json = function(json) {
    try {
      return window.JSON.parse(json);
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
    return window.JSON.stringify(obj, void 0, 2);
  };

  module.controller('controller', function($scope, $http, $location, interpreter, $q) {
    var make_something;
    $scope.tab_click = function(tab) {
      return $scope.$root.overlay = $scope.$root.overlay === tab ? null : tab;
    };
    make_something = function(type) {
      return $q.when(interpreter.loaded, function() {
        var subroutine;
        subroutine = new type;
        return $location.path("" + subroutine.id);
      });
    };
    $scope.definition_types = interpreter.definition_types;
    $scope.quit_runtime = function() {
      $scope.$root.runtime.cleanup();
      return $scope.$root.runtime = null;
    };
    $scope.create_definition = function(type) {
      return make_something(type);
    };
    $scope.new_graph = function() {
      return make_something(interpreter.Graph);
    };
    $scope.new_code = function() {
      return make_something(interpreter.JavaScript);
    };
    $scope.new_coffeescript = function() {
      return make_something(interpreter.CoffeeScript);
    };
    $scope.new_graph_from_selection = function() {
      return $scope.$broadcast('new-graph-from-selection');
    };
    $scope.delete_definition = function(obj) {
      return delete interpreter.subroutines[obj.id];
    };
    $scope.undelete_definition = function(obj) {
      return interpreter.subroutines[obj.id] = obj;
    };
    return $scope.definition_exists = function(obj) {
      return obj.id in interpreter.subroutines;
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
