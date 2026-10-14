---
title: Instructor's Guide
description: How to teach with the Signal Processing with AI textbook - chapters, MicroSims, quizzes, pacing, licensing, customization, and analytics.
---

# Instructor's Guide

Welcome to the instructor's guide for *Signal Processing with AI: A College-Level
Intelligent Textbook*. This guide explains what is in the textbook, how to use each
part of it in a course, and how to make your own customized copy. No prior technical
knowledge is assumed. Every technical term is defined before it is used.

## Before You Teach

!!! warning "Read this first: what this textbook is and is not"
    The author describes this site as a **proof-of-concept**. The [About page](../about.md)
    states plainly that it is not a complete course on signal processing. It is a course
    that shows how generative AI can be used to create and maintain signal processing
    content.

    Much of the content was generated with generative AI. The site's own
    [Report Card](../report-card.md) gives "Mathematical and Technical Rigor" the lowest
    of its five summary grades (C+), and names Z-transforms and statistical signal
    processing as the areas most likely to contain subtle errors. Before you assign material from
    **Chapter 8 (Advanced Transforms)** or **Chapter 12 (Stochastic Processes)**, check
    the derivations against a standard textbook. Review quiz questions before using them
    for graded work: the Report Card also notes that AI-written quizzes can have weak
    distractors (the wrong answer choices).

Things this textbook does **not** include, so you can plan for them:

- **Problem sets and answer keys.** The chapters have no exercise sections. The
  [FAQ](../faq.md) describes weekly problem sets, a midterm project, and a capstone, but
  those assignments are for the instructor to write.
- **Per-chapter reading lists.** There is one site-level [References](../references.md)
  page, which lists the tools used to build the site, not signal processing readings.
