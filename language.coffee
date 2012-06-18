module = angular.module 'vislang'
module.factory 'interpreter', ($q, $http) ->
    schema_version = 1

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

    class BuiltinSyntaxError extends RuntimeException
        constructor: (@name, @exception) -> @message = "#{exception} in builtin \"#{@name}\": "

    class Subroutine

    class JavaScript extends Subroutine
        type:'builtin'
        initialize: ->
            @id = UUID()
            all_subroutines[@id] = @
            @inputs = []
            @outputs = []
            @

        fromJSON: (data) ->
            {name:@text, @id, @memo_implementation, @output_implementation} = data
            all_subroutines[@id] = @
            @inputs = ((new Input).fromJSON {text:nib_data, index:index}, @ for nib_data, index in data.inputs)
            @outputs = ((new Output).fromJSON {text:nib_data, index:index}, @ for nib_data, index in data.outputs)
            @

        toJSON: ->
            id:@id
            text:@text
            inputs:@inputs
            outputs:@outputs
            memo_implementation:@memo_implementation
            output_implementation:@output_implementation

        export: ->
            builtins = {}
            builtins[@id] = @
            all_subroutines:{}
            builtins: builtins
            schema_version:schema_version

        run: (output_index) ->
            execute =>
                input_values = []
                for input, input_index in @inputs
                    do (input_index, input) ->
                        input_values.push ->
                            valid_json prompt "Provide a JSON value for input #{input_index}: \"#{input}\""

                the_scope = memos:{}

                try
                    memo_function = eval_expression @memo_implementation
                    output_function = eval_expression @output_implementation
                catch exception
                    if exception instanceof SyntaxError
                        throw new BuiltinSyntaxError @text, exception
                    else throw exception

                throw new NotImplemented @text unless output_function

                args = input_values.concat [output_index]
                memo = memo_function args... if memo_function
                return output_function (args.concat [memo])...

    class Graph extends Subroutine
        type:'subroutine'
        constructor: ->
            ### Initialize the bare minimum bits.
            Be sure to call fromJSON or initialize next. ###
            @nodes = {}
            @connections = {}

        initialize: ->
            ### Populate fields for a brand new instance. ###
            @id = UUID()
            all_subroutines[@id] = @
            @inputs = []
            @outputs = []
            @

        fromJSON: (data) ->
            ### Populate from the persistence format ###
            {name:@text, @id} = data
            all_subroutines[@id] = @
            @inputs = ((new Input).fromJSON {text:nib_data, index:index}, @ for nib_data, index in data.inputs)
            @outputs = ((new Output).fromJSON {text:nib_data, index:index}, @ for nib_data, index in data.outputs)
            @

        toJSON: ->
            # Defines the persistence format
            id:@id
            text:@text
            nodes:_.values @nodes
            connections:_.values @connections
            inputs:@inputs
            outputs:@outputs

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

        run: (nib) ->
            ### Set up user input collection for unknown inputs and evaluate this output. ###
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
            try
                setTimeout => execute => @invoke nib, input_values
            catch exception
                if exception instanceof InputError
                    alert "Invalid JSON: #{exception.message}"
                else
                    throw exception

        find_connection: (direction, node, nib) ->
            ### Use this to determine how nodes are connected ###
            for id, connection of @connections
                if connection[direction].node.id is node.id and connection[direction].nib.id is nib.id
                    return connection
            undefined

        delete_connections: (direction, node, nib) ->
            for id, connection of @connections
                if connection[direction].node.id is node.id and connection[direction].nib.id is nib.id
                    delete scope.connections[id]


        get_inputs: -> @inputs
        get_outputs: -> @outputs

        export: ->
            dependencies = @get_dependencies()
            dependencies.schema_version = schema_version
            dependencies

        add_input: ->
            @inputs.push (new Input).initialize()

        add_output: ->
            @outputs.push (new Output).initialize()

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
            ### TODO: UPDATE FOR NEW SCHEMA ###
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





    class Node # Abstract
        constructor: ->
            @scope.nodes[@id] = @

        set_position:(@position) ->

        get_inputs: -> @implementation.inputs
        get_outputs: -> @implementation.outputs

        get_nibs: ->
            @inputs.concat @outputs

        delete: ->
            delete @scope.nodes[@id]
            for nib in @get_nibs()
                nib.delete_connections()

        toJSON: ->
            position:@position
            text:@text
            id:@id
            type:@type

    class FunctionApplication extends Node # Abstract
        constructor: ->
            super()

        evaluate: (the_scope, output_nib) ->

        toJSON: ->
            json = super()
            json.implementation_id = @implementation.id
            json

        virtual_inputs: (the_scope) ->
            input_values = []
            for input in @implementation.inputs
                do (input) =>
                    input_values.push _.memoize =>
                        the_scope.subroutine.evaluate_connection the_scope, @, input
            return input_values

    class UnknownNode extends Node
        constructor:(@position, type, text, @id) ->
            @type = 'unknown'
            @text = "Unknown #{type}: #{text}"
            @inputs = []
            @outputs = []
            super()

    class SubroutineApplication extends FunctionApplication
        type: 'function'
        constructor: (@scope, @position, @implementation, @id=UUID()) -> super()
            # TODO: just reference the name and inputs off the implementation

        evaluate: (the_scope, output_nib) ->
            input_values = @virtual_inputs the_scope
            return @implementation.invoke output_nib, input_values

        subroutines_referenced: ->
            results = []
            for input in @inputs
                parent = input.get_connection()?.connection.output.parent
                if parent
                    results.push parent.id if parent.type is 'function'
                    resuts = results.concat parent.subroutines_referenced()
            return results

    class BuiltinApplication extends FunctionApplication
        @type = 'builtin'
        constructor: (@scope, @position, @implementation, @id=UUID()) -> super()
            #super @implementation

        evaluate: (the_scope, output_nib) ->
            input_values = @virtual_inputs the_scope
            try
                memo_function = eval_expression @implementation.memo_implementation
                output_function = eval_expression @implementation.output_implementation
            catch exception
                if exception instanceof SyntaxError
                    throw new BuiltinSyntaxError @text, exception
                else throw exception

            throw new NotImplemented @text unless output_function

            args = input_values.concat [output_nib.index]
            if memo_function and @id not of the_scope.memos
                the_scope.memos[@id] = memo_function args...
            return output_function (args.concat [the_scope.memos[@id]])...

    class LiteralValue
        constructor:(@text, @id=UUID()) ->
            @inputs = []
            @outputs = [(new Output).initialize(@id)]

        evaluate: -> return eval_expression @text
        type:'literal'
        content_id: -> CryptoJS.SHA256(@text).toString(CryptoJS.enc.Base64)

    class Literal extends Node
        type:'literal'
        constructor:(@scope, @position, value, @id=UUID()) ->
            # TODO: sort this out later
            if value instanceof Graph
                @implementation = value
                @text = value.name
            else
                @implementation = new LiteralValue value, @id
                @text = value
            super()

        evaluate: -> @implementation.evaluate()

        toJSON: ->
            json = super()
            if @implementation instanceof Graph
                json.implementation_id = @implementation.id
            json

        subroutines_referenced: -> []

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
        scope.delete_connections 'to', node, nib

        new Connection scope,
            from:from
            to:to

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
        graphs = {}
        codes = {}
        for id, subroutine of all_subroutines
            if subroutine instanceof Graph
                graphs[subroutine.id] = subroutine
            else
                codes[subroutine.id] = subroutine

        state =
            subroutines:graphs
            builtins:codes
            schema_version:schema_version

        localStorage.state = JSON.stringify state

    load_state = (data) ->
        subroutines = {}
        second_pass = []

        # load builtins
        for id, builtin_data of data.builtins
            builtin = (new JavaScript).fromJSON builtin_data
            subroutines[builtin.id] = builtin

        # load subroutine declarations
        for id, subroutine_data of data.subroutines
            subroutine = (new Graph).fromJSON subroutine_data
            subroutines[subroutine.id] = subroutine
            second_pass.push subroutine

        # load subroutine implementations
        for subroutine in second_pass
            load_implementation subroutine, data.subroutines[subroutine.id], subroutines

        subroutines

    load_implementation = (subroutine, data, subroutines) ->
        for node in data.nodes
            position = V node.position

            if node.type is 'literal'
                if 'implementation_id' of node
                    value = subroutines[node.implementation_id]
                    # TODO: what if this subroutine isn't found?
                else
                    value = node.text
                new Literal subroutine, position, value, node.id
            else
                implementation = subroutines[node.implementation_id]
                if implementation
                    if node.type is 'function'
                        new SubroutineApplication subroutine, position, implementation, node.id
                    else if node.type is 'builtin'
                        new BuiltinApplication subroutine, position, implementation, node.id
                else
                    new UnknownNode position, node.type, node.text, node.id

        for connection in data.connections

            ### legacy bullshit ###
            get_connector = (nib) ->
                if nib.parent_id is subroutine.id then subroutine else subroutine.nodes[nib.parent_id]

            get_nib = (node, data) ->
                data.index

            from = get_connector connection.input
            to = get_connector connection.output
            input = if from instanceof Graph then from.outputs[connection.input.index] else from.implementation.inputs[connection.input.index]
            output = if to instanceof Graph then to.inputs[connection.output.index] else to.implementation.outputs[connection.output.index]
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

    all_subroutines = {}
    loaded = $q.defer()
    $q.when source_data, (source_data) ->
        for id, obj of load_state source_data
            all_subroutines[id] = obj
        loaded.resolve true
        #start_saving()

    make_connection:make_connection
    loaded:loaded.promise
    RuntimeException:RuntimeException
    Exit:Exit
    InputError:InputError
    NotConnected:NotConnected
    NotImplemented:NotImplemented
    BuiltinSyntaxError:BuiltinSyntaxError
    Builtin:JavaScript
    Subroutine:Graph
    UnknownNode:UnknownNode
    SubroutineApplication:SubroutineApplication
    BuiltinApplication:BuiltinApplication
    Literal:Literal
    Input:Input
    Output:Output
    subroutines:all_subroutines
