## Installation

`npm install --global https://github.com/twome/java-source-watcher`

or 

`yarn global add https://github.com/twome/java-source-watcher`

## Usage

Watch out for mixed-up asynchronous output if you're executing multiple classes (see the `Running MatrixHelper…` line that interleaves with the compilation messages?):

```
❯ j-source-watcher --execute-output MatrixHelper
Executing classes: MatrixHelper
2019-08-28 06:37:36 ~ ArrayReader.java changed; compiling and running...
2019-08-28 06:37:36 ~ Exceptions.java changed; compiling and running...
2019-08-28 06:37:36 ~ Matrix.java changed; compiling and running...
2019-08-28 06:37:36 ~ MatrixHelper.java changed; compiling and running...
2019-08-28 06:37:36 ~ Vector.java changed; compiling and running...
[`Exceptions` compiled with no errors after 3.838s]
[`Matrix` compiled with no errors after 4.396s]
[`Vector` compiled with no errors after 4.398s]
[`MatrixHelper` compiled with no errors after 4.454s]
Running MatrixHelper…
[`ArrayReader` compiled with no errors after 4.49s]
Now we're going to multiply 'matrixA.txt' by 'matrixB.txt'...
matrixA.txt:
1 2 3
3 2 1
matrixB.txt:
1 3
2 3
3 5
Multiplication output:
<etc>
```

## License

https://twitter.com/dril/status/814070430269054976
