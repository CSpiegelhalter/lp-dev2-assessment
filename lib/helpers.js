const readline = require('readline')

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: 'LP Bank> ',
})

rl.on('close', () => {
	process.exit(1)
})


function render(lines) {
	clear_screen_and_scrollback()
	process.stdout.write(lines.join("\n") + "\n")

	rl.prompt()
}


function handle_input(handler) {
	rl.on('line', line => {
		handler(line.trim())
	})
}


function clear_screen_and_scrollback() {
	process.stdout.write("\u001b[3J\u001b[2J\u001b[1J");
	process.stdout.cursorTo(0,0)
	process.stdout.clearScreenDown()
}


function red(string) {
	return "\033[31;1m" + string + "\033[0m"
}

function green(string) {
	return "\033[32;1m" + string + "\033[0m"
}

function yellow(string) {
	return "\033[33;1m" + string + "\033[0m"
}

function blue(string) {
	return "\033[34;1m" + string + "\033[0m"
}




const TERM = '\u00A0'
function handle_message(conn, handler) {
	let buffer = {
		message: ''
	}

	function flush() {
		handler(buffer)

		buffer = {
			message: ''
		}
	}

	conn.on('data', packet => {
		// Convert type Buffer into string to work with
		packet = packet.toString()
		packet = JSON.parse(packet)

		// The message
		let chunk = packet.message

		// Connection type
		buffer['type'] = packet.type

		if (chunk.charAt(chunk.length - 1) === TERM) {
			buffer.message += chunk.slice(0, chunk.length - 1)
			flush()
		}
		else {
			buffer.message += chunk
		}
	})
}

/**
 * @param conn  Connection to send message to
 * @param message  Message to send
 * @param conn  Connection type
 */
function send_message(conn, message, type='bank') {
	conn.write(JSON.stringify({type, message: message + TERM}))
}

class Customer {
	constructor(customerCount, conn) {
		this.customerCount = customerCount
		this.conn = conn
		this.balance = 100
		this.beingServed = false
		this.transacting = false
		this.transactionAmount = 0
	}
	withdrawBalance(value) {
		if (value < this.balance) {
			this.balance -= value
		}
	}
}




module.exports = {
	render,
	handle_input,

	handle_message,
	send_message,

	Customer,
	
	red,
	green,
	yellow,
	blue,
}