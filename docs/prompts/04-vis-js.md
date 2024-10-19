# Generating a Vis.js Program

![](../img/concept-graph-v1.png)

[Run the Vis.js Visualizer](./04-vis-js.html)

<!DOCTYPE html>
<html>
<head>
    <title>Signal Processing Concepts Network</title>
    <style type="text/css">
        #network {
            width: 100%;
            height: 800px;
            border: 1px solid lightgray;
        }
    </style>
    <!-- Include vis.js from CDN -->
    <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
</head>
<body>

<h2>Signal Processing Concepts Network</h2>
<div id="network"></div>

<script type="text/javascript">
    // CSV Data
    var csvData = `
ID,Concept Name,Dependencies,Category ID
1,Complex numbers,,1
2,Euler's formula,1,1
3,Phasors,1|2,1
4,Vectors,,1
5,Matrices,4,1
6,Linear algebra,4|5,1
7,Calculus,,1
8,Differential equations,7,1
9,Integration,7,1
10,Differentiation,7,1
11,Probability,,1
12,Random variables,11,1
13,Statistics,11|12,1
14,Mean,13,1
15,Variance,13,1
16,Standard deviation,13,1
17,Signals,1|4|7,2
18,Systems,17,2
19,Continuous-time signals,17,2
20,Discrete-time signals,17,2
21,Analog signals,19,2
22,Digital signals,20,2
23,Sampling,19|20,2
24,Quantization,22|23,2
25,Aliasing,23|24,2
26,Nyquist theorem,23|25,2
27,Convolution,9|10,2
28,Impulse response,18|27,2
29,LTI systems,18|28,2
30,Causality,29,2
31,Stability,29,2
32,Frequency response,29|34,2
33,Fourier series,7|17,3
34,Fourier Transform (FT),33,3
35,Inverse Fourier Transform (IFT),34,3
36,Laplace Transform,8,3
37,Z-Transform,20|34,3
38,Discrete Fourier Transform (DFT),20|34,3
39,Fast Fourier Transform (FFT),38,3
40,Window functions,38|39,3
41,Spectral analysis,34|38,3
42,Time domain,17,2
43,Frequency domain,34|38,2
44,Signal decomposition,33|34,2
45,Filtering,27|29,4
46,Low-pass filter (LPF),45,4
47,High-pass filter (HPF),45,4
48,Band-pass filter (BPF),45,4
49,Band-stop filter (BSF),45,4
50,FIR filters,20|45,4
51,IIR filters,20|45,4
52,Filter design,50|51,4
53,Bilinear transform,36|37,3
54,Butterworth filter,52,4
55,Chebyshev filter,52,4
56,Elliptic filter,52,4
57,Bessel filter,52,4
58,Digital Signal Processing (DSP),22|38|45,9
59,Modulation,17|58,9
60,Amplitude Modulation (AM),59,9
61,Frequency Modulation (FM),59,9
62,Phase Modulation (PM),59,9
63,Pulse-Code Modulation (PCM),22|59,9
64,Adaptive filtering,52|58,7
65,Least Mean Squares (LMS) algorithm,64,7
66,Recursive Least Squares (RLS) algorithm,64,7
67,Noise cancellation,64|65,7
68,Signal detection,41|58,7
69,Autocorrelation,13|17,5
70,Cross-correlation,13|17,5
71,Power Spectral Density (PSD),41|69,5
72,Energy Spectral Density (ESD),41|69,5
73,Random processes,12|17,5
74,Stationarity,73,5
75,Ergodicity,73,5
76,White noise,73,5
77,Colored noise,73,5
78,Signal estimation,68|73,5
79,Kalman filter,78,5
80,Wiener filter,78,5
81,Time-frequency analysis,41|42|43,6
82,Short-Time Fourier Transform (STFT),81,6
83,Spectrogram,82,6
84,Wavelet Transform (WT),81,6
85,Continuous Wavelet Transform (CWT),84,6
86,Discrete Wavelet Transform (DWT),84,6
87,Multiresolution analysis,86,6
88,Signal compression,58|86,7
89,Lossless compression,88,7
90,Lossy compression,88,7
91,Huffman coding,89,7
92,Entropy coding,89,7
93,Quantization noise,24|90,7
94,Sampling rate conversion,23|97,7
95,Interpolation,94,7
96,Decimation,94,7
97,Multirate signal processing,94|95|96,7
98,Polyphase filters,97,7
99,Filter banks,97|98,7
100,Subband coding,99,7
101,Oversampling,23|97,7
102,Undersampling,23|97,7
103,Compressed sensing,23|104,7
104,Sparse representation,88|103,7
105,Machine Learning (ML),13|58,8
106,Supervised learning,105,8
107,Unsupervised learning,105,8
108,Feature extraction,58|105,8
109,Pattern recognition,108|106,8
110,Classification,106|109,8
111,Regression,106|109,8
112,Neural Networks (NN),105,8
113,Deep Learning (DL),112,8
114,Convolutional Neural Networks (CNNs),113,8
115,Recurrent Neural Networks (RNNs),113,8
116,Autoencoders,113,8
117,Generative Adversarial Networks (GANs),113,8
118,Signal reconstruction,88|104,7
119,Signal prediction,73|105,8
120,Digital communications,58|59,9
121,Modulation schemes,59|120,9
122,Digital modulation,22|121,9
123,Quadrature Amplitude Modulation (QAM),122,9
124,Phase Shift Keying (PSK),122,9
125,Frequency Shift Keying (FSK),122,9
126,Orthogonal Frequency Division Multiplexing (OFDM),122|38,9
127,Channel coding,120,9
128,Error detection,127,9
129,Error correction,127,9
130,Communications signal processing,58|120,9
131,Radar signal processing,58|130,9
132,Sonar signal processing,58|130,9
133,Image processing,58|105,9
134,Edge detection,133,9
135,Image filtering,133|45,9
136,Image segmentation,133|108,9
137,Audio signal processing,58|17,9
138,Speech recognition,137|105,9
139,Speech synthesis,137,9
140,Voice over IP (VoIP),137|120,9
141,Multimedia signal processing,58|133|137,9
142,Virtual Reality (VR),141,9
143,Augmented Reality (AR),141,9
144,Cognitive signal processing,105|130,8
145,Quantum signal processing,58|146,10
146,Biosignal processing,58|73,10
147,Brain-Computer Interfaces (BCI),146|105,10
148,Internet of Things (IoT),58|120|149,9
149,Big data analytics,105|58,8
150,Ethical considerations in AI,105|149,10
`;

    // Parse CSV Data
    function parseCSV(data) {
        var lines = data.trim().split('\n');
        var headers = lines[0].split(',');
        var result = [];
        for (var i = 1; i < lines.length; i++) {
            var obj = {};
            var currentLine = lines[i].split(',');
            for (var j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentLine[j];
      
### Instructions

1.  **Save the HTML File:**

    -   Copy the above code into a text editor.
    -   Save the file with a `.html` extension, for example, `concepts_network.html`.
2.  **Open the File in a Web Browser:**

    -   Open the saved HTML file in a modern web browser like Chrome, Firefox, or Edge.
    -   You should see a network graph visualizing the concepts and their dependencies.
3.  **Interact with the Graph:**

    -   **Zoom and Pan:** Use your mouse wheel to zoom in and out. Click and drag to pan around the graph.
    -   **Node Information:** Hover over a node to see its category.
    -   **Node Details:** Click on a node to select it. The label will be highlighted.

### **Explanation of the Code**

-   **Including vis.js Library:**

    -   The script includes vis.js from the Unpkg CDN:

```html
<script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
```

-   **Parsing the CSV Data:**

    -   The `parseCSV` function reads the CSV data and converts it into an array of JavaScript objects for easier manipulation.
-   **Creating Nodes:**

    -   Each concept becomes a node in the network.
    -   Nodes are assigned colors based on their category using the `categoryColors` object.
    -   The `title` property is used to display the category when hovering over a node.
-   **Creating Edges:**

    -   Dependencies are used to create edges between nodes.
    -   If a concept depends on another, an edge is drawn from the dependency to the concept.
    -   The edge is directed, indicating the prerequisite relationship.
-   **Configuring the Network:**

    -   The `options` object configures the appearance and behavior of the network:
        -   **Nodes:** Set to display as dots with labels.
        -   **Edges:** Arrows are enabled to indicate direction.
        -   **Physics:** Configured for a balanced layout.
        -   **Interaction:** Tooltips are enabled with a slight delay.

### **Customizations**

-   **Adjust Node Appearance:**

    -   Modify the `nodes` options to change size, shape, and font.
-   **Adjust Edge Appearance:**

    -   Modify the `edges` options to change arrow size, color, or add labels.
-   **Add Group Labels:**

    -   Update the `title` property in nodes to display more information.
-   **Change Category Colors:**

    -   Adjust the `categoryColors` object to assign different colors to categories.
-   **Define Groups:**

    -   Use the `groups` option in `options` to define styles for each category group.

```javascript
groups: {
        '1': { color: '#f39c12' },
        '2': { color: '#2ecc71' },
        // ... and so on
    },
```

### **Considerations**

-   **Data Size:**

-   With 150 nodes and numerous edges, rendering might be intensive. Adjust the physics settings or simplify the graph if needed.

-   **Security Restrictions:**

-   If you encounter issues due to browser security policies (e.g., loading local files), you might need to serve the HTML file via a local web server.

-   **Using Python's HTTP Server:**

```bash
python -m http.server 8000
```

Then access the file at `http://localhost:8000/concepts_network.html`.

### **Conclusion**

This example demonstrates how to visualize your signal processing concepts and their dependencies using vis.js. The interactive network graph can help in understanding the relationships between different concepts and planning the teaching order.

Feel free to customize the code further to suit your needs. If you have any questions or need assistance with modifications, please let me know!