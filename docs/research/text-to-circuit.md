# Open AI Research on Text to Circuit

!!! prompt
    I am an instructor that teaches circuit design in an electrical engineering department at a local university.  I love the power of the new generative AI models that generate precise images with exact label placement on the diagrams.  However, when I ask these text-to-image generators to generate circuit diagrams they fail to generate quality diagrams.

    Generating these diagrams for classes and quizzes takes a huge amount of my time and much of the work is very manual such as moving labels and wires around on the drawings.

    Is anyone working on a text-to-circuit LLM that I could use?
    My goal would be to enter a description of a circuit with a list of components and their connections and it would generate a high-quality circuit diagram.

    I have also seen LLMs create SVG diagrams of circuits, but the quality is still too low.
    I have also seen very nice circuit animations using JavaScript programs like p5.js to animate the current on the wires.  However, these still have limited ability to do good layout.

    Please do some detailed research on how other people are generating high quality circuit diagrams using generative AI tools.

    Consider all products and processes including commercial and open source.
    Focus only tools that generate English language diagrams.  I do not need any other languages.
    Look for any tools and approaches that help me be more productive.

## Clarification Questions

Thanks for the detailed background—very helpful. To focus the research more effectively, could you clarify the following:

1. What types of circuit diagrams are you most interested in? (e.g., analog, digital, mixed-signal, logic gates, PCB-level schematics, etc.)
2. Are you looking for tools that integrate with specific platforms or formats (e.g., KiCad, LTspice, Logisim, SVG, LaTeX/TikZ, etc.)?
3. Do you prefer browser-based tools, desktop software, or integration with programming environments like Python or JavaScript?

This will help identify the best tools and workflows that match your teaching and productivity needs.

## Clarification Response

1. I am interested in both analog and digital including logic gates but I do not need any PCB-level drawings.  These are just for classroom use.
2. I use Markdown for our textbooks and online documentation.  Anything that works with Markdown including inserting JavaScript is fine.
3. The results must run on a browser, but I am open to any desktop tools if they are cost effective.  I don't want to pay money for any expensive desktop tools.  Integration with both Python or JavaScript is desireable.

## Final Response

Great, I'll look into tools and processes for generating high-quality analog and digital circuit diagrams---including logic gates---using generative AI or related automation techniques. I'll focus on tools that:

-   Work well in Markdown or browser environments

-   Support or integrate with JavaScript and/or Python

-   Prioritize low-cost or open-source desktop options if available

-   Help with intelligent layout, precise label placement, and better teaching productivity

I'll include both commercial and open-source solutions, as well as any emerging research or prototype tools that are relevant.

I'll let you know once I've compiled a detailed overview.

## Generative AI and Automated Tools for Circuit Diagram Creation


### Introduction

Creating clear circuit schematics from textual descriptions is a long-standing challenge. Unlike standard images, circuit diagrams demand precise control of symbols, connections, and labels. Recent advances combine *generative AI* with *automation* to translate either natural language or structured code into high-quality analog and digital circuit diagrams. This report surveys current tools and methods that accept descriptions of circuits (in plain English or in code) and output well-laid-out schematics. We focus on solutions that integrate with Markdown or browser-based workflows (e.g. via SVG or JavaScript), support Python/JavaScript environments, and offer productivity features like auto-layout and reusable components. Emphasis is on open-source or cost-effective tools suitable for instructors building English-language course materials.

## Text-Based Schematic Generation Tools

### Circuit Description DSLs and Code Libraries

