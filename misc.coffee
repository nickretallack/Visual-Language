blab = -> console.log arguments

last = (list) -> list[list.length-1]
obj_first = (obj) ->
    for key, item of obj
        return item

RegExp.escape = (s) -> s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')