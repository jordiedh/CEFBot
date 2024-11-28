const Discord = require('discord.js');
const { Logger } =  require('./logger');
import * as botSettings from '../settings.json';

// Commands
const { commands } = require('./commands.js');

export async function deployCommands(bot, guild) {
    const logger = new Logger('Command Deployment');
    // Organize commands
    const slashCommands = commands.filter(c => c.getSlashCommandData)
        .map(c => c.getSlashCommandData(guild))
        .filter(c => c)
        .flat();

    // Deploy commands
    const rest = new Discord.REST({ version: '10' }).setToken(botSettings.token);
    try {
        logger.info({ message: `Deploying ${slashCommands.length} slash commands`, guild });
        await rest.put(Discord.Routes.applicationGuildCommands(bot.user.id, guild.id), { body: slashCommands });
        logger.info({ message: `Deployed ${slashCommands.length} slash commands`, guild });
    } catch (error) {
        logger.error({ error, message: 'Error deploying slash commands', guild });
    }
}

module.exports = { deployCommands };
