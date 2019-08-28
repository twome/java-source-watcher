#!/usr/bin/env node

const { exec } = require('child_process')
const { argv } = process
const { info, debug } = console

const chokidar = require('chokidar')

const asciiEscChar = '\x1b' // This is being escaped by the JS parser – it is an ASCII 'ESC' character from then on
const csi = asciiEscChar + '[' // ANSI's "Control Sequence Introducer"
const controlSequenceEnd = 'm' // from ANSI

const colorSequence = code => csi + code + controlSequenceEnd

const clearColors = colorSequence('0')

const redUnderline = string => colorSequence('31;1') + string + clearColors
const green = string => colorSequence('32') + string + clearColors
const pink = string => colorSequence('35') + string + clearColors
const underline = string => colorSequence('0;4') + string + clearColors
const yellow = string => colorSequence('40') + string + clearColors

const useExeDir = false
const argsToProgram = argv.slice(1)
const executeOutput = argsToProgram.includes('--execute-output')
const classesToExecute = executeOutput ? argv.slice(argv.indexOf('--execute-output') + 1) : []
info(`Executing classes: ${classesToExecute.join(', ')}`)

const sourceFileWatcher = chokidar.watch('**/*.java', {
	ignored: [
		/(^|[/\\])\../ // dotfiles
	],
	persistent: true
})

let compilationProcesses = new Map()

const handler = (path, stats) => {
	let timeSansMs = (new Date()).toISOString().replace('T',' ').split('.')[0]
	console.info(`${yellow(timeSansMs)} ~ ${underline(path)} changed; compiling${executeOutput ? ' and running' : ''}...`)

	let srcName = path.replace(/\.java$/, '')
	let outputDirFlag = useExeDir ? ' -d bin' : ''

	let hitCompilerError = false

	let compilationProcess = exec(`javac ${srcName}.java${outputDirFlag}`, err => {
		if (!err) return
		hitCompilerError = true
		console.error(redUnderline(`Compiler exited with code: ${err.code}`))
	})

	let { pid } = compilationProcess
	compilationProcesses.set(pid, { name: srcName, startTime: new Date() })


	compilationProcess.stdout.on('end', () => {
		const executionTime = (new Date() - compilationProcesses.get(pid).startTime) / 1000

		if (!hitCompilerError) console.info(green(`[\``) + compilationProcesses.get(pid).name + green(`\` compiled with no errors after `) + `${executionTime}s` + green(`]`))

		if (executeOutput && !hitCompilerError && classesToExecute.includes(srcName)){
			console.info(`Running ${srcName}…`);

			let executionProcess = exec(`java -enableassertions ${srcName}`, err => {
				if (!err) return
				console.error(redUnderline(`JVM exited with code: ${err.code}`))
			})

			executionProcess.stdout.on('data', data => {
				process.stdout.write(green(data))
			})

			executionProcess.stderr.on('data', data => {
				process.stderr.write(pink(data))
			})
		}
	})

	compilationProcess.stderr.on('data', data => {
		hitCompilerError = true
		process.stderr.write(pink(data))
	})
}

sourceFileWatcher
	.on('add', handler) // We need this to compile & run when first running this JS module
	.on('change', handler)
	.on('unlink', handler)
