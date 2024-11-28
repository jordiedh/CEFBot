var SlashArgType = require('discord-api-types/v10').ApplicationCommandOptionType;
var { generateSpreadsheet } = require('../util/voteUtil.js');
var { slashArg, slashCommandJSON } = require('../util/slashUtils.js')
var { dbGet } = require('../util/db.js');

module.exports = {
    name: 'results',
    description: 'Get results of a vote',
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
        const voteRow = await dbGet(`SELECT * FROM votes WHERE id = ?`, [interaction.options.getInteger("id")]);
        if(!voteRow) {
            return interaction.reply({ content: 'Unable to find a vote with that ID.', ephemeral: true });
        }
        const result = await generateSpreadsheet(voteRow.id);
        if(result === 'anonymous') {
            return interaction.reply({ content: 'Cannot retrieve results for a hidden vote.', ephemeral: true });
        } else if(result === null) {
            return interaction.reply({ content: 'Error generating spreadsheet.', ephemeral: true });
        }
        interaction.reply({ content: "Generated spreadsheet!", ephemeral: true, files: [`./results/${result}`] });
    }
};