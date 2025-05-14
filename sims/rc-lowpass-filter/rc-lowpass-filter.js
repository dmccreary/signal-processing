function createBodePlot(R, C) {
    let logFreqStart = 1; // Logarithmic frequency scale start
    let logFreqEnd = 5; // Logarithmic frequency scale end
    let totalPoints = 200; // Total points in the plot
    let freqData = [];
    let gainData = [];
    let phaseData = [];

    for (let i = 0; i < totalPoints; i++) {
        let logFreq = logFreqStart + (logFreqEnd - logFreqStart) * (i / totalPoints);
        let f = Math.pow(10, logFreq); // Frequency
        let gain = 20 * Math.log10(1 / Math.sqrt(1 + Math.pow(2 * Math.PI * f * R * C, 2))); // Gain in dB
        let phase = -Math.atan(2 * Math.PI * f * R * C) * (180 / Math.PI); // Phase in degrees
        freqData.push(f);
        gainData.push(gain);
        phaseData.push(phase);
    }

    let gainTrace = {
        x: freqData,
        y: gainData,
        mode: 'lines',
        name: 'Gain',
        line: { color: 'red' }
    };

    let phaseTrace = {
        x: freqData,
        y: phaseData,
        mode: 'lines',
        name: 'Phase',
        yaxis: 'y2',
        line: { color: 'blue' }
    };

    let layout = {
        title: 'Bode Plot of RC Low Pass Filter',
        xaxis: {
            title: 'Frequency (Hz)',
            type: 'log',
            autorange: true
        },
        yaxis: {
            title: 'Gain (dB)'
        },
        yaxis2: {
            title: 'Phase (degrees)',
            overlaying: 'y',
            side: 'right'
        }
    };

    Plotly.newPlot('myDiv', [gainTrace, phaseTrace], layout);
}

// Example function call
createBodePlot(1000, 0.000001); // R = 1000 Ohms, C = 1 μF
