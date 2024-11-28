const SlashArgType = require('discord-api-types/v10').ApplicationCommandOptionType;

module.exports = {
    slashArg(type, name, opts) {
        const obj = {
            name,
            type,
            ...opts
        };
        if (type != SlashArgType.Subcommand) {
            obj.required = opts.required === undefined ? true : opts.required;
        }
        return obj;
    },
    slashChoices(opts) {
        if (Array.isArray(opts)) return opts.map((v) => ({ name: v, value: v.toLowerCase() }));
        if (typeof(opts) == 'object') return Object.entries(opts).map(([k, v]) => ({ name: k, value: v }));
    },
    slashCommandJSON(obj, guild) {
        const name = obj.slashCommandName 
            || [obj.name, ...(obj.alias || [])].reduce((i, acc) => i.length < acc.length ? i : acc);
        const jsons = [{
            name,
            type: 1,
            description: obj.description,
            options: obj.args
        }];
        return jsons;
    }
};