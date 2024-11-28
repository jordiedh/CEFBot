var SlashArgType = require('discord-api-types/v10').ApplicationCommandOptionType;
var { closeVote } = require('../util/voteUtil.js');
var { slashArg, slashCommandJSON } = require('../util/slashUtils.js')
var { dbGet } = require('../util/db.js');

module.exports = {
    name: 'close',
    description: 'Close a vote',
    args: [
        slashArg(SlashArgType.Integer, 'id', {
            required: true,
            description: 'The vote ID, found in the channel name, or footer of the vote embed.'
        })
    ],
    getSlashCommandData(guild) { return slashCommandJSON(this, guild) },
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction
     * @returns 
     */
    async slashCommandExecute(interaction) {
        await interaction.reply({ content: 'Closing vote..', ephemeral: true });
        const voteRow = await dbGet(`SELECT * FROM votes WHERE id = ?`, [interaction.options.getInteger("id")]);
        if(!voteRow) {
            return interaction.editReply({ content: 'Unable to find a vote with that ID.', ephemeral: true });
        }
        if(voteRow.ended === 1) {
            return interaction.editReply({ content: 'This vote is already closed.', ephemeral: true });
        }
        const closeResult = await closeVote(interaction.options.getInteger("id"));
        if(!closeResult) return interaction.editReply({ content: 'An error occurred closing this vote.', ephemeral: true })
        interaction.editReply({ content: "Successfully closed vote.", ephemeral: true });
    }
};