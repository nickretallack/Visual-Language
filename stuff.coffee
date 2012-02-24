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
obj_first = (obj) ->
    for key, item of obj
        return item

boxes = {}
node_registry = {}
all_subroutines = {}
current_scope = null
system_arrow = null

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
    '*':
        inputs:['L','R']
        outputs:['R']
        definition: (left, right) -> left() * right()
    '/':
        inputs:['L','R']
        outputs:['R']
        definition: (left, right) -> left() / right()

    '<':
        inputs:['L','R']
        outputs:['R']
        definition: (left, right) -> left() < right()
    '<=':
        inputs:['L','R']
        outputs:['R']
        definition: (left, right) -> left() <= right()
    '=':
        inputs:['L','R']
        outputs:['R']
        definition: (left, right) -> left() is right()
    '>=':
        inputs:['L','R']
        outputs:['R']
        definition: (left, right) -> left() >= right()
    '>':
        inputs:['L','R']
        outputs:['R']
        definition: (left, right) -> left() > right()

    'if':
        inputs:['T','C','F']
        outputs:['R']
        definition: (true_result, condition, false_result) -> if condition() then true_result() else false_result()

    'prompt':
        inputs:['M']
        outputs:['R']
        definition: (message) -> prompt message()
    'log':
        inputs:['in']
        outputs:['out']
        definition: (input) ->
            value = input()
            console.log value
            return value
    'exit':
        inputs:[]
        outputs:['R']
        definition: -> throw "Exit"

    'replace':
        inputs:['text','rem','ins']
        outputs:['result']
        definition: (text, pattern, replacement) -> text().replace pattern(), replacement()

    'two_outputs':
        inputs:[]
        outputs:['L','R']
        definition: (index) -> if index is 0 then "left" else "right"

    'int':
        inputs:['str']
        outputs:['int']
        definition: (str) -> parseInt str()
    'float':
        inputs:['str']
        outputs:['float']
        definition: (str) -> parseFloat str()
    'str':
        inputs:['obj']
        outputs:['float']
        definition: (obj) -> ''+ obj()
    'from json':
        inputs:['str']
        outputs:['obj']
        definition: (str) -> JSON.parse str()
    'to json':
        inputs:['obj']
        outputs:['str']
        definition: (obj) -> JSON.stringify obj()

    'random float':
        inputs:[]
        outputs:['OUT']
        definition: -> Math.random()
        

### MODELS ###

class SubRoutine
    constructor:(@name='', inputs=[], outputs=[], @id=UUID()) ->
        node_registry[@id] = @
        @view = make_subroutine_view @

        # can't have a subroutine with no output
        outputs = ['OUT'] unless outputs.length

        # These are intentionally reversed.  The inputs to a subroutine show up as outputs inside it
        @inputs = (new Output @, text, index, inputs.length-1 for text, index in inputs)
        @outputs = (new Input @, text, index, outputs.length-1 for text, index in outputs)
        @nodes = {}
        @connections = {}
        all_subroutines[@id] = @

    toJSON: ->
        id:@id
        name:@name
        nodes:_.values @nodes
        connections:_.values @connections
        inputs:@get_inputs()
        outputs:@get_outputs()

    invoke: (index, inputs) ->
        the_scope =
            subroutine:@
            inputs:inputs

        output = @outputs[index].get_connection()?.connection.output
        throw "NotConnected" unless output

        if output.parent instanceof SubRoutine
            return inputs[output.index]()
        else if output.parent instanceof Node
            return output.parent.evaluation the_scope, output.index

    get_inputs: -> (input.text for input in @inputs)
    get_outputs: -> (output.text for output in @outputs)

    run: (output_index, input_values) ->
        try
            alert @invoke(output_index, input_values)
        catch exception
            if exception is 'NotConnected'
                alert "Something in the program is disconnected"
            else if exception is 'Exit'
                alert "Program Exited"
            else throw exception

    export: ->
        dependencies = @get_dependencies()
        subroutines:_.values dependencies

    get_dependencies: (dependencies={}) ->
        dependencies[@id] = @ if @id not of dependencies
        for node in @nodes
            if node.type is 'function'
                dependencies = dependencies.concat node.subroutine.get_dependencies dependencies
        dependencies

    subroutines_referenced: ->
        # TODO: turn this into a cleanup function
        results = []
        for output in @outputs
            parent = output.get_connection()?.connection.output.parent
            if parent
                results.push parent.id if parent.type is 'function'
                resuts = results.concat parent.subroutines_referenced()
        return results
    
