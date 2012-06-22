module = angular.module 'vislang'
module.factory 'interpreter', ($q, $http) ->
    schema_version = 2

    make_index_map = (objects, attribute) ->
        result = {}
        for obj in objects
            result[obj[attribute]] = obj
        result

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
        toJSON: ->
            _.extend super(),
                id:@id
                text:@text

        find_nib: (id) ->
            for nib in @inputs.concat @outputs
                return nib if nib.id is id

    class Subroutine extends Definition
        fromJSON: (data) ->
            all_definitions[@id] = @
            @inputs = ((new Input).fromJSON nib_data, @ for nib_data in data.inputs)
            @outputs = ((new Output).fromJSON nib_data, @ for nib_data in data.outputs)
            #@inputs = ((new Input).fromJSON {text:nib_data, index:index}, @ for nib_data, index in data.inputs)
            #@outputs = ((new Output).fromJSON {text:nib_data, index:index}, @ for nib_data, index in data.outputs)
            @

        initialize: ->
            ### Populate fields for a brand new instance. ###
            @id = UUID()
            all_definitions[@id] = @
            @inputs = []
            @outputs = []
            @

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

        add_input: ->
            @inputs.push (new Input).initialize()

        add_output: ->
            @outputs.push (new Output).initialize()

        delete_input: (nib) ->
            @inputs.splice nib.index, 1

        delete_output: (nib) ->
            @outputs.splice nib.index, 1

        toJSON: ->
            _.extend super(),
                inputs:@inputs
                outputs:@outputs


    class JavaScript extends Subroutine
        type:'javascript'
        fromJSON: (data) ->
            {text:@text, @id, @memo_implementation, @output_implementation} = data
            super data

        toJSON: ->
            _.extend super(),
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
            ### Initialize the bare minimum bits.
            Be sure to call fromJSON or initialize next. ###
            @nodes = {}
            @connections = {}

        fromJSON: (data) ->
            ### Populate from the persistence format ###
            {text:@text, @id} = data
            super data

        toJSON: ->
            _.extend super(),
                nodes:_.values @nodes
                connections:_.values @connections

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
            for id, connection of @connections
                if connection[direction].node.id is node.id and connection[direction].nib.id is nib.id
                    return connection
            undefined

        delete_connections: (direction, node, nib) ->
            for id, connection of @connections
                if connection[direction].node.id is node.id and connection[direction].nib.id is nib.id
                    delete @connections[id]

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

        ### probably outdated
        remove_node: (node) ->
            delete @nodes[node.id]

        add_node: (node) ->
            @nodes[node.id] = node

        remove_connection: (connection) ->
            delete @connections[connection.id]

        add_connection: (connection) ->
            @connections[connection.id] = connection

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

        make_from: (nodes) ->
            ### Build a subroutine out of nodes in another subroutine. ###
            old_scope = nodes[0].scope

            # first find all the connections
            in_connections = {}
            out_connections = {}
            for node in nodes
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
                old_scope.remove_connection connection
                @add_connection connection

            # move the nodes
            for id, node of nodes
                old_scope.remove_node node
                @add_node node

            # create a node for this in the old parent
            new_node = new SubroutineApplication old_scope, V(0,0), @

            # connect the hanging connections.
            # Each one becomes two: a connection on the inside and on the outside.

            for id, connection of in_connections
                #nib = new interpreter.Output
                #subroutine.inputs.push nib
                connection.delete()

            for id, connection of out_connections
                connection.delete()

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
                (find_value user_input, StringLiteral) or new StringLiteral user_input
            else
                value = eval_expression user_input
                if value instanceof String
                    (find_value value, StringLiteral) or new StringLiteral value
                else
                    (find_value user_input, JSONLiteral) or new JSONLiteral value

        new Value scope, position, implementation

    class Literal extends Definition # Abstract
        constructor: ->
            #all_definitions[@id] = @

        fromJSON: ({@text, @id}) ->
            @id ?= UUID()
            all_definitions[@id] = @
            @inputs = []
            @outputs = [(new Output).initialize(@id)]
            @
        #content_id: -> CryptoJS.SHA256(@text).toString(CryptoJS.enc.Base64)

    class JSONLiteral extends Literal
        type:'json_literal'
        evaluate: -> eval_expression @text

    class StringLiteral extends Literal
        type:'string_literal'
        evaluate: -> @text

    definition_classes = [
        Graph
        JavaScript
        JSONLiteral
        StringLiteral
    ]

    definition_class_map = make_index_map definition_classes, 'name'

    ### NODE TYPES ###

    class Node extends Type# Abstract
        constructor: ->
            @scope.nodes[@id] = @

        get_inputs: -> @implementation.inputs
        get_outputs: -> @implementation.outputs

        delete: ->
            delete @scope.nodes[@id]
            for nib in @get_nibs()
                nib.delete_connections()

        toJSON: ->
            _.extend super(),
                id:@id
                implementation_id:@implementation.id
                position:@position

    class Call extends Node
        type:'call'
        constructor: (@scope, @position, @implementation, @id=UUID()) -> super()

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
        type:'value'
        constructor:(@scope, @position, @implementation, @id=UUID()) -> super()
        evaluate: -> @implementation.evaluate()
        subroutines_referenced: -> []

    class UnknownNode extends Node
        constructor:(@position, type, text, @id) ->
            @type = 'unknown'
            @text = "Unknown #{type}: #{text}"
            @inputs = []
            @outputs = []
            super()

    node_classes = [
        Call
        Value
    ]

    node_class_map = make_index_map node_classes, 'name'

    ### OTHER TYPES ###

    class Nib  # Abstract. Do not instantiate
        fromJSON: (data, @parent) ->
            {@text, @index, @id} = data
            @id ?= UUID()
            @

        initialize: (@id=UUID()) ->
            @id ?= UUID()
            @

        toJSON: ->
            text:@text
            id:@id

    class Input extends Nib
    class Output extends Nib

    class Connection
        constructor:(@scope, {@from, @to}, @id=UUID()) ->
            @scope.connections[@id] = @

        toJSON: ->
            from:
                nib:@from.nib.id
                node:@from.node.id
            to:
                nib:@to.nib.id
                node:@to.node.id

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

        new Connection scope,
            from:from
            to:to

    find_nib_uses = (nib, direction='to') ->
        uses = {}
        for id, subroutine of all_definitions
            for id, connection of subroutine.connections
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

                # load builtins
                for id, builtin_data of data.builtins
                    builtin_data.text = builtin_data.name
                    builtin = (new JavaScript).fromJSON builtin_data
                    subroutines[builtin.id] = builtin

                # load subroutine declarations
                for id, subroutine_data of data.subroutines
                    subroutine_data.text = subroutine_data.name
                    subroutine = (new Graph).fromJSON subroutine_data
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
                    instance = (new the_class).fromJSON definition_data
                    if instance instanceof Graph
                        implementation_pass.push
                            graph:instance
                            data:definition_data

                for {graph, data} in implementation_pass
                    load_implementation_v2 graph, data

                all_definitions

    load_implementation_v2 = (graph, data) ->
        for node_data in data.nodes
            node_class = node_class_map[node_data.type]
            position = V node_data.position
            implementation = all_definitions[node_data.implementation_id]
            # TODO: in case no implementation is found, create an unknown node
            node = new node_class graph, position, implementation, node_data.id
            unless implementation?
                console.log 'what'
                console.log 'what'
            # Automatically populates graph.nodes

        for connection_data in data.connections
            get_node = (direction) ->
                id = connection_data[direction].node
                if id is graph.id then graph else graph.nodes[id]

            from_node = get_node 'from'
            to_node = get_node 'to'

            get_nib = (node, direction) ->
                implementation = if node instanceof Definition then node else node.implementation
                nib = implementation.find_nib connection_data[direction].nib
                unless nib?
                    console.log 'what'
                    console.log 'what'
                nib

            from_nib = get_nib from_node, 'from'
            to_nib = get_nib to_node, 'to'

            new Connection graph,
                from:
                    node:from_node
                    nib:from_nib
                to:
                    node:to_node
                    nib:to_nib
            , connection_data.id

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
                        value = (new JSONLiteral).fromJSON text:node.text
                        subroutines[value.id] = value
                        value

                new Value subroutine, position, implementation, node.id
            else
                implementation = subroutines[node.implementation_id]
                if implementation
                    new Call subroutine, position, implementation, node.id
                else
                    new UnknownNode position, node.type, node.text, node.id

        for connection in data.connections

            ### legacy bullshit ###
            get_connector = (nib) ->
                if nib.parent_id is subroutine.id then subroutine else subroutine.nodes[nib.parent_id]

            from = get_connector connection.input
            to = get_connector connection.output
            input = if from instanceof Definition then from.outputs[connection.input.index] else from.implementation.inputs[connection.input.index]
            output = if to instanceof Definition then to.inputs[connection.output.index] else to.implementation.outputs[connection.output.index]
            unless input
                console.log subroutine.text
                console.log subroutine.text
            unless output
                console.log subroutine.text
                console.log subroutine.text

            new Connection subroutine,
                from:
                    node:to
                    nib:output
                to:
                    node:from
                    nib:input
            , connection.id
            ###

            # input/output reversal.  TODO: clean up subroutine implementation to avoid this
            source_connector = if source instanceof Node then source.outputs else source.inputs
            sink_connector = if sink instanceof Node then sink.inputs else sink.outputs

            if connection.output.index >= source_connector.length or connection.input.index >= sink_connector.length
                console.log "Oh no, trying to make an invalid connection"
            else
                source_connector[connection.output.index].connect sink_connector[connection.input.index]
            ###

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
        start_saving()

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
    Input:Input
    Output:Output
    subroutines:all_definitions
