#camera_radius = 250
editor_size = V 600,700
half_editor_size = editor_size.scale 0.5
camera = new THREE.OrthographicCamera 0, editor_size.x, editor_size.y, 0, -2000, 1000
#camera = new THREE.OrthographicCamera -camera_radius, camera_radius,
#     camera_radius, -camera_radius, -camera_radius, camera_radius
scene = new THREE.Scene()
scene.add camera
renderer = new THREE.CanvasRenderer()
renderer.setSize editor_size.x, editor_size.y #window.innerWidth, window.innerHeight
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
should_animate = false

update = ->
    renderer.render scene, camera

animations_counter = 0

animate = (field) ->
    requestAnimationFrame (-> animate field), field
    animations_counter += 1
    update()
eval_expression = (expression) -> eval "(#{expression})"

setInterval ->
    #console.log animations_counter
    animations_counter = 0
, 1000

### MODELS ###

class RuntimeException
    constructor: (@message) ->

class Exit extends RuntimeException
    constructor: -> @message = "Exit Signal"

class InputError extends RuntimeException
    constructor: -> @message = "Cancelled execution due to lack of input"

class NotConnected extends RuntimeException
    constructor: -> @message = "Something in the program is disconnected"

class NotImplemented extends RuntimeException
    constructor: (@name) -> @message = "Builtin \"#{@name}\" is not implemented"

class BuiltinSyntaxError extends RuntimeException
    constructor: (@name, @exception) -> @message = "#{exception} in builtin \"#{@name}\": "

class Builtin
    constructor:({@name, @output_implementation, @memo_implementation, @inputs, @outputs, @id}) ->
        @memo_implementation ?= null
        @inputs ?= []
        @outputs ?= ['OUT']
        @id ?= UUID()
        all_builtins[@id] = @

    type:'builtin'

    toJSON: ->
        id:@id
        name:@name
        inputs:@inputs
        outputs:@outputs
        memo_implementation:@memo_implementation
        output_implementation:@output_implementation

    export: ->
        builtins = {}
        builtins[@id] = @
        subroutines:{}
        builtins: builtins
        schema_version:schema_version

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

    type:'subroutine'

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
        throw new NotConnected unless output

        if output.parent instanceof SubRoutine
            return inputs[output.index]()
        else if output.parent instanceof Node
            return output.parent.evaluation the_scope, output.index

    get_inputs: -> (input.text for input in @inputs)
    get_outputs: -> (output.text for output in @outputs)

    run: (output_index, input_values) ->
        execute => @invoke(output_index, input_values)

    export: ->
        dependencies = @get_dependencies()
        dependencies.schema_version = schema_version
        dependencies

    get_dependencies: (dependencies={subroutines:{},builtins:{}}) ->
        dependencies.subroutines[@id] = @ if @id not of dependencies.subroutines
        for id, node of @nodes
            if node instanceof SubroutineApplication
                child_dependencies = node.implementation.get_dependencies dependencies
                _.extend dependencies.subroutines, child_dependencies.subroutines
                _.extend dependencies.builtins, child_dependencies.builtins
            else if node instanceof BuiltinApplication
                dependencies.builtins[@id] = node.implementation
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

    build_adjacency_list: ->
        # clear prior data
        for id, node of @nodes
            node.adjacency_id = null

        adjacency_list = []

        # number and add self first
        adjacency_list.push
            node:@
            connections:[]
        @adjacency_id = 0

        # number all the connected nodes in a predictable way, and add them to the list
        input_queue = [].concat @outputs
        while input_queue.length > 0
            input = input_queue.shift()
            node = input.get_node()
            # NOTE: if node is a subroutine then we've reached ourselves again
            if node instanceof Node and node.adjacency_id is null
                item_count = adjacency_list.push
                    node:node
                    connections:[]
                node.adjacency_id = item_count - 1 # length is offset by 1 from index
                input_queue = input_queue.concat node.inputs

        # record all the connections based on the consistent numbering scheme
        for item in adjacency_list
            nibs = if item.node instanceof Node then item.node.inputs else item.node.outputs
            for input, input_index in nibs
                node = input.get_node()
                item.connections[input_index] = node.adjacency_id

        adjacency_list


    remove_node: (node) ->
        @view.remove node.view
        delete @nodes[node.id]

    add_node: (node) ->
        @view.add node.view
        @nodes[node.id] = node
        
    remove_connection: (connection) ->
        @view.remove connection.view
        delete @connections[connection.id]

    add_connection: (connection) ->
        @view.add connection.view
        @connections[connection.id] = connection
    
