module = angular.module 'vislang'

transform_position = (position, editor_size) ->
    x:position.y + editor_size.x/2
    y:position.x + editor_size.y/2

nib_index = (endpoint) ->
    "#{endpoint.node.id}-#{endpoint.nib.id}-#{endpoint.index or 0}"

module.directive 'nib', ->
    template:"""<div class="nib"></div>"""
    replace:true
    require:'^graph'
    scope:
        nib:'='
        node:'='
        index:'='
    link:(scope, element, attributes, controller) ->
        {nib, node, index} = scope
        index ?= 0
        controller.nib_views[nib_index node:node, nib:nib, index:index] = $ element
        element.bind 'mousedown', (event) -> scope.$apply ->
            controller.click_nib node, nib, event
        element.bind 'mouseup', (event) -> scope.$apply ->
            controller.release_nib node, nib, event

module.directive 'graph', ($location) ->
    link:(scope, element, attributes) ->
    controller:($scope, $element, $attrs, interpreter) ->
        # Don't capture events from the overlay elements
        $element = $($element).find '#graph'
        $$element = $ $element
        subroutine = $scope.$eval $attrs.graph
        $scope.dragging = []
        $scope.drawing = null # nib you're drawing a line from right now
        $scope.selection = []
        @nib_views = {}

        $scope.$on 'new-graph-from-selection', ->
            new_subroutine = new interpreter.Graph
            new_subroutine.make_from $scope.selection
            $scope.selection = []

        transform_the_position = (position) ->
            position = transform_position position, $scope.editor_size

        ### Node and nib interaction ###
        $scope.position = (node) ->
            position = transform_the_position node.position
            left:position.x + 'px'
            top:position.y + 'px'

        $scope.click_node = (node, $event) ->
            $event.stopPropagation()

            if $event.shiftKey
                if node not in $scope.selection
                    $scope.selection.push node
                else
                    $scope.selection = _.without $scope.selection, node
            else if node not in $scope.selection
                $scope.selection = [node]

            $scope.dragging = $scope.selection

        $scope.can_delete_selection = ->
            $scope.selection.length > 0
        $scope.delete_selection = ->
            subroutine.delete_nodes $scope.selection
            $scope.selection = []
            draw()

        $scope.can_edit_selected_node = ->
            $scope.selection.length is 1
        $scope.edit_node = (node) ->
            $location.path "/#{node.implementation.id}"

        $scope.can_bust_selected_node = ->
            $scope.selection.length is 1 and $scope.selection[0].implementation instanceof interpreter.Graph
        $scope.bust_selected_node = ->
            new_nodes = subroutine.bust_node $scope.selection[0]
            $scope.selection = new_nodes
            draw()

        $scope.can_join_selected_nodes = ->
            $scope.selection.length > 1
        $scope.join_selected_nodes = ->
            new_subroutine = new interpreter.Graph
            new_node = new_subroutine.make_from subroutine, $scope.selection
            $scope.selection = [new_node]
            draw()

        $scope.selected = (node) ->
            node in $scope.selection

        this.click_nib = $scope.click_nib = (node, nib, $event, index=0) ->
            $event.stopPropagation()
            $scope.drawing =
                node:node
                nib:nib
                index:index

        this.release_nib = $scope.release_nib = (node, nib, $event, index=0) ->
            if $scope.drawing
                interpreter.make_connection subroutine,
                    from: $scope.drawing
                    to:
                        node:node
                        nib:nib
                        index:index

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
            bounds = get_bounds point1, point2
            bounds.left < point.x < bounds.right and bounds.top < point.y < bounds.bottom

        $scope.boxing = false
        $element.bind 'mousedown', (event) -> $scope.$apply ->
            $scope.boxing = $scope.mouse_position


        lambda_size = V 150, 500

        is_lambda_value = (node) -> (node instanceof interpreter.Value) and (node.implementation instanceof interpreter.Lambda)

        collides_with_lambda = (dragging_node) ->
            for node in subroutine.nodes
                if is_lambda_value node
                    if in_box dragging_node.position, node.position, node.position.plus lambda_size
                        return node

        $element.bind 'mouseup', (event) -> $scope.$apply ->
            # attach nodes to the first lambda it collides with
            for dragging_node in $scope.dragging
                lambda = collides_with_lambda dragging_node
                if lambda
                    lambda.add_child dragging_node
                else if dragging_node.lambda_node
                    dragging_node.lambda_node.remove_child dragging_node

            $scope.dragging = []

            if $scope.boxing
                newly_selected = _.filter subroutine.nodes, (node) -> in_box (transform_the_position node.position), $scope.boxing, $scope.mouse_position
                if event.shiftKey
                    for node in newly_selected
                        if node not in $scope.selection
                            $scope.selection.push node
                else
                    $scope.selection = newly_selected

            $scope.drawing = $scope.boxing = null
            draw()

        $scope.mouse_position = V 0,0
        $element.bind 'mousemove', (event) -> $scope.$apply ->
            # update mouse position for other methods to consume deltas from
            new_mouse_position = (V event.clientX, event.clientY).minus canvas_offset
            mouse_delta = $scope.mouse_position.minus new_mouse_position
            $scope.mouse_position = new_mouse_position
            mouse_delta = V -mouse_delta.y, -mouse_delta.x

            update_position = (node) ->
                node.position = node.position.plus mouse_delta

            if $scope.dragging.length
                for node in $scope.dragging
                    update_position node
                    if is_lambda_value node 
                        for child_node in node.children
                            update_position child_node

            if $scope.dragging.length or $scope.drawing
                draw()

        #$element.bind 'keydown', (event) ->
        #    console.log "yeah"

        ### Drawing the Connection Field ###
        header_height = 40
        nib_center = V 5,5
        canvas_offset = V(0,header_height)
        nib_offset = canvas_offset.minus nib_center
        canvas = $element.find('canvas')[0]

        connection_state = (connection) ->
            if $scope.debugger
                trace = $scope.current_trace
                trace.state if connection is trace.connection
                    

        @draw = draw = => async =>
            if subroutine
                line_height = 16
                c = canvas.getContext '2d'
                c.clearRect 0,0, $scope.editor_size.components()...
                for connection in subroutine.connections
                    input_element = @nib_views[nib_index connection.from]
                    output_element = @nib_views[nib_index connection.to]

                    c.strokeStyle = switch connection_state connection
                        when 'visiting' then 'rgb(0,255,0)'
                        when 'evaluated' then 'rgb(0,0,255)'
                        else 'rgb(0,0,0)'

                    if input_element?.length and output_element?.length
                        input_position = V(input_element.offset()).subtract nib_offset
                        output_position = V(output_element.offset()).subtract nib_offset
                        c.beginPath()
                        c.moveTo input_position.components()...
                        c.lineTo output_position.components()...
                        c.stroke()

                if $scope.drawing
                    view = @nib_views[nib_index $scope.drawing]
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
