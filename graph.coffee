module = angular.module 'vislang'

transform_position = (position, editor_size) ->
    x:position.y + editor_size.x/2
    y:position.x + editor_size.y/2

module.directive 'nib', ->
    template:"""<div class="nib"></div>"""
    replace:true
    require:'^subroutine'
    scope:
        nib:'accessor'
    link:(scope, element, attributes, controller) ->
        [node, nib] = scope.nib()
        #element.attr 'id',
        controller.nib_views["#{node.id}-#{nib.id}"] = $ element
        #nib.view = $ element
        element.bind 'mousedown', (event) -> scope.$apply ->
            controller.click_nib node, nib, event
        element.bind 'mouseup', (event) -> scope.$apply ->
            controller.release_nib node, nib, event

module.directive 'anySubroutine', ->
    link:(scope, element, attributes) ->
    controller:($scope, $element, $attrs, interpreter) ->
        subroutine = undefined
        $scope.$watch $attrs.anySubroutine, (the_subroutine) ->
            $scope.subroutine = subroutine = the_subroutine

        $scope.evaluate_output = (output) ->
            subroutine.run output

        $scope.new_input =  ->
            subroutine.add_input()
            async -> $('.subroutine-input:last input').focus()

        $scope.new_output =  ->
            subroutine.add_output()
            async -> $('.subroutine-output:last input').focus()

        $scope.delete_input = (nib) ->
            subroutine.delete_input nib

        $scope.delete_output = (nib) ->
            subroutine.delete_output nib


module.directive 'subroutine', ($location) ->
    link:(scope, element, attributes) ->
    controller:($scope, $element, $attrs, interpreter) ->
        $$element = $ $element
        subroutine = $scope.$eval $attrs.subroutine
        $scope.dragging = []
        $scope.drawing = null # nib you're drawing a line from right now
        $scope.selection = []
        @nib_views = {}

        $scope.$on 'new-graph-from-selection', ->
            subroutine = (new interpreter.Graph).initialize()
            subroutine.make_from $scope.selection

        transform_the_position = (position) ->
            position = transform_position position, $scope.editor_size

        ### Node and nib interaction ###
        $scope.position = (node) ->
            position = transform_the_position node.position
            left:position.x + 'px'
            top:position.y + 'px'

        $scope.click_node = (node, $event) ->
            $event.preventDefault()
            $event.stopPropagation()
            if node in $scope.selection
                $scope.dragging = $scope.selection
            else
                $scope.dragging = [node]

        $scope.edit_node = (node, $event) ->
            $event.preventDefault()
            $location.path "/#{node.implementation.id}" unless node.implementation instanceof interpreter.LiteralValue

        $scope.name_node = (node) ->
            node.text or node.implementation.id[0..5]

        $scope.selected = (node) ->
            node in $scope.selection

        this.click_nib = $scope.click_nib = (node, nib, $event) ->
            $event.preventDefault()
            $event.stopPropagation()
            $scope.drawing =
                node:node
                nib:nib

        this.release_nib = $scope.release_nib = (node, nib) ->
            if $scope.drawing
                interpreter.make_connection subroutine,
                    from: $scope.drawing
                    to:
                        node:node
                        nib:nib

        $scope.boxing = false
        $element.bind 'mousedown', (event) -> $scope.$apply ->
            $scope.boxing = $scope.mouse_position

        get_bounds = (point1, point2) ->
            bounds =
                left: Math.min point1.x, point2.x
                top: Math.min point1.y, point2.y
                right: Math.max point1.x, point2.x
                bottom: Math.max point1.y, point2.y
            bounds.width = bounds.right - bounds.left
            bounds.height = bounds.bottom - bounds.top
            bounds

        $scope.selection_style = ->
            if $scope.boxing
                bounds = get_bounds $scope.boxing, $scope.mouse_position

                left:"#{bounds.left}px"
                top:"#{bounds.top}px"
                width:"#{bounds.width}px"
                height:"#{bounds.height}px"

        in_box = (point, point1, point2) ->
            point = transform_the_position point
            bounds = get_bounds point1, point2
            bounds.left < point.x < bounds.right and bounds.top < point.y < bounds.bottom

        $element.bind 'mouseup', (event) -> $scope.$apply ->
            $scope.dragging = []

            if $scope.boxing
                $scope.selection = _.filter subroutine.nodes, (node) -> in_box node.position, $scope.boxing, $scope.mouse_position

            $scope.drawing = $scope.boxing = null
            draw()

        $scope.mouse_position = V 0,0
        $element.bind 'mousemove', (event) -> $scope.$apply ->
            new_mouse_position = (V event.clientX, event.clientY).minus canvas_offset
            mouse_delta = $scope.mouse_position.minus new_mouse_position
            $scope.mouse_position = new_mouse_position

            if $scope.dragging or $scope.boxing
                event.preventDefault()

            if $scope.dragging
                for node in $scope.dragging
                    node.position = node.position.plus V -mouse_delta.y, -mouse_delta.x
                draw()

        ### Drawing the Connection Field ###
        header_height = 40
        nib_center = V 5,5
        canvas_offset = V(0,header_height)
        nib_offset = canvas_offset.minus nib_center
        canvas = $element.find('canvas')[0]

        @draw = draw = => async =>
            if subroutine
                line_height = 16
                c = canvas.getContext '2d'
                c.clearRect 0,0, $scope.editor_size.components()...
                for id, connection of subroutine.connections
                    input_element = @nib_views["#{connection.from.node.id}-#{connection.from.nib.id}"]
                    output_element = @nib_views["#{connection.to.node.id}-#{connection.to.nib.id}"]

                    #input_element = $ ".nib##{connection.from.id}-#{connection.input.id}"# connection.input.view
                    #output_element = $ ".nib##{connection.to.id}-#{connection.output.id}" #connection.output.view

                    if input_element.length and output_element.length
                        input_position = V(input_element.offset()).subtract nib_offset
                        output_position = V(output_element.offset()).subtract nib_offset
                        c.beginPath()
                        c.moveTo input_position.components()...
                        c.lineTo output_position.components()...
                        c.stroke()

                if $scope.drawing
                    view = @nib_views["#{$scope.drawing.node.id}-#{$scope.drawing.nib.id}"]
                    nib_position = V(view.offset()).subtract nib_offset
                    end_position = $scope.mouse_position #.subtract canvas_offset
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
        $scope.$on 'redraw-graph', draw
