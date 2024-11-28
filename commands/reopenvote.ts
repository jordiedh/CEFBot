var SlashArgType = require('discord-api-types/v10').ApplicationCommandOptionType;
var { openVote } = require('../util/voteUtil.js');
var { slashArg, slashCommandJSON } = require('../util/slashUtils.js')
var { dbGet } = require('../util/db.js');

module.exports = {
    name: 'open',
    description: 'Re-open a vote',
    args: [
        slashArg(SlashArgType.Integer, 'id', {
            required: true,
            description: 'The vote ID, found in the channel name, or footer of the vote embed.'
        }),
        slashArg(SlashArgType.Integer, 'days', {
            required: true,
            description: 'The amount of days before it automatically recloses.'
        })
    ],
    getSlashCommandData(guild) { return slashCommandJSON(this, guild) },
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction
     * @returns 
     */
    async slashCommandExecute(interaction) {
        const voteRow = await dbGet(`SELECT * FROM votes WHERE id = ?`, [interaction.options.getInteger("id")]);
        if(!voteRow) {
            return interaction.reply({ content: 'Unable to find a vote with that ID.', ephemeral: true });
        }
        if(voteRow.ended === 0) {
            return interaction.reply({ content: 'This vote is already open.', ephemeral: true });
        }
        if(interaction.options.getInteger("days") < 1 || interaction.options.getInteger("days") > 30) {
            return interaction.reply({ content: 'Days to re-open for must be atleast 1 and less than 30.', ephemeral: true });
        }
        const openResult = await openVote(interaction.options.getInteger("id"), interaction.options.getInteger("days"));
        if(!openResult) return interaction.reply({ content: 'An error occurred opening this vote.', ephemeral: true })
        interaction.reply({ content: "Successfully re-opened vote.", ephemeral: true });
    }
};