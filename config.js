/**
 * @file config.js
 * @brief Configuration for interface.js
 * @author Vili Pelttari
 */
const util = require("./lib/util.js");
const fs = require("fs");
var interface = {};

interface.mqtt = {};
interface.mqtt.host = 'mqtt://localhost:10311';
interface.mqtt.options = {
  /*ca: fs.readFileSync('certs/ca.crt'),
  key: fs.readFileSync('certs/mqttClientKey.key'),
  cert: fs.readFileSync('certs/mqttClientKey.crt'),*/
  rejectUnauthorized: false
};

interface.socket = {};
interface.socket.host = "https://computer-systems-database-connector-2021.rahtiapp.fi";
interface.socket.options = {
  reconnect: true,
  secure: true,
  path: "/api/v1/databaseconnector/sockets"
};

interface.offline = false;

// XXX: There are interface server related values at the bottom
interface.uart = {};
interface.uart.txlength = 80;
interface.uart.baudRate = 9600;

// UART message parser type
interface.uart.pipe = "delimiter";
//interface.uart.pipe = "length";

// Delimiter parser
interface.uart.delim = "\x00";

// Length parser
interface.uart.rxlength = 82;

interface.ports = {};
interface.ports.autofind = true;
interface.ports.maxTries = 5;

// Mutes the 'Broker unreachable' warning if it is spammed
interface.muteConnectionError = false;

// Time after which connected addresses aren't remembered, in milliseconds.
// Used for limiting reply messages from being broadcast from multiple interfaces
interface.connectedAddressTimeout = 10000;

// How many rows of sensor data will be gathered from any SensorTag.
/* Value is an approximation: 
 *  Raspberry 3 Model B+ has about 924 MiB of RAM. After starting three docker containers and this
 *  interface program, there is 440 MiB free RAM. If at maximum we would allocate 400 MiB for the
 *  session data, assuming there are 1000 SensorTags, each sensor value is 64 bits = 8 bytes, there
 *  is no data structure overhead, and there are 11 different sensor data columns, this results in
 *    400 MiB / (1000*8*11/1024^2 MiB) ≈ 4766
 *  rows of data per SensorTag.
 *
 *  The value 4500 enables a SensorTag to send sensor data for 3 minutes 45 seconds, one row every
 *  50 milliseconds. If the maximum number of rows is exceeded, extra rows are not added to sensor
 *  data, and session:end still sends the so-far accumulated data to the database.
 */
interface.maxSessionRows = 4500;

interface.topics = [ // All possible SensorTag data topics. Dummy topics are used for interface commands
  "event",
  "tamaActions",
  "additionalMessages",
  "sensordata",
  "commands" // dummy topic for internal commands
];
/**
 * Different data fields to be received via UART.
 *
 * Element description: A dictionary with values
 *  shortName - name in received UART message
 *  nameInDB  - name to be used when sending the property via backend connection
 *  topics    - the backend connection topics where this property can be sent to, an array
 *  forceSend - false or undefined. False when this property alone doesn't cause a message to
 *              be sent to backend. Undefined otherwise
 *  fun       - A Promise-type function with one argument, used to parse the data from the UART
 *              message. Argument is the data belonging to this property ({shortName}:{argument}).
 *              Resolve gives the processed data on success, and reject message is shown in terminal on fail.
 */
