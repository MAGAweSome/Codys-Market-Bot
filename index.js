const { Client, GatewayIntentBits } = require('discord.js');
const marketData = require('./market.json'); 
const { splitMessage } = require('./utils/stringHelper');
const { findExactOrPartialMatches, findCloseMatches } = require('./utils/marketMatcher');
const { handleMarketCommand } = require('./utils/commandHandler');
const { formatMoney, formatItemQuantityName } = require('./utils/stringHelper');
const { handleAdminChatFlow } = require('./utils/admin/adminChatFlow');

const STATUS_CHANNEL_ID = process.env.STATUS_CHANNEL_ID;
const MARKET_CHANNEL_ID = process.env.MARKET_CHANNEL_ID;
const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID;
const ALLOWED_ADMIN_IDS = process.env.ALLOWED_ADMIN_IDS ? process.env.ALLOWED_ADMIN_IDS.split(',') : [];

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

    // 1. ROUTE TO PRIVATE ADMIN CHAT FLOW
    if (message.channel.id === ADMIN_CHANNEL_ID) {
        if (!ALLOWED_ADMIN_IDS.includes(message.author.id)) {
            await message.reply('🛑 **Access Denied:** Your Discord User ID is not authorized to execute database modifications.');
            return;
        }
        // Hand off the message completely to our modular administrative router
        await handleAdminChatFlow(message, marketData);
        return;
    }

    // 2. ROUTE TO MAIN USER MARKET CHANNEL
    if (message.channel.id !== MARKET_CHANNEL_ID) return;

    const commandResponse = handleMarketCommand(message.content, marketData);
    
    if (commandResponse !== null) {
        const responseChunks = splitMessage(commandResponse);
        for (const chunk of responseChunks) {
            await message.channel.send(chunk);
        }
        return;
    }

    // Standard User Lookup Engine
    let userInput = message.content.trim();
    
    // Check if the user is explicitly requesting variants
    const wantsVariants = userInput.toLowerCase().includes('-variant');
    
    // Clean the user input by removing the "-variant" flag if it exists
    if (wantsVariants) {
        userInput = userInput.replace(/-variant/gi, '').replace(/\s+/g, ' ').trim();
    }

    let matches = findExactOrPartialMatches(userInput, marketData);

    // --- EXACT MATCH BYPASS ---
    // Only run the exact match bypass if they DID NOT explicitly ask for variants
    if (!wantsVariants) {
        const exactMatch = matches.find(entry => entry.item.toLowerCase() === userInput.toLowerCase());
        if (exactMatch) {
            matches = [exactMatch]; // Force the search to only contain the single exact match
        }
    }
    // ---------------------------------

    if (matches.length === 1) {
        const foundItem = matches[0];
        
        const buyCount = foundItem.buy_count || 1;
        const baseBuyItem = foundItem.item;
        const formattedBuyItem = formatItemQuantityName(baseBuyItem, buyCount);
        
        const nameWithSub = foundItem.sub_name 
            ? `${formattedBuyItem} (${foundItem.sub_name})` 
            : formattedBuyItem;

        // Check if the item name ends in "s" to decide between "is" or "are"
        const verb = nameWithSub.endsWith('s') || nameWithSub.endsWith(')') && nameWithSub.slice(0, nameWithSub.indexOf(' (')).endsWith('s') ? 'are' : 'is';

        const sellCount = foundItem.sell_count || 1;
        const baseSellItem = foundItem.sell_item || foundItem.item;
        const formattedSellItem = formatItemQuantityName(baseSellItem, sellCount);

        let response = '';

        if (foundItem.sell_item) {
            response = `The **${nameWithSub}** ${verb} on **Floor ${foundItem.floor}** (**${foundItem.location}**), **${buyCount}** can be purchased for **${formatMoney(foundItem.buy)}** or **${sellCount} ${formattedSellItem}** sold for **${formatMoney(foundItem.sell)}**.`;
        } else {
            response = `The **${nameWithSub}** ${verb} on **Floor ${foundItem.floor}** (**${foundItem.location}**), **${buyCount}** can be purchased for **${formatMoney(foundItem.buy)}** or **${sellCount}** sold for **${formatMoney(foundItem.sell)}**.`;
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