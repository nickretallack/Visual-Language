// Generated by CoffeeScript 1.4.0
(function() {
  var module, nib_index, transform_position,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = [].slice;

  module = angular.module('vislang');

  transform_position = function(position, editor_size) {
    return {
      x: position.y + editor_size.x / 2,
      y: position.x + editor_size.y / 2
    };
  };

  nib_index = function(endpoint) {
    return "" + endpoint.node.id + "-" + endpoint.nib.id + "-" + (endpoint.index || 0);
  };

  module.directive('nib', function() {
    return {
      template: "<div class=\"nib\"></div>",
      replace: true,
      require: '^graph',
      scope: {
        nib: '=',
        node: '=',
        index: '='
      },
      link: function(scope, element, attributes, controller) {
        var index, nib, node;
        nib = scope.nib, node = scope.node, index = scope.index;
        if (index == null) {
          index = 0;
        }
        controller.nib_views[nib_index({
          node: node,
          nib: nib,
          index: index
        })] = $(element);
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

  module.directive('graph', function($location) {
    return {
      link: function(scope, element, attributes) {},
      controller: function($scope, $element, $attrs, interpreter) {
        var $$element, canvas, canvas_offset, collides_with_lambda, connection_state, draw, get_bounds, header_height, in_box, lambda_size, nib_center, nib_offset, resize_canvas, subroutine, transform_the_position,
          _this = this;
        $element = $($element).find('#graph');
        $$element = $($element);
        subroutine = $scope.$eval($attrs.graph);
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
        $scope.can_delete_selection = function() {
          return $scope.selection.length > 0;
        };
        $scope.delete_selection = function() {
          subroutine.delete_nodes($scope.selection);
          $scope.selection = [];
          return draw();
        };
        $scope.can_edit_selected_node = function() {
          return $scope.selection.length === 1;
        };
        $scope.edit_node = function(node) {
          var new_debugger_scope, _ref;
          $location.path("/" + node.implementation.id);
          new_debugger_scope = (_ref = $scope.$root.debugger_scope) != null ? _ref.nodes[node.id] : void 0;
          if (new_debugger_scope != null) {
            return $scope.$root.debugger_scope = new_debugger_scope;
          }
        };
        $scope.can_bust_selected_node = function() {
          return $scope.selection.length === 1 && $scope.selection[0].implementation instanceof interpreter.Graph;
        };
        $scope.bust_selected_node = function() {
          var new_nodes;
          new_nodes = subroutine.bust_node($scope.selection[0]);
          $scope.selection = new_nodes;
          return draw();
        };
        $scope.can_join_selected_nodes = function() {
          return $scope.selection.length > 1;
        };
        $scope.join_selected_nodes = function() {
          var new_node, new_subroutine;
          new_subroutine = new interpreter.Graph;
          new_node = new_subroutine.make_from(subroutine, $scope.selection);
          $scope.selection = [new_node];
          return draw();
        };
        $scope.selected = function(node) {
          return __indexOf.call($scope.selection, node) >= 0;
        };
        this.click_nib = $scope.click_nib = function(node, nib, $event, index) {
          if (index == null) {
            index = 0;
          }
          $event.stopPropagation();
          return $scope.drawing = {
            node: node,
            nib: nib,
            index: index
          };
        };
        this.release_nib = $scope.release_nib = function(node, nib, $event, index) {
          if (index == null) {
            index = 0;
          }
          if ($scope.drawing) {
            return interpreter.make_connection(subroutine, {
              from: $scope.drawing,
              to: {
                node: node,
                nib: nib,
                index: index
              }
            });
          }
        };
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
          bounds = get_bounds(point1, point2);
          return (bounds.left < (_ref = point.x) && _ref < bounds.right) && (bounds.top < (_ref1 = point.y) && _ref1 < bounds.bottom);
        };
        $scope.boxing = false;
        $element.bind('mousedown', function(event) {
          return $scope.$apply(function() {
            return $scope.boxing = $scope.mouse_position;
          });
        });
        lambda_size = V(150, 500);
        collides_with_lambda = function(dragging_node) {
          var node, _i, _len, _ref;
          _ref = subroutine.nodes;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            node = _ref[_i];
            if (interpreter.is_lambda_value(node)) {
              if (in_box(dragging_node.position, node.position, node.position.plus(lambda_size))) {
                return node;
              }
            }
          }
        };
        $element.bind('mouseup', function(event) {
          return $scope.$apply(function() {
            var dragging_node, lambda, newly_selected, node, _i, _j, _len, _len1, _ref;
            _ref = $scope.dragging;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              dragging_node = _ref[_i];
              lambda = collides_with_lambda(dragging_node);
              if (lambda) {
                lambda.add_child(dragging_node);
              } else if (dragging_node.lambda_node) {
                dragging_node.lambda_node.remove_child(dragging_node);
              }
            }
            $scope.dragging = [];
            if ($scope.boxing) {
              newly_selected = _.filter(subroutine.nodes, function(node) {
                return in_box(transform_the_position(node.position), $scope.boxing, $scope.mouse_position);
              });
              if (event.shiftKey) {
                for (_j = 0, _len1 = newly_selected.length; _j < _len1; _j++) {
                  node = newly_selected[_j];
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
            var child_node, mouse_delta, new_mouse_position, node, update_position, _i, _j, _len, _len1, _ref, _ref1;
            new_mouse_position = (V(event.clientX, event.clientY)).minus(canvas_offset);
            mouse_delta = $scope.mouse_position.minus(new_mouse_position);
            $scope.mouse_position = new_mouse_position;
            mouse_delta = V(-mouse_delta.y, -mouse_delta.x);
            update_position = function(node) {
              return node.position = node.position.plus(mouse_delta);
            };
            if ($scope.dragging.length) {
              _ref = $scope.dragging;
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                node = _ref[_i];
                update_position(node);
                if (interpreter.is_lambda_value(node)) {
                  _ref1 = node.children;
                  for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                    child_node = _ref1[_j];
                    update_position(child_node);
                  }
                }
              }
            }
            if ($scope.dragging.length || $scope.drawing) {
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
        connection_state = function(connection) {
          var trace;
          if ($scope["debugger"]) {
            trace = $scope.current_trace;
            if (connection === trace.connection) {
              return trace.state;
            }
          }
        };
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
                input_element = _this.nib_views[nib_index(connection.from)];
                output_element = _this.nib_views[nib_index(connection.to)];
                c.strokeStyle = (function() {
                  switch (connection_state(connection)) {
                    case 'visiting':
                      return 'rgb(0,255,0)';
                    case 'evaluated':
                      return 'rgb(0,0,255)';
                    default:
                      return 'rgb(0,0,0)';
                  }
                })();
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
                view = _this.nib_views[nib_index($scope.drawing)];
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
