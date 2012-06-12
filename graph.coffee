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
        nib = scope.nib()
        nib.view = $ element
        element.bind 'mousedown', (event) -> scope.$apply ->
            controller.click_nib nib, event
        element.bind 'mouseup', (event) -> scope.$apply ->
            controller.release_nib nib, event

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
