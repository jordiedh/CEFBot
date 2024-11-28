const Discord = require('discord.js');
const SlashArgType = require('discord-api-types/v10').ApplicationCommandOptionType;
const settings = require('../settings.json');
const { slashArg, slashCommandJSON } = require('../util/slashUtils.js')

module.exports = {
    name: 'help',
    description: 'Gives list of commands available or the specifics of a command',
    args: [
        slashArg(SlashArgType.String, 'command', {
            required: false,
            description: 'Command to view help for'
        }),
    ],
    getSlashCommandData(guild) { return slashCommandJSON(this, guild) },
    /**
     * 
     * @param {Discord.Message} message 
     * @param {*} args 
     * @param {*} bot 
     * @returns 
     */
    slashCommandExecute(message, args, bot) {
        message.reply("test");
    }
};