One approach is to use domain-specific languages or libraries to **describe circuits as code**, then automatically render the schematic. For example, [Schemdraw](https://schemdraw.readthedocs.io/en/stable/) is a Python library that allows step-by-step drawing of circuit elements via code. It produces publication-quality schematics by letting you add components one at a time "similar to how you might draw them by hand" using Python methods. Schemdraw supports many common circuit symbols (resistors, capacitors, sources, etc.) and outputs images (including SVG or PNG). In a Markdown or Jupyter notebook workflow, an instructor can programmatically generate a circuit diagram with just a few lines of Python and embed the resulting image.

Another code-driven toolset is **SKiDL**, a Python EDA library that represents circuits as Python objects (netlists). While SKiDL was originally for generating PCB netlists, it now supports schematic generation. SKiDL can export a schematic to an **SVG image** using *NetlistSVG* under the hood. In this pipeline, the instructor writes a SKiDL script defining components and connections (a "structured" input). By calling `generate_svg()` at the end, SKiDL invokes NetlistSVG to produce an SVG schematic automatically. The output uses standard KiCad-style symbols for each component, so the diagrams look professional. Notably, SKiDL/NetlistSVG handles placing the symbols and routing connections (using auto-layout algorithms, discussed below), sparing the user from manual drawing. This facilitates reusing circuit definitions: the same SKiDL code can generate a netlist for simulation or an SVG for documentation, which is very useful for instructors.

A more traditional DSL approach is **CircuitTikZ** (a LaTeX package). In CircuitTikZ, one writes textual commands in a LaTeX document to place circuit components and wires, and the LaTeX compiler renders a high-quality schematic. This method isn't AI-driven, but it's a proven open-source solution for **text-to-diagram** conversion. It can be integrated into markdown-based workflows by compiling the LaTeX to PDF/SVG and embedding the image. CircuitTikZ offers fine control over layout and is often used in academic materials. However, writing TikZ code manually has a steep learning curve. Some researchers have used generative AI to bridge this gap -- for instance, by training LLMs to produce CircuitTikZ code automatically. In summary, DSLs like CircuitTikZ or code libraries like Schemdraw/SKiDL provide a foundation for structured circuit description, which can then be automated into diagrams.

### Auto-Layout and Graph-Based Rendering

A key aspect of automated schematic drawing is **automatic layout** -- deciding where to place each symbol and how to route connections for clarity. General graph layout engines (like Graphviz or ELK) have been applied to circuit schematics with mixed success. An illustrative toolchain here is **NetlistSVG**, a Node.js/JavaScript tool that *"draws an SVG schematic from a Yosys JSON netlist"* (the output of a digital logic synthesis). NetlistSVG uses the ELK graph layout library to arrange gates and wires automatically. Originally designed for gate-level digital circuits, it now includes symbol "skins" for both logic gates and analog components. This means you can feed NetlistSVG a structured netlist (e.g. a JSON file describing gates or a list of components and nodes) and get back a neatly routed schematic in SVG format. In a teaching workflow, one could use an HDL (like Verilog or VHDL) to describe a logic circuit, synthesize it to a netlist (using an open tool like Yosys), then use NetlistSVG to **automatically generate a gate-level diagram**. The result can be embedded directly into course notes as an SVG image. NetlistSVG's algorithm tends to produce a layered, readable diagram (e.g. logic inputs on left, outputs on right, signals routed orthogonally), which addresses the major challenge that a human would otherwise face arranging a complex schematic.

Another open-source solution, closely related to NetlistSVG, is **d3-hwschematic**. This is a JavaScript library by Nic30 that also leverages ELK for layout and is designed for interactive schematics in documentation. It accepts an ELK-formatted JSON graph as input and renders an interactive diagram (using D3.js). The focus of d3-hwschematic is on digital hardware documentation (it's part of a tool ecosystem for HDL design). For instance, Nic30 provides a Sphinx plugin (`sphinx-hwt`) that can insert these auto-generated schematics into HTML docs automatically. This kind of integration is valuable for instructors writing course content in Sphinx or Markdown -- the circuit diagram can be generated on the fly from a JSON or Python description and embedded, rather than stored as a static image. The **productivity boost** comes from not having to manually draw or adjust the schematic; the layout engine handles it consistently.

It's worth noting that auto-layout for **analog** circuits (as opposed to logic gate networks) is inherently harder, since there isn't always a clear left-to-right signal flow. Tools like NetlistSVG do have an analog mode, and SKiDL's use of KiCad symbols plus ELK can handle moderate analog schematics (e.g. op-amp circuits, filters) with decent results. They place components in a logical graph structure (for example, power rails at top/bottom, signal path left-to-right). While the result might not rival a human-designed layout for very complex analog schematics, it is often **acceptable for classroom examples**, and far quicker than manual drawing. Minor adjustments (like labeling inputs/outputs or reordering parallel branches) can be done by tweaking the input netlist or using provided hints (such as SKiDL's `netio` attributes to mark input/output nodes for the layout).

## Natural Language and LLM-Based Approaches

### LLMs for Circuit Diagram Generation

The rise of large language models has opened up new possibilities for generating diagrams from natural language. In the realm of circuits, one cutting-edge example is **Schemato**, a specialized LLM developed to convert circuit netlists into human-readable schematics. Schemato treats netlist-to-schematic as a "language translation" problem, outputting either an LTspice schematic file or LaTeX CircuitTikZ code. Impressively, it achieves a 93% success rate on netlist-to-TikZ conversion (versus only 26% using a general GPT-4 approach). This indicates that with fine-tuning, LLMs can learn the structured task of formatting a correct circuit diagram. Schemato's output is intended to be compiled into actual schematics, bridging the gap between an ML-generated netlist (often the result of AI circuit synthesis) and a readable diagram for engineers. While Schemato itself may be a research project, it exemplifies how generative AI can aid automation: an instructor could potentially use a future LLM-based tool to *write a plain description or provide a SPICE netlist and get back a schematic drawing* without manual coding. Such an AI assistant would greatly accelerate creating examples and homework solutions in educational settings.

Another forward-looking system is **DiagrammerGPT (2024)**, which, though not circuit-specific, is designed for *text-to-diagram* generation using a hybrid of LLM planning and image generation. DiagrammerGPT uses GPT-4 to first produce a detailed "diagram plan" (listing all objects, connections, and their layout coordinates) and then renders the image with a graphics engine. While its authors focused on diagrams like flowcharts or biological processes, the approach is general-purpose. In principle, a similar two-stage method could be applied to circuit diagrams: the LLM would output a list of components (with positions and connection lines), and a renderer would draw the schematic symbols accordingly. DiagrammerGPT even demonstrates generating vector-graphic outputs for editing in tools like Inkscape. For circuits, an "open-platform" vector output is ideal (since instructors might want to tweak the final diagram). We might envision an experimental system where an instructor types: *"Draw a logic diagram of a 2-to-4 decoder using AND and NOT gates"*, and an LLM-guided tool produces an SVG schematic of the decoder, correctly laid out. While this level of natural language schematic synthesis is still emerging, DiagrammerGPT's success with other diagram types suggests it's on the horizon.

### ChatGPT and Code Generation Hacks

Even without specialized models, inventive users have leveraged general LLMs (like ChatGPT) for circuit diagrams. One practical tip from the electronics community is to **have the LLM produce a structured description (code or netlist) rather than an ASCII art drawing**. For example, if you ask ChatGPT to "draw a monostable 555 timer circuit," it might attempt a crude text art schematic which is hard to read. However, if you instead prompt it to *"generate a SPICE netlist for a 555 monostable"* or *"write TikZ code for the circuit,"* the LLM is more likely to output a machine-readable description. A Reddit user reported success with this approach -- *"Ask it to generate a netlist instead."* -- and then feeding that netlist into a schematic tool. This two-step workflow (LLM → intermediate code → diagram via another tool) plays to the strengths of each: the LLM uses its knowledge to create the connection list, and a deterministic renderer ensures the layout is correct. For instance, ChatGPT could generate a list of components and nodes, which you then pass to SKiDL or NetlistSVG to visualize. Similarly, one could ask for Python code targeting the Schemdraw API (ChatGPT can often produce plausible code for known libraries), and then run that code to get an image. This "AI-assisted coding" method is essentially using the LLM as a helper to write the input for the *actual* diagram generator. It's a cost-effective way to introduce natural language convenience: the instructor describes the circuit in English to ChatGPT, and with a bit of iteration obtains scriptable output that yields the diagram.

It should be noted that pure end-to-end text-to-diagram with a general AI (without human in the loop) is still imperfect in 2025. One must verify the AI's output (it might draw an incorrect connection or choose a non-ideal layout without guidance). However, the landscape is rapidly improving. As we've seen, specialized models like Schemato and DiagrammerGPT are pushing the boundary, and they might soon be integrated into user-friendly tools. For now, instructors can experiment with LLMs to generate diagram source code, or use open platforms like **Eraser's DiagramGPT** (a web tool for generating diagrams from English) to see if they support basic circuit symbols. The convergence of LLMs with established libraries (e.g., an AI that internally uses CircuitTikZ or SchemDraw) is a promising area for **research-grade tools that may become classroom-ready** in the near future.

### Browser-Based and Interactive Diagram Tools

Some instructors may want interactive circuit visuals or the ability to embed diagrams directly in a web page (for online textbooks or slides). A number of JavaScript libraries can fulfill this need:

#### DigitalJS
This is a teaching-focused **digital logic simulator** that runs entirely in the browser. Developed by Marek Materzok, DigitalJS takes a circuit (defined in a JSON format or even via a converted Verilog file) and produces a live circuit diagram with simulation capabilities. It was created to help students learn digital design, and it can display logic gate diagrams complete with toggle-able inputs and outputs. The layout in DigitalJS is automated to some degree and optimized for simulation (it will arrange gates and draw wires, then allow the user to simulate signal changes). To use it in materials, one can either embed the DigitalJS applet for an interactive experience or export a static image of the circuit. Because DigitalJS is open-source, it's freely available for integration. It shines for digital circuits where being able to **simulate within the diagram** is a bonus (e.g., demonstrating a flip-flop's behavior). For pure schematic generation, its visuals are serviceable though perhaps less polished than NetlistSVG's (since simulation imposes some layout constraints).

