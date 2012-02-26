(function() {
  var Builtin, BuiltinApplication, BuiltinSyntaxError, Connection, Exit, FunctionApplication, Input, InputError, Literal, Nib, Node, NotConnected, NotImplemented, Output, RuntimeException, SubRoutine, SubroutineApplication, all_builtins, all_subroutines, animate, boxes, camera, connecting_object, connection_view, current_scope, dragging_object, dragging_offset, eval_expression, example_programs, execute, get_absolute_nib_position, get_nib_position, height, highlight, highlighted_node_material, highlighted_objects, ignore_if_disconnected, last, load_implementation, load_state, make_arrow, make_basic_program, make_box, make_connection, make_main, make_nib_view, make_node_view, make_subroutine_view, make_text, mouse_coords, mouse_down, mouse_move, mouse_up, node_material, node_registry, obj_first, playground_id, projector, ray_cast_mouse, renderer, scene, schema_version, should_animate, subroutine_material, system_arrow, unhighlight, unhighlight_all, update, valid_json, whitespace_split, width;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  height = 500;
  width = 500;
  camera = new THREE.OrthographicCamera(0, width, height, 0, -2000, 1000);
  scene = new THREE.Scene();
  scene.add(camera);
  renderer = new THREE.CanvasRenderer();
  renderer.setSize(width, height);
  projector = new THREE.Projector();
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
  schema_version = 1;
  boxes = {};
  node_registry = {};
  all_subroutines = {};
  all_builtins = {};
  current_scope = null;
  system_arrow = null;
  should_animate = false;
  update = function() {
    return renderer.render(scene, camera);
  };
  animate = function(field) {
    update();
    if (should_animate) {
      return requestAnimationFrame(animate, field);
    }
  };
  /*
  example_builtins =
      "894652d702c3bb123ce8ed9e2bdcc71b":
          name:'+'
          inputs:['L','R']
          outputs:['R']
          output_implementation: (left, right) -> left() + right()
      "99dc67480b5e5fe8adcab5fc6540c8a0":
          name:'-'
          inputs:['L','R']
          outputs:['R']
          output_implementation: (left, right) -> left() - right()
      "c70ac0c10dcfce8249b937ad164413ec":
          name:'*'
          inputs:['L','R']
          outputs:['R']
          output_implementation: (left, right) -> left() * right()
      "3080574badf11047d6df2ed24f8248df":
          name:'/'
          inputs:['L','R']
          outputs:['R']
          output_implementation: (left, right) -> left() / right()
  
      "993ad152a2a888f6c0e6a6bd8a1c385a":
          name:'<'
          inputs:['L','R']
          outputs:['R']
          output_implementation: (left, right) -> left() < right()
      "3030973e37ce53b896735a3ad6b369d6":
          name:'<='
          inputs:['L','R']
          outputs:['R']
          output_implementation: (left, right) -> left() <= right()
      "54e3469201277e5325db02aa56ab5218":
          name:'='
          inputs:['L','R']
          outputs:['R']
          output_implementation: (left, right) -> left() is right()
      "4d0b2cd39670d8a70ded2c5f7a6fd5be":
          name:'>='
          inputs:['L','R']
          outputs:['R']
          output_implementation: (left, right) -> left() >= right()
      "68af5453eda7b4c9cbe6a86e12b5fba2":
          name:'>'
          inputs:['L','R']
          outputs:['R']
          output_implementation: (left, right) -> left() > right()
  
      "29c894a04e219f47477672bedc3ad620":
          name:'if'
          inputs:['T','C','F']
          outputs:['R']
          output_implementation: (true_result, condition, false_result) -> if condition() then true_result() else false_result()
  
      "be7936fcdcc1fe8c8f1024aa91b475e5":
          name:'prompt'
          inputs:['M','S']
          outputs:['R','S']
          memo_implementation: (message, sequencer) ->
              try
                  sequencer()
              catch exception
                  unless exception instanceof NotConnected
                      throw exception
   
              return prompt message()
              
          output_implementation: (message, sequencer, index, memo) ->
              if index is 0
                  return memo
              else
                  return null
   
      "06b207d17227570db276cd4aaef57a2b":
           name:'funnel'
           inputs:['V','S']
           outputs:['V']
           output_implementation: (value, sequencer) ->
               try
                   sequencer()
               catch exception
                   unless exception instanceof NotConnected
                       throw exception
   
               return value()
  
      "51f15a4fe5f0c1bf1e31f63733aa1618":
          name:'log'
          inputs:['in']
          outputs:['out']
          output_implementation: (input) ->
              value = input()
              console.log value
              return value
  
      "1baf12a4702a0ecc724592ad8dd285f3":
          name:'exit'
          inputs:[]
          outputs:['R']
          output_implementation: -> throw "Exit"
  
      "09f91a7ec8fd64baacda01ee70760569":
          name:'replace'
          inputs:['text','rem','ins']
          outputs:['result']
          output_implementation: (text, pattern, replacement) -> text().replace pattern(), replacement()
  
      "a612be6f7bae3de3ae2f883bc3f245c4":
          name:'two_outputs'
          inputs:[]
          outputs:['L','R']
          output_implementation: (index) -> if index is 0 then "left" else "right"
  
      "a9f07bc7545769b8b8b31a9d7ac77229":
          name:'int'
          inputs:['IN']
          outputs:['int']
          output_implementation: (str) -> parseInt str()
      "7cca8f80ac29c5a1e72c371c574e7414":
          name:'float'
          inputs:['IN']
          outputs:['float']
          output_implementation: (str) -> parseFloat str()
      "b5b3023a4a839ed106882e74923dab88":
          name:'str'
          inputs:['IN']
          outputs:['str']
          output_implementation: (obj) -> ''+ obj()
      "3827fa434cfc1b71555e0e958633e1ca":
          name:'from json'
          inputs:['str']
          outputs:['obj']
          output_implementation: (str) -> JSON.parse str()
      "aa8c65ccce7abc2c524349c843bb4fc5":
          name:'to json'
          inputs:['obj']
          outputs:['str']
          output_implementation: (obj) -> JSON.stringify obj()
  
      "9a7d34a3c313a193ba47e747b4ff9132":
          name:'random float'
          inputs:[]
          outputs:['OUT']
          output_implementation: -> Math.random()
  
      "325fa3507bac12a3673f2789e12a1e41":
          name:'call'
          inputs:['SUB','IN']
          outputs:['OUT']
          output_implementation: (subroutine, input) ->
              subroutine().invoke 0, [input]
  
      "9fbdec485d1149e1c24d54f332099247":
          name:'call-n'
          inputs:['SUB','IN']
          outputs:['OUT']
          output_implementation: (subroutine, inputs) ->
              subroutine().invoke 0, inputs()
  
      "0b40d2d29e6df169bc95d854f41ff476":
          name:'cons'
          inputs:['LIST','ELE']
          outputs:['LIST']
          output_implementation: (list, element) -> list().concat element()
              
      "73b5d938605bb060c7ddfa031fe29d46":
          name:'lazy input'
          inputs:['IN']
          outputs:['OUT']
          output_implementation: (input) -> input
  */
  eval_expression = function(expression) {
    return eval("(" + expression + ")");
  };
  /* MODELS */
  RuntimeException = (function() {
    function RuntimeException(message) {
      this.message = message;
    }
    return RuntimeException;
  })();
  Exit = (function() {
    function Exit() {
      this.message = "Exit Signal";
    }
    __extends(Exit, RuntimeException);
    return Exit;
  })();
  InputError = (function() {
    function InputError() {
      this.message = "Cancelled execution due to lack of input";
    }
    __extends(InputError, RuntimeException);
    return InputError;
  })();
  NotConnected = (function() {
    function NotConnected() {
      this.message = "Something in the program is disconnected";
    }
    __extends(NotConnected, RuntimeException);
    return NotConnected;
  })();
  NotImplemented = (function() {
    function NotImplemented(name) {
      this.name = name;
      this.message = "Builtin \"" + this.name + "\" is not implemented";
    }
    __extends(NotImplemented, RuntimeException);
    return NotImplemented;
  })();
  BuiltinSyntaxError = (function() {
    function BuiltinSyntaxError(name, exception) {
      this.name = name;
      this.exception = exception;
      this.message = "" + exception + " in builtin \"" + this.name + "\": ";
    }
    __extends(BuiltinSyntaxError, RuntimeException);
    return BuiltinSyntaxError;
  })();
  Builtin = (function() {
    function Builtin(_arg) {
      var _ref, _ref2, _ref3, _ref4;
      this.name = _arg.name, this.output_implementation = _arg.output_implementation, this.memo_implementation = _arg.memo_implementation, this.inputs = _arg.inputs, this.outputs = _arg.outputs, this.id = _arg.id;
            if ((_ref = this.memo_implementation) != null) {
        _ref;
      } else {
        this.memo_implementation = null;
      };
            if ((_ref2 = this.inputs) != null) {
        _ref2;
      } else {
        this.inputs = [];
      };
            if ((_ref3 = this.outputs) != null) {
        _ref3;
      } else {
        this.outputs = ['OUT'];
      };
            if ((_ref4 = this.id) != null) {
        _ref4;
      } else {
        this.id = UUID();
      };
      all_builtins[this.id] = this;
    }
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
    return Builtin;
  })();
  /*
  for id, info of builtins
      info.id = id
      info.output_implementation = ''+info.output_implementation
      info.memo_implementation   = ''+info.memo_implementation if info.memo_implementation
      new Builtin info
  */
  SubRoutine = (function() {
    function SubRoutine(name, inputs, outputs, id) {
      var index, text;
      this.name = name != null ? name : '';
      if (inputs == null) {
        inputs = [];
      }
      if (outputs == null) {
        outputs = [];
      }
      this.id = id != null ? id : UUID();
      node_registry[this.id] = this;
      this.view = make_subroutine_view(this);
      if (!outputs.length) {
        outputs = ['OUT'];
      }
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
      all_subroutines[this.id] = this;
    }
    SubRoutine.prototype.toJSON = function() {
      return {
        id: this.id,
        name: this.name,
        nodes: _.values(this.nodes),
        connections: _.values(this.connections),
        inputs: this.get_inputs(),
        outputs: this.get_outputs()
      };
    };
    SubRoutine.prototype.invoke = function(index, inputs) {
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
      if (output.parent instanceof SubRoutine) {
        return inputs[output.index]();
      } else if (output.parent instanceof Node) {
        return output.parent.evaluation(the_scope, output.index);
      }
    };
    SubRoutine.prototype.get_inputs = function() {
      var input, _i, _len, _ref, _results;
      _ref = this.inputs;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        input = _ref[_i];
        _results.push(input.text);
      }
      return _results;
    };
    SubRoutine.prototype.get_outputs = function() {
      var output, _i, _len, _ref, _results;
      _ref = this.outputs;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        output = _ref[_i];
        _results.push(output.text);
      }
      return _results;
    };
    SubRoutine.prototype.run = function(output_index, input_values) {
      return execute(__bind(function() {
        return this.invoke(output_index, input_values);
      }, this));
    };
    SubRoutine.prototype["export"] = function() {
      var dependencies;
      dependencies = this.get_dependencies();
      dependencies.schema_version = schema_version;
      return dependencies;
    };
    SubRoutine.prototype.get_dependencies = function(dependencies) {
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
    SubRoutine.prototype.subroutines_referenced = function() {
      var output, parent, results, resuts, _i, _len, _ref, _ref2;
      results = [];
      _ref = this.outputs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        output = _ref[_i];
        parent = (_ref2 = output.get_connection()) != null ? _ref2.connection.output.parent : void 0;
        if (parent) {
          if (parent.type === 'function') {
            results.push(parent.id);
          }
          resuts = results.concat(parent.subroutines_referenced());
        }
      }
      return results;
    };
    return SubRoutine;
  })();
  Node = (function() {
    function Node() {
      node_registry[this.id] = this;
      this.scope = current_scope;
      this.scope.nodes[this.id] = this;
      this.view = make_node_view(this);
    }
    Node.prototype.set_position = function(position) {
      this.position = position;
      return this.view.position.copy(this.position);
    };
    Node.prototype.get_nibs = function() {
      return this.inputs.concat(this.outputs);
    };
    Node.prototype["delete"] = function() {
      var nib, _i, _len, _ref, _results;
      this.scope.view.remove(this.view);
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
  FunctionApplication = (function() {
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
    __extends(FunctionApplication, Node);
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
          if (!output) {
            throw new NotConnected;
          }
          if (output.parent instanceof SubRoutine) {
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
  })();
  SubroutineApplication = (function() {
    function SubroutineApplication(position, implementation, id) {
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
    __extends(SubroutineApplication, FunctionApplication);
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
          if (parent.type === 'function') {
            results.push(parent.id);
          }
          resuts = results.concat(parent.subroutines_referenced());
        }
      }
      return results;
    };
    return SubroutineApplication;
  })();
  BuiltinApplication = (function() {
    function BuiltinApplication(position, implementation, id) {
      this.position = position;
      this.implementation = implementation;
      this.id = id != null ? id : UUID();
      this.type = 'builtin';
      BuiltinApplication.__super__.constructor.call(this, this.implementation);
    }
    __extends(BuiltinApplication, FunctionApplication);
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
  })();
  Literal = (function() {
    function Literal(position, text, value, id) {
      this.position = position;
      this.text = text;
      this.value = value;
      this.id = id != null ? id : UUID();
      Literal.__super__.constructor.call(this);
      this.inputs = [];
      this.outputs = [new Output(this, 'OUT')];
      this.type = 'literal';
    }
    __extends(Literal, Node);
    Literal.prototype.evaluation = function() {
      return this.value;
    };
    Literal.prototype.toJSON = function() {
      var json;
      json = Literal.__super__.toJSON.call(this);
      if (this.value instanceof SubRoutine) {
        json.implementation_id = this.value.id;
      } else {
        json.value = JSON.stringify(this.value);
      }
      return json;
    };
    Literal.prototype.subroutines_referenced = function() {
      return [];
    };
    return Literal;
  })();
  Nib = (function() {
    function Nib() {
      this.view = make_nib_view(this, this.parent instanceof Node);
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
    return Nib;
  })();
  Input = (function() {
    function Input(parent, text, index, siblings) {
      this.parent = parent;
      this.text = text;
      this.index = index != null ? index : 0;
      this.siblings = siblings != null ? siblings : 0;
      Input.__super__.constructor.call(this);
    }
    __extends(Input, Nib);
    Input.prototype._add_connection = function(connection, vertex) {
      var _ref;
      if ((_ref = this.get_connection()) != null) {
        _ref.connection["delete"]();
      }
      this.connections = {};
      return this.connections[connection.id] = {
        connection: connection,
        vertex: vertex
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
    Input.prototype.connect = function(output) {
      return new Connection(this, output);
    };
    return Input;
  })();
  Output = (function() {
    function Output(parent, text, index, siblings) {
      this.parent = parent;
      this.text = text;
      this.index = index != null ? index : 0;
      this.siblings = siblings != null ? siblings : 0;
      Output.__super__.constructor.call(this);
    }
    __extends(Output, Nib);
    Output.prototype._add_connection = function(connection, vertex) {
      return this.connections[connection.id] = {
        connection: connection,
        vertex: vertex
      };
    };
    Output.prototype.connect = function(input) {
      return new Connection(input, this);
    };
    return Output;
  })();
  Connection = (function() {
    function Connection(input, output, id) {
      var input_vertex, output_vertex, _ref;
      this.input = input;
      this.output = output;
      this.id = id != null ? id : UUID();
      _ref = connection_view(this), this.view = _ref[0], input_vertex = _ref[1], output_vertex = _ref[2];
      this.input._add_connection(this, input_vertex);
      this.output._add_connection(this, output_vertex);
      this.scope = current_scope;
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
      this.scope.view.remove(this.view);
      delete this.scope.connections[this.id];
      delete this.output.connections[this.id];
      return this.input.connections = {};
    };
    return Connection;
  })();
  /* VIEWS */
  make_subroutine_view = function(subroutine) {
    var box, box_size, position;
    box_size = V(500, 500);
    position = box_size.scale(1 / 2.0);
    box = make_box(subroutine.name, box_size, 10, subroutine_material, position, false);
    box.model = subroutine;
    boxes[box.id] = box;
    return box;
  };
  make_node_view = function(node) {
    var main_box, main_box_size;
    main_box_size = V(50, 50);
    main_box = make_box(node.text, main_box_size, 10, node_material, node.position);
    main_box.model = node;
    node.scope.view.add(main_box);
    boxes[main_box.id] = main_box;
    return main_box;
  };
  make_nib_view = function(nib, is_node) {
    var parent, parent_size, sub_box, sub_box_size, x_position, y_offset, y_position;
    sub_box_size = V(20, 20);
    parent_size = is_node ? V(60, 60) : V(490, 490);
    y_offset = parent_size.y / 2.0;
    x_position = -parent_size.x / 2.0 + parent_size.x * nib.index / nib.siblings;
    y_position = y_offset * (nib instanceof Input ? 1 : -1) * (is_node ? 1 : -1);
    sub_box = make_box(nib.text, sub_box_size, 5, node_material, V(x_position, y_position));
    sub_box.model = nib;
    parent = nib.parent.view;
    parent.add(sub_box);
    return sub_box;
  };
  connection_view = function(connection) {
    var arrow, point1, point2;
    point1 = get_nib_position(connection.input);
    point2 = get_nib_position(connection.output);
    arrow = make_arrow(point1, point2);
    return [arrow, arrow.geometry.vertices[0], arrow.geometry.vertices[1]];
  };
  /* FACTORIES */
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
  /* CORE RENDERING */
  make_text = function(text, size) {
    var centerOffset, geometry, material, mesh;
    geometry = new THREE.TextGeometry(text, {
      size: size,
      font: 'helvetiker',
      curveSegments: 2
    });
    geometry.computeBoundingBox();
    centerOffset = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
    material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      overdraw: true
    });
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = centerOffset;
    return mesh;
  };
  node_material = new THREE.MeshBasicMaterial({
    color: 0x888888
  });
  highlighted_node_material = new THREE.MeshBasicMaterial({
    color: 0x8888FF
  });
  subroutine_material = new THREE.MeshBasicMaterial({
    color: 0xEEEEEE
  });
  make_box = function(name, size, text_size, material, position, outline) {
    var box, geometry, mesh;
    if (outline == null) {
      outline = false;
    }
    box = new THREE.Object3D();
    geometry = (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return typeof result === "object" ? result : child;
    })(THREE.PlaneGeometry, size.components(), function() {});
    mesh = new THREE.Mesh(geometry, material);
    mesh.position = V(0, 0).three();
    box.add(mesh);
    box.add(make_text(name, text_size));
    box.position = position.three();
    return box;
  };
  make_arrow = function(source, target, scoped) {
    var arrow, color, line, line_geometry, line_material;
    if (scoped == null) {
      scoped = true;
    }
    arrow = new THREE.Object3D();
    color = 0x888888;
    if ('three' in source) {
      source = source.three();
    }
    if ('three' in target) {
      target = target.three();
    }
    line_geometry = new THREE.Geometry();
    line_material = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 3
    });
    line_geometry.vertices.push(new THREE.Vertex(source));
    line_geometry.vertices.push(new THREE.Vertex(target));
    line = new THREE.Line(line_geometry, line_material);
    if (scoped) {
      current_scope.view.add(line);
    }
    return line;
  };
  /* CORE HELPERS */
  ray_cast_mouse = function() {
    var forward, intersections, mouse, ray;
    mouse = mouse_coords(event).three();
    mouse.z = 1;
    forward = new THREE.Vector3(0, 0, -1);
    ray = new THREE.Ray(mouse, forward);
    intersections = ray.intersectScene(scene);
    if (intersections.length > 0) {
      return (last(intersections)).object.parent;
    }
  };
  mouse_coords = function(event) {
    return V(event.clientX, height - event.clientY);
  };
  get_nib_position = function(nib) {
    if (nib.parent instanceof Node) {
      return Vector.from(nib.view.position).plus(nib.view.parent.position).three();
    } else {
      return Vector.from(nib.view.position).three();
    }
  };
  get_absolute_nib_position = function(nib) {
    return Vector.from(get_nib_position(nib)).plus(V(250, 250)).three();
  };
  /* INTERACTION */
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
  mouse_down = function(event) {
    var target;
    event.preventDefault();
    target = ray_cast_mouse();
    if (target) {
      if (target.model instanceof Node) {
        if (event.which === 3) {
          return target.model["delete"]();
        } else if (event.shiftKey) {
          return highlight(target.model);
        } else {
          return dragging_object = target;
        }
      } else if (target.model instanceof Nib) {
        if (event.which === 3) {
          return target.model.delete_connections();
        } else {
          system_arrow.geometry.vertices[0].position = system_arrow.geometry.vertices[1].position = get_absolute_nib_position(target.model);
          scene.add(system_arrow);
          return connecting_object = target;
        }
      } else {
        if (!event.shiftKey) {
          return unhighlight_all();
        }
      }
    }
  };
  mouse_up = function(event) {
    var connection, target;
    dragging_object = null;
    if (connecting_object) {
      target = ray_cast_mouse();
      if ((target != null ? target.model : void 0) instanceof Nib) {
        connection = make_connection(connecting_object, target);
      }
      connecting_object = null;
      return scene.remove(system_arrow);
    }
  };
  mouse_move = function(event) {
    var adjusted_vector, connection, delta, effected_nodes, id, mouse_vector, nib, node, original_position, vector, _i, _j, _len, _len2, _ref, _ref2;
    mouse_vector = mouse_coords(event);
    adjusted_vector = mouse_vector.minus(V(250, 250));
    vector = mouse_vector.three();
    if (dragging_object) {
      node = dragging_object.model;
      original_position = Vector.from(node.view.position);
      delta = adjusted_vector.minus(original_position);
      effected_nodes = node.id in highlighted_objects ? _.values(highlighted_objects) : [node];
      for (_i = 0, _len = effected_nodes.length; _i < _len; _i++) {
        node = effected_nodes[_i];
        node.set_position(Vector.from(node.position).plus(delta).three());
        _ref = node.get_nibs();
        for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
          nib = _ref[_j];
          _ref2 = nib.connections;
          for (id in _ref2) {
            connection = _ref2[id];
            connection.vertex.position.copy(get_nib_position(nib));
          }
        }
      }
    }
    if (connecting_object) {
      return system_arrow.geometry.vertices[1].position = vector;
    }
  };
  whitespace_split = function(input) {
    var results;
    results = input.split(/\s+/);
    if (results[0] === '') {
      results = results.slice(1);
    }
    return results;
  };
  valid_json = function(json) {
    try {
      return JSON.parse(json);
    } catch (exception) {
      if (exception instanceof SyntaxError) {
        return alert("" + exception + " Invalid JSON: " + json);
      } else {
        throw exception;
      }
    }
  };
  window.Controller = function() {
    var data, hide_subroutines, import_source, init_field, loaded_state, save_state, save_timer, teardown_field;
    init_field = function() {
      var field;
      if (!should_animate) {
        field = $("#field");
        field.append(renderer.domElement);
        should_animate = true;
        animate(field[0]);
        field.mousedown(mouse_down);
        field.mouseup(mouse_up);
        field.mousemove(mouse_move);
        return field.bind('contextmenu', function() {
          return false;
        });
      }
    };
    teardown_field = function() {
      return should_animate = false;
    };
    hide_subroutines = __bind(function() {
      var index, subroutine, _ref, _results;
      _ref = this.subroutines;
      _results = [];
      for (index in _ref) {
        subroutine = _ref[index];
        _results.push(scene.remove(subroutine.view));
      }
      return _results;
    }, this);
    this.edit_mode = null;
    this.editing_builtin = null;
    this.import_export_text = '';
    this["import"] = function() {
      hide_subroutines();
      import_source(this.import_export_text);
      if (current_scope) {
        return this.edit_subroutine(current_scope);
      }
    };
    import_source = __bind(function(source) {
      var builtin, data, id, subroutine, _ref, _ref2, _results;
      data = load_state(valid_json(source));
      _ref = data.subroutines;
      for (id in _ref) {
        subroutine = _ref[id];
        this.subroutines[subroutine.id] = subroutine;
      }
      _ref2 = data.builtins;
      _results = [];
      for (id in _ref2) {
        builtin = _ref2[id];
        _results.push(this.builtins[builtin.id] = builtin);
      }
      return _results;
    }, this);
    this.load_example_programs = __bind(function() {
      var name, source;
      hide_subroutines();
      for (name in example_programs) {
        source = example_programs[name];
        import_source(source);
      }
      current_scope = this.subroutines[playground_id];
      return scene.add(current_scope.view);
    }, this);
    this.export_all = function() {
      var data;
      data = {
        subroutines: this.subroutines,
        builtins: this.builtins,
        schema_version: schema_version
      };
      return this.import_export_text = JSON.stringify(data);
    };
    this.export_subroutine = __bind(function(subroutine) {
      return this.import_export_text = JSON.stringify(subroutine["export"]());
    }, this);
    this.export_builtin = __bind(function(builtin) {
      return this.import_export_text = JSON.stringify(builtin["export"]());
    }, this);
    this.revert = function() {
      hide_subroutines();
      this.subroutines = {};
      return this.load_example_programs();
    };
    this.literal_text = '';
    this.use_literal = __bind(function() {
      var value;
      value = valid_json(this.literal_text);
      new Literal(V(0, 0), this.literal_text, value);
      return this.literal_text = '';
    }, this);
    this.use_builtin = __bind(function(builtin) {
      return new BuiltinApplication(V(0, 0), builtin);
    }, this);
    this.use_subroutine = __bind(function(subroutine) {
      return new SubroutineApplication(V(0, 0), subroutine);
    }, this);
    this.use_subroutine_value = __bind(function(subroutine) {
      return new Literal(V(0, 0), subroutine.name, subroutine);
    }, this);
    this.initial_subroutine = {
      name: '',
      inputs: [],
      outputs: []
    };
    this.new_subroutine = angular.copy(this.initial_subroutine);
    this.edit_subroutine = __bind(function(subroutine) {
      this.edit_mode = 'subroutine';
      current_scope = subroutine;
      hide_subroutines();
      scene.add(subroutine.view);
      return setTimeout(init_field);
    }, this);
    this.add_subroutine = __bind(function() {
      var subroutine;
      subroutine = new SubRoutine(this.new_subroutine.name, this.new_subroutine.inputs, this.new_subroutine.outputs);
      this.subroutines[subroutine.id] = subroutine;
      this.new_subroutine = angular.copy(this.initial_subroutine);
      this.new_subroutine.inputs = [];
      return this.new_subroutine.outputs = [];
    }, this);
    this.add_builtin = __bind(function() {
      var builtin;
      builtin = new Builtin({});
      this.builtins[builtin.id] = builtin;
      return this.edit_builtin(builtin);
    }, this);
    this.run_subroutine = __bind(function(subroutine, output_index) {
      var input, input_index, input_values, _fn, _len, _ref;
      input_values = [];
      _ref = subroutine.inputs;
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
      for (input_index = 0, _len = _ref.length; input_index < _len; input_index++) {
        input = _ref[input_index];
        _fn(input_index, input);
      }
      try {
        return setTimeout(subroutine.run(output_index, input_values));
      } catch (exception) {
        if (exception instanceof InputError) {
          return alert("Invalid JSON: " + exception.message);
        } else {
          throw exception;
        }
      }
    }, this);
    this.run_builtin = __bind(function(builtin, output_index) {
      return execute(__bind(function() {
        var args, input, input_index, input_values, memo, result, _fn, _len, _ref;
        input_values = [];
        _ref = builtin.inputs;
        _fn = function(input_index, input) {
          return input_values.push(function() {
            return valid_json(prompt("Provide a JSON value for input " + input_index + ": \"" + input + "\""));
          });
        };
        for (input_index = 0, _len = _ref.length; input_index < _len; input_index++) {
          input = _ref[input_index];
          _fn(input_index, input);
        }
        args = input_values.concat([output_index]);
        memo = typeof builtin.memo_function === "function" ? builtin.memo_function.apply(builtin, args) : void 0;
        result = builtin.output_function.apply(builtin, args.concat([memo]));
        return result;
      }, this));
    }, this);
    this.edit_builtin = __bind(function(builtin) {
      teardown_field();
      this.edit_mode = 'builtin';
      return this.editing_builtin = builtin;
    }, this);
    save_state = __bind(function() {
      var state;
      state = {
        subroutines: this.subroutines,
        builtins: this.builtins,
        schema_version: schema_version
      };
      return localStorage.state = JSON.stringify(state);
    }, this);
    this.builtins = all_builtins;
    if (localStorage.state != null) {
      data = JSON.parse(localStorage.state);
      try {
        loaded_state = load_state(data);
        this.builtins = loaded_state.builtins;
        this.subroutines = loaded_state.subroutines;
        current_scope = obj_first(this.subroutines);
        if (current_scope) {
          this.edit_subroutine(current_scope);
        }
        save_timer = setInterval(save_state, 1000);
      } catch (exception) {
        setTimeout(function() {
          throw exception;
        });
      }
    } else {
      this.load_example_programs();
    }
    return system_arrow = make_arrow(V(0, 0), V(1, 0), false);
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
  load_state = function(data) {
    var builtin, builtin_data, builtins, id, subroutine, subroutine_data, subroutines, _ref, _ref2;
    subroutines = {};
    builtins = {};
    _ref = data.builtins;
    for (id in _ref) {
      builtin_data = _ref[id];
      builtin = new Builtin(builtin_data);
      builtins[builtin.id] = builtin;
    }
    _ref2 = data.subroutines;
    for (id in _ref2) {
      subroutine_data = _ref2[id];
      subroutine = new SubRoutine(subroutine_data.name, subroutine_data.inputs, subroutine_data.outputs, subroutine_data.id);
      subroutines[subroutine.id] = subroutine;
    }
    for (id in subroutines) {
      subroutine = subroutines[id];
      current_scope = subroutine;
      load_implementation(data.subroutines[id]);
    }
    return {
      subroutines: subroutines,
      builtins: builtins
    };
  };
  make_main = function() {
    return new SubRoutine('default', [], ['OUT']);
  };
  make_basic_program = function() {
    var c1, c2, c3, five, plus, three;
    plus = make_node('+', V(250, 150));
    five = make_node('5', V(200, 300));
    three = make_node('3', V(300, 300));
    c1 = five.outputs[0].connect(plus.inputs[0]);
    c2 = three.outputs[0].connect(plus.inputs[1]);
    return c3 = plus.outputs[0].connect(current_scope.outputs[0]);
  };
  load_implementation = function(data) {
    var builtin, connection, node, position, sink, sink_connector, source, source_connector, sub_subroutine, value, _i, _j, _len, _len2, _ref, _ref2, _results;
    _ref = data.nodes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      node = _ref[_i];
      position = Vector.from(node.position);
      if (node.type === 'function') {
        sub_subroutine = all_subroutines[node.implementation_id];
        if (!sub_subroutine) {
          console.log("Oh no, subroutine wasn't loaded yet");
        }
        new SubroutineApplication(position, sub_subroutine, node.id);
      } else if (node.type === 'builtin') {
        builtin = all_builtins[node.implementation_id];
        new BuiltinApplication(position, builtin, node.id);
      } else if (node.type === 'literal') {
        if ('implementation_id' in node) {
          sub_subroutine = all_subroutines[node.implementation_id];
          value = sub_subroutine;
        } else {
          value = JSON.parse(node.value);
        }
        new Literal(position, node.text, value, node.id);
      }
    }
    _ref2 = data.connections;
    _results = [];
    for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
      connection = _ref2[_j];
      source = node_registry[connection.output.parent_id];
      sink = node_registry[connection.input.parent_id];
      source_connector = source instanceof Node ? source.outputs : source.inputs;
      sink_connector = sink instanceof Node ? sink.inputs : sink.outputs;
      if (connection.output.index >= source_connector.length || connection.input.index >= sink_connector.length) {
        console.log("Oh no, trying to make an invalid connection");
      }
      _results.push(source_connector[connection.output.index].connect(sink_connector[connection.input.index]));
    }
    return _results;
  };
  playground_id = UUID();
  example_programs = {
    playground: "{\"subroutines\":{\"" + playground_id + "\":{\"id\":\"" + playground_id + "\",\"name\":\"playground\",\"nodes\":[],\"connections\":[],\"inputs\":[],\"outputs\":[\"OUT\"]}},\"builtins\":{\"894652d702c3bb123ce8ed9e2bdcc71b\":{\"id\":\"894652d702c3bb123ce8ed9e2bdcc71b\",\"name\":\"+\",\"inputs\":[\"L\",\"R\"],\"outputs\":[\"R\"],\"memo_implementation\":null,\"output_implementation\":\"function (left, right) {\\n        return left() + right();\\n      }\"},\"99dc67480b5e5fe8adcab5fc6540c8a0\":{\"id\":\"99dc67480b5e5fe8adcab5fc6540c8a0\",\"name\":\"-\",\"inputs\":[\"L\",\"R\"],\"outputs\":[\"R\"],\"memo_implementation\":null,\"output_implementation\":\"function (left, right) {\\n        return left() - right();\\n      }\"},\"c70ac0c10dcfce8249b937ad164413ec\":{\"id\":\"c70ac0c10dcfce8249b937ad164413ec\",\"name\":\"*\",\"inputs\":[\"L\",\"R\"],\"outputs\":[\"R\"],\"memo_implementation\":null,\"output_implementation\":\"function (left, right) {\\n        return left() * right();\\n      }\"},\"3080574badf11047d6df2ed24f8248df\":{\"id\":\"3080574badf11047d6df2ed24f8248df\",\"name\":\"/\",\"inputs\":[\"L\",\"R\"],\"outputs\":[\"R\"],\"memo_implementation\":null,\"output_implementation\":\"function (left, right) {\\n        return left() / right();\\n      }\"},\"993ad152a2a888f6c0e6a6bd8a1c385a\":{\"id\":\"993ad152a2a888f6c0e6a6bd8a1c385a\",\"name\":\"<\",\"inputs\":[\"L\",\"R\"],\"outputs\":[\"R\"],\"memo_implementation\":null,\"output_implementation\":\"function (left, right) {\\n        return left() < right();\\n      }\"},\"3030973e37ce53b896735a3ad6b369d6\":{\"id\":\"3030973e37ce53b896735a3ad6b369d6\",\"name\":\"<=\",\"inputs\":[\"L\",\"R\"],\"outputs\":[\"R\"],\"memo_implementation\":null,\"output_implementation\":\"function (left, right) {\\n        return left() <= right();\\n      }\"},\"54e3469201277e5325db02aa56ab5218\":{\"id\":\"54e3469201277e5325db02aa56ab5218\",\"name\":\"=\",\"inputs\":[\"L\",\"R\"],\"outputs\":[\"R\"],\"memo_implementation\":null,\"output_implementation\":\"function (left, right) {\\n        return left() === right();\\n      }\"},\"4d0b2cd39670d8a70ded2c5f7a6fd5be\":{\"id\":\"4d0b2cd39670d8a70ded2c5f7a6fd5be\",\"name\":\">=\",\"inputs\":[\"L\",\"R\"],\"outputs\":[\"R\"],\"memo_implementation\":null,\"output_implementation\":\"function (left, right) {\\n        return left() >= right();\\n      }\"},\"68af5453eda7b4c9cbe6a86e12b5fba2\":{\"id\":\"68af5453eda7b4c9cbe6a86e12b5fba2\",\"name\":\">\",\"inputs\":[\"L\",\"R\"],\"outputs\":[\"R\"],\"memo_implementation\":null,\"output_implementation\":\"function (left, right) {\\n        return left() > right();\\n      }\"},\"29c894a04e219f47477672bedc3ad620\":{\"id\":\"29c894a04e219f47477672bedc3ad620\",\"name\":\"if\",\"inputs\":[\"T\",\"C\",\"F\"],\"outputs\":[\"R\"],\"memo_implementation\":null,\"output_implementation\":\"function (true_result, condition, false_result) {\\n        if (condition()) {\\n          return true_result();\\n        } else {\\n          return false_result();\\n        }\\n      }\"},\"be7936fcdcc1fe8c8f1024aa91b475e5\":{\"id\":\"be7936fcdcc1fe8c8f1024aa91b475e5\",\"name\":\"prompt\",\"inputs\":[\"M\",\"S\"],\"outputs\":[\"R\",\"S\"],\"memo_implementation\":\"function (message, sequencer) {\\n        try {\\n          sequencer();\\n        } catch (exception) {\\n          if (!(exception instanceof NotConnected)) {\\n            throw exception;\\n          }\\n        }\\n        return prompt(message());\\n      }\",\"output_implementation\":\"function (message, sequencer, index, memo) {\\n        if (index === 0) {\\n          return memo;\\n        } else {\\n          return null;\\n        }\\n      }\"},\"06b207d17227570db276cd4aaef57a2b\":{\"id\":\"06b207d17227570db276cd4aaef57a2b\",\"name\":\"funnel\",\"inputs\":[\"V\",\"S\"],\"outputs\":[\"V\"],\"memo_implementation\":null,\"output_implementation\":\"function (value, sequencer) {\\n        try {\\n          sequencer();\\n        } catch (exception) {\\n          if (!(exception instanceof NotConnected)) {\\n            throw exception;\\n          }\\n        }\\n        return value();\\n      }\"},\"51f15a4fe5f0c1bf1e31f63733aa1618\":{\"id\":\"51f15a4fe5f0c1bf1e31f63733aa1618\",\"name\":\"log\",\"inputs\":[\"in\"],\"outputs\":[\"out\"],\"memo_implementation\":null,\"output_implementation\":\"function (input) {\\n        var value;\\n        value = input();\\n        console.log(value);\\n        return value;\\n      }\"},\"1baf12a4702a0ecc724592ad8dd285f3\":{\"id\":\"1baf12a4702a0ecc724592ad8dd285f3\",\"name\":\"exit\",\"inputs\":[],\"outputs\":[\"R\"],\"memo_implementation\":null,\"output_implementation\":\"function () {\\n        throw new Exit;\\n      }\"},\"09f91a7ec8fd64baacda01ee70760569\":{\"id\":\"09f91a7ec8fd64baacda01ee70760569\",\"name\":\"replace\",\"inputs\":[\"text\",\"rem\",\"ins\"],\"outputs\":[\"result\"],\"memo_implementation\":null,\"output_implementation\":\"function (text, pattern, replacement) {\\n        return text().replace(pattern(), replacement());\\n      }\"},\"a612be6f7bae3de3ae2f883bc3f245c4\":{\"id\":\"a612be6f7bae3de3ae2f883bc3f245c4\",\"name\":\"two_outputs\",\"inputs\":[],\"outputs\":[\"L\",\"R\"],\"memo_implementation\":null,\"output_implementation\":\"function (index) {\\n        if (index === 0) {\\n          return \\\"left\\\";\\n        } else {\\n          return \\\"right\\\";\\n        }\\n      }\"},\"a9f07bc7545769b8b8b31a9d7ac77229\":{\"id\":\"a9f07bc7545769b8b8b31a9d7ac77229\",\"name\":\"int\",\"inputs\":[\"IN\"],\"outputs\":[\"int\"],\"memo_implementation\":null,\"output_implementation\":\"function (str) {\\n        return parseInt(str());\\n      }\"},\"7cca8f80ac29c5a1e72c371c574e7414\":{\"id\":\"7cca8f80ac29c5a1e72c371c574e7414\",\"name\":\"float\",\"inputs\":[\"IN\"],\"outputs\":[\"float\"],\"memo_implementation\":null,\"output_implementation\":\"function (str) {\\n        return parseFloat(str());\\n      }\"},\"b5b3023a4a839ed106882e74923dab88\":{\"id\":\"b5b3023a4a839ed106882e74923dab88\",\"name\":\"str\",\"inputs\":[\"IN\"],\"outputs\":[\"str\"],\"memo_implementation\":null,\"output_implementation\":\"function (obj) {\\n        return '' + obj();\\n      }\"},\"3827fa434cfc1b71555e0e958633e1ca\":{\"id\":\"3827fa434cfc1b71555e0e958633e1ca\",\"name\":\"from json\",\"inputs\":[\"str\"],\"outputs\":[\"obj\"],\"memo_implementation\":null,\"output_implementation\":\"function (str) {\\n        return JSON.parse(str());\\n      }\"},\"aa8c65ccce7abc2c524349c843bb4fc5\":{\"id\":\"aa8c65ccce7abc2c524349c843bb4fc5\",\"name\":\"to json\",\"inputs\":[\"obj\"],\"outputs\":[\"str\"],\"memo_implementation\":null,\"output_implementation\":\"function (obj) {\\n        return JSON.stringify(obj());\\n      }\"},\"9a7d34a3c313a193ba47e747b4ff9132\":{\"id\":\"9a7d34a3c313a193ba47e747b4ff9132\",\"name\":\"random float\",\"inputs\":[],\"outputs\":[\"OUT\"],\"memo_implementation\":null,\"output_implementation\":\"function () {\\n        return Math.random();\\n      }\"},\"325fa3507bac12a3673f2789e12a1e41\":{\"id\":\"325fa3507bac12a3673f2789e12a1e41\",\"name\":\"call\",\"inputs\":[\"SUB\",\"IN\"],\"outputs\":[\"OUT\"],\"memo_implementation\":null,\"output_implementation\":\"function (subroutine, input) {\\n        return subroutine().invoke(0, [input]);\\n      }\"},\"9fbdec485d1149e1c24d54f332099247\":{\"id\":\"9fbdec485d1149e1c24d54f332099247\",\"name\":\"call-n\",\"inputs\":[\"SUB\",\"IN\"],\"outputs\":[\"OUT\"],\"memo_implementation\":null,\"output_implementation\":\"function (subroutine, inputs) {\\n        return subroutine().invoke(0, inputs());\\n      }\"},\"0b40d2d29e6df169bc95d854f41ff476\":{\"id\":\"0b40d2d29e6df169bc95d854f41ff476\",\"name\":\"cons\",\"inputs\":[\"LIST\",\"ELE\"],\"outputs\":[\"LIST\"],\"memo_implementation\":null,\"output_implementation\":\"function (list, element) {\\n        return list().concat(element());\\n      }\"},\"73b5d938605bb060c7ddfa031fe29d46\":{\"id\":\"73b5d938605bb060c7ddfa031fe29d46\",\"name\":\"lazy input\",\"inputs\":[\"IN\"],\"outputs\":[\"OUT\"],\"memo_implementation\":null,\"output_implementation\":\"function (input) {\\n        return input;\\n      }\"}},\"schema_version\":1}"
  };
}).call(this);
