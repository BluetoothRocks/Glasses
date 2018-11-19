let data = new Uint8Array(216);




/* Pills */

document.getElementById('text').addEventListener('click', (e) => {
	document.body.classList.remove('text', 'equalizer');
	document.body.classList.add('text');
});

document.getElementById('equalizer').addEventListener('click', (e) => {
	document.body.classList.remove('text', 'equalizer');
	document.body.classList.add('equalizer');
});




/* Connect to device */
emulateState = false;

document.getElementById('connect')
	.addEventListener('click', () => {
		BluetoothChemion.connect()
			.then(() => {
				document.body.classList.add('connected');
				
				BluetoothChemion.addEventListener('disconnected', () => {
					document.body.classList.remove('connected');
				});
				
				startText();
				startAnalyzer();
			})
			.catch((error) => {
				console.log(error);
			});
	});

document.getElementById('emulate')
	.addEventListener('click', () => {
	    emulateState = true;
		document.body.classList.add('connected');
		
		function emulate() {
			startText();
			startAnalyzer();
		}

		emulate();
	});




/* Draw text */

function startText() {
	let pos = 0;
	let width = 24;
	
	
	function renderText() {
		let source = document.getElementById('sourceText').value;
		let chars = Char8.transform(source);
		
		width = Math.max(24, (chars.length + 1) * 8);
	 	let canvas = new Uint8Array(width * 8);
	 	
		for (i = 0; i < chars.length; i++) {
			let glyph = Char8.getGlyph(chars[i]);
			
			for (y = 0; y < 8; y++) {
				for (x = 0; x < 8; x++) {
					if (glyph[y] & (0x80 >> x)) {
						canvas[(i * 8 + x) + (y * width)] = 0xff;
					}
				}
			}
	    }
	    
	    data = new Uint8Array(216);
		
	    for (y = 0; y < 8; y++) {
		    for (x = 0; x < width; x++) {
			    let l = ((x + pos) % width) + (y * width);
			    data[(y * 24) + 24 + x] = canvas[l];
		    }
	    }
	    
	    if (!emulateState) {
	    	BluetoothChemion.frame(data);
	    }
	    
	    drawGlasses();
	}
	
	setInterval(() => {
		if (!document.body.classList.contains('text')) {
			return;
		}
	
		pos++;
		if (pos > width) pos = 0;	
	
		renderText();
	}, 150);
}	
	



/* Frequency analyzer */

function startAnalyzer() {
	let raw = new Uint8Array(32);
	
	navigator.mediaDevices.getUserMedia({ audio: true })
		.then(stream => {
		    const audioContext = new AudioContext();
		    const input = audioContext.createMediaStreamSource(stream);
		    const analyser = audioContext.createAnalyser();
		    const scriptProcessor = audioContext.createScriptProcessor();
		    
		    analyser.smoothingTimeConstant = 0.3;
		    analyser.fftSize = 256;
		    
		    input.connect(analyser);
		    analyser.connect(scriptProcessor);
		    scriptProcessor.connect(audioContext.destination);
		    
		    scriptProcessor.onaudioprocess = audioProcessingEvent => {
			    analyser.getByteFrequencyData(raw);
			};
		});
	
	
	setInterval(() => {
		if (!document.body.classList.contains('equalizer')) {
			return;
		}
		
	    data = new Uint8Array(216);
	    
	    for (let x = 0; x < 24; x++) {
		    let value = Math.min(0x0a - Math.ceil(raw[x] / 0xff * 0x0a), 0x09);
			for (let y = value; y < 9; y++) {
		    	data[y * 24 + x] = 0xff;					
		    }		    
	    }
	    
	    if (!emulateState) {
	    	BluetoothChemion.frame(data);
	    }
	    
	    drawGlasses();
	}, 150);

	analizerStarted = true;	
}



/* Draw glasses */

var canvas = document.getElementById('graph');

function drawGlasses() {
	requestAnimationFrame(() => {
		canvas.width = parseInt(getComputedStyle(canvas).width.slice(0, -2)) * devicePixelRatio;
		canvas.height = parseInt(getComputedStyle(canvas).height.slice(0, -2)) * devicePixelRatio;
		
	    var context = canvas.getContext('2d');
	    context.clearRect(0, 0, canvas.width, canvas.height);
	    context.fillStyle = '#fff';

		let scale = canvas.width / 24;
		let offsetX = scale / 2;
		let offsetY = scale / 2;

		for (let i = 0; i < 216; i++) {
			let x = i % 24;
			let y = Math.floor(i / 24);
			
			if (y == 7 && x >= 11 && x <= 12) continue;
			if (y == 8 && x >= 10 && x <= 13) continue;
			if (data[i]) {
				context.beginPath();
				context.arc((x * scale) + offsetX, (y * scale) + offsetY, scale / 8, 0, 2 * Math.PI);
				context.fill();
			}
		}
	});	
}


window.onresize = drawGlasses;

document.addEventListener("visibilitychange", () => {
	if (!document.hidden) {
		drawGlasses();
	}
});

