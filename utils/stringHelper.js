// This function calculates the Levenshtein Distance between two strings.
// It determines how many individual character changes are needed to turn string A into string B.
function getEditDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // Initialize the first column of the matrix rows.
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Initialize the first row of the matrix columns.
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill out the matrix grid to determine minimum edit operations.
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

// This function splits a string into an array of lowercase words.
// It automatically trims trailing 's' characters from words longer than 4 letters to handle basic plurals smoothly.
function tokenizeAndClean(str) {
    return str.trim().toLowerCase().split(/\s+/).map(word => {
        if (word.endsWith('s') && word.length > 4) {
            return word.slice(0, -1);
        }
        return word;
    });
}

// This function splits a long string into an array of smaller chunks.
// It ensures no individual chunk passes Discord's 2000 character restriction.
function splitMessage(text, maxLength = 1900) {
    if (text.length <= maxLength) return [text];

    const chunks = [];
    const lines = text.split('\n');
    let currentChunk = '';

    for (const line of lines) {
        // If adding the next line exceeds the safe length, save the current chunk and start a new one.
        if ((currentChunk + '\n' + line).length > maxLength) {
            if (currentChunk.trim().length > 0) {
                chunks.push(currentChunk);
            }
            currentChunk = line;
        } else {
            currentChunk = currentChunk ? currentChunk + '\n' + line : line;
        }
    }

    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
}

// This function adds thousand-separator commas to raw number values and removes decimals.
function formatMoney(num) {
    if (num === null || num === undefined) return '0';
    return Math.round(num).toLocaleString('en-US');
}

// Update your module.exports block to include formatMoney
module.exports = {
    getEditDistance,
    tokenizeAndClean,
    splitMessage,
    formatMoney
};