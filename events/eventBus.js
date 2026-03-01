const EventEmitter = require("events");

class OrderBus extends EventEmitter { }

const orderBus = new OrderBus();

module.exports = orderBus;
