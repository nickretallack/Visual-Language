(function() {
  var Connection, FunctionApplication, Input, Literal, Nib, Node, Output, SubRoutine, addition_program_source, all_subroutines, animate, boxes, camera, connecting_object, connection_view, current_scope, dragging_object, dragging_offset, functions, get_absolute_nib_position, get_nib_position, height, hide_subroutines, how_are_you_source, last, load_implementation, load_program, load_state, load_subroutine, make_arrow, make_basic_program, make_box, make_connection, make_main, make_nib_view, make_node_view, make_subroutine_view, make_text, mouse_coords, mouse_down, mouse_move, mouse_up, node_registry, obj_first, projector, ray_cast_mouse, renderer, scene, system_arrow, update, whitespace_split, width;
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
  boxes = {};
  node_registry = {};
  all_subroutines = {};
  current_scope = null;
  system_arrow = null;
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
    '*': {
      inputs: ['L', 'R'],
      outputs: ['R'],
      definition: function(left, right) {
        return left() * right();
      }
    },
    '/': {
      inputs: ['L', 'R'],
      outputs: ['R'],
      definition: function(left, right) {
        return left() / right();
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
    },
    'split_test': {
      inputs: [],
      outputs: ['L', 'R'],
      definition: function(index) {
        if (index === 0) {
          return 5;
        } else {
          return 10;
        }
      }
    },
    'replace': {
      inputs: ['text', 'rem', 'ins'],
      outputs: ['result'],
      definition: function(text, pattern, replacement) {
        return text().replace(pattern(), replacement());
      }
    },
    'log': {
      inputs: ['in'],
      outputs: ['out'],
      definition: function(input) {
        var value;
        value = input();
        console.log(value);
        return value;
      }
    },
    'int': {
      inputs: ['str'],
      outputs: ['int'],
      definition: function(str) {
        return parseInt(str());
      }
    },
    'float': {
      inputs: ['str'],
      outputs: ['float'],
      definition: function(str) {
        return parseFloat(str());
      }
    },
    'str': {
      inputs: ['obj'],
      outputs: ['float'],
      definition: function(obj) {
        return '' + obj();
      }
    },
    'from json': {
      inputs: ['str'],
      outputs: ['obj'],
      definition: function(str) {
        return JSON.parse(str());
      }
    },
    'to json': {
      inputs: ['obj'],
      outputs: ['str'],
      definition: function(obj) {
        return JSON.stringify(obj());
      }
    }
  };
  /* MODELS */
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
        inputs: inputs
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
    SubRoutine.prototype.run = function(output_index) {
      try {
        return alert(this.invoke(output_index, []));
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
        this.type = 'function';
      } else {
        this.value = information.definition;
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
      var input, input_values, _fn, _i, _len, _ref;
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
        return this.value.apply(this, input_values.concat([output_index]));
      }
    };
    FunctionApplication.prototype.toJSON = function() {
      var json;
      json = FunctionApplication.__super__.toJSON.call(this);
      json.implementation_id = this.type === 'function' ? this.subroutine.id : this.text;
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
      json.value = JSON.stringify(this.value);
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
  make_arrow = function(source, target) {
    var arrow, color, line, line_geometry, line_material;
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
    current_scope.view.add(line);
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
  hide_subroutines = function() {
    var index, subroutine, _results;
    _results = [];
    for (index in all_subroutines) {
      subroutine = all_subroutines[index];
      _results.push(scene.remove(subroutine.view));
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
  window.Controller = function() {
    var field, save_state, save_timer, state;
    field = $("#field");
    field.append(renderer.domElement);
    animate();
    field.mousedown(mouse_down);
    field.mouseup(mouse_up);
    field.mousemove(mouse_move);
    field.bind('contextmenu', function() {
      return false;
    });
    this.literal_text = '';
    this.use_literal = __bind(function() {
      var value;
      value = JSON.parse(this.literal_text);
      new Literal(V(0, 0), this.literal_text, value);
      return this.literal_text = '';
    }, this);
    this.use_builtin = __bind(function(name) {
      return new FunctionApplication(V(0, 0), name, functions[name]);
    }, this);
    this.use_subroutine = __bind(function(subroutine) {
      return new FunctionApplication(V(0, 0), subroutine.name, {
        inputs: subroutine.get_inputs(),
        outputs: subroutine.get_outputs(),
        definition: subroutine
      });
    }, this);
    this.initial_subroutine = {
      name: '',
      inputs: '',
      outputs: ''
    };
    this.new_subroutine = angular.copy(this.initial_subroutine);
    this.edit_subroutine = __bind(function(subroutine) {
      current_scope = subroutine;
      hide_subroutines();
      return scene.add(subroutine.view);
    }, this);
    this.add_subroutine = __bind(function() {
      var inputs, outputs, subroutine;
      inputs = whitespace_split(this.new_subroutine.inputs);
      outputs = whitespace_split(this.new_subroutine.outputs);
      subroutine = new SubRoutine(this.new_subroutine.name, inputs, outputs);
      this.subroutines[subroutine.id] = subroutine;
      return this.new_subroutine = angular.copy(this.initial_subroutine);
    }, this);
    this.export_subroutine = __bind(function(subroutine) {
      return alert(JSON.stringify(subroutine.subroutines_referenced()));
    }, this);
    this.run_subroutine = __bind(function(subroutine, output_index) {
      return subroutine.run(output_index);
    }, this);
    save_state = __bind(function() {
      return localStorage.state = JSON.stringify(state);
    }, this);
    this.library = functions;
    this.subroutines = load_state();
    state = {
      subroutines: this.subroutines
    };
    current_scope = obj_first(this.subroutines);
    system_arrow = make_arrow(V(0, 0), V(1, 0));
    scene.add(current_scope.view);
    return save_timer = setInterval(save_state, 500);
  };
  load_state = function() {
    var data, id, initial_subroutine, subroutine, subroutine_data, subroutines, _ref;
    subroutines = {};
    if (localStorage.state != null) {
      data = JSON.parse(localStorage.state);
      _ref = data.subroutines;
      for (id in _ref) {
        subroutine_data = _ref[id];
        subroutines[id] = load_subroutine(subroutine_data);
      }
      for (id in subroutines) {
        subroutine = subroutines[id];
        current_scope = subroutine;
        load_implementation(data.subroutines[id]);
      }
    } else {
      initial_subroutine = make_main();
      subroutines[initial_subroutine.id] = initial_subroutine;
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
    return current_scope = subroutine = new SubRoutine(data.name, data.inputs, data.outputs, data.id);
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
        information = functions[node.implementation_id];
        name = node.implementation_id;
        new FunctionApplication(position, name, information, node.id);
      } else if (node.type === 'literal') {
        value = JSON.parse(node.value);
        new Literal(position, node.value, value, node.id);
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
  how_are_you_source = "{\"nodes\":[{\"position\":{\"x\":242,\"y\":110,\"z\":0},\"text\":\"out\",\"id\":\"56b9d684188339dafd5d3f0fe9421371\"},{\"position\":{\"x\":243,\"y\":210,\"z\":0},\"text\":\"if\",\"id\":\"3190bcfcc5ece720f07ccde57b12f8a3\"},{\"position\":{\"x\":152,\"y\":315,\"z\":0},\"text\":\"\\\"That's Awesome!\\\"\",\"id\":\"d33ff759bef23100f01c59d525d404d7\"},{\"position\":{\"x\":339,\"y\":316,\"z\":0},\"text\":\"\\\"Oh Well\\\"\",\"id\":\"5d54ff1fa3f1633b31a1ba8c0536f1f0\"},{\"position\":{\"x\":239,\"y\":363,\"z\":0},\"text\":\"=\",\"id\":\"6b8e3e498b936e992c0ceddbbe354635\"},{\"position\":{\"x\":146,\"y\":469,\"z\":0},\"text\":\"\\\"good\\\"\",\"id\":\"3673f98c69da086d30994c91c01fe3f7\"},{\"position\":{\"x\":336,\"y\":472,\"z\":0},\"text\":\"prompt\",\"id\":\"92de68eec528651f75a74492604f5211\"},{\"position\":{\"x\":334,\"y\":598,\"z\":0},\"text\":\"\\\"How are you?\\\"\",\"id\":\"aa4cb4c766117fb44f5a917f1a1f9ba5\"}],\"connections\":[{\"input\":{\"index\":0,\"parent_id\":\"56b9d684188339dafd5d3f0fe9421371\"},\"output\":{\"index\":0,\"parent_id\":\"3190bcfcc5ece720f07ccde57b12f8a3\"}},{\"input\":{\"index\":0,\"parent_id\":\"3190bcfcc5ece720f07ccde57b12f8a3\"},\"output\":{\"index\":0,\"parent_id\":\"d33ff759bef23100f01c59d525d404d7\"}},{\"input\":{\"index\":2,\"parent_id\":\"3190bcfcc5ece720f07ccde57b12f8a3\"},\"output\":{\"index\":0,\"parent_id\":\"5d54ff1fa3f1633b31a1ba8c0536f1f0\"}},{\"input\":{\"index\":1,\"parent_id\":\"3190bcfcc5ece720f07ccde57b12f8a3\"},\"output\":{\"index\":0,\"parent_id\":\"6b8e3e498b936e992c0ceddbbe354635\"}},{\"input\":{\"index\":0,\"parent_id\":\"6b8e3e498b936e992c0ceddbbe354635\"},\"output\":{\"index\":0,\"parent_id\":\"3673f98c69da086d30994c91c01fe3f7\"}},{\"input\":{\"index\":1,\"parent_id\":\"6b8e3e498b936e992c0ceddbbe354635\"},\"output\":{\"index\":0,\"parent_id\":\"92de68eec528651f75a74492604f5211\"}},{\"input\":{\"index\":0,\"parent_id\":\"92de68eec528651f75a74492604f5211\"},\"output\":{\"index\":0,\"parent_id\":\"aa4cb4c766117fb44f5a917f1a1f9ba5\"}}]}";
  addition_program_source = "{\"nodes\":[{\"position\":{\"x\":200,\"y\":100},\"text\":\"out\",\"id\":\"a3a19afbbc5b944012036668230eb819\"},{\"position\":{\"x\":200,\"y\":300},\"text\":\"+\",\"id\":\"4c19f385dd04884ab84eb27f71011054\"},{\"position\":{\"x\":150,\"y\":500},\"text\":\"5\",\"id\":\"c532ec59ef6b57af6bd7323be2d27d93\"},{\"position\":{\"x\":250,\"y\":500},\"text\":\"3\",\"id\":\"1191a8be50c4c7cd7b1f259b82c04365\"}],\"connections\":[{\"input\":{\"index\":0,\"parent_id\":\"4c19f385dd04884ab84eb27f71011054\"},\"output\":{\"index\":0,\"parent_id\":\"c532ec59ef6b57af6bd7323be2d27d93\"}},{\"input\":{\"index\":1,\"parent_id\":\"4c19f385dd04884ab84eb27f71011054\"},\"output\":{\"index\":0,\"parent_id\":\"1191a8be50c4c7cd7b1f259b82c04365\"}},{\"input\":{\"index\":0,\"parent_id\":\"a3a19afbbc5b944012036668230eb819\"},\"output\":{\"index\":0,\"parent_id\":\"4c19f385dd04884ab84eb27f71011054\"}}]}";
  load_state();
}).call(this);
