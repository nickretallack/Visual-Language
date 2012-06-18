module = angular.module 'vislang', []

window.async = setTimeout
window.delay = (time, procedure) -> setTimeout procedure, time

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

module.config ($routeProvider) ->
    $routeProvider.when '/:id', controller:'subroutine', template:"subroutine.html"
    $routeProvider.when '', template:"intro.html"

module.controller 'subroutine', ($scope, $routeParams, interpreter, $q) ->
    $q.when interpreter.loaded, ->
        $scope.$root.current_object = interpreter.subroutines[$routeParams.id]

module.controller 'library', ($scope, $q, interpreter) ->

    $scope.get_subroutines = ->
        _.values interpreter.subroutines

    $scope.use = (subroutine) ->
        if subroutine instanceof interpreter.Subroutine
            new interpreter.SubroutineApplication $scope.$root.current_object, V(0,0), subroutine
        else
            new interpreter.BuiltinApplication $scope.$root.current_object, V(0,0), subroutine

    $scope.use_value = (value) ->
        new interpreter.Literal $scope.$root.current_object, V(0,0), value

    $scope.is_valid_json = is_valid_json

    $scope.literal_text = ''
    $scope.use_literal = =>
        if valid_json $scope.literal_text
            new interpreter.Literal $scope.$root.current_object, V(0,0), $scope.literal_text
            $scope.literal_text = ''
            hide()

    $scope.name_subroutine = (subroutine) ->
        subroutine.text or subroutine.id[0..20]

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

is_valid_json = (json) ->
    try
        JSON.parse json
        return true
    catch exception
        return false

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
            subroutine = (new type).initialize()
            $location.path "#{subroutine.id}"

    $scope.new_graph = ->
        make_something interpreter.Subroutine

    $scope.new_code = ->
        make_something interpreter.Builtin

    $scope.new_graph_from_selection = ->
        $scope.$broadcast 'new-graph-from-selection'


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

