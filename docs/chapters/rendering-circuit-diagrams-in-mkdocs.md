I would like to put circuit diagrams in my class on signal processing.  I am currently using mkdocs material with the MathJax extension to render LaTeX equations.  I love the way I can insert formulas anywhere in a large chapter of my book written in markdown and they render perfectly on the HTML page.  Using mkdocs with the "serve" option allows me to quickly preview in seconds after I make a change.

Now here is the problem.  When I attempt to add CircuiTikz references in my chapter I can not get the circuit diagrams to render.  Can you propose a solution that would allow CircuiTikz diagrams to render in my existing mkdocs structure?  Can this be done using existing JavaScript libraries such as MathJax or do I need to build a custom extension in Python?

## Response

## ChatGPT Said — o3

### Why CircuiTikz doesn’t show up now

* **MathJax only parses *math***. It ignores `\begin{tikzpicture}` blocks entirely, so the raw CircuiTikz code is left in the HTML and the browser never sees a graphic to render. ([Stack Overflow][1])

### Two practical ways to make CircuiTikz work inside **MkDocs Material**

| Approach                                           | What you add to `mkdocs.yml`                                                                                         | How you write a diagram in Markdown                                                                                                                                                                                                                       | Pros                                                                                                                      | Cons                                                                                                                                                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1 · Client-side compile with TikZJax**           | `yaml\nextra_css:\n  - https://tikzjax.com/v1/fonts.css\nextra_javascript:\n  - https://tikzjax.com/v1/tikzjax.js\n` | `markdown\n<script type=\"text/tikz\">\n\\usepackage{circuitikz}\n\\begin{circuitikz}\n\\draw (0,0) to[R,l=$1\\,\\mathrm{k}\\Omega$] (3,0) to[C,l=$10\\,\\mu\\text{F}$] (6,0)\n      (6,0) -- (6,-2) -- (0,-2) -- (0,0);\n\\end{circuitikz}\n</script>\n` | *Nothing to install*; live preview still instant with `mkdocs serve`; diagrams stay as clean SVG                          | First render happens in the reader’s browser → page load gets slower if you embed dozens of large schematics; needs JS enabled; relies on external CDN (can self-host) ([tikzjax.com][2], [GitHub][3]) |
| **2 · Pre-compile to SVG during the MkDocs build** | `yaml\nplugins:\n  - search\n  - tikzfig  # custom plugin shown below\n`                                             | `markdown\n`circuitikz\n\draw (0,0) to\[sV,l=\$V\_s\$] (0,3) -- (3,3)\n            to\[R,l=\$R\$]      (3,0) -- (0,0);\n\`\`\`                                                                                                                            | Pages load instantly (SVG already generated); works with JS disabled; assets are cached, so rebuilds after edits are fast | You install a TeX engine (`tectonic`) + `dvisvgm`; need to drop the tiny plugin file into your repo                                                                                                    |

<details>
<summary>Minimal custom plugin (<code>plugins/tikzfig.py</code>) for option 2</summary>

````python
# pip install tectonic
# pip install mkdocs
import hashlib, os, re, subprocess, tempfile, textwrap
from mkdocs.plugins import BasePlugin

class TikzFigPlugin(BasePlugin):
    BLOCK = re.compile(r'```circuitikz(.*?)```', re.S)

    def on_page_markdown(self, md, page, cfg, files):
        def _repl(m):
            body = m.group(1).strip()
            digest = hashlib.md5(body.encode()).hexdigest()
            rel_svg = f'assets/tikz/{digest}.svg'
            abs_svg = os.path.join(cfg["site_dir"], rel_svg)
            if not os.path.exists(abs_svg):
                tex = textwrap.dedent(f"""
                \\documentclass[border=1pt]{{standalone}}
                \\usepackage{{circuitikz}}
                \\begin{document}
                \\begin{{circuitikz}}[american]
                {body}
                \\end{{circuitikz}}
                \\end{document}
                """)
                with tempfile.TemporaryDirectory() as d:
                    tex_file = os.path.join(d, "fig.tex")
                    open(tex_file, "w").write(tex)
                    subprocess.run(["tectonic", "-Z", "shell-escape", tex_file], cwd=d, check=True)
                    subprocess.run(["dvisvgm", "--no-fonts", "fig.dvi", "-o", abs_svg], cwd=d, check=True)
            return f'![]({{ static }}{rel_svg})'
        return self.BLOCK.sub(_repl, md)
````

</details>

---

#### Which one should you choose?

* **Few diagrams per page or you value zero-setup & hot-reload?**
  Use *TikZJax* (Option 1). Add the two CDN lines, wrap your circuits in `<script type="text/tikz">`, and you’re done.

* **Lots of schematics, need fast page loads, or must work for users with JS blocked?**
  Spend 20 minutes wiring up Option 2; after that your workflow remains “edit → `mkdocs serve` → refresh” just like with MathJax.

---

### Tips for both workflows

* **Keep MathJax for equations** – it co-exists happily with TikZJax or with pre-compiled SVGs.
* **Package once, reuse everywhere** – put common `\usepackage{circuitikz}` and `\begin{circuitikz}[american]` boilerplate in a snippet or markdown include so you don’t repeat yourself.
* **SVG size** – TikZJax auto-sizes; for pre-compiled SVG you control the border with the `standalone` class’ `border` option.
* **Offline / air-gapped deliveries** – if students will read the book without internet, self-host the TikZJax JS (Option 1) or pre-compile (Option 2).

Either path lets you keep the rapid-iteration loop you love in MkDocs Material while gaining beautiful LaTeX-quality circuit diagrams right inside your chapters.

[1]: https://stackoverflow.com/questions/50432295/using-tikz-in-a-browser-like-mathjax?utm_source=chatgpt.com "Using TikZ in a browser like MathJax - Stack Overflow"
[2]: https://tikzjax.com/ "TikZJax"
[3]: https://github.com/artisticat1/obsidian-tikzjax?utm_source=chatgpt.com "artisticat1/obsidian-tikzjax: Render LaTeX and TikZ ... - GitHub"
