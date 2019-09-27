const asciiEscChar = '\x1b' // This is being escaped by the JS parser – it is an ASCII   ⋮ 'ESC' character from then on
const csi = asciiEscChar + '[' // ANSI's "Control Sequence Introducer"
const controlSequenceEnd = 'm' // from ANSI

const colorSequence = code => csi + code + controlSequenceEnd

const clearColors = colorSequence('0')

const redUnderline = string => colorSequence('31;1') + string + clearColors
const green = string => colorSequence('32') + string + clearColors
const pink = string => colorSequence('35') + string + clearColors
const underline = string => colorSequence('0;4') + string + clearColors
const yellow = string => colorSequence('33') + string + clearColors

module.exports = { redUnderline, green, pink, underline, yellow }
