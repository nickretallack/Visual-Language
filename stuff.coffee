editor_size = V window.innerWidth,window.innerHeight
V(1,1).plus(V(2,2))

module = angular.module 'vislang', []

module.directive 'linkNib', ->
    (scope, element, attributes) ->
        nib = scope.$eval attributes.linkNib
        nib.view = $ element
        #console.log nib, element

module.directive 'shrinkyInput', ->
    (scope, element, attributes) ->
        doppelganger = $ """<span class="offscreen"></span>"""
        $(document.body).append doppelganger
        scope.$watch attributes.shrinkyInput, (text) ->
            doppelganger.text text
            console.log text, doppelganger.width()
            async ->
                $(element).css  width:doppelganger.width()
                scope.draw_connections()


###
module.directive 'node', ->
    template:"""
    <div class="node">
        <tr ng:repeat=>
            <td class="input">#{input?.text or ''}</td>
            <td class="output">#{output?.text or ''}</td>
        </tr>
    </div> 
    """
    link:(scope, element, attributes) ->
        node_position = connection.input.parent.position
                    if node_position
                        position = transform_position node_position, scope.editor_size
                   

        scope.$watch attributes.io, (node) ->
            element.html ''
            for [input,output] in _.zip(node.inputs, node.outputs)
                row = $ """<tr>
                    <td class="input">#{input?.text or ''}</td>
                    <td class="output">#{output?.text or ''}</td>
                </tr>"""
                element.append row
                console.log row.find('.input').css 'left'
###



###
module.directive 'io', ->
    (scope, element, attributes) ->
        scope.$watch attributes.io, (node) ->
            element.html ''
            for [input,output] in _.zip(node.inputs, node.outputs)
                row = $ """<tr>
                    <td class="input">#{input?.text or ''}</td>
                    <td class="output">#{output?.text or ''}</td>
                </tr>"""
                element.append row
                row.find('.input')
                console.log row.find('.input').css 'left'
###

async = setTimeout
delay = (time, procedure) -> setTimeout procedure, time

module.directive 'connections', ->
    link:(scope, element, attributes) ->

transform_position = (position, editor_size) ->
    x:position.y + editor_size.x/2
    y:position.x + editor_size.y/2

module.directive 'node', ->
    link:(scope, element, attributes) ->
        node = scope.$eval attributes.node
        $(element).on 'mousedown', (event) -> scope.$apply ->
            event.preventDefault()
            console.log "CLICK"
            scope.set_selection node


module.directive 'subroutine', ->
    link:(scope, element, attributes) ->
        ###
        scope.$watch attributes.subroutine, (subroutine) ->
            for node in subroutine.nodes
                node = $ """

                """



            for 
            element.html ''
            for [input,output] in _.zip(node.inputs, node.outputs)
                row = $ """<tr>
                    <td class="input">#{input?.text or ''}</td>
                    <td class="output">#{output?.text or ''}</td>
                </tr>"""
                element.append row
                console.log row.find('.input').css 'left'
        ###

    controller:($scope, $element, $attrs) ->
        $$element = $ $element
        $scope.editor_size = V $$element.width(), $$element.height()
        $scope.position = (node) ->
            position = transform_position node.position, $scope.editor_size
            left:position.x + 'px'
            top:position.y + 'px'
        $scope.pairs = (node) ->
            pairs = []
            for index in [0...Math.max node.inputs.length, node.outputs.length]
            #for input, output in _.zip(node.inputs, node.outputs)
                pairs.push input:node.inputs[index], output:node.outputs[index]
            pairs

        $scope.selection = []
        $scope.set_selection = (node) ->
            console.log "selection is set"
            $scope.selection = [node]

        $scope.mouse_position = V 0,0
        $element.bind 'mousemove', (event) -> $scope.$apply ->
            console.log "moving"
            new_mouse_position = V event.clientX, event.clientY
            mouse_delta = $scope.mouse_position.minus new_mouse_position
            $scope.mouse_position = new_mouse_position
            for node in $scope.selection
                node.position = node.position.plus V -mouse_delta.y, -mouse_delta.x
            draw()
        $element.bind 'mouseup', (event) -> $scope.$apply ->
            $scope.selection = []

        $scope.draw_connections = -> draw()

        subroutine = null
        header_height = 30
        nib_center = V 5,5
        canvas_offset = V(0,header_height).minus nib_center
        
        canvas = $element.find('canvas')[0]
        subroutine = $scope.$eval $attrs.subroutine
        draw = -> async ->
            if subroutine
                line_height = 16
                c = canvas.getContext '2d'
                c.clearRect 0,0, $scope.editor_size.components()...
                for id, connection of subroutine.connections
                    #console.log connection, connection.input, connection.input.view
                    input_element = connection.input.view
                    output_element = connection.output.view

                    if input_element and output_element
                        input_position = V(input_element.offset()).subtract canvas_offset
                        output_position = V(output_element.offset()).subtract canvas_offset
                        c.beginPath()
                        c.moveTo input_position.components()...
                        c.lineTo output_position.components()...
                        c.stroke()

        resize_canvas = ->
            canvas.width = $(canvas).width()
            canvas.height = $(canvas).height()
            draw()
        $(window).on 'resize', resize_canvas
        resize_canvas()


