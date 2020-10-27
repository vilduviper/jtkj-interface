/**
 * @file config.js
 * @brief Configuration for gateway.js
 * @author Vili Pelttari
 * @date 27.10.2020
 */
const util = require("./lib/util.js");
var gateway = {};

gateway.mqtt = {};
gateway.mqtt.host = 'mqtt://localhost:10311';
gateway.mqtt.options = {
    //ca: fs.readFileSync('certs/root/root.crt'), // XXX a custom certificate file
  // XXX client certificates for MQTTS (TLS version of MQTT):
    //key: fs.readFileSync('certs/client/client.key'),
    //cert: fs.readFileSync('certs/client/client.crt'),
};
gateway.uart = {};
gateway.uart.txlength = 17;
gateway.uart.baudRate = 9600;

// Delimiter parser
gateway.uart.pipe = "delimiter";
gateway.uart.delim = "\x00";

// Length parser
//gateway.uart.pipe = "length";
gateway.uart.rxlength = 82;

gateway.ports = {};
gateway.ports.autofind = true;
gateway.ports.maxTries = 5;

// Mutes the 'Broker unreachable' warning if it is spammed
gateway.muteConnectionError = false;

gateway.topics = [ // for SensorTag data topics
  "event",
  "sensordata",
];
gateway.dataTypes = [{
    shortName: "time",
    nameInDB: "timestamp",
    topics: ["event", "sensordata"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => { // d is String
      let a = Number.parseInt(d);
      if (isNaN(a)) reject("Error: Non-numeric timestamp: " + d);
      resolve(a);
    }),
  }, {
    shortName: "id",
    nameInDB: "sensortagID",
    topics: ["event", "sensordata"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      if (!isNaN(Number.parseInt(d, 16)) && d.length <= 4) {
        resolve(d);
      } else reject("Error: SensorTag ID has to be 4 hex digits: " + d);
    }),
  },


  {
    shortName: "event",
    nameInDB: "movement",
    topics: ["event"],
    forceSend: true,
    fun: d => new Promise((resolve, reject) => {
      if (["UP", "DOWN", "LEFT", "RIGHT"].includes(d.trim())) resolve(d.trim());
      else reject("Error: Event name not recognized: " + d);
    }),
  },


  {
    shortName: "temp",
    nameInDB: "temperature",
    topics: ["sensordata"],
    forceSend: true,
    fun: d => new Promise((resolve, reject) => {
      let a = Number.parseFloat(d);
      if (isNaN(a)) reject("Error: Non-numeric temperature: " + d);
      resolve(a);
    }),
  }, {
    shortName: "humid",
    nameInDB: "humidity",
    topics: ["sensordata"],
    forceSend: true,
    fun: d => new Promise((resolve, reject) => {
      let a = Number.parseFloat(d);
      if (isNaN(a)) reject("Error: Non-numeric humidity: " + d);
      resolve(a);
    }),
  }, {
    shortName: "press",
    nameInDB: "pressure",
    topics: ["sensordata"],
    forceSend: true,
    fun: d => new Promise((resolve, reject) => {
      let a = Number.parseFloat(d);
      if (isNaN(a)) reject("Error: Non-numeric pressure: " + d);
      resolve(a);
    }),
  }, {
    shortName: "light",
    nameInDB: "lightIntensity",
    topics: ["sensordata"],
    forceSend: true,
    fun: d => new Promise((resolve, reject) => {
      let a = Number.parseFloat(d);
      if (isNaN(a)) reject("Error: Non-numeric light intensity: " + d);
      resolve(a);
    }),
  }, {
    shortName: "accx",
    nameInDB: "accx",
    topics: ["sensordata"],
    forceSend: true,
    fun: d => new Promise((resolve, reject) => {
      let a = Number.parseFloat(d);
      if (isNaN(a)) reject("Error: Non-numeric acceleration (x): " + d);
      resolve(a);
    }),
  }, {
    shortName: "accy",
    nameInDB: "accy",
    topics: ["sensordata"],
    forceSend: true,
    fun: d => new Promise((resolve, reject) => {
      let a = Number.parseFloat(d);
      if (isNaN(a)) reject("Error: Non-numeric acceleration (y): " + d);
      resolve(a);
    }),
  }, {
    shortName: "accz",
    nameInDB: "accz",
    topics: ["sensordata"],
    forceSend: true,
    fun: d => new Promise((resolve, reject) => {
      let a = Number.parseFloat(d);
      if (isNaN(a)) reject("Error: Non-numeric acceleration (z): " + d);
      resolve(a);
    }),
  }, {
    shortName: "gyrox",
    nameInDB: "gyrox",
    topics: ["sensordata"],
    forceSend: true,
    fun: d => new Promise((resolve, reject) => {
      let a = Number.parseFloat(d);
      if (isNaN(a)) reject("Error: Non-numeric gyroscope (x): " + d);
      resolve(a);
    }),
  }, {
    shortName: "gyroy",
    nameInDB: "gyroy",
    topics: ["sensordata"],
    forceSend: true,
    fun: d => new Promise((resolve, reject) => {
      let a = Number.parseFloat(d);
      if (isNaN(a)) reject("Error: Non-numeric gyroscope (y): " + d);
      resolve(a);
    }),
  }, {
    shortName: "gyroz",
    nameInDB: "gyroz",
    topics: ["sensordata"],
    forceSend: true,
    fun: d => new Promise((resolve, reject) => {
      let a = Number.parseFloat(d);
      if (isNaN(a)) reject("Error: Non-numeric gyroscope (z): " + d);
      resolve(a);
    }),
  }
];

gateway.server = {};
gateway.server.baudRate = 57600;
gateway.server.pipe = "length";
gateway.isServer = false;

util.parseArgv(gateway);

module.exports = gateway;
