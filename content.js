document.addEventListener('keydown', (e) => {
    if (e.key !== ' ') return;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    // Only work on text nodes
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = node.textContent;
    const cursor = range.startOffset;

    // Look for a LaTeX command before the cursor (e.g., \alpha)
    // We look back until we find a backslash
    const textBefore = text.slice(0, cursor);
    const backslashIndex = textBefore.lastIndexOf('\\');

    if (backslashIndex === -1) return;

    const command = textBefore.slice(backslashIndex);

    // Check if it's a known command
    // latexMap is available from latex-map.js
    if (latexMap[command]) {
        e.preventDefault(); // Prevent the space

        const replacement = latexMap[command];

        // Replace the command with the symbol
        // We need to split the node or modify the text content
        // Modifying textContent is safer for simple text nodes
        const textAfter = text.slice(cursor);
        const newText = textBefore.slice(0, backslashIndex) + replacement + textAfter;

        node.textContent = newText;

        // Restore cursor position (after the new symbol)
        const newCursorPos = backslashIndex + replacement.length;

        // We need to set the caret position
        const newRange = document.createRange();
        newRange.setStart(node, newCursorPos);
        newRange.setEnd(node, newCursorPos);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }
});