class Node
    constructor: ->
        node_registry[@id] = @
        @scope = current_scope
        @scope.nodes[@id] = @
        @view = make_node_view @

    set_position:(@position) ->
        @view.position.copy @position

    get_nibs: ->
        @inputs.concat @outputs

    delete: ->
        @scope.view.remove @view
        delete @scope.nodes[@id]
        for nib in @get_nibs()
            nib.delete_connections()

    toJSON: ->
        position:@position
        text:@text
        id:@id
        type:@type

class FunctionApplication extends Node
    constructor:(@position, @text, information, @id=UUID()) ->
        if information.definition instanceof SubRoutine
            @subroutine = information.definition
            @type = 'function'
        else
            @value = information.definition
            @type = 'builtin'

        super()
        @inputs = (new Input @, text, index, information.inputs.length-1 for text, index in information.inputs)
        @outputs = (new Output @, text, index, information.outputs.length-1 for text, index in information.outputs)

    evaluation: (the_scope, output_index) ->
        input_values = []
        for input in @inputs
            do (input) ->
                input_values.push _.memoize ->
                    output = input.get_connection()?.connection.output
                    throw "NotConnected" unless output
                    if output.parent instanceof SubRoutine
                        return the_scope.inputs[output.index]()
                    else if output.parent instanceof Node
                        return output.parent.evaluation the_scope, output.index

        if @subroutine?
            return @subroutine.invoke output_index, input_values
        else
            return @value (input_values.concat [output_index])...

    toJSON: ->
        json = super()
        json.implementation_id = if @type is 'function' then @subroutine.id else @text
        json

    subroutines_referenced: ->
        results = []
        for input in @inputs
            parent = input.get_connection()?.connection.output.parent
            if parent
                results.push parent.id if parent.type is 'function'
                resuts = results.concat parent.subroutines_referenced()
        return results
        

class Literal extends Node
    constructor:(@position, @text, @value, @id=UUID()) ->
        super()
        @inputs = []
        @outputs = [new Output(@, 'OUT')]
        @type = 'literal'

    evaluation: -> return @value

    toJSON: ->
        json = super()
        json.value = JSON.stringify @value
        json

    subroutines_referenced: -> []
    
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
        @get_connection()?.connection.delete()
        @connections = {}
        @connections[connection.id] =
            connection:connection
            vertex:vertex

    get_connection: ->
        for id, connection of @connections
            return connection

    connect:(output) ->
        new Connection @, output
        
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
        @scope.view.remove @view
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
    #scene.add box
    return box

make_node_view = (node) ->
    main_box_size = V 50,50
    color = 0x888888
    main_box = make_box node.text, main_box_size, 10, color, node.position
    main_box.model = node
    node.scope.view.add main_box
    #scene.add main_box
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
    point1 = get_nib_position connection.input
    point2 = get_nib_position connection.output
    arrow = make_arrow point1, point2
    [arrow, arrow.geometry.vertices[0], arrow.geometry.vertices[1]]
            

### FACTORIES ###

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

make_arrow = (source, target, scoped=true) ->
    arrow = new THREE.Object3D()
    color = 0x888888

    source = source.three() if 'three' of source
    target = target.three() if 'three' of target

    line_geometry = new THREE.Geometry()
    line_material = new THREE.LineBasicMaterial color: color, linewidth: 3
    line_geometry.vertices.push new THREE.Vertex source
    line_geometry.vertices.push new THREE.Vertex target
    line = new THREE.Line line_geometry, line_material
    current_scope.view.add line if scoped
    return line

