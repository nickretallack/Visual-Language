// Generated by CoffeeScript 1.3.3
(function() {
  var module, transform_position,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = [].slice;

  module = angular.module('vislang');

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
        nib: '=',
        node: '='
      },
      link: function(scope, element, attributes, controller) {
        var nib, node;
        nib = scope.nib, node = scope.node;
        controller.nib_views["" + node.id + "-" + nib.id] = $(element);
        element.bind('mousedown', function(event) {
          return scope.$apply(function() {
            return controller.click_nib(node, nib, event);
          });
        });
        return element.bind('mouseup', function(event) {
          return scope.$apply(function() {
            return controller.release_nib(node, nib, event);
          });
        });
      }
    };
  });

  module.directive('anySubroutine', function() {
    return {
      link: function(scope, element, attributes) {},
      controller: function($scope, $element, $attrs, interpreter) {
        var delete_nib, subroutine;
        subroutine = void 0;
        $scope.$watch($attrs.anySubroutine, function(the_subroutine) {
          return $scope.subroutine = subroutine = the_subroutine;
        });
        $scope.evaluate_output = function(output) {
          return subroutine.run(output);
        };
        $scope.new_input = function() {
          subroutine.add_input();
          return async(function() {
            return $('.subroutine-input:last input').focus();
          });
        };
        $scope.new_output = function() {
          subroutine.add_output();
          return async(function() {
            return $('.subroutine-output:last input').focus();
          });
        };
        delete_nib = function(nib, direction, type) {
          var definition, id, message, names, uses;
          uses = interpreter.find_nib_uses(nib, direction);
          names = (function() {
            var _results;
            _results = [];
            for (id in uses) {
              definition = uses[id];
              _results.push(definition.text);
            }
            return _results;
          })();
          if (names.length) {
            message = "Can't delete this " + type + ".  It is used in " + (names.join(', '));
            return alert(message);
          } else {
            return subroutine["delete_" + type](nib);
          }
        };
        $scope.delete_input = function(nib) {
          return delete_nib(nib, 'to', 'input');
        };
        return $scope.delete_output = function(nib) {
          return delete_nib(nib, 'from', 'output');
        };
      }
    };
  });

  module.directive('subroutine', function($location) {
    return {
      link: function(scope, element, attributes) {},
      controller: function($scope, $element, $attrs, interpreter) {
        var $$element, canvas, canvas_offset, draw, get_bounds, header_height, in_box, nib_center, nib_offset, resize_canvas, subroutine, transform_the_position,
          _this = this;
        $$element = $($element);
        subroutine = $scope.$eval($attrs.subroutine);
        $scope.dragging = [];
        $scope.drawing = null;
        $scope.selection = [];
        this.nib_views = {};
        $scope.$on('new-graph-from-selection', function() {
          var new_subroutine;
          new_subroutine = new interpreter.Graph;
          new_subroutine.make_from($scope.selection);
          return $scope.selection = [];
        });
        transform_the_position = function(position) {
          return position = transform_position(position, $scope.editor_size);
        };
        /* Node and nib interaction
        */

        $scope.position = function(node) {
          var position;
          position = transform_the_position(node.position);
          return {
            left: position.x + 'px',
            top: position.y + 'px'
          };
        };
        $scope.click_node = function(node, $event) {
          $event.preventDefault();
          $event.stopPropagation();
          if ($event.shiftKey) {
            if (__indexOf.call($scope.selection, node) < 0) {
              $scope.selection.push(node);
            } else {
              $scope.selection = _.without($scope.selection, node);
            }
          } else if (__indexOf.call($scope.selection, node) < 0) {
            $scope.selection = [node];
          }
          return $scope.dragging = $scope.selection;
        };
        $scope.edit_node = function(node, $event) {
          $event.preventDefault();
          if (!(node.implementation instanceof interpreter.Literal)) {
            return $location.path("/" + node.implementation.id);
          }
        };
        $scope.bust_node = function(node, $event) {
          $event.preventDefault();
          return subroutine.bust_node(node);
        };
        $scope.selected = function(node) {
          return __indexOf.call($scope.selection, node) >= 0;
        };
        this.click_nib = $scope.click_nib = function(node, nib, $event) {
          $event.preventDefault();
          $event.stopPropagation();
          return $scope.drawing = {
            node: node,
            nib: nib
          };
        };
        this.release_nib = $scope.release_nib = function(node, nib) {
          if ($scope.drawing) {
            return interpreter.make_connection(subroutine, {
              from: $scope.drawing,
              to: {
                node: node,
                nib: nib
              }
            });
          }
        };
        $scope.boxing = false;
        $element.bind('mousedown', function(event) {
          return $scope.$apply(function() {
            event.preventDefault();
            event.stopPropagation();
            return $scope.boxing = $scope.mouse_position;
          });
        });
        get_bounds = function(point1, point2) {
          var bounds;
          bounds = {
            left: Math.min(point1.x, point2.x),
            top: Math.min(point1.y, point2.y),
            right: Math.max(point1.x, point2.x),
            bottom: Math.max(point1.y, point2.y)
          };
          bounds.width = bounds.right - bounds.left;
          bounds.height = bounds.bottom - bounds.top;
          return bounds;
        };
        $scope.selection_style = function() {
          var bounds;
          if ($scope.boxing) {
            bounds = get_bounds($scope.boxing, $scope.mouse_position);
            return {
              left: "" + bounds.left + "px",
              top: "" + bounds.top + "px",
              width: "" + bounds.width + "px",
              height: "" + bounds.height + "px"
            };
          }
        };
        in_box = function(point, point1, point2) {
          var bounds, _ref, _ref1;
          point = transform_the_position(point);
          bounds = get_bounds(point1, point2);
          return (bounds.left < (_ref = point.x) && _ref < bounds.right) && (bounds.top < (_ref1 = point.y) && _ref1 < bounds.bottom);
        };
        $element.bind('mouseup', function(event) {
          return $scope.$apply(function() {
            var newly_selected, node, _i, _len;
            $scope.dragging = [];
            if ($scope.boxing) {
              newly_selected = _.filter(subroutine.nodes, function(node) {
                return in_box(node.position, $scope.boxing, $scope.mouse_position);
              });
              if (event.shiftKey) {
                for (_i = 0, _len = newly_selected.length; _i < _len; _i++) {
                  node = newly_selected[_i];
                  if (__indexOf.call($scope.selection, node) < 0) {
                    $scope.selection.push(node);
                  }
                }
              } else {
                $scope.selection = newly_selected;
              }
            }
            $scope.drawing = $scope.boxing = null;
            return draw();
          });
        });
        $scope.mouse_position = V(0, 0);
        $element.bind('mousemove', function(event) {
          return $scope.$apply(function() {
            var mouse_delta, new_mouse_position, node, _i, _len, _ref;
            new_mouse_position = (V(event.clientX, event.clientY)).minus(canvas_offset);
            mouse_delta = $scope.mouse_position.minus(new_mouse_position);
            $scope.mouse_position = new_mouse_position;
            if ($scope.dragging || $scope.boxing) {
              event.preventDefault();
            }
            if ($scope.dragging) {
              _ref = $scope.dragging;
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                node = _ref[_i];
                node.position = node.position.plus(V(-mouse_delta.y, -mouse_delta.x));
              }
              return draw();
            }
          });
        });
        /* Drawing the Connection Field
        */

        header_height = 40;
        nib_center = V(5, 5);
        canvas_offset = V(0, header_height);
        nib_offset = canvas_offset.minus(nib_center);
        canvas = $element.find('canvas')[0];
        this.draw = draw = function() {
          return async(function() {
            var c, connection, end_position, input_element, input_position, line_height, nib_position, output_element, output_position, view, _i, _len, _ref;
            if (subroutine) {
              line_height = 16;
              c = canvas.getContext('2d');
              c.clearRect.apply(c, [0, 0].concat(__slice.call($scope.editor_size.components())));
              _ref = subroutine.connections;
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                connection = _ref[_i];
                input_element = _this.nib_views["" + connection.from.node.id + "-" + connection.from.nib.id];
                output_element = _this.nib_views["" + connection.to.node.id + "-" + connection.to.nib.id];
                if ((input_element != null ? input_element.length : void 0) && (output_element != null ? output_element.length : void 0)) {
                  input_position = V(input_element.offset()).subtract(nib_offset);
                  output_position = V(output_element.offset()).subtract(nib_offset);
                  c.beginPath();
                  c.moveTo.apply(c, input_position.components());
                  c.lineTo.apply(c, output_position.components());
                  c.stroke();
                }
              }
              if ($scope.drawing) {
                view = _this.nib_views["" + $scope.drawing.node.id + "-" + $scope.drawing.nib.id];
                nib_position = V(view.offset()).subtract(nib_offset);
                end_position = $scope.mouse_position;
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
        resize_canvas();
        return $scope.$on('redraw-graph', draw);
      }
    };
  });

}).call(this);