module.config ($routeProvider) ->
    $routeProvider.when '/:id', controller:'subroutine', template:"subroutine.html"

module.controller 'subroutine', ($scope, $routeParams, subroutines, $q) ->
    $q.when subroutines, (subroutines) ->
        $scope.current_object = subroutines[$routeParams.id]
        #console.log $scope.current_object, $routeParams.id, subroutines

module.controller 'library', ($scope, subroutines, $q) ->
    $scope.subroutines = subroutines

###
<ul class="inputs"><li ng-repeat="input in node.inputs">{{input.text}}</li></ul>
<ul class="outputs"><li ng-repeat="output in node.outputs">{{output.text}}</li></ul>


module.directive 'subroutine', ->
    (scope, element, attributes) ->
        graphics = Raphael element[0], editor_size.components()...
        scope.$watch attributes.subroutine, (subroutine) ->
            graphics.clear()
            for id, node of subroutine.nodes
                new NodeView graphics, node
###

blab = -> console.log arguments

class NodeView
    constructor: (@graphics, @node) ->
        @set = graphics.set()

        size = V(50,50)

        # account for the fact that the origin is in the middle, and y
        # has its sign reversed
        editor_offset = editor_size.scale 0.5
        position = V(node.position).plus editor_offset
        position.y = editor_size.y - position.y

        @text = graphics.text position.x, position.y+10, node.text
        @text.attr 'text-anchor', 'middle'
        @set.push @text
        text_width = @text.getBBox().width

        corner_position = position.minus V(text_width/2, 0)
        @shape = graphics.rect corner_position.x-5, corner_position.y, text_width+10,size.y
        @shape.attr 'fill', 'blue'
        @set.push @shape

        @shape.drag blab, blab, blab

    
last = (list) -> list[list.length-1]
obj_first = (obj) ->
    for key, item of obj
        return item

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


### VIEWS ###

make_subroutine_view = (subroutine) ->
###
    box_size = editor_size
    position = box_size.scale(1/2.0)
    box = make_box null, subroutine_mesh, 10, position
    box.model = subroutine
    boxes[box.id] = box
    return box
###

make_node_view = (node) ->
###
    main_box = make_box node.text, node_mesh, 10, node.position
    main_box.model = node
    node.scope.view.add main_box
    boxes[main_box.id] = main_box
    return main_box
###

make_nib_view = (nib, is_node) ->
###
    parent_size = if is_node then V(60,60) else editor_size.minus V 10,10

    y_offset = parent_size.y / 2.0

    x_position = -parent_size.x / 2.0 + parent_size.x * nib.index/nib.siblings
    y_position = y_offset * (if nib instanceof Input then 1 else -1) * (if is_node then 1 else -1)

    sub_box = make_box nib.text, nib_mesh, 5, V(x_position,y_position)
    sub_box.model = nib

    parent = nib.parent.view
    parent.add sub_box
    return sub_box
###

connection_view = (connection) ->
###
    point1 = get_nib_position connection.input
    point2 = get_nib_position connection.output
    arrow = make_arrow point1, point2
    [arrow, arrow.geometry.vertices[0], arrow.geometry.vertices[1]]
###
            

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

###
node_material = new THREE.MeshBasicMaterial color:0x888888
highlighted_node_material = new THREE.MeshBasicMaterial color:0x8888FF
subroutine_material = new THREE.MeshBasicMaterial color:0xEEEEEE

