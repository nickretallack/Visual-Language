#camera_radius = 250
height = 500 #window.innerHeight
width = 500 #window.innerWidth
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

functions =
    '+':
        inputs:['L','R']
        outputs:['R']
        definition: (left, right) -> left() + right()
    '-':
        inputs:['L','R']
        outputs:['R']
        definition: (left, right) -> left() - right()
    'if':
        inputs:['T','C','F']
        outputs:['R']
        definition: (true_result, condition, false_result) -> if condition() then true_result() else false_result()
    'die':
        inputs:[]
        outputs:['R']
        definition: -> throw "Exit"
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
    parent = output.parent
    if parent instanceof Literal
        return parent.value
    if parent instanceof FunctionApplication
        # collect input values
        input_values = []
        for input in parent.inputs
            do (input) ->
                input_values.push ->
                    output = input.get_connection()?.connection.output
                    throw "NotConnected" unless output
                    evaluate_program output
        return parent.value.apply null, input_values

program_outputs = []
execute_program = ->
    try
        output = main.outputs[0].get_connection()?.connection.output
        throw "NotConnected" unless output
        result = evaluate_program output
        console.log result
        alert result
        
    catch exception
        if exception is "NotConnected"
            alert "Your program is not fully connected"
        else if exception is "Exit"
            alert "Died"
        else throw exception

### MODELS ###

class SubRoutine
    constructor:(@name='', inputs=[], outputs=[], @id=UUID()) ->
        node_registry[@id] = @
        @view = make_subroutine_view @
        # These are intentionally reversed.  The inputs to a subroutine show up as outputs inside it
        @inputs = (new Output @, text, index, inputs.length-1 for text, index in inputs)
        @outputs = (new Input @, text, index, outputs.length-1 for text, index in outputs)
        @nodes = {}
        @connections = {}

    set_name: (@name) ->
        @view.

    toJSON: ->
        nodes:_.values @nodes
        connections:_.values @connections
    
class Node
    constructor: ->
        @view = make_node_view @
        node_registry[@id] = @
        @scope = current_scope
        @scope.nodes[@id] = @

    set_position:(@position) ->
        @view.position.copy @position

    get_nibs: ->
        @inputs.concat @outputs

    delete: ->
        scene.remove @view
        delete @scope.nodes[@id]
        for nib in @get_nibs()
            nib.delete_connections()

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
        @view = make_nib_view @, @parent instanceof Node
        @connections = {}

    delete_connections: ->
        for id, connection of @connections
            connection.connection.delete()

# TODO: change nib 'node' to parent since it might not be a node
class Input extends Nib
    constructor:(@parent, @text, @index=0, @siblings=0) ->
        super()

    _add_connection: (connection, vertex) ->
        # delete previous connection
        @get_connection()?.delete()
        @connections[connection.id] =
            connection:connection
            vertex:vertex

    get_connection: ->
        for id, connection of @connections
            return connection

    connect:(output) ->
        new Connection @ output
        
class Output extends Nib
    constructor:(@parent, @text, @index=0, @siblings=0) ->
        super()

    _add_connection: (connection, vertex) ->
        @connections[connection.id] =
            connection:connection
            vertex:vertex

    connect:(input) ->
        new Connection input, @

class Connection
    constructor:(@input, @output, @id=UUID()) ->
        [@view, input_vertex, output_vertex] = connection_view @
        @input._add_connection @, input_vertex
        @output._add_connection @, output_vertex
        @scope = current_scope
        @scope.connections[@id] = @

    toJSON: ->
        input:
            index:@input.index
            parent_id:@input.parent.id
        output:
            index:@output.index
            parent_id:@output.parent.id

    delete: ->
        scene.remove @view
        delete @scope.connections[@id]
        delete @output.connections[@id]
        @input.connections = {}

### VIEWS ###