class Node # Abstract
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

class FunctionApplication extends Node # Abstract
    constructor:({name, inputs, outputs}) ->
        @text = name
        super()
        @inputs = (new Input @, text, index, inputs.length-1 for text, index in inputs)
        @outputs = (new Output @, text, index, outputs.length-1 for text, index in outputs)

    evaluation: (the_scope, output_index) ->

    toJSON: ->
        json = super()
        json.implementation_id = @implementation.id
        json

    virtual_inputs: (the_scope) ->
        input_values = []
        for input in @inputs
            do (input) ->
                input_values.push _.memoize ->
                    output = input.get_connection()?.connection.output
                    throw new NotConnected unless output
                    if output.parent instanceof SubRoutine
                        return the_scope.inputs[output.index]()
                    else if output.parent instanceof Node
                        return output.parent.evaluation the_scope, output.index
        return input_values
        
class UnknownNode extends Node
    constructor:(@position, type, text, @id) ->
        @type = 'unknown'
        @text = "Unknown #{type}: #{text}"
        @inputs = []
        @outputs = []
        super()

class SubroutineApplication extends FunctionApplication
    constructor:(@position, @implementation, @id=UUID()) ->
        @type = 'function'
        super
            name:@implementation.name
            inputs:@implementation.get_inputs()
            outputs:@implementation.get_outputs()

    evaluation: (the_scope, output_index) ->
        input_values = @virtual_inputs the_scope
        return @implementation.invoke output_index, input_values

    subroutines_referenced: ->
        results = []
        for input in @inputs
            parent = input.get_connection()?.connection.output.parent
            if parent
                results.push parent.id if parent.type is 'function'
                resuts = results.concat parent.subroutines_referenced()
        return results
        
class BuiltinApplication extends FunctionApplication
    constructor:(@position, @implementation, @id=UUID()) ->
        @type = 'builtin'
        super @implementation
        
    evaluation: (the_scope, output_index) ->
        input_values = @virtual_inputs the_scope
        try
            memo_function = eval_expression @implementation.memo_implementation
            output_function = eval_expression @implementation.output_implementation
        catch exception
            if exception instanceof SyntaxError
                throw new BuiltinSyntaxError @text, exception
            else throw exception

        throw new NotImplemented @text unless output_function

        args = input_values.concat [output_index]
        if memo_function and @id not of the_scope.memos
            the_scope.memos[@id] = memo_function args...
        return output_function (args.concat [the_scope.memos[@id]])...

class LiteralValue
    constructor:(@text) ->
    evaluation: -> return eval_expression @text
    type:'literal'

class Literal extends Node
    constructor:(@position, value, @id=UUID()) ->
        @type = 'literal'

        # TODO: sort this out later
        if value instanceof SubRoutine
            @implementation = value
            @text = value.name
        else
            @implementation = new LiteralValue value
            @text = value
        super()
        @inputs = []
        @outputs = [new Output(@, 'OUT')]

    evaluation: -> @implementation.evaluation()

    toJSON: ->
        json = super()
        if @implementation instanceof SubRoutine
            json.implementation_id = @implementation.id
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

    get_node: ->
        @get_connection()?.connection.output.parent

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
    box_size = editor_size
    position = box_size.scale(1/2.0)
    box = make_box null, subroutine_mesh, 10, position
    box.model = subroutine
    boxes[box.id] = box
    return box

make_node_view = (node) ->
    main_box = make_box node.text, node_mesh, 10, node.position
    main_box.model = node
    node.scope.view.add main_box
    boxes[main_box.id] = main_box
    return main_box

