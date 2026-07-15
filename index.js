const { Client, GatewayIntentBits } = require('discord.js');
const marketData = require('./market.json'); 
const { splitMessage } = require('./utils/stringHelper');
const { findExactOrPartialMatches, findCloseMatches } = require('./utils/marketMatcher');
const { handleMarketCommand } = require('./utils/commandHandler');
const { formatMoney, formatItemQuantityName } = require('./utils/stringHelper');

const STATUS_CHANNEL_ID = process.env.STATUS_CHANNEL_ID;
const MARKET_CHANNEL_ID = process.env.MARKET_CHANNEL_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}! Market bot is online.`);
    try {
        const channel = await client.channels.fetch(STATUS_CHANNEL_ID);
        if (channel) {
            await channel.send('🟢 **Codys Market Bot** is now **ONLINE** and watching the market.');
        }
    } catch (error) {
        console.error('Failed to send online message:', error);
    }
});

process.on('SIGINT', async () => {
    console.log('Shutting down bot...');
    try {
        const channel = await client.channels.fetch(STATUS_CHANNEL_ID);
        if (channel) {
            await channel.send('🛑 **Codys Market Bot** process was manually stopped (Offline).');
        }
    } catch (error) {
        console.error('Failed to send offline message:', error);
    } finally {
        process.exit(0);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== MARKET_CHANNEL_ID) return;

    // STEP 1: Route the message text through our command handler module.
    const commandResponse = handleMarketCommand(message.content, marketData);
    
    // If the module returned a response text block, safely split and send it.
    if (commandResponse !== null) {
        // Automatically slice the response into safe 1900-character blocks.
        const responseChunks = splitMessage(commandResponse);

        // Send each individual chunk sequentially into the channel.
        for (const chunk of responseChunks) {
            await message.channel.send(chunk);
        }
        return;
    }

    // STEP 2: Standard Lookup Engine (Runs if no command prefix was triggered)
    const userInput = message.content.trim();
    const matches = findExactOrPartialMatches(userInput, marketData);

    if (matches.length === 1) {
        const foundItem = matches[0];
        
        // 1. Format the main item name based on its buy count
        const baseBuyItem = foundItem.item;
        const formattedBuyItem = formatItemQuantityName(baseBuyItem, foundItem.buy_count || 1);
        const nameWithSub = foundItem.sub_name 
            ? `${formattedBuyItem} (${foundItem.sub_name})` 
            : formattedBuyItem;

        // 2. Format the sell item name based on its sell count
        const baseSellItem = foundItem.sell_item || foundItem.item;
        const formattedSellItem = formatItemQuantityName(baseSellItem, foundItem.sell_count || 1);

        let response = '';

        // Check if there is a distinct sell item name configured
        if (foundItem.sell_item) {
            response = `The **${nameWithSub}** is on the **${foundItem.floor} floor** (**${foundItem.location}**), this can be purchased for **${formatMoney(foundItem.buy)}** or **${formattedSellItem}** sold for **${formatMoney(foundItem.sell)}**.`;
        } else {
            response = `The **${nameWithSub}** is on the **${foundItem.floor} floor** (**${foundItem.location}**), this can be purchased for **${formatMoney(foundItem.buy)}** or sold for **${formatMoney(foundItem.sell)}**.`;
        }

        await message.reply(response);
        return;
    }

    if (matches.length > 1) {
        const matchListText = matches.map(entry => `• **${entry.item}** (Floor ${entry.floor})`).join('\n');
        await message.reply(`🔍 I found multiple items matching your search for "**${message.content}**":\n\n${matchListText}\n\nPlease re-type your request with the exact name of the item you want!`);
        return;
    }

    const suggestions = findCloseMatches(userInput, marketData);

    if (suggestions.length > 0) {
        const suggestionText = suggestions.map(item => `• **${item}**`).join('\n');
        await message.reply(`❌ Sorry, I couldn't find an exact match for "**${message.content}**". \n\nDid you mean?\n${suggestionText}`);
    } else {
        await message.reply(`❌ Sorry, I couldn't find "**${message.content}**" in the market list. Make sure it's spelled correctly!`);
    }
});

client.login(process.env.DISCORD_TOKEN);