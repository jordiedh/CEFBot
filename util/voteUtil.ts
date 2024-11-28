import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const { db, dbGet, dbAll} = require('./db.js');
const { bot } = require('../botMeta.js');
const settings = require('../settings.json');
const { Logger } = require('./logger.js');
const voteLogger = new Logger('Vote Error')
const xl = require('excel4node');
const delay = ms => new Promise(res => setTimeout(res, ms));

export async function declareVote(voteId: number, userId: number, username: string, displayName: string, decision: boolean, alreadyVoted: boolean): Promise<void> {
    const decisionInt = decision ? 1 : 0;
    const query = alreadyVoted ? 'UPDATE votesPlaced SET yesNo = ?, username = ?, displayName = ? WHERE voteId = ? AND discordId = ?' : `INSERT INTO votesPlaced (yesNo, username, displayName, voteId, discordId) VALUES (?, ?, ?, ?, ?)`
    await db.run(query, [decisionInt, username, displayName, voteId, userId]);
    return;
}

export async function closeVote(voteId: number): Promise<boolean> {
    const voteRow = await dbGet(`SELECT * FROM votes WHERE id = ?`, [voteId]);
    if(!voteRow) {
        voteLogger.error({ message: 'Vote row not found trying to close vote.' });
        return false;
    }
    const cefGuild = await bot.guilds.cache.get(settings.guildId);
    if(!cefGuild) {
        voteLogger.error({ message: 'CEF guild not found trying to close vote.' });
        return false;
    }
    
    const voteChannel = await cefGuild.channels.cache.get(voteRow.discordChannelId);
    if(!voteChannel) {
        voteLogger.error({ message: 'Vote channel not found trying to close vote.' });
        return false;
    }
    voteChannel.setParent(settings.archiveId, { lockPermissions: true });
    
    const yes = new ButtonBuilder()
			.setCustomId('yesVote')
			.setLabel('Yes')
			.setStyle(ButtonStyle.Success)
            .setDisabled(true);

		const no = new ButtonBuilder()
			.setCustomId('noVote')
			.setLabel('No')
			.setStyle(ButtonStyle.Danger)
            .setDisabled(true);

		const row = new ActionRowBuilder()
			.addComponents(yes, no);

    const voteMessage = await voteChannel.messages.fetch(voteRow.voteMessageId);
    if(!voteMessage) {
        voteLogger.error({ message: 'Vote message not found trying to close vote.' });
        return false;
    }
    try {
        voteMessage.edit({ components: [row] });
    } catch(e) {
        voteLogger.error({ e });
        return false;
    }
    db.run(`UPDATE votes SET ended = 1 WHERE id = ?`, [voteId]);
    const userVotes = await dbAll('SELECT yesNo FROM votesPlaced WHERE voteId = ?', [voteId]);
    var yesVotes = 0;
    var noVotes = 0;
    userVotes.forEach(userVote => {
        if(userVote.yesNo === 1) yesVotes++;
        else noVotes++;
    });
    var resultOfVote = yesVotes > noVotes ? "Yes" : yesVotes === noVotes ? "Draw" : "No";
    voteChannel.send(`This voting thread has ended.\n\nThe result is ${resultOfVote} (${yesVotes} yes, ${noVotes} no)`);
    if(voteRow.anonymous === 0) { 
        const spreadsheet = await generateSpreadsheet(voteId);
        await delay(3000);
        await voteChannel.send({ content: 'You can view who voted for what in this spreadsheet.', files: [`./results/${spreadsheet}`]})
    } else {
        voteChannel.send('The individual votes are not available for this vote as it is a hidden vote.')
    }
    return true;
}