make_nib_view = (nib, is_node) ->
    parent_size = if is_node then V(60,60) else editor_size.minus V 10,10

    y_offset = parent_size.y / 2.0

    x_position = -parent_size.x / 2.0 + parent_size.x * nib.index/nib.siblings
    y_position = y_offset * (if nib instanceof Input then 1 else -1) * (if is_node then 1 else -1)

    sub_box = make_box nib.text, nib_mesh, 5, V(x_position,y_position)
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
    centerOffset = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x)

    material = new THREE.MeshBasicMaterial color:0x000000, overdraw:true
    mesh = new THREE.Mesh geometry, material
    mesh.position.x = centerOffset
    return mesh

node_material = new THREE.MeshBasicMaterial color:0x888888
highlighted_node_material = new THREE.MeshBasicMaterial color:0x8888FF
subroutine_material = new THREE.MeshBasicMaterial color:0xEEEEEE

node_geometry = new THREE.PlaneGeometry 50,50
nib_geometry = new THREE.PlaneGeometry 20,20
subroutine_geometry = new THREE.PlaneGeometry editor_size.x,editor_size.y

node_mesh = [node_geometry, node_material]
nib_mesh = [nib_geometry, node_material]
subroutine_mesh = [subroutine_geometry, subroutine_material]

make_box = (name, mesh, text_size, position) ->
    box = new THREE.Object3D()
    box.add new THREE.Mesh mesh...

    if name
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
    V event.offsetX, editor_size.y-event.offsetY
    #V ((event.clientX / window.innerWidth) * 2 - 1), (-(event.clientY / window.innerHeight) * 2 + 1)

get_nib_position = (nib) ->
    if nib.parent instanceof Node
        Vector.from(nib.view.position).plus(nib.view.parent.position).three()
    else Vector.from(nib.view.position).three()

get_absolute_nib_position = (nib) ->
    Vector.from(get_nib_position(nib)).plus(half_editor_size).three()
    

### INTERACTION ###

dragging_object = null
connecting_object = null
dragging_offset = V 0,0

highlighted_objects = {}

highlight = (node) ->
    node.view.children[0].material = highlighted_node_material
    highlighted_objects[node.id] = node

unhighlight = (node) ->
    node.view.children[0].material = node_material
    delete highlighted_objects[node.id]

unhighlight_all = ->
    for id, obj of highlighted_objects
        unhighlight obj

whitespace_split = (input) ->
    results = input.split(/\s+/)
    results = results[1..] if results[0] is ''
    results

valid_json = (json) ->
    try
        return JSON.parse json
    catch exception
        if exception instanceof SyntaxError
            alert "#{exception} Invalid JSON: #{json}"
            false
        else
            throw exception

pretty_json = (obj) -> JSON.stringify obj, undefined, 2

