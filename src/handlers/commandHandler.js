const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  client.commands = new Collection();
  const commandsPath = path.join(__dirname, '../commands');

  function loadCommands(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        loadCommands(fullPath);
      } else if (entry.name.endsWith('.js')) {
        const command = require(fullPath);
        if (command.data && command.execute) {
          client.commands.set(command.data.name, command);
          console.log(`[ბრძანება] ჩაიტვირთა: /${command.data.name}`);
        }
      }
    }
  }

  loadCommands(commandsPath);
};