node_geometry = new THREE.PlaneGeometry 50,50
nib_geometry = new THREE.PlaneGeometry 20,20
subroutine_geometry = new THREE.PlaneGeometry editor_size.x,editor_size.y

node_mesh = [node_geometry, node_material]
nib_mesh = [nib_geometry, node_material]
subroutine_mesh = [subroutine_geometry, subroutine_material]
###

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

module.controller 'Controller', ($scope, $http, $location) ->
    $scope.overlay = null
    $scope.tab_click = (tab) ->
        $scope.overlay = if $scope.overlay is tab then null else tab


    ###
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
                    $scope.edit target.model.implementation
                    $scope.$digest()
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

    ###
    saving = false
    start_saving = -> #setInterval save_state, 500 if not saving
    $scope.log = (expression) -> console.log expression

    $scope.import_export_text = ''
    $scope.subroutines = {}
    $scope.builtins = {}
    $scope.import = ->
        import_data valid_source $scope.import_export_text
        $scope.edit current_scope if current_scope
        start_saving()

    import_data = (source_data) =>
        data = load_state source_data
        for id, subroutine of data.subroutines
            $scope.subroutines[subroutine.id] = subroutine
        for id, builtin of data.builtins
            $scope.builtins[builtin.id] = builtin

    $scope.export_all = ->
        data =
            subroutines:$scope.subroutines
            builtins:$scope.builtins
            schema_version:schema_version
        $scope.import_export_text = pretty_json data

    $scope.export_subroutine = (subroutine) =>
        $scope.import_export_text = pretty_json subroutine.export()

    $scope.export_builtin = (builtin) =>
        $scope.import_export_text = pretty_json builtin.export()

    $scope.revert = ->
        $scope.subroutines = {}
        $scope.builtins = {}
        $scope.load_example_programs()

    $scope.literal_text = ''
    $scope.use_literal = =>
        if valid_json $scope.literal_text
            new Literal V(0,0), $scope.literal_text
            $scope.literal_text = ''

    $scope.use_builtin = (builtin) =>
        new BuiltinApplication V(0,0), builtin

    $scope.use_subroutine = (subroutine) =>
        new SubroutineApplication V(0,0), subroutine

    $scope.use_subroutine_value = (subroutine) =>
        new Literal V(0,0), subroutine

    $scope.initial_subroutine =
        name:''
        inputs:[]
        outputs:[]
    $scope.new_subroutine = angular.copy $scope.initial_subroutine

    $scope.delete_subroutine = (subroutine) =>
        if subroutine.id is current_scope.id
            $scope.current_object = null
            teardown_field()
        delete $scope.subroutines[subroutine.id]

    $scope.delete_builtin = (builtin) =>
        delete $scope.builtins[builtin.id]

    $scope.add_subroutine = =>
        subroutine = new SubRoutine $scope.new_subroutine.name, $scope.new_subroutine.inputs, $scope.new_subroutine.outputs

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

        $scope.subroutines[subroutine.id] = subroutine
        $scope.new_subroutine = angular.copy $scope.initial_subroutine
        $scope.new_subroutine.inputs = []
        $scope.new_subroutine.outputs = []
        $scope.edit subroutine

    $scope.add_builtin = =>
        builtin = new Builtin {}
        $scope.builtins[builtin.id] = builtin
        $scope.edit builtin

    $scope.run_subroutine = (subroutine, output_index) ->
        if subroutine instanceof SubRoutine
            run_subroutine subroutine, output_index
        else
            run_native_routine subroutine, output_index

    run_subroutine = (subroutine, output_index) ->
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

    run_native_routine = (builtin, output_index) ->
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

    save_state = =>
        state =
            subroutines:$scope.subroutines
            builtins:$scope.builtins
            schema_version:schema_version

        localStorage.state = JSON.stringify state

    #system_arrow = make_arrow V(0,0), V(1,0), false


module.factory 'subroutines', ($q, $http) ->
    if false #localStorage.state?
        source_data = JSON.parse localStorage.state
    else
        source_data = $q.defer()
        $http.get('examples.json').success (data) ->
            source_data.resolve data

    $q.when source_data.promise, (source_data) ->
        data = load_state source_data
        subroutines = $.extend data.builtins, data.subroutines
        subroutines


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

