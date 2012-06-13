// Generated by CoffeeScript 1.3.3
(function() {
  var module,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module = angular.module('vislang');

  module.factory('interpreter', function($q, $http) {
    var Builtin, BuiltinApplication, BuiltinSyntaxError, Connection, Exit, FunctionApplication, Input, InputError, Literal, LiteralValue, Nib, Node, NotConnected, NotImplemented, Output, RuntimeException, Subroutine, SubroutineApplication, UnknownNode, dissociate_exception, eval_expression, execute, ignore_if_disconnected, load_implementation, load_state, loaded, save_state, schema_version, source_data, source_data_deferred, start_saving, subroutines;
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
        this.message = "Builtin \"" + this.name + "\" is not implemented";
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
    Builtin = (function() {

      function Builtin(_arg) {
        var _ref, _ref1, _ref2, _ref3, _ref4;
        _ref = _arg != null ? _arg : {}, this.text = _ref.name, this.output_implementation = _ref.output_implementation, this.memo_implementation = _ref.memo_implementation, this.inputs = _ref.inputs, this.outputs = _ref.outputs, this.id = _ref.id;
        if ((_ref1 = this.memo_implementation) == null) {
          this.memo_implementation = null;
        }
        if ((_ref2 = this.inputs) == null) {
          this.inputs = [];
        }
        if ((_ref3 = this.outputs) == null) {
          this.outputs = ['OUT'];
        }
        if ((_ref4 = this.id) == null) {
          this.id = UUID();
        }
      }

      Builtin.prototype.type = 'builtin';

      Builtin.prototype.toJSON = function() {
        return {
          id: this.id,
          name: this.name,
          inputs: this.inputs,
          outputs: this.outputs,
          memo_implementation: this.memo_implementation,
          output_implementation: this.output_implementation
        };
      };

      Builtin.prototype["export"] = function() {
        var builtins;
        builtins = {};
        builtins[this.id] = this;
        return {
          subroutines: {},
          builtins: builtins,
          schema_version: schema_version
        };
      };

      Builtin.prototype.run = function() {
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

      return Builtin;

    })();
    Subroutine = (function() {

      Subroutine.type = 'subroutine';

      function Subroutine() {
        this.type = 'subroutine';
        this.nodes = {};
        this.connections = {};
        this.inputs = [];
        this.outputs = [];
      }

      Subroutine.prototype.fromJSON = function(data) {
        var index, nib_data, _ref;
        this.text = data.name, this.id = data.id;
        if ((_ref = this.id) == null) {
          this.id = UUID();
        }
        this.inputs = (function() {
          var _i, _len, _ref1, _results;
          _ref1 = data.inputs;
          _results = [];
          for (index = _i = 0, _len = _ref1.length; _i < _len; index = ++_i) {
            nib_data = _ref1[index];
            _results.push((new Input).fromJSON({
              name: nib_data,
              index: index
            }, this));
          }
          return _results;
        }).call(this);
        this.outputs = (function() {
          var _i, _len, _ref1, _results;
          _ref1 = data.outputs;
          _results = [];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            nib_data = _ref1[_i];
            _results.push((new Output).fromJSON({
              name: nib_data,
              index: index
            }, this));
          }
          return _results;
        }).call(this);
        return subroutines[this.id] = this;
      };

      Subroutine.prototype.initialize = function() {
        this.id = UUID();
        return subroutines[this.id] = this;
      };

      Subroutine.prototype.toJSON = function() {
        return {
          id: this.id,
          name: this.name,
          nodes: _.values(this.nodes),
          connections: _.values(this.connections),
          inputs: this.get_inputs(),
          outputs: this.get_outputs()
        };
      };

      Subroutine.prototype.invoke = function(index, inputs) {
        var output, the_scope, _ref;
        the_scope = {
          subroutine: this,
          inputs: inputs,
          memos: {}
        };
        output = (_ref = this.outputs[index].get_connection()) != null ? _ref.connection.output : void 0;
        if (!output) {
          throw new NotConnected;
        }
        if (output.parent instanceof Subroutine) {
          return inputs[output.index]();
        } else if (output.parent instanceof Node) {
          return output.parent.evaluation(the_scope, output.index);
        }
      };

      Subroutine.prototype.run = function(output_index) {
        var input, input_index, input_values, _fn, _i, _len, _ref,
          _this = this;
        input_values = [];
        _ref = this.inputs;
        _fn = function(input_index, input) {
          var value;
          value = _.memoize(function() {
            var result;
            result = prompt("Provide a JSON value for input " + input_index + ": \"" + input.text + "\"");
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
        for (input_index = _i = 0, _len = _ref.length; _i < _len; input_index = ++_i) {
          input = _ref[input_index];
          _fn(input_index, input);
        }
        try {
          return setTimeout(function() {
            return execute(function() {
              return _this.invoke(output_index, input_values);
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

      Subroutine.prototype.get_inputs = function() {
        return this.inputs;
      };

      Subroutine.prototype.get_outputs = function() {
        return this.outputs;
      };

      Subroutine.prototype["export"] = function() {
        var dependencies;
        dependencies = this.get_dependencies();
        dependencies.schema_version = schema_version;
        return dependencies;
      };

      Subroutine.prototype.get_dependencies = function(dependencies) {
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

      Subroutine.prototype.subroutines_referenced = function() {
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

      Subroutine.prototype.build_adjacency_list = function() {
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

      Subroutine.prototype.remove_node = function(node) {
        return delete this.nodes[node.id];
      };

      Subroutine.prototype.add_node = function(node) {
        return this.nodes[node.id] = node;
      };

      Subroutine.prototype.remove_connection = function(connection) {
        return delete this.connections[connection.id];
      };

      Subroutine.prototype.add_connection = function(connection) {
        return this.connections[connection.id] = connection;
      };

      Subroutine.prototype.make_from = function(nodes) {
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

      return Subroutine;

    })();
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
        /*
                    @text = name
                    super()
                    @inputs = (new Input @, text, index, inputs.length-1 for text, index in inputs)
                    @outputs = (new Output @, text, index, outputs.length-1 for text, index in outputs)
        */

      }

      FunctionApplication.prototype.evaluation = function(the_scope, output_index) {};

      FunctionApplication.prototype.toJSON = function() {
        var json;
        json = FunctionApplication.__super__.toJSON.call(this);
        json.implementation_id = this.implementation.id;
        return json;
      };

      FunctionApplication.prototype.virtual_inputs = function(the_scope) {
        var input, input_values, _fn, _i, _len, _ref;
        input_values = [];
        _ref = this.inputs;
        _fn = function(input) {
          return input_values.push(_.memoize(function() {
            var output, _ref1;
            output = (_ref1 = input.get_connection()) != null ? _ref1.connection.output : void 0;
            if (!output) {
              throw new NotConnected;
            }
            if (output.parent instanceof Subroutine) {
              return the_scope.inputs[output.index]();
            } else if (output.parent instanceof Node) {
              return output.parent.evaluation(the_scope, output.index);
            }
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

      SubroutineApplication.type = 'function';

      function SubroutineApplication(scope, position, implementation, id) {
        this.scope = scope;
        this.position = position;
        this.implementation = implementation;
        this.id = id != null ? id : UUID();
        SubroutineApplication.__super__.constructor.call(this);
      }

      SubroutineApplication.prototype.evaluation = function(the_scope, output_index) {
        var input_values;
        input_values = this.virtual_inputs(the_scope);
        return this.implementation.invoke(output_index, input_values);
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

      BuiltinApplication.prototype.evaluation = function(the_scope, output_index) {
        var args, input_values, memo_function, output_function;
        input_values = this.virtual_inputs(the_scope);
        try {
          memo_function = eval_expression(this.implementation.memo_implementation);
          output_function = eval_expression(this.implementation.output_implementation);
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
        args = input_values.concat([output_index]);
        if (memo_function && !(this.id in the_scope.memos)) {
          the_scope.memos[this.id] = memo_function.apply(null, args);
        }
        return output_function.apply(null, args.concat([the_scope.memos[this.id]]));
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

      LiteralValue.prototype.evaluation = function() {
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

      function Literal(scope, position, value, id) {
        this.scope = scope;
        this.position = position;
        this.id = id != null ? id : UUID();
        this.type = 'literal';
        if (value instanceof Subroutine) {
          this.implementation = value;
          this.text = value.name;
        } else {
          this.implementation = new LiteralValue(value, this.id);
          this.text = value;
        }
        Literal.__super__.constructor.call(this);
      }

      Literal.prototype.evaluation = function() {
        return this.implementation.evaluation();
      };

      Literal.prototype.toJSON = function() {
        var json;
        json = Literal.__super__.toJSON.call(this);
        if (this.implementation instanceof Subroutine) {
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
        return (_ref = this.id) != null ? _ref : this.id = UUID();
      };

      /*
              constructor: ->
                  @connections = {}
      
              delete_connections: ->
                  for id, connection of @connections
                      connection.connection.delete()
      
              get_scope: ->
                  if this.parent instanceof Subroutine
                      this.parent
                  else
                      this.parent.scope
      */


      return Nib;

    })();
    Input = (function(_super) {

      __extends(Input, _super);

      /*
              _add_connection: (connection) ->
                  # delete previous connection
                  @get_connection()?.connection.delete()
                  @connections = {}
                  @connections[connection.id] =
                      connection:connection
      
              get_connection: ->
                  for id, connection of @connections
                      return connection
      
              get_node: ->
                  @get_connection()?.connection.output.parent
      
              connect:(output) ->
                  new Connection @get_scope(), @, output
      */


      function Input() {
        return Input.__super__.constructor.apply(this, arguments);
      }

      return Input;

    })(Nib);
    Output = (function(_super) {

      __extends(Output, _super);

      function Output(subroutine, text, index, id) {
        this.subroutine = subroutine;
        this.text = text;
        this.index = index != null ? index : 0;
        this.id = id != null ? id : UUID();
        Output.__super__.constructor.call(this);
      }

      /*
              _add_connection: (connection, vertex) ->
                  @connections[connection.id] =
                      connection:connection
                      vertex:vertex
      
              connect:(input) ->
                  new Connection @get_scope(), input, @
      */


      return Output;

    })(Nib);
    Connection = (function() {

      function Connection(scope, input, output, from, to, id) {
        this.scope = scope;
        this.input = input;
        this.output = output;
        this.from = from;
        this.to = to;
        this.id = id != null ? id : UUID();
        this.scope.connections[this.id] = this;
      }

      /*
              toJSON: ->
                  input:
                      index:@input.index
                      parent_id:@input.parent.id
                  output:
                      index:@output.index
                      parent_id:@output.parent.id
      
              delete: ->
                  delete @scope.connections[@id]
                  delete @output.connections[@id]
                  @input.connections = {}
      */


      return Connection;

    })();
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
      for (id in subroutines) {
        subroutine = subroutines[id];
        if (subroutine instanceof Subroutine) {
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
        builtin = new Builtin(builtin_data);
        subroutines[builtin.id] = builtin;
      }
      _ref1 = data.subroutines;
      for (id in _ref1) {
        subroutine_data = _ref1[id];
        subroutine = (new Subroutine).fromJSON(subroutine_data);
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
        input = from instanceof Subroutine ? from.outputs[connection.input.index] : from.implementation.inputs[connection.input.index];
        output = to instanceof Subroutine ? to.inputs[connection.output.index] : to.implementation.outputs[connection.output.index];
        if (!input) {
          console.log(subroutine.text);
          console.log(subroutine.text);
        }
        if (!output) {
          console.log(subroutine.text);
          console.log(subroutine.text);
        }
        _results.push(new Connection(subroutine, input, output, from, to, connection.id));
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
    subroutines = {};
    loaded = $q.defer();
    $q.when(source_data, function(source_data) {
      var id, obj, _ref;
      _ref = load_state(source_data);
      for (id in _ref) {
        obj = _ref[id];
        subroutines[id] = obj;
      }
      return loaded.resolve(true);
    });
    return {
      loaded: loaded.promise,
      RuntimeException: RuntimeException,
      Exit: Exit,
      InputError: InputError,
      NotConnected: NotConnected,
      NotImplemented: NotImplemented,
      BuiltinSyntaxError: BuiltinSyntaxError,
      Builtin: Builtin,
      Subroutine: Subroutine,
      UnknownNode: UnknownNode,
      SubroutineApplication: SubroutineApplication,
      BuiltinApplication: BuiltinApplication,
      Literal: Literal,
      Input: Input,
      Output: Output,
      subroutines: subroutines
    };
  });

}).call(this);
