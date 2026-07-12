# 🛒 Codys Market Bot

A highly optimized, modular Discord bot engineered to manage, search, and audit complex in-game marketplace economies. Built natively with Node.js and `discord.js` v14, the engine features high-performance, local string-matching algorithms, dynamic character-limit chunking, and multi-variable command filtering.

---

## 🏢 Features

*   **Smart Item Lookup:** Instantly resolves floor and door locations for items. Automatically handles plural terms and cross-references multi-word searches (e.g., typing `diamond armor` correctly prompts choice lists for horse vs. nautilus variants).
*   **Zero-Cost Typo Correction:** Implements a strict, localized Levenshtein Edit Distance calculation engine to deliver fast "Did you mean?" spelling corrections without relying on external, paid API agents or credits.
*   **Location-Based Grouping:** Generates naturally sorted, chronologically ordered directories sorted by individual stall doors or floor tiers automatically.
*   **Automatic Chunk Splitting:** Overcomes Discord's strict 2,000-character payload limitation by parsing heavy search payloads line-by-line into consecutive chunks under 1,900 characters.
*   **Safe Environmental Secrets:** Decouples internal logic from highly sensitive API credentials and Discord gateways using modern local environmental configuration files (`.env`).

---

## 🛠️ Project Architecture

The bot is designed with absolute simplicity and separation of concerns in mind, separating data files, core connection events, and algorithmic logic into distinct, isolated modules:

minecraft-market-bot/
├── node_modules/          # Installed dependencies via npm
├── utils/                 # Utility processing core
│   ├── commandHandler.js  # RegEx string parsing and command routing
│   ├── marketMatcher.js   # Fuzzy-spelling matching engine
│   └── stringHelper.js    # Data tokenization, edit distance, & chunking
├── .env                   # Local hidden environmental variables
├── .gitignore             # Tells git which files to completely ignore
├── index.js               # Entry point & Discord client event router
├── install.bat            # Automated one-click installer script for Windows
├── market.json            # Structured marketplace data file
├── package-lock.json      # Exact dependency tree configuration
└── package.json           # Project manifest scripts & versioning

---

## 🚀 Non-Programmer Setup & Installation Guide

Follow these simplified, step-by-step instructions to get the bot running on your computer from scratch.

### Step 1: Install the Required Software

Before running the bot, your computer needs a free background environment called Node.js to read the code.

1. Go to the official website: https://nodejs.org/
2. Click the large button labeled **LTS (Long Term Support)** to download the installer for your system.
3. Open the downloaded file and click **Next** through all the setup prompts. Leave all checkboxes at their default settings and click **Finish**.
4. Restart your computer after the installation completes to ensure everything saves properly.

### Step 2: Download the Bot Code

Choose ONE of the two methods below to get the files onto your computer:

#### Method A: Download via Web Browser (Easiest for Non-Programmers)
1. Go to the top of this GitHub repository page: https://github.com/MAGAweSome/Codys-Market-Bot
2. Click the green **Code** button located on the right side.
3. Click **Download ZIP** from the drop-down menu.
4. Extract (unzip) the downloaded folder to an easy-to-find spot on your computer, like your Desktop or Documents folder.

#### Method B: Download via Terminal (For Advanced Users / Git Installed)
1. Open your terminal or Command Prompt.
2. Navigate to where you want to save the project folder (e.g., `cd Desktop`).
3. Run the clone command exactly as shown:
   git clone https://github.com/MAGAweSome/Codys-Market-Bot
4. Move inside the newly created directory:
   cd Codys-Market-Bot

### Step 3: One-Click Dependency Installer

To prevent you from having to type code or open a terminal workspace to install project packages, a custom automation file is bundled in the folder.

1. Open your extracted `minecraft-market-bot` folder.
2. Look for a file named **`install.bat`**.
3. Double-click **`install.bat`** to run it.
4. A black screen will pop up and automatically fetch all background files required for the bot (like `discord.js`). Once the script says it is finished, press any key on your keyboard to close the window.

> 💡 *Note for advanced users: If you prefer using a terminal, you can simply open your command prompt inside the folder and type `npm install` instead.*

### Step 4: Add Your Private Secrets

1. Inside your project folder, create a brand new plain text document and name it exactly: `.env`
   *(Make sure there is a dot at the beginning and no `.txt` extensions at the end).*
2. Open the `.env` file using Notepad.
3. Copy and paste the exact lines below into the file, replacing the placeholder words with your real Discord bot settings:

DISCORD_TOKEN=your_secret_discord_bot_token_here
STATUS_CHANNEL_ID=your_status_channel_numeric_id
MARKET_CHANNEL_ID=your_active_market_channel_numeric_id

4. Save the file and close Notepad.

⚠️ **Security Warning:** Never share your `.env` file or upload it online. Keep this file completely private on your home computer.

### Step 5: Start the Bot

1. Click on the address bar at the top of your file window where your bot folder is open, type **`cmd`**, and press **Enter**. This opens a command window pinned directly to your folder.
2. Type the following command exactly as shown and press **Enter**:
   node --env-file=.env index.js
3. Keep this black window open! As long as this window is open, your market bot will stay online in your Discord server. To turn the bot off, simply close the window or press `Ctrl + C`.

---

## 📖 How to Use the Bot

Once the process starts up, the bot will post a green online status notice into your configured status logs channel. Go to your active marketplace channel to start querying.

### Direct Item Lookup

Type any item name straight into the chat with zero prefixes or additional formatting parameters:
*   cobblestone — Displays location or opens a structural selection directory if multiple variants exist.
*   diamond armor — Identifies matching items and displays pricing entries instantly.

### Command Filters

Prefix your messages with a hyphen (-) to access advanced indexing filters:
*   -help — Displays a complete interactive command menu block detailing operational syntax examples.
*   -find <item> — Lists all matching items alongside their locations and full trade values.
*   -buyable <item> — Confirms if an item can be bought from a stall and displays its price.
*   -sellable <item> — Lists items the shop accepts for selling back to earn money.
*   -floor <number> — Generates a markdown directory of all items mapped across that entire floor tier, neatly sorted by individual stall door headings.
*   -door <number> — Pulls items occupying a specific door index throughout all floors, segmented sequentially by level numbers. Can also be chained together like -floor 2 -door 5.
*   -topbuy [elements] — Displays the top 5 most expensive non-element items. Add elements to the end to see the top 10 items including raw financial conversion currencies.
*   -topsell [elements] — Displays the top 5 highest-paying non-element items to sell. Add elements to the end to see the top 10 items including raw financial conversion currencies.
*   -cheapbuy — Displays the top 5 lowest cost budget building blocks you can buy.
*   -summary <category> — Groups matching items to calculate price trends and database averages.
*   -stats — Shows a total summary metric of the market data configuration.