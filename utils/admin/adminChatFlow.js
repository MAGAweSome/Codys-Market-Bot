const { saveMarketData, formatItemDetails } = require('../adminSession');

// Object to keep track of active back-and-forth admin conversations
const adminSessions = {};

// 5 minutes in milliseconds (5 * 60 * 1000)
const SESSION_TIMEOUT_MS = 300000;

/**
 * Sets or resets the inactivity timer for an admin user session
 */
function resetSessionTimer(userId, message, actionName) {
    // If a timer already exists for this user, clear it first
    if (adminSessions[userId] && adminSessions[userId].timerId) {
        clearTimeout(adminSessions[userId].timerId);
    }

    // Start a new 5-minute timeout
    const timerId = setTimeout(async () => {
        if (adminSessions[userId]) {
            delete adminSessions[userId];
            try {
                await message.reply(`⏰ **Session Timeout:** Your active **${actionName}** session has expired due to 5 minutes of inactivity. Operation cancelled.`);
            } catch (err) {
                console.error('Failed to send timeout notification message:', err);
            }
        }
    }, SESSION_TIMEOUT_MS);

    // Save the timer ID to the active session profile
    if (adminSessions[userId]) {
        adminSessions[userId].timerId = timerId;
    }
}

async function handleAdminChatFlow(message, marketData) {
    const userId = message.author.id;
    const text = message.content.trim();
    const lowerText = text.toLowerCase();

    // Let users reset or cancel at any time
    if (lowerText === 'cancel') {
        if (adminSessions[userId]) {
            // Make sure to clean up the running timeout before deleting the session
            if (adminSessions[userId].timerId) {
                clearTimeout(adminSessions[userId].timerId);
            }
            delete adminSessions[userId];
            await message.reply('❌ **Operation cancelled.** Admin session cleared.');
        } else {
            await message.reply('There are no active sessions to cancel.');
        }
        return;
    }

    // Initialize commands
    if (!adminSessions[userId]) {
        if (lowerText === '-add') {
            adminSessions[userId] = { action: 'add', step: 'floor', data: {} };
            resetSessionTimer(userId, message, 'Add');
            await message.reply('🧱 **Starting Add Session**\nWhat **floor** (number) is this item located on? (Type `cancel` to exit)');
            return;
        }

        if (lowerText === '-update') {
            adminSessions[userId] = { action: 'update', step: 'find_floor', data: {} };
            resetSessionTimer(userId, message, 'Update');
            await message.reply('✏️ **Starting Update Session**\nWhat **floor** (number) is the item on currently?');
            return;
        }

        if (lowerText === '-delete') {
            adminSessions[userId] = { action: 'delete', step: 'find_floor', data: {} };
            resetSessionTimer(userId, message, 'Delete');
            await message.reply('🗑️ **Starting Delete Session**\nWhat **floor** (number) is the item on currently?');
            return;
        }

        if (lowerText === '-admin help') {
            await message.reply(
                `## 🛠️ Codys Market Bot: Admin Directory\n` +
                `You can manage the market list conversationally without formatting rules or quotes!\n\n` +
                `• **\`-add\`** — Triggers a step-by-step interview to build and save a new market listing.\n` +
                `• **\`-update\`** — Find any item, view its current values, and selectively edit properties.\n` +
                `• **\`-delete\`** — Find any item, confirm its properties, and permanently erase it.\n` +
                `• **\`cancel\`** — Can be typed during *any* prompt to instantly discard session changes.\n\n` +
                `⏱️ *Note: If you do not reply to a prompt within 5 minutes, the active session will automatically cancel.*`
            );
            return;
        }

        await message.reply('❌ **Unknown command.** Type `-admin help` to see available options, or use `-add`, `-update`, or `-delete`.');
        return;
    }

    // Handle Active Session back-and-forth
    const session = adminSessions[userId];

    // Refresh our 5-minute inactivity countdown because they replied
    resetSessionTimer(userId, message, session.action.toUpperCase());

    // ----------------------------------------------------
    // Interactive [-add] Session
    // ----------------------------------------------------
    if (session.action === 'add') {
        if (session.step === 'floor') {
            const floor = parseInt(text, 10);
            if (isNaN(floor)) return message.reply('❌ Please enter a valid number for the floor level.');
            session.data.floor = floor;
            session.step = 'location';
            return message.reply('What **location / Door number** is this stall on? (e.g., `Door 5` or `Stall A`)');
        }

        if (session.step === 'location') {
            session.data.location = text;
            session.step = 'buy_count';
            return message.reply('What is the **buy count**? (This is how many they get when purchasing, e.g., `64` or `16`)');
        }

        if (session.step === 'buy_count') {
            const count = parseInt(text, 10);
            if (isNaN(count)) return message.reply('❌ Please enter a valid number for the buy count.');
            session.data.buy_count = count;
            session.step = 'item';
            return message.reply('What is the **item name**?');
        }

        if (session.step === 'item') {
            session.data.item = text;
            session.step = 'buy';
            return message.reply(`What is the **buy price** for **${session.data.buy_count}** of this item? (Use \`0\` if it is not purchasable)`);
        }

        if (session.step === 'buy') {
            const buyPrice = parseInt(text, 10);
            if (isNaN(buyPrice)) return message.reply('❌ Please enter a valid number for the buy price.');
            session.data.buy = buyPrice;
            session.step = 'sell_item';
            return message.reply('What is the **sell item name**? (Type `N/A` if it is the same as the main item name)');
        }

        if (session.step === 'sell_item') {
            if (lowerText !== 'n/a') {
                session.data.sell_item = text;
            }
            session.step = 'sell_count';
            return message.reply('What is the **sell count**? (This is how many they trade back, e.g., `1` or `16`)');
        }

        if (session.step === 'sell_count') {
            const count = parseInt(text, 10);
            if (isNaN(count)) return message.reply('❌ Please enter a valid number for the sell count.');
            session.data.sell_count = count;
            session.step = 'sell';
            return message.reply(`What is the **sell price** for **${count}** of this item? (Use \`0\` if it cannot be sold back)`);
        }

        if (session.step === 'sell') {
            const sellPrice = parseInt(text, 10);
            if (isNaN(sellPrice)) return message.reply('❌ Please enter a valid number for the sell price.');
            session.data.sell = sellPrice;
            session.step = 'sub_name';
            return message.reply('What is the **sub_name**? (e.g. `Notch Apple`. Type `N/A` to skip)');
        }

        if (session.step === 'sub_name') {
            if (lowerText !== 'n/a') {
                session.data.sub_name = text;
            }

            const exists = marketData.some(entry => 
                entry.floor === session.data.floor && 
                entry.location.toLowerCase() === session.data.location.toLowerCase() && 
                entry.item.toLowerCase() === session.data.item.toLowerCase()
            );

            // Clean up the active timeout before finishing and deleting session object
            if (session.timerId) clearTimeout(session.timerId);

            if (exists) {
                delete adminSessions[userId];
                return message.reply(`❌ **Add Session Aborted!** An item named **${session.data.item}** already exists on **Floor ${session.data.floor} (${session.data.location})**.`);
            }

            marketData.push(session.data);
            saveMarketData(marketData);
            delete adminSessions[userId];

            return message.reply(`✅ **Item Added Successfully!**\n\n${formatItemDetails(session.data)}`);
        }
    }

    // ----------------------------------------------------
    // Interactive [-update] Session
    // ----------------------------------------------------
    if (session.action === 'update') {
        if (session.step === 'find_floor') {
            const floor = parseInt(text, 10);
            if (isNaN(floor)) return message.reply('❌ Please enter a valid number for the floor level.');
            session.data.floor = floor;
            session.step = 'find_location';
            return message.reply('What **location / Door number** is the item at? (e.g., `Door 4`)');
        }

        if (session.step === 'find_location') {
            session.data.location = text;
            session.step = 'find_item';
            return message.reply('What is the **item name** you want to update?');
        }

        if (session.step === 'find_item') {
            const itemIndex = marketData.findIndex(entry => 
                entry.floor === session.data.floor && 
                entry.location.toLowerCase() === session.data.location.toLowerCase() && 
                entry.item.toLowerCase() === text.toLowerCase()
            );

            if (itemIndex === -1) {
                if (session.timerId) clearTimeout(session.timerId);
                delete adminSessions[userId];
                return message.reply(`❌ **Search Failed!** Could not find an entry for **${text}** on Floor ${session.data.floor} (${session.data.location}). Session cleared.`);
            }

            session.targetIndex = itemIndex;
            session.step = 'confirm_item';

            return message.reply(
                `Is this the item you would like to edit?\n\n` +
                `> ${formatItemDetails(marketData[itemIndex])}\n\n` +
                `Type **\`yes\`** to continue, or **\`cancel\`** to abort.`
            );
        }

        if (session.step === 'confirm_item') {
            if (lowerText !== 'yes') return message.reply('Please reply with **`yes`** to edit, or **`cancel`** to exit.');
            
            session.step = 'choose_field';
            return message.reply(
                `Which parameter would you like to edit? Reply with the exact field name from this list:\n` +
                `\`floor\`, \`location\`, \`buy_count\`, \`item\`, \`buy\`, \`sell_count\`, \`sell_item\`, \`sell\`, \`sub_name\``
            );
        }

        if (session.step === 'choose_field') {
            const validFields = ['floor', 'location', 'buy_count', 'item', 'buy', 'sell_count', 'sell_item', 'sell', 'sub_name'];
            const targetField = text.toLowerCase();

            if (!validFields.includes(targetField)) {
                return message.reply(`❌ **Invalid choice!** Choose one of these options: \`${validFields.join(', ')}\``);
            }

            session.editingField = targetField;
            session.step = 'get_new_value';

            const targetItem = marketData[session.targetIndex];
            const currentValue = targetItem[targetField] !== undefined ? targetItem[targetField] : 'N/A';
            return message.reply(`The current value for \`${targetField}\` is **\`${currentValue}\`**.\nWhat is the new value? (Type \`N/A\` to clear sub_name or sell_item)`);
        }

        if (session.step === 'get_new_value') {
            const targetField = session.editingField;
            let newValue = text;

            if (lowerText === 'n/a' && (targetField === 'sub_name' || targetField === 'sell_item')) {
                newValue = undefined;
            } else if (['floor', 'buy', 'sell', 'buy_count', 'sell_count'].includes(targetField)) {
                newValue = parseInt(text, 10);
                if (isNaN(newValue)) return message.reply(`❌ Please provide a valid number for \`${targetField}\`.`);
            }

            if (newValue === undefined) {
                delete marketData[session.targetIndex][targetField];
            } else {
                marketData[session.targetIndex][targetField] = newValue;
            }

            session.step = 'session_resolution';
            return message.reply(
                `✏️ **Value saved in memory!** New status:\n` +
                `> ${formatItemDetails(marketData[session.targetIndex])}\n\n` +
                `What would you like to do now? Reply with **\`save\`** to write these changes to file, **\`edit\`** to change another field on this item, or **\`cancel\`** to roll back changes.`
            );
        }

        if (session.step === 'session_resolution') {
            if (lowerText === 'save') {
                if (session.timerId) clearTimeout(session.timerId);
                saveMarketData(marketData);
                delete adminSessions[userId];
                return message.reply('💾 **Database updated successfully!** Changes written permanently.');
            }

            if (lowerText === 'edit') {
                session.step = 'choose_field';
                return message.reply(
                    `Which parameter would you like to edit next? Choose from this list:\n` +
                    `\`floor\`, \`location\`, \`buy_count\`, \`item\`, \`buy\`, \`sell_count\`, \`sell_item\`, \`sell\`, \`sub_name\``
                );
            }

            return message.reply('Please answer with **\`save\`**, **\`edit\`**, or **\`cancel\`**.');
        }
    }

    // ----------------------------------------------------
    // Interactive [-delete] Session
    // ----------------------------------------------------
    if (session.action === 'delete') {
        if (session.step === 'find_floor') {
            const floor = parseInt(text, 10);
            if (isNaN(floor)) return message.reply('❌ Please enter a valid number for the floor level.');
            session.data.floor = floor;
            session.step = 'find_location';
            return message.reply('What **location / Door number** is the item at? (e.g., `Door 4`)');
        }

        if (session.step === 'find_location') {
            session.data.location = text;
            session.step = 'find_item';
            return message.reply('What is the **item name** you want to delete?');
        }

        if (session.step === 'find_item') {
            const itemIndex = marketData.findIndex(entry => 
                entry.floor === session.data.floor && 
                entry.location.toLowerCase() === session.data.location.toLowerCase() && 
                entry.item.toLowerCase() === text.toLowerCase()
            );

            if (itemIndex === -1) {
                if (session.timerId) clearTimeout(session.timerId);
                delete adminSessions[userId];
                return message.reply(`❌ **Search Failed!** Could not find an entry for **${text}** on Floor ${session.data.floor} (${session.data.location}). Session cleared.`);
            }

            session.targetIndex = itemIndex;
            session.step = 'confirm_deletion';

            return message.reply(
                `🛑 **CRITICAL CONFIRMATION**\nAre you absolutely sure you want to delete this item?\n\n` +
                `> ${formatItemDetails(marketData[itemIndex])}\n\n` +
                `Type **\`delete\`** to permanently destroy it, or **\`cancel\`** to quit.`
            );
        }

        if (session.step === 'confirm_deletion') {
            if (lowerText === 'delete') {
                if (session.timerId) clearTimeout(session.timerId);
                const deletedItem = marketData.splice(session.targetIndex, 1)[0];
                saveMarketData(marketData);
                delete adminSessions[userId];
                return message.reply(`🗑️ **Successfully Deleted!** **${deletedItem.item}** has been wiped from the database.`);
            }
            return message.reply('Please reply with **`delete`** to confirm deletion, or **`cancel`** to exit safely.');
        }
    }
}

module.exports = {
    handleAdminChatFlow
};