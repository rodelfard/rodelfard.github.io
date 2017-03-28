﻿'use strict';

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const logger = require('../common/logger');
const assert = require('assert');

/**
 * Packet list where the key is the header, and the
 * value is the packet event handler function.
 * 
 * @type {Array}
 */
const packets = [];

/**
 * Get packet handler associated.
 *
 * @param header key for packets
 * @returns {function} packet handler
 * @exports
 */
function getPacketHandler(header) {
    return packets[header];
}

/**
 * @exports
 */
module.exports = (header) => {
    if (header && !!packets.length) {
        return getPacketHandler(header);
    }

    // throw err:
    if (header)
        return false;

    const recursive = directory => fs.readdirAsync(directory).filter(file => {
        return (file.indexOf('.') !== 0) && (file !== 'incoming.js') && (file !== 'incoming_packet.js');
    }).map(file => {
        file = path.join(directory, file);
        return fs.statAsync(file).then(stat => stat.isDirectory() ? recursive(file) : file);
    }).reduce((a, b) => a.concat(b), []);

    recursive(__dirname + '/incoming')
        .each((file) => {
            const packet = require(file);

            if (packet.serial && packet.handle) {
                assert.equal(typeof packet.serial, 'number', 'Packet serial must be a number!');
                assert.equal(typeof packet.handle, 'function', 'Packet event handler must be a function!');

                packets[packet.serial] = packet.handle;
                logger.debug(`Loaded the ${packet.handle.name} packet event.`);
            }
        });
}

module.exports.getPacketHandler = getPacketHandler;