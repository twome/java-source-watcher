#!/usr/bin/env node

const { exec, execSync } = require('child_process')
let { readdir } = require('fs')
const { argv } = process
const { info, debug, error } = console
const print = msg => process.stdout.write(msg)

const chokidar = require('chokidar')
const { redUnderline, green, pink, underline, yellow } = require('../colouring.js')

readdir = require('util').promisify(readdir)

;(async ()=>{

const useExeDir = false
const argsToProgram = argv.slice(1)

// C-L arguments
const willCompileTests = argsToProgram.includes('--compile-tests')
const willOnlyTest = argsToProgram.includes('--only-run-tests')
const willRunTests = argsToProgram.includes('--run-tests') || willOnlyTest
const willExecuteOutput = argsToProgram.includes('--execute-output') && !willRunTests

const classesToExecute = willExecuteOutput ? argv.slice(argv.indexOf('--execute-output') + 1) : []
if (willExecuteOutput) info(`Executing classes: ${classesToExecute.join(', ')}`)


const runHarness = moduleName => {
	// TODO deduplicate / throttle
	exec(`java -enableassertions ${moduleName}TestHarness`, (nodeError, stdout, stderr) => {
		if (nodeError){
			error(`=== J-SOURCE-WATCHER ERROR ===`)
			error(pink(nodeError))
			return false
		}
		print(stdout)
		process.stderr.write(pink(stderr))
	})
}



let sourcesToWatch = '**/*.java'
let ignored = [
	/(^|[/\\])\../, // dotfiles
	/(^|[/\\])no-compile/
]
if (!willCompileTests){
	ignored.push(/TestHarness\.java$/)
	ignored.push(/\/test\/$/)
}
const sourceFileWatcher = chokidar.watch(sourcesToWatch, {
	ignored,
	persistent: true
})

let compilationProcesses = new Map()

const sourceHandler = (path, stats) => {
	let timeSansMs = (new Date()).toISOString().replace('T',' ').split('.')[0]
	console.info(`${yellow(timeSansMs)} ~ ${underline(path)} changed; compiling${willExecuteOutput ? ' and running' : ''}...`)

	let moduleName = path.replace(/\.java$/, '')
	let outputDirFlag = useExeDir ? ' -d bin' : ''

	let hitCompilerError = false

	let compilation = exec(`javac ${moduleName}.java${outputDirFlag}`, err => {
		if (!err) return
		hitCompilerError = true
		console.error(redUnderline(`${moduleName} compilation exited with code: ${err.code}`))
	})

	let { pid } = compilation
	compilationProcesses.set(pid, {
		name: moduleName,
		startTime: new Date()
	})

	compilation.stdout.on('end', () => {
		const processInfo = compilationProcesses.get(pid)
		compilationProcesses.delete(pid)
		const executionTime = (new Date() - processInfo.startTime) / 1000

		if (!hitCompilerError){
			print('\n' + green(`[\``) + processInfo.name + green(`\` compiled with no errors after `) + `${executionTime}s` + green(`]`))
			if (compilationProcesses.size > 0){
				print(` (${compilationProcesses.size} remaining.)`)
			} else {
				print(` (Compilation done.)`)
			}
			print('\n')
		}

		if (willExecuteOutput && !hitCompilerError && classesToExecute.includes(moduleName)){
			console.info(`Running ${moduleName}…`);

			let execution = exec(`java -enableassertions ${moduleName}`, err => {
				if (!err) return
				console.error(redUnderline(`JVM exited with code: ${err.code}`))
			})

			execution.stdout.on('data', data => {
				print(green(data))
			})

			execution.stderr.on('data', data => {
				process.stderr.write(pink(data))
			})
		}
	})

	compilation.stderr.on('data', data => {
		hitCompilerError = true
		process.stderr.write(pink(data))
	})
}

if (!willOnlyTest){
	sourceFileWatcher
		.on('add', sourceHandler) // We need this to compile & run when first running this JS module
		.on('change', sourceHandler)
		.on('unlink', sourceHandler)
}



let harnessNames = new Set()

if (willRunTests) {
	let filenames = await readdir(process.cwd())

	harnesses = filenames.filter(name => name.match(/TestHarness\.java$/))
	for (let filename of harnesses){
		let moduleName = filename.replace(/\.(class|java)$/, '').replace(/TestHarness$/, '')
		harnessNames.add(moduleName)
	}

	// Watch the subject module code
	chokidar.watch([...harnessNames].map(name => name + '.java'), { persistent: true })
		.on('add', path => harnessHandler(path))
		.on('change', path => harnessHandler(path))
		.on('unlink', path => harnessHandler(path))

	// Watch the test output .class files.
	chokidar.watch([...harnessNames].map(name => name + 'TestHarness.class'), { persistent: true })
		.on('add', path => harnessHandler(path))
		.on('change', path => harnessHandler(path))
		.on('unlink', path => harnessHandler(path))
}

const harnessHandler = (path, stats) => {
	let moduleName = path.replace(/\.(class|java)$/, '').replace(/TestHarness$/, '')

	harnessNames.add(moduleName) // For new ones creates after starting this up

	runHarness(moduleName)
}



})() // async IIFE