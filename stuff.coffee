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
        definition: (left, right) -> left() + right()
    '-':
        inputs:['L','R']
        outputs:['R']
        definition: (left, right) -> left() - right()
    'out':
        inputs:['I']
        outputs:[]
        definition: (input) -> console.log input()
    'if':
        inputs:['T','C','F']
        outputs:['R']
        definition: (true_result, condition, false_result) -> if condition() then true_result() else false_result()
    'die':
        inputs:[]
        outputs:['R']
        definition: -> console.log "OH NO!"
    'prompt':
        inputs:['M']
        outputs:['R']
        definition: (message) -> prompt message()
    '=':
        inputs:['L','R']
        outputs:['R']
        definition: (left, right) -> left() is right()
        

last = (list) -> list[list.length-1]

evaluate_program = (nib) ->
    data = nib.parent.data
    if data.data_type is 'literal'
        return data.value
    if data.data_type is 'function'
        # collect input values
        input_values = []
        for input in data.inputs# input.data.connections[0].nib
            do (input) ->
                input_values.push ->
                    nib = input.data.connections[0]?.nib
                    throw "NotConnected" unless nib
                    evaluate_program nib
        return data.value.apply null, input_values
            


program_outputs = []
execute_program = ->
    for output_function in program_outputs
        try
            nib = output_function.data.inputs[0].data.connections[0]?.nib
            throw "NotConnected" unless nib
            result = evaluate_program nib
            console.log result
            alert result
            
        catch exception
            if exception is "NotConnected"
                alert "Your program is not fully connected"
            else throw exception
            
    

make_node = (name, location=V(250,250)) ->
    if (name[0] is last name) and (name[0] in ["'",'"'])
        # it's a string
        make_top_box location, 'literal', name, name[1...name.length-1], [], 'R'
    else
        as_number = parseFloat name
        if not isNaN as_number
            # it's a number
            make_top_box location, 'literal', name, as_number, [], 'R'
        else if name of functions
            # it's a function
            information = functions[name]
            box = make_top_box location, 'function', name, information.definition, information['inputs'], information['outputs']
            program_outputs.push box if name is 'out'
            

make_nibs = (parent, list, type, y_position) ->
    sub_box_size = V 20,20
    sub_box_color = 0x888888
    if list
        for item, index in list
            x_position = -20 + 40* (index/(list.length-1))
            sub_box = make_box item, sub_box_size, 5, sub_box_color, V x_position,y_position
            parent.add sub_box
            parent.data["#{type}s"].push sub_box
            parent.data.nibs.push sub_box
            #input_nodes[sub_box.id] = sub_box

            sub_box.data =
                type:type
                connections:[]

make_top_box = (position, data_type, name, value, inputs, outputs) ->
    main_box_size = V 50,50
    color = 0x888888
    main_box = make_box name, main_box_size, 10, color, position
    main_box.data =
        type:'box'
        data_type:data_type
        value:value
        inputs:[]
        outputs:[]
        nibs:[]

    make_nibs main_box, inputs, 'input', +20
    make_nibs main_box, outputs, 'output', -20

    scene.add main_box
    boxes[main_box.id] = main_box

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
    color = 0x888888

    source = source.three() if 'three' of source
    target = target.three() if 'three' of target

    line_geometry = new THREE.Geometry()
    line_material = new THREE.LineBasicMaterial color: color, lineWidth: 1
    line_geometry.vertices.push new THREE.Vertex source
    line_geometry.vertices.push new THREE.Vertex target
    line = new THREE.Line line_geometry, line_material
    scene.add line
    return line

    arrow.add line
    return arrow

    # TODO: make a triangle at the end of the line
    #scene.add(line); 

system_arrow = make_arrow V(0,0), V(1,0)
scene.remove system_arrow

make_node 'out', V 200,100

mouse_coords = (event) ->
    V event.clientX, height-event.clientY
    #V ((event.clientX / window.innerWidth) * 2 - 1), (-(event.clientY / window.innerHeight) * 2 + 1)

dragging_object = null
connecting_object = null

dragging_offset = V 0,0

mouse_up = (event) ->
    dragging_object = null

    if connecting_object
        target = ray_cast_mouse()
        if target?.data.type is 'input' or target?.data.type is 'output'
            make_connection connecting_object, target
        connecting_object = null
        scene.remove system_arrow

make_connection = (source, target) ->
    arrow = make_arrow get_nib_position(source), get_nib_position(target)

    ###
    # don't allow double-connections at an input
    input = if source.data.type is 'input' then source else target
    if input.data.connections.length
        connection = input.data.connections[0]
        scene.remove connection.arrow
        input.data.connections = []
        # NOTE: leaves the hanging source connection =[
        # NOTE: oh shit we don't really have a handle on the object.  Just a vertex.
    ###

    source.data.connections.push
        nib:target
        arrow:arrow.geometry.vertices[0]
    target.data.connections.push
        nib:source
        arrow:arrow.geometry.vertices[1]

    


ray_cast_mouse = ->
    mouse = mouse_coords(event).three()
    mouse.z = 1
    forward = new THREE.Vector3 0,0,-1
    ray = new THREE.Ray mouse, forward
    intersections = ray.intersectObjects _.values boxes
    if intersections.length > 0
        (last intersections).object.parent

get_nib_position = (nib) ->
    Vector.from(nib.position).plus(nib.parent.position).three()
    

mouse_down = (event) ->
    target = ray_cast_mouse()
    if target
        if target.data.type is 'box'
            dragging_object = target
        else if target.data.type is 'input' or target.data.type is 'output'
            system_arrow.geometry.vertices[0].position = system_arrow.geometry.vertices[1].position = get_nib_position target
            scene.add system_arrow
            connecting_object = target


mouse_move = (event) ->
    vector = mouse_coords(event).three()
    if dragging_object
        dragging_object.position.copy vector
        for nib in dragging_object.data.nibs
            for connection in nib.data.connections
                connection.arrow.position.copy get_nib_position nib
    if connecting_object
        system_arrow.geometry.vertices[1].position = vector

$ ->
    field = $("#field")
    node_form = $('#add_node')
    node_input = $('#node_name')
    run_button = $('#run_button')

    field.append renderer.domElement
    animate()
    field.mousedown mouse_down
    field.mouseup mouse_up
    field.mousemove mouse_move

    node_form.submit (event) ->
        event.preventDefault()
        node_name = node_input.val()
        node_input.val ''
        make_node node_name

    run_button.click (event) ->
        event.preventDefault()
        event.stopPropagation()
        execute_program()

    #field.addEventListener 'mousedown', mouse_down, false
    #field.addEventListener 'mouseup', mouse_up, false
    #field.addEventListener 'mousemove', mouse_move, false

    field.click (event) ->
