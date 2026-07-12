const { getEditDistance, tokenizeAndClean } = require('./stringHelper');

// This function checks the market data for items matching all terms typed by the user.
// It ensures that multi-word queries match correctly regardless of word order.
function findExactOrPartialMatches(userInput, marketData) {
    const inputTokens = tokenizeAndClean(userInput);
    if (inputTokens.length === 0) return [];

    return marketData.filter(entry => {
        const itemTokens = tokenizeAndClean(entry.item);
        
        // Confirm that every single word in the user's input matches part of a word inside the market item name.
        return inputTokens.every(token => 
            itemTokens.some(itemToken => itemToken.includes(token) || token.includes(itemToken))
        );
    });
}

// This function scans the market dataset to rank items by spelling similarity.
// It is used as a fallback system when no partial or exact matches are found.
function findCloseMatches(userInput, marketData, maxResults = 3) {
    const inputTokens = tokenizeAndClean(userInput);
    if (inputTokens.length === 0) return [];

    return marketData
        .map(entry => {
            const itemTokens = tokenizeAndClean(entry.item);
            let totalSimilarity = 0;

            // Compare each word of the user input against the best match from the market item name.
            for (const inToken of inputTokens) {
                let bestWordSim = 0;
                for (const itemToken of itemTokens) {
                    const distance = getEditDistance(inToken, itemToken);
                    const maxLength = Math.max(inToken.length, itemToken.length);
                    const similarity = maxLength === 0 ? 1 : (1 - distance / maxLength);
                    if (similarity > bestWordSim) {
                        bestWordSim = similarity;
                    }
                }
                totalSimilarity += bestWordSim;
            }

            // Average out the word similarity scores over the total number of words input.
            const finalSimilarity = totalSimilarity / inputTokens.length;

            return { item: entry.item, similarity: finalSimilarity };
        })
        // Filter out poor suggestions that do not pass a 55% similarity baseline.
        .filter(match => match.similarity >= 0.55) 
        .sort((a, b) => b.similarity - a.similarity)
        // Deduplicate overlapping entries in the suggestions array.
        .filter((value, index, self) => self.findIndex(t => t.item === value.item) === index)
        .slice(0, maxResults)
        .map(match => match.item);
}

module.exports = {
    findExactOrPartialMatches,
    findCloseMatches
};