### CORE HELPERS ###

ray_cast_mouse = ->
    mouse = mouse_coords(event).three()
    mouse.z = 1
    forward = new THREE.Vector3 0,0,-1
    ray = new THREE.Ray mouse, forward
    intersections = ray.intersectScene scene
    if intersections.length > 0
        (last intersections).object.parent

mouse_coords = (event) ->
    V event.clientX, height-event.clientY
    #V ((event.clientX / window.innerWidth) * 2 - 1), (-(event.clientY / window.innerHeight) * 2 + 1)

get_nib_position = (nib) ->
    if nib.parent instanceof Node
        Vector.from(nib.view.position).plus(nib.view.parent.position).three()
    else Vector.from(nib.view.position).three()

get_absolute_nib_position = (nib) ->
    Vector.from(get_nib_position(nib)).plus(V(250,250)).three()
    

### INTERACTION ###

dragging_object = null
connecting_object = null
dragging_offset = V 0,0


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
                system_arrow.geometry.vertices[0].position = system_arrow.geometry.vertices[1].position = get_absolute_nib_position target.model
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
    mouse_vector = mouse_coords(event)
    adjusted_vector = mouse_vector.minus(V(250,250)).three()
    vector = mouse_vector.three()
    if dragging_object
        node = dragging_object.model
        node.set_position adjusted_vector
        for nib in node.get_nibs()
            for id, connection of nib.connections
                connection.vertex.position.copy get_nib_position nib
    if connecting_object
        system_arrow.geometry.vertices[1].position = vector

whitespace_split = (input) ->
    results = input.split(/\s+/)
    results = results[1..] if results[0] is ''
    results

class InputError
    constructor: (@message) ->

valid_json = (json) ->
    try
        return JSON.parse json
    catch exception
        if exception instanceof SyntaxError
            return alert "Invalid JSON: #{json}"
        else
            throw exception
    

window.Controller = ->
    field = $("#field")

    field.append renderer.domElement
    animate()
    field.mousedown mouse_down
    field.mouseup mouse_up
    field.mousemove mouse_move
    field.bind 'contextmenu', -> false

    hide_subroutines = =>
        for index, subroutine of @subroutines
            scene.remove subroutine.view

    @import_export_text = ''
    @import = ->
        hide_subroutines()
        import_source @import_export_text
        scene.add current_scope.view

    import_source = (source) =>
        #new_state = load_state valid_json source
        subroutines = load_state valid_json source
        for id, subroutine of subroutines
            @subroutines[subroutine.id] = subroutine

    @load_example_programs = =>
        hide_subroutines()
        for name, source of example_programs
            import_source source
        current_scope = @subroutines["2092fbbc04daf231793ce4d1d6761172"]
        scene.add current_scope.view

    @export_all = ->
        @import_export_text = JSON.stringify subroutines:_.values @subroutines

    @export_subroutine = (subroutine) =>
        @import_export_text = JSON.stringify subroutine.export()

    @revert = ->
        @subroutines = {}
        @load_example_programs()

    @literal_text = ''
    @use_literal = =>
        value = valid_json @literal_text
        new Literal V(0,0), @literal_text, value
        @literal_text = ''

    @use_builtin = (name) =>
        new FunctionApplication V(0,0), name, functions[name]

    @use_subroutine = (subroutine) =>
        new FunctionApplication V(0,0), subroutine.name,
            inputs:subroutine.get_inputs()
            outputs:subroutine.get_outputs()
            definition:subroutine

    @initial_subroutine =
        name:''
        inputs:''
        outputs:''
    @new_subroutine = angular.copy @initial_subroutine

    @edit_subroutine = (subroutine) =>
        current_scope = subroutine
        hide_subroutines()
        scene.add subroutine.view

    @add_subroutine = =>
        inputs = whitespace_split @new_subroutine.inputs
        outputs = whitespace_split @new_subroutine.outputs
        subroutine = new SubRoutine @new_subroutine.name, inputs, outputs
        @subroutines[subroutine.id] = subroutine
        @new_subroutine = angular.copy @initial_subroutine

    @run_subroutine = (subroutine, output_index) =>
        input_values = []
        for input, input_index in subroutine.inputs
            do (input_index, input) ->
                value = _.memoize ->
                    result = prompt "Provide a JSON value for \"#{input.text}\":"
                    throw "Exit" if result is null
                    try
                        return JSON.parse result
                    catch exception
                        if exception instanceof SyntaxError
                            throw new InputError result
                        else
                            throw exception
                input_values.push value
        try
            subroutine.run output_index, input_values
        catch exception
            if exception instanceof InputError
                alert "Invalid JSON: #{exception.message}"
            else
                throw exception
        
    save_state = =>
        state =
            subroutines:@subroutines

        localStorage.state = JSON.stringify state

    @library = functions

    if localStorage.state?
        data = JSON.parse localStorage.state
        @subroutines = load_state data
        scene.add current_scope.view
    else
        @load_example_programs()

    system_arrow = make_arrow V(0,0), V(1,0), false
    save_timer = setInterval save_state, 500

