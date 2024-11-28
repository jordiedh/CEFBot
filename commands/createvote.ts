import { CategoryChannelResolvable, EmbedBuilder, ChatInputCommandInteraction, ChannelType, ButtonStyle, ActionRowBuilder, ButtonBuilder } from "discord.js";
const SlashArgType = require('discord-api-types/v10').ApplicationCommandOptionType;
const settings = require('../settings.json');
const { slashArg, slashCommandJSON } = require('../util/slashUtils.js')
const { db, dbGet } = require('../util/db.js');

module.exports = {
    name: 'createvote',
    description: 'Create a vote',
    args: [
        slashArg(SlashArgType.String, 'subject', {
            required: true,
            description: 'Subject of the vote'
        }),
        slashArg(SlashArgType.Boolean, 'anonymous', {
            required: true,
            description: 'Whether the way people vote will be public or private'
        }),
        slashArg(SlashArgType.Integer, 'days', {
            required: true,
            description: 'How long the vote will be active for in days'
        }),
        slashArg(SlashArgType.String, 'description', {
            required: false,
            description: 'Any extra information you want to include on the vote. Not required'
        }),
    ],
    getSlashCommandData(guild) { return slashCommandJSON(this, guild) },
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction
     * @returns 
     */
    async slashCommandExecute(interaction) {
        const anonymous = interaction.options.getBoolean("anonymous") ? 1 : 0;
        const title = anonymous === 1 ? `Hidden Vote` : `Visible Vote`;
        const subject = interaction.options.getString("subject");
        const days = interaction.options.getInteger("days");
        const extraDescription = interaction.options.getString("description") ? `\n\`\`\`\n${interaction.options.getString("description")}\n\`\`\`` : "\n";
        if(days < 1 || days > 30) return interaction.reply("Votes must be longer than 0 days and less than 30 days.");
        const voteEnd = Math.floor(Date.now() / 1000) + (86400 * days);
        await db.run(`INSERT INTO votes (subject, anonymous, timeEnd, ended) VALUES (?, ?, ?, ?)`, [subject, anonymous, voteEnd * 1000, 0]);
        const newRow = await dbGet(`SELECT id FROM votes WHERE subject = ? AND anonymous = ? AND timeEnd = ? AND ended = 0`, [subject, anonymous, voteEnd * 1000]);
        const headerCategory = await interaction.guild.channels.cache.get(settings.voteCategory) as CategoryChannelResolvable;
        if(!headerCategory) return interaction.reply("Active Votes category does not exist, please reach out to <@283855082750214144>")
        const voteChannel = await interaction.guild.channels.create({
            name:   newRow.id + "-" + subject.replace(/\W+/g, " ").replace(/\s+/g, '-').trim().toLowerCase(),
            type: ChannelType.GuildText,
            parent: headerCategory
        });

        const yes = new ButtonBuilder()
			.setCustomId('yesVote')
			.setLabel('Yes')
			.setStyle(ButtonStyle.Success);

		const no = new ButtonBuilder()
			.setCustomId('noVote')
			.setLabel('No')
			.setStyle(ButtonStyle.Danger);

		const row = new ActionRowBuilder()
			.addComponents(yes, no);
        const colour = anonymous === 1 ? 0xff7d7d : 0xffffff;
        const embed = new EmbedBuilder()
            .setColor(colour)
            .setTitle(title)
            .setDescription(`The subject of this vote is:\n\`${subject}\`${extraDescription}\nThis vote was initiated by ${interaction.member}\nYou have until <t:${voteEnd}:R> to select your vote.`)
            .setFooter({ text: `Vote ID: ${newRow.id}` });
        const voteMessage = await voteChannel.send({ content: '@everyone', embeds: [embed], components: [row] });
        await db.run(`UPDATE votes SET discordChannelId = ?, voteMessageId = ? WHERE id = ?`, [voteChannel.id, voteMessage.id, newRow.id])
        interaction.reply({ content: "Successfully initated vote.", ephemeral: true });
    }
};