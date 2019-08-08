#!/usr/bin/env node

const chokidar = require('chokidar')
const { exec } = require('child_process')

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
const executeOutput = process.argv.slice(1).includes('--execute-output') || false

const sourceFileWatcher = chokidar.watch('**/*.java', {
	ignored: [
		/(^|[/\\])\../ // dotfiles
	],
	persistent: true
})

const handler = (path, stats) => {
	let timeSansMs = (new Date()).toISOString().replace('T',' ').split('.')[0]
	console.debug(`\n${yellow(timeSansMs)} ~ ${underline(path)} changed; compiling${executeOutput ? ' and running' : ''}...`)

	let srcName = path.replace(/\.java$/, '')
	let outputDirFlag = useExeDir ? ' -d bin' : ''
	let execution = executeOutput ? ` && java ${srcName}` : ''

	let hitCompilerError = false

	let compilationProcess = exec(`javac ${srcName}.java${outputDirFlag}`, err => {
		if (!err) return
		hitCompilerError = true
		console.error(redUnderline(`Compiler exited with code: ${err.code}`))
	})

	compilationProcess.stdout.on('end', () => {
		if (!hitCompilerError) console.info(green('[Compiled with no errors]'))

		if (executeOutput && !hitCompilerError){
			let executionProcess = exec(`java ${srcName}`, err => {
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
