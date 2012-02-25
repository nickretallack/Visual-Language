(function() {
  var Builtin, Connection, FunctionApplication, Input, InputError, Literal, Nib, Node, Output, SubRoutine, all_builtins, all_subroutines, animate, boxes, builtins, camera, connecting_object, connection_view, current_scope, dragging_object, dragging_offset, example_programs, execute, get_absolute_nib_position, get_nib_position, height, id, info, last, load_implementation, load_program, load_state, load_subroutine, make_arrow, make_basic_program, make_box, make_connection, make_main, make_nib_view, make_node_view, make_subroutine_view, make_text, mouse_coords, mouse_down, mouse_move, mouse_up, node_registry, obj_first, projector, ray_cast_mouse, renderer, scene, schema_version, should_animate, system_arrow, update, valid_json, whitespace_split, width;
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
  should_animate = true;
  update = function() {
    return renderer.render(scene, camera);
  };
  animate = function() {
    requestAnimationFrame(animate);
    if (should_animate) {
      return update();
    }
  };
  builtins = {
    "894652d702c3bb123ce8ed9e2bdcc71b": {
      name: '+',
      inputs: ['L', 'R'],
      outputs: ['R'],
      output_implementation: function(left, right) {
        return left() + right();
      }
    },
    "99dc67480b5e5fe8adcab5fc6540c8a0": {
      name: '-',
      inputs: ['L', 'R'],
      outputs: ['R'],
      output_implementation: function(left, right) {
        return left() - right();
      }
    },
    "c70ac0c10dcfce8249b937ad164413ec": {
      name: '*',
      inputs: ['L', 'R'],
      outputs: ['R'],
      output_implementation: function(left, right) {
        return left() * right();
      }
    },
    "3080574badf11047d6df2ed24f8248df": {
      name: '/',
      inputs: ['L', 'R'],
      outputs: ['R'],
      output_implementation: function(left, right) {
        return left() / right();
      }
    },
    "993ad152a2a888f6c0e6a6bd8a1c385a": {
      name: '<',
      inputs: ['L', 'R'],
      outputs: ['R'],
      output_implementation: function(left, right) {
        return left() < right();
      }
    },
    "3030973e37ce53b896735a3ad6b369d6": {
      name: '<=',
      inputs: ['L', 'R'],
      outputs: ['R'],
      output_implementation: function(left, right) {
        return left() <= right();
      }
    },
    "54e3469201277e5325db02aa56ab5218": {
      name: '=',
      inputs: ['L', 'R'],
      outputs: ['R'],
      output_implementation: function(left, right) {
        return left() === right();
      }
    },
    "4d0b2cd39670d8a70ded2c5f7a6fd5be": {
      name: '>=',
      inputs: ['L', 'R'],
      outputs: ['R'],
      output_implementation: function(left, right) {
        return left() >= right();
      }
    },
    "68af5453eda7b4c9cbe6a86e12b5fba2": {
      name: '>',
      inputs: ['L', 'R'],
      outputs: ['R'],
      output_implementation: function(left, right) {
        return left() > right();
      }
    },
    "29c894a04e219f47477672bedc3ad620": {
      name: 'if',
      inputs: ['T', 'C', 'F'],
      outputs: ['R'],
      output_implementation: function(true_result, condition, false_result) {
        if (condition()) {
          return true_result();
        } else {
          return false_result();
        }
      }
    },
    "be7936fcdcc1fe8c8f1024aa91b475e5": {
      name: 'prompt',
      inputs: ['M', 'S'],
      outputs: ['R', 'S'],
      memo_implementation: function(message, sequencer) {
        try {
          sequencer();
        } catch (exception) {
          if (exception !== "NotConnected") {
            throw exception;
          }
        }
        return prompt(message());
      },
      output_implementation: function(message, sequencer, index, memo) {
        if (index === 0) {
          return memo;
        } else {
          return null;
        }
      }
    },
    "06b207d17227570db276cd4aaef57a2b": {
      name: 'funnel',
      inputs: ['V', 'S'],
      outputs: ['V'],
      output_implementation: function(value, sequencer) {
        try {
          sequencer();
        } catch (exception) {
          if (exception !== "NotConnected") {
            throw exception;
          }
        }
        return value();
      }
    },
    "51f15a4fe5f0c1bf1e31f63733aa1618": {
      name: 'log',
      inputs: ['in'],
      outputs: ['out'],
      output_implementation: function(input) {
        var value;
        value = input();
        console.log(value);
        return value;
      }
    },
    "1baf12a4702a0ecc724592ad8dd285f3": {
      name: 'exit',
      inputs: [],
      outputs: ['R'],
      output_implementation: function() {
        throw "Exit";
      }
    },
    "09f91a7ec8fd64baacda01ee70760569": {
      name: 'replace',
      inputs: ['text', 'rem', 'ins'],
      outputs: ['result'],
      output_implementation: function(text, pattern, replacement) {
        return text().replace(pattern(), replacement());
      }
    },
    "a612be6f7bae3de3ae2f883bc3f245c4": {
      name: 'two_outputs',
      inputs: [],
      outputs: ['L', 'R'],
      output_implementation: function(index) {
        if (index === 0) {
          return "left";
        } else {
          return "right";
        }
      }
    },
    "a9f07bc7545769b8b8b31a9d7ac77229": {
      name: 'int',
      inputs: ['IN'],
      outputs: ['int'],
      output_implementation: function(str) {
        return parseInt(str());
      }
    },
    "7cca8f80ac29c5a1e72c371c574e7414": {
      name: 'float',
      inputs: ['IN'],
      outputs: ['float'],
      output_implementation: function(str) {
        return parseFloat(str());
      }
    },
    "b5b3023a4a839ed106882e74923dab88": {
      name: 'str',
      inputs: ['IN'],
      outputs: ['str'],
      output_implementation: function(obj) {
        return '' + obj();
      }
    },
    "3827fa434cfc1b71555e0e958633e1ca": {
      name: 'from json',
      inputs: ['str'],
      outputs: ['obj'],
      output_implementation: function(str) {
        return JSON.parse(str());
      }
    },
    "aa8c65ccce7abc2c524349c843bb4fc5": {
      name: 'to json',
      inputs: ['obj'],
      outputs: ['str'],
      output_implementation: function(obj) {
        return JSON.stringify(obj());
      }
    },
    "9a7d34a3c313a193ba47e747b4ff9132": {
      name: 'random float',
      inputs: [],
      outputs: ['OUT'],
      output_implementation: function() {
        return Math.random();
      }
    },
    "325fa3507bac12a3673f2789e12a1e41": {
      name: 'call',
      inputs: ['SUB', 'IN'],
      outputs: ['OUT'],
      output_implementation: function(subroutine, input) {
        return subroutine().invoke(0, [input]);
      }
    },
    "9fbdec485d1149e1c24d54f332099247": {
      name: 'call-n',
      inputs: ['SUB', 'IN'],
      outputs: ['OUT'],
      output_implementation: function(subroutine, inputs) {
        return subroutine().invoke(0, inputs());
      }
    },
    "0b40d2d29e6df169bc95d854f41ff476": {
      name: 'cons',
      inputs: ['LIST', 'ELE'],
      outputs: ['LIST'],
      output_implementation: function(list, element) {
        return list().concat(element());
      }
    },
    "73b5d938605bb060c7ddfa031fe29d46": {
      name: 'lazy input',
      inputs: ['IN'],
      outputs: ['OUT'],
      output_implementation: function(input) {
        return input;
      }
    }
  };
  execute = function(routine) {
    try {
      return alert(JSON.stringify(routine()));
    } catch (exception) {
      if (exception === 'NotConnected') {
        return alert("Something in the program is disconnected");
      } else if (exception === 'Exit') {
        return alert("Program Exited");
      } else {
        throw exception;
      }
    }
  };
  /* MODELS */
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
      this.output_function = eval("(" + this.output_implementation + ")");
      this.memo_function = eval("(" + this.memo_implementation + ")");
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
  for (id in builtins) {
    info = builtins[id];
    info.id = id;
    info.output_implementation = '' + info.output_implementation;
    if (info.memo_implementation) {
      info.memo_implementation = '' + info.memo_implementation;
    }
    new Builtin(info);
  }
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
        throw "NotConnected";
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
      return execute(function() {
        return this.invoke(output_index, input_values);
      });
    };
    SubRoutine.prototype["export"] = function() {
      var dependencies;
      dependencies = this.get_dependencies();
      return {
        subroutines: dependencies,
        schema_version: schema_version
      };
    };
    SubRoutine.prototype.get_dependencies = function(dependencies) {
      var node, _i, _len, _ref;
      if (dependencies == null) {
        dependencies = {};
      }
      if (!(this.id in dependencies)) {
        dependencies[this.id] = this;
      }
      _ref = this.nodes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        if (node.type === 'function') {
          dependencies = dependencies.concat(node.subroutine.get_dependencies(dependencies));
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
    function FunctionApplication(position, text, information, id) {
      var index, text;
      this.position = position;
      this.text = text;
      this.id = id != null ? id : UUID();
      if (information.definition instanceof SubRoutine) {
        this.subroutine = information.definition;
        this.implementation = this.subroutine;
        this.type = 'function';
      } else {
        this.value = information.definition;
        this.implementation = information;
        this.memo = information.memo;
        this.type = 'builtin';
      }
      FunctionApplication.__super__.constructor.call(this);
      this.inputs = (function() {
        var _len, _ref, _results;
        _ref = information.inputs;
        _results = [];
        for (index = 0, _len = _ref.length; index < _len; index++) {
          text = _ref[index];
          _results.push(new Input(this, text, index, information.inputs.length - 1));
        }
        return _results;
      }).call(this);
      this.outputs = (function() {
        var _len, _ref, _results;
        _ref = information.outputs;
        _results = [];
        for (index = 0, _len = _ref.length; index < _len; index++) {
          text = _ref[index];
          _results.push(new Output(this, text, index, information.outputs.length - 1));
        }
        return _results;
      }).call(this);
    }
    __extends(FunctionApplication, Node);
    FunctionApplication.prototype.evaluation = function(the_scope, output_index) {
      var args, input, input_values, _fn, _i, _len, _ref;
      input_values = [];
      _ref = this.inputs;
      _fn = function(input) {
        return input_values.push(_.memoize(function() {
          var output, _ref2;
          output = (_ref2 = input.get_connection()) != null ? _ref2.connection.output : void 0;
          if (!output) {
            throw "NotConnected";
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
      if (this.subroutine != null) {
        return this.subroutine.invoke(output_index, input_values);
      } else {
        args = input_values.concat([output_index]);
        if (this.memo && !(this.id in the_scope.memos)) {
          the_scope.memos[this.id] = this.memo.apply(this, args);
        }
        return this.value.apply(this, args.concat([the_scope.memos[this.id]]));
      }
    };
    FunctionApplication.prototype.toJSON = function() {
      var json;
      json = FunctionApplication.__super__.toJSON.call(this);
      json.implementation_id = this.implementation.id;
      return json;
    };
    FunctionApplication.prototype.subroutines_referenced = function() {
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
    return FunctionApplication;
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
    box = make_box(subroutine.name, box_size, 10, 0xEEEEEE, position, false);
    box.model = subroutine;
    boxes[box.id] = box;
    return box;
  };
  make_node_view = function(node) {
    var color, main_box, main_box_size;
    main_box_size = V(50, 50);
    color = 0x888888;
    main_box = make_box(node.text, main_box_size, 10, color, node.position);
    main_box.model = node;
    node.scope.view.add(main_box);
    boxes[main_box.id] = main_box;
    return main_box;
  };
  make_nib_view = function(nib, is_node) {
    var parent, parent_size, sub_box, sub_box_color, sub_box_size, x_position, y_offset, y_position;
    sub_box_size = V(20, 20);
    sub_box_color = 0x888888;
    parent_size = is_node ? V(60, 60) : V(490, 490);
    y_offset = parent_size.y / 2.0;
    x_position = -parent_size.x / 2.0 + parent_size.x * nib.index / nib.siblings;
    y_position = y_offset * (nib instanceof Input ? 1 : -1) * (is_node ? 1 : -1);
    sub_box = make_box(nib.text, sub_box_size, 5, sub_box_color, V(x_position, y_position));
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
    centerOffset = -0.5 * (geometry.boundingBox.x[1] - geometry.boundingBox.x[0]);
    material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      overdraw: true
    });
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = centerOffset;
    return mesh;
  };
  make_box = function(name, size, text_size, color, position, outline) {
    var box, geometry, material, mesh;
    if (outline == null) {
      outline = false;
    }
    box = new THREE.Object3D();
    geometry = (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return typeof result === "object" ? result : child;
    })(THREE.PlaneGeometry, size.components(), function() {});
    material = new THREE.MeshBasicMaterial({
      color: color,
      wireframe: outline
    });
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
  mouse_down = function(event) {
    var target;
    event.preventDefault();
    target = ray_cast_mouse();
    if (target) {
      if (target.model instanceof Node) {
        if (event.which === 3) {
          return target.model["delete"]();
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
    var adjusted_vector, connection, id, mouse_vector, nib, node, vector, _i, _len, _ref, _ref2;
    mouse_vector = mouse_coords(event);
    adjusted_vector = mouse_vector.minus(V(250, 250)).three();
    vector = mouse_vector.three();
    if (dragging_object) {
      node = dragging_object.model;
      node.set_position(adjusted_vector);
      _ref = node.get_nibs();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        nib = _ref[_i];
        _ref2 = nib.connections;
        for (id in _ref2) {
          connection = _ref2[id];
          connection.vertex.position.copy(get_nib_position(nib));
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
  InputError = (function() {
    function InputError(message) {
      this.message = message;
    }
    return InputError;
  })();
  valid_json = function(json) {
    try {
      return JSON.parse(json);
    } catch (exception) {
      if (exception instanceof SyntaxError) {
        return alert("Invalid JSON: " + json);
      } else {
        throw exception;
      }
    }
  };
  window.Controller = function() {
    var data, hide_subroutines, import_source, init_field, save_state, save_timer, teardown_field;
    init_field = function() {
      var field;
      should_animate = true;
      field = $("#field");
      field.append(renderer.domElement);
      animate();
      field.mousedown(mouse_down);
      field.mouseup(mouse_up);
      field.mousemove(mouse_move);
      return field.bind('contextmenu', function() {
        return false;
      });
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
      return scene.add(current_scope.view);
    };
    import_source = __bind(function(source) {
      var id, subroutine, subroutines, _results;
      subroutines = load_state(valid_json(source));
      _results = [];
      for (id in subroutines) {
        subroutine = subroutines[id];
        _results.push(this.subroutines[subroutine.id] = subroutine);
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
      current_scope = this.subroutines["2092fbbc04daf231793ce4d1d6761172"];
      return scene.add(current_scope.view);
    }, this);
    this.export_all = function() {
      var data;
      data = {
        subroutines: this.subroutines,
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
    this.use_builtin = __bind(function(id) {
      var information;
      information = builtins[id];
      return new FunctionApplication(V(0, 0), information.name, information);
    }, this);
    this.use_subroutine = __bind(function(subroutine) {
      return new FunctionApplication(V(0, 0), subroutine.name, {
        inputs: subroutine.get_inputs(),
        outputs: subroutine.get_outputs(),
        definition: subroutine
      });
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
            throw "Exit";
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
      return execute(function() {
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
      });
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
        this.subroutines = load_state(data);
        this.edit_subroutine(current_scope);
      } catch (exception) {
        setTimeout(function() {
          throw exception;
        });
      }
    } else {
      this.load_example_programs();
    }
    system_arrow = make_arrow(V(0, 0), V(1, 0), false);
    return save_timer = setInterval(save_state, 500);
  };
  load_state = function(data) {
    var id, subroutine, subroutine_data, subroutines, _ref;
    subroutines = {};
    _ref = data.subroutines;
    for (id in _ref) {
      subroutine_data = _ref[id];
      subroutine = load_subroutine(subroutine_data);
      subroutines[subroutine.id] = subroutine;
    }
    for (id in subroutines) {
      subroutine = subroutines[id];
      current_scope = subroutine;
      load_implementation(data.subroutines[id]);
    }
    return subroutines;
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
  load_program = function(data) {
    var subroutine;
    subroutine = load_subroutine(data.subroutine);
    return new Program(data.name, subroutine, data.id);
  };
  load_subroutine = function(data) {
    var subroutine;
    return subroutine = new SubRoutine(data.name, data.inputs, data.outputs, data.id);
  };
  load_implementation = function(data) {
    var connection, information, name, node, position, sink, sink_connector, source, source_connector, sub_subroutine, value, _i, _j, _len, _len2, _ref, _ref2, _results;
    _ref = data.nodes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      node = _ref[_i];
      position = Vector.from(node.position);
      if (node.type === 'function') {
        sub_subroutine = all_subroutines[node.implementation_id];
        if (!sub_subroutine) {
          console.log("Oh no, subroutine wasn't loaded yet");
        }
        new FunctionApplication(position, sub_subroutine.name, {
          inputs: sub_subroutine.get_inputs(),
          outputs: sub_subroutine.get_outputs(),
          definition: sub_subroutine
        }, node.id);
      } else if (node.type === 'builtin') {
        information = builtins[node.implementation_id];
        name = information.name;
        new FunctionApplication(position, name, information, node.id);
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
  example_programs = {
    playground: "{\"subroutines\":{\"2092fbbc04daf231793ce4d1d6761172\":{\"id\":\"2092fbbc04daf231793ce4d1d6761172\",\"name\":\"playground\",\"nodes\":[],\"connections\":[],\"inputs\":[],\"outputs\":[\"OUT\"]}}}"
  };
}).call(this);
