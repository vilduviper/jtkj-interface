const interface = require("../config");
const Fifo = require("queue-fifo");
const portFinder = require("./portFinder");
const util = require("./util");
let uart = {};
uart.responded = false; // communicate if the challenge-response has been cleared
let uartSenderService;
let uartSendBuffer = new Fifo(); // space out outgoing UART messages in time

/**
 * @brief Send messages TXLENGTH bytes long from the UART send queue with time in between
 *
 * Monitors the UART send message queue and send messages from it with enough time in between
 * for the ServerTag to execute them properly.
 */
uartSender = uart.uartSender = () => {
  if (uartSendBuffer.isEmpty() || !interface.port) {
    return;
  }
  var [txBuf, publish] = uartSendBuffer.dequeue(), msg, addr;
  if (interface.isServer) {
    msg = txBuf.subarray(2).toString().replace(/\0/g, '');
    addr = ("0000" + txBuf.readUInt16LE().toString(16)).slice(-4);
  } else {
    msg = txBuf.toString().replace(/\0/g, '');
    addr = "";
  }
  interface.port.write(txBuf, function(err) {
    if (err) {
      util.showMsg("error", "UART write error: " + err.message);
      // prevent spam by discarding the message
    } else if (!interface.isServer) {
      util.showMsg("info", "Sent '" + msg + "' to connected SensorTag.");
    } else if (publish && interface.port.isOpen) {
      util.showMsg("info", "Sent '" + msg + "' to 0x" + addr);
    } else if (publish) {
      util.showMsg("error", "Sending aborted. SensorTag isn't connected.");
    }
  });
}
uartSenderService = setInterval(uartSender, 50);

/**
 * @brief Send an UART message. The message will be formed with the address, and added to a message
 * queue from which it will be sent by the uartSenderService
 * @param msg Dictionary describing what to send. 'str' is a necessary field. If 'addr' is
 *        specified, ServerTag will send an 6LoWPAN message to the provided address. If 'internal'
 *        is given, raw text will be sent.
 *          -str:      Message text (converted to ascii in this function, to prevent buffer problems)
 *          -addr:     Receiver address as a string of four hex characters ('ffff' is broadcast)
 *          -internal: Set if raw text has to be sent over UART
 */
uartWrite = uart.uartWrite = (msg, publish=true) => {
  let txBuf = Buffer.alloc(interface.uart.txlength), addr = "ffff";
  if (interface.debugMode) util.showMsg("info", "Added to UART send queue: 0x" + msg.addr + ":'" + msg.str + "'");
  if (interface.isServer && !("internal" in msg)) {
    if ("addr" in msg && msg.addr != null)
      addr = msg.addr;
    txBuf.writeUInt16LE(Number.parseInt(addr, 16));
    txBuf.asciiWrite(msg.str.substr(0, interface.uart.txlength-3), 2); // always ends in \0
  } else {
    txBuf.asciiWrite(msg.str.substr(0, interface.uart.txlength-1)); // always ends in \0
  }
  // Add to FIFO send queue
  uartSendBuffer.enqueue([txBuf, publish])
}

/**
 * @brief Check and send the heartbeat query. Used to check if the ServerTag has crashed
 */
heartbeat = uart.heartbeat = () => {
  let now = Date.now();
  if (interface.heartbeatInterval*1.5 < now - uart.hbTime && now - uart.hbTime < interface.heartbeatInterval*2.5) {
    util.showMsg("error", "Error: Heartbeat: The ServerTag has possibly crashed!");
  }
  uartWrite({str: "\x00\x00\x01HB", internal: true}, false);
}

/**
 * @brief Check the response to the challenge and set the current state as necessary
 * @param data The UART data buffer
 * @return Whether or not the response was satisfactory
 */
parseChallenge = uart.parseChallenge = (data) => {
  let str;
  if (interface.debugMode) {
    util.showMsg("info", "UART:" + JSON.stringify(data.toString().replace(/\x00*$/, '')));
  }
  if (data[0] == data[1] && data[1] == 0xfe && data[2] == 1) {
    str = data.slice(3).toString().replace(/\0*$/g, '');
    util.showMsg("info", "Challenge response: " + str);
    portFinder.clearBlacklist();
    uart.responded = true;
  }
  return false;
}

/**
 * @brief Send a challenge to the newly connected ServerTag and start a timeout for the function
 *        that will disconnect it if it didn't respond correctly
 */
sendChallenge = uart.sendChallenge = () => {
  uartWrite({str: "\x00\x00\x01Identify", internal: true}, false);
  uart.responded = false;
  setTimeout(function() { // wait the grace period and check 'responded' after that
    if (!uart.responded) {
      util.showMsg("info", "No response to challenge. Disconnecting.");
      portFinder.nextPort();
      interface.port.close(err => {if (err) {util.showMsg("error", "Port close error: "+err);}}); // activates port.on('close')
      util.showMsg("info", "\n");
      return;
    }
  }, 3000);
}

module.exports = uart;
