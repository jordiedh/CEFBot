const Discord = require('discord.js');
const schedule = require('node-schedule');
const { bot } = require('./botMeta')
const settings = require('./settings.json');
const botSetup = require('./util/botSetup');
const { MessageManager } = require('./util/messageManager.js');
const { Logger } = require('./util/logger.js');
var { db, dbAll, dbGet } = require('./util/db.js');
var { declareVote, closeVote, checkVotes } = require('./util/voteUtil.js');
require('./util/commands.js').load();

bot.on('ready', async () => {
    console.log(`Bot loaded: ${bot.user.username}`);
    bot.user.setActivity('Powering the CEF workspace!');
    const developer = bot.users.cache.get(settings.developerId);
    developer.send('Bot loaded.');
	const guild = bot.guilds.cache.get(settings.guildId);

    await botSetup.deployCommands(bot, guild);
    await checkVotes();
    setInterval(function() {
        checkVotes();
    }, 5 * 60 * 1000);
});

bot.on(Discord.Events.Error, async error => {
		new Logger('Console Error').error({ error });
});

const messageManager = new MessageManager(bot);

bot.on('interactionCreate', async (interaction) => {

    // Triggers when an option is selected in context menu, before a command is run
    if (interaction.isAutocomplete()) return await messageManager.handleAutocomplete(interaction);

    // Validate the interaction is a command
    if (interaction.isChatInputCommand()) return await messageManager.handleCommand(interaction);
    if (interaction.isUserContextMenuCommand()) return await messageManager.handleCommand(interaction);
    if (interaction.isButton()) {
        const channel = interaction.channel;
        const voteRow = await dbGet('SELECT id, timeEnd, ended FROM votes WHERE discordChannelId = ?', [channel.id]);
        if(!voteRow) return interaction.reply({ content: 'There is no database record of this vote, please contact <@283855082750214144>', ephemeral: true})
        if(voteRow.ended) return interaction.reply({ content: 'This vote has commenced, you shouldn\'t be able to press this, please contact <@283855082750214144>', ephemeral: true})
        if(Date.now() > voteRow.timeEnd) {
            const closeResult = await closeVote(voteRow.id);
            if(closeResult) return interaction.reply({ content: 'This vote has commenced, you shouldn\'t be able to press this, maybe you caught it in the short period of time before I checked to see if the vote should end yet.', ephemeral: true});
            else return interaction.reply({ content: 'This vote has commenced, I tried to close this vote but wasn\`t able to, please contact <@283855082750214144>', ephemeral: true });
        }
        const buttonName = interaction.customId;
        const vote = buttonName === 'yesVote' ? true : buttonName === 'noVote' ? false : null;
        const voteString = vote ? "yes" : "no";
        if(vote === null) return interaction.reply({ content: 'I\'m not quite sure what you\'re pressing, please contact <@283855082750214144>', ephemeral: true})
        const userVoteRow = await dbGet('SELECT * FROM votesPlaced WHERE voteId = ? AND discordId = ?', [voteRow.id, interaction.user.id]);
        if(userVoteRow) {
            if((userVoteRow.yesNo === 1 && vote) || (userVoteRow.yesNo === 0 && !vote)) {
                return interaction.reply({ content: `You've already voted ${voteString} on this vote.`, ephemeral: true})
            } else {
                await declareVote(voteRow.id, interaction.user.id, interaction.user.username, interaction.member.displayName, vote, true);
                return interaction.reply({ content: `Your vote has been changed to ${voteString}`, ephemeral: true})
            }
        }
        await declareVote(voteRow.id, interaction.user.id, interaction.user.username, interaction.member.displayName, vote, false);
        return interaction.reply({ content: `You have voted ${voteString} on this vote.`, ephemeral: true})
    }
});

bot.login(settings.token);