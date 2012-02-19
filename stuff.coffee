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

boxes = {}
input_nodes = {}
output_nodes = {}

update = ->
    renderer.render scene, camera

animate = ->
    requestAnimationFrame animate
    update()


functions =
    '+':
        inputs:['L','R']
        outputs:['R']
        definition: (left, right) -> left + right

last = (list) -> list[list.length-1]

make_function = (name) ->
    if (name[0] is last name) and (name[0] in ["'",'"'])
        # it's a string
        make_top_box name, [], 'R'
    else
        as_number = parseFloat name
        if not isNaN as_number
            # it's a number
            make_top_box name, [], 'R'
        else if name of functions
            # it's a function
            information = functions[name]
            make_top_box name, information['inputs'], information['outputs']
            

make_nibs = (parent, list, type, y_position) ->
    sub_box_size = V 20,20
    sub_box_color = 0x888888
    if list
        for item, index in list
            x_position = -20 + 40* (index/(list.length-1))
            sub_box = make_box item, sub_box_size, 5, sub_box_color, V x_position,y_position
            parent.add sub_box
            #input_nodes[sub_box.id] = sub_box

            sub_box.data =
                type:type

make_top_box = (name, inputs, outputs) ->
    main_box_size = V 50,50
    color = 0x888888
    position = V 250,250
    main_box = make_box name, main_box_size, 10, color, position

    make_nibs main_box, inputs, 'input', +20
    make_nibs main_box, outputs, 'output', -20

    scene.add main_box
    boxes[main_box.id] = main_box
    main_box.data =
        type:'box'

make_box = (name, size, text_size, color, position) ->
    box = new THREE.Object3D()

    geometry = new THREE.PlaneGeometry size.components()...
    material = new THREE.MeshBasicMaterial color:color
    mesh = new THREE.Mesh geometry, material
    mesh.position = V(0,0).three()
    box.add mesh

    text_geometry = new THREE.TextGeometry name,
        size:text_size
        font:'helvetiker'
        curveSegments:2
    text_geometry.computeBoundingBox()
    centerOffset = -0.5 * (text_geometry.boundingBox.x[1] - text_geometry.boundingBox.x[0])

    text_color = new THREE.MeshBasicMaterial color:0x000000, overdraw:true
    text = new THREE.Mesh text_geometry, text_color
    #text.position = position.three()
    text.position.x = centerOffset
    box.position = position.three()
    box.add text
    return box

make_arrow = (source, target) ->
    arrow = new THREE.Object3D()

    line_geometry = new THREE.Geometry()
    line_material = new THREE.LineBasicMaterial() # color: color, lineWidth: 1
    line_geometry.vertices.push source, target
    line = new THREE.Line line_geometry, line_material

    arrow.add line
    return arrow

    # TODO: make a triangle at the end of the line
    #scene.add(line); 


make_function '+'

mouse_coords = (event) ->
    V event.clientX, height-event.clientY
    #V ((event.clientX / window.innerWidth) * 2 - 1), (-(event.clientY / window.innerHeight) * 2 + 1)

dragging_object = null
arrow_source = null
arrow_object = null

dragging_offset = V 0,0

mouse_up = (event) ->
    dragging_object = null

    if arrow_source
        arrow_target = ray_cast_mouse()
        if arrow_source
            make_connection arrow_source, arrow_target
        arrow_source = null

make_connection = (source, target) ->

ray_cast_mouse = ->
    mouse = mouse_coords(event).three()
    mouse.z = 1
    forward = new THREE.Vector3 0,0,-1
    ray = new THREE.Ray mouse, forward
    intersections = ray.intersectObjects _.values boxes
    if intersections.length > 0
        (last intersections).object.parent

mouse_down = (event) ->
    target = ray_cast_mouse()
    console.log target
    if target
        if target.data.type is 'box'
            dragging_object = target
        else if target.data.type is 'input'
            arrow_source = target


mouse_move = (event) ->
    vector = mouse_coords(event).three()
    if dragging_object
        dragging_object.position.copy vector
    #if arrow_source
        
    


$ ->
    field = $("#field")
    function_form = $('#add_function')
    function_input = $('#function_name')

    field.append renderer.domElement
    animate()
    field.mousedown mouse_down
    field.mouseup mouse_up
    field.mousemove mouse_move

    function_form.submit (event) ->
        event.preventDefault()
        function_name = function_input.val()
        function_input.val ''
        make_function function_name

    #field.addEventListener 'mousedown', mouse_down, false
    #field.addEventListener 'mouseup', mouse_up, false
    #field.addEventListener 'mousemove', mouse_move, false

    field.click (event) ->
