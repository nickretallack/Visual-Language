(function() {
  var animate, arrow_object, arrow_source, boxes, camera, dragging_object, dragging_offset, functions, height, input_nodes, last, make_arrow, make_box, make_connection, make_function, make_nibs, make_top_box, mouse_coords, mouse_down, mouse_move, mouse_up, output_nodes, projector, ray_cast_mouse, renderer, scene, update, width;
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
        return left + right;
      }
    }
  };
  last = function(list) {
    return list[list.length - 1];
  };
  make_function = function(name, location) {
    var as_number, information, _ref;
    if (location == null) {
      location = V(250, 250);
    }
    if ((name[0] === last(name)) && ((_ref = name[0]) === "'" || _ref === '"')) {
      return make_top_box(name, location, [], 'R');
    } else {
      as_number = parseFloat(name);
      if (!isNaN(as_number)) {
        return make_top_box(name, location, [], 'R');
      } else if (name in functions) {
        information = functions[name];
        return make_top_box(name, location, information['inputs'], information['outputs']);
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
        _results.push(sub_box.data = {
          type: type
        });
      }
      return _results;
    }
  };
  make_top_box = function(name, position, inputs, outputs) {
    var color, main_box, main_box_size;
    main_box_size = V(50, 50);
    color = 0x888888;
    main_box = make_box(name, main_box_size, 10, color, position);
    make_nibs(main_box, inputs, 'input', +20);
    make_nibs(main_box, outputs, 'output', -20);
    scene.add(main_box);
    boxes[main_box.id] = main_box;
    return main_box.data = {
      type: 'box'
    };
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
    var arrow, line, line_geometry, line_material;
    arrow = new THREE.Object3D();
    line_geometry = new THREE.Geometry();
    line_material = new THREE.LineBasicMaterial();
    line_geometry.vertices.push(source, target);
    line = new THREE.Line(line_geometry, line_material);
    arrow.add(line);
    return arrow;
  };
  make_function('5', V(150, 500));
  make_function('3', V(250, 500));
  make_function('+', V(200, 300));
  mouse_coords = function(event) {
    return V(event.clientX, height - event.clientY);
  };
  dragging_object = null;
  arrow_source = null;
  arrow_object = null;
  dragging_offset = V(0, 0);
  mouse_up = function(event) {
    var arrow_target;
    dragging_object = null;
    if (arrow_source) {
      arrow_target = ray_cast_mouse();
      if (arrow_source) {
        make_connection(arrow_source, arrow_target);
      }
      return arrow_source = null;
    }
  };
  make_connection = function(source, target) {};
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
  mouse_down = function(event) {
    var target;
    target = ray_cast_mouse();
    console.log(target);
    if (target) {
      if (target.data.type === 'box') {
        return dragging_object = target;
      } else if (target.data.type === 'input') {
        return arrow_source = target;
      }
    }
  };
  mouse_move = function(event) {
    var vector;
    vector = mouse_coords(event).three();
    if (dragging_object) {
      return dragging_object.position.copy(vector);
    }
  };
  $(function() {
    var field, function_form, function_input;
    field = $("#field");
    function_form = $('#add_function');
    function_input = $('#function_name');
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
    return field.click(function(event) {});
  });
}).call(this);
