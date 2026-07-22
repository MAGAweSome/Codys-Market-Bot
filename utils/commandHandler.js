const { tokenizeAndClean, formatMoney, formatItemQuantityName } = require('./stringHelper');

// List of high-value conversion elements to filter out by default
const ELEMENTS = ['cobalt', 'oxygen', 'radon', 'berkelium'];

// Helper function to format an item name with its sub_name if it exists
function getItemDisplayName(entry) {
    const formattedItem = formatItemQuantityName(entry.item, entry.buy_count || 1);
    return entry.sub_name ? `${formattedItem} (${entry.sub_name})` : formattedItem;
}

// Helper function to dynamically format sell details depending on sell_item configurations
function getSellDisplay(entry) {
    const sellTarget = entry.sell_item || entry.item;
    const formattedSellItem = formatItemQuantityName(sellTarget, entry.sell_count || 1);

    if (entry.sell_item) {
        return `Sell ${formattedSellItem}: **${formatMoney(entry.sell)}**`;
    }
    return `Sell: **${formatMoney(entry.sell)}**`;
}

// This function processes messages that start with a hyphen (-) and maps them to data filters.
function handleMarketCommand(messageText, marketData) {
    const trimmedText = messageText.trim();
    
    if (!trimmedText.startsWith('-')) return null;

    const parts = trimmedText.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    // COMMAND: -help
    if (command === '-help') {
        return `## 📖 Codys Market Bot Directory\n` +
               `Use the tools below to navigate and search the market server. You can type an item directly, or use a prefix (\`-\`) command.\n\n` +
               `### __Direct Item Lookup__\n` +
               `• **\`<item name>\`** \n` +
               `Type any item name by itself without any prefixes. The bot will search the database and give you its exact floor, stall location, and price. If multiple items match, it will list them for you.\n\n` +
               `💡 **Searching for Variants:**\n` +
               `By default, if you type an item that has an exact match, the bot jumps straight to it. If you want to see all of its variants (like stairs, slabs, or other versions), add \`-variant\` to your search.\n` +
               `\`\`\`text\n` +
               `cobblestone\n` +
               `cobblestone -variant\n` +
               `\`\`\`\n` +
               `### __Core Search Commands__\n` +
               `• **\`-list <quantity> <item>, <quantity> <item>, ...\`** \n` +
               `Calculates total purchasing cost for a build project. Automatically rounds UP to store batch sizes.\n` +
               `\`\`\`text\n` +
               `-list 32 cobblestone, 10 obsidian\n` +
               `\`\`\`\n` +
               `• **\`-selllist <quantity> <item>, <quantity> <item>, ...\`** \n` +
               `Calculates total payout for selling items. Automatically clamps DOWN to exact accepted batch sizes.\n` +
               `\`\`\`text\n` +
               `-selllist 13 cobblestone, 25 obsidian\n` +
               `\`\`\`\n` +
               `• **\`-find <item>\`** \n` +
               `Lists all matching items alongside their locations and full trade values.\n` +
               `\`\`\`text\n` +
               `-find diamond\n` +
               `\`\`\`\n` +
               `• **\`-buyable <item>\`** \n` +
               `Confirms if an item can be bought from a stall and displays its price.\n` +
               `\`\`\`text\n` +
               `-buyable grass\n` +
               `\`\`\`\n` +
               `• **\`-sellable <item>\`** \n` +
               `Lists items the shop accepts for selling back to earn money.\n` +
               `\`\`\`text\n` +
               `-sellable log\n` +
               `\`\`\`\n` +
               `### __Location Filters__\n` +
               `• **\`-floor <number>\`** \n` +
               `Lists every single item configuration traded on that specific floor level.\n` +
               `\`\`\`text\n` +
               `-floor 5\n` +
               `\`\`\`\n` +
               `• **\`-door <number>\`** \n` +
               `Filters lookups by a specific stall door. Works standalone or combined.\n` +
               `\`\`\`text\n` +
               `-door 5\n` +
               `-floor 2 -door 5\n` +
               `\`\`\`\n` +
               `### __Market Analytics & Lists__\n` +
               `• **\`-topbuy [elements]\`** \n` +
               `Displays top 5 luxury items to buy. Add \`elements\` for top 10 including elements.\n` +
               `• **\`-topsell [elements]\`** \n` +
               `Displays top 5 highest-paying items to sell. Add \`elements\` for top 10 including elements.\n` +
               `• **\`-cheapbuy\`** \n` +
               `Displays top 5 lowest cost budget building blocks.\n` +
               `• **\`-summary <category>\`** \n` +
               `Groups matching items to calculate price trends and database averages.\n` +
               `• **\`-stats\`** \n` +
               `Shows a total summary metric of the market database configuration.`;
    }

    // COMMAND: -list <quantity> <item>, <quantity> <item>, ...
    if (command === '-list') {
        if (!args) return `❌ **Usage Error!** Provide a comma-separated list of items.\nExample: \`-list 32 cobblestone, 10 obsidian\``;

        const rawEntries = args.split(',');
        let totalPrice = 0;
        let tableRows = [];
        let missingItemsText = '';

        for (const rawEntry of rawEntries) {
            const cleanEntry = rawEntry.trim();
            if (!cleanEntry) continue;

            const match = cleanEntry.match(/^(\d+)\s+(.+)$/);
            if (!match) {
                missingItemsText += `• Could not parse entry: "\`${cleanEntry}\`" (Make sure it starts with a number, e.g., \`64 Stone\`)\n`;
                continue;
            }

            const requestedQty = parseInt(match[1], 10);
            const searchItemName = match[2].trim();

            const searchTokens = tokenizeAndClean(searchItemName);
            let itemMatches = marketData.filter(entry => {
                const itemTokens = tokenizeAndClean(entry.item);
                return searchTokens.every(token => 
                    itemTokens.some(itemToken => itemToken.includes(token) || token.includes(itemToken))
                );
            });

            const exact = itemMatches.find(entry => entry.item.toLowerCase() === searchItemName.toLowerCase());
            if (exact) itemMatches = [exact];

            if (itemMatches.length === 0 || itemMatches[0].buy === 0) {
                missingItemsText += `• **${searchItemName}** is not purchasable or couldn't be found in the database.\n`;
                continue;
            }

            if (itemMatches.length > 1) {
                missingItemsText += `• **${searchItemName}** matched multiple items (${itemMatches.slice(0, 3).map(e => e.item).join(', ')}...). Please be more specific!\n`;
                continue;
            }

            const marketItem = itemMatches[0];
            const batchSize = marketItem.buy_count || 1;
            const unitPrice = marketItem.buy;

            const batchesNeeded = Math.ceil(requestedQty / batchSize);
            const finalQtyToBuy = batchesNeeded * batchSize;
            const itemCost = batchesNeeded * unitPrice;

            totalPrice += itemCost;

            const nameDisplay = getItemDisplayName(marketItem);
            const locationStr = `F${marketItem.floor} (${marketItem.location})`;
            
            tableRows.push({
                item: nameDisplay,
                location: locationStr,
                req: requestedQty.toString(),
                buy: finalQtyToBuy.toString(),
                cost: formatMoney(itemCost)
            });
        }

        let finalResponse = `## 🧾 Project Materials Invoice\n\n`;
        
        if (tableRows.length > 0) {
            const maxItem = Math.max(...tableRows.map(r => r.item.length), 4);
            const maxLoc = Math.max(...tableRows.map(r => r.location.length), 8);
            const maxReq = Math.max(...tableRows.map(r => r.req.length), 4);
            const maxBuy = Math.max(...tableRows.map(r => r.buy.length), 4);

            let tableText = `\`\`\`text\n` +
                `${'Item'.padEnd(maxItem)} | ${'Location'.padEnd(maxLoc)} | ${'Req'.padEnd(maxReq)} | ${'Buy'.padEnd(maxBuy)} | Cost\n` +
                `${'-'.repeat(maxItem)}-+-${'-'.repeat(maxLoc)}-+-${'-'.repeat(maxReq)}-+-${'-'.repeat(maxBuy)}-+----------\n`;

            for (const r of tableRows) {
                tableText += `${r.item.padEnd(maxItem)} | ${r.location.padEnd(maxLoc)} | ${r.req.padEnd(maxReq)} | ${r.buy.padEnd(maxBuy)} | ${r.cost}\n`;
            }
            tableText += `\`\`\``;

            finalResponse += `### 🛒 __Purchasing Guide__\n${tableText}\n`;
        }
        
        if (missingItemsText) {
            finalResponse += `### ⚠️ __Issues / Missing Entries__\n${missingItemsText}\n`;
        }

        if (tableRows.length > 0) {
            finalResponse += `---\n### Total Estimated Cost: **${formatMoney(totalPrice)}**`;
        } else if (!missingItemsText) {
            return `❌ No valid items could be parsed from your list request.`;
        }

        return finalResponse;
    }

    // COMMAND: -selllist <quantity> <item>, <quantity> <item>, ...
    if (command === '-selllist') {
        if (!args) return `❌ **Usage Error!** Provide a comma-separated list of items to sell.\nExample: \`-selllist 13 cobblestone, 25 obsidian\``;

        const rawEntries = args.split(',');
        let totalPayout = 0;
        let tableRows = [];
        let missingItemsText = '';

        for (const rawEntry of rawEntries) {
            const cleanEntry = rawEntry.trim();
            if (!cleanEntry) continue;

            const match = cleanEntry.match(/^(\d+)\s+(.+)$/);
            if (!match) {
                missingItemsText += `• Could not parse entry: "\`${cleanEntry}\`" (Make sure it starts with a number, e.g., \`13 Cobblestone\`)\n`;
                continue;
            }

            const heldQty = parseInt(match[1], 10);
            const searchItemName = match[2].trim();

            const searchTokens = tokenizeAndClean(searchItemName);
            let itemMatches = marketData.filter(entry => {
                const targetName = entry.sell_item || entry.item;
                const itemTokens = tokenizeAndClean(targetName);
                return entry.sell > 0 && searchTokens.every(token => 
                    itemTokens.some(itemToken => itemToken.includes(token) || token.includes(itemToken))
                );
            });

            const exact = itemMatches.find(entry => {
                const targetName = entry.sell_item || entry.item;
                return targetName.toLowerCase() === searchItemName.toLowerCase();
            });
            if (exact) itemMatches = [exact];

            if (itemMatches.length === 0) {
                missingItemsText += `• **${searchItemName}** is not sellable or couldn't be found in the database.\n`;
                continue;
            }

            if (itemMatches.length > 1) {
                missingItemsText += `• **${searchItemName}** matched multiple sellable items. Please be more specific!\n`;
                continue;
            }

            const marketItem = itemMatches[0];
            const batchSize = marketItem.sell_count || 1;
            const unitPayout = marketItem.sell;

            // Clamp DOWN using Math.floor to only count complete batches
            const batchesPossible = Math.floor(heldQty / batchSize);

            if (batchesPossible === 0) {
                missingItemsText += `• **${searchItemName}**: You offered **${heldQty}**, but the stall requires a minimum batch of **${batchSize}** to sell.\n`;
                continue;
            }

            const actualQtySold = batchesPossible * batchSize;
            const itemPayout = batchesPossible * unitPayout;

            totalPayout += itemPayout;

            const nameDisplay = getItemDisplayName(marketItem);
            const locationStr = `F${marketItem.floor} (${marketItem.location})`;

            tableRows.push({
                item: nameDisplay,
                location: locationStr,
                held: heldQty.toString(),
                sold: actualQtySold.toString(),
                payout: formatMoney(itemPayout)
            });
        }

        let finalResponse = `## 💰 Sales Payout Invoice\n\n`;

        if (tableRows.length > 0) {
            const maxItem = Math.max(...tableRows.map(r => r.item.length), 4);
            const maxLoc = Math.max(...tableRows.map(r => r.location.length), 8);
            const maxHeld = Math.max(...tableRows.map(r => r.held.length), 4);
            const maxSold = Math.max(...tableRows.map(r => r.sold.length), 4);

            let tableText = `\`\`\`text\n` +
                `${'Item'.padEnd(maxItem)} | ${'Location'.padEnd(maxLoc)} | ${'Held'.padEnd(maxHeld)} | ${'Sold'.padEnd(maxSold)} | Payout\n` +
                `${'-'.repeat(maxItem)}-+-${'-'.repeat(maxLoc)}-+-${'-'.repeat(maxHeld)}-+-${'-'.repeat(maxSold)}-+----------\n`;

            for (const r of tableRows) {
                tableText += `${r.item.padEnd(maxItem)} | ${r.location.padEnd(maxLoc)} | ${r.held.padEnd(maxHeld)} | ${r.sold.padEnd(maxSold)} | ${r.payout}\n`;
            }
            tableText += `\`\`\``;

            finalResponse += `### 🏷️ __Drop-Off Locations__\n${tableText}\n`;
        }

        if (missingItemsText) {
            finalResponse += `### ⚠️ __Issues / Unsold Entries__\n${missingItemsText}\n`;
        }

        if (tableRows.length > 0) {
            finalResponse += `---\n### Total Estimated Payout: **${formatMoney(totalPayout)}**`;
        } else if (!missingItemsText) {
            return `❌ No valid items could be parsed from your sell list request.`;
        }

        return finalResponse;
    }

    // COMMAND: -stats
    if (command === '-stats') {
        const totalItems = marketData.length;
        const totalFloors = [...new Set(marketData.map(item => item.floor))].length;
        const totalDoors = [...new Set(marketData.map(item => item.location))].length;
        return `📊 **Market Statistics**\nThe market database currently manages **${totalItems} unique item configurations** spread across **${totalFloors} floors** and **${totalDoors} distinct shop stalls**.`;
    }

    // COMMAND: -topbuy
    if (command === '-topbuy') {
        const showElements = args.toLowerCase().includes('elements');
        let filteredData = [...marketData];
        
        if (!showElements) {
            filteredData = filteredData.filter(entry => !ELEMENTS.includes(entry.item.toLowerCase()));
        }

        const limit = showElements ? 10 : 5;
        const topBuyItems = filteredData
            .sort((a, b) => b.buy - a.buy)
            .slice(0, limit);

        const listText = topBuyItems.map((entry, idx) => {
            const nameDisplay = getItemDisplayName(entry);
            return `${idx + 1}. **${nameDisplay}** (Floor ${entry.floor}) | Buy Cost: **${formatMoney(entry.buy)}**`;
        }).join('\n');

        const title = showElements ? `Top 10 Luxury Items (Including Elements)` : `Top 5 Luxury Items (Excluding Elements)`;
        return `💎 **${title}:**\n\n${listText}`;
    }

    // COMMAND: -topsell
    if (command === '-topsell') {
        const showElements = args.toLowerCase().includes('elements');
        let filteredData = [...marketData];
        
        if (!showElements) {
            filteredData = filteredData.filter(entry => !ELEMENTS.includes(entry.item.toLowerCase()));
        }

        const limit = showElements ? 10 : 5;
        const topSellItems = filteredData
            .sort((a, b) => b.sell - a.sell)
            .slice(0, limit);

        const listText = topSellItems.map((entry, idx) => {
            const nameDisplay = getItemDisplayName(entry);
            const sellTarget = entry.sell_item || entry.item;
            const formattedSellItem = formatItemQuantityName(sellTarget, entry.sell_count || 1);
            const sellLabel = entry.sell_item ? `Sells For (${formattedSellItem})` : `Sells For`;
            return `${idx + 1}. **${nameDisplay}** (Floor ${entry.floor}) | ${sellLabel}: **${formatMoney(entry.sell)}**`;
        }).join('\n');

        const title = showElements ? `Top 10 Money Makers (Including Elements)` : `Top 5 Money Makers (Excluding Elements)`;
        return `💰 **${title}:**\n\n${listText}`;
    }

    // COMMAND: -cheapbuy
    if (command === '-cheapbuy') {
        const cheapBuyItems = marketData
            .filter(entry => entry.buy > 0)
            .sort((a, b) => a.buy - b.buy)
            .slice(0, 5);

        const listText = cheapBuyItems.map((entry, idx) => {
            const nameDisplay = getItemDisplayName(entry);
            return `${idx + 1}. **${nameDisplay}** (Floor ${entry.floor}) | Buy Cost: **${formatMoney(entry.buy)}**`;
        }).join('\n');

        return `🪙 **Top 5 Budget Choices (Lowest Buy Prices):**\n\n${listText}`;
    }

    // COMMAND: -find <item name>
    if (command === '-find') {
        if (!args) return `❌ Please specify an item to find! Example: \`-find diamond\``;
        
        const searchTokens = tokenizeAndClean(args);
        const matches = marketData.filter(entry => {
            const itemTokens = tokenizeAndClean(entry.item);
            return searchTokens.every(token => 
                itemTokens.some(itemToken => itemToken.includes(token) || token.includes(itemToken))
            );
        });

        if (matches.length === 0) return `❌ No items found matching "**${args}**".`;

        const listText = matches.map(entry => {
            const nameDisplay = getItemDisplayName(entry);
            const sellPart = getSellDisplay(entry);
            return `• **${nameDisplay}** (Floor ${entry.floor}, ${entry.location}) | Buy: **${formatMoney(entry.buy)}** | ${sellPart}`;
        }).join('\n');

        return `🔍 **Found matches for "${args}":**\n\n${listText}`;
    }

    // COMMAND: -floor and -door filters
    if (command === '-floor' || command === '-door') {
        let floorNum = null;
        let doorStr = null;

        const floorMatch = trimmedText.match(/-floor\s+(\d+)/i);
        const doorMatch = trimmedText.match(/-door\s+(\d+)/i);

        if (floorMatch) floorNum = parseInt(floorMatch[1], 10);
        if (doorMatch) doorStr = `Door ${doorMatch[1]}`;

        if (!floorNum && command === '-floor' && args) floorNum = parseInt(parts[1], 10);
        if (!doorStr && command === '-door' && args) doorStr = `Door ${parts[1]}`;

        let matches = marketData;
        if (floorNum) matches = matches.filter(entry => entry.floor === floorNum);
        if (doorStr) matches = matches.filter(entry => entry.location.toLowerCase() === doorStr.toLowerCase());

        if (matches.length === 0) return `❌ Could not find any active entries matching those location filters.`;

        let responseMessage = '';

        if (floorNum && doorStr) {
            responseMessage = `## 🏢 Market Directory: Floor ${floorNum} (${doorStr})\n\n`;
            responseMessage += matches.map(entry => {
                const nameDisplay = getItemDisplayName(entry);
                const sellPart = getSellDisplay(entry);
                return `• **${nameDisplay}** | Buy: **${formatMoney(entry.buy)}** | ${sellPart}`;
            }).join('\n');
            
            return responseMessage;
        }

        if (command === '-floor') {
            responseMessage = `## 🏢 Market Directory: Floor ${floorNum}\n`;
            
            const uniqueDoors = [...new Set(matches.map(entry => entry.location))].sort((a, b) => {
                const numA = parseInt(a.replace(/\D/g, ''), 10);
                const numB = parseInt(b.replace(/\D/g, ''), 10);
                return numA - numB;
            });

            for (const door of uniqueDoors) {
                const doorItems = matches.filter(entry => entry.location === door);
                responseMessage += `\n### 🚪 __${door}__\n`;
                responseMessage += doorItems.map(entry => {
                    const nameDisplay = getItemDisplayName(entry);
                    const sellPart = getSellDisplay(entry);
                    return `• **${nameDisplay}** | Buy: **${formatMoney(entry.buy)}** | ${sellPart}`;
                }).join('\n') + '\n';
            }

            return responseMessage;
        }

        if (command === '-door') {
            responseMessage = `## 🚪 Market Directory: ${doorStr}\n`;

            const uniqueFloors = [...new Set(matches.map(entry => entry.floor))].sort((a, b) => a - b);

            for (const floor of uniqueFloors) {
                const floorItems = matches.filter(entry => entry.floor === floor);
                responseMessage += `\n### 🏢 __Floor ${floor}__\n`;
                responseMessage += floorItems.map(entry => {
                    const nameDisplay = getItemDisplayName(entry);
                    const sellPart = getSellDisplay(entry);
                    return `• **${nameDisplay}** | Buy: **${formatMoney(entry.buy)}** | ${sellPart}`;
                }).join('\n') + '\n';
            }

            return responseMessage;
        }
    }

    // COMMAND: -buyable <item name>
    if (command === '-buyable') {
        if (!args) return `❌ Please specify an item name! Example: \`-buyable grass\``;
        
        const searchTokens = tokenizeAndClean(args);
        const matches = marketData.filter(entry => {
            const itemTokens = tokenizeAndClean(entry.item);
            return entry.buy > 0 && searchTokens.every(token => 
                itemTokens.some(itemToken => itemToken.includes(token) || token.includes(itemToken))
            );
        });

        if (matches.length === 0) return `❌ No purchasable items found matching "**${args}**".`;

        const listText = matches.map(entry => {
            const nameDisplay = getItemDisplayName(entry);
            return `• **${nameDisplay}** on **Floor ${entry.floor}** for **${formatMoney(entry.buy)}**`;
        }).join('\n');
        return `🛒 **Purchasable Items matching "${args}":**\n\n${listText}`;
    }

    // COMMAND: -sellable <item name>
    if (command === '-sellable') {
        if (!args) return `❌ Please specify an item name! Example: \`-sellable log\``;
        
        const searchTokens = tokenizeAndClean(args);
        const matches = marketData.filter(entry => {
            const activeSellTarget = entry.sell_item || entry.item;
            const itemTokens = tokenizeAndClean(activeSellTarget);
            return entry.sell > 0 && searchTokens.every(token => 
                itemTokens.some(itemToken => itemToken.includes(token) || token.includes(itemToken))
            );
        });

        if (matches.length === 0) return `❌ No items found that you can sell matching "**${args}**".`;

        const listText = matches.map(entry => {
            const sellTarget = entry.sell_item || entry.item;
            const formattedSellItem = formatItemQuantityName(sellTarget, entry.sell_count || 1);
            return `• **${formattedSellItem}** can be sold on **Floor ${entry.floor}** (for **${getItemDisplayName(entry)}**) for **${formatMoney(entry.sell)}**`;
        }).join('\n');
        return `💰 **Items you can sell matching "${args}":**\n\n${listText}`;
    }

    // COMMAND: -summary <category keyword>
    if (command === '-summary') {
        if (!args) return `❌ Please specify a category keyword! Example: \`-summary log\``;

        const searchTokens = tokenizeAndClean(args);
        const matches = marketData.filter(entry => {
            const itemTokens = tokenizeAndClean(entry.item);
            return searchTokens.every(token => 
                itemTokens.some(itemToken => itemToken.includes(token) || token.includes(itemToken))
            );
        });

        if (matches.length === 0) return `❌ No items found to build a summary for matching "**${args}**".`;

        const totalItems = matches.length;
        const buyableItems = matches.filter(e => e.buy > 0);
        const sellableItems = matches.filter(e => e.sell > 0);

        const avgBuy = buyableItems.length > 0 ? Math.round(buyableItems.reduce((sum, e) => sum + e.buy, 0) / buyableItems.length) : 0;
        const avgSell = sellableItems.length > 0 ? Math.round(sellableItems.reduce((sum, e) => sum + e.sell, 0) / sellableItems.length) : 0;

        return `📈 **Market Summary for "${args}"**\n\n` +
               `• Total unique matching variations: **${totalItems}**\n` +
               `• Average market purchase price: **${formatMoney(avgBuy)}**\n` +
               `• Average market sell payout: **${formatMoney(avgSell)}**`;
    }

    return `❌ Unknown command syntax. Type \`-help\` to see a list of valid market commands.`;
}

module.exports = {
    handleMarketCommand
};