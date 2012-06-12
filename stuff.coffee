module = angular.module 'vislang', []

async = setTimeout
delay = (time, procedure) -> setTimeout procedure, time

transform_position = (position, editor_size) ->
    x:position.y + editor_size.x/2
    y:position.x + editor_size.y/2

module.run ($rootScope) ->
    $rootScope.search = ''

module.directive 'ace', ->
    scope:
        ace:'accessor'
    link:(scope, element, attributes) ->
        expression = attributes.ace
        JavaScriptMode = require("ace/mode/javascript").Mode

        editor = ace.edit element[0]
        session = editor.getSession()
        session.setMode new JavaScriptMode()

        changing = false
        set_value = null
        scope.$watch 'ace()', (value) ->
            if value isnt set_value
                changing = true
                session.setValue value
                changing = false

        session.on 'change', ->
            unless changing
                scope.$apply ->
                    set_value = session.getValue()
                    scope.ace set_value


module.directive 'nib', ->
    template:"""<div class="nib"></div>"""
    replace:true
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
    #require:'^subroutine'
    link:(scope, element, attributes, controller) ->
        doppelganger = $ """<span class="offscreen"></span>"""
        $element = $ element
        doppelganger.css
            padding:$element.css 'padding'
            border:$element.css 'border'
            'font-size':$element.css 'font-size'
            'min-width':'3ex'
            position:'absolute'
            left:'-9999px'
            top:'-9999px'
        $(document.body).append doppelganger
        scope.$watch attributes.shrinkyInput, (text) ->
            doppelganger.text text + "M"
            async ->
                $(element).css width:doppelganger.width()+2
                controller?.draw()

module.directive 'subroutine', ($location) ->
    link:(scope, element, attributes) ->
    controller:($scope, $element, $attrs, interpreter) ->
        $$element = $ $element
        subroutine = $scope.$eval $attrs.subroutine
        $scope.dragging = []
        $scope.drawing = null # nib you're drawing a line from right now

        $scope.evaluate_output = (output) ->
            subroutine.run output

        $scope.new_input =  ->
            nib = new interpreter.Output
            subroutine.inputs.push nib
            async -> $('.subroutine-input:last input').focus()

        $scope.new_output =  ->
            nib = new interpreter.Input
            subroutine.outputs.push nib
            async -> $('.subroutine-output:last input').focus()

        $scope.delete_input = ($index) ->
            [nib] = subroutine.inputs.splice $index, 1
            nib.delete_connections()

        $scope.delete_output = ($index) ->
            [nib] = subroutine.outputs.splice $index, 1
            nib.delete_connections()

        ### Node and nib interaction ###
        $scope.position = (node) ->
            position = transform_position node.position, $scope.editor_size
            left:position.x + 'px'
            top:position.y + 'px'

        $scope.click_node = (node, $event) ->
            $event.preventDefault()
            $scope.dragging = [node]

        $scope.edit_node = (node, $event) ->
            $event.preventDefault()
            $location.path "/#{node.implementation.id}" unless node instanceof interpreter.Literal

        $scope.name_node = (node) ->
            node.text or node.implementation.id[0..5]

        this.click_nib = $scope.click_nib = (nib, $event) ->
            $event.preventDefault()
            $event.stopPropagation()
            $scope.drawing = nib

        this.release_nib = $scope.release_nib = (nib) ->
            if $scope.drawing
                [from, to] = [nib, $scope.drawing]
                if from isnt to and not (
                    (from instanceof interpreter.Input and to instanceof interpreter.Input) or
                    (from instanceof interpreter.Output and to instanceof interpreter.Output)
                )
                    from.connect to

        $element.bind 'mouseup', (event) -> $scope.$apply ->
            $scope.dragging = []
            $scope.drawing = null
            draw()

        $scope.mouse_position = V 0,0
        $element.bind 'mousemove', (event) -> $scope.$apply ->
            new_mouse_position = V event.clientX, event.clientY
            mouse_delta = $scope.mouse_position.minus new_mouse_position
            $scope.mouse_position = new_mouse_position
            for node in $scope.dragging
                node.position = node.position.plus V -mouse_delta.y, -mouse_delta.x
            draw()

        ### Drawing the Connection Field ###
        header_height = 40
        nib_center = V 5,5
        canvas_offset = V(0,header_height)
        nib_offset = canvas_offset.minus nib_center
        canvas = $element.find('canvas')[0]
        @draw = draw = -> async ->
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

module.controller 'subroutine', ($scope, $routeParams, interpreter, $q) ->
    $q.when interpreter.loaded, ->
        $scope.$root.current_object = interpreter.subroutines[$routeParams.id]

module.controller 'library', ($scope, $q, interpreter) ->

    $scope.get_subroutines = ->
        _.values interpreter.subroutines

    hide = -> $scope.$root.overlay = null

    $scope.use = (subroutine) =>
        if subroutine instanceof interpreter.Subroutine
            new interpreter.SubroutineApplication $scope.$root.current_object, V(0,0), subroutine
        else
            new interpreter.BuiltinApplication $scope.$root.current_object, V(0,0), subroutine
        hide()

    $scope.use_value = (subroutine) =>
        new interpreter.Literal $scope.$root.current_object, V(0,0), subroutine
        hide()

    $scope.literal_text = ''
    $scope.use_literal = =>
        if valid_json $scope.literal_text
            new interpreter.Literal $scope.$root.current_object, V(0,0), $scope.literal_text
            $scope.literal_text = ''
            hide()

    $scope.name_subroutine = (subroutine) ->
        subroutine.name or subroutine.id[0..20]

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

module.controller 'Controller', ($scope, $http, $location, interpreter, $q) ->
    $scope.tab_click = (tab) ->
        $scope.$root.overlay = if $scope.$root.overlay is tab then null else tab

    make_something = (type) ->
        $q.when interpreter.loaded, ->
            subroutine = new type
            interpreter.subroutines[subroutine.id] = subroutine
            $location.path "#{subroutine.id}"

    $scope.new_graph = ->
        make_something interpreter.Subroutine

    $scope.new_code = ->
        make_something interpreter.Builtin



    ###
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
        subroutine = new Subroutine $scope.new_subroutine.name, $scope.new_subroutine.inputs, $scope.new_subroutine.outputs

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
    ###

