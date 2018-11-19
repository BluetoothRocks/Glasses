(function() {
	'use strict';
	
	let CHEMION_TYPE = {
		REQUEST: 0x01,
		REPLY: 0x02,
		STREAM: 0x03
	}
	
	let CHEMION_COMMAND = {
		BATTERY_LEVEL: 0x03,
		FIRMWARE_VERSION: 0x08,
		FRAME_DATA: 0x06,
	}

	class BluetoothChemion {
		constructor() {
			this._EVENTS = {};
			this._PROMISES = {};
			
            this._TX = null;
            this._RX = null;

			this._QUEUE = [];
			this._WORKING = false;
		}
		
		connect() {
            return new Promise(async (resolve, reject) => {
				try {
		            let device = await navigator.bluetooth.requestDevice({
				        filters: [
				        	{ namePrefix: 'CHEMION' }
				        ],
				        optionalServices: [
					        '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
					    ]
					});
					
					device.addEventListener('gattserverdisconnected', this._disconnect.bind(this));
					
					let server = await device.gatt.connect();				
					let service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');

					this._TX = await service.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e');

					this._RX = await service.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
					this._RX.startNotifications();
					this._RX.addEventListener('characteristicvaluechanged', function(e) { 
						try {
							let reply = this._decodeMessage(e.target.value);
						
							if (reply.type === CHEMION_TYPE.REPLY) {
								this._handleReply(reply.payload);
							}
						}
						catch(error) {
							console.log('Could not decode message! ' + error, e.target.value);
						}
					}.bind(this));	
		            

		            resolve();
		        }
				catch(error) {
	                console.log('Could not connect! ' + error);
					reject();
				}
			});
        }
        
        getBattery() {
            return new Promise((resolve) => {
	            this._PROMISES.battery = resolve;
	            
				let payload = new Uint8Array(3);
				payload[0] = 0x01;
				payload[1] = 0x00;
				payload[2] = CHEMION_COMMAND.BATTERY_LEVEL;
				this._queue(this._encodeMessage(CHEMION_TYPE.REQUEST, payload));
			});
        }
        
        getFirmware() {
            return new Promise((resolve) => {
	            this._PROMISES.firmware = resolve;
	            
				let payload = new Uint8Array(3);
				payload[0] = 0x01;
				payload[1] = 0x00;
				payload[2] = CHEMION_COMMAND.FIRMWARE_VERSION;
				this._queue(this._encodeMessage(CHEMION_TYPE.REQUEST, payload));
			});
        }
        
		frame(data) {
			let payload = new Uint8Array(57);
			payload[0] = 0x01;
			payload[1] = 0x00;
			payload[2] = CHEMION_COMMAND.FRAME_DATA;
			
			for (let i = 0; i < 54; i++) {				
				payload[i + 3] = 
					(data[(i * 4)    ] >> 6 << 6) |
					(data[(i * 4) + 1] >> 6 << 4) |
					(data[(i * 4) + 2] >> 6 << 2) |
					(data[(i * 4) + 3] >> 6);
			}

			this._queue(this._encodeMessage(CHEMION_TYPE.STREAM, payload));
   		}
				
		addEventListener(e, f) {
			this._EVENTS[e] = f;
		}

		isConnected() {
			return this._TX && this._RX;
		}
			
		_disconnect() {
            console.log('Disconnected from GATT Server...');

			this._TX = null;
			this._RX = null;
			
			if (this._EVENTS['disconnected']) {
				this._EVENTS['disconnected']();
			}
		}
		
		_queue(message) {
			var that = this;
			
			function run() {
				if (!that._QUEUE.length) {
					that._WORKING = false; 
					return;
				}
				
				that._WORKING = true;
                that._TX.writeValue(that._QUEUE.shift()).then(() => run() );
			}

            const maxLength = 20;
            let chunks = Math.ceil(message.length / maxLength);

            if (chunks === 1) {
                that._QUEUE.push(message);
            } else {
                for (let i = 0; i < chunks; i++) {
                    let byteOffset = i * maxLength;
                    let length = Math.min(message.length, byteOffset + maxLength);
                    that._QUEUE.push(message.slice(byteOffset, length));
                }
            }
			
			if (!that._WORKING) run();	
		}


		_encodeMessage(type, payload) {
			let message = new Uint8Array(payload.length + 7);
			
			message[0] = 0xfa;
			message[1] = type;
			message[2] = payload.length / 0xff;
			message[3] = payload.length % 0xff;
			
			message.set(payload, 4);
			
			message[message.length - 3] = payload.reduce((p, c) => p ^ c);
			message[message.length - 2] = 0x55;
			message[message.length - 1] = 0xa9;
			
			return message;
		}
		
		_decodeMessage(message) {
			if (message.getUint8(0) != 0xfa) {
				throw new Error('Message does not start with 0xfa');
			}
			
			if (message.getUint16(message.byteLength - 2) != 0x55a9) {
				throw new Error('Message does not end with 0x55a9');
			}
			
			if (message.getUint16(2) != message.byteLength - 7) {
				throw new Error('Message does not have the correct size');
			}
			
			let type = message.getUint8(1);
			let payload = new Uint8Array(message.buffer.slice(4, -3));

			if (message.getUint8(message.byteLength - 3) != payload.reduce((p, c) => p ^ c)) {
				throw new Error('Checksum is not correct');
			}
		
			return { type, payload };
		}
		
		_handleReply(payload) {
			let command = payload[2];
			
			switch (command) {
				case CHEMION_COMMAND.BATTERY_LEVEL:
					if (this._PROMISES.battery) {
						this._PROMISES.battery(payload[3]);
					}
					
					break;
					
				case CHEMION_COMMAND.FIRMWARE_VERSION:
					if (this._PROMISES.firmware) {
						this._PROMISES.firmware(payload[3] + '.' + payload[4] + '.' + payload[5]);
					}
					
					break;
				
			}
		}
	}

	window.BluetoothChemion = new BluetoothChemion();
})();

