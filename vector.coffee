css_properties = ['top','left']

class Vector
    constructor: (@components...) ->

    reduce: (initial, action) ->
        _.reduce @components, action, initial

    fmap: (action) ->
        new Vector (_.map @components, action)...

    vmap: (vector, action) ->
        new Vector (_.map _.zip(@components, vector.components), (components) -> action components...)...

    magnitude: ->
        Math.sqrt @reduce 0, (accumulator, component) -> accumulator + component*component

    scale: (factor) ->
        @fmap (component) -> component * factor

    invert: ->
        @scale -1

    add: (vector) ->
        @vmap vector, (c1, c2) -> c1 + c2
    
    subtract: (vector) ->
        @add(vector.invert())

    as_css: ->
        left:@components[0]
        top:@components[1]

    equals: (vector) ->
        _.all _.zip(@components, vector.components), (item) -> item[0] == item[1]

    distance: (vector) ->
        @minus(vector).magnitude()

    unit: ->
        @scale 1/@magnitude()

    angle: ->
        Math.atan2 @components[1], @components[0]

    x: -> @components[0] or 0
    y: -> @components[1] or 0
    z: -> @components[2] or 0

Vector::plus = Vector::add
Vector::minus = Vector::subtract
window.V = -> new Vector arguments...
