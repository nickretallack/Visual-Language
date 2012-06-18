module = angular.module 'vislang', []

window.async = setTimeout
window.delay = (time, procedure) -> setTimeout procedure, time

module.run ($rootScope) ->
    $rootScope.search = ''

module.filter 'text_or_id', ->
    (obj, length) ->
        obj.text or obj.id

module.directive 'ace', ->
    restrict: 'A'
    require: '?ngModel'
    #scope:
    #    ace:'='
    link:(scope, element, attributes, ngModel) ->
        # set up ace
        JavaScriptMode = require("ace/mode/javascript").Mode
        editor = ace.edit element[0]
        session = editor.getSession()
        session.setMode new JavaScriptMode()

        # set up data binding
        return unless ngModel

        changing = false
        ngModel.$render = ->
            changing = true
            session.setValue ngModel.$viewValue or ''
            changing = false

        read = -> ngModel.$setViewValue session.getValue()
        session.on 'change', -> scope.$apply read unless changing


module.directive 'shrinkyInput', ->
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
            console.log text
            doppelganger.text text + "M"
            async -> scope.$apply ->
                $(element).css width:doppelganger.width()+2
                scope.$emit 'redraw-graph'

module.config ($routeProvider) ->
    $routeProvider.when '/:id', controller:'subroutine', templateUrl:"subroutine.html"
    $routeProvider.when '', templateUrl:"intro.html"

module.controller 'subroutine', ($scope, $routeParams, interpreter, $q) ->
    $q.when interpreter.loaded, ->
        $scope.$root.current_object = interpreter.subroutines[$routeParams.id]

module.controller 'library', ($scope, $q, interpreter) ->

    $scope.get_subroutines = ->
        _.values interpreter.subroutines

    $scope.use = (subroutine) ->
        new interpreter.Call $scope.$root.current_object, V(0,0), subroutine

    $scope.use_value = (user_input) ->
        interpreter.make_value $scope.$root.current_object, V(0,0), user_input

    $scope.use_string_literal = (text) ->
        interpreter.make_value $scope.$root.current_object, V(0,0), text, true

    $scope.is_literal = (thing) -> thing instanceof interpreter.Literal

    $scope.is_valid_json = is_valid_json

    $scope.literal_text = ''
    $scope.use_literal = =>
        if valid_json $scope.literal_text
            new interpreter.Value $scope.$root.current_object, V(0,0), $scope.literal_text
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
        make_something interpreter.Graph

    $scope.new_code = ->
        make_something interpreter.JavaScript

    $scope.new_graph_from_selection = ->
        $scope.$broadcast 'new-graph-from-selection'


    ###
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
    ###
