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

last = (list) -> list[list.length-1]

boxes = {}
node_registry = {}

update = ->
    renderer.render scene, camera

animate = ->
    requestAnimationFrame animate
    update()

current_scope =
    nodes:[]
    connections:[]

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
    '>':
        inputs:['L','R']
        outputs:['R']
        definition: (left, right) -> left() > right()
    '>=':
        inputs:['L','R']
        outputs:['R']
        definition: (left, right) -> left() >= right()

### EVALUATION ###

# TODO: support multiple outputs
evaluate_program = (output) ->
    node = output.node
    if node instanceof Literal
        return node.value
    if node instanceof FunctionApplication
        # collect input values
        input_values = []
        for input in node.inputs
            do (input) ->
                input_values.push ->
                    output = input.connections[0]?.connection.output
                    throw "NotConnected" unless output
                    evaluate_program output
        return node.value.apply null, input_values

program_outputs = []
execute_program = ->
    for node in program_outputs
        try
            output = node.inputs[0].connections[0]?.connection.output
            throw "NotConnected" unless output
            result = evaluate_program output
            console.log result
            alert result
            
        catch exception
            if exception is "NotConnected"
                alert "Your program is not fully connected"
            else throw exception

### MODELS ###

class SubRoutine
    constructor:(@name, information) ->
        @view = make_subroutine_view @
        # These are intentionally reversed.  The inputs to a subroutine show up as outputs inside it
        @inputs = (new Output @, text, index, information.inputs.length-1 for text, index in information.inputs)
        @outputs = (new Input @, text, index, information.outputs.length-1 for text, index in information.outputs)
        @nodes = []
        @connections = []
    
class Node
    constructor: ->
        @view = make_node_view @
        node_registry[@id] = @

    set_position:(@position) ->
        @view.position.copy @position

    get_nibs: ->
        @inputs.concat @outputs

    toJSON: ->
        position:@position
        text:@text
        id:@id

class FunctionApplication extends Node
    constructor:(@position, @text, information, @id=UUID()) ->
        @value = information.definition
        super()
        @inputs = (new Input @, text, index, information.inputs.length-1 for text, index in information.inputs)
        @outputs = (new Output @, text, index, information.outputs.length-1 for text, index in information.outputs)

class Literal extends Node
    constructor:(@position, @text, @value, @id=UUID()) ->
        super()
        @inputs = []
        @outputs = [new Output(@, 'O')]
    
class Nib  # Abstract. Do not instantiate
    constructor: ->
        @view = make_nib_view @, @node instanceof Node
        @connections = []

# TODO: change nib 'node' to parent since it might not be a node
class Input extends Nib
    constructor:(@node, @text, @index=0, @siblings=0) ->
        super()

    _add_connection: (connection, vertex) ->
        # TODO: delete other connections
        @connections = [
            connection:connection
            vertex:vertex
        ]

    connect:(output) ->
        new Connection @ output
        
class Output extends Nib
    constructor:(@node, @text, @index=0, @siblings=0) ->
        super()

    _add_connection: (connection, vertex) ->
        @connections.push
            connection:connection
            vertex:vertex

    connect:(input) ->
        new Connection input, @

class Connection
    constructor:(@input, @output) ->
        [@view, input_vertex, output_vertex] = connection_view @
        @input._add_connection @, input_vertex
        @output._add_connection @, output_vertex

    toJSON: ->
        input:
            index:@input.index
            node_id:@input.node.id
        output:
            index:@output.index
            node_id:@output.node.id

### VIEWS ###

make_subroutine_view = (subroutine) ->
    box_size = V 500,500
    box = make_box subroutine.name, box_size, 10, 0xFFFFFF, V(0,0), true
    box.model = subroutine
    scene.add box
    return box

make_node_view = (node) ->
    main_box_size = V 50,50
    color = 0x888888
    main_box = make_box node.text, main_box_size, 10, color, node.position
    main_box.model = node
    scene.add main_box
    boxes[main_box.id] = main_box
    return main_box

make_nib_view = (nib, is_node) ->
    sub_box_size = V 20,20
    sub_box_color = 0x888888

    parent_size = if is_node then V(60,60) else V(490,490)

    y_offset = parent_size.y / 2.0

    x_position = -parent_size.x / 2.0 + parent_size.x * nib.index/nib.siblings
    y_position = y_offset * if nib instanceof Input then 1 else -1

    sub_box = make_box nib.text, sub_box_size, 5, sub_box_color, V x_position,y_position
    sub_box.model = nib

    parent = nib.node.view
    parent.add sub_box
    return sub_box

connection_view = (connection) ->
    point1 = get_nib_position connection.input.view
    point2 = get_nib_position connection.output.view
    arrow = make_arrow point1, point2
    [arrow, arrow.geometry.vertices[0], arrow.geometry.vertices[1]]
            