#### Logisim and Forks 

(e.g. Digital by hneemann) *Logisim* is a classic open-source logic circuit drawing tool. Modern forks like **hneemann's Digital** have added features like VHDL/Verilog import. These are GUI programs rather than code-driven engines, but some can be scripted or used headlessly to render circuits. For example, *Digital* can load a circuit file and export an image via command-line. This could be used in an automated workflow, but it's somewhat heavyweight and not as web-friendly as the JS libraries.

#### Circuit Diagram Web Editor 
(circuit-diagram.org)
This is a browser-based schematic editor for analog circuits. It's not text-driven or AI-driven -- it requires manual assembly of the circuit on-screen -- but because it's web-based and free, an instructor could use it to quickly draw a circuit and then export an SVG. It doesn't integrate with Markdown automatically, but the exported SVG can be pasted into markdown. The tool does have an open JSON format for saved circuits, though no auto-layout from that format (the user still positions the parts). Thus, while useful for quick manual drawing, it doesn't meet the "generate from code or language" criterion directly.

#### p5.js or D3 custom scripts

For maximum flexibility, one can always write a custom JavaScript (or p5.js) script to draw a circuit diagram on an HTML5 canvas or SVG. This is essentially creating your own mini library -- for instance, defining functions to draw a gate or resistor at coordinates, and writing an algorithm to position them. As an example, one Stack Overflow user described a JSON structure for series/parallel circuits and sought to draw it with p5.js automatically. Achieving high-quality layout with a custom script is difficult, so most people prefer to leverage existing layout engines. Nonetheless, if a very specific visualization or animation is needed (say, animating current flow in a circuit for a demo), a p5.js sketch with hard-coded placement can be integrated into Markdown via embedded iframes or `<script>` tags. The **trade-off** is development time versus using an existing tool. For most educational content, the dedicated libraries (Schemdraw, NetlistSVG, etc.) are preferable because they already implement standard schematic conventions (so you don't have to reinvent symbol drawing or layout algorithms).

## Integration into Markdown Workflows

A major consideration is how these tools fit into an instructor's content creation workflow, especially if using Markdown or Jupyter notebooks. Here we compare capabilities and integration options:

| **Tool / Method** | **Input Format** | **Output** | **Integration** | **Use Cases & Limits** |
| --- |  --- |  --- |  --- |  --- |
| **Schemdraw (Python)** | Python API calls (one per part) | SVG, PNG, etc. image | Use in Jupyter or script; embed image | Great for small analog circuits; manual sequence of element placement (no global auto-place). Open-source. No natural language input. |
| --- |  --- |  --- |  --- |  --- |
| **SKiDL + NetlistSVG** | Python circuit code (SKiDL) → JSON netlist | SVG image | Automate in Python, output SVG to file or inline | Good for analog or digital. Auto-layout via ELK yields neat schematics. Requires Node (for NetlistSVG) setup. Open-source. |
| **CircuitTikZ (LaTeX)** | LaTeX code (TikZ DSL) | PDF or SVG (compiled) | Compile as part of LaTeX docs or via command-line, then embed | Professional-quality output for any circuit. Fully manual coding (unless assisted by AI). Open-source. Steeper learning curve. |
| **NetlistSVG (CLI/JS)** | Yosys JSON netlist (digital), or custom JSON (analog) | SVG image (static) | Node.js CLI (generate file); or embed via `<script>` in browser for dynamic use | Excellent for logic gate diagrams from HDL. Analog support basic but available. No interactive features (static render). |
| **d3-hwschematic (JS)** | JSON (ELK graph format) | SVG/HTML (interactive) | Include library in web page; or use Sphinx plugin for docs | Useful for documentation with interactive highlighting. Requires more setup (web dev skills). Open-source. Primarily digital (HDL) focused. |
| **DigitalJS (JS)** | JSON circuit or Verilog (via converter) | Canvas/SVG (interactive) | Embed the DigitalJS viewer in HTML (requires hosting its scripts) | Great for live simulation of logic circuits in-browser. Layout is auto but oriented to simulation. Open-source. Not aimed at printed/static schematic aesthetics. |
| **LLM-based (experimental)** | English description or netlist | Varies (ASCII art, code, or image via tool) | Currently via external services or research code | Emerging tech -- e.g., Schemato generates TikZ code from netlist. ChatGPT can produce partial diagrams or code. Not yet plug-and-play; results may require verification. |

## Integration tips##

In a Markdown environment (such as Jupyter Notebook, MkDocs, or GitHub Pages), the simplest integration is to generate an SVG or PNG file of the schematic and then reference it in the Markdown. Tools like Schemdraw or SKiDL (with NetlistSVG) can be scripted to save their output image as part of a build process. The SVG format is ideal because it scales and can be inlined. For example, an instructor using Jupyter could write a SKiDL circuit in a cell, call `generate_svg()`, and display the SVG output directly in the notebook. Similarly, in a static Markdown site, one could use a preprocessor or plugin to run a Schemdraw script and inject the resulting image. Some static site generators allow custom diagram plugins (for instance, there are Markdown extensions for Graphviz or Mermaid diagrams; a similar extension could be made for circuit diagrams using these tools).

For the JavaScript approaches, integration might involve embedding a `<script>` that draws the diagram when the page loads. This is feasible but requires that the Markdown pipeline supports raw HTML/JS (which many do). The advantage is true interactivity (e.g., a DigitalJS embed where students can flip a switch in the circuit within the web page). The disadvantage is complexity and potential loading time or browser compatibility issues. In many cases, a static image is sufficient for course notes, while an interactive widget might be used sparingly for demonstrations.

## Productivity features for instructors

Many users are well-served by the above tools: auto-layout greatly reduces fiddling with positions, auto-labeling of nets or pins keeps the diagram clear (most tools label node names or allow you to specify labels, and will place them near wires automatically). Reuse is enabled by code-based definitions -- you can define a subcircuit once in SKiDL or Schemdraw (or as a TikZ style) and use it in multiple diagrams. Open-source availability means these solutions are either free or have negligible cost, especially compared to proprietary EDA software. They also avoid the licensing and installation hurdles of heavy desktop tools; many run in the browser or via simple Python packages.

## Conclusion

In summary, the ecosystem for generating circuit diagrams from descriptions is rapidly evolving. Mature **code-centric tools** (like Schemdraw, SKiDL, CircuitTikZ) let you script high-quality schematics with fine control and integrate those into markdown-based workflows. Meanwhile, **automation and AI-driven methods** (like NetlistSVG's auto-layout or LLM-powered schematic generation) are reducing the manual effort needed to produce clear circuit visuals. For digital logic and classroom logic gate diagrams, tools leveraging graph layout (NetlistSVG, d3-hwschematic) excel at producing neat SVG renderings that can be embedded seamlessly. For analog schematics, structured drawing libraries and some AI assistance can save time, though complex analog layouts may still need occasional manual adjustment. Crucially, many solutions are open-source and can be tied into Python or JavaScript, fitting modern teaching workflows that favor Jupyter notebooks and browser-based content.

As experimental projects like Schemato and DiagrammerGPT show, we're on the cusp of even more intuitive options -- where one might simply *describe* a circuit and let an AI figure out both the connections and an elegant drawing. Until then, instructors can mix and match the tools surveyed here to achieve a high level of productivity: for instance, using ChatGPT to draft a netlist, refining it, and then rendering it with an auto-layout tool. By leveraging these generative and automated approaches, educators can generate **clear, accurate circuit diagrams** with significantly less effort, ensuring that the visuals in their course materials keep pace with the content itself.

**Sources:** The information above was gathered from tool documentation, research papers, and user reports, including Schemdraw's official docs, the SKiDL project page, NetlistSVG's repository, and recent academic work on diagram generation, among others. Each cited source is referenced in the text to provide further details on the capabilities and context.