default_state = '{}'

load_state = (data) ->
    subroutines = {}

    # load structures first
    for id, subroutine_data of data.subroutines
        subroutines[id] = load_subroutine subroutine_data

    # load implementations next
    for id, subroutine of subroutines
        current_scope = subroutine
        load_implementation data.subroutines[id]

    return subroutines
    
make_main = ->
    new SubRoutine 'default', [], ['OUT']

make_basic_program = ->
    plus = make_node '+', V 250,150
    five = make_node '5', V 200, 300
    three = make_node '3', V 300, 300
    c1 = five.outputs[0].connect plus.inputs[0]
    c2 = three.outputs[0].connect plus.inputs[1]
    c3 = plus.outputs[0].connect current_scope.outputs[0]


load_program = (data) ->
    # TODO: it's possible for one subroutine to make use of another one before that one is loaded.
    # Loading should happen in two passes: first create all the subroutines, then run through them and load nodes into them.
    subroutine = load_subroutine data.subroutine
    return new Program data.name, subroutine, data.id

load_subroutine = (data) ->
    subroutine = new SubRoutine data.name, data.inputs, data.outputs, data.id

load_implementation = (data) ->
    for node in data.nodes
        position = Vector.from(node.position)
        if node.type is 'function'
            sub_subroutine = all_subroutines[node.implementation_id]
            console.log "Oh no, subroutine wasn't loaded yet" unless sub_subroutine
            new FunctionApplication position, sub_subroutine.name,
                inputs:sub_subroutine.get_inputs()
                outputs:sub_subroutine.get_outputs()
                definition:sub_subroutine
            , node.id
        else if node.type is 'builtin'
            information = functions[node.implementation_id]
            name = node.implementation_id
            new FunctionApplication position, name, information, node.id
        else if node.type is 'literal'
            value = JSON.parse node.value
            new Literal position, node.value, value, node.id

    for connection in data.connections
        source = node_registry[connection.output.parent_id]
        sink = node_registry[connection.input.parent_id]

        # input/output reversal.  TODO: clean up subroutine implementation to avoid this
        source_connector = if source instanceof Node then source.outputs else source.inputs
        sink_connector = if sink instanceof Node then sink.inputs else sink.outputs

        if connection.output.index >= source_connector.length or connection.input.index >= sink_connector.length
            console.log "Oh no, trying to make an invalid connection"

        source_connector[connection.output.index].connect sink_connector[connection.input.index]



