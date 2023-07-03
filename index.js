import axios from 'axios'
import fs from 'fs'
import TelegramBot from 'node-telegram-bot-api'
import { config } from 'dotenv'
import { COMMANDS } from './commands.js'

config()

const url = 'https://cre-api.kufar.by/ads-search/v1/engine/v1/search/rendered-paginated?' +
  'cat=1010&size=20&lang=ru&rgn=2&sort=lst.d&typ=let'

async function makeRequest() {
  try {
    const response = await axios.get(url);
    const rooms = (await response.data).ads

    let fileContent = fs.readFileSync("lastdate.json", "utf8");
    const lastDate = JSON.parse(fileContent).lastDate
    const trueRooms = []

    for(let i = 0; i < rooms.length; i++) {
      if(new Date(lastDate).getTime() < new Date(rooms[i].list_time)) {
        trueRooms.push({
          ad_link: rooms[i].ad_link || 'Ссылки нет',
          subject: rooms[i].subject || 'Описания нет',
          list_time: rooms[i].list_time || new Date()
        })
      }
    }
    if(trueRooms.length) {
      fs.writeFileSync("lastdate.json", JSON.stringify({
        lastDate: trueRooms[0].list_time
      }))
    }
    return trueRooms
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error.message);
  }
}

const bot = new TelegramBot(process.env.TELEGRAM_API_TOKEN, {
  polling: true
});

bot.on("polling_error", err => console.log(err.data.error.message));

bot.on('text', async msg => {
  console.log(msg.text);
  await bot.sendMessage(msg.chat.id, "Скоро всё будет");
})

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;// 30 * 60 * 1000
  await bot.sendMessage(
    chatId,
    helpResponse("Ну спасибо, что запустил",
      'Пожуй рогалик 🥐,',
      "а я работать б#%ть",
      '\n© xata_kufar_bot'
    )
  )
  setInterval(helpInterval, 20 * 1000, chatId)
});

bot.onText(/\/link/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    helpResponse("Поделись и будет счастье", 'https://t.me/xata_kufar_bot')
  )
});

bot.onText(/\/donat/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    helpResponse("На пиво и орешки", '4916 9896 9481 9027', '04/27')
  )
});

async function helpInterval(chatId) {
  const trueRooms = await makeRequest() || []
  if(!trueRooms.length) {
    await bot.sendMessage(chatId, "Я не сломался, просто квартир нет")
  } else {
    trueRooms.forEach(item => bot.sendMessage(chatId, helpResponse(item.ad_link, item.subject)))
  }
}

function helpResponse() {
  let str = ''
  for(let i = 0; i < arguments.length; i++) {
    str += arguments[i] + '\n'
    if(i === arguments.length - 1)
      break
  }
  return str
}

await bot.setMyCommands(COMMANDS);