export async function openVote(voteId: number, days: number): Promise<boolean> {
    const voteRow = await dbGet(`SELECT * FROM votes WHERE id = ?`, [voteId]);
    if(!voteRow) {
        voteLogger.error({ message: 'Vote row not found trying to open vote.' });
        return false;
    }
    const cefGuild = await bot.guilds.cache.get(settings.guildId);
    if(!cefGuild) {
        voteLogger.error({ message: 'CEF guild not found trying to open vote.' });
        return false;
    }
    
    const voteChannel = await cefGuild.channels.cache.get(voteRow.discordChannelId);
    if(!voteChannel) {
        voteLogger.error({ message: 'Vote channel not found trying to open vote.' });
        return false;
    }
    voteChannel.setParent(settings.voteCategory, { lockPermissions: true });
    const yes = new ButtonBuilder()
			.setCustomId('yesVote')
			.setLabel('Yes')
			.setStyle(ButtonStyle.Success)
            .setDisabled(false);

		const no = new ButtonBuilder()
			.setCustomId('noVote')
			.setLabel('No')
			.setStyle(ButtonStyle.Danger)
            .setDisabled(false);

		const row = new ActionRowBuilder()
			.addComponents(yes, no);

    const voteMessage = await voteChannel.messages.fetch(voteRow.voteMessageId);
    if(!voteMessage) {
        voteLogger.error({ message: 'Vote message not found trying to open vote.' });
        return false;
    }
    try {
        voteMessage.edit({ components: [row] });
    } catch(e) {
        voteLogger.error({ e });
        return false;
    }
    db.run(`UPDATE votes SET ended = 0, timeEnd = ? WHERE id = ?`, [(Math.floor(Date.now() / 1000) + (86400 * days)) * 1000, voteId]);
    voteChannel.send('This voting thread has been re-opened.');
    return true;
}

export async function checkVotes() {
    const voteRows = await dbAll('SELECT * FROM votes WHERE ended = 0 AND timeEnd < ?', [Date.now()]);
    voteRows.forEach(async(voteRow) => {
        const closeResult = await closeVote(voteRow.id);
        if(!closeResult) voteLogger.error({ message: `Unable to close vote ID ${voteRow.id} when checking votes.` })
    });
}

export async function generateSpreadsheet(voteId: number) {

    const voteRow = await dbGet(`SELECT * FROM votes WHERE id = ?`, [voteId]);
    if(!voteRow) {
        voteLogger.error({ message: 'Vote row not found trying to generate spreadsheet.' });
        return null;
    }

    if(voteRow.anonymous) {
        voteLogger.error({ message: 'Anonymous spreadsheet found trying to generate spreadsheet.' });
        return 'anonymous';
    }

    const wb = new xl.Workbook();
    const ws = wb.addWorksheet('Data');
    ws.cell(1, 1).string('All data in this worksheet is as of the date below. Usernames and display names may be different. Votes also may be changed in the case of a re-opened vote.');
    ws.cell(2, 1).string('Timestamp:');
    const dateAsString: string = new Date().toString();
    ws.cell(2, 2).string(dateAsString);
    ws.cell(3, 1).string(`Vote ID: ${voteId}`);
    ws.cell(3, 2).string(`Subject: ${voteRow.subject}`);
    const header = wb.createStyle({
        font: {
            color: '#000000',
            bold: true,
        },
    });
    const votes = await dbAll(`SELECT * FROM votesPlaced WHERE voteId = ?`, [voteId]);
    var yesVotes = 0;
    var noVotes = 0;
    votes.forEach(userVote => {
        if(userVote.yesNo === 1) yesVotes++;
        else noVotes++;
    });
    var resultOfVote = yesVotes > noVotes ? "Yes" : yesVotes === noVotes ? "Draw" : "No";
    ws.cell(4, 1).string('Yes Votes').style(header);
    ws.cell(4, 2).string('No Votes').style(header);
    ws.cell(4, 3).string('Result').style(header);
    ws.cell(5, 1).number(yesVotes);
    ws.cell(5, 2).number(noVotes);
    ws.cell(5, 3).string(resultOfVote);
    ws.cell(6, 1).string('Discord ID').style(header);
    ws.cell(6, 2).string('Discord Username').style(header);
    ws.cell(6, 3).string('Discord Display Name').style(header);
    ws.cell(6, 4).string('Vote').style(header);
    for(var i = 0; i < votes.length; i++) {
        const column = i + 7;
        ws.cell(column, 1).string(votes[i].discordId);
        ws.cell(column, 2).string(votes[i].username);
        ws.cell(column, 3).string(votes[i].displayName);
        const voteYesNo = votes[i].yesNo === 1 ? "Yes" : "No";
        ws.cell(column, 4).string(voteYesNo);
    }
    wb.write(`./results/Results of ID ${voteId} - ${voteRow.subject}.xlsx`);
    return `Results of ID ${voteId} - ${voteRow.subject}.xlsx`;
}