### FACTORIES ###

make_node = (text, position=V(250,250), id=undefined) ->
    if (text[0] is last text) and (text[0] in ["'",'"'])
        # it's a string
        value = text[1...text.length-1]
        return new Literal position, text, value, id
    else
        as_number = parseFloat text
        if not isNaN as_number
            # it's a number
            return new Literal position, text, as_number, id
        else if text of functions
            # it's a function
            information = functions[text]
            node = new FunctionApplication position, text, information, id
            program_outputs.push node if text is 'out'
            return node

make_connection = (source, target) ->
    if source.model instanceof Input
        input = source.model
        output = target.model
    else
        input = target.model
        output = source.model
    return new Connection input, output

### CORE RENDERING ###

make_box = (name, size, text_size, color, position, outline=false) ->
    box = new THREE.Object3D()

    geometry = new THREE.PlaneGeometry size.components()...
    material = new THREE.MeshBasicMaterial color:color, wireframe:outline
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

### CORE HELPERS ###

ray_cast_mouse = ->
    mouse = mouse_coords(event).three()
    mouse.z = 1
    forward = new THREE.Vector3 0,0,-1
    ray = new THREE.Ray mouse, forward
    intersections = ray.intersectObjects _.values boxes
    if intersections.length > 0
        (last intersections).object.parent

mouse_coords = (event) ->
    V event.clientX, height-event.clientY
    #V ((event.clientX / window.innerWidth) * 2 - 1), (-(event.clientY / window.innerHeight) * 2 + 1)

get_nib_position = (nib) ->
    Vector.from(nib.position).plus(nib.parent.position).three()

### INTERACTION ###

dragging_object = null
connecting_object = null
dragging_offset = V 0,0

system_arrow = make_arrow V(0,0), V(1,0)
scene.remove system_arrow

mouse_down = (event) ->
    target = ray_cast_mouse()
    if target
        if target.model instanceof Node
            dragging_object = target
        else if target.model instanceof Nib
            system_arrow.geometry.vertices[0].position = system_arrow.geometry.vertices[1].position = get_nib_position target
            scene.add system_arrow
            connecting_object = target

mouse_up = (event) ->
    dragging_object = null

    if connecting_object
        target = ray_cast_mouse()
        if target?.model instanceof Nib
            connection = make_connection connecting_object, target
            current_scope.connections.push connection
        connecting_object = null
        scene.remove system_arrow

mouse_move = (event) ->
    vector = mouse_coords(event).three()
    if dragging_object
        node = dragging_object.model
        node.set_position vector
        for nib in node.get_nibs()
            for connection in nib.connections
                connection.vertex.position.copy get_nib_position nib.view
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
        node = make_node node_name
        current_scope.nodes.push node

    run_button.click (event) ->
        event.preventDefault()
        event.stopPropagation()
        execute_program()

make_basic_program = ->
    out = make_node 'out', V 200,100
    plus = make_node '+', V 200,300
    five = make_node '5', V 150, 500
    three = make_node '3', V 250, 500
    c1 = five.outputs[0].connect plus.inputs[0]
    c2 = three.outputs[0].connect plus.inputs[1]
    c3 = plus.outputs[0].connect out.inputs[0]

    console.log JSON.stringify
        nodes:[out,plus,five,three]
        connections:[c1,c2,c3]

load_basic_program = ->
    program = JSON.parse """{"nodes":[{"position":{"x":200,"y":100},"text":"out","id":"a3a19afbbc5b944012036668230eb819"},{"position":{"x":200,"y":300},"text":"+","id":"4c19f385dd04884ab84eb27f71011054"},{"position":{"x":150,"y":500},"text":"5","id":"c532ec59ef6b57af6bd7323be2d27d93"},{"position":{"x":250,"y":500},"text":"3","id":"1191a8be50c4c7cd7b1f259b82c04365"}],"connections":[{"input":{"index":0,"node_id":"4c19f385dd04884ab84eb27f71011054"},"output":{"index":0,"node_id":"c532ec59ef6b57af6bd7323be2d27d93"}},{"input":{"index":1,"node_id":"4c19f385dd04884ab84eb27f71011054"},"output":{"index":0,"node_id":"1191a8be50c4c7cd7b1f259b82c04365"}},{"input":{"index":0,"node_id":"a3a19afbbc5b944012036668230eb819"},"output":{"index":0,"node_id":"4c19f385dd04884ab84eb27f71011054"}}]}"""

    for node in program.nodes
        make_node node.text, Vector.from(node.position), node.id

    for connection in program.connections
        source_node = node_registry[connection.output.node_id]
        sink_node = node_registry[connection.input.node_id] # todo: node_id
        source_node.outputs[connection.output.index].connect sink_node.inputs[connection.input.index]

load_basic_program()
