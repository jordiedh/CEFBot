const Discord = require('discord.js');
const SlashArgType = require('discord-api-types/v10').ApplicationCommandOptionType;

const { Logger } = require('./logger');
const logger = new Logger('Message Manager');

const { commands } = require('./commands');
const settings = require('../settings.json');

class MessageManager {
    /** @type {Discord.Client} */
    #bot;
    #cooldowns = new Discord.Collection();

    constructor(bot) {
        logger.info({ message: 'Initializing Message Manager...' });
        this.#bot = bot
    }

    /**
     * Checks to see if a user has permission to use a command in a server
     * @param {Discord.GuildMember} member
     * @returns {Boolean}
     */
    commandPermitted(member) {
        return (member.roles.cache.has(settings.voteCreatorRole) || settings.developerId === member.id);
    }

    async handleAutocomplete(interaction) {
        const command = commands.get(interaction.commandName) || commands.find(cmd => cmd.alias && cmd.alias.includes(interaction.commandName))
        if (command.autocomplete) command.autocomplete(interaction, this.#bot);
    }

    /**
     * Get arguments for an interaction
     * @param {Discord.ChatInputCommandInteraction|Discord.ContextMenuCommandInteraction} interaction
     * @returns
     */
    async getArgs(interaction) {
        return interaction.options.data.map((opt) => {
            if (opt.type == SlashArgType.Subcommand) {
                return [opt.name, ...opt.options.map((opt) => opt.value)]
            }
            return opt.value
        }).flat()
    }

    /**
     * Runs the command processing pipeline including parsing, state checks, permissions checks, etc.
     * @param {Discord.ChatInputCommandInteraction|Discord.ContextMenuCommandInteraction} interaction
     * @returns
     */
    async handleCommand(interaction) {

        let commandName = interaction.commandName;
        let args = this.getArgs(interaction);
        let argCount = interaction.options.data.length;

        // Get the command
        const command = commands.get(commandName) || commands.find(cmd => cmd.alias && cmd.alias.includes(commandName))
        // Handle logging and replying to command errors
        async function commandError(userMsg, logMsg) {
            if (userMsg) await interaction.reply(userMsg)
        }

        try {
            if (!command) return await commandError('Command doesnt exist, check `/help` and try again', 'does not exist');
            const member = await interaction.guild.members.cache.get(interaction.user.id);
            logger.debug({ message: `${member} (${member.id}) attempting to run [${interaction.toString()}]`, command: interaction, guild: interaction.guild});

            if (!this.commandPermitted(member)) return await commandError('You do not have permission to use this command', 'no permission')

            if (command.requiredArgs && command.requiredArgs > argCount) return await commandError(`Command entered incorrectly.`)
            
            command.slashCommandExecute(interaction, this.#bot)
            
            logger.info({ message: `${member.displayName} (${member.id}) ran [${interaction.toString()}]`, command: interaction, guild: interaction.guild});
        } catch (error) {
            logger.error({ error, guild: interaction.guild, command: interaction, message: `Command: ${command.name}` })
            if (!interaction.replied) interaction.reply('Issue executing the command, check `;commands` and try again');
            else interaction.followUp('Issue executing the command, check `;commands` and try again');
        }
    }
}

module.exports = { MessageManager };
