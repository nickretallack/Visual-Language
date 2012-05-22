editor_size = V window.innerWidth,window.innerHeight
V(1,1).plus(V(2,2))

module = angular.module 'vislang', []

module.directive 'nib', ->
    template:"""<div class="nib"></div>"""
    replace:true
    transclude:true
    require:'^subroutine'
    scope:
        nib:'accessor'
    link:(scope, element, attributes, controller) ->
        nib = scope.nib()
        nib.view = $ element
        element.bind 'mousedown', (event) -> scope.$apply ->
            controller.click_nib nib, event
        element.bind 'mouseup', (event) -> scope.$apply ->
            controller.release_nib nib, event


module.directive 'shrinkyInput', ->
    (scope, element, attributes) ->
        doppelganger = $ """<span class="offscreen"></span>"""
        $element = $ element
        doppelganger.css
            padding:$element.css 'padding'
            border:$element.css 'border'
            'min-width':'3ex'
            position:'absolute'
            left:'-9999px'
            top:'-9999px'
        $(document.body).append doppelganger
        scope.$watch attributes.shrinkyInput, (text) ->
            doppelganger.text text
            async ->
                $(element).css width:doppelganger.width()+2
                scope.draw_connections()


async = setTimeout
delay = (time, procedure) -> setTimeout procedure, time

module.directive 'connections', ->
    link:(scope, element, attributes) ->

transform_position = (position, editor_size) ->
    x:position.y + editor_size.x/2
    y:position.x + editor_size.y/2

###
module.directive 'node', ->
    link:(scope, element, attributes) ->
        node = scope.$eval attributes.node
###

module.directive 'subroutine', ->
    link:(scope, element, attributes) ->
    controller:($scope, $element, $attrs) ->
        $$element = $ $element
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

        $scope.mouse_position = V 0,0
        $element.bind 'mousemove', (event) -> $scope.$apply ->
            new_mouse_position = V event.clientX, event.clientY
            mouse_delta = $scope.mouse_position.minus new_mouse_position
            $scope.mouse_position = new_mouse_position
            for node in $scope.dragging
                node.position = node.position.plus V -mouse_delta.y, -mouse_delta.x

            draw()
        $element.bind 'mouseup', (event) -> $scope.$apply ->
            $scope.dragging = []
            $scope.drawing = null
            draw()

        $scope.dragging = []
        $scope.click_node = (node, $event) ->
            console.log "click node"
            $event.preventDefault()
            $scope.dragging = [node]

        $scope.drawing = null
        this.click_nib = $scope.click_nib = (nib, $event) ->
            console.log "click nib"
            $event.preventDefault()
            $event.stopPropagation()
            $scope.drawing = nib

        this.release_nib = $scope.release_nib = (nib) ->
            if $scope.drawing
                [from, to] = [nib, $scope.drawing]
                if from isnt to and not ((from instanceof Input and to instanceof Input) or (from instanceof Output and to instanceof Output))
                    from.connect to

        $scope.evaluate_output = (output) ->
            subroutine.run output


        $scope.literal_text = ''
        $scope.use_literal = =>
            if valid_json $scope.literal_text
                new Literal V(0,0), $scope.literal_text
                $scope.literal_text = ''



        $scope.draw_connections = -> draw()

        subroutine = $scope.$eval $attrs.subroutine

        header_height = 30
        nib_center = V 5,5
        canvas_offset = V(0,header_height)
        nib_offset = canvas_offset.minus nib_center

        canvas = $element.find('canvas')[0]
        draw = -> async ->
            if subroutine
                line_height = 16
                c = canvas.getContext '2d'
                c.clearRect 0,0, $scope.editor_size.components()...
                for id, connection of subroutine.connections
                    input_element = connection.input.view
                    output_element = connection.output.view

                    if input_element and output_element
                        input_position = V(input_element.offset()).subtract nib_offset
                        output_position = V(output_element.offset()).subtract nib_offset
                        c.beginPath()
                        c.moveTo input_position.components()...
                        c.lineTo output_position.components()...
                        c.stroke()

                if $scope.drawing
                    nib_position = V($scope.drawing.view.offset()).subtract nib_offset
                    end_position = $scope.mouse_position.subtract canvas_offset
                    c.beginPath()
                    c.moveTo nib_position.components()...
                    c.lineTo end_position.components()...
                    c.stroke()



        resize_canvas = ->
            $scope.editor_size = V $$element.width(), $$element.height()
            [canvas.width, canvas.height] = $scope.editor_size.components()
            draw()
        $(window).on 'resize', -> $scope.$apply resize_canvas
        resize_canvas()


module.config ($routeProvider) ->
    $routeProvider.when '/:id', controller:'subroutine', template:"subroutine.html"
    $routeProvider.when '', template:"intro.html"

module.controller 'subroutine', ($scope, $routeParams, subroutines, $q) ->
    $q.when subroutines, (subroutines) ->
        $scope.$root.current_object = subroutines[$routeParams.id]

module.controller 'library', ($scope, subroutines, $q) ->
    $scope.subroutines = subroutines

    $scope.use = (subroutine) =>
        if subroutine instanceof SubRoutine
            new SubroutineApplication $scope.$root.current_object, V(0,0), subroutine
        else
            new BuiltinApplication $scope.$root.current_object, V(0,0), subroutine

    $scope.use_value = (subroutine) =>
        new Literal $scope.$root.current_object, V(0,0), subroutine



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


### FACTORIES ###

make_connection = (source, target) ->
    if source.model instanceof Input
        input = source.model
        output = target.model
    else
        input = target.model
        output = source.model
    return new Connection input, output

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
        subroutine.run output_index

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


