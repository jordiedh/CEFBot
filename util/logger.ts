import { APIAttachment, Attachment, AttachmentBuilder, AttachmentPayload, BufferResolvable, ChatInputCommandInteraction, Client, Colors, ContextMenuCommandInteraction, EmbedBuilder, Guild, GuildTextBasedChannel, JSONEncodable, Message, MessageCreateOptions } from 'discord.js';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type LogOptions = {
    message?: string;
    command?: Message | ChatInputCommandInteraction | ContextMenuCommandInteraction;
    level?: LogLevel;
    error?: Error;
    guild?: Guild;
    server?: boolean;
    image?: string;
    files?: (
          BufferResolvable
        | JSONEncodable<APIAttachment>
        | Attachment
        | AttachmentBuilder
        | AttachmentPayload
    )[]
};

const LogColors = {
    info: Colors.Blue,
    warn: Colors.Yellow,
    error: Colors.Red,
    debug: Colors.Green
} as const;

let bot: Client;
if (require.main) {
    import('../botMeta').then(({ bot: _bot }) => { bot = _bot; });
}

function commandType(command: Message | ChatInputCommandInteraction | ContextMenuCommandInteraction) {
    if (command instanceof Message) return command.inGuild() ? 'Message' : 'DM Message';
    if (command instanceof ChatInputCommandInteraction) return 'Slash';
    if (command instanceof ContextMenuCommandInteraction) return 'Context Menu';
    return 'Unknown';
}

export class Logger {
    context: string;
    constructor(context='unknown') {
        this.context = context; 
    }
    getContextLabel() { return `[${this.context}]`; }
    #parse({ level, guild, command, message, error, image, files }: LogOptions) {
        const url = command && 'url' in command ? `[${command.url}]` : '';
        const guildLabel = guild && `[${guild.name}]`;
        const log = (message || '') + (error?.stack ? `\n${error.stack}` : '');
        const target = command instanceof ContextMenuCommandInteraction ? `[Target: ${command.targetId}]` : '';
        const type = command && `[${commandType(command)}]`;
        const img = image && `[Image: ${image}]`;
        const f = files && `[${files.length} Attachments: ${files.map(file => typeof file === 'object' && 'name' in file ? file.name : file).join(', ')}]`;
        return [`[${level?.toUpperCase()}]`, this.getContextLabel(), guildLabel, type, target, url, img, f, log].filter(Boolean).join(' ');
    }
    info(options: LogOptions) {
        options = { level: 'info', ...options };
        console.info(this.#parse(options));
        if (options.server) this.#server(options);
    }
    warn(options: LogOptions) {
        options = { level: 'warn', ...options };
        console.warn(this.#parse(options));
        if (options.server !== false) this.#server(options);
    }
    error(options: LogOptions) {
        options = { level: 'error', ...options };
        console.error(this.#parse(options));
        if (options.server !== false) this.#server(options);
    }
    debug(options: LogOptions) {
        options = { level: 'debug', ...options };
        console.debug(this.#parse(options));
        if (options.server) this.#server(options);
    }
    #server(options: LogOptions) {
        const { message, command, level, guild, error, image, files } = options;
        if (!bot?.isReady || !bot.guilds.cache.size) return;
        
        const channel = bot.channels.cache.get("1295601807346765947") as GuildTextBasedChannel;
        if (!channel) return;
        const ctx = /[[\]]/.test(this.context) ? `[${this.context}]` : this.context;
        const lll = level || "info";
        const embed = new EmbedBuilder()
            .setColor(LogColors[lll] || Colors.Purple)
            .setTitle(level?.charAt(0).toUpperCase() + "" + level?.slice(1).toLowerCase())
            .addFields({ name: 'Context', value: ctx, inline: true })
            .setTimestamp();
        if (image) embed.setImage(image);
        if (guild) embed.addFields({ name: 'Guild', value: guild.name, inline: true });
        if (error) {
            embed.addFields({ name: 'Error Type', value: `${error.name}` || 'Unknown', inline: true });
            embed.addFields({ name: 'Error Message', value: `\`\`\`\n${error.message}\n\`\`\`` });
            if ('method' in error) embed.addFields({ name: 'Method', value: `${error.method}`, inline: true });
            if ('code' in error) embed.addFields({ name: 'Code', value: `${error.code}`, inline: true });
            if ('httpStatus' in error) embed.addFields({ name: 'httpStatus', value: `${error.httpStatus}`, inline: true });
            if ('path' in error) embed.addFields({ name: 'Path', value: `\`\`\`\n${error.path}\n\`\`\`` });
        }
        if (message) embed.addFields({ name: 'Log Message', value: message });
        if (command) {
            const author = 'author' in command ? command.author : command.user;
            embed.addFields(
                { name: 'User', value: `${author}\n\`${author.displayName}\``, inline: true },
                { name: 'Command Type', value: commandType(command), inline: true }
            );
            if (command instanceof Message && command.inGuild()) embed.addFields({ name: 'URL', value: command.url, inline: true });
            if (command instanceof ContextMenuCommandInteraction) embed.addFields({ name: 'Target', value: `<@${command.targetId}>\n\`${command.targetId}\``, inline: true });
            else if (command instanceof Message) embed.addFields({ name: 'Content', value: `\`\`\`\n${command.content}\n\`\`\`` });
            else if (command instanceof ChatInputCommandInteraction) embed.addFields({ name: 'Usage', value: `\`\`\`\n/${command.commandName} ${command.options.data.map(opt => opt.value).join(' ')}\n\`\`\`` });
        }
        const payload: MessageCreateOptions = { embeds: [embed] };
        if (files?.length == 1 && typeof files[0] === 'string') embed.setImage(files[0]);
        else if (files) payload.files = files;
        if (error?.stack) payload.content = `\`\`\`\n${error.stack}\n\`\`\``;
        channel.send(payload).catch(error2 => console.error(this.#parse({
            ...options,
            message: `Failed to send error message to logging channel: ${error2}\n`
        })));
    }
}

export class CommandLogger extends Logger {
    getContextLabel() { return `[Command: ${this.context}]`; }
}