how_are_you_source = """{"nodes":[{"position":{"x":242,"y":110,"z":0},"text":"out","id":"56b9d684188339dafd5d3f0fe9421371"},{"position":{"x":243,"y":210,"z":0},"text":"if","id":"3190bcfcc5ece720f07ccde57b12f8a3"},{"position":{"x":152,"y":315,"z":0},"text":"\\"That's Awesome!\\"","id":"d33ff759bef23100f01c59d525d404d7"},{"position":{"x":339,"y":316,"z":0},"text":"\\"Oh Well\\"","id":"5d54ff1fa3f1633b31a1ba8c0536f1f0"},{"position":{"x":239,"y":363,"z":0},"text":"=","id":"6b8e3e498b936e992c0ceddbbe354635"},{"position":{"x":146,"y":469,"z":0},"text":"\\"good\\"","id":"3673f98c69da086d30994c91c01fe3f7"},{"position":{"x":336,"y":472,"z":0},"text":"prompt","id":"92de68eec528651f75a74492604f5211"},{"position":{"x":334,"y":598,"z":0},"text":"\\"How are you?\\"","id":"aa4cb4c766117fb44f5a917f1a1f9ba5"}],"connections":[{"input":{"index":0,"parent_id":"56b9d684188339dafd5d3f0fe9421371"},"output":{"index":0,"parent_id":"3190bcfcc5ece720f07ccde57b12f8a3"}},{"input":{"index":0,"parent_id":"3190bcfcc5ece720f07ccde57b12f8a3"},"output":{"index":0,"parent_id":"d33ff759bef23100f01c59d525d404d7"}},{"input":{"index":2,"parent_id":"3190bcfcc5ece720f07ccde57b12f8a3"},"output":{"index":0,"parent_id":"5d54ff1fa3f1633b31a1ba8c0536f1f0"}},{"input":{"index":1,"parent_id":"3190bcfcc5ece720f07ccde57b12f8a3"},"output":{"index":0,"parent_id":"6b8e3e498b936e992c0ceddbbe354635"}},{"input":{"index":0,"parent_id":"6b8e3e498b936e992c0ceddbbe354635"},"output":{"index":0,"parent_id":"3673f98c69da086d30994c91c01fe3f7"}},{"input":{"index":1,"parent_id":"6b8e3e498b936e992c0ceddbbe354635"},"output":{"index":0,"parent_id":"92de68eec528651f75a74492604f5211"}},{"input":{"index":0,"parent_id":"92de68eec528651f75a74492604f5211"},"output":{"index":0,"parent_id":"aa4cb4c766117fb44f5a917f1a1f9ba5"}}]}"""
addition_program_source = """{"nodes":[{"position":{"x":200,"y":100},"text":"out","id":"a3a19afbbc5b944012036668230eb819"},{"position":{"x":200,"y":300},"text":"+","id":"4c19f385dd04884ab84eb27f71011054"},{"position":{"x":150,"y":500},"text":"5","id":"c532ec59ef6b57af6bd7323be2d27d93"},{"position":{"x":250,"y":500},"text":"3","id":"1191a8be50c4c7cd7b1f259b82c04365"}],"connections":[{"input":{"index":0,"parent_id":"4c19f385dd04884ab84eb27f71011054"},"output":{"index":0,"parent_id":"c532ec59ef6b57af6bd7323be2d27d93"}},{"input":{"index":1,"parent_id":"4c19f385dd04884ab84eb27f71011054"},"output":{"index":0,"parent_id":"1191a8be50c4c7cd7b1f259b82c04365"}},{"input":{"index":0,"parent_id":"a3a19afbbc5b944012036668230eb819"},"output":{"index":0,"parent_id":"4c19f385dd04884ab84eb27f71011054"}}]}"""

