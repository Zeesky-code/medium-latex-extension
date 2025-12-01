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
            addToHistory(input.value);
        }).catch(err => {
            status.textContent = 'Failed to copy';
            console.error('Copy failed', err);
        });
    });

    // History Logic
    const historyList = document.getElementById('historyList');
    loadHistory();

    function addToHistory(latex) {
        if (!latex) return;
        let history = JSON.parse(localStorage.getItem('latexHistory') || '[]');
        // Remove if exists to move to top
        history = history.filter(item => item !== latex);
        history.unshift(latex);
        if (history.length > 5) history.pop();
        localStorage.setItem('latexHistory', JSON.stringify(history));
        renderHistory(history);
    }

    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('latexHistory') || '[]');
        renderHistory(history);
    }

    function renderHistory(history) {
        historyList.innerHTML = '';
        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.textContent = item;
            div.addEventListener('click', () => {
                input.value = item;
                input.dispatchEvent(new Event('input'));
            });
            historyList.appendChild(div);
        });
    }

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

    // Style Toolbar Logic
    document.getElementById('btnBold').addEventListener('click', () => wrapSelection(input, '\\mathbf{', '}'));
    document.getElementById('btnMono').addEventListener('click', () => wrapSelection(input, '\\mathtt{', '}'));
});

function wrapSelection(input, startTag, endTag) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const value = input.value;
    const selected = value.substring(start, end);
    const replacement = startTag + selected + endTag;
    input.value = value.substring(0, start) + replacement + value.substring(end);
    input.selectionStart = start + startTag.length;
    input.selectionEnd = start + startTag.length + selected.length;
    input.focus();
    input.dispatchEvent(new Event('input'));
}

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

    // Replace standard commands
    const commands = Object.keys(latexMap).sort((a, b) => b.length - a.length);
    for (const cmd of commands) {
        const regex = new RegExp(cmd.replace(/\\/g, '\\\\'), 'g');
        result = result.replace(regex, latexMap[cmd]);
    }

    // Superscripts
    result = result.replace(/\^\{([^}]+)\}/g, (_, content) => convertToSuper(content));
    result = result.replace(/\^([a-zA-Z0-9])/g, (_, char) => convertToSuper(char));

    // Subscripts
    result = result.replace(/_\{([^}]+)\}/g, (_, content) => convertToSub(content));
    result = result.replace(/_([a-zA-Z0-9])/g, (_, char) => convertToSub(char));

    // Bold
    result = result.replace(/\\mathbf\{([^}]+)\}/g, (_, content) => convertToBold(content));

    // Monospace
    result = result.replace(/\\mathtt\{([^}]+)\}/g, (_, content) => convertToMono(content));

    // Cleanup
    result = result.replace(/\\text\{([^}]+)\}/g, '$1');
    result = result.replace(/\{|\}/g, '');

    return result;
}

function convertToSuper(text) {
    return text.split('').map(char => {
        return superscriptMap[char] || char;
    }).join('');
}

function convertToSub(text) {
    return text.split('').map(char => {
        return subscriptMap[char] || char;
    }).join('');
}

function convertToBold(text) {
    return text.split('').map(char => boldMap[char] || char).join('');
}

function convertToMono(text) {
    return text.split('').map(char => monospaceMap[char] || char).join('');
}
