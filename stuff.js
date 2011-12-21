(function() {
  var animate, camera, dragging_object, dragging_offset, height, make_box, mouse_coords, mouse_down, mouse_move, mouse_up, objects, projector, renderer, scene, update, width;
  height = window.innerHeight;
  width = window.innerWidth;
  camera = new THREE.OrthographicCamera(0, width, height, 0, -2000, 1000);
  scene = new THREE.Scene();
  scene.add(camera);
  renderer = new THREE.CanvasRenderer();
  renderer.setSize(width, height);
  projector = new THREE.Projector();
  objects = [];
  update = function() {
    return renderer.render(scene, camera);
  };
  animate = function() {
    requestAnimationFrame(animate);
    return update();
  };
  make_box = function() {
    var centerOffset, color, geometry, material, mesh, object, position, size, text, text_color, text_geometry;
    size = V(100, 100);
    color = 0x888888;
    position = V(250, 250);
    object = new THREE.Object3D();
    geometry = (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return typeof result === "object" ? result : child;
    })(THREE.PlaneGeometry, size.components(), function() {});
    material = new THREE.MeshBasicMaterial({
      color: color
    });
    mesh = new THREE.Mesh(geometry, material);
    object.add(mesh);
    text_geometry = new THREE.TextGeometry("Text", {
      size: 20,
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
    object.position = position.three();
    object.add(text);
    scene.add(object);
    return objects.push(object);
  };
  make_box();
  mouse_coords = function(event) {
    return V(event.clientX, height - event.clientY);
  };
  dragging_object = null;
  dragging_offset = V(0, 0);
  mouse_up = function(event) {
    return dragging_object = null;
  };
  mouse_down = function(event) {
    var forward, intersections, mouse, ray;
    mouse = mouse_coords(event).three();
    mouse.z = 1;
    forward = new THREE.Vector3(0, 0, -1);
    ray = new THREE.Ray(mouse, forward);
    intersections = ray.intersectObjects(objects);
    if (intersections.length > 0) {
      return dragging_object = intersections[0].object.parent;
    }
  };
  mouse_move = function(event) {
    var vector;
    if (dragging_object) {
      vector = mouse_coords(event).three();
      return dragging_object.position.copy(vector);
    }
  };
  $(function() {
    var field;
    field = $("#field");
    field.append(renderer.domElement);
    animate();
    field.mousedown(mouse_down);
    field.mouseup(mouse_up);
    field.mousemove(mouse_move);
    return field.click(function(event) {});
  });
}).call(this);
