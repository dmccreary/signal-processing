# Instructor Productivity

This query was done on May 14th using the OpenAI Deep Research option.

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

What types of circuit diagrams are you most interested in? (e.g., analog, digital, mixed-signal, logic gates, PCB-level schematics, etc.)

Are you looking for tools that integrate with specific platforms or formats (e.g., KiCad, LTspice, Logisim, SVG, LaTeX/TikZ, etc.)?

Do you prefer browser-based tools, desktop software, or integration with programming environments like Python or JavaScript?

This will help identify the best tools and workflows that match your teaching and productivity needs.

**Dan said:**

1. I am interested in both analog and digital including logic gates but I do not need any PCB-level drawings.  These are just for classroom use.
2. I use Markdown for our textbooks and online documentation.  Anything that works with Markdown including inserting JavaScript is fine.
3. The results must run on a browser, but I am open to any desktop tools if they are cost effective.  I don't want to pay money for any expensive desktop tools.  Integration with both Python or JavaScript is desireable.

**ChatGPT said:**

Great, I’ll look into tools and processes for generating high-quality analog and digital circuit diagrams—including logic gates—using generative AI or related automation techniques. I’ll focus on tools that:

1. Work well in Markdown or browser environments
2. Support or integrate with JavaScript and/or Python
3. Prioritize low-cost or open-source desktop options if available
4. Help with intelligent layout, precise label placement, and better teaching productivity

I’ll include both commercial and open-source solutions, as well as any emerging research or prototype tools that are relevant.

I’ll let you know once I’ve compiled a detailed overview.

OpenAI Deep Research Thought for 

## Thinking
I’m considering generative AI and automation tools for analog and digital circuit diagrams. Features like natural language input, integration with Markdown, and support for Python or JavaScript are key focus areas.

I'm looking into options that combine JavaScript libraries with Markdown for seamless circuit diagram generation, enabling dynamic, browser-friendly integration in teaching materials.

I’m noting the progress in generating circuit diagrams from text using LLMs like GPT. This includes specialized pipelines and experimental tools for precise documentation and layout.

Checking out Mermaid and Graphviz for circuit diagrams. They might work well in Markdown or browser setups, which seems promising for dynamic integration.

I’m examining various AI diagram generators, including DiagramGPT and Visily's, to see if they specialize in electronic circuit design.

Hmm, I’m thinking the Reddit link might have direct copy or content issues. Considering if text mode is a viable solution here.

Evaluating strategies
I'm considering opening by ID, noting potential Reddit restrictions, and evaluating search by the title or snippet for up-to-date tools.

Searched for LLM generate circuit diagram research
ChatGPT
I’m broken down the choices into sections and distinguished reliable sources. Prioritizing ones directly commenting on circuits or precise netlist-to-schematic solutions, necessary for analog and digital circuit diagrams.

Favicon
Read arxiv.org https://arxiv.org/

ChatGPT
Schemato converts netlists to schematics, focusing on analog circuits, and is fine-tuned for high success rates in generating structured outputs like .asc files and LaTeX code for CircuitTikz.

Favicon
Read more from arxiv.org

ChatGPT
I’m gathering info on lines 38-42 of [2], finding new insights—worth a bit more scrolling for improved clarity.

Favicon
Read more from arxiv.org

The approach uses TikZ and CircuitTikZ, translating diagrams into code. This is a manual yet automated generation process.