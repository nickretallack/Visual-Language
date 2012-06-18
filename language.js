// Generated by CoffeeScript 1.3.3
(function() {
  var module,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module = angular.module('vislang');

  module.factory('interpreter', function($q, $http) {
    var BuiltinApplication, BuiltinSyntaxError, Connection, Exit, FunctionApplication, Graph, Input, InputError, JavaScript, Literal, LiteralValue, Nib, Node, NotConnected, NotImplemented, Output, RuntimeException, Subroutine, SubroutineApplication, UnknownNode, all_subroutines, dissociate_exception, eval_expression, execute, ignore_if_disconnected, is_input, load_implementation, load_state, loaded, make_connection, save_state, schema_version, source_data, source_data_deferred, start_saving;
    schema_version = 1;
    RuntimeException = (function() {

      function RuntimeException(message) {
        this.message = message;
      }

      return RuntimeException;

    })();
    Exit = (function(_super) {

      __extends(Exit, _super);

      function Exit() {
        this.message = "Exit Signal";
      }

      return Exit;

    })(RuntimeException);
    InputError = (function(_super) {

      __extends(InputError, _super);

      function InputError() {
        this.message = "Cancelled execution due to lack of input";
      }

      return InputError;

    })(RuntimeException);
    NotConnected = (function(_super) {

      __extends(NotConnected, _super);

      function NotConnected() {
        this.message = "Something in the program is disconnected";
      }

      return NotConnected;

    })(RuntimeException);
    NotImplemented = (function(_super) {

      __extends(NotImplemented, _super);

      function NotImplemented(name) {
        this.name = name;
        this.message = "JavaScript \"" + this.name + "\" is not implemented";
      }

      return NotImplemented;

    })(RuntimeException);
    BuiltinSyntaxError = (function(_super) {

      __extends(BuiltinSyntaxError, _super);

      function BuiltinSyntaxError(name, exception) {
        this.name = name;
        this.exception = exception;
        this.message = "" + exception + " in builtin \"" + this.name + "\": ";
      }

      return BuiltinSyntaxError;

    })(RuntimeException);
    Subroutine = (function() {

      function Subroutine() {}

      Subroutine.prototype.fromJSON = function(data) {
        var index, nib_data;
        all_subroutines[this.id] = this;
        this.inputs = (function() {
          var _i, _len, _ref, _results;
          _ref = data.inputs;
          _results = [];
          for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
            nib_data = _ref[index];
            _results.push((new Input).fromJSON({
              text: nib_data,
              index: index
            }, this));
          }
          return _results;
        }).call(this);
        this.outputs = (function() {
          var _i, _len, _ref, _results;
          _ref = data.outputs;
          _results = [];
          for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
            nib_data = _ref[index];
            _results.push((new Output).fromJSON({
              text: nib_data,
              index: index
            }, this));
          }
          return _results;
        }).call(this);
        return this;
      };

      Subroutine.prototype.initialize = function() {
        /* Populate fields for a brand new instance.
        */
        this.id = UUID();
        all_subroutines[this.id] = this;
        this.inputs = [];
        this.outputs = [];
        return this;
      };

      return Subroutine;

    })();
    JavaScript = (function(_super) {

      __extends(JavaScript, _super);

      function JavaScript() {
        return JavaScript.__super__.constructor.apply(this, arguments);
      }

      JavaScript.prototype.type = 'builtin';

      JavaScript.prototype.fromJSON = function(data) {
        this.text = data.name, this.id = data.id, this.memo_implementation = data.memo_implementation, this.output_implementation = data.output_implementation;
        return JavaScript.__super__.fromJSON.call(this, data);
      };

      JavaScript.prototype.toJSON = function() {
        return {
          id: this.id,
          text: this.text,
          inputs: this.inputs,
          outputs: this.outputs,
          memo_implementation: this.memo_implementation,
          output_implementation: this.output_implementation
        };
      };

      JavaScript.prototype["export"] = function() {
        var builtins;
        builtins = {};
        builtins[this.id] = this;
        return {
          all_subroutines: {},
          builtins: builtins,
          schema_version: schema_version
        };
      };

      JavaScript.prototype.run = function(output_index) {
        var _this = this;
        return execute(function() {
          var args, input, input_index, input_values, memo, memo_function, output_function, the_scope, _fn, _i, _len, _ref;
          input_values = [];
          _ref = _this.inputs;
          _fn = function(input_index, input) {
            return input_values.push(function() {
              return valid_json(prompt("Provide a JSON value for input " + input_index + ": \"" + input + "\""));
            });
          };
          for (input_index = _i = 0, _len = _ref.length; _i < _len; input_index = ++_i) {
            input = _ref[input_index];
            _fn(input_index, input);
          }
          the_scope = {
            memos: {}
          };
          try {
            memo_function = eval_expression(_this.memo_implementation);
            output_function = eval_expression(_this.output_implementation);
          } catch (exception) {
            if (exception instanceof SyntaxError) {
              throw new BuiltinSyntaxError(_this.text, exception);
            } else {
              throw exception;
            }
          }
          if (!output_function) {
            throw new NotImplemented(_this.text);
          }
          args = input_values.concat([output_index]);
          if (memo_function) {
            memo = memo_function.apply(null, args);
          }
          return output_function.apply(null, args.concat([memo]));
        });
      };

      JavaScript.prototype.invoke = function(output_nib, inputs, scope, node) {
        var args, memo_function, output_function;
        try {
          memo_function = eval_expression(this.memo_implementation);
          output_function = eval_expression(this.output_implementation);
        } catch (exception) {
          if (exception instanceof SyntaxError) {
            throw new BuiltinSyntaxError(this.text, exception);
          } else {
            throw exception;
          }
        }
        if (!output_function) {
          throw new NotImplemented(this.text);
        }
        args = inputs.concat([output_nib.index]);
        if (memo_function && !(node.id in scope.memos)) {
          scope.memos[node.id] = memo_function.apply(null, args);
        }
        return output_function.apply(null, args.concat([scope.memos[node.id]]));
      };

      return JavaScript;

    })(Subroutine);
    Graph = (function(_super) {

      __extends(Graph, _super);

      Graph.prototype.type = 'subroutine';

      function Graph() {
        /* Initialize the bare minimum bits.
        Be sure to call fromJSON or initialize next.
        */
        this.nodes = {};
        this.connections = {};
      }

      Graph.prototype.fromJSON = function(data) {
        /* Populate from the persistence format
        */
        this.text = data.name, this.id = data.id;
        return Graph.__super__.fromJSON.call(this, data);
      };

      Graph.prototype.toJSON = function() {
        return {
          id: this.id,
          text: this.text,
          nodes: _.values(this.nodes),
          connections: _.values(this.connections),
          inputs: this.inputs,
          outputs: this.outputs
        };
      };

      /* RUNNING
      */


      Graph.prototype.invoke = function(output_nib, inputs) {
        /* Evaluates an output in a fresh scope
        */

        var scope;
        scope = {
          subroutine: this,
          inputs: inputs,
          memos: {}
        };
        return this.evaluate_connection(scope, this, output_nib);
      };

      Graph.prototype.evaluate_connection = function(scope, to_node, to_nib) {
        /* This helper will follow a connection and evaluate whatever it finds
        */

        var connection, nib, node, _ref;
        connection = this.find_connection('to', to_node, to_nib);
        if (!connection) {
          throw new NotConnected;
        }
        _ref = connection.from, node = _ref.node, nib = _ref.nib;
        if (node instanceof Graph) {
          return scope.inputs[nib.index]();
        } else {
          return node.evaluate(scope, nib);
        }
      };

      Graph.prototype.run = function(nib) {
        /* Set up user input collection for unknown inputs and evaluate this output.
        */

        var input, input_values, _fn, _i, _len, _ref,
          _this = this;
        input_values = [];
        _ref = this.inputs;
        _fn = function(input) {
          var value;
          value = _.memoize(function() {
            var result;
            result = prompt("Provide a JSON value for input " + input.index + ": \"" + input.text + "\"");
            if (result === null) {
              throw new Exit("cancelled execution");
            }
            try {
              return JSON.parse(result);
            } catch (exception) {
              if (exception instanceof SyntaxError) {
                throw new InputError(result);
              } else {
                throw exception;
              }
            }
          });
          return input_values.push(value);
        };
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          input = _ref[_i];
          _fn(input);
        }
        try {
          return setTimeout(function() {
            return execute(function() {
              return _this.invoke(nib, input_values);
            });
          });
        } catch (exception) {
          if (exception instanceof InputError) {
            return alert("Invalid JSON: " + exception.message);
          } else {
            throw exception;
          }
        }
      };

      Graph.prototype.find_connection = function(direction, node, nib) {
        /* Use this to determine how nodes are connected
        */

        var connection, id, _ref;
        _ref = this.connections;
        for (id in _ref) {
          connection = _ref[id];
          if (connection[direction].node.id === node.id && connection[direction].nib.id === nib.id) {
            return connection;
          }
        }
        return void 0;
      };

      Graph.prototype.delete_connections = function(direction, node, nib) {
        var connection, id, _ref, _results;
        _ref = this.connections;
        _results = [];
        for (id in _ref) {
          connection = _ref[id];
          if (connection[direction].node.id === node.id && connection[direction].nib.id === nib.id) {
            _results.push(delete scope.connections[id]);
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      };

      Graph.prototype.get_inputs = function() {
        return this.inputs;
      };

      Graph.prototype.get_outputs = function() {
        return this.outputs;
      };

      Graph.prototype["export"] = function() {
        var dependencies;
        dependencies = this.get_dependencies();
        dependencies.schema_version = schema_version;
        return dependencies;
      };

      Graph.prototype.add_input = function() {
        return this.inputs.push((new Input).initialize());
      };

      Graph.prototype.add_output = function() {
        return this.outputs.push((new Output).initialize());
      };

      Graph.prototype.remove_node = function(node) {
        return delete this.nodes[node.id];
      };

      Graph.prototype.add_node = function(node) {
        return this.nodes[node.id] = node;
      };

      Graph.prototype.remove_connection = function(connection) {
        return delete this.connections[connection.id];
      };

      Graph.prototype.add_connection = function(connection) {
        return this.connections[connection.id] = connection;
      };

      Graph.prototype.get_dependencies = function(dependencies) {
        var child_dependencies, id, node, _ref;
        if (dependencies == null) {
          dependencies = {
            subroutines: {},
            builtins: {}
          };
        }
        if (!(this.id in dependencies.subroutines)) {
          dependencies.subroutines[this.id] = this;
        }
        _ref = this.nodes;
        for (id in _ref) {
          node = _ref[id];
          if (node instanceof SubroutineApplication) {
            child_dependencies = node.implementation.get_dependencies(dependencies);
            _.extend(dependencies.subroutines, child_dependencies.subroutines);
            _.extend(dependencies.builtins, child_dependencies.builtins);
          } else if (node instanceof BuiltinApplication) {
            dependencies.builtins[this.id] = node.implementation;
          }
        }
        return dependencies;
      };

      Graph.prototype.subroutines_referenced = function() {
        var output, parent, results, resuts, _i, _len, _ref, _ref1;
        results = [];
        _ref = this.outputs;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          output = _ref[_i];
          parent = (_ref1 = output.get_connection()) != null ? _ref1.connection.output.parent : void 0;
          if (parent) {
            if (parent.type === 'function') {
              results.push(parent.id);
            }
            resuts = results.concat(parent.subroutines_referenced());
          }
        }
        return results;
      };

      Graph.prototype.build_adjacency_list = function() {
        /* TODO: UPDATE FOR NEW SCHEMA
        */

        var adjacency_list, id, input, input_index, input_queue, item, item_count, nibs, node, _i, _j, _len, _len1, _ref;
        _ref = this.nodes;
        for (id in _ref) {
          node = _ref[id];
          node.adjacency_id = null;
        }
        adjacency_list = [];
        adjacency_list.push({
          node: this,
          connections: []
        });
        this.adjacency_id = 0;
        input_queue = [].concat(this.outputs);
        while (input_queue.length > 0) {
          input = input_queue.shift();
          node = input.get_node();
          if (node instanceof Node && node.adjacency_id === null) {
            item_count = adjacency_list.push({
              node: node,
              connections: []
            });
            node.adjacency_id = item_count - 1;
            input_queue = input_queue.concat(node.inputs);
          }
        }
        for (_i = 0, _len = adjacency_list.length; _i < _len; _i++) {
          item = adjacency_list[_i];
          nibs = item.node instanceof Node ? item.node.inputs : item.node.outputs;
          for (input_index = _j = 0, _len1 = nibs.length; _j < _len1; input_index = ++_j) {
            input = nibs[input_index];
            node = input.parent;
            item.connections[input_index] = node.adjacency_id;
          }
        }
        return adjacency_list;
      };

      Graph.prototype.make_from = function(nodes) {
        /* Build a subroutine out of nodes in another subroutine.
        */

        var connection, contained_connections, id, in_connections, new_node, nib, node, old_scope, out_connections, _i, _len, _ref, _ref1, _ref2, _ref3, _results;
        old_scope = nodes[0].scope;
        in_connections = {};
        out_connections = {};
        for (_i = 0, _len = nodes.length; _i < _len; _i++) {
          node = nodes[_i];
          _ref = node.inputs;
          for (id in _ref) {
            nib = _ref[id];
            _ref1 = nib.connections;
            for (id in _ref1) {
              connection = _ref1[id];
              in_connections[connection.connection.id] = connection.connection;
            }
          }
          _ref2 = node.outputs;
          for (id in _ref2) {
            nib = _ref2[id];
            _ref3 = nib.connections;
            for (id in _ref3) {
              connection = _ref3[id];
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
          old_scope.remove_connection(connection);
          this.add_connection(connection);
        }
        for (id in nodes) {
          node = nodes[id];
          old_scope.remove_node(node);
          this.add_node(node);
        }
        new_node = new SubroutineApplication(old_scope, V(0, 0), this);
        for (id in in_connections) {
          connection = in_connections[id];
          connection["delete"]();
        }
        _results = [];
        for (id in out_connections) {
          connection = out_connections[id];
          _results.push(connection["delete"]());
        }
        return _results;
      };

      return Graph;

    })(Subroutine);
    Node = (function() {

      function Node() {
        this.scope.nodes[this.id] = this;
      }

      Node.prototype.set_position = function(position) {
        this.position = position;
      };

      Node.prototype.get_inputs = function() {
        return this.implementation.inputs;
      };

      Node.prototype.get_outputs = function() {
        return this.implementation.outputs;
      };

      Node.prototype.get_nibs = function() {
        return this.inputs.concat(this.outputs);
      };

      Node.prototype["delete"] = function() {
        var nib, _i, _len, _ref, _results;
        delete this.scope.nodes[this.id];
        _ref = this.get_nibs();
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          nib = _ref[_i];
          _results.push(nib.delete_connections());
        }
        return _results;
      };

      Node.prototype.toJSON = function() {
        return {
          position: this.position,
          text: this.text,
          id: this.id,
          type: this.type
        };
      };

      return Node;

    })();
    FunctionApplication = (function(_super) {

      __extends(FunctionApplication, _super);

      function FunctionApplication() {
        FunctionApplication.__super__.constructor.call(this);
      }

      FunctionApplication.prototype.evaluate = function(the_scope, output_nib) {};

      FunctionApplication.prototype.toJSON = function() {
        var json;
        json = FunctionApplication.__super__.toJSON.call(this);
        json.implementation_id = this.implementation.id;
        return json;
      };

      FunctionApplication.prototype.virtual_inputs = function(the_scope) {
        var input, input_values, _fn, _i, _len, _ref,
          _this = this;
        input_values = [];
        _ref = this.implementation.inputs;
        _fn = function(input) {
          return input_values.push(_.memoize(function() {
            return the_scope.subroutine.evaluate_connection(the_scope, _this, input);
          }));
        };
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          input = _ref[_i];
          _fn(input);
        }
        return input_values;
      };

      return FunctionApplication;

    })(Node);
    UnknownNode = (function(_super) {

      __extends(UnknownNode, _super);

      function UnknownNode(position, type, text, id) {
        this.position = position;
        this.id = id;
        this.type = 'unknown';
        this.text = "Unknown " + type + ": " + text;
        this.inputs = [];
        this.outputs = [];
        UnknownNode.__super__.constructor.call(this);
      }

      return UnknownNode;

    })(Node);
    SubroutineApplication = (function(_super) {

      __extends(SubroutineApplication, _super);

      SubroutineApplication.prototype.type = 'function';

      function SubroutineApplication(scope, position, implementation, id) {
        this.scope = scope;
        this.position = position;
        this.implementation = implementation;
        this.id = id != null ? id : UUID();
        SubroutineApplication.__super__.constructor.call(this);
      }

      SubroutineApplication.prototype.evaluate = function(the_scope, output_nib) {
        var input_values;
        input_values = this.virtual_inputs(the_scope);
        return this.implementation.invoke(output_nib, input_values, the_scope, this);
      };

      SubroutineApplication.prototype.subroutines_referenced = function() {
        var input, parent, results, resuts, _i, _len, _ref, _ref1;
        results = [];
        _ref = this.inputs;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          input = _ref[_i];
          parent = (_ref1 = input.get_connection()) != null ? _ref1.connection.output.parent : void 0;
          if (parent) {
            if (parent.type === 'function') {
              results.push(parent.id);
            }
            resuts = results.concat(parent.subroutines_referenced());
          }
        }
        return results;
      };

      return SubroutineApplication;

    })(FunctionApplication);
    BuiltinApplication = (function(_super) {

      __extends(BuiltinApplication, _super);

      BuiltinApplication.type = 'builtin';

      function BuiltinApplication(scope, position, implementation, id) {
        this.scope = scope;
        this.position = position;
        this.implementation = implementation;
        this.id = id != null ? id : UUID();
        BuiltinApplication.__super__.constructor.call(this);
      }

      BuiltinApplication.prototype.evaluate = function(the_scope, output_nib) {
        var input_values;
        input_values = this.virtual_inputs(the_scope);
        return this.implementation.invoke(output_nib, input_values, the_scope, this);
      };

      return BuiltinApplication;

    })(FunctionApplication);
    LiteralValue = (function() {

      function LiteralValue(text, id) {
        this.text = text;
        this.id = id != null ? id : UUID();
        this.inputs = [];
        this.outputs = [(new Output).initialize(this.id)];
      }

      LiteralValue.prototype.evaluate = function() {
        return eval_expression(this.text);
      };

      LiteralValue.prototype.type = 'literal';

      LiteralValue.prototype.content_id = function() {
        return CryptoJS.SHA256(this.text).toString(CryptoJS.enc.Base64);
      };

      return LiteralValue;

    })();
    Literal = (function(_super) {

      __extends(Literal, _super);

      Literal.prototype.type = 'literal';

      function Literal(scope, position, value, id) {
        this.scope = scope;
        this.position = position;
        this.id = id != null ? id : UUID();
        if (value instanceof Graph) {
          this.implementation = value;
          this.text = value.name;
        } else {
          this.implementation = new LiteralValue(value, this.id);
          this.text = value;
        }
        Literal.__super__.constructor.call(this);
      }

      Literal.prototype.evaluate = function() {
        return this.implementation.evaluate();
      };

      Literal.prototype.toJSON = function() {
        var json;
        json = Literal.__super__.toJSON.call(this);
        if (this.implementation instanceof Graph) {
          json.implementation_id = this.implementation.id;
        }
        return json;
      };

      Literal.prototype.subroutines_referenced = function() {
        return [];
      };

      return Literal;

    })(Node);
    Nib = (function() {

      function Nib() {}

      Nib.prototype.fromJSON = function(data, parent) {
        var _ref;
        this.parent = parent;
        this.text = data.text, this.index = data.index, this.id = data.id;
        if ((_ref = this.id) == null) {
          this.id = UUID();
        }
        return this;
      };

      Nib.prototype.initialize = function(id) {
        var _ref;
        this.id = id != null ? id : UUID();
        if ((_ref = this.id) == null) {
          this.id = UUID();
        }
        return this;
      };

      Nib.prototype.toJSON = function() {
        return {
          text: this.text,
          id: this.id
        };
      };

      return Nib;

    })();
    Input = (function(_super) {

      __extends(Input, _super);

      function Input() {
        return Input.__super__.constructor.apply(this, arguments);
      }

      return Input;

    })(Nib);
    Output = (function(_super) {

      __extends(Output, _super);

      function Output() {
        return Output.__super__.constructor.apply(this, arguments);
      }

      return Output;

    })(Nib);
    Connection = (function() {

      function Connection(scope, _arg, id) {
        this.scope = scope;
        this.from = _arg.from, this.to = _arg.to;
        this.id = id != null ? id : UUID();
        this.scope.connections[this.id] = this;
      }

      Connection.prototype.toJSON = function() {
        return {
          from: {
            nib: this.from.nib.id,
            node: this.from.node.id
          },
          to: {
            nib: this.to.nib.id,
            node: this.to.node.id
          }
        };
      };

      return Connection;

    })();
    is_input = function(it) {
      var is_input_class;
      is_input_class = it.nib instanceof Input;
      if (it.node instanceof Graph) {
        return is_input_class;
      } else {
        return !is_input_class;
      }
    };
    make_connection = function(scope, _arg) {
      var from, from_input, to, to_input, _ref;
      from = _arg.from, to = _arg.to;
      from_input = is_input(from);
      to_input = is_input(to);
      if (!((from_input && !to_input) || (to_input && !from_input))) {
        return;
      }
      if (to_input) {
        _ref = [to, from], from = _ref[0], to = _ref[1];
      }
      scope.delete_connections('to', node, nib);
      return new Connection(scope, {
        from: from,
        to: to
      });
    };
    dissociate_exception = function(procedure) {
      try {
        return procedure();
      } catch (exception) {
        return setTimeout(function() {
          throw exception;
        });
      }
    };
    execute = function(routine) {
      try {
        return alert(JSON.stringify(routine()));
      } catch (exception) {
        if (exception instanceof RuntimeException) {
          return alert("Error: " + exception.message);
        } else {
          throw exception;
        }
      }
    };
    ignore_if_disconnected = function(procedure) {
      try {
        return procedure();
      } catch (exception) {
        if (!(exception instanceof NotConnected)) {
          throw exception;
        }
      }
    };
    eval_expression = function(expression) {
      return eval("(" + expression + ")");
    };
    start_saving = function() {
      return setInterval(save_state, 500);
    };
    save_state = function() {
      var codes, graphs, id, state, subroutine;
      graphs = {};
      codes = {};
      for (id in all_subroutines) {
        subroutine = all_subroutines[id];
        if (subroutine instanceof Graph) {
          graphs[subroutine.id] = subroutine;
        } else {
          codes[subroutine.id] = subroutine;
        }
      }
      state = {
        subroutines: graphs,
        builtins: codes,
        schema_version: schema_version
      };
      return localStorage.state = JSON.stringify(state);
    };
    load_state = function(data) {
      var builtin, builtin_data, id, second_pass, subroutine, subroutine_data, subroutines, _i, _len, _ref, _ref1;
      subroutines = {};
      second_pass = [];
      _ref = data.builtins;
      for (id in _ref) {
        builtin_data = _ref[id];
        builtin = (new JavaScript).fromJSON(builtin_data);
        subroutines[builtin.id] = builtin;
      }
      _ref1 = data.subroutines;
      for (id in _ref1) {
        subroutine_data = _ref1[id];
        subroutine = (new Graph).fromJSON(subroutine_data);
        subroutines[subroutine.id] = subroutine;
        second_pass.push(subroutine);
      }
      for (_i = 0, _len = second_pass.length; _i < _len; _i++) {
        subroutine = second_pass[_i];
        load_implementation(subroutine, data.subroutines[subroutine.id], subroutines);
      }
      return subroutines;
    };
    load_implementation = function(subroutine, data, subroutines) {
      var connection, from, get_connector, get_nib, implementation, input, node, output, position, to, value, _i, _j, _len, _len1, _ref, _ref1, _results;
      _ref = data.nodes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        position = V(node.position);
        if (node.type === 'literal') {
          if ('implementation_id' in node) {
            value = subroutines[node.implementation_id];
          } else {
            value = node.text;
          }
          new Literal(subroutine, position, value, node.id);
        } else {
          implementation = subroutines[node.implementation_id];
          if (implementation) {
            if (node.type === 'function') {
              new SubroutineApplication(subroutine, position, implementation, node.id);
            } else if (node.type === 'builtin') {
              new BuiltinApplication(subroutine, position, implementation, node.id);
            }
          } else {
            new UnknownNode(position, node.type, node.text, node.id);
          }
        }
      }
      _ref1 = data.connections;
      _results = [];
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        connection = _ref1[_j];
        /* legacy bullshit
        */

        get_connector = function(nib) {
          if (nib.parent_id === subroutine.id) {
            return subroutine;
          } else {
            return subroutine.nodes[nib.parent_id];
          }
        };
        get_nib = function(node, data) {
          return data.index;
        };
        from = get_connector(connection.input);
        to = get_connector(connection.output);
        input = from instanceof Graph ? from.outputs[connection.input.index] : from.implementation.inputs[connection.input.index];
        output = to instanceof Graph ? to.inputs[connection.output.index] : to.implementation.outputs[connection.output.index];
        if (!input) {
          console.log(subroutine.text);
          console.log(subroutine.text);
        }
        if (!output) {
          console.log(subroutine.text);
          console.log(subroutine.text);
        }
        _results.push(new Connection(subroutine, {
          from: {
            node: to,
            nib: output
          },
          to: {
            node: from,
            nib: input
          }
        }, connection.id));
        /*
        
                    # input/output reversal.  TODO: clean up subroutine implementation to avoid this
                    source_connector = if source instanceof Node then source.outputs else source.inputs
                    sink_connector = if sink instanceof Node then sink.inputs else sink.outputs
        
                    if connection.output.index >= source_connector.length or connection.input.index >= sink_connector.length
                        console.log "Oh no, trying to make an invalid connection"
                    else
                        source_connector[connection.output.index].connect sink_connector[connection.input.index]
        */

      }
      return _results;
    };
    if (localStorage.state != null) {
      source_data = JSON.parse(localStorage.state);
    } else {
      source_data_deferred = $q.defer();
      source_data = source_data_deferred.promise;
      $http.get('examples.json').success(function(data) {
        return source_data_deferred.resolve(data);
      });
    }
    all_subroutines = {};
    loaded = $q.defer();
    $q.when(source_data, function(source_data) {
      var id, obj, _ref;
      _ref = load_state(source_data);
      for (id in _ref) {
        obj = _ref[id];
        all_subroutines[id] = obj;
      }
      return loaded.resolve(true);
    });
    return {
      make_connection: make_connection,
      loaded: loaded.promise,
      RuntimeException: RuntimeException,
      Exit: Exit,
      InputError: InputError,
      NotConnected: NotConnected,
      NotImplemented: NotImplemented,
      BuiltinSyntaxError: BuiltinSyntaxError,
      Builtin: JavaScript,
      Subroutine: Graph,
      UnknownNode: UnknownNode,
      SubroutineApplication: SubroutineApplication,
      BuiltinApplication: BuiltinApplication,
      Literal: Literal,
      Input: Input,
      Output: Output,
      subroutines: all_subroutines
    };
  });

}).call(this);