window.Controller = ($http) ->


    init_field = ->
        if not should_animate
            field = $("#field")
            field.append renderer.domElement
            should_animate = true
            animate field[0]
            field.mousedown mouse_down
            field.mouseup mouse_up
            field.mousemove mouse_move
            field.bind 'contextmenu', -> false

    teardown_field = ->
        should_animate = false

    mouse_down = (event) =>
        event.preventDefault()
        target = ray_cast_mouse()
        if target
            if target.model instanceof Node
                if event.which is 3
                    target.model.delete()
                else if event.shiftKey
                    highlight target.model
                else if event.ctrlKey
                    @edit target.model.implementation
                    @$digest()
                else
                    dragging_object = target
            else if target.model instanceof Nib
                if event.which is 3
                    target.model.delete_connections()
                else
                    system_arrow.geometry.vertices[0].position = system_arrow.geometry.vertices[1].position = get_absolute_nib_position target.model
                    scene.add system_arrow
                    connecting_object = target
            else
                unless event.shiftKey
                    unhighlight_all()

    mouse_up = (event) =>
        dragging_object = null

        if connecting_object
            target = ray_cast_mouse()
            if target?.model instanceof Nib
                connection = make_connection connecting_object, target
            connecting_object = null
            scene.remove system_arrow

    mouse_move = (event) =>
        mouse_vector = mouse_coords(event)
        adjusted_vector = mouse_vector.minus(half_editor_size)
        vector = mouse_vector.three()
        if dragging_object
            node = dragging_object.model
            original_position = Vector.from node.view.position
            delta = adjusted_vector.minus original_position

            effected_nodes = if node.id of highlighted_objects then _.values highlighted_objects else [node]

            for node in effected_nodes
                node.set_position Vector.from(node.position).plus(delta).three()
                for nib in node.get_nibs()
                    for id, connection of nib.connections
                        connection.vertex.position.copy get_nib_position nib

        if connecting_object
            system_arrow.geometry.vertices[1].position = vector

    hide_subroutines = =>
        for index, subroutine of @subroutines
            scene.remove subroutine.view

    saving = false
    start_saving = -> setInterval save_state, 500 if not saving
    @log = (expression) -> console.log expression

    @current_object = null
    @import_export_text = ''
    @subroutines = {}
    @builtins = {}
    @import = ->
        hide_subroutines()
        import_data valid_source @import_export_text
        @edit current_scope if current_scope
        start_saving()

    import_data = (source_data) =>
        data = load_state source_data
        for id, subroutine of data.subroutines
            @subroutines[subroutine.id] = subroutine
        for id, builtin of data.builtins
            @builtins[builtin.id] = builtin

    @load_example_programs = =>
        hide_subroutines()
        $http.get('examples.json').success (source_data) =>
            import_data source_data

            # make the playground
            playground = new SubRoutine 'playground'
            @subroutines[playground.id] = playground
            @edit playground
            start_saving()

    @export_all = ->
        data =
            subroutines:@subroutines
            builtins:@builtins
            schema_version:schema_version
        @import_export_text = pretty_json data

    @export_subroutine = (subroutine) =>
        @import_export_text = pretty_json subroutine.export()

    @export_builtin = (builtin) =>
        @import_export_text = pretty_json builtin.export()

    @revert = ->
        hide_subroutines()
        @subroutines = {}
        @builtins = {}
        @load_example_programs()

    @literal_text = ''
    @use_literal = =>
        if valid_json @literal_text
            new Literal V(0,0), @literal_text
            @literal_text = ''

    @use_builtin = (builtin) =>
        new BuiltinApplication V(0,0), builtin

    @use_subroutine = (subroutine) =>
        new SubroutineApplication V(0,0), subroutine

    @use_subroutine_value = (subroutine) =>
        new Literal V(0,0), subroutine

    @initial_subroutine =
        name:''
        inputs:[]
        outputs:[]
    @new_subroutine = angular.copy @initial_subroutine

    @delete_subroutine = (subroutine) =>
        if subroutine.id is current_scope.id
            @current_object = null
            teardown_field()
        delete @subroutines[subroutine.id]

    @delete_builtin = (builtin) =>
        delete @builtins[builtin.id]

    @add_subroutine = =>
        subroutine = new SubRoutine @new_subroutine.name, @new_subroutine.inputs, @new_subroutine.outputs

        # first find all the connections
        in_connections = {}
        out_connections = {}
        for id, node of highlighted_objects
            for id, nib of node.inputs
                for id, connection of nib.connections
                    in_connections[connection.connection.id] = connection.connection
            for id, nib of node.outputs
                for id, connection of nib.connections
                    out_connections[connection.connection.id] = connection.connection

        # see which ones are contained in the system
        contained_connections = {}
        for id, connection of in_connections
            if connection.id of out_connections
                contained_connections[connection.id] = connection
                delete in_connections[connection.id]
                delete out_connections[connection.id]

        # move the contained ones
        for id, connection of contained_connections
            current_scope.remove_connection connection
            subroutine.add_connection connection
        
        # clip the others
        for id, connection of in_connections
            connection.delete()

        for id, connection of out_connections
            connection.delete()

        # move the nodes
        for id, node of highlighted_objects
            current_scope.remove_node node
            subroutine.add_node node

        @subroutines[subroutine.id] = subroutine
        @new_subroutine = angular.copy @initial_subroutine
        @new_subroutine.inputs = []
        @new_subroutine.outputs = []
        @edit subroutine

    @add_builtin = =>
        builtin = new Builtin {}
        @builtins[builtin.id] = builtin
        @edit builtin

    @run_subroutine = (subroutine, output_index) =>
        input_values = []
        for input, input_index in subroutine.inputs
            do (input_index, input) ->
                value = _.memoize ->
                    result = prompt "Provide a JSON value for input #{input_index}: \"#{input.text}\""
                    throw new Exit "cancelled execution" if result is null
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
        execute =>
            input_values = []
            for input, input_index in builtin.inputs
                do (input_index, input) ->
                    input_values.push ->
                        valid_json prompt "Provide a JSON value for input #{input_index}: \"#{input}\""

            the_scope = memos:{}

            # lifted from evaluation.  TODO: add to builtin class
            try
                memo_function = eval_expression builtin.memo_implementation
                output_function = eval_expression builtin.output_implementation
            catch exception
                if exception instanceof SyntaxError
                    throw new BuiltinSyntaxError builtin.text, exception
                else throw exception

            throw new NotImplemented builtin.text unless output_function

            args = input_values.concat [output_index]
            memo = memo_function args... if memo_function
            return output_function (args.concat [memo])...

    @edit = (value) =>
        @current_object = value
        if value instanceof SubRoutine
            current_scope = value
            hide_subroutines()
            scene.add value.view
            setTimeout init_field
            console.log value.build_adjacency_list()
        else
            teardown_field()

    save_state = =>
        state =
            subroutines:@subroutines
            builtins:@builtins
            schema_version:schema_version

        localStorage.state = JSON.stringify state

    @builtins = all_builtins
    system_arrow = make_arrow V(0,0), V(1,0), false

    if localStorage.state?
        #dissociate_exception =>
            data = JSON.parse localStorage.state
            loaded_state = load_state data
            @builtins = loaded_state.builtins
            @subroutines = loaded_state.subroutines
            current_scope = obj_first @subroutines
            @edit current_scope if current_scope
            start_saving()
    else
        @load_example_programs()

