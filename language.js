(function() {
  var module,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  module = angular.module('vislang');

  module.factory('interpreter', function($q, $http) {
    var Builtin, BuiltinApplication, BuiltinSyntaxError, Connection, Exit, FunctionApplication, Input, InputError, Literal, LiteralValue, Nib, Node, NotConnected, NotImplemented, Output, RuntimeException, Subroutine, SubroutineApplication, UnknownNode, dissociate_exception, eval_expression, execute, ignore_if_disconnected, load_implementation, load_state, schema_version, source_data, subroutines;
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
        var _ref;
        _ref = _arg != null ? _arg : {}, this.name = _ref.name, this.output_implementation = _ref.output_implementation, this.memo_implementation = _ref.memo_implementation, this.inputs = _ref.inputs, this.outputs = _ref.outputs, this.id = _ref.id;
        if (this.memo_implementation == null) this.memo_implementation = null;
        if (this.inputs == null) this.inputs = [];
        if (this.outputs == null) this.outputs = ['OUT'];
        if (this.id == null) this.id = UUID();
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
          var args, input, input_index, input_values, memo, memo_function, output_function, the_scope, _fn, _len, _ref;
          input_values = [];
          _ref = _this.inputs;
          _fn = function(input_index, input) {
            return input_values.push(function() {
              return valid_json(prompt("Provide a JSON value for input " + input_index + ": \"" + input + "\""));
            });
          };
          for (input_index = 0, _len = _ref.length; input_index < _len; input_index++) {
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
          if (!output_function) throw new NotImplemented(_this.text);
          args = input_values.concat([output_index]);
          if (memo_function) memo = memo_function.apply(null, args);
          return output_function.apply(null, args.concat([memo]));
        });
      };

      return Builtin;

    })();
    Subroutine = (function() {

      function Subroutine(name, inputs, outputs, id) {
        var index, text;
        this.name = name != null ? name : '';
        if (inputs == null) inputs = [];
        if (outputs == null) outputs = [];
        this.id = id != null ? id : UUID();
        if (!outputs.length) outputs = ['OUT'];
        this.inputs = (function() {
          var _len, _results;
          _results = [];
          for (index = 0, _len = inputs.length; index < _len; index++) {
            text = inputs[index];
            _results.push(new Output(this, text, index, inputs.length - 1));
          }
          return _results;
        }).call(this);
        this.outputs = (function() {
          var _len, _results;
          _results = [];
          for (index = 0, _len = outputs.length; index < _len; index++) {
            text = outputs[index];
            _results.push(new Input(this, text, index, outputs.length - 1));
          }
          return _results;
        }).call(this);
        this.nodes = {};
        this.connections = {};
      }

      Subroutine.prototype.type = 'subroutine';

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
        if (!output) throw new NotConnected;
        if (output.parent instanceof Subroutine) {
          return inputs[output.index]();
        } else if (output.parent instanceof Node) {
          return output.parent.evaluation(the_scope, output.index);
        }
      };

      Subroutine.prototype.run = function(output_index) {
        var input, input_index, input_values, _fn, _len, _ref,
          _this = this;
        input_values = [];
        _ref = this.inputs;
        _fn = function(input_index, input) {
          var value;
          value = _.memoize(function() {
            var result;
            result = prompt("Provide a JSON value for input " + input_index + ": \"" + input.text + "\"");
            if (result === null) throw new Exit("cancelled execution");
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
        for (input_index = 0, _len = _ref.length; input_index < _len; input_index++) {
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
        var input, _i, _len, _ref, _results;
        _ref = this.inputs;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          input = _ref[_i];
          _results.push(input.text);
        }
        return _results;
      };

      Subroutine.prototype.get_outputs = function() {
        var output, _i, _len, _ref, _results;
        _ref = this.outputs;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          output = _ref[_i];
          _results.push(output.text);
        }
        return _results;
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
        var output, parent, results, resuts, _i, _len, _ref, _ref2;
        results = [];
        _ref = this.outputs;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          output = _ref[_i];
          parent = (_ref2 = output.get_connection()) != null ? _ref2.connection.output.parent : void 0;
          if (parent) {
            if (parent.type === 'function') results.push(parent.id);
            resuts = results.concat(parent.subroutines_referenced());
          }
        }
        return results;
      };

      Subroutine.prototype.build_adjacency_list = function() {
        var adjacency_list, id, input, input_index, input_queue, item, item_count, nibs, node, _i, _len, _len2, _ref;
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
          for (input_index = 0, _len2 = nibs.length; input_index < _len2; input_index++) {
            input = nibs[input_index];
            node = input.parent;
            item.connections[input_index] = node.adjacency_id;
          }
        }
        return adjacency_list;
      };

      Subroutine.prototype.remove_node = function(node) {
        this.view.remove(node.view);
        return delete this.nodes[node.id];
      };

      Subroutine.prototype.add_node = function(node) {
        this.view.add(node.view);
        return this.nodes[node.id] = node;
      };

      Subroutine.prototype.remove_connection = function(connection) {
        this.view.remove(connection.view);
        return delete this.connections[connection.id];
      };

      Subroutine.prototype.add_connection = function(connection) {
        this.view.add(connection.view);
        return this.connections[connection.id] = connection;
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

      function FunctionApplication(_arg) {
        var index, inputs, name, outputs, text;
        name = _arg.name, inputs = _arg.inputs, outputs = _arg.outputs;
        this.text = name;
        FunctionApplication.__super__.constructor.call(this);
        this.inputs = (function() {
          var _len, _results;
          _results = [];
          for (index = 0, _len = inputs.length; index < _len; index++) {
            text = inputs[index];
            _results.push(new Input(this, text, index, inputs.length - 1));
          }
          return _results;
        }).call(this);
        this.outputs = (function() {
          var _len, _results;
          _results = [];
          for (index = 0, _len = outputs.length; index < _len; index++) {
            text = outputs[index];
            _results.push(new Output(this, text, index, outputs.length - 1));
          }
          return _results;
        }).call(this);
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
            var output, _ref2;
            output = (_ref2 = input.get_connection()) != null ? _ref2.connection.output : void 0;
            if (!output) throw new NotConnected;
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

      function SubroutineApplication(scope, position, implementation, id) {
        this.scope = scope;
        this.position = position;
        this.implementation = implementation;
        this.id = id != null ? id : UUID();
        this.type = 'function';
        SubroutineApplication.__super__.constructor.call(this, {
          name: this.implementation.name,
          inputs: this.implementation.get_inputs(),
          outputs: this.implementation.get_outputs()
        });
      }

      SubroutineApplication.prototype.evaluation = function(the_scope, output_index) {
        var input_values;
        input_values = this.virtual_inputs(the_scope);
        return this.implementation.invoke(output_index, input_values);
      };

      SubroutineApplication.prototype.subroutines_referenced = function() {
        var input, parent, results, resuts, _i, _len, _ref, _ref2;
        results = [];
        _ref = this.inputs;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          input = _ref[_i];
          parent = (_ref2 = input.get_connection()) != null ? _ref2.connection.output.parent : void 0;
          if (parent) {
            if (parent.type === 'function') results.push(parent.id);
            resuts = results.concat(parent.subroutines_referenced());
          }
        }
        return results;
      };

      return SubroutineApplication;

    })(FunctionApplication);
    BuiltinApplication = (function(_super) {

      __extends(BuiltinApplication, _super);

      function BuiltinApplication(scope, position, implementation, id) {
        this.scope = scope;
        this.position = position;
        this.implementation = implementation;
        this.id = id != null ? id : UUID();
        this.type = 'builtin';
        BuiltinApplication.__super__.constructor.call(this, this.implementation);
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
        if (!output_function) throw new NotImplemented(this.text);
        args = input_values.concat([output_index]);
        if (memo_function && !(this.id in the_scope.memos)) {
          the_scope.memos[this.id] = memo_function.apply(null, args);
        }
        return output_function.apply(null, args.concat([the_scope.memos[this.id]]));
      };

      return BuiltinApplication;

    })(FunctionApplication);
    LiteralValue = (function() {

      function LiteralValue(text) {
        this.text = text;
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
          this.implementation = new LiteralValue(value);
          this.text = value;
        }
        Literal.__super__.constructor.call(this);
        this.inputs = [];
        this.outputs = [new Output(this, '')];
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

      function Nib() {
        this.connections = {};
      }

      Nib.prototype.delete_connections = function() {
        var connection, id, _ref, _results;
        _ref = this.connections;
        _results = [];
        for (id in _ref) {
          connection = _ref[id];
          _results.push(connection.connection["delete"]());
        }
        return _results;
      };

      Nib.prototype.get_scope = function() {
        if (this.parent instanceof Subroutine) {
          return this.parent;
        } else {
          return this.parent.scope;
        }
      };

      return Nib;

    })();
    Input = (function(_super) {

      __extends(Input, _super);

      function Input(parent, text, index, siblings) {
        this.parent = parent;
        this.text = text;
        this.index = index != null ? index : 0;
        this.siblings = siblings != null ? siblings : 0;
        Input.__super__.constructor.call(this);
      }

      Input.prototype._add_connection = function(connection) {
        var _ref;
        if ((_ref = this.get_connection()) != null) _ref.connection["delete"]();
        this.connections = {};
        return this.connections[connection.id] = {
          connection: connection
        };
      };

      Input.prototype.get_connection = function() {
        var connection, id, _ref;
        _ref = this.connections;
        for (id in _ref) {
          connection = _ref[id];
          return connection;
        }
      };

      Input.prototype.get_node = function() {
        var _ref;
        return (_ref = this.get_connection()) != null ? _ref.connection.output.parent : void 0;
      };

      Input.prototype.connect = function(output) {
        return new Connection(this.get_scope(), this, output);
      };

      return Input;

    })(Nib);
    Output = (function(_super) {

      __extends(Output, _super);

      function Output(parent, text, index, siblings) {
        this.parent = parent;
        this.text = text;
        this.index = index != null ? index : 0;
        this.siblings = siblings != null ? siblings : 0;
        Output.__super__.constructor.call(this);
      }

      Output.prototype._add_connection = function(connection, vertex) {
        return this.connections[connection.id] = {
          connection: connection,
          vertex: vertex
        };
      };

      Output.prototype.connect = function(input) {
        return new Connection(this.get_scope(), input, this);
      };

      return Output;

    })(Nib);
    Connection = (function() {

      function Connection(scope, input, output, id) {
        this.scope = scope;
        this.input = input;
        this.output = output;
        this.id = id != null ? id : UUID();
        this.input._add_connection(this);
        this.output._add_connection(this);
        this.scope.connections[this.id] = this;
      }

      Connection.prototype.toJSON = function() {
        return {
          input: {
            index: this.input.index,
            parent_id: this.input.parent.id
          },
          output: {
            index: this.output.index,
            parent_id: this.output.parent.id
          }
        };
      };

      Connection.prototype["delete"] = function() {
        delete this.scope.connections[this.id];
        delete this.output.connections[this.id];
        return this.input.connections = {};
      };

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
        if (!(exception instanceof NotConnected)) throw exception;
      }
    };
    eval_expression = function(expression) {
      return eval("(" + expression + ")");
    };
    load_state = function(data) {
      var builtin, builtin_data, id, second_pass, subroutine, subroutine_data, subroutines, _i, _len, _ref, _ref2;
      subroutines = {};
      second_pass = [];
      _ref = data.builtins;
      for (id in _ref) {
        builtin_data = _ref[id];
        builtin = new Builtin(builtin_data);
        subroutines[builtin.id] = builtin;
      }
      _ref2 = data.subroutines;
      for (id in _ref2) {
        subroutine_data = _ref2[id];
        subroutine = new Subroutine(subroutine_data.name, subroutine_data.inputs, subroutine_data.outputs, subroutine_data.id);
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
      var connection, get_connector, implementation, node, position, sink, sink_connector, source, source_connector, value, _i, _j, _len, _len2, _ref, _ref2, _results;
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
      _ref2 = data.connections;
      _results = [];
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        connection = _ref2[_j];
        get_connector = function(nib) {
          if (nib.parent_id === subroutine.id) {
            return subroutine;
          } else {
            return subroutine.nodes[nib.parent_id];
          }
        };
        source = get_connector(connection.output);
        sink = get_connector(connection.input);
        source_connector = source instanceof Node ? source.outputs : source.inputs;
        sink_connector = sink instanceof Node ? sink.inputs : sink.outputs;
        if (connection.output.index >= source_connector.length || connection.input.index >= sink_connector.length) {
          _results.push(console.log("Oh no, trying to make an invalid connection"));
        } else {
          _results.push(source_connector[connection.output.index].connect(sink_connector[connection.input.index]));
        }
      }
      return _results;
    };
    if (false) {
      source_data = JSON.parse(localStorage.state);
    } else {
      source_data = $q.defer();
      $http.get('examples.json').success(function(data) {
        return source_data.resolve(data);
      });
    }
    subroutines = $q.when(source_data.promise, function(source_data) {
      return load_state(source_data);
    });
    return {
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
