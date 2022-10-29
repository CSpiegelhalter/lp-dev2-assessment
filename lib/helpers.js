const readline = require('readline')

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: 'LP Bank> ',
})

rl.on('close', () => {
	process.exit(1)
})

let connectedTellers = []
let connectedCustomers = []
let currentlyBeingServed = []


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
	process.stdout.cursorTo(0, 0)
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


/**
 * @param current  The connection that is currently sending a message
 * @param server The teller in chat
 * @param customer  The customer in chat
 * @param message  The message being sent in the chat
 * 
 * This takes the messaage being sent, uses the current connection as reference to figure out
 * who the message is being sent to and adjust the chat names accordingly 
 */
function updateChat(current, server, customer, message) {
	let tellerPrefix
	let customerPrefix


	if (current.role === 'teller') {
		tellerPrefix = '(you) '
		customerPrefix = '[ TELLER ] '
	}
	else {
		tellerPrefix = `(Customer ${customer.customerCount}) `
		customerPrefix = '[ YOU ] '
	}

	send_message(server.conn, tellerPrefix + message)
	send_message(customer.conn, customerPrefix + message)
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
function send_message(conn, message, type = 'bank') {
	conn.write(JSON.stringify({ type, message: message + TERM }))
}

class Customer {
	constructor(customerCount, conn, serverId) {
		this.customerCount = customerCount
		this.conn = conn
		this.role = 'customer'
		this.balance = 100
		this.serverId = serverId
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

class Teller {
	constructor(serverId, conn) {
		this.serverId = serverId
		this.conn = conn
		this.role = 'teller'
	}

}

/**
 * ID generator used for Teller/Customer pairing
 */
function guidGenerator() {
	var S4 = function () {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
	}
	return (
		S4() +
		S4() +
		'-' +
		S4() +
		'-' +
		S4() +
		'-' +
		S4() +
		'-' +
		S4() +
		S4() +
		S4()
	)
}

/**
 * @param str  String that you want to be converted to a number
 * Takes a string and converts it to a number. Will remove non-numeric values.
 * Returns undefined if it's unable to convert to number
 */
function toNumber(str) {
	if (typeof str === 'number') return str
	if (str == null || str === '') return undefined
	str = str.replace?.(/[^0-9.]/g, '')
	let ret = Number(str)
	return isNaN(ret) ? undefined : ret
}

/**
 * Loops through each connections array and checks if the socket has been destroyed.
 * Removes socket from array, if so
 */
function removeClosedConnections() {
	let allConnections = [connectedCustomers, connectedTellers, currentlyBeingServed]

	for (let currentArray of allConnections) {
		for (let obj of currentArray) {
			if (obj.conn.destroyed) {
				currentArray.splice(currentArray.indexOf(obj), 1)
				if (obj.serverId) {
					updateTeller(obj.serverId)
				}
			}
		}
	}
}

// If customer disconnects mid-chat we need to notify teller
function updateTeller(id) {
	let tellerToUpdate = connectedTellers.find((teller) => teller.serverId === id)
	tellerToUpdate.serverId = null
	send_message(tellerToUpdate.conn, '[ CLIENT DISCONNECTED. TYPE "next" TO CHOOSE A NEW CLIENT ]')
}



module.exports = {
	render,
	handle_input,

	handle_message,
	send_message,

	Customer,
	Teller,
	guidGenerator,
	updateChat,
	toNumber,
	connectedTellers,
	connectedCustomers,
	currentlyBeingServed,
	removeClosedConnections,

	red,
	green,
	yellow,
	blue,
}