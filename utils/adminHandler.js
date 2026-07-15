const fs = require('fs');
const path = require('path');
const { formatMoney } = require('./stringHelper');

// Resolve the absolute path to your market.json file
const marketFilePath = path.join(__dirname, '../market.json');

/**
 * Helper to physically write the updated array back to market.json
 */
function saveMarketData(data) {
    fs.writeFileSync(marketFilePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Handles incoming CRUD requests from the private admin channel
 */
function handleAdminCommand(messageText, marketData) {
    const trimmedText = messageText.trim();
    if (!trimmedText.startsWith('-')) return null;

    const parts = trimmedText.split(/\s+/);
    const command = parts[0].toLowerCase();

    // ----------------------------------------------------
    // 📖 COMMAND: -admin help
    // ----------------------------------------------------
    if (command === '-admin' && parts[1]?.toLowerCase() === 'help') {
        return `## 🛠️ Codys Market Bot: Admin Directory\n` +
               `As an administrator, you can manage the database in real time. Use the commands below to execute CRUD operations.\n\n` +
               `### 📢 __Important Formatting Rule__\n` +
               `If any name (item, location/door, sub_name, or sell_item) has **multiple words with spaces**, you **MUST** enclose it in double quotes (e.g., \`"Door 5"\`, \`"Coarse Dirt"\`).\n\n` +
               `---\n\n` +
               `### ➕ **1. Add a New Item** (\`-add\`)\n` +
               `*   **Syntax:** \`-add <floor> <location> "<item name>" <buy_price> <sell_price> [buy_count] [sell_count] ["sub_name"] ["sell_item_name"]\`\n` +
               `*   **Defaults:** If you do not specify them, \`buy_count\` defaults to \`64\` and \`sell_count\` defaults to \`1\`.\n` +
               `*   **Example (Simple):** \`-add 1 "Door 4" "Deepslate" 180 2\`\n` +
               `*   **Example (Custom counts & sell item):** \`-add 1 "Door 5" "Grass" 90 1 16 1 "Green Turf" "Dirt"\`\n` +
               `*   **Discord Output:**\n` +
               `    > ✅ **Successfully Added Item!**\n` +
               `    > • **Item**: Grass (Green Turf)\n` +
               `    > • **Location**: Floor 1 (Door 5)\n` +
               `    > • **Buy**: 90 (for 16)\n` +
               `    > • **Sell**: 1 (as 1 Dirt)\n\n` +
               `---\n\n` +
               `### ✏️ **2. Update an Existing Item** (\`-update\`)\n` +
               `*   **Syntax:** \`-update <floor> <location> "<item name>" <field> <newValue>\`\n` +
               `*   **Valid Fields to Edit:** \`buy\`, \`sell\`, \`buy_count\`, \`sell_count\`, \`sub_name\`, \`sell_item\`\n` +
               `*   **Example:** \`-update 1 "Door 4" "Deepslate" buy_count 16\`\n` +
               `*   **Discord Output:**\n` +
               `    > ✅ **Successfully Updated Entry!**\n` +
               `    > • **Item**: Deepslate\n` +
               `    > • **Location**: Floor 1 (Door 4)\n` +
               `    > • **Field Changed**: \`buy_count\` ➡️ **16**\n\n` +
               `---\n\n` +
               `### 🗑️ **3. Delete an Item** (\`-delete\`)\n` +
               `*   **Syntax:** \`-delete <floor> <location> "<item name>"\`\n` +
               `*   **Example:** \`-delete 1 "Door 4" "Deepslate"\`\n` +
               `*   **Discord Output:**\n` +
               `    > 🗑️ **Successfully Deleted Item!**\n` +
               `    > • **Removed**: Deepslate from Floor 1 (Door 4).`;
    }

    // ----------------------------------------------------
    // ➕ COMMAND: -add {floor} {location} {item} {buy} {sell} [buy_count] [sell_count] [sub_name] [sell_item]
    // ----------------------------------------------------
    if (command === '-add') {
        const args = trimmedText.match(/(?:[^\s"]+|"[^"]*")+/g).slice(1);

        if (args.length < 5) {
            return `❌ **Usage Error!** Please use the exact format:\n` +
                   `\`-add <floor> <location> "<item name>" <buy_price> <sell_price> [buy_count] [sell_count] ["sub_name"] ["sell_item_name"]\`\n\n` +
                   `Type \`-admin help\` to see syntax rules and examples.`;
        }

        const floor = parseInt(args[0].replace(/"/g, ''), 10);
        const location = args[1].replace(/"/g, '');
        const item = args[2].replace(/"/g, '');
        const buy = parseInt(args[3], 10);
        const sell = parseInt(args[4], 10);

        // Optional parameters validation and extraction
        let buy_count = 64;
        let sell_count = 1;
        let sub_name = undefined;
        let sell_item = undefined;

        let currentArgIdx = 5;

        // Check if the 6th argument is a number (buy_count)
        if (args[currentArgIdx] && !isNaN(args[currentArgIdx])) {
            buy_count = parseInt(args[currentArgIdx], 10);
            currentArgIdx++;
            
            // Check if the 7th argument is a number (sell_count)
            if (args[currentArgIdx] && !isNaN(args[currentArgIdx])) {
                sell_count = parseInt(args[currentArgIdx], 10);
                currentArgIdx++;
            }
        }

        // Remaining args are sub_name and sell_item (strings)
        if (args[currentArgIdx]) {
            sub_name = args[currentArgIdx].replace(/"/g, '');
            currentArgIdx++;
        }
        if (args[currentArgIdx]) {
            sell_item = args[currentArgIdx].replace(/"/g, '');
        }

        if (isNaN(floor) || isNaN(buy) || isNaN(sell) || isNaN(buy_count) || isNaN(sell_count)) {
            return `❌ **Data Validation Failed!** Floor, Buy, Sell, Buy Count, and Sell Count values *must* be numbers.`;
        }

        const exists = marketData.some(entry => 
            entry.floor === floor && 
            entry.location.toLowerCase() === location.toLowerCase() && 
            entry.item.toLowerCase() === item.toLowerCase()
        );

        if (exists) {
            return `❌ **Add Failed!** An entry for **${item}** already exists on **Floor ${floor} (${location})**. Use \`-update\` instead.`;
        }

        const newEntry = {
            floor,
            location,
            buy_count,
            item,
            buy,
            sell_count,
            sell
        };

        if (sub_name) newEntry.sub_name = sub_name;
        if (sell_item) newEntry.sell_item = sell_item;

        marketData.push(newEntry);
        saveMarketData(marketData);

        const subDisplay = sub_name ? ` (${sub_name})` : '';
        return `✅ **Successfully Added Item!**\n` +
               `• **Item**: ${item}${subDisplay}\n` +
               `• **Location**: Floor ${floor} (${location})\n` +
               `• **Buy**: ${formatMoney(buy)} (for ${buy_count})\n` +
               `• **Sell**: ${formatMoney(sell)} (for ${sell_count}${sell_item ? ` ${sell_item}` : ''})`;
    }

    // ----------------------------------------------------
    // ✏️ COMMAND: -update {floor} {location} {item} {variable} {newValue}
    // ----------------------------------------------------
    if (command === '-update') {
        const args = trimmedText.match(/(?:[^\s"]+|"[^"]*")+/g).slice(1);

        if (args.length < 5) {
            return `❌ **Usage Error!** Please use the exact format:\n` +
                   `\`-update <floor> <location> "<item name>" <field> <newValue>\`\n\n` +
                   `Type \`-admin help\` to see syntax rules and examples.`;
        }

        const floor = parseInt(args[0].replace(/"/g, ''), 10);
        const location = args[1].replace(/"/g, '');
        const item = args[2].replace(/"/g, '');
        const field = args[3].replace(/"/g, '').toLowerCase();
        let newValue = args[4].replace(/"/g, '');

        const entryIndex = marketData.findIndex(entry => 
            entry.floor === floor && 
            entry.location.toLowerCase() === location.toLowerCase() && 
            entry.item.toLowerCase() === item.toLowerCase()
        );

        if (entryIndex === -1) {
            return `❌ **Update Failed!** Could not find **${item}** on **Floor ${floor} (${location})** to update.`;
        }

        const validFields = ['buy', 'sell', 'buy_count', 'sell_count', 'sub_name', 'sell_item'];
        if (!validFields.includes(field)) {
            return `❌ **Field Error!** \`${field}\` is not a valid field. Use one of these: ${validFields.join(', ')}`;
        }

        if (['buy', 'sell', 'buy_count', 'sell_count'].includes(field)) {
            newValue = parseInt(newValue, 10);
            if (isNaN(newValue)) return `❌ **Update Failed!** Value for \`${field}\` must be a valid number.`;
        }

        marketData[entryIndex][field] = newValue;
        saveMarketData(marketData);

        return `✅ **Successfully Updated Entry!**\n` +
               `• **Item**: ${marketData[entryIndex].item}\n` +
               `• **Location**: Floor ${floor} (${location})\n` +
               `• **Field Changed**: \`${field}\` ➡️ **${newValue}**`;
    }

    // ----------------------------------------------------
    // 🗑️ COMMAND: -delete {floor} {location} {item}
    // ----------------------------------------------------
    if (command === '-delete') {
        const args = trimmedText.match(/(?:[^\s"]+|"[^"]*")+/g).slice(1);

        if (args.length < 3) {
            return `❌ **Usage Error!** Please use the exact format:\n` +
                   `\`-delete <floor> <location> "<item name>"\`\n\n` +
                   `Type \`-admin help\` to see syntax rules and examples.`;
        }

        const floor = parseInt(args[0].replace(/"/g, ''), 10);
        const location = args[1].replace(/"/g, '');
        const item = args[2].replace(/"/g, '');

        const entryIndex = marketData.findIndex(entry => 
            entry.floor === floor && 
            entry.location.toLowerCase() === location.toLowerCase() && 
            entry.item.toLowerCase() === item.toLowerCase()
        );

        if (entryIndex === -1) {
            return `❌ **Delete Failed!** Could not find **${item}** on **Floor ${floor} (${location})** inside the database.`;
        }

        marketData.splice(entryIndex, 1);
        saveMarketData(marketData);

        return `🗑️ **Successfully Deleted Item!**\n` +
               `• **Removed**: ${item} from Floor ${floor} (${location}).`;
    }

    return `❌ **Unknown Admin Command!** Type \`-admin help\` to view all valid administrative operations and formatting syntax.`;
}

module.exports = {
    handleAdminCommand
};