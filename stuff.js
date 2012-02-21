(function() {
  var Connection, FunctionApplication, Input, Literal, Nib, Node, Output, Program, SubRoutine, addition_program_source, all_subroutines, animate, boxes, camera, connecting_object, connection_view, current_scope, dragging_object, dragging_offset, functions, get_absolute_nib_position, get_nib_position, height, hide_subroutines, how_are_you_source, initial_program, last, load_program, main, make_arrow, make_basic_program, make_box, make_connection, make_main, make_nib_view, make_node, make_node_view, make_subroutine_view, make_text, mouse_coords, mouse_down, mouse_move, mouse_up, node_registry, projector, ray_cast_mouse, renderer, scene, system_arrow, update, width,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

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

  boxes = {};

  node_registry = {};

  all_subroutines = [];

  current_scope = null;

  update = function() {
    return renderer.render(scene, camera);
  };

  animate = function() {
    requestAnimationFrame(animate);
    return update();
  };

  functions = {
    '+': {
      inputs: ['L', 'R'],
      outputs: ['R'],
      definition: function(left, right) {
        return left() + right();
      }
    },
    '-': {
      inputs: ['L', 'R'],
      outputs: ['R'],
      definition: function(left, right) {
        return left() - right();
      }
    },
    'if': {
      inputs: ['T', 'C', 'F'],
      outputs: ['R'],
      definition: function(true_result, condition, false_result) {
        if (condition()) {
          return true_result();
        } else {
          return false_result();
        }
      }
    },
    'die': {
      inputs: [],
      outputs: ['R'],
      definition: function() {
        throw "Exit";
      }
    },
    'prompt': {
      inputs: ['M'],
      outputs: ['R'],
      definition: function(message) {
        return prompt(message());
      }
    },
    '=': {
      inputs: ['L', 'R'],
      outputs: ['R'],
      definition: function(left, right) {
        return left() === right();
      }
    },
    '>': {
      inputs: ['L', 'R'],
      outputs: ['R'],
      definition: function(left, right) {
        return left() > right();
      }
    },
    '>=': {
      inputs: ['L', 'R'],
      outputs: ['R'],
      definition: function(left, right) {
        return left() >= right();
      }
    }
  };

  /* MODELS
  */

  Program = (function() {

    function Program(name, subroutine) {
      this.name = name != null ? name : '';
      this.subroutine = subroutine;
    }

    Program.prototype.run = function() {
      return alert(this.subroutine.evaluation());
    };

    return Program;

  })();

  SubRoutine = (function() {

    function SubRoutine(name, inputs, outputs, id) {
      var index, text;
      this.name = name != null ? name : '';
      if (inputs == null) inputs = [];
      if (outputs == null) outputs = [];
      this.id = id != null ? id : UUID();
      node_registry[this.id] = this;
      this.view = make_subroutine_view(this);
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
      all_subroutines.push(this);
    }

    SubRoutine.prototype.toJSON = function() {
      return {
        nodes: _.values(this.nodes),
        connections: _.values(this.connections)
      };
    };

    SubRoutine.prototype.evaluation = function() {
      var inputs, output, _ref;
      inputs = arguments;
      output = (_ref = this.outputs[0].get_connection()) != null ? _ref.connection.output.parent : void 0;
      if (!output) throw "NotConnected";
      if (output instanceof Node) {
        return output.evaluation.apply(output, inputs);
      } else if (output instanceof SubRoutine) {
        return inputs[0]();
      }
    };

    SubRoutine.prototype.get_inputs = function() {
      var output, _i, _len, _ref, _results;
      _ref = this.outputs;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        output = _ref[_i];
        _results.push(output.text);
      }
      return _results;
    };

    SubRoutine.prototype.get_outputs = function() {
      var input, _i, _len, _ref, _results;
      _ref = this.inputs;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        input = _ref[_i];
        _results.push(input.text);
      }
      return _results;
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
        id: this.id
      };
    };

    return Node;

  })();

  FunctionApplication = (function(_super) {

    __extends(FunctionApplication, _super);

    function FunctionApplication(position, text, information, id) {
      var index, text;
      this.position = position;
      this.text = text;
      this.id = id != null ? id : UUID();
      if (information.definition instanceof SubRoutine) {
        this.subroutine = information.definition;
      } else {
        this.value = information.definition;
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

    FunctionApplication.prototype.evaluation = function() {
      var input, input_values, _fn, _i, _len, _ref, _ref2;
      input_values = [];
      _ref = this.inputs;
      _fn = function(input) {
        return input_values.push(function() {
          var output, _ref2;
          output = (_ref2 = input.get_connection()) != null ? _ref2.connection.output.parent : void 0;
          if (!output) throw "NotConnected";
          return output.evaluation();
        });
      };
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        input = _ref[_i];
        _fn(input);
      }
      if (this.subroutine != null) {
        return (_ref2 = this.subroutine).evaluation.apply(_ref2, input_values);
      } else {
        return parent.value.apply(parent, input_values);
      }
    };

    return FunctionApplication;

  })(Node);

  Literal = (function(_super) {

    __extends(Literal, _super);

    function Literal(position, text, value, id) {
      this.position = position;
      this.text = text;
      this.value = value;
      this.id = id != null ? id : UUID();
      Literal.__super__.constructor.call(this);
      this.inputs = [];
      this.outputs = [new Output(this, 'O')];
    }

    Literal.prototype.evaluation = function() {
      return this.value;
    };

    return Literal;

  })(Node);

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

  Input = (function(_super) {

    __extends(Input, _super);

    function Input(parent, text, index, siblings) {
      this.parent = parent;
      this.text = text;
      this.index = index != null ? index : 0;
      this.siblings = siblings != null ? siblings : 0;
      Input.__super__.constructor.call(this);
    }

    Input.prototype._add_connection = function(connection, vertex) {
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
      return new Connection(this(output));
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
      return new Connection(input, this);
    };

    return Output;

  })(Nib);

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

  /* VIEWS
  */

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

  /* FACTORIES
  */

  make_node = function(text, position, id) {
    var as_number, information, node, value, _ref;
    if (position == null) position = V(0, 0);
    if (id == null) id = void 0;
    if ((text[0] === last(text)) && ((_ref = text[0]) === "'" || _ref === '"')) {
      value = text.slice(1, (text.length - 1));
      return new Literal(position, text, value, id);
    } else {
      as_number = parseFloat(text);
      if (!isNaN(as_number)) {
        return new Literal(position, text, as_number, id);
      } else if (text in functions) {
        information = functions[text];
        node = new FunctionApplication(position, text, information, id);
        return node;
      }
    }
  };

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

  /* CORE RENDERING
  */

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
    if (outline == null) outline = false;
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

  make_arrow = function(source, target) {
    var arrow, color, line, line_geometry, line_material;
    arrow = new THREE.Object3D();
    color = 0x888888;
    if ('three' in source) source = source.three();
    if ('three' in target) target = target.three();
    line_geometry = new THREE.Geometry();
    line_material = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 3
    });
    line_geometry.vertices.push(new THREE.Vertex(source));
    line_geometry.vertices.push(new THREE.Vertex(target));
    line = new THREE.Line(line_geometry, line_material);
    current_scope.view.add(line);
    return line;
  };

  /* CORE HELPERS
  */

  ray_cast_mouse = function() {
    var forward, intersections, mouse, ray;
    mouse = mouse_coords(event).three();
    mouse.z = 1;
    forward = new THREE.Vector3(0, 0, -1);
    ray = new THREE.Ray(mouse, forward);
    intersections = ray.intersectScene(scene);
    console.log(intersections);
    if (intersections.length > 0) return (last(intersections)).object.parent;
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

  /* INTERACTION
  */

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

  hide_subroutines = function() {
    var subroutine, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = all_subroutines.length; _i < _len; _i++) {
      subroutine = all_subroutines[_i];
      _results.push(scene.remove(subroutine.view));
    }
    return _results;
  };

  window.Controller = function() {
    var field,
      _this = this;
    console.log("running");
    field = $("#field");
    field.append(renderer.domElement);
    animate();
    field.mousedown(mouse_down);
    field.mouseup(mouse_up);
    field.mousemove(mouse_move);
    field.bind('contextmenu', function() {
      return false;
    });
    this.new_node_text = '';
    this.add_new_node = function() {
      _this.add_node(_this.new_node_text);
      return _this.new_node_text = '';
    };
    this.add_node = function(text) {
      var node;
      return node = make_node(text);
    };
    this.use_subroutine = function(subroutine) {
      return new FunctionApplication(V(0, 0), subroutine.name, {
        inputs: subroutine.get_inputs(),
        outputs: subroutine.get_outputs(),
        definition: subroutine
      });
    };
    this.initial_subroutine = {
      name: '',
      inputs: '',
      outputs: ''
    };
    this.new_subroutine = angular.copy(this.initial_subroutine);
    this.edit_subroutine = function(subroutine) {
      current_scope = subroutine;
      hide_subroutines();
      return scene.add(subroutine.view);
    };
    this.add_subroutine = function() {
      _this.subroutines.push(new SubRoutine(_this.new_subroutine.name, _this.new_subroutine.inputs.split(' '), _this.new_subroutine.outputs.split(' ')));
      return _this.new_subroutine = angular.copy(_this.initial_subroutine);
    };
    this.run_program = function(program) {
      return program.run();
    };
    this.programs = [initial_program];
    this.new_program_name = '';
    this.add_program = function() {
      return _this.programs.push(new Program(_this.new_program_name, make_main()));
    };
    this.library = functions;
    this.subroutines = [];
    this.subroutines.push(new SubRoutine('foo', ['a'], ['b']));
    return scene.add(this.programs[0].subroutine.view);
  };

  make_main = function() {
    return new SubRoutine('main', [], ['OUT']);
  };

  current_scope = main = make_main();

  initial_program = new Program('initial', main);

  make_basic_program = function() {
    var c1, c2, c3, five, plus, three;
    plus = make_node('+', V(250, 150));
    five = make_node('5', V(200, 300));
    three = make_node('3', V(300, 300));
    c1 = five.outputs[0].connect(plus.inputs[0]);
    c2 = three.outputs[0].connect(plus.inputs[1]);
    return c3 = plus.outputs[0].connect(current_scope.outputs[0]);
  };

  load_program = function(source) {
    var connection, node, program, sink, _i, _j, _len, _len2, _ref, _ref2, _results;
    program = JSON.parse(source);
    _ref = program.nodes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      node = _ref[_i];
      make_node(node.text, Vector.from(node.position), node.id);
    }
    _ref2 = program.connections;
    _results = [];
    for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
      connection = _ref2[_j];
      source = node_registry[connection.output.parent_id];
      sink = node_registry[connection.input.parent_id];
      _results.push(source.outputs[connection.output.index].connect(sink.inputs[connection.input.index]));
    }
    return _results;
  };

  how_are_you_source = "{\"nodes\":[{\"position\":{\"x\":242,\"y\":110,\"z\":0},\"text\":\"out\",\"id\":\"56b9d684188339dafd5d3f0fe9421371\"},{\"position\":{\"x\":243,\"y\":210,\"z\":0},\"text\":\"if\",\"id\":\"3190bcfcc5ece720f07ccde57b12f8a3\"},{\"position\":{\"x\":152,\"y\":315,\"z\":0},\"text\":\"\\\"That's Awesome!\\\"\",\"id\":\"d33ff759bef23100f01c59d525d404d7\"},{\"position\":{\"x\":339,\"y\":316,\"z\":0},\"text\":\"\\\"Oh Well\\\"\",\"id\":\"5d54ff1fa3f1633b31a1ba8c0536f1f0\"},{\"position\":{\"x\":239,\"y\":363,\"z\":0},\"text\":\"=\",\"id\":\"6b8e3e498b936e992c0ceddbbe354635\"},{\"position\":{\"x\":146,\"y\":469,\"z\":0},\"text\":\"\\\"good\\\"\",\"id\":\"3673f98c69da086d30994c91c01fe3f7\"},{\"position\":{\"x\":336,\"y\":472,\"z\":0},\"text\":\"prompt\",\"id\":\"92de68eec528651f75a74492604f5211\"},{\"position\":{\"x\":334,\"y\":598,\"z\":0},\"text\":\"\\\"How are you?\\\"\",\"id\":\"aa4cb4c766117fb44f5a917f1a1f9ba5\"}],\"connections\":[{\"input\":{\"index\":0,\"parent_id\":\"56b9d684188339dafd5d3f0fe9421371\"},\"output\":{\"index\":0,\"parent_id\":\"3190bcfcc5ece720f07ccde57b12f8a3\"}},{\"input\":{\"index\":0,\"parent_id\":\"3190bcfcc5ece720f07ccde57b12f8a3\"},\"output\":{\"index\":0,\"parent_id\":\"d33ff759bef23100f01c59d525d404d7\"}},{\"input\":{\"index\":2,\"parent_id\":\"3190bcfcc5ece720f07ccde57b12f8a3\"},\"output\":{\"index\":0,\"parent_id\":\"5d54ff1fa3f1633b31a1ba8c0536f1f0\"}},{\"input\":{\"index\":1,\"parent_id\":\"3190bcfcc5ece720f07ccde57b12f8a3\"},\"output\":{\"index\":0,\"parent_id\":\"6b8e3e498b936e992c0ceddbbe354635\"}},{\"input\":{\"index\":0,\"parent_id\":\"6b8e3e498b936e992c0ceddbbe354635\"},\"output\":{\"index\":0,\"parent_id\":\"3673f98c69da086d30994c91c01fe3f7\"}},{\"input\":{\"index\":1,\"parent_id\":\"6b8e3e498b936e992c0ceddbbe354635\"},\"output\":{\"index\":0,\"parent_id\":\"92de68eec528651f75a74492604f5211\"}},{\"input\":{\"index\":0,\"parent_id\":\"92de68eec528651f75a74492604f5211\"},\"output\":{\"index\":0,\"parent_id\":\"aa4cb4c766117fb44f5a917f1a1f9ba5\"}}]}";

  addition_program_source = "{\"nodes\":[{\"position\":{\"x\":200,\"y\":100},\"text\":\"out\",\"id\":\"a3a19afbbc5b944012036668230eb819\"},{\"position\":{\"x\":200,\"y\":300},\"text\":\"+\",\"id\":\"4c19f385dd04884ab84eb27f71011054\"},{\"position\":{\"x\":150,\"y\":500},\"text\":\"5\",\"id\":\"c532ec59ef6b57af6bd7323be2d27d93\"},{\"position\":{\"x\":250,\"y\":500},\"text\":\"3\",\"id\":\"1191a8be50c4c7cd7b1f259b82c04365\"}],\"connections\":[{\"input\":{\"index\":0,\"parent_id\":\"4c19f385dd04884ab84eb27f71011054\"},\"output\":{\"index\":0,\"parent_id\":\"c532ec59ef6b57af6bd7323be2d27d93\"}},{\"input\":{\"index\":1,\"parent_id\":\"4c19f385dd04884ab84eb27f71011054\"},\"output\":{\"index\":0,\"parent_id\":\"1191a8be50c4c7cd7b1f259b82c04365\"}},{\"input\":{\"index\":0,\"parent_id\":\"a3a19afbbc5b944012036668230eb819\"},\"output\":{\"index\":0,\"parent_id\":\"4c19f385dd04884ab84eb27f71011054\"}}]}";

  system_arrow = make_arrow(V(0, 0), V(1, 0));

}).call(this);
