document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('latexInput');
    const preview = document.getElementById('preview');
    const copyBtn = document.getElementById('copyBtn');
    const renderBtn = document.getElementById('renderBtn');
    const saveBtn = document.getElementById('saveBtn');
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
            showStatus('Copied Unicode!');
            addToHistory(input.value);
        }).catch(err => {
            showStatus('Failed to copy', true);
            console.error('Copy failed', err);
        });
    });

    renderBtn.addEventListener('click', () => {
        const latex = input.value;
        if (!latex) return;

        const container = document.getElementById('render-container');
        container.innerHTML = ''; // Clear previous

        try {
            // 1. Render LaTeX to DOM using KaTeX
            katex.render(latex, container, {
                displayMode: true,
                throwOnError: false,
                output: 'html' // Ensure HTML output for html2canvas
            });

            // 2. Convert DOM to Image using html2canvas
            // We need a slight delay or force layout to ensure fonts load? 
            // Usually KaTeX is sync, but html2canvas needs visible elements.
            // Since it's off-screen, we might need to be careful.

            html2canvas(container, {
                backgroundColor: null, // Transparent background
                scale: 3 // High resolution
            }).then(canvas => {
                canvas.toBlob(blob => {
                    if (!blob) {
                        showStatus('Error generating image', true);
                        return;
                    }

                    // 3. Copy Image to Clipboard
                    const item = new ClipboardItem({ 'image/png': blob });
                    navigator.clipboard.write([item]).then(() => {
                        showStatus('Copied Image!');
                        addToHistory(latex + ' (Image)');
                    }).catch(err => {
                        console.error(err);
                        showStatus('Clipboard Error', true);
                    });
                });
            });

        } catch (e) {
            console.error(e);
            showStatus('Render Error', true);
        }
    });

    // Tab Logic
    const tabRecent = document.getElementById('tabRecent');
    const tabLibrary = document.getElementById('tabLibrary');
    const historyList = document.getElementById('historyList');
    const libraryList = document.getElementById('libraryList');

    tabRecent.addEventListener('click', () => switchTab('recent'));
    tabLibrary.addEventListener('click', () => switchTab('library'));

    function switchTab(tab) {
        if (tab === 'recent') {
            tabRecent.classList.add('active');
            tabLibrary.classList.remove('active');
            historyList.classList.remove('hidden');
            libraryList.classList.add('hidden');
            loadHistory();
        } else {
            tabLibrary.classList.add('active');
            tabRecent.classList.remove('active');
            libraryList.classList.remove('hidden');
            historyList.classList.add('hidden');
            loadLibrary();
        }
    }

    // Save to Library
    saveBtn.addEventListener('click', () => {
        const latex = input.value;
        if (!latex) return;
        const name = prompt('Name this formula (e.g., "Bayes Theorem"):');
        if (name) {
            addToLibrary(name, latex);
            switchTab('library');
        }
    });

    function addToLibrary(name, latex) {
        const library = JSON.parse(localStorage.getItem('latexLibrary') || '[]');
        library.push({ id: Date.now(), name, latex });
        localStorage.setItem('latexLibrary', JSON.stringify(library));
        loadLibrary();
    }

    function loadLibrary() {
        const library = JSON.parse(localStorage.getItem('latexLibrary') || '[]');
        libraryList.innerHTML = '';
        library.forEach(item => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `<span>${item.name}</span>`;

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.innerHTML = '&times;';
            delBtn.title = 'Delete';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deleteFromLibrary(item.id);
            };

            div.appendChild(delBtn);
            div.addEventListener('click', () => {
                input.value = item.latex;
                input.dispatchEvent(new Event('input'));
            });
            libraryList.appendChild(div);
        });
    }

    function deleteFromLibrary(id) {
        let library = JSON.parse(localStorage.getItem('latexLibrary') || '[]');
        library = library.filter(item => item.id !== id);
        localStorage.setItem('latexLibrary', JSON.stringify(library));
        loadLibrary();
    }

    // History Logic
    loadHistory();

    function addToHistory(latex) {
        if (!latex) return;
        let history = JSON.parse(localStorage.getItem('latexHistory') || '[]');
        history = history.filter(item => item !== latex);
        history.unshift(latex);
        if (history.length > 5) history.pop();
        localStorage.setItem('latexHistory', JSON.stringify(history));
        if (tabRecent.classList.contains('active')) loadHistory();
    }

    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('latexHistory') || '[]');
        historyList.innerHTML = '';
        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'list-item';
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

    // Status message helper
    function showStatus(message, isError = false) {
        status.textContent = message;
        status.style.color = isError ? '#d00' : '#1a8917';
        setTimeout(() => {
            status.textContent = '';
        }, 2000);
    }
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
