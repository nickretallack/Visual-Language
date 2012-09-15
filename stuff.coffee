module = angular.module 'vislang', []

window.async = setTimeout
window.delay = (time, procedure) -> setTimeout procedure, time

module.run ($rootScope) ->
    $rootScope.search = ''

module.filter 'text_or_id', ->
    (obj) ->
        if obj.text? then obj.text else obj.id

module.filter 'is_valid_json', -> is_valid_json

module.filter 'node_type', (interpreter) ->
    (obj) ->
        if obj instanceof interpreter.Call
            'call'
        else
            'value'

module.filter 'syntax', (interpreter) ->
    (obj) ->
        result = if obj instanceof interpreter.CoffeeScript
            'coffee'
        else if obj instanceof interpreter.JavaScript
            'javascript'
        else if obj instanceof interpreter.JSON
            'json'
        else
            'plain'

module.filter 'isa', (interpreter) ->
    (obj, type) ->
        try
            obj instanceof interpreter[type]
        catch error
            console.log 'yeah'

module.filter 'implementation_type', (interpreter) ->
    (it) ->
        if it instanceof interpreter.Lambda
            'lambda'
        else if it instanceof interpreter.Graph
            'graph'
        else if it instanceof interpreter.JavaScript
            'javascript'
        else if it instanceof interpreter.CoffeeScript
            'coffeescript'
        else if it instanceof interpreter.Text
            'string'
        else if it instanceof interpreter.JSON
            'json'
        else if it instanceof interpreter.Symbol
            'symbol'


module.filter 'editor_type', (interpreter) ->
    (obj) ->
        if obj instanceof interpreter.Lambda
            'lambda'
        else if obj instanceof interpreter.Graph
            'graph'
        else if obj instanceof interpreter.Code
            'code'
        else if obj instanceof interpreter.Symbol
            'symbol'
        else if obj instanceof interpreter.Literal
            'literal'

module.directive 'ace', ($interpolate) ->
    require: '?ngModel'
    link:(scope, element, attributes, ngModel) ->

        editor = ace.edit element[0]
        session = editor.getSession()

        attributes.$observe 'syntax', (syntax) ->
            if syntax and syntax isnt 'plain'
                SyntaxMode = require("ace/mode/#{syntax}").Mode
                session.setMode new SyntaxMode()

        # set up data binding
        return unless ngModel

        changing = false
        ngModel.$render = ->
            changing = true
            session.setValue ngModel.$viewValue or ''
            changing = false

        read = -> ngModel.$setViewValue session.getValue()
        session.on 'change', -> scope.$apply read unless changing

module.directive 'shrinkyInput', ($timeout) ->
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
            $timeout ->
                $(element).css width:doppelganger.width()+2
                scope.$emit 'redraw-graph'

module.directive 'runtimeGraphics', (interpreter) ->
    link:(scope, element, attributes) ->
        runtime = scope.$eval attributes.runtimeGraphics
        element.append runtime.graphics_element

module.controller 'subroutine', ($scope, $routeParams, interpreter, $q) ->
    definition = null
    $q.when interpreter.loaded, ->
        definition = $scope.$root.definition = interpreter.subroutines[$routeParams.id]

    $scope.evaluate_output = (output) ->
        runtime = new interpreter.Runtime
            graphics_element:$ "<div></div>"
        $scope.$root.runtime = runtime
        definition.run output, runtime

    $scope.new_input =  ->
        definition.add_input()
        async -> $('.subroutine-input:last input:first').focus()

    $scope.new_output =  ->
        definition.add_output()
        async -> $('.subroutine-output:last input:first').focus()

    delete_nib = (nib, direction, type) ->
        uses = interpreter.find_nib_uses nib, direction
        names = (definition.text for id, definition of uses)
        if names.length
            message = "Can't delete this #{type}.  It is used in #{names.join ', '}"
            alert message
        else
            definition["delete_#{type}"] nib

    $scope.delete_input = (nib) ->
        delete_nib nib, 'to', 'input'

    $scope.delete_output = (nib) ->
        delete_nib nib, 'from', 'output'


module.config ($routeProvider) ->
    $routeProvider.when '/:id', controller:'subroutine', templateUrl:"subroutine.html"
    $routeProvider.when '/:id/run', controller:'subroutine', templateUrl:'run.html'
    $routeProvider.when '', templateUrl:"intro.html"


module.controller 'library', ($scope, $q, interpreter, $filter) ->

    sequence =  ['graph', 'coffeescript', 'javascript', 'symbol', 'json', 'string']
    $scope.sort = (item) ->
        type_order = sequence.indexOf $filter('implementation_type')(item)
        [type_order, item.text]

    $scope.get_subroutines = ->
        _.values interpreter.subroutines

    $scope.use = (subroutine) ->
        new interpreter.Call
            scope: $scope.$root.definition
            position: V(0,0)
            implementation: subroutine

    $scope.new_symbol = (user_input) ->
        symbol = new interpreter.Symbol text:user_input
        new interpreter.Value
            scope:$scope.$root.definition
            position: V(0,0)
            implementation:symbol

    $scope.use_value = (user_input) ->
        interpreter.make_value $scope.$root.definition, V(0,0), user_input

    $scope.use_string_literal = (text) ->
        interpreter.make_value $scope.$root.definition, V(0,0), text, true

    $scope.is_literal = (thing) -> thing instanceof interpreter.Literal


### INTERACTION ###

dragging_object = null
connecting_object = null
dragging_offset = V 0,0

is_valid_json = (json) ->
    try
        window.JSON.parse json
        return true
    catch exception
        return false

valid_json = (json) ->
    try
        return window.JSON.parse json
    catch exception
        if exception instanceof SyntaxError
            alert "#{exception} Invalid JSON: #{json}"
            false
        else
            throw exception

pretty_json = (obj) -> window.JSON.stringify obj, undefined, 2

module.controller 'Controller', ($scope, $http, $location, interpreter, $q) ->
    $scope.tab_click = (tab) ->
        $scope.$root.overlay = if $scope.$root.overlay is tab then null else tab

    make_something = (type) ->
        $q.when interpreter.loaded, ->
            subroutine = new type
            $location.path "#{subroutine.id}"

    $scope.definition_types = interpreter.definition_types

    $scope.quit_runtime = ->
        $scope.$root.runtime.cleanup()
        $scope.$root.runtime = null

    $scope.create_definition = (type) ->
        make_something type

    $scope.new_graph = ->
        make_something interpreter.Graph

    $scope.new_code = ->
        make_something interpreter.JavaScript

    $scope.new_coffeescript = ->
        make_something interpreter.CoffeeScript

    $scope.new_graph_from_selection = ->
        $scope.$broadcast 'new-graph-from-selection'

    $scope.delete_definition = (obj) ->
        delete interpreter.subroutines[obj.id]

    $scope.undelete_definition = (obj) ->
        interpreter.subroutines[obj.id] = obj

    $scope.definition_exists = (obj) ->
        obj.id of interpreter.subroutines

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
