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

schema_version = 1
boxes = {}
node_registry = {}
all_subroutines = {}
all_builtins = {}
current_scope = null
system_arrow = null

update = ->
    renderer.render scene, camera

animate = ->
    requestAnimationFrame animate
    update()

builtins =
    "894652d702c3bb123ce8ed9e2bdcc71b":
        name:'+'
        inputs:['L','R']
        outputs:['R']
        output_implementation: (left, right) -> left() + right()
    "99dc67480b5e5fe8adcab5fc6540c8a0":
        name:'-'
        inputs:['L','R']
        outputs:['R']
        output_implementation: (left, right) -> left() - right()
    "c70ac0c10dcfce8249b937ad164413ec":
        name:'*'
        inputs:['L','R']
        outputs:['R']
        output_implementation: (left, right) -> left() * right()
    "3080574badf11047d6df2ed24f8248df":
        name:'/'
        inputs:['L','R']
        outputs:['R']
        output_implementation: (left, right) -> left() / right()

    "993ad152a2a888f6c0e6a6bd8a1c385a":
        name:'<'
        inputs:['L','R']
        outputs:['R']
        output_implementation: (left, right) -> left() < right()
    "3030973e37ce53b896735a3ad6b369d6":
        name:'<='
        inputs:['L','R']
        outputs:['R']
        output_implementation: (left, right) -> left() <= right()
    "54e3469201277e5325db02aa56ab5218":
        name:'='
        inputs:['L','R']
        outputs:['R']
        output_implementation: (left, right) -> left() is right()
    "4d0b2cd39670d8a70ded2c5f7a6fd5be":
        name:'>='
        inputs:['L','R']
        outputs:['R']
        output_implementation: (left, right) -> left() >= right()
    "68af5453eda7b4c9cbe6a86e12b5fba2":
        name:'>'
        inputs:['L','R']
        outputs:['R']
        output_implementation: (left, right) -> left() > right()

    "29c894a04e219f47477672bedc3ad620":
        name:'if'
        inputs:['T','C','F']
        outputs:['R']
        output_implementation: (true_result, condition, false_result) -> if condition() then true_result() else false_result()

    "be7936fcdcc1fe8c8f1024aa91b475e5":
        name:'prompt'
        inputs:['M','S']
        outputs:['R','S']
        memo_implementation: (message, sequencer) ->
            try
                sequencer()
            catch exception
                if exception isnt "NotConnected"
                    throw exception
 
            return prompt message()
            
        output_implementation: (message, sequencer, index, memo) ->
            if index is 0
                return memo
            else
                return null
 
    "06b207d17227570db276cd4aaef57a2b":
         name:'funnel'
         inputs:['V','S']
         outputs:['V']
         output_implementation: (value, sequencer) ->
             try
                 sequencer()
             catch exception
                 if exception isnt "NotConnected"
                     throw exception
 
             return value()

    "51f15a4fe5f0c1bf1e31f63733aa1618":
        name:'log'
        inputs:['in']
        outputs:['out']
        output_implementation: (input) ->
            value = input()
            console.log value
            return value

    "1baf12a4702a0ecc724592ad8dd285f3":
        name:'exit'
        inputs:[]
        outputs:['R']
        output_implementation: -> throw "Exit"

    "09f91a7ec8fd64baacda01ee70760569":
        name:'replace'
        inputs:['text','rem','ins']
        outputs:['result']
        output_implementation: (text, pattern, replacement) -> text().replace pattern(), replacement()

    "a612be6f7bae3de3ae2f883bc3f245c4":
        name:'two_outputs'
        inputs:[]
        outputs:['L','R']
        output_implementation: (index) -> if index is 0 then "left" else "right"

    "a9f07bc7545769b8b8b31a9d7ac77229":
        name:'int'
        inputs:['IN']
        outputs:['int']
        output_implementation: (str) -> parseInt str()
    "7cca8f80ac29c5a1e72c371c574e7414":
        name:'float'
        inputs:['IN']
        outputs:['float']
        output_implementation: (str) -> parseFloat str()
    "b5b3023a4a839ed106882e74923dab88":
        name:'str'
        inputs:['IN']
        outputs:['str']
        output_implementation: (obj) -> ''+ obj()
    "3827fa434cfc1b71555e0e958633e1ca":
        name:'from json'
        inputs:['str']
        outputs:['obj']
        output_implementation: (str) -> JSON.parse str()
    "aa8c65ccce7abc2c524349c843bb4fc5":
        name:'to json'
        inputs:['obj']
        outputs:['str']
        output_implementation: (obj) -> JSON.stringify obj()

    "9a7d34a3c313a193ba47e747b4ff9132":
        name:'random float'
        inputs:[]
        outputs:['OUT']
        output_implementation: -> Math.random()

    "325fa3507bac12a3673f2789e12a1e41":
        name:'call'
        inputs:['SUB','IN']
        outputs:['OUT']
        output_implementation: (subroutine, input) ->
            subroutine().invoke 0, [input]

    "9fbdec485d1149e1c24d54f332099247":
        name:'call-n'
        inputs:['SUB','IN']
        outputs:['OUT']
        output_implementation: (subroutine, inputs) ->
            subroutine().invoke 0, inputs()

    "0b40d2d29e6df169bc95d854f41ff476":
        name:'cons'
        inputs:['LIST','ELE']
        outputs:['LIST']
        output_implementation: (list, element) -> list().concat element()
            
    "73b5d938605bb060c7ddfa031fe29d46":
        name:'lazy input'
        inputs:['IN']
        outputs:['OUT']
        output_implementation: (input) -> input

        
