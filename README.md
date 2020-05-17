# Nameless Language (Prototype)

This repo serves as a proof of concept.  It shows how you can build [a complex program](https://nickretallack.github.io/Visual-Language/#/f2983238d90bd3e0aede71aeec767ce1) using this visual programming language I created.  Future work on this project can by found at my [Nameless Language](https://github.com/nickretallack/nameless-language) repository.

I decided to rewrite the project in ReasonML for several reasons:

 * I prefer the type system of ML-family languages over JavaScript's.
 * The language I'm creating has immutability by default, so it makes sense to implement it in a language that already behaves in that way.
 * This project takes some complex algorithms.  Having compile-time type checks makes my code less brittle and saves time testing.
 * I wanted to rewrite the layout system so it would automatically position nodes nicely without requiring the user to drag them around.
 
I posted a story on [how I came up with this language](https://medium.com/@nickretallack/creating-nameless-an-accessible-visual-programming-language-1a8984c5478a).
