import axios from 'axios'
import fs from 'fs'
import TelegramBot from 'node-telegram-bot-api'
import { config } from 'dotenv'
import { COMMANDS } from './commands.js'
import { RES_START } from './responses.js'

config()

const url = 'https://cre-api.kufar.by/ads-search/v1/engine/v1/search/rendered-paginated?' +
  'cat=1010&size=20&lang=ru&rgn=2&sort=lst.d&typ=let'

async function makeRequest() {
  try {
    const response = await axios.get(url);
    const rooms = (await response.data).ads

    let fileContent = fs.readFileSync("last.json", "utf8");
    const lastDate = JSON.parse(fileContent).lastDate
    const trueRooms = []

    for(let i = 0; i < rooms.length; i++) {
      if(new Date(lastDate).getTime() < new Date(rooms[i].list_time)) {
        trueRooms.push(rooms[i])
      }
    }
    if(trueRooms.length) {
      fs.writeFileSync("last.json", JSON.stringify({
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
  await helpSendMessage(msg.chat.id, "Скоро всё будет");
})

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id; 10 * 1000
  await helpSendMessage(chatId, helpBuildString(...RES_START), "HTML")
  setInterval(helpInterval, 30 * 60 * 1000, chatId)
});

bot.onText(/\/link/, async (msg) => {
  const chatId = msg.chat.id;
  await helpSendMessage(
    chatId,
    helpBuildString("Поделись и будет счастье", 'https://t.me/xata_kufar_bot')
  )
});

bot.onText(/\/donat/, async (msg) => {
  const chatId = msg.chat.id;
  await helpSendMessage(
    chatId,
    helpBuildString("На пиво и орешки", '4916 9896 9481 9027', '04/27')
  )
});

async function helpInterval(chatId) {
  const trueRooms = await makeRequest() || []
  if(!trueRooms.length) {
    await helpSendMessage(chatId, "Я не сломался, просто квартир нет")
  } else {
    trueRooms.forEach(item =>
      helpSendMessage(
        chatId,
        helpBuildString(...helpRoom(item))
      )
    )
  }
}

function helpRoom(room) {
  return [
    (room?.ad_link || '-') + "\n",
    "Категория: " + (room?.ad_parameters[6].vl || '-'),
    "Тип аренды: " + (room?.ad_parameters[5].vl || '-'),
    "Кол-во комнат: " + (room?.ad_parameters[9].vl || '-'),
    "Адрес: " + (room?.account_parameters.at(-1)?.v || '-'),
    "Тип валюты: " + (room?.currency || '-'),
    "Стоимость: " + (room?.price_byn.slice(0, -2) || '-') + " BYN, " +
      (room?.price_usd.slice(0, -2) || '-') + "$",
    "\n" + (room?.subject || '-')
  ]
}

function helpBuildString() {
  let str = ''
  for(let i = 0; i < arguments.length; i++) {
    str += arguments[i] + '\n'
    if(i === arguments.length - 1)
      break
  }
  return str
}

async function helpSendMessage(chatId, response, mode="") {
  await bot.sendMessage(chatId, response, {
    parse_mode: mode
  })
}

await bot.setMyCommands(COMMANDS);
