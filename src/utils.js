export function getDateAndTime(now) {
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString().padStart(4, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`
}

export function toLocaleDateAndTime(date) {
  return new Date(date).toLocaleString('ru-RU', {timeZone: 'Europe/Moscow'})
}

export function cityOnlyGomel(room) {
  const address = room?.account_parameters.at(-1)?.v || 'Гомель'
  const arrAddress = address.split(/[,\s]+/);
  const word = 'Гомель'

  const result = arrAddress.indexOf(word);
  return result !== -1;
}

export function fixCategory(pos6, pos9) {
  if (!Number(pos6)) return pos6
  return pos9
}

export function fixTypeRent(room = null) {
  if(!room) return '-'
  const searchValue = 'rent_type'
  let found = ''

  for (let i = 0; i < room.length; i++) {
    for (let key in room[i]) {
      if (room[i][key] === searchValue) {
        found = room[i].vl
        i = room.length
        break
      }
    }
  }
  return found
}

export function fixRooms(room = null) {
  if(!room) return '-'
  const searchValue = 'rooms'
  let foundInd = ''

  for (let i = 0; i < room.length; i++) {
    for (let key in room[i]) {
      if (room[i][key] === searchValue) {
        foundInd = room[i].vl
        i = room.length
        break
      }
    }
  }
  return foundInd
}

export function rentOnlyLongTime(room) {
  const rentType = fixTypeRent(room?.ad_parameters)
  if(rentType === 'Долгосрочная аренда') {
    return room
  }
  return false
}