interface.dataTypes = [{
    shortName: "time",
    nameInDB: "timeStamp",
    topics: ["event", "sensordata"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => { // d is String
      let a = Number(d);
      if (isNaN(a) || d == '') reject("Error: Non-numeric timestamp: " + d);
      resolve(a);
    }),
  }, { // ID is special. It will be picked in the readDataTokens and forwarded to other functions. TODO experiment if this can be relaxed
    shortName: "id",
    nameInDB: "sensortagID",
    topics: ["event", "additionalMessages"],
    forceSend: false, // Reception doesn't warrant a send on the associated topics
    fun: d => new Promise((resolve, reject) => {
      if (!isNaN(Number("0x" + d)) && d.length <= 4 && d != '') {
        resolve(d);
      } else reject("Error: SensorTag ID has to be 4 hex digits: " + d);
    }),
  }, {
    shortName: "ping",
    nameInDB: "ping",
    topics: ["commands"], // dummy topic
    forceSend: false, // don't send interface-related data to backend
    fun: d => new Promise((resolve, reject) => {
      resolve("pong");
    }),
  }, {
    shortName: "session",
    nameInDB: "session",
    topics: ["commands"], // dummy topic
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      if (["start", "end"].includes(d)) resolve(d == "start");
      else reject("Error: Session instruction not recognized: " + d);
    }),
  },


  {
    shortName: "EAT",
    nameInDB: "eat",
    topics: ["tamaActions"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      let a = Number(d);
      if (isNaN(a) || d == '') reject("Error: Non-numeric EAT increment: " + d);
      if (!Number.isFinite(a)) reject("Error: Tamagotchi cannot EAT the amount: " + a);
      resolve([a, 0, 0]);
    }),
  },
  {
    shortName: "EXERCISE",
    nameInDB: "exercise",
    topics: ["tamaActions"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      let a = Number(d);
      if (isNaN(a) || d == '') reject("Error: Non-numeric EXERCISE increment: " + d);
      if (!Number.isFinite(a)) reject("Error: Tamagotchi cannot EXERCISE the amount: " + a);
      resolve([0, a, 0]);
    }),
  },
  {
    shortName: "PET",
    nameInDB: "pet",
    topics: ["tamaActions"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      let a = Number(d);
      if (isNaN(a) || d == '') reject("Error: Non-numeric PET increment: " + d);
      if (!Number.isFinite(a)) reject("Error: Tamagotchi cannot be PET the amount: " + a);
      resolve([0, 0, a]);
    }),
  },
  {
    shortName: "ACTIVATE",
    nameInDB: "ACTIVATE",
    topics: ["tamaActions"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      let a = d.split(";").map(k => Number(k));
      if (a.length != 3) reject("Error: ACTIVATE needs three arguments.");
      if (a.some(k => isNaN(k)) || d == '') reject("Error: Non-numeric ACTIVATE increment: " + d);
      if (a.some(k => Number.isFinite(a))) reject("Error: Tamagotchi cannot be ACTIVATEd the amounts: " + d);
      resolve(a);
    }),
  },
  {
    shortName: "MSG1",
    nameInDB: "msg1",
    topics: ["additionalMessages"],
    forceSend: true,
    fun: d => new Promise((resolve, reject) => {
      resolve(d);
    }),
  },
  {
    shortName: "MSG2",
    nameInDB: "msg2",
    topics: ["additionalMessages"],
    forceSend: true,
    fun: d => new Promise((resolve, reject) => {
      resolve(d);
    }),
  },


  {
    shortName: "temp",
    nameInDB: "temperature",
    topics: ["sensordata"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      let a = Number(d); // Usage of Number is important: It makes sure the whole string is numeric!
      if (isNaN(a) || d == '') reject("Error: Non-numeric temperature: " + d);
      resolve(a);
    }),
  }, {
    shortName: "humid",
    nameInDB: "humidity",
    topics: ["sensordata"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      let a = Number(d);
      if (isNaN(a) || d == '') reject("Error: Non-numeric humidity: " + d);
      resolve(a);
    }),
  }, {
    shortName: "press",
    nameInDB: "pressure",
    topics: ["sensordata"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      let a = Number(d);
      if (isNaN(a) || d == '') reject("Error: Non-numeric pressure: " + d);
      resolve(a);
    }),
  }, {
    shortName: "light",
    nameInDB: "lightIntensity",
    topics: ["sensordata"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      let a = Number(d);
      if (isNaN(a) || d == '') reject("Error: Non-numeric light intensity: " + d);
      resolve(a);
    }),
  }, {
    shortName: "ax",
    nameInDB: "ax", // ax is used as a special variable in the unwrap function
    topics: ["sensordata"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      let a = Number(d);
      if (isNaN(a) || d == '') reject("Error: Non-numeric acceleration (x): " + d);
      resolve(a);
    }),
  }, {
    shortName: "ay",
    nameInDB: "ay",
    topics: ["sensordata"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      let a = Number(d);
      if (isNaN(a) || d == '') reject("Error: Non-numeric acceleration (y): " + d);
      resolve(a);
    }),
  }, {
    shortName: "az",
    nameInDB: "az",
    topics: ["sensordata"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      let a = Number(d);
      if (isNaN(a) || d == '') reject("Error: Non-numeric acceleration (z): " + d);
      resolve(a);
    }),
  }, {
    shortName: "gx",
    nameInDB: "gx",
    topics: ["sensordata"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      let a = Number(d);
      if (isNaN(a) || d == '') reject("Error: Non-numeric gyroscope (x): " + d);
      resolve(a);
    }),
  }, {
    shortName: "gy",
    nameInDB: "gy",
    topics: ["sensordata"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      let a = Number(d);
      if (isNaN(a) || d == '') reject("Error: Non-numeric gyroscope (y): " + d);
      resolve(a);
    }),
  }, {
    shortName: "gz",
    nameInDB: "gz",
    topics: ["sensordata"],
    forceSend: false,
    fun: d => new Promise((resolve, reject) => {
      let a = Number(d);
      if (isNaN(a) || d == '') reject("Error: Non-numeric gyroscope (z): " + d);
      resolve(a);
    }),
  }
];

// Server settings:

interface.server = {};
interface.server.baudRate = 57600;
interface.server.pipe = "delimiter";
interface.server.delim = Buffer.of(242);
interface.isServer = false;

// Interval between checking if the ServerTag has crashed, in milliseconds
// If this value is changed, please change it also in the ServerTag!
interface.heartbeatInterval = 15000;

interface.debugMode = false;

// TODO maybe disable terminal clearing in server mode? It would function as a log

// Parse command line arguments that change values defined here
util.parseArgv(interface);

// Global variables
interface.connectedAddresses = {};
interface.port = undefined; // the serial port after it has been found and connected to


module.exports = interface;
