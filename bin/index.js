#!/usr/bin/env node

const { exec } = require('child_process')
const { argv } = process
const { info, debug } = console

const chokidar = require('chokidar')
const { redUnderline, green, pink, underline, yellow } = require('../colouring.js')

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
