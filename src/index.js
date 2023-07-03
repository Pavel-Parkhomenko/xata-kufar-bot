import axios from 'axios'
import fs from 'fs'
import TelegramBot from 'node-telegram-bot-api'
import { config } from 'dotenv'
import { COMMANDS } from './commands.js'
import { RES_START } from './responses.js'
import {
  cityOnlyGomel,
  toLocaleDateAndTime,
  fixCategory,
  fixTypeRent,
  fixRooms
} from './utils.js'

config()

const url = 'https://cre-api.kufar.by/ads-search/v1/engine/v1/search/rendered-paginated?' +
  'cat=1010&size=20&lang=ru&rgn=2&sort=lst.d&typ=let'

async function makeRequest() {
  try {
    const response = await axios.get(url)
    const rooms = ((await response.data).ads).reverse()

    fs.writeFileSync("lastRoom.json", JSON.stringify(rooms.at(-1)))

    let fileContent = fs.readFileSync("last.json", "utf8");
    const lastDate = JSON.parse(fileContent).lastDate
    let trueRooms = []

    for(let i = 0; i < rooms.length; i++) {
      if(new Date(lastDate).getTime() < new Date(rooms[i].list_time).getTime() && cityOnlyGomel(rooms[i])) {
        trueRooms.push(rooms[i])
      }
    }

    if(trueRooms.length) {
      fs.writeFileSync("last.json", JSON.stringify({
        lastDate: trueRooms.at(-1).list_time
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

bot.on("polling_error", err => console.error("polling_error"));

bot.on('text', async msg => {
  helpSendMessage(msg.chat.id, "Скоро всё будет 😎");
})

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  helpSendMessage(chatId, helpBuildString(...RES_START), "HTML")
  setInterval(helpInterval, 30 * 60 * 1000, chatId)
  makeRequest()
});

bot.onText(/\/link/, async (msg) => {
  const chatId = msg.chat.id;
  helpSendMessage(
    chatId,
    helpBuildString("Поделись и будет счастье", 'https://t.me/xata_kufar_bot')
  )
});

bot.onText(/\/donat/, async (msg) => {
  const chatId = msg.chat.id;
  helpSendMessage(
    chatId,
    helpBuildString("На пиво и орешки", '4916 9896 9481 9027', '04/27')
  )
});

bot.onText(/\/boost/, async (msg) => {
  const chatId = msg.chat.id;
  const trueRooms = await makeRequest() || []
  if(!trueRooms.length) {
    helpSendMessage(chatId, "Свежих квартир пока нет")
  } else {
    helpSendMoreMessage(trueRooms, chatId, "HTML")
  }
})

bot.onText(/\/last/, async (msg) => {
  const chatId = msg.chat.id;
  const lastRoom = fs.readFileSync("lastRoom.json", "utf8");
  if(!lastRoom) {
    helpSendMessage(chatId, "Последней квартиры ещё нет")
  }
  else {
    helpSendMessage(chatId, helpBuildString(...helpRoom(JSON.parse(lastRoom))), "HTML")
  }
})

bot.onText(/\/about/, async (msg) => {
  const chatId = msg.chat.id
  helpSendMessage(chatId, helpBuildString(...RES_START), "HTML")
})

async function helpInterval(chatId) {
  const trueRooms = await makeRequest() || []
  if(!trueRooms.length) {
    helpSendMessage(chatId, "Я не сломался, просто квартир нет")
  } else {
    for(let i = 0; i < trueRooms.length; i++) {
      helpSendMessage(
        chatId,
        helpBuildString(...helpRoom(trueRooms[i])),
        "HTML"
      )
    }
  }
}

function helpRoom(room) {
  return [
    (room?.ad_link || '-') + "\n",
    "🏙",
    "<i>Категория</i>:  " + "Квартиры",
    "<i>Тип аренды:</i>  " + fixTypeRent(room?.ad_parameters),
    "<i>Кол-во комнат:</i>  " + fixRooms(room?.ad_parameters),
    "<i>Адрес:</i>  " + (room?.account_parameters.at(-1)?.v || '-'),
    "<i>Тип валюты:</i>  " + (room?.currency || '-'),
    "<i>Дата:</i>  " + (toLocaleDateAndTime(room.list_time) || '-'),
    "<i>Стоимость:</i>💰  " + (room?.price_byn.slice(0, -2) || '-') + " BYN, " +
      (room?.price_usd.slice(0, -2) || '-') + "$",
    "\n🖍 " + (room?.subject || '-')
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

async function helpSendMoreMessage(trueRooms, chatId, mode="") {
  const requests = trueRooms.map(item => bot.sendMessage(chatId, helpBuildString(...helpRoom(item)), {
      parse_mode: mode
    }
  ))
  Promise.all(requests)
}

await bot.setMyCommands(COMMANDS)


