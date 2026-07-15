const fs = require('fs');
const path = require('path');
const { formatMoney, formatItemQuantityName } = require('./stringHelper');

const marketFilePath = path.join(__dirname, '../market.json');

function saveMarketData(data) {
    fs.writeFileSync(marketFilePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Formats a single item entry to look exactly like the standard user search response.
 */
function formatItemDetails(itemEntry) {
    const buyCount = itemEntry.buy_count || 1;
    const baseBuyItem = itemEntry.item;
    const formattedBuyItem = formatItemQuantityName(baseBuyItem, buyCount);
    
    const nameWithSub = itemEntry.sub_name 
        ? `${formattedBuyItem} (${itemEntry.sub_name})` 
        : formattedBuyItem;

    // Check if the item name ends in "s" to decide between "is" or "are"
    const verb = nameWithSub.endsWith('s') || nameWithSub.endsWith(')') && nameWithSub.slice(0, nameWithSub.indexOf(' (')).endsWith('s') ? 'are' : 'is';

    const sellCount = itemEntry.sell_count || 1;
    const baseSellItem = itemEntry.sell_item || itemEntry.item;
    const formattedSellItem = formatItemQuantityName(baseSellItem, sellCount);

    if (itemEntry.sell_item) {
        return `The **${nameWithSub}** ${verb} on **Floor ${itemEntry.floor}** (**${itemEntry.location}**), **${buyCount}** can be purchased for **${formatMoney(itemEntry.buy)}** or **${sellCount} ${formattedSellItem}** sold for **${formatMoney(itemEntry.sell)}**.`;
    } else {
        return `The **${nameWithSub}** ${verb} on **Floor ${itemEntry.floor}** (**${itemEntry.location}**), **${buyCount}** can be purchased for **${formatMoney(itemEntry.buy)}** or **${sellCount}** sold for **${formatMoney(itemEntry.sell)}**.`;
    }
}

module.exports = {
    saveMarketData,
    formatItemDetails,
    marketFilePath
};