make_subroutine_view = (subroutine) ->
    box_size = V 500,500
    position = box_size.scale(1/2.0)
    box = make_box subroutine.name, box_size, 10, 0xEEEEEE, position, false
    box.model = subroutine
    boxes[box.id] = box
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
    y_position = y_offset * (if nib instanceof Input then 1 else -1) * (if is_node then 1 else -1)

    sub_box = make_box nib.text, sub_box_size, 5, sub_box_color, V x_position,y_position
    sub_box.model = nib

    parent = nib.parent.view
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

make_text = (text, size) ->
    geometry = new THREE.TextGeometry text,
        size:size
        font:'helvetiker'
        curveSegments:2
    geometry.computeBoundingBox()
    centerOffset = -0.5 * (geometry.boundingBox.x[1] - geometry.boundingBox.x[0])

    material = new THREE.MeshBasicMaterial color:0x000000, overdraw:true
    mesh = new THREE.Mesh geometry, material
    mesh.position.x = centerOffset
    return mesh

make_box = (name, size, text_size, color, position, outline=false) ->
    box = new THREE.Object3D()

    geometry = new THREE.PlaneGeometry size.components()...
    material = new THREE.MeshBasicMaterial color:color, wireframe:outline
    mesh = new THREE.Mesh geometry, material
    mesh.position = V(0,0).three()
    box.add mesh

    box.add make_text name, text_size
    box.position = position.three()
    return box

make_arrow = (source, target) ->
    arrow = new THREE.Object3D()
    color = 0x888888

    source = source.three() if 'three' of source
    target = target.three() if 'three' of target

    line_geometry = new THREE.Geometry()
    line_material = new THREE.LineBasicMaterial color: color, linewidth: 3
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
    intersections = ray.intersectScene scene
    console.log intersections
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
    event.preventDefault()
    target = ray_cast_mouse()
    if target
        if target.model instanceof Node
            if event.which is 3
                target.model.delete()
            else
                dragging_object = target
        else if target.model instanceof Nib
            if event.which is 3
                target.model.delete_connections()
            else
                system_arrow.geometry.vertices[0].position = system_arrow.geometry.vertices[1].position = get_nib_position target
                scene.add system_arrow
                connecting_object = target

mouse_up = (event) ->
    dragging_object = null

    if connecting_object
        target = ray_cast_mouse()
        if target?.model instanceof Nib
            connection = make_connection connecting_object, target
        connecting_object = null
        scene.remove system_arrow

mouse_move = (event) ->
    vector = mouse_coords(event).three()
    if dragging_object
        node = dragging_object.model
        node.set_position vector
        for nib in node.get_nibs()
            for id, connection of nib.connections
                connection.vertex.position.copy get_nib_position nib.view
    if connecting_object
        system_arrow.geometry.vertices[1].position = vector

window.Controller = ->
    console.log "running"
    field = $("#field")

    field.append renderer.domElement
    animate()
    field.mousedown mouse_down
    field.mouseup mouse_up
    field.mousemove mouse_move
    field.bind 'contextmenu', -> false

    @new_node_text = ''
    @add_new_node = =>
        @add_node @new_node_text
        @new_node_text = ''

    @add_node = (text) =>
        node = make_node text

    #@initial_subroutine =
    #    name:''
    #    inputs:''
    #    outputs:''

    #@new_subroutine = angular.copy @initial_subroutine

    @main = main
    @edit_subroutine = (subroutine) =>
    @add_subroutine = =>
        @subroutines.push new SubRoutine
        
        

    @run_program = execute_program
    @library = functions
    @subroutines = subroutines

current_scope = main = new SubRoutine 'main', [], ['OUT']
subroutines = [main]

make_basic_program = ->
    plus = make_node '+', V 250,150
    five = make_node '5', V 200, 300
    three = make_node '3', V 300, 300
    c1 = five.outputs[0].connect plus.inputs[0]
    c2 = three.outputs[0].connect plus.inputs[1]
    c3 = plus.outputs[0].connect current_scope.outputs[0]

