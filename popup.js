document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('latexInput');
    const preview = document.getElementById('preview');
    const copyBtn = document.getElementById('copyBtn');
    const status = document.getElementById('status');

    input.addEventListener('input', () => {
        const latex = input.value;
        const unicode = latexToUnicode(latex);
        preview.textContent = unicode;
    });

    copyBtn.addEventListener('click', () => {
        const text = preview.textContent;
        if (!text) return;

        navigator.clipboard.writeText(text).then(() => {
            status.textContent = 'Copied!';
            setTimeout(() => status.textContent = '', 2000);
        }).catch(err => {
            status.textContent = 'Failed to copy';
            console.error('Copy failed', err);
        });
    });

    // Symbol Picker Logic
    const commonSymbols = [
        { label: 'α', code: '\\alpha ' }, { label: 'β', code: '\\beta ' },
        { label: 'γ', code: '\\gamma ' }, { label: 'θ', code: '\\theta ' },
        { label: 'π', code: '\\pi ' }, { label: 'σ', code: '\\sigma ' },
        { label: 'Ω', code: '\\Omega ' }, { label: '∞', code: '\\infty ' },
        { label: '→', code: '\\to ' }, { label: '⇒', code: '\\Rightarrow ' },
        { label: '≈', code: '\\approx ' }, { label: '≠', code: '\\neq ' },
        { label: '≤', code: '\\leq ' }, { label: '≥', code: '\\geq ' },
        { label: '×', code: '\\times ' }, { label: '∈', code: '\\in ' }
    ];

    const symbolGrid = document.getElementById('symbolGrid');
    commonSymbols.forEach(sym => {
        const btn = document.createElement('button');
        btn.className = 'symbol-btn';
        btn.textContent = sym.label;
        btn.title = sym.code.trim();
        btn.addEventListener('click', () => {
            insertAtCursor(input, sym.code);
            input.dispatchEvent(new Event('input')); // Trigger preview update
        });
        symbolGrid.appendChild(btn);
    });
});

function insertAtCursor(input, text) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const value = input.value;
    input.value = value.substring(0, start) + text + value.substring(end);
    input.selectionStart = input.selectionEnd = start + text.length;
    input.focus();
}

function latexToUnicode(latex) {
    let result = latex;

    // 1. Replace standard commands (e.g., \alpha, \to)
    // We sort keys by length descending to avoid partial matches (e.g. replacing \rightarrow before \right)
    const commands = Object.keys(latexMap).sort((a, b) => b.length - a.length);
    for (const cmd of commands) {
        // Global replace, escaping the backslash for regex
        const regex = new RegExp(cmd.replace(/\\/g, '\\\\'), 'g');
        result = result.replace(regex, latexMap[cmd]);
    }

    // 2. Handle Superscripts ^{...} or ^x
    result = result.replace(/\^\{([^}]+)\}/g, (_, content) => {
        return convertToSuper(content);
    });
    result = result.replace(/\^([a-zA-Z0-9])/g, (_, char) => {
        return convertToSuper(char);
    });

    // 3. Handle Subscripts _{...} or _x
    result = result.replace(/_\{([^}]+)\}/g, (_, content) => {
        return convertToSub(content);
    });
    result = result.replace(/_([a-zA-Z0-9])/g, (_, char) => {
        return convertToSub(char);
    });

    // 4. Cleanup braces that might be left from commands like \text{...} (simple version)
    // This is a basic heuristic; for full LaTeX parsing we'd need a tokenizer.
    result = result.replace(/\\text\{([^}]+)\}/g, '$1');
    result = result.replace(/\{|\}/g, ''); // Remove remaining braces

    return result;
}

function convertToSuper(text) {
    return text.split('').map(char => {
        // Check if we have a mapping, otherwise keep char (or maybe use a fallback?)
        // Comma handling: often used in lists like 1,j. There is no superscript comma in standard unicode blocks easily accessible,
        // but we can leave it as is or try to find one.
        return superscriptMap[char] || char;
    }).join('');
}

function convertToSub(text) {
    return text.split('').map(char => {
        return subscriptMap[char] || char;
    }).join('');
}