dissociate_exception = (procedure) ->
    try
        procedure()
    catch exception
        setTimeout -> throw exception # don't break this execution thread because of a loading exception
    

execute = (routine) ->
    try
        alert JSON.stringify routine()
    catch exception
        if exception instanceof RuntimeException
            alert "Error: #{exception.message}"
        else throw exception

ignore_if_disconnected = (procedure) ->
   try
      return procedure()
   catch exception
      throw exception unless exception instanceof NotConnected

load_state = (data) ->
    subroutines = {}
    builtins = {}

    # load builtins
    for id, builtin_data of data.builtins
        builtin = new Builtin builtin_data
        builtins[builtin.id] = builtin

    # load subroutine declarations
    for id, subroutine_data of data.subroutines
        subroutine = new SubRoutine subroutine_data.name, subroutine_data.inputs, subroutine_data.outputs, subroutine_data.id
        subroutines[subroutine.id] = subroutine

    # load subroutine implementations
    for id, subroutine of subroutines
        current_scope = subroutine
        load_implementation data.subroutines[id]

    subroutines:subroutines
    builtins:builtins
    
make_main = ->
    new SubRoutine 'default', [], ['OUT']

load_implementation = (data) ->
    for node in data.nodes
        position = Vector.from(node.position)
        if node.type is 'function'
            subroutine = all_subroutines[node.implementation_id]
            if subroutine
                new SubroutineApplication position, subroutine, node.id
            else
                new UnknownNode position, node.type, node.text, node.id
        else if node.type is 'builtin'
            builtin = all_builtins[node.implementation_id]
            if builtin
                new BuiltinApplication position, builtin, node.id
            else
                new UnknownNode position, node.type, node.text, node.id
        else if node.type is 'literal'
            if 'implementation_id' of node
                subroutine = all_subroutines[node.implementation_id]
                value = subroutine
            else
                value = node.text
            new Literal position, value, node.id

    for connection in data.connections
        source = node_registry[connection.output.parent_id]
        sink = node_registry[connection.input.parent_id]

        # input/output reversal.  TODO: clean up subroutine implementation to avoid this
        source_connector = if source instanceof Node then source.outputs else source.inputs
        sink_connector = if sink instanceof Node then sink.inputs else sink.outputs

        if connection.output.index >= source_connector.length or connection.input.index >= sink_connector.length
            console.log "Oh no, trying to make an invalid connection"
        else
            source_connector[connection.output.index].connect sink_connector[connection.input.index]

playground_id = UUID()
