#camera_radius = 250
height = window.innerHeight
width = window.innerWidth
camera = new THREE.OrthographicCamera 0, width, height, 0, -2000, 1000
#camera = new THREE.OrthographicCamera -camera_radius, camera_radius,
#     camera_radius, -camera_radius, -camera_radius, camera_radius
scene = new THREE.Scene()
scene.add camera
renderer = new THREE.CanvasRenderer()
renderer.setSize width, height #window.innerWidth, window.innerHeight
projector = new THREE.Projector()
objects = []

update = ->
    renderer.render scene, camera

animate = ->
    requestAnimationFrame animate
    update()

make_box = ->
    size = V 100,100
    color = 0x888888
    position = V 250,250

    object = new THREE.Object3D()

    geometry = new THREE.PlaneGeometry size.components()...
    material = new THREE.MeshBasicMaterial color:color
    mesh = new THREE.Mesh geometry, material
    object.add mesh

    text_geometry = new THREE.TextGeometry "Text",
        size:20
        font:'helvetiker'
        curveSegments:2
    text_geometry.computeBoundingBox()
    centerOffset = -0.5 * (text_geometry.boundingBox.x[1] - text_geometry.boundingBox.x[0])

    text_color = new THREE.MeshBasicMaterial color:0x000000, overdraw:true
    text = new THREE.Mesh text_geometry, text_color
    #text.position = position.three()
    text.position.x = centerOffset
    object.position = position.three()
    object.add text
    scene.add object
    objects.push object


make_box()

mouse_coords = (event) ->
    V event.clientX, height-event.clientY
    #V ((event.clientX / window.innerWidth) * 2 - 1), (-(event.clientY / window.innerHeight) * 2 + 1)

dragging_object = null
dragging_offset = V 0,0
mouse_up = (event) ->
    dragging_object = null
mouse_down = (event) ->
    mouse = mouse_coords(event).three()
    mouse.z = 1
    forward = new THREE.Vector3 0,0,-1
    ray = new THREE.Ray mouse, forward
    intersections = ray.intersectObjects objects
    if intersections.length > 0
        dragging_object = intersections[0].object.parent
        #dragging_offset = 
    #objects[0].position.copy mouse.three()


mouse_move = (event) ->
    if dragging_object
        vector = mouse_coords(event).three()
        dragging_object.position.copy vector
    


$ ->
    field = $("#field")
    field.append renderer.domElement
    animate()
    field.mousedown mouse_down
    field.mouseup mouse_up
    field.mousemove mouse_move

    #field.addEventListener 'mousedown', mouse_down, false
    #field.addEventListener 'mouseup', mouse_up, false
    #field.addEventListener 'mousemove', mouse_move, false

    field.click (event) ->
