import Discord, { Intents } from "discord.js";
import { GoogleSpreadsheet } from "google-spreadsheet";
import creds from "./hackathon-verify-bot.json" assert { type: "json" };

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const HACKER_ROLE = "Hacker";
const GUILD_ID = process.env.GUILD_ID;

// extract tokens
const DOC_ID = process.env.DOC_ID;
const doc = new GoogleSpreadsheet(DOC_ID);

async function getTokens() {
  await doc.useServiceAccountAuth({
    client_email: creds.client_email,
    private_key: creds.private_key,
  });
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];

  let rows = await sheet.getRows();
  let tokens = [];
  for (let index = 0; index < rows.length; index++) {
    tokens.push(rows[index]["Discord Token"]);
  }
  return tokens;
}

let tokens = await getTokens();

let client = new Discord.Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_MESSAGE_TYPING,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGE_TYPING,
    Intents.FLAGS.GUILD_MEMBERS,
  ],
  partials: [
    "CHANNEL", // Required to receive DMs
  ],
});

client.login(DISCORD_TOKEN);

client.on("ready", async () => {
  const guild = client.guilds.cache.get(GUILD_ID);
  await guild.members.fetch();
  const botId = client.user.id;
  console.log("ready");
  client.on("messageCreate", (msg) => {
    const userid = msg.author.id;
    if (userid === botId) return;
    const member = guild.members.cache.get(userid);
    // user is not in TechNova server
    if (!member) return;

    if (msg.guild === null) {
      if (msg.content.startsWith("!verify")) {
        // hacker role already signed
        if (member.roles.cache.some((role) => role.name === HACKER_ROLE)) {
          msg.author.send("Hacker role has already been assigned.");
          return;
        }
        let myRegexp = /^!verify\s*(.*)/;
        let match = myRegexp.exec(msg.content);
        let token = match[1];
        if (tokens.includes(token)) {
          // assign hacker role
          let role = guild.roles.cache.find(
            (role) => role.name === HACKER_ROLE
          );
          member.roles.add(role);
          msg.author.send("Hacker role comfimed.");
          // remove the used token from the lisat
          tokens = tokens.filter(function (item) {
            return item !== token;
          });
        } else {
          msg.author.send("This is not a valid token (used or wrong).");
        }
      } else {
        msg.author.send(
          "This bot is only used for verification purposes; please type '!verify <token>'."
        );
      }
    }
  });
});
