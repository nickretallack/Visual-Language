(function() {
  var Connection, FunctionApplication, Input, Literal, Nib, Node, Output, SubRoutine, animate, boxes, camera, connecting_object, connection_view, current_scope, dragging_object, dragging_offset, evaluate_program, execute_program, functions, get_nib_position, height, last, load_basic_program, make_arrow, make_basic_program, make_box, make_connection, make_nib_view, make_node, make_node_view, make_subroutine_view, mouse_coords, mouse_down, mouse_move, mouse_up, node_registry, program_outputs, projector, ray_cast_mouse, renderer, scene, system_arrow, update, width;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  height = window.innerHeight;
  width = window.innerWidth;
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
  update = function() {
    return renderer.render(scene, camera);
  };
  animate = function() {
    requestAnimationFrame(animate);
    return update();
  };
  current_scope = {
    nodes: [],
    connections: []
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
    'out': {
      inputs: ['I'],
      outputs: [],
      definition: function(input) {
        return console.log(input());
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
        return console.log("OH NO!");
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
  /* EVALUATION */
  evaluate_program = function(output) {
    var input, input_values, node, _fn, _i, _len, _ref;
    node = output.node;
    if (node instanceof Literal) {
      return node.value;
    }
    if (node instanceof FunctionApplication) {
      input_values = [];
      _ref = node.inputs;
      _fn = function(input) {
        return input_values.push(function() {
          var _ref2;
          output = (_ref2 = input.connections[0]) != null ? _ref2.connection.output : void 0;
          if (!output) {
            throw "NotConnected";
          }
          return evaluate_program(output);
        });
      };
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        input = _ref[_i];
        _fn(input);
      }
      return node.value.apply(null, input_values);
    }
  };
  program_outputs = [];
  execute_program = function() {
    var node, output, result, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = program_outputs.length; _i < _len; _i++) {
      node = program_outputs[_i];
      _results.push((function() {
        var _ref;
        try {
          output = (_ref = node.inputs[0].connections[0]) != null ? _ref.connection.output : void 0;
          if (!output) {
            throw "NotConnected";
          }
          result = evaluate_program(output);
          console.log(result);
          return alert(result);
        } catch (exception) {
          if (exception === "NotConnected") {
            return alert("Your program is not fully connected");
          } else {
            throw exception;
          }
        }
      })());
    }
    return _results;
  };
  /* MODELS */
  SubRoutine = (function() {
    function SubRoutine(name, information) {
      var index, text;
      this.name = name;
      this.view = make_subroutine_view(this);
      this.inputs = (function() {
        var _len, _ref, _results;
        _ref = information.inputs;
        _results = [];
        for (index = 0, _len = _ref.length; index < _len; index++) {
          text = _ref[index];
          _results.push(new Output(this, text, index, information.inputs.length - 1));
        }
        return _results;
      }).call(this);
      this.outputs = (function() {
        var _len, _ref, _results;
        _ref = information.outputs;
        _results = [];
        for (index = 0, _len = _ref.length; index < _len; index++) {
          text = _ref[index];
          _results.push(new Input(this, text, index, information.outputs.length - 1));
        }
        return _results;
      }).call(this);
      this.nodes = [];
      this.connections = [];
    }
    return SubRoutine;
  })();
  Node = (function() {
    function Node() {
      this.view = make_node_view(this);
      node_registry[this.id] = this;
    }
    Node.prototype.set_position = function(position) {
      this.position = position;
      return this.view.position.copy(this.position);
    };
    Node.prototype.get_nibs = function() {
      return this.inputs.concat(this.outputs);
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
  FunctionApplication = (function() {
    function FunctionApplication(position, text, information, id) {
      var index, text;
      this.position = position;
      this.text = text;
      this.id = id != null ? id : UUID();
      this.value = information.definition;
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
      this.outputs = [new Output(this, 'O')];
    }
    __extends(Literal, Node);
    return Literal;
  })();
  Nib = (function() {
    function Nib() {
      this.view = make_nib_view(this, this.node instanceof Node);
      this.connections = [];
    }
    return Nib;
  })();
  Input = (function() {
    function Input(node, text, index, siblings) {
      this.node = node;
      this.text = text;
      this.index = index != null ? index : 0;
      this.siblings = siblings != null ? siblings : 0;
      Input.__super__.constructor.call(this);
    }
    __extends(Input, Nib);
    Input.prototype._add_connection = function(connection, vertex) {
      return this.connections = [
        {
          connection: connection,
          vertex: vertex
        }
      ];
    };
    Input.prototype.connect = function(output) {
      return new Connection(this(output));
    };
    return Input;
  })();
  Output = (function() {
    function Output(node, text, index, siblings) {
      this.node = node;
      this.text = text;
      this.index = index != null ? index : 0;
      this.siblings = siblings != null ? siblings : 0;
      Output.__super__.constructor.call(this);
    }
    __extends(Output, Nib);
    Output.prototype._add_connection = function(connection, vertex) {
      return this.connections.push({
        connection: connection,
        vertex: vertex
      });
    };
    Output.prototype.connect = function(input) {
      return new Connection(input, this);
    };
    return Output;
  })();
  Connection = (function() {
    function Connection(input, output) {
      var input_vertex, output_vertex, _ref;
      this.input = input;
      this.output = output;
      _ref = connection_view(this), this.view = _ref[0], input_vertex = _ref[1], output_vertex = _ref[2];
      this.input._add_connection(this, input_vertex);
      this.output._add_connection(this, output_vertex);
    }
    Connection.prototype.toJSON = function() {
      return {
        input: {
          index: this.input.index,
          node_id: this.input.node.id
        },
        output: {
          index: this.output.index,
          node_id: this.output.node.id
        }
      };
    };
    return Connection;
  })();
  /* VIEWS */
  make_subroutine_view = function(subroutine) {
    var box, box_size;
    box_size = V(500, 500);
    box = make_box(subroutine.name, box_size, 10, 0xFFFFFF, V(0, 0), true);
    box.model = subroutine;
    scene.add(box);
    return box;
  };
  make_node_view = function(node) {
    var color, main_box, main_box_size;
    main_box_size = V(50, 50);
    color = 0x888888;
    main_box = make_box(node.text, main_box_size, 10, color, node.position);
    main_box.model = node;
    scene.add(main_box);
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
    y_position = y_offset * (nib instanceof Input ? 1 : -1);
    sub_box = make_box(nib.text, sub_box_size, 5, sub_box_color, V(x_position, y_position));
    sub_box.model = nib;
    parent = nib.node.view;
    parent.add(sub_box);
    return sub_box;
  };
  connection_view = function(connection) {
    var arrow, point1, point2;
    point1 = get_nib_position(connection.input.view);
    point2 = get_nib_position(connection.output.view);
    arrow = make_arrow(point1, point2);
    return [arrow, arrow.geometry.vertices[0], arrow.geometry.vertices[1]];
  };
  /* FACTORIES */
  make_node = function(text, position, id) {
    var as_number, information, node, value, _ref;
    if (position == null) {
      position = V(250, 250);
    }
    if (id == null) {
      id = void 0;
    }
    if ((text[0] === last(text)) && ((_ref = text[0]) === "'" || _ref === '"')) {
      value = text.slice(1, text.length - 1);
      return new Literal(position, text, value, id);
    } else {
      as_number = parseFloat(text);
      if (!isNaN(as_number)) {
        return new Literal(position, text, as_number, id);
      } else if (text in functions) {
        information = functions[text];
        node = new FunctionApplication(position, text, information, id);
        if (text === 'out') {
          program_outputs.push(node);
        }
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
  /* CORE RENDERING */
  make_box = function(name, size, text_size, color, position, outline) {
    var box, centerOffset, geometry, material, mesh, text, text_color, text_geometry;
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
    text_geometry = new THREE.TextGeometry(name, {
      size: text_size,
      font: 'helvetiker',
      curveSegments: 2
    });
    text_geometry.computeBoundingBox();
    centerOffset = -0.5 * (text_geometry.boundingBox.x[1] - text_geometry.boundingBox.x[0]);
    text_color = new THREE.MeshBasicMaterial({
      color: 0x000000,
      overdraw: true
    });
    text = new THREE.Mesh(text_geometry, text_color);
    text.position.x = centerOffset;
    box.position = position.three();
    box.add(text);
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
      lineWidth: 1
    });
    line_geometry.vertices.push(new THREE.Vertex(source));
    line_geometry.vertices.push(new THREE.Vertex(target));
    line = new THREE.Line(line_geometry, line_material);
    scene.add(line);
    return line;
  };
  /* CORE HELPERS */
  ray_cast_mouse = function() {
    var forward, intersections, mouse, ray;
    mouse = mouse_coords(event).three();
    mouse.z = 1;
    forward = new THREE.Vector3(0, 0, -1);
    ray = new THREE.Ray(mouse, forward);
    intersections = ray.intersectObjects(_.values(boxes));
    if (intersections.length > 0) {
      return (last(intersections)).object.parent;
    }
  };
  mouse_coords = function(event) {
    return V(event.clientX, height - event.clientY);
  };
  get_nib_position = function(nib) {
    return Vector.from(nib.position).plus(nib.parent.position).three();
  };
  /* INTERACTION */
  dragging_object = null;
  connecting_object = null;
  dragging_offset = V(0, 0);
  system_arrow = make_arrow(V(0, 0), V(1, 0));
  scene.remove(system_arrow);
  mouse_down = function(event) {
    var target;
    target = ray_cast_mouse();
    if (target) {
      if (target.model instanceof Node) {
        return dragging_object = target;
      } else if (target.model instanceof Nib) {
        system_arrow.geometry.vertices[0].position = system_arrow.geometry.vertices[1].position = get_nib_position(target);
        scene.add(system_arrow);
        return connecting_object = target;
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
        current_scope.connections.push(connection);
      }
      connecting_object = null;
      return scene.remove(system_arrow);
    }
  };
  mouse_move = function(event) {
    var connection, nib, node, vector, _i, _j, _len, _len2, _ref, _ref2;
    vector = mouse_coords(event).three();
    if (dragging_object) {
      node = dragging_object.model;
      node.set_position(vector);
      _ref = node.get_nibs();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        nib = _ref[_i];
        _ref2 = nib.connections;
        for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
          connection = _ref2[_j];
          connection.vertex.position.copy(get_nib_position(nib.view));
        }
      }
    }
    if (connecting_object) {
      return system_arrow.geometry.vertices[1].position = vector;
    }
  };
  $(function() {
    var field, node_form, node_input, run_button;
    field = $("#field");
    node_form = $('#add_node');
    node_input = $('#node_name');
    run_button = $('#run_button');
    field.append(renderer.domElement);
    animate();
    field.mousedown(mouse_down);
    field.mouseup(mouse_up);
    field.mousemove(mouse_move);
    node_form.submit(function(event) {
      var node, node_name;
      event.preventDefault();
      node_name = node_input.val();
      node_input.val('');
      node = make_node(node_name);
      return current_scope.nodes.push(node);
    });
    return run_button.click(function(event) {
      event.preventDefault();
      event.stopPropagation();
      return execute_program();
    });
  });
  make_basic_program = function() {
    var c1, c2, c3, five, out, plus, three;
    out = make_node('out', V(200, 100));
    plus = make_node('+', V(200, 300));
    five = make_node('5', V(150, 500));
    three = make_node('3', V(250, 500));
    c1 = five.outputs[0].connect(plus.inputs[0]);
    c2 = three.outputs[0].connect(plus.inputs[1]);
    c3 = plus.outputs[0].connect(out.inputs[0]);
    return console.log(JSON.stringify({
      nodes: [out, plus, five, three],
      connections: [c1, c2, c3]
    }));
  };
  load_basic_program = function() {
    var connection, node, program, sink_node, source_node, _i, _j, _len, _len2, _ref, _ref2, _results;
    program = JSON.parse("{\"nodes\":[{\"position\":{\"x\":200,\"y\":100},\"text\":\"out\",\"id\":\"a3a19afbbc5b944012036668230eb819\"},{\"position\":{\"x\":200,\"y\":300},\"text\":\"+\",\"id\":\"4c19f385dd04884ab84eb27f71011054\"},{\"position\":{\"x\":150,\"y\":500},\"text\":\"5\",\"id\":\"c532ec59ef6b57af6bd7323be2d27d93\"},{\"position\":{\"x\":250,\"y\":500},\"text\":\"3\",\"id\":\"1191a8be50c4c7cd7b1f259b82c04365\"}],\"connections\":[{\"input\":{\"index\":0,\"node_id\":\"4c19f385dd04884ab84eb27f71011054\"},\"output\":{\"index\":0,\"node_id\":\"c532ec59ef6b57af6bd7323be2d27d93\"}},{\"input\":{\"index\":1,\"node_id\":\"4c19f385dd04884ab84eb27f71011054\"},\"output\":{\"index\":0,\"node_id\":\"1191a8be50c4c7cd7b1f259b82c04365\"}},{\"input\":{\"index\":0,\"node_id\":\"a3a19afbbc5b944012036668230eb819\"},\"output\":{\"index\":0,\"node_id\":\"4c19f385dd04884ab84eb27f71011054\"}}]}");
    _ref = program.nodes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      node = _ref[_i];
      make_node(node.text, Vector.from(node.position), node.id);
    }
    _ref2 = program.connections;
    _results = [];
    for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
      connection = _ref2[_j];
      source_node = node_registry[connection.output.node_id];
      sink_node = node_registry[connection.input.node_id];
      _results.push(source_node.outputs[connection.output.index].connect(sink_node.inputs[connection.input.index]));
    }
    return _results;
  };
  load_basic_program();
}).call(this);