- **Automatic grading or student tracking.** Quizzes are self-check only (see
  [Using the Quizzes](#using-the-quizzes)).

## About This Intelligent Textbook

### What is an Intelligent Textbook?

An **intelligent textbook** is a digital textbook that goes beyond static text and
images. It includes interactive simulations, self-checking quizzes, a searchable
glossary, and a structured map of how concepts depend on each other. The goal is a
richer learning experience than a printed book or a PDF can give.

### The Five Levels of Intelligent Textbooks

Intelligent textbooks are grouped into five levels based on how interactive and adaptive
they are:

<iframe src="../sims/book-levels/main.html" width="600px" height="500px" scrolling="no"
  style="overflow: hidden;"></iframe>

| Level | Name | Description | Example Features |
|-------|------|-------------|------------------|
| **Level 1** | Static Digital | A PDF or basic web version of a print textbook | Text and images only |
| **Level 2** | Interactive | Adds interactive elements | MicroSims, quizzes, searchable glossary |
| **Level 3** | Adaptive | Adjusts content based on student performance | Personalized learning paths |
| **Level 4** | AI-Assisted | Includes an AI tutor | Chatbot integration, automated feedback |
| **Level 5** | Fully Adaptive AI | Continuously learns from student interactions | Real-time content generation |

**This textbook is a Level 2 Interactive Intelligent Textbook.** It has simulations,
quizzes, a glossary, a FAQ, and a learning graph. It does not adapt to individual
students and does not include an AI tutor.

### What Makes This Textbook Different

- **Interactive MicroSims** let students change a parameter in their browser and watch
  the signal respond. No software installation is required.
- **A learning graph** of 200 concepts and 262 prerequisite links shows how every idea in
  the book connects to the others.
- **AI-assisted creation is part of the lesson.** The course description includes
  learning objectives about using generative AI to explore, build, and test signal
  processing ideas (objectives 7, 9, 16, and 18).
- **Free and open source.** The whole site is licensed under Creative Commons
  (see [Understanding the License](#understanding-the-license)) and is designed to be
  forked and customized.

## The Course at a Glance

| Item | Details |
|------|---------|
| Audience | College students with varied mathematics backgrounds |
| Credits | 3 (the [FAQ](../faq.md) describes a 15-week semester) |
| Prerequisites | Introductory electrical engineering or physics, basic calculus and linear algebra, programming basics in Python or MATLAB |
| Chapters | 15, each with its own quiz |
| Concepts | 200 (from the learning graph) |
| Interactive MicroSims | 31 (22 on signal processing topics, 9 about course design) |
| Quiz questions | 150 (10 per chapter) |
| Glossary terms | 141 |
| FAQ questions | 87 |
| Chapter text | About 66,000 words, 4,000 to 5,000 words per chapter |

The [Course Description](../course-description.md) lists the 50 topics covered, the
topics deliberately left out, and 18 learning objectives organized by Bloom's Taxonomy.

## Using the Chapters

### Chapter Map

The chapters build on each other, so students should work through them in order.

| Chapters | Topic Area | Concepts |
|----------|------------|----------|
| 1 | Mathematical foundations (complex numbers, linear algebra, calculus, probability, trigonometry) | 25 |
| 2-3 | Signals and systems (classification and operations of signals; linearity, time-invariance, causality, stability) | 45 |
| 4 | Convolution and correlation | 10 |
| 5 | Sampling and quantization (Nyquist criterion, aliasing) | 15 |
| 6-7 | Fourier analysis (series, transforms, DFT, FFT, windowing, spectral analysis) | 20 |
| 8 | Advanced transforms (Laplace, Z-transform, pole-zero analysis, wavelets, short-time Fourier transform) | 15 |
| 9-10 | Filter design (FIR and IIR filters, classical approximations, implementation) | 25 |
| 11 | Adaptive signal processing (LMS and RLS, noise cancellation, equalization) | 10 |
| 12 | Stochastic processes and random signals (noise, power spectral density) | 10 |
| 13 | Multirate signal processing and compression | 10 |
| 14 | Time-frequency analysis and advanced topics (spectrograms, non-stationary signals) | 5 |
| 15 | Applications and AI integration (DSP hardware, audio, image, video, AI-driven analysis) | 10 |

The [Chapters overview](../chapters/index.md) groups these into foundations (1-5), core
topics (6-10), advanced topics (11-14), and applications (15).

### What Each Chapter Contains

Chapters have a consistent skeleton:

1. **Summary.** A short overview of what the chapter covers.
2. **Concepts Covered.** A numbered list of the chapter's concepts. The numbers match the
   concept numbers in the learning graph.
3. **Prerequisites.** Links to the earlier chapters the material builds on. Chapter 1
   assumes only the prerequisites in the course description.
4. **Introduction.** Motivation and context.
5. **Topic sections.** One section per topic, with a subsection for each concept.
   Equations are written in LaTeX and rendered by a math library called MathJax.
6. **Interactive Demonstrations** (six chapters). Collapsible MicroSim specifications.
   See [MicroSim specifications in chapters](#microsim-specifications-in-chapters).
7. **Comparison Tables** (six chapters). Side-by-side summaries of related methods.
8. **Summary.** A closing recap. Chapter 15 ends with "Summary and Looking Forward".

Each chapter has a separate **Quiz** page, listed directly under it in the left
navigation.

### Suggested 15-Week Pacing

The chapters vary in length (5 to 25 concepts each) but not in word count. One chapter
per week fits a 15-week semester. This is a starting point, not a requirement.

| Week | Chapter | Note |
|------|---------|------|
| 1 | 1 - Mathematical Foundations | May be review for students who have completed the prerequisites |
| 2 | 2 - Signals and Systems | 25 concepts: introduce vocabulary quickly |
| 3 | 3 - System Properties | |
| 4 | 4 - Convolution and Correlation | Use the Convolution MicroSim |
| 5 | 5 - Sampling and Quantization | Use the Nyquist-Shannon Sampling MicroSim |
| 6 | 6 - Fourier Analysis | Pair with the FFT MicroSims |
| 7 | 7 - DFT, FFT and Frequency Domain Analysis | Natural place for a midterm |
| 8 | 8 - Advanced Transforms | Verify derivations first (see warning above) |
| 9 | 9 - Filter Design Fundamentals | |
| 10 | 10 - Advanced Filter Design | |
| 11 | 11 - Adaptive Signal Processing | |
| 12 | 12 - Stochastic Processes | Verify derivations first |
| 13 | 13 - Multirate and Compression | |
| 14 | 14 - Time-Frequency Analysis | Only 5 concepts: room to start the capstone |
| 15 | 15 - Applications and AI Integration | Capstone presentations |

### Suggested Classroom Use

- **Before class:** Assign the chapter's Summary, Concepts Covered, and Introduction as
  reading, and have students look up unfamiliar terms in the glossary.
- **During class:** Project a MicroSim. Ask students to predict what will happen when
  you move a slider, then test the prediction.
- **After class:** Assign the chapter quiz as a self-check, then your own problem set.
- **Pacing:** The [FAQ](../faq.md) estimates about 9 hours per week for students:
  3 lecture, 2 lab, and 4 independent study.

## Using the MicroSims

### What is a MicroSim?

A **MicroSim** (short for "micro-simulation") is a small interactive simulation that
runs in a web browser. Students change a value with a slider or button and immediately
see the effect. MicroSims work on any device with a modern browser (Chrome, Firefox,
Safari, or Edge) and require no installation.

### Where to Find Them

All working MicroSims are listed under **MicroSims** in the left navigation and on the
[MicroSims overview page](../sims/index.md). They are built mostly with **p5.js**, a
JavaScript library for drawing and animation, plus **vis-network** for graph diagrams.

**Signal processing MicroSims (22):**

| Topic | MicroSims |
|-------|-----------|
| Math foundations | Complex Plane, Euler's Formula Explorer, Mobius Transformation |
| Waves and tones | Sine Wave, Tone Generator |
| Sampling | Nyquist-Shannon Sampling |
| Convolution | Convolution |
| Frequency analysis | Basic FFT, FFT 2 Oscillators, FFT 3 Oscillators, FFT Waveform Types, FFT Size, FFT Butterfly, Frequency Detection |
| Live audio | FFT From Microphone, FFT Live Audio with Parameters, FFT Sound File |
| Filters and effects | RC Lowpass Filter, Base and Treble, Reverb Effect |
| Communications | Analog Modulation |
| History | Synth Timeline |

**Course-design MicroSims (9):** AI Pace, Bloom's Taxonomy, Book Generation Workflow,
Book Levels, Citation Graph, Learning Graph Viewer, Learning Graph V1, Timeline Viewer,
and Word Cloud. These explain how the book was designed and are useful for a unit on AI
in education.

!!! note "Preview each MicroSim before class"
    Several MicroSim folders still contain a `TODO.md` file, which means work is in
    progress. Open each simulation you plan to use ahead of time. The FFT From Microphone
    MicroSim asks your browser for permission to use the microphone, and the audio
    MicroSims may need a click before they will play sound.

### MicroSim Specifications in Chapters

Only Chapter 1 embeds running simulations (Complex Plane and Euler's Formula Explorer).
In the other chapters, the **Interactive Demonstrations** sections contain collapsible
blocks labelled "MicroSim: ..." (21 in total). Each block is a **specification**: a
Purpose, a list of Features, Learning Objectives, and Implementation Requirements. They
describe a simulation that could be built, and not all of them have been built.

The specifications have two uses:

- **Lesson planning.** They state what each simulation should teach.
- **Student projects.** Learning objectives 16 and 17 in the course description ask
  students to design algorithms and develop simulations, and objective 18 asks for
  projects that show how generative AI can help. A specification is a ready-made starting
  prompt for that kind of assignment.

### Tips for Using MicroSims in Class

1. **Project them on a screen.** Have students call out predictions before you move a
   slider.
2. **Give independent time.** After a demonstration, let students experiment for 5-10
   minutes on their own devices.
3. **Connect to the text.** After exploring a simulation, have students re-read the
   matching chapter section.
4. **Try fullscreen.** Some MicroSim pages have a "Run ... Fullscreen" button that opens
   the simulation at full size, which is easier to read on a projector.
5. **Check your connection.** MicroSims load from the website, so they need an internet
   connection unless you build the site locally (see
   [Customizing Your Own Textbook](#customizing-your-own-textbook)).

### Embedding a MicroSim in Your Own Web Page

!!! tip "Embed MicroSims anywhere"
    You can add any MicroSim to **any web page**, such as a Google Site, a WordPress blog,
    a Canvas or Schoology page, or a plain HTML file. Paste one line of HTML:

    ```html
    <iframe src="https://dmccreary.github.io/signal-processing/sims/YOUR-MICROSIM-NAME/main.html"
        width="100%" height="450px"
        scrolling="no">
    </iframe>
    ```

    Replace `YOUR-MICROSIM-NAME` with the folder name shown in your browser's address bar
    when you open the MicroSim page. An **iframe** is a web technology that displays one
    web page inside another.

    A few MicroSims use a differently named HTML file, such as
    `rc-lowpass-filter.html`, instead of `main.html`. If the embed is blank, look in that
    MicroSim's folder under `docs/sims/` in the GitHub repository to find the HTML file
    name and use it in place of `main.html`.

## Using the Quizzes

### What are the Quizzes?

Each chapter has a **quiz page** of 10 multiple-choice questions, 150 in total. Each
question has four options. Students click **Show Answer** to reveal the correct answer,
an explanation, the **Concept Tested**, and a link back to the chapter section that
covers it.

### How Quizzes Work

- Open a quiz from the **Quiz** link under each chapter in the left navigation.
- Quizzes are **self-check tools**. Nothing is scored, saved, or reported to you.
- Questions are not labelled by cognitive level. The [FAQ](../faq.md) describes the
  quizzes as aligned with Bloom's Taxonomy, so read the questions to see which levels
  they actually reach.

### Tips for Using Quizzes in Class

- **Exit ticket.** Have students take the quiz at the end of a session.
- **Diagnostic.** Assign the quiz before the chapter to see what students already know.
- **Peer discussion.** Have pairs argue for an answer before revealing it.
- **Question bank.** Copy questions into your own LMS to build graded tests. The license
  allows this (see below). Review each question first, as noted at the top of this guide.

### Bloom's Taxonomy

**Bloom's Taxonomy** is a framework that classifies thinking skills from simple to
complex. The course description's 18 learning objectives are organized with three at
each level.

| Level | Name | What it means | Example verbs |
|-------|------|---------------|---------------|
| L1 | Remember | Recall facts and definitions | Define, list, name |
| L2 | Understand | Explain concepts in your own words | Explain, describe, summarize |
| L3 | Apply | Use concepts to solve problems | Use, implement, calculate |
| L4 | Analyze | Break down and examine relationships | Differentiate, examine, interpret |
| L5 | Evaluate | Make judgments against criteria | Assess, compare, critique |
| L6 | Create | Produce original work | Design, develop, construct |

The [Bloom's Taxonomy MicroSim](../sims/blooms-taxonomy/index.md) shows this
visually. Because the chapters contain no exercises, you will need to write L5 and L6
assignments yourself.

## Using the Glossary

The [glossary](../glossary.md) is an alphabetical list of 141 terms. Each entry has a
definition, and most include an example of how students meet the term in the course.

- **Find a term:** Use your browser's find command (Ctrl+F or Cmd+F) on the glossary
  page, or use the site search bar at the top of any page.
- **Vocabulary preview:** Before a chapter, have students look up its key terms.
- **Student-written definitions:** Students write their own definition after reading,
  then compare it with the glossary.
- **Matching warm-up:** Give students definitions and have them match the terms.

## Using the FAQ

The [FAQ](../faq.md) has 87 questions in six groups:

| Group | Example questions |
|-------|-------------------|
| Getting Started | What is this course about? What prerequisites do I need? |
| Core Concepts | What is a signal? What is the FFT? |
| Technical Detail | DFT versus FFT, window functions, the Laplace transform, poles and zeros |
| Common Challenges | Why does my FFT output look wrong? Why is my filter unstable? |
| Best Practices | How do I design a low-pass filter? How should I preprocess signals? |
| Advanced Topics | Machine learning, convolutional neural networks, time-frequency analysis |

Use FAQ questions as discussion starters, as homework support outside class hours, or
as a study guide before an exam.

## The Learning Graph

### What is a Learning Graph?

A **learning graph** is a map of how concepts depend on each other. It is a **directed
acyclic graph (DAG)**: a set of concepts (nodes) joined by arrows (edges) that point
from a prerequisite to the concept that needs it, with no loops. This book's graph has
200 concepts, 262 dependencies, and 12 categories:

Mathematical Foundations, Signal Fundamentals, System Properties, Convolution and
Correlation, Sampling and Quantization, Fourier Analysis, Advanced Transforms, Filter
Design, Adaptive Processing, Stochastic Processes, Advanced Topics, and Applications
and AI.

### How Instructors Can Use It

- **Prerequisite checking.** Before teaching a concept, confirm students know the
  concepts that point to it.
- **Remediation.** When a student struggles, trace the arrows backward to find the gap.
- **Curriculum mapping.** Compare the graph to your syllabus to find coverage gaps.
- **Enrichment.** Strong students can follow arrows forward past the current chapter.

Open the [Learning Graph Viewer](../sims/graph-viewer/index.md) to explore it
interactively. The [Learning Graph section](../learning-graph/index.md) holds the full
concept list, the taxonomy, and quality reports.

## Stories and Circuits

These sections are supplementary. They are not required for the quizzes.

- **[Stories](../stories/index.md)** are six illustrated narratives about the people and
  ideas behind the field: Claude Shannon, Hedy Lamarr, the FFT, radar in World War II,
  Robert Moog, and Ingrid Daubechies' wavelets. They make good short readings to open a
  class or to start a discussion about who gets credit for engineering ideas.
- **[Circuits](../circuits/index.md)** has circuit diagrams, such as inverting and
  non-inverting op-amps, plus a list of important analog circuits. Use them to connect
  filter mathematics to real hardware.

## Feedback

### Reporting Issues and Suggestions

This textbook is an open-source project hosted on **GitHub**, a website where software
and content projects are developed collaboratively. You do not need to understand
programming to report a problem.

A **GitHub Issue** is like a support ticket: a way to report an error, suggest an
improvement, or ask a question.

1. Go to the repository at
   [github.com/dmccreary/signal-processing](https://github.com/dmccreary/signal-processing).
2. Click the **Issues** tab, then the green **New issue** button.
3. Give the issue a clear title, such as "Error in Chapter 8 Z-transform example".
4. Describe which page has the problem, what you expected, and what you saw.
5. Click **Submit new issue**.

You need a free GitHub account to submit issues. Otherwise, use the
[Contact page](../contact.md).

Useful feedback includes factual and mathematical errors (especially in the chapters
flagged above), broken links, MicroSims that fail to load, and topics that should be
covered.

## Understanding the License

A **license** is a legal document that explains what others may do with a piece of
work. A **Creative Commons (CC) license** is a standard, plain-language license for
educational and creative content.

This textbook uses **CC BY-NC-SA 4.0**:

| Code | Name | What it means |
|------|------|---------------|
| **BY** | Attribution | You must credit the original author |
| **NC** | NonCommercial | You may not use the material for commercial purposes |
| **SA** | ShareAlike | If you modify it, you must share your version under the same license |
| **4.0** | Version 4.0 | The current version of the license |

### What You Can Do

- Copy the textbook or individual chapters for your students.
- Share the link with other teachers, students, or parents.
- Print chapters for class use.
- Modify the content: add examples, remove sections, or reorder chapters.
- Translate it into other languages.
- Build your own version based on this one.

### What You Cannot Do

- Sell the textbook or charge students for access to it.
- Remove attribution. You must credit the original author, Dan McCreary.
- Share a modified version under a different license.
- Present the material as your own original work.

!!! note
    If you are unsure whether your situation counts as "non-commercial", for example a
    paid training program, ask your institution or read the
    [Creative Commons license page](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en).
    This guide is not legal advice.

The full text is on the [License](../license.md) page.

## Customizing Your Own Textbook

You can create your own version of this textbook. The steps below explain how.

### Key Technical Terms

- **Repository (repo):** A folder on GitHub that holds all of a project's files.
- **Git:** A tool that tracks changes to files over time.
- **Clone:** Copying a repository to your own computer.
- **Fork:** Copying a repository to your own GitHub account.
- **MkDocs:** The software that turns the textbook's Markdown files into a website.
- **Markdown:** A simple text format. `**bold**` makes **bold**, `# Heading` makes a
  heading, and `-` makes a bullet.
- **mkdocs.yml:** The main configuration file. It controls the title, navigation, colors,
  and which features are enabled.

### Step 1: Create a GitHub Account

If you do not have one, create a free account at [github.com](https://github.com).

### Step 2: Fork or Clone the Repository

**Option A: Fork (easier).** Open
[github.com/dmccreary/signal-processing](https://github.com/dmccreary/signal-processing),
click **Fork**, and edit your copy on GitHub.

**Option B: Clone (more control).** Install [Git](https://git-scm.com/), open a
terminal, and run:

```bash
git clone https://github.com/dmccreary/signal-processing.git
```

### Step 3: Make Changes

All content is in the `docs/` folder as Markdown (`.md`) files. Edit them with any text
editor.

**Title, description, and address.** In `mkdocs.yml`, change these lines:

```yaml
site_name: Your Course Title
site_description: 'Your description'
site_author: 'Your Name'
site_url: 'https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/'
repo_url: 'https://github.com/YOUR-USERNAME/YOUR-REPO-NAME'
```

**Colors.** The maroon color is set in `docs/css/extra.css`. Look for the
`--md-primary-fg-color` lines near the top and change the hex color codes.

**Logo and icon.** Replace `docs/img/logo-192.png` (the header logo) and
`docs/img/favicon.ico` (the browser tab icon) with your own images, keeping the same
file names.

**Chapters and navigation.** The `nav:` section of `mkdocs.yml` lists every page in the
left menu. Add, remove, or reorder entries to match your syllabus.

### Step 4: Preview Your Changes Locally

1. Install Python 3 from [python.org](https://python.org).
2. Install MkDocs, the Material theme, and the page-exclude plugin:

    ```bash
    pip install mkdocs "mkdocs-material[imaging]" mkdocs-exclude
    ```

3. From the project folder, start the preview server:

    ```bash
    mkdocs serve
    ```

4. Open `http://127.0.0.1:8000/signal-processing/` in your browser. The page reloads
   when you save a file.

!!! note "If you see an error mentioning Cairo"
    The site uses Material's social-card plugin, which needs a graphics library called
    Cairo. Either install Cairo (see the Material for MkDocs documentation on social
    cards) or delete the `- social` line under `plugins:` in `mkdocs.yml`. The site
    works without social cards.

### Step 5: Publish Your Version

To publish your site for free with GitHub Pages, run:

```bash
mkdocs gh-deploy
```

This builds the site and publishes it to
`https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/` in about one to two minutes. If the
page does not appear, open your repository's **Settings**, choose **Pages**, and select
the `gh-pages` branch as the source.

### Using the Prompts

The [Prompts section](../prompts/index.md) records the AI prompts used to build this
book, from the course description through the learning graph, glossary, and MicroSims.
[How We Built This Site](../how-we-built-this-site.md) explains the tool choices. If you
adapt the book to a new subject or add chapters, reusing these prompts is the fastest
route.

## Analytics and Student Privacy

### What is Web Analytics?

**Web analytics** measures how visitors use a website: which pages they open, how long
they stay, and what device they use. For a textbook it can show which chapters students
read and which they skip.

### Google Analytics

**Google Analytics** is a free Google service that records website visits. To use your
own account:

1. Go to [analytics.google.com](https://analytics.google.com/) and sign in.
2. Create a **property** (Google's term for a tracked website). Google gives you a
   **Measurement ID** that looks like `G-XXXXXXXXXX`.
3. In `mkdocs.yml`, make sure the setting sits **inside** the `extra:` section:

    ```yaml
    extra:
      analytics:
        provider: google
        property: G-YOUR-MEASUREMENT-ID
    ```

4. Rebuild and deploy. Data typically appears within 24 to 48 hours.

!!! warning "Replace the original author's ID"
    `mkdocs.yml` contains the original author's Measurement ID. If you fork the book,
    replace it with your own. Otherwise your students' visits are counted in the
    author's property.

Analytics can show the most and least visited chapters, time on page, device types, and
where visitors are located. It reports aggregate page views, not individual students.

### xAPI and Individual Student Data

**xAPI** (Experience API) is a standard for recording detailed learning activity, such
as "student answered question 3 correctly". The records are stored in a **Learning
Record Store (LRS)**.

**This textbook does not currently send xAPI records.** Quiz answers are never
collected. If you add tracking, be aware of these rules first:

- **FERPA** (Family Educational Rights and Privacy Act): U.S. law protecting student
  education records. Data that identifies individual students is covered.
- **GDPR** (General Data Protection Regulation): European Union law that applies if any
  of your students are in the EU.
- **COPPA** (Children's Online Privacy Protection Act): U.S. law for children under 13,
  relevant only if you use the book with younger learners.
- **State and institutional rules.** Many U.S. states and institutions add their own
  requirements.

The anonymous aggregate analytics above are the safest option. Consult your institution's
data privacy office before collecting individual student data.

## Related Pages

- [Course Description](../course-description.md): topics, objectives, and prerequisites
- [Chapters Overview](../chapters/index.md): all 15 chapters
- [Book Metrics](../learning-graph/book-metrics.md) and
  [Chapter Metrics](../learning-graph/chapter-metrics.md): content statistics
- [Report Card](../report-card.md): the author's assessment of AI performance on each task
- [About This Website](../about.md): purpose and build workflow
