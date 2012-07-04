module = angular.module 'vislang'
module.factory 'interpreter', ($q, $http) ->
    schema_version = 2


    make_index_map = (objects, attribute) ->
        result = {}
        for obj in objects
            result[obj[attribute]] = obj
        result


    clone_endpoint = (endpoint) ->
        node:endpoint.node
        nib:endpoint.nib


    ### EXCEPTION TYPES ###

    class RuntimeException
        constructor: (@message) ->

    class Exit extends RuntimeException
        constructor: -> @message = "Exit Signal"

    class InputError extends RuntimeException
        constructor: -> @message = "Cancelled execution due to lack of input"

    class NotConnected extends RuntimeException
        constructor: -> @message = "Something in the program is disconnected"

    class NotImplemented extends RuntimeException
        constructor: (@name) -> @message = "JavaScript \"#{@name}\" is not implemented"

    class CodeSyntaxError extends RuntimeException
        constructor: (@name, @exception) -> @message = "#{exception} in builtin \"#{@name}\": "

    ### DEFINITION TYPES ###

    class Type
        toJSON: ->
            type:@constructor.name

    class Definition extends Type
        constructor: ({@id, @text}={}) ->
            @id ?= UUID()
            all_definitions[@id] = @

        fromJSON: -> @
        initialize: -> @

        toJSON: ->
            _.extend super,
                id:@id
                text:@text

        find_nib: (id) ->
            for nib in @inputs.concat @outputs
                return nib if nib.id is id

    class Subroutine extends Definition
        constructor: ({inputs, outputs}={}) ->
            super
            @inputs = []
            @outputs = []
            @add_input data for data in (inputs or [])
            @add_output data for data in (outputs or [])

        user_inputs: ->
            input_values = []
            for input in @inputs
                do (input) ->
                    value = _.memoize ->
                        result = prompt "Provide a JSON value for input #{input.index}: \"#{input.text}\""
                        throw new Exit "cancelled execution" if result is null
                        try
                            return JSON.parse result
                        catch exception
                            if exception instanceof SyntaxError
                                throw new InputError result
                            else
                                throw exception
                    input_values.push value
            input_values

        run: (nib) ->
            input_values = @user_inputs()
            try
                setTimeout => execute => @invoke nib, input_values,
            catch exception
                if exception instanceof InputError
                    alert "Invalid JSON: #{exception.message}"
                else
                    throw exception

        delete_nib: (nib, group) ->
            @[group] = _.without @[group], nib
            for nib, index in @[group]
                nib.index = index

            ###
            delete_index = @[group].indexOf nib
            @[group].splice delete_index, 1
            for index in [delete_index...@[group].length]
                @[group][index].index -= 1
            ###

        add_nib: (group, the_class, data={}) ->
            nib = new the_class _.extend data,
                scope:@
                index:@[group].length
            @[group].push nib
            nib

        delete_input: (nib) -> @delete_nib nib, 'inputs'
        delete_output: (nib) -> @delete_nib nib, 'outputs'
        add_input: (data={}) -> @add_nib 'inputs', Input, data
        add_output: (data={}) -> @add_nib 'outputs', Output, data

        toJSON: ->
            _.extend super,
                inputs:@inputs
                outputs:@outputs

        # This bit seems confusing because a subroutine is used in two ways.
        # When referencing it as the implementation of a node, you'll want to access @inputs and @outputs.
        # However, when accessing it as a node itself, these are reversed.
        # This is because inputs on the inside are outputs on the outside and visa versa.
        # These functions follow the same protocol as the functions of the same name on Node classes
        get_inputs: -> @outputs
        get_outputs: -> @inputs
        evaluate: -> @

    class JavaScript extends Subroutine
        type:'javascript'
        constructor: ({@memo_implementation, @output_implementation}={}) -> super

        toJSON: ->
            _.extend super,
                memo_implementation:@memo_implementation
                output_implementation:@output_implementation

        export: ->
            builtins = {}
            builtins[@id] = @
            all_definitions:{}
            builtins: builtins
            schema_version:schema_version

        invoke: (output_nib, inputs, scope, node) ->
            try
                memo_function = eval_expression @memo_implementation
                output_function = eval_expression @output_implementation
            catch exception
                if exception instanceof SyntaxError
                    throw new CodeSyntaxError @text, exception
                else throw exception

            throw new NotImplemented @text unless output_function

            args = inputs.concat [output_nib.index]
            if scope and memo_function and node.id not of scope.memos
                scope.memos[node.id] = memo_function args...
            return output_function (args.concat [scope?.memos[node.id]])...


    class Graph extends Subroutine
        type:'graph'
        constructor: ->
            super
            @nodes = []
            @connections = []

        toJSON: ->
            _.extend super,
                nodes:@nodes
                connections:@connections

        ### RUNNING ###

        invoke: (output_nib, inputs) ->
            ### Evaluates an output in a fresh scope ###
            scope =
                subroutine:@
                inputs:inputs
                memos:{}
            @evaluate_connection scope, @, output_nib

        evaluate_connection: (scope, to_node, to_nib) ->
            ### This helper will follow a connection and evaluate whatever it finds ###
            connection = @find_connection 'to', to_node, to_nib
            throw new NotConnected unless connection
            {node, nib} = connection.from
            if node instanceof Graph
                return scope.inputs[nib.index]()
            else
                return node.evaluate scope, nib

        find_connection: (direction, node, nib) ->
            ### Use this to determine how nodes are connected ###
            for connection in @connections
                if connection[direction].node.id is node.id and connection[direction].nib.id is nib.id
                    return connection
            undefined

        delete_connections: (direction, node, nib) ->
            @connections = _.reject @connections, (connection) ->
                connection[direction].node is node and connection[direction].nib is nib

        delete_node_connections: (node) ->
            @connections = _.reject @connections, (connection) ->
                connection.from.node is node or connection.to.node is node

        delete_nodes: (nodes) ->
            @connections = _.reject @connections, (connection) ->
                connection.from.node in nodes or connection.to.node in nodes
            @nodes = _.without @nodes, nodes...

        export: ->
            dependencies = @get_dependencies()
            dependencies.schema_version = schema_version
            dependencies

        delete_input: (nib) ->
            @delete_connections 'to', @, nib
            super nib

        delete_output: (nib) ->
            @delete_connections 'from', @, nib
            super nib

        # these next four are only used by make_from right now

        remove_node: (node) ->
            @nodes = _.without @nodes, node

        add_node: (node) ->
            node.scope = @
            @nodes.push node

        remove_connection: (connection) ->
            @connections = _.without @connections, connection

        add_connection: (connection) ->
            @connections.push connection

        ### probably outdated
        get_dependencies: (dependencies={subroutines:{},builtins:{}}) ->
            # TODO: UPDATE
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
            # TODO: UPDATE
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
                    node = input.parent
                    item.connections[input_index] = node.adjacency_id

            adjacency_list
        ###

        bust_node: (busting_node) ->
            @remove_node busting_node
            busting_scope = busting_node.implementation

            # clone nodes
            node_mapping = {}
            for node in busting_scope.nodes
                new_node = node.clone @
                node_mapping[node.id] = new_node

            # Points at the new clone of a node instead of the original
            translate_endpoint = (endpoint) ->
                node:node_mapping[endpoint.node.id]
                nib:endpoint.nib

            # clone internal connections
            internal_connections = _.filter busting_scope.connections, (connection) ->
                connection.from.node isnt busting_scope and connection.to.node isnt busting_scope

            for connection in internal_connections
                new Connection
                    scope:@
                    from:translate_endpoint connection.from
                    to:translate_endpoint connection.to

            inbound_connections = _.filter @connections, (connection) ->
                connection.to.node is busting_node

            through_connections = []
            for connection in inbound_connections
                # find things that are connected to this nib and expand them in place of this connection
                @remove_connection connection
                nib = connection.to.nib
                inner_connections = _.filter busting_scope.connections, (inner_connection) =>
                    inner_connection.from.nib is nib and inner_connection.from.node is busting_scope

                for inner_connection in inner_connections
                    if inner_connection.to.node is busting_scope
                        through_connections.push
                            beginning_connection:connection
                            middle_connection:inner_connection
                    else
                        new Connection
                            scope:@
                            from:clone_endpoint connection.from
                            to:translate_endpoint inner_connection.to

            for {beginning_connection, middle_connection} in through_connections
                nib = middle_connection.to.nib
                outer_connections = _.filter @connections, (outer_connection) =>
                    outer_connection.from.nib is nib and outer_connection.from.node is busting_node

                for outer_connection in outer_connections
                    outer_connection.from = clone_endpoint beginning_connection.from

            # Now that all the through-connections are handled, handle the normal outbound connections.

            outbound_connections = _.filter @connections, (connection) =>
                connection.from.node is busting_node

            for connection in outbound_connections
                nib = connection.from.nib
                inner_connection = _.find busting_scope.connections, (connection) =>
                    connection.to.node is busting_scope and connection.to.nib is nib
                if inner_connection
                    connection.from = translate_endpoint inner_connection.from

            return _.values node_mapping


        make_from: (old_scope, nodes) ->
            ### Build a subroutine out of nodes in another subroutine. ###

            # move the nodes
            for node in nodes
                old_scope.remove_node node
                @add_node node

            # create a node for this in the old parent
            new_node = new Call
                scope:old_scope
                position:V(0,0)
                implementation:@

            # classify the connections that touch these nodes
            inbound_connections = []
            outbound_connections = []
            contained_connections = []
            for connection in old_scope.connections
                from_inside = connection.from.node in nodes
                to_inside = connection.to.node in nodes
                if from_inside and to_inside
                    contained_connections.push connection
                else if from_inside
                    outbound_connections.push connection
                else if to_inside
                    inbound_connections.push connection

            # move the contained connections
            for connection in contained_connections
                old_scope.remove_connection connection
                @add_connection connection

            group_connections = (connections) ->
                # Connections are grouped by their source, since one source can connect to multiple sinks.
                # One sink cannot connect to multiple sources, so there is no need to group in the other direction.
                groups = {}
                for connection in connections
                    key = "#{connection.from.nib.id}-#{connection.from.node.id}"
                    groups[key] ?= []
                    groups[key].push connection
                _.values groups

            cross_threshhold = (connections, add_nib, direction, other_direction) =>
                # We group connections from the same source to avoid creating extra nibs
                for group in group_connections connections
                    new_nib = @[add_nib]()

                    for connection in group
                        # Create a new connection to the previous connection's target,
                        # which is now inside the new subroutine
                        data = scope:@
                        data[direction] = clone_endpoint connection[direction]
                        data[other_direction] =
                            node:@
                            nib:new_nib
                        new Connection data

                        # Modify the old connection to point to the newly created input
                        connection[direction] =
                            node:new_node
                            nib:new_nib

            cross_threshhold inbound_connections, 'add_input', 'to', 'from'
            cross_threshhold outbound_connections, 'add_output', 'from', 'to'

            return new_node


    find_value = (text, type, collection=all_definitions) ->
        for id, thing of collection
            if thing instanceof type
                if thing.text is text
                    return thing


    make_value = (scope, position, user_input, force_string=false) ->
        implementation = if user_input instanceof Definition
            user_input
        else
            if force_string
                (find_value user_input, StringLiteral) or new StringLiteral text:user_input
            else
                value = eval_expression user_input
                if value instanceof String
                    (find_value value, StringLiteral) or new StringLiteral text:value
                else
                    (find_value user_input, JSONLiteral) or new JSONLiteral text:user_input

        new Value
            scope:scope
            position: position
            implementation: implementation

    class Literal extends Definition # Abstract
        #content_id: -> CryptoJS.SHA256(@text).toString(CryptoJS.enc.Base64)

    class JSONLiteral extends Literal
        evaluate: -> eval_expression @text

    class StringLiteral extends Literal
        evaluate: -> @text

    class Symbol extends Literal
        evaluate: -> @id

    definition_classes = [
        Graph
        JavaScript
        JSONLiteral
        StringLiteral
        Symbol
    ]

    definition_class_map = make_index_map definition_classes, 'name'

    ### NODE TYPES ###

    class Node extends Type# Abstract
        constructor: ({@scope, @id, @position, @implementation}={})->
            @id ?= UUID()
            @scope.nodes.push @

        get_inputs: -> @implementation.inputs
        get_outputs: -> @implementation.outputs

        delete: ->
            @scope.delete_node_connections @
            @scope.remove_node @

        toJSON: ->
            _.extend super,
                id:@id
                implementation_id:@implementation.id
                position:@position

        clone: (new_scope) ->
            data = JSON.parse JSON.stringify @
            old_id = data.id
            data.id = UUID()
            new_node = resurrect_node new_scope, data
            new_node.old_id = old_id
            new_node

    class Call extends Node
        type:'call'
        virtual_inputs: (the_scope) ->
            input_values = []
            for input in @implementation.inputs
                do (input) =>
                    input_values.push _.memoize =>
                        the_scope.subroutine.evaluate_connection the_scope, @, input
            return input_values

        evaluate: (the_scope, output_nib) ->
            input_values = @virtual_inputs the_scope
            return @implementation.invoke output_nib, input_values, the_scope, @

        get_inputs: -> @implementation.inputs
        get_outputs: -> @implementation.outputs

        ###
        subroutines_referenced: ->
            # TODO: UPDATE
            return [] unless @implementation instanceof Graph
            results = []
            for input in @inputs
                parent = input.get_connection()?.connection.output.parent
                if parent
                    results.push parent.id if parent.type is 'function'
                    resuts = results.concat parent.subroutines_referenced()
            return results
        ###

    class Value extends Node
        constructor: ->
            super
            @outputs = [value_output_nib]

        type:'value'
        evaluate: -> @implementation.evaluate()
        subroutines_referenced: -> []
        get_inputs: -> []
        get_outputs: -> @outputs


    class UnknownNode extends Node
        constructor:(@position, type, text, @id) ->
            @type = 'unknown'
            @text = "Unknown #{type}: #{text}"
            @inputs = []
            @outputs = []
            super

    node_classes = [
        Call
        Value
    ]

    node_class_map = make_index_map node_classes, 'name'

    ### OTHER TYPES ###

    class Nib  # Abstract. Do not instantiate
        constructor: ({@scope, @text, @id, @index}={}) ->
            # Null nib id is allowed for value nodes
            @id ?= UUID() unless @id is null

        initialize: -> @

        toJSON: ->
            text:@text
            id:@id

    class Input extends Nib
    class Output extends Nib

    class Connection
        constructor:({@scope, @from, @to, @id}={}) ->
            @id ?= UUID()
            @scope.connections.push @
            throw "WTF" unless @from instanceof Object and @to instanceof Object

        toJSON: ->
            from:
                nib:@from.nib.id
                node:@from.node.id
            to:
                nib:@to.nib.id
                node:@to.node.id

    value_output_nib = new Output scope:null, id:null, index:0

    is_input = (it) ->
        is_input_class = it.nib instanceof Input
        if it.node instanceof Graph then is_input_class else not is_input_class

    make_connection = (scope, {from, to}) ->
        from_input = is_input from
        to_input = is_input to
        return unless (from_input and not to_input) or (to_input and not from_input)

        if to_input
            [from,to] = [to,from]

        # delete other connections that are to this nib/node combination
        scope.delete_connections 'to', to.node, to.nib

        new Connection
            scope: scope
            from: from
            to: to

    find_nib_uses = (nib, direction='to') ->
        uses = {}
        for id, subroutine of all_definitions
            continue unless subroutine instanceof Graph
            for connection in subroutine.connections
                if connection[direction].nib is nib
                    uses[subroutine.id] = subroutine
        uses

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

    eval_expression = (expression) -> eval "(#{expression})"

    start_saving = -> setInterval save_state, 500

    save_state = ->
        state =
            definitions:_.values all_definitions
            schema_version:schema_version

        localStorage.state = JSON.stringify state

    load_state = (data) ->
        switch data.schema_version
            when 1
                subroutines = {}
                second_pass = []

                transform_nib_data = (nib_texts) ->
                    ({text:text, index:index} for text, index in nib_texts)

                transform_definition_data = (definition_data) ->
                    definition_data.inputs = transform_nib_data definition_data.inputs
                    definition_data.outputs = transform_nib_data definition_data.outputs
                    definition_data.text = definition_data.name

                # load builtins
                for id, builtin_data of data.builtins
                    transform_definition_data builtin_data
                    builtin = new JavaScript builtin_data
                    subroutines[builtin.id] = builtin

                # load subroutine declarations
                for id, subroutine_data of data.subroutines
                    transform_definition_data subroutine_data
                    subroutine_data.text = subroutine_data.name
                    subroutine = new Graph subroutine_data
                    subroutines[subroutine.id] = subroutine
                    second_pass.push subroutine

                # load subroutine implementations
                for subroutine in second_pass
                    load_implementation subroutine, data.subroutines[subroutine.id], subroutines

                all_definitions

            when 2
                implementation_pass = []
                for id, definition_data of data.definitions
                    the_class = definition_class_map[definition_data.type]
                    instance = new the_class definition_data
                    if instance instanceof Graph
                        implementation_pass.push
                            graph:instance
                            data:definition_data

                for {graph, data} in implementation_pass
                    load_implementation_v2 graph, data

                all_definitions

    resurrect_node = (scope, node_data) ->
        node_class = node_class_map[node_data.type]
        position = V node_data.position
        implementation = all_definitions[node_data.implementation_id]
        # TODO: in case no implementation is found, create an unknown node
        node = new node_class
            scope:scope
            position:position
            implementation:implementation
            id:node_data.id
        # Automatically populates graph.nodes

    load_implementation_v2 = (graph, data) ->
        for node_data in data.nodes
            resurrect_node graph, node_data

        for connection_data in data.connections
            get_node = (direction) ->
                id = connection_data[direction].node
                if id is graph.id then graph else _.find graph.nodes, (node) -> node.id is id

            from_node = get_node 'from'
            to_node = get_node 'to'

            get_nib = (node, nibs, direction) ->
                if node instanceof Value
                    nibs[0]
                else
                    _.find nibs, (nib) -> nib.id is connection_data[direction].nib

            from_nib = get_nib from_node, from_node.get_outputs(), 'from'
            to_nib = get_nib to_node, to_node.get_inputs(), 'to'

            console.log "Broken connection!", connection_data, from_node, to_node, from_nib, to_nib unless from_node and to_node and from_nib and to_nib

            new Connection
                id: connection_data.id
                scope: graph
                from:
                    node: from_node
                    nib: from_nib
                to:
                    node: to_node
                    nib: to_nib

    load_implementation = (subroutine, data, subroutines) ->
        for node in data.nodes
            position = V node.position

            if node.type is 'literal'
                implementation = if 'implementation_id' of node
                    subroutines[node.implementation_id]
                    # TODO: what if this subroutine isn't found?
                else
                    found_value = find_value node.text, JSONLiteral, subroutines
                    if found_value
                        found_value
                    else
                        value = new JSONLiteral text:node.text
                        subroutines[value.id] = value
                        value

                new Value
                    scope: subroutine
                    position: position
                    implementation: implementation
                    id: node.id
            else
                implementation = subroutines[node.implementation_id]
                if implementation
                    new Call
                        scope: subroutine
                        position: position
                        implementation: implementation
                        id: node.id
                else
                    new UnknownNode position, node.type, node.text, node.id

        for connection_data in data.connections
            get_node = (nib) ->
                if nib.parent_id is subroutine.id then subroutine else _.find subroutine.nodes, (node) -> node.id is nib.parent_id

            from_node = get_node connection_data.output
            to_node = get_node connection_data.input
            from_nib = from_node.get_outputs()[connection_data.output.index]
            to_nib = to_node.get_inputs()[connection_data.input.index]

            console.log "Broken connection!", connection_data, from_node, to_node, from_nib, to_nib unless from_node and to_node and from_nib and to_nib

            new Connection
                id: connection_data.id
                scope: subroutine
                from:
                    node: from_node
                    nib: from_nib
                to:
                    node: to_node
                    nib: to_nib

    if localStorage.state?
        source_data = JSON.parse localStorage.state
    else
        source_data_deferred = $q.defer()
        source_data = source_data_deferred.promise
        $http.get('examples.json').success (data) ->
            source_data_deferred.resolve data

    all_definitions = {}
    loaded = $q.defer()
    $q.when source_data, (source_data) ->
        for id, obj of load_state source_data
            all_definitions[id] = obj
        loaded.resolve true
        start_saving() unless window.location.search is '?debug'

    make_connection:make_connection
    find_nib_uses:find_nib_uses
    make_value:make_value
    loaded:loaded.promise
    RuntimeException:RuntimeException
    Exit:Exit
    InputError:InputError
    NotConnected:NotConnected
    NotImplemented:NotImplemented
    BuiltinSyntaxError:CodeSyntaxError
    JavaScript:JavaScript
    Graph:Graph
    UnknownNode:UnknownNode
    Call:Call
    Value:Value
    Literal:Literal
    Symbol:Symbol
    Input:Input
    Output:Output
    subroutines:all_definitions
    Subroutine:Subroutine
