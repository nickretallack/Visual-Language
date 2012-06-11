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
        constructor: (@name) -> @message = "Builtin \"#{@name}\" is not implemented"

    class BuiltinSyntaxError extends RuntimeException
        constructor: (@name, @exception) -> @message = "#{exception} in builtin \"#{@name}\": "

    class Builtin
        constructor:({@name, @output_implementation, @memo_implementation, @inputs, @outputs, @id}={}) ->
            @memo_implementation ?= null
            @inputs ?= []
            @outputs ?= ['OUT']
            @id ?= UUID()

        type:'builtin'

        toJSON: ->
            id:@id
            name:@name
            inputs:@inputs
            outputs:@outputs
            memo_implementation:@memo_implementation
            output_implementation:@output_implementation

        export: ->
            builtins = {}
            builtins[@id] = @
            subroutines:{}
            builtins: builtins
            schema_version:schema_version

        run: ->
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

    class Subroutine
        constructor:(@name='', inputs=[], outputs=[], @id=UUID()) ->
            # can't have a subroutine with no output
            outputs = ['OUT'] unless outputs.length

            # These are intentionally reversed.  The inputs to a subroutine show up as outputs inside it
            @inputs = (new Output @, text, index, inputs.length-1 for text, index in inputs)
            @outputs = (new Input @, text, index, outputs.length-1 for text, index in outputs)
            @nodes = {}
            @connections = {}

        type:'subroutine'

        toJSON: ->
            id:@id
            name:@name
            nodes:_.values @nodes
            connections:_.values @connections
            inputs:@get_inputs()
            outputs:@get_outputs()

        invoke: (index, inputs) ->
            the_scope =
                subroutine:@
                inputs:inputs
                memos:{}

            output = @outputs[index].get_connection()?.connection.output
            throw new NotConnected unless output

            if output.parent instanceof Subroutine
                return inputs[output.index]()
            else if output.parent instanceof Node
                return output.parent.evaluation the_scope, output.index

        run: (output_index) ->
            input_values = []
            for input, input_index in @inputs
                do (input_index, input) ->
                    value = _.memoize ->
                        result = prompt "Provide a JSON value for input #{input_index}: \"#{input.text}\""
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
                setTimeout => execute => @invoke output_index, input_values
            catch exception
                if exception instanceof InputError
                    alert "Invalid JSON: #{exception.message}"
                else
                    throw exception


        get_inputs: -> (input.text for input in @inputs)
        get_outputs: -> (output.text for output in @outputs)

        export: ->
            dependencies = @get_dependencies()
            dependencies.schema_version = schema_version
            dependencies

        get_dependencies: (dependencies={subroutines:{},builtins:{}}) ->
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


        remove_node: (node) ->
            @view.remove node.view
            delete @nodes[node.id]

        add_node: (node) ->
            @view.add node.view
            @nodes[node.id] = node

        remove_connection: (connection) ->
            @view.remove connection.view
            delete @connections[connection.id]

        add_connection: (connection) ->
            @view.add connection.view
            @connections[connection.id] = connection

    class Node # Abstract
        constructor: ->
            @scope.nodes[@id] = @

        set_position:(@position) ->

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
        constructor:({name, inputs, outputs}) ->
            @text = name
            super()
            @inputs = (new Input @, text, index, inputs.length-1 for text, index in inputs)
            @outputs = (new Output @, text, index, outputs.length-1 for text, index in outputs)

        evaluation: (the_scope, output_index) ->

        toJSON: ->
            json = super()
            json.implementation_id = @implementation.id
            json

        virtual_inputs: (the_scope) ->
            input_values = []
            for input in @inputs
                do (input) ->
                    input_values.push _.memoize ->
                        output = input.get_connection()?.connection.output
                        throw new NotConnected unless output
                        if output.parent instanceof Subroutine
                            return the_scope.inputs[output.index]()
                        else if output.parent instanceof Node
                            return output.parent.evaluation the_scope, output.index
            return input_values

    class UnknownNode extends Node
        constructor:(@position, type, text, @id) ->
            @type = 'unknown'
            @text = "Unknown #{type}: #{text}"
            @inputs = []
            @outputs = []
            super()

    class SubroutineApplication extends FunctionApplication
        constructor:(@scope, @position, @implementation, @id=UUID()) ->
            @type = 'function'
            super
                name:@implementation.name
                inputs:@implementation.get_inputs()
                outputs:@implementation.get_outputs()

        evaluation: (the_scope, output_index) ->
            input_values = @virtual_inputs the_scope
            return @implementation.invoke output_index, input_values

        subroutines_referenced: ->
            results = []
            for input in @inputs
                parent = input.get_connection()?.connection.output.parent
                if parent
                    results.push parent.id if parent.type is 'function'
                    resuts = results.concat parent.subroutines_referenced()
            return results

    class BuiltinApplication extends FunctionApplication
        constructor:(@scope, @position, @implementation, @id=UUID()) ->
            @type = 'builtin'
            super @implementation

        evaluation: (the_scope, output_index) ->
            input_values = @virtual_inputs the_scope
            try
                memo_function = eval_expression @implementation.memo_implementation
                output_function = eval_expression @implementation.output_implementation
            catch exception
                if exception instanceof SyntaxError
                    throw new BuiltinSyntaxError @text, exception
                else throw exception

            throw new NotImplemented @text unless output_function

            args = input_values.concat [output_index]
            if memo_function and @id not of the_scope.memos
                the_scope.memos[@id] = memo_function args...
            return output_function (args.concat [the_scope.memos[@id]])...

    class LiteralValue
        constructor:(@text) ->
        evaluation: -> return eval_expression @text
        type:'literal'
        content_id: -> CryptoJS.SHA256(@text).toString(CryptoJS.enc.Base64)

    class Literal extends Node
        constructor:(@scope, @position, value, @id=UUID()) ->
            @type = 'literal'

            # TODO: sort this out later
            if value instanceof Subroutine
                @implementation = value
                @text = value.name
            else
                @implementation = new LiteralValue value
                @text = value
            super()
            @inputs = []
            @outputs = [new Output(@, '')]

        evaluation: -> @implementation.evaluation()

        toJSON: ->
            json = super()
            if @implementation instanceof Subroutine
                json.implementation_id = @implementation.id
            json

        subroutines_referenced: -> []

    class Nib  # Abstract. Do not instantiate
        constructor: ->
            @connections = {}

        delete_connections: ->
            for id, connection of @connections
                connection.connection.delete()

        get_scope: ->
            if this.parent instanceof Subroutine
                this.parent
            else
                this.parent.scope

    # TODO: change nib 'node' to parent since it might not be a node
    class Input extends Nib
        constructor:(@parent, @text, @index=0, @siblings=0) ->
            super()

        _add_connection: (connection) ->
            # delete previous connection
            @get_connection()?.connection.delete()
            @connections = {}
            @connections[connection.id] =
                connection:connection

        get_connection: ->
            for id, connection of @connections
                return connection

        get_node: ->
            @get_connection()?.connection.output.parent

        connect:(output) ->
            new Connection @get_scope(), @, output

    class Output extends Nib
        constructor:(@parent, @text, @index=0, @siblings=0) ->
            super()

        _add_connection: (connection, vertex) ->
            @connections[connection.id] =
                connection:connection
                vertex:vertex

        connect:(input) ->
            new Connection @get_scope(), input, @

    class Connection
        constructor:(@scope, @input, @output, @id=UUID()) ->
            @input._add_connection @
            @output._add_connection @
            @scope.connections[@id] = @

        toJSON: ->
            input:
                index:@input.index
                parent_id:@input.parent.id
            output:
                index:@output.index
                parent_id:@output.parent.id

        delete: ->
            delete @scope.connections[@id]
            delete @output.connections[@id]
            @input.connections = {}



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
        for id, subroutine of subroutines
            if subroutine instanceof Subroutine
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
            builtin = new Builtin builtin_data
            subroutines[builtin.id] = builtin

        # load subroutine declarations
        for id, subroutine_data of data.subroutines
            subroutine = new Subroutine subroutine_data.name, subroutine_data.inputs, subroutine_data.outputs, subroutine_data.id
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
            get_connector = (nib) ->
                if nib.parent_id is subroutine.id then subroutine else subroutine.nodes[nib.parent_id]

            source = get_connector connection.output
            sink = get_connector connection.input

            # input/output reversal.  TODO: clean up subroutine implementation to avoid this
            source_connector = if source instanceof Node then source.outputs else source.inputs
            sink_connector = if sink instanceof Node then sink.inputs else sink.outputs

            if connection.output.index >= source_connector.length or connection.input.index >= sink_connector.length
                console.log "Oh no, trying to make an invalid connection"
            else
                source_connector[connection.output.index].connect sink_connector[connection.input.index]

    if localStorage.state?
        source_data = JSON.parse localStorage.state
    else
        source_data_deferred = $q.defer()
        source_data = source_data_deferred.promise
        $http.get('examples.json').success (data) ->
            source_data_deferred.resolve data

    subroutines = {}
    loaded = $q.defer()
    $q.when source_data, (source_data) ->
        for id, obj of load_state source_data
            subroutines[id] = obj
        loaded.resolve true
        start_saving()


    loaded:loaded.promise
    RuntimeException:RuntimeException
    Exit:Exit
    InputError:InputError
    NotConnected:NotConnected
    NotImplemented:NotImplemented
    BuiltinSyntaxError:BuiltinSyntaxError
    Builtin:Builtin
    Subroutine:Subroutine
    UnknownNode:UnknownNode
    SubroutineApplication:SubroutineApplication
    BuiltinApplication:BuiltinApplication
    Literal:Literal
    Input:Input
    Output:Output
    subroutines:subroutines