execute = (routine) ->
    try
        alert JSON.stringify routine()
    catch exception
        if exception is 'NotConnected'
            alert "Something in the program is disconnected"
        else if exception is 'Exit'
            alert "Program Exited"
        else throw exception

### MODELS ###

class Builtin
    constructor:({@name, @output_implementation, @memo_implementation, @inputs, @outputs, @id}={memo_implementation:null, inputs:[], outputs:['OUT'], id:UUID()}) ->
        @output_function = eval "(#{@output_implementation})"
        @memo_function = eval "(#{@memo_implementation})"
        all_builtins[@id] = @

# populate id field in builtins.  Should be the other way around but oh well.
for id, info of builtins
    info.id = id
    info.output_implementation = ''+info.output_implementation
    info.memo_implementation   = ''+info.memo_implementation
    new Builtin info

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
            memos:{}

        output = @outputs[index].get_connection()?.connection.output
        throw "NotConnected" unless output

        if output.parent instanceof SubRoutine
            return inputs[output.index]()
        else if output.parent instanceof Node
            return output.parent.evaluation the_scope, output.index

    get_inputs: -> (input.text for input in @inputs)
    get_outputs: -> (output.text for output in @outputs)

    run: (output_index, input_values) ->
        execute -> @invoke(output_index, input_values)

    export: ->
        dependencies = @get_dependencies()
        subroutines:dependencies
        schema_version:schema_version

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
            @implementation = @subroutine
            @type = 'function'
        else
            @value = information.definition
            @implementation = information
            @memo = information.memo
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
            args = (input_values.concat [output_index])
            if @memo and @id not of the_scope.memos
                the_scope.memos[@id] = @memo args...
            return @value (args.concat [the_scope.memos[@id]])...

    toJSON: ->
        json = super()
        json.implementation_id = @implementation.id
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
        if @value instanceof SubRoutine
            json.implementation_id = @value.id
        else
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
        data =
            subroutines:@subroutines
            schema_version:schema_version
        @import_export_text = JSON.stringify data

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

    @use_builtin = (id) =>
        information = builtins[id]
        new FunctionApplication V(0,0), information.name, information

    @use_subroutine = (subroutine) =>
        new FunctionApplication V(0,0), subroutine.name,
            inputs:subroutine.get_inputs()
            outputs:subroutine.get_outputs()
            definition:subroutine

    @use_subroutine_value = (subroutine) =>
        new Literal V(0,0), subroutine.name, subroutine

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
                    result = prompt "Provide a JSON value for input #{input_index}: \"#{input.text}\""
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
            setTimeout subroutine.run output_index, input_values
        catch exception
            if exception instanceof InputError
                alert "Invalid JSON: #{exception.message}"
            else
                throw exception

    @run_builtin = (builtin, output_index) =>
        execute ->
            input_values = []
            for input, input_index in builtin.inputs
                do (input_index, input) ->
                    input_values.push ->
                        valid_json prompt "Provide a JSON value for input #{input_index}: \"#{input}\""

            args = input_values.concat [output_index]
            memo = builtin.memo_function? args...
            result = builtin.output_function (args.concat [memo])...
            return result
        
    save_state = =>
        state =
            subroutines:@subroutines
            schema_version:schema_version

        localStorage.state = JSON.stringify state

    @builtins = all_builtins

    if localStorage.state?
        data = JSON.parse localStorage.state
        try
            @subroutines = load_state data
            scene.add current_scope.view
        catch exception
            setTimeout -> throw exception # don't break this execution thread because of a loading exception
    else
        @load_example_programs()

    system_arrow = make_arrow V(0,0), V(1,0), false
    save_timer = setInterval save_state, 500

load_state = (data) ->
    subroutines = {}

    # load structures first
    for id, subroutine_data of data.subroutines
        subroutine = load_subroutine subroutine_data
        subroutines[subroutine.id] = subroutine

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
            information = builtins[node.implementation_id]
            name = information.name
            new FunctionApplication position, name, information, node.id
        else if node.type is 'literal'
            if 'implementation_id' of node
                sub_subroutine = all_subroutines[node.implementation_id]
                value = sub_subroutine
            else
                value = JSON.parse node.value
            new Literal position, node.text, value, node.id

    for connection in data.connections
        source = node_registry[connection.output.parent_id]
        sink = node_registry[connection.input.parent_id]

        # input/output reversal.  TODO: clean up subroutine implementation to avoid this
        source_connector = if source instanceof Node then source.outputs else source.inputs
        sink_connector = if sink instanceof Node then sink.inputs else sink.outputs

        if connection.output.index >= source_connector.length or connection.input.index >= sink_connector.length
            console.log "Oh no, trying to make an invalid connection"

        source_connector[connection.output.index].connect sink_connector[connection.input.index]

example_programs =
    playground:"""{"subroutines":{"2092fbbc04daf231793ce4d1d6761172":{"id":"2092fbbc04daf231793ce4d1d6761172","name":"playground","nodes":[],"connections":[],"inputs":[],"outputs":["OUT"]}}}"""