load_program = (source) ->
    program = JSON.parse source

    for node in program.nodes
        make_node node.text, Vector.from(node.position), node.id

    for connection in program.connections
        source = node_registry[connection.output.parent_id]
        sink = node_registry[connection.input.parent_id]
        source.outputs[connection.output.index].connect sink.inputs[connection.input.index]


how_are_you_source = """{"nodes":[{"position":{"x":242,"y":110,"z":0},"text":"out","id":"56b9d684188339dafd5d3f0fe9421371"},{"position":{"x":243,"y":210,"z":0},"text":"if","id":"3190bcfcc5ece720f07ccde57b12f8a3"},{"position":{"x":152,"y":315,"z":0},"text":"\\"That's Awesome!\\"","id":"d33ff759bef23100f01c59d525d404d7"},{"position":{"x":339,"y":316,"z":0},"text":"\\"Oh Well\\"","id":"5d54ff1fa3f1633b31a1ba8c0536f1f0"},{"position":{"x":239,"y":363,"z":0},"text":"=","id":"6b8e3e498b936e992c0ceddbbe354635"},{"position":{"x":146,"y":469,"z":0},"text":"\\"good\\"","id":"3673f98c69da086d30994c91c01fe3f7"},{"position":{"x":336,"y":472,"z":0},"text":"prompt","id":"92de68eec528651f75a74492604f5211"},{"position":{"x":334,"y":598,"z":0},"text":"\\"How are you?\\"","id":"aa4cb4c766117fb44f5a917f1a1f9ba5"}],"connections":[{"input":{"index":0,"parent_id":"56b9d684188339dafd5d3f0fe9421371"},"output":{"index":0,"parent_id":"3190bcfcc5ece720f07ccde57b12f8a3"}},{"input":{"index":0,"parent_id":"3190bcfcc5ece720f07ccde57b12f8a3"},"output":{"index":0,"parent_id":"d33ff759bef23100f01c59d525d404d7"}},{"input":{"index":2,"parent_id":"3190bcfcc5ece720f07ccde57b12f8a3"},"output":{"index":0,"parent_id":"5d54ff1fa3f1633b31a1ba8c0536f1f0"}},{"input":{"index":1,"parent_id":"3190bcfcc5ece720f07ccde57b12f8a3"},"output":{"index":0,"parent_id":"6b8e3e498b936e992c0ceddbbe354635"}},{"input":{"index":0,"parent_id":"6b8e3e498b936e992c0ceddbbe354635"},"output":{"index":0,"parent_id":"3673f98c69da086d30994c91c01fe3f7"}},{"input":{"index":1,"parent_id":"6b8e3e498b936e992c0ceddbbe354635"},"output":{"index":0,"parent_id":"92de68eec528651f75a74492604f5211"}},{"input":{"index":0,"parent_id":"92de68eec528651f75a74492604f5211"},"output":{"index":0,"parent_id":"aa4cb4c766117fb44f5a917f1a1f9ba5"}}]}"""
addition_program_source = """{"nodes":[{"position":{"x":200,"y":100},"text":"out","id":"a3a19afbbc5b944012036668230eb819"},{"position":{"x":200,"y":300},"text":"+","id":"4c19f385dd04884ab84eb27f71011054"},{"position":{"x":150,"y":500},"text":"5","id":"c532ec59ef6b57af6bd7323be2d27d93"},{"position":{"x":250,"y":500},"text":"3","id":"1191a8be50c4c7cd7b1f259b82c04365"}],"connections":[{"input":{"index":0,"parent_id":"4c19f385dd04884ab84eb27f71011054"},"output":{"index":0,"parent_id":"c532ec59ef6b57af6bd7323be2d27d93"}},{"input":{"index":1,"parent_id":"4c19f385dd04884ab84eb27f71011054"},"output":{"index":0,"parent_id":"1191a8be50c4c7cd7b1f259b82c04365"}},{"input":{"index":0,"parent_id":"a3a19afbbc5b944012036668230eb819"},"output":{"index":0,"parent_id":"4c19f385dd04884ab84eb27f71011054"}}]}"""

#load_program how_are_you_source
make_basic_program()