example_programs =
    fibonacci:"""{"subroutines":[{"id":"2575174b1c1ce259732f1e2cdad0527a","name":"fibonacci","nodes":[{"position":{"x":-9,"y":-182},"text":"if","id":"e05a7951f055bda9bac1b7a2cb64b158","type":"builtin","implementation_id":"if"},{"position":{"x":13,"y":137},"text":"<=","id":"593ca0e4720b30081fc5197263123d13","type":"builtin","implementation_id":"<="},{"position":{"x":-194,"y":216},"text":"1","id":"e438523e5b202c39d3e2374b7e96d180","type":"literal","value":"1"},{"position":{"x":-74,"y":110},"text":"-","id":"6c89f0d25eec0382b8700859a11416eb","type":"builtin","implementation_id":"-"},{"position":{"x":118,"y":125},"text":"-","id":"eb73af84739ab002f7044f76e0c41822","type":"builtin","implementation_id":"-"},{"position":{"x":200,"y":207},"text":"2","id":"bab1a81bbf9a28165c13649fcb8c8bcf","type":"literal","value":"2"},{"position":{"x":-64,"y":14},"text":"fibonacci","id":"c26176010b9b89cfca7360674c317a51","type":"function","implementation_id":"2575174b1c1ce259732f1e2cdad0527a"},{"position":{"x":48,"y":-80},"text":"+","id":"c4c313ea6125c5bbcab9077a432999cd","type":"builtin","implementation_id":"+"},{"position":{"x":117,"y":26},"text":"fibonacci","id":"8fa76accf987138f4c17b3cb736113f9","type":"function","implementation_id":"2575174b1c1ce259732f1e2cdad0527a"}],"connections":[{"input":{"index":0,"parent_id":"2575174b1c1ce259732f1e2cdad0527a"},"output":{"index":0,"parent_id":"e05a7951f055bda9bac1b7a2cb64b158"}},{"input":{"index":0,"parent_id":"593ca0e4720b30081fc5197263123d13"},"output":{"index":0,"parent_id":"2575174b1c1ce259732f1e2cdad0527a"}},{"input":{"index":1,"parent_id":"e05a7951f055bda9bac1b7a2cb64b158"},"output":{"index":0,"parent_id":"593ca0e4720b30081fc5197263123d13"}},{"input":{"index":0,"parent_id":"e05a7951f055bda9bac1b7a2cb64b158"},"output":{"index":0,"parent_id":"e438523e5b202c39d3e2374b7e96d180"}},{"input":{"index":1,"parent_id":"6c89f0d25eec0382b8700859a11416eb"},"output":{"index":0,"parent_id":"e438523e5b202c39d3e2374b7e96d180"}},{"input":{"index":0,"parent_id":"6c89f0d25eec0382b8700859a11416eb"},"output":{"index":0,"parent_id":"2575174b1c1ce259732f1e2cdad0527a"}},{"input":{"index":1,"parent_id":"eb73af84739ab002f7044f76e0c41822"},"output":{"index":0,"parent_id":"bab1a81bbf9a28165c13649fcb8c8bcf"}},{"input":{"index":0,"parent_id":"eb73af84739ab002f7044f76e0c41822"},"output":{"index":0,"parent_id":"2575174b1c1ce259732f1e2cdad0527a"}},{"input":{"index":0,"parent_id":"c26176010b9b89cfca7360674c317a51"},"output":{"index":0,"parent_id":"6c89f0d25eec0382b8700859a11416eb"}},{"input":{"index":0,"parent_id":"c4c313ea6125c5bbcab9077a432999cd"},"output":{"index":0,"parent_id":"c26176010b9b89cfca7360674c317a51"}},{"input":{"index":2,"parent_id":"e05a7951f055bda9bac1b7a2cb64b158"},"output":{"index":0,"parent_id":"c4c313ea6125c5bbcab9077a432999cd"}},{"input":{"index":0,"parent_id":"8fa76accf987138f4c17b3cb736113f9"},"output":{"index":0,"parent_id":"eb73af84739ab002f7044f76e0c41822"}},{"input":{"index":1,"parent_id":"c4c313ea6125c5bbcab9077a432999cd"},"output":{"index":0,"parent_id":"8fa76accf987138f4c17b3cb736113f9"}},{"input":{"index":1,"parent_id":"593ca0e4720b30081fc5197263123d13"},"output":{"index":0,"parent_id":"bab1a81bbf9a28165c13649fcb8c8bcf"}}],"inputs":["n"],"outputs":["OUT"]}]}"""
    factorial:"""{"subroutines":[{"id":"8fc9bd3c71115f83652aa005eea7190f","name":"factorial","nodes":[{"position":{"x":88,"y":109},"text":"-","id":"de90fccb0536281a45a0da5f70959f21","type":"builtin","implementation_id":"-"},{"position":{"x":-155,"y":181},"text":"1","id":"1812eff87ec431a6271f6dec686a9f46","type":"literal","value":"1"},{"position":{"x":89,"y":19},"text":"factorial","id":"5824bd344a36b3fe046903267540a6c0","type":"function","implementation_id":"8fc9bd3c71115f83652aa005eea7190f"},{"position":{"x":55,"y":-76},"text":"*","id":"1203ca7b32a7d2c14530cf8284a2c58d","type":"builtin","implementation_id":"*"},{"position":{"x":-1,"y":-169},"text":"if","id":"85d5915f07a530740d2d09a8800a96f5","type":"builtin","implementation_id":"if"},{"position":{"x":-58,"y":69},"text":"<=","id":"6429e2efdd33c227628d4b0e45cfdb39","type":"builtin","implementation_id":"<="},{"position":{"x":190,"y":202},"text":"1","id":"e210a51778362d1e20d360f02c1c3c6b","type":"literal","value":"1"}],"connections":[{"input":{"index":0,"parent_id":"de90fccb0536281a45a0da5f70959f21"},"output":{"index":0,"parent_id":"8fc9bd3c71115f83652aa005eea7190f"}},{"input":{"index":0,"parent_id":"5824bd344a36b3fe046903267540a6c0"},"output":{"index":0,"parent_id":"de90fccb0536281a45a0da5f70959f21"}},{"input":{"index":1,"parent_id":"1203ca7b32a7d2c14530cf8284a2c58d"},"output":{"index":0,"parent_id":"5824bd344a36b3fe046903267540a6c0"}},{"input":{"index":0,"parent_id":"1203ca7b32a7d2c14530cf8284a2c58d"},"output":{"index":0,"parent_id":"8fc9bd3c71115f83652aa005eea7190f"}},{"input":{"index":2,"parent_id":"85d5915f07a530740d2d09a8800a96f5"},"output":{"index":0,"parent_id":"1203ca7b32a7d2c14530cf8284a2c58d"}},{"input":{"index":0,"parent_id":"8fc9bd3c71115f83652aa005eea7190f"},"output":{"index":0,"parent_id":"85d5915f07a530740d2d09a8800a96f5"}},{"input":{"index":0,"parent_id":"85d5915f07a530740d2d09a8800a96f5"},"output":{"index":0,"parent_id":"1812eff87ec431a6271f6dec686a9f46"}},{"input":{"index":0,"parent_id":"6429e2efdd33c227628d4b0e45cfdb39"},"output":{"index":0,"parent_id":"8fc9bd3c71115f83652aa005eea7190f"}},{"input":{"index":1,"parent_id":"6429e2efdd33c227628d4b0e45cfdb39"},"output":{"index":0,"parent_id":"1812eff87ec431a6271f6dec686a9f46"}},{"input":{"index":1,"parent_id":"85d5915f07a530740d2d09a8800a96f5"},"output":{"index":0,"parent_id":"6429e2efdd33c227628d4b0e45cfdb39"}},{"input":{"index":1,"parent_id":"de90fccb0536281a45a0da5f70959f21"},"output":{"index":0,"parent_id":"e210a51778362d1e20d360f02c1c3c6b"}}],"inputs":["n"],"outputs":["OUT"]}]}"""
    playground:"""{"subroutines":[{"id":"2092fbbc04daf231793ce4d1d6761172","name":"playground","nodes":[],"connections":[],"inputs":[],"outputs":["OUT"]}]}"""
