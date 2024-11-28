const { Collection } = require('discord.js');
const { readdirSync } = require('fs');
const commands = new Collection();

module.exports = {
    commands,
    load() {
        console.log('Loading commands...');
        const files = readdirSync('./build/commands').filter(file => file.endsWith('.js'));
        for (const file of files) {
            try {
                console.log(`Loading command ${file}`);
                const command = require(`../commands/${file}`);
                commands.set(command.name, command);
            } catch (error) {
                console.log(`Failed to load command ${file}`);
            }
        }
        console.log(`Loaded ${commands.size} commands...`);
    }
};
