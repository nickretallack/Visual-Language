(function() {
  var animate, boxes, camera, connecting_object, dragging_object, dragging_offset, evaluate_program, execute_program, functions, get_nib_position, height, input_nodes, last, make_arrow, make_box, make_connection, make_function, make_nibs, make_top_box, mouse_coords, mouse_down, mouse_move, mouse_up, output_nodes, program_outputs, projector, ray_cast_mouse, renderer, scene, system_arrow, update, width;
  height = window.innerHeight;
  width = window.innerWidth;
  camera = new THREE.OrthographicCamera(0, width, height, 0, -2000, 1000);
  scene = new THREE.Scene();
  scene.add(camera);
  renderer = new THREE.CanvasRenderer();
  renderer.setSize(width, height);
  projector = new THREE.Projector();
  boxes = {};
  input_nodes = {};
  output_nodes = {};
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
    }
  };
  last = function(list) {
    return list[list.length - 1];
  };
  evaluate_program = function(nib) {
    var data, input, input_values, _fn, _i, _len, _ref;
    data = nib.parent.data;
    if (data.data_type === 'literal') {
      return data.value;
    }
    if (data.data_type === 'function') {
      input_values = [];
      _ref = data.inputs;
      _fn = function(nib) {
        return input_values.push(function() {
          return evaluate_program(nib);
        });
      };
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        input = _ref[_i];
        nib = input.data.connections[0].nib;
        _fn(nib);
      }
      return data.value.apply(null, input_values);
    }
  };
  program_outputs = [];
  execute_program = function() {
    var output_function, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = program_outputs.length; _i < _len; _i++) {
      output_function = program_outputs[_i];
      _results.push(console.log(evaluate_program(output_function.data.inputs[0].data.connections[0].nib)));
    }
    return _results;
  };
  make_function = function(name, location) {
    var as_number, box, information, _ref;
    if (location == null) {
      location = V(250, 250);
    }
    if ((name[0] === last(name)) && ((_ref = name[0]) === "'" || _ref === '"')) {
      return make_top_box(location, 'literal', name, name, [], 'R');
    } else {
      as_number = parseFloat(name);
      if (!isNaN(as_number)) {
        return make_top_box(location, 'literal', name, as_number, [], 'R');
      } else if (name in functions) {
        information = functions[name];
        box = make_top_box(location, 'function', name, information.definition, information['inputs'], information['outputs']);
        if (name === 'out') {
          return program_outputs.push(box);
        }
      }
    }
  };
  make_nibs = function(parent, list, type, y_position) {
    var index, item, sub_box, sub_box_color, sub_box_size, x_position, _len, _results;
    sub_box_size = V(20, 20);
    sub_box_color = 0x888888;
    if (list) {
      _results = [];
      for (index = 0, _len = list.length; index < _len; index++) {
        item = list[index];
        x_position = -20 + 40 * (index / (list.length - 1));
        sub_box = make_box(item, sub_box_size, 5, sub_box_color, V(x_position, y_position));
        parent.add(sub_box);
        parent.data["" + type + "s"].push(sub_box);
        parent.data.nibs.push(sub_box);
        _results.push(sub_box.data = {
          type: type,
          connections: []
        });
      }
      return _results;
    }
  };
  make_top_box = function(position, data_type, name, value, inputs, outputs) {
    var color, main_box, main_box_size;
    main_box_size = V(50, 50);
    color = 0x888888;
    main_box = make_box(name, main_box_size, 10, color, position);
    main_box.data = {
      type: 'box',
      data_type: data_type,
      value: value,
      inputs: [],
      outputs: [],
      nibs: []
    };
    make_nibs(main_box, inputs, 'input', +20);
    make_nibs(main_box, outputs, 'output', -20);
    scene.add(main_box);
    return boxes[main_box.id] = main_box;
  };
  make_box = function(name, size, text_size, color, position) {
    var box, centerOffset, geometry, material, mesh, text, text_color, text_geometry;
    box = new THREE.Object3D();
    geometry = (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return typeof result === "object" ? result : child;
    })(THREE.PlaneGeometry, size.components(), function() {});
    material = new THREE.MeshBasicMaterial({
      color: color
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
    arrow.add(line);
    return arrow;
  };
  system_arrow = make_arrow(V(0, 0), V(1, 0));
  scene.remove(system_arrow);
  make_function('5', V(150, 500));
  make_function('3', V(250, 500));
  make_function('+', V(200, 300));
  make_function('out', V(200, 100));
  mouse_coords = function(event) {
    return V(event.clientX, height - event.clientY);
  };
  dragging_object = null;
  connecting_object = null;
  dragging_offset = V(0, 0);
  mouse_up = function(event) {
    var target;
    dragging_object = null;
    if (connecting_object) {
      target = ray_cast_mouse();
      if ((target != null ? target.data.type : void 0) === 'input' || (target != null ? target.data.type : void 0) === 'output') {
        make_connection(connecting_object, target);
      }
      connecting_object = null;
      return scene.remove(system_arrow);
    }
  };
  make_connection = function(source, target) {
    var arrow;
    arrow = make_arrow(get_nib_position(source), get_nib_position(target));
    source.data.connections.push({
      nib: target,
      arrow: arrow.geometry.vertices[0]
    });
    return target.data.connections.push({
      nib: source,
      arrow: arrow.geometry.vertices[1]
    });
  };
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
  get_nib_position = function(nib) {
    return Vector.from(nib.position).plus(nib.parent.position).three();
  };
  mouse_down = function(event) {
    var target;
    target = ray_cast_mouse();
    if (target) {
      if (target.data.type === 'box') {
        return dragging_object = target;
      } else if (target.data.type === 'input' || target.data.type === 'output') {
        system_arrow.geometry.vertices[0].position = system_arrow.geometry.vertices[1].position = get_nib_position(target);
        scene.add(system_arrow);
        return connecting_object = target;
      }
    }
  };
  mouse_move = function(event) {
    var connection, nib, vector, _i, _j, _len, _len2, _ref, _ref2;
    vector = mouse_coords(event).three();
    if (dragging_object) {
      dragging_object.position.copy(vector);
      _ref = dragging_object.data.nibs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        nib = _ref[_i];
        _ref2 = nib.data.connections;
        for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
          connection = _ref2[_j];
          connection.arrow.position.copy(get_nib_position(nib));
        }
      }
    }
    if (connecting_object) {
      return system_arrow.geometry.vertices[1].position = vector;
    }
  };
  $(function() {
    var field, function_form, function_input, run_button;
    field = $("#field");
    function_form = $('#add_function');
    function_input = $('#function_name');
    run_button = $('#run_button');
    field.append(renderer.domElement);
    animate();
    field.mousedown(mouse_down);
    field.mouseup(mouse_up);
    field.mousemove(mouse_move);
    function_form.submit(function(event) {
      var function_name;
      event.preventDefault();
      function_name = function_input.val();
      function_input.val('');
      return make_function(function_name);
    });
    run_button.click(function(event) {
      event.preventDefault();
      event.stopPropagation();
      return execute_program();
    });
    return field.click(function(event) {});
  });
}).call(this);
