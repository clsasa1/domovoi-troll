import { StrictMode, useEffect, useMemo, useState } from 'react'
import {
  Bell,
  BellOff,
  CheckCheck,
  ChevronDown,
  Archive,
  FileText,
  Image,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Pin,
  Plus,
  Trash2,
  Search,
  Send,
  Smile,
  Settings,
  SlidersHorizontal,
  Users,
  Moon,
  Sun,
  Volume2,
  X,
} from 'lucide-react'
import { createRoot } from 'react-dom/client'
import './styles.css'

type Message = {
  id: number
  author: string
  initials: string
  color: string
  text: string
  time: string
  mine?: boolean
  reactions?: string
  attachment?: boolean
}

type GameEvent =
  | { type: 'playerMessage'; message: { text: string } }
  | { type: 'typing_start'; actorId: string; delayMs: number }
  | { type: 'npc_message'; actorId: string; text: string; delayMs: number }
  | { type: 'typing_stop'; actorId: string }
  | { type: 'system_event'; text?: string; event: string }
  | { type: 'game_over'; status: string }

type GameResponse = {
  sessionId?: string
  state: { tension: number; suspicion: number; sessionStatus: string }
  events: GameEvent[]
}

type MenuName = 'settings' | 'header' | 'profile' | 'attachment' | null

const residents = [
  { name: 'Марина Петрова', role: 'Председатель совета дома', status: 'в сети', initials: 'МП', color: 'rose' },
  { name: 'Илья Кузнецов', role: 'был в сети 15 минут назад', initials: 'ИК', color: 'blue' },
  { name: 'Ольга Соколова', role: 'в сети', initials: 'ОС', color: 'violet' },
  { name: 'Алексей Морозов', role: 'был в сети вчера', initials: 'АМ', color: 'amber' },
  { name: 'Наталья Белова', role: 'в сети', initials: 'НБ', color: 'teal' },
]

const initialChats = [
  { id: 'north', title: 'ЖК “Северные Высоты” корп. 2', preview: 'Марина: Передам управляющей...', time: '10:55', unread: 3, color: 'blue' },
  { id: 'sunny', title: 'ЖК “Солнечный берег”', preview: 'Илья: Лифт опять не работает', time: '09:42', unread: 7, color: 'amber' },
  { id: 'parking', title: 'Парковка · Северные Высоты', preview: 'Наталья: Кто занял гостевое место?', time: 'Вчера', unread: 0, color: 'teal' },
]

const initialMessages: Message[] = [
  { id: 1, author: 'Марина Петрова', initials: 'МП', color: 'rose', text: 'Доброе утро, соседи! Напоминаю: сегодня с 11:00 будут проверять пожарную сигнализацию.', time: '10:42' },
  { id: 2, author: 'Илья Кузнецов', initials: 'ИК', color: 'blue', text: 'А лифт при этом отключат? У меня доставка как раз на это время.', time: '10:44' },
  { id: 3, author: 'Марина Петрова', initials: 'МП', color: 'rose', text: 'Нет, лифт будет работать. Только попросят не пугаться громких сигналов 🙂', time: '10:45' },
  { id: 4, author: 'Ольга Соколова', initials: 'ОС', color: 'violet', text: 'А кто-нибудь знает, почему второй день пахнет краской на 8 этаже? Ремонт вроде бы закончили.', time: '10:48' },
  { id: 5, author: 'Алексей Морозов', initials: 'АМ', color: 'amber', text: 'Это мои рабочие, прошу прощения! Завершают мелочи в санузле, завтра уже точно закончим.', time: '10:51', attachment: true },
  { id: 6, author: 'Вы', initials: 'ВЫ', color: 'green', text: 'Главное, чтобы вентиляцию после ремонта проверили. Вчера вечером снова тянуло запахом в квартиру.', time: '10:53', mine: true },
  { id: 7, author: 'Марина Петрова', initials: 'МП', color: 'rose', text: 'Записала. Передам управляющей компании, пусть посмотрят вентиляционный канал.', time: '10:55', reactions: '👍 3' },
]

const chatMessages: Record<string, Message[]> = {
  north: initialMessages,
  sunny: [
    { id: 101, author: 'Илья Кузнецов', initials: 'ИК', color: 'blue', text: 'Лифт опять встал между этажами. Кто-нибудь уже написал в УК?', time: '09:35' },
    { id: 102, author: 'Наталья Белова', initials: 'НБ', color: 'teal', text: 'Я оставила заявку, обещали прислать мастера до обеда.', time: '09:42', reactions: '😬 2' },
    { id: 103, author: 'Вы', initials: 'ВЫ', color: 'green', text: 'Главное, чтобы не как в прошлый раз — три дня ждали.', time: '09:45', mine: true },
  ],
  parking: [
    { id: 201, author: 'Наталья Белова', initials: 'НБ', color: 'teal', text: 'Соседи, кто поставил серую Киа на гостевое место у третьего подъезда? Стоит с самого утра.', time: '18:21' },
    { id: 202, author: 'Сергей Ремонт', initials: 'СР', color: 'amber', text: 'Номер 417? Это ко мне приехали рабочие, на полчаса максимум оставил.', time: '18:23' },
    { id: 203, author: 'Наталья Белова', initials: 'НБ', color: 'teal', text: 'На полчаса — это до 11:00, Сергей. Сейчас уже вечер. Там вообще-то разгрузка для скорой нужна.', time: '18:24' },
    { id: 204, author: 'Сергей Ремонт', initials: 'СР', color: 'amber', text: 'Не надо драму разводить. Машина никому не мешает, проезд свободный.', time: '18:26' },
    { id: 205, author: 'Марина Петрова', initials: 'МП', color: 'rose', text: 'Коллеги, место гостевое, не личное. Сергей, пожалуйста, переставьте машину до 19:00.', time: '18:28' },
    { id: 206, author: 'Наталья Белова', initials: 'НБ', color: 'teal', text: 'Я фото приложила в общий чат. Если до семи не уберут, отправлю председателю и в УК.', time: '18:29' },
    { id: 207, author: 'Сергей Ремонт', initials: 'СР', color: 'amber', text: 'Фотографировать чужие машины без разрешения тоже не очень законно вообще-то.', time: '18:31' },
    { id: 208, author: 'Вы', initials: 'ВЫ', color: 'green', text: 'А если поставить рядом табличку «место для очень важных рабочих», эвакуатор не заберёт?', time: '18:33', mine: true, reactions: '😂 4' },
    { id: 209, author: 'Марина Петрова', initials: 'МП', color: 'rose', text: 'Без провокаций, пожалуйста. Сергей, ждём фото, что место освобождено.', time: '18:35' },
    { id: 210, author: 'Сергей Ремонт', initials: 'СР', color: 'amber', text: 'Ладно, переставляю. Но табличку про важных рабочих я бы оставил, смешно же.', time: '18:37' },
  ],
}

const popularEmojis = ['🙂', '😂', '👍', '❤️', '🔥', '😡', '😢', '🤔', '👏', '👀']

function Avatar({ initials, color, online = false, large = false }: { initials: string; color: string; online?: boolean; large?: boolean }) {
  return <span className={`avatar avatar-${color} ${large ? 'avatar-large' : ''}`}>{initials}<>{online && <i className="online-dot" />}</></span>
}

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = window.localStorage.getItem('domovoi-theme')
    return savedTheme === 'light' ? 'light' : 'dark'
  })
  const [messagesByChat, setMessagesByChat] = useState(chatMessages)
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [chats, setChats] = useState(initialChats)
  const [selectedChatId, setSelectedChatId] = useState('north')
  const [sessionId, setSessionId] = useState<string>()
  const [typingActor, setTypingActor] = useState<string>()
  const [metrics, setMetrics] = useState({ tension: 0, suspicion: 0 })
  const [gameOver, setGameOver] = useState<string>()
  const [openMenu, setOpenMenu] = useState<MenuName>(null)
  const [pinnedVisible, setPinnedVisible] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [conversationQuery, setConversationQuery] = useState('')
  const [toast, setToast] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [gameOptions, setGameOptions] = useState({ drama: true, autoNoise: true, hardMode: false })
  const selectedChat = chats.find((chat) => chat.id === selectedChatId) ?? chats[0]
  const messages = messagesByChat[selectedChatId] ?? []

  const selectChat = (chatId: string) => {
    setSelectedChatId(chatId)
    setChats((current) => current.map((chat) => chat.id === chatId ? { ...chat, unread: 0 } : chat))
  }

  useEffect(() => {
    void fetch('/domovoi/api/game/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Не удалось начать игру')
        return response.json() as Promise<GameResponse>
      })
      .then((result) => {
        if (result.sessionId) setSessionId(result.sessionId)
        setMetrics({ tension: result.state.tension, suspicion: result.state.suspicion })
      })
      .catch(() => setGameOver('Сервер игры недоступен'))
  }, [])

  const visibleChats = useMemo(
    () => chats.filter((chat) => `${chat.title} ${chat.preview}`.toLowerCase().includes(search.toLowerCase())),
    [search],
  )
  const visibleMessages = useMemo(
    () => messages.filter((message) => message.text.toLowerCase().includes(conversationQuery.toLowerCase())),
    [conversationQuery, messages],
  )

  useEffect(() => {
    window.localStorage.setItem('domovoi-theme', theme)
  }, [theme])

  useEffect(() => {
    setChats((current) => current.map((chat) => chat.id === selectedChatId ? { ...chat, unread: 0 } : chat))
  }, [])

  const notify = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(''), 2200)
  }

  const sendMessage = async () => {
    const text = draft.trim()
    if (!text || !sessionId || gameOver) return
    setMessagesByChat((current) => ({ ...current, [selectedChatId]: [...(current[selectedChatId] ?? []), { id: Date.now(), author: 'Вы', initials: 'ВЫ', color: 'green', text, time: 'сейчас', mine: true }] }))
    setDraft('')
    try {
      const response = await fetch('/domovoi/api/game/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          chatId: selectedChatId,
          text,
          contextMessages: messages.slice(-15).map((message) => ({ authorId: message.author, text: message.text })),
          messageType: 'text',
        }),
      })
      if (!response.ok) throw new Error('Game API request failed')
      const result = await response.json() as GameResponse
      setMetrics({ tension: result.state.tension, suspicion: result.state.suspicion })
      result.events.forEach((event) => {
        if (event.type === 'typing_start') setTypingActor(event.actorId)
        if (event.type === 'typing_stop') setTypingActor(undefined)
        if (event.type === 'npc_message') {
          setTypingActor(undefined)
          setMessagesByChat((current) => ({ ...current, [selectedChatId]: [...(current[selectedChatId] ?? []), { id: Date.now() + Math.random(), author: event.actorId, initials: event.actorId.slice(0, 2).toUpperCase(), color: 'blue', text: event.text, time: 'сейчас' }] }))
        }
        if (event.type === 'system_event' && event.text) {
          const systemText = event.text
          setMessagesByChat((current) => ({ ...current, [selectedChatId]: [...(current[selectedChatId] ?? []), { id: Date.now() + Math.random(), author: 'Система', initials: '!', color: 'amber', text: systemText, time: 'сейчас' }] }))
        }
        if (event.type === 'game_over') setGameOver(event.status)
      })
    } catch {
      setMessagesByChat((current) => ({ ...current, [selectedChatId]: [...(current[selectedChatId] ?? []), { id: Date.now(), author: 'Система', initials: '!', color: 'amber', text: 'Сервер не ответил. Попробуйте ещё раз.', time: 'сейчас' }] }))
    }
  }

  return (
    <main className={`app-shell theme-${theme}`}>
      <aside className="sidebar">
        <header className="sidebar-header">
          <div className="brand">
            <button className="menu-button" aria-label="Открыть меню"><span /><span /><span /></button>
            <div className="brand-mark"><MessageCircle size={17} fill="white" /></div>
            <span>VK Мессенджер</span>
          </div>
          <div className="header-actions">
            <button className="icon-button" aria-label="Переключить тему" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className={`icon-button ${settingsOpen ? 'selected' : ''}`} aria-label="Настройки игры" onClick={() => setSettingsOpen(true)}><Settings size={18} /></button>
          </div>
        </header>
        <div className="search-box">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск" aria-label="Поиск по чатам" />
          {search && <button onClick={() => setSearch('')} aria-label="Очистить поиск"><X size={15} /></button>}
        </div>
        <div className="network-status"><span className="network-dot" /> Tension {metrics.tension} · Suspicion {metrics.suspicion}</div>
        <div className="sidebar-section-title">Чаты <button aria-label="Вступить в чат" onClick={() => { const newChat = { id: `river-${Date.now()}`, title: 'ЖК “Речной квартал”', preview: 'Новый чат · Добро пожаловать', time: 'сейчас', unread: 0, color: 'teal' }; setChats((current) => [...current, newChat]); setSelectedChatId(newChat.id); notify('Вы вступили в новый чат') }}><Plus size={16} /></button></div>
        <div className="chat-list">
          {visibleChats.map((chat) => (
            <button className={`chat-card ${selectedChatId === chat.id ? 'chat-card-active' : ''}`} key={chat.id} onClick={() => selectChat(chat.id)}>
              <div className={`building-avatar building-${chat.color}`}><div className="building-roof" /><div className="building-windows">▪▪<br />▪▪</div></div>
              <div className="chat-card-content">
                <div className="chat-card-title"><strong>{chat.title}</strong><time>{chat.time}</time></div>
                <div className="chat-card-preview"><span>{chat.preview}</span>{chat.unread > 0 && <b>{chat.unread}</b>}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="sidebar-footer"><Avatar initials="ВЫ" color="green" online large /><div><strong>Вы</strong><small><span className="network-dot" /> в сети</small></div><button className="icon-button" aria-label="Меню профиля" onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')}><MoreHorizontal size={19} /></button>
          {openMenu === 'profile' && <div className="context-menu profile-menu"><button onClick={() => notify('Профиль игрока открыт')}>Мой профиль</button><button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</button></div>}
        </div>
      </aside>

      <section className="conversation">
        <header className="conversation-header">
          <div className="conversation-title"><div className={`building-avatar small building-${selectedChat.color}`}><div className="building-roof" /><div className="building-windows">▪▪<br />▪▪</div></div><div><h1>{selectedChat.title}</h1><p><span className="online-text">●</span> 42 участника, 6 онлайн</p></div></div>
          <div className="header-actions"><button className={`icon-button ${infoOpen ? 'selected' : ''}`} aria-label="Участники чата" onClick={() => setInfoOpen(!infoOpen)}><Users size={19} /></button><button className={`icon-button ${isSearching ? 'selected' : ''}`} onClick={() => setIsSearching(!isSearching)} aria-label="Поиск по диалогу"><Search size={20} /></button><button className={`icon-button ${notificationsEnabled ? '' : 'selected'}`} aria-label="Уведомления" onClick={() => { setNotificationsEnabled(!notificationsEnabled); notify(notificationsEnabled ? 'Уведомления выключены' : 'Уведомления включены') }}>{notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}</button><button className="icon-button" aria-label="Меню" onClick={() => setOpenMenu(openMenu === 'header' ? null : 'header')}><MoreHorizontal size={21} /></button>{openMenu === 'header' && <div className="context-menu header-menu"><button onClick={() => { setSettingsOpen(true); setOpenMenu(null) }}><Settings size={16} /> Настройки игры</button><button onClick={() => notify('Чат архивирован')}><Archive size={16} /> Архивировать</button><button onClick={() => setPinnedVisible(!pinnedVisible)}><Pin size={16} /> {pinnedVisible ? 'Скрыть закрепление' : 'Показать закрепление'}</button><button className="danger" onClick={() => { setMessagesByChat((current) => ({ ...current, [selectedChatId]: [] })); notify('История чата очищена') }}><Trash2 size={16} /> Очистить историю</button></div>}</div>
        </header>
        {isSearching && <div className="conversation-search"><Search size={16} /><input autoFocus value={conversationQuery} onChange={(event) => setConversationQuery(event.target.value)} placeholder="Поиск в переписке" /><button onClick={() => { setIsSearching(false); setConversationQuery('') }} aria-label="Закрыть поиск"><X size={16} /></button></div>}
        <div className="messages-scroll">
          <div className="date-divider"><span>Сегодня</span></div>
          <div className="message-list">
            {visibleMessages.map((message, index) => (
              <div className={`message-row ${message.mine ? 'message-row-mine' : ''}`} key={message.id}>
                {!message.mine && <Avatar initials={message.initials} color={message.color} />}
                <div className="message-body">
                  {!message.mine && (index === 0 || visibleMessages[index - 1]?.author !== message.author) && <div className="message-author">{message.author}</div>}
                  {message.attachment && <div className="attachment-card"><div className="attachment-icon"><FileText size={20} /></div><div><strong>Акт выполненных работ</strong><small>PDF · 1,2 МБ</small></div><button onClick={() => notify('Действия файла открыты')} aria-label="Действия файла"><ChevronDown size={17} /></button></div>}
                  <div className="bubble">{message.text}</div>
                  <div className="message-meta">{message.time} {message.mine && <CheckCheck size={15} />} {message.reactions && <span className="reaction">{message.reactions}</span>}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="unread-divider"><span>2 непрочитанных сообщения</span></div>
          {typingActor && <div className="typing"><Avatar initials={typingActor.slice(0, 2).toUpperCase()} color="violet" /><span>{typingActor} печатает</span><i /><i /><i /></div>}
        </div>
        <footer className="composer">
          {pinnedVisible && <div className="pinned-note"><Pin size={14} fill="currentColor" /><span><strong>Закреплено</strong> Правила дома и контакты управляющей компании</span><button onClick={() => setPinnedVisible(false)} aria-label="Скрыть закреплённое сообщение"><X size={14} /></button></div>}
          <div className="composer-row"><button className="icon-button" aria-label="Прикрепить" onClick={() => setOpenMenu(openMenu === 'attachment' ? null : 'attachment')}><Paperclip size={21} /></button>{openMenu === 'attachment' && <div className="context-menu attachment-menu"><button onClick={() => notify('Выберите фотографию для отправки')}><Image size={16} /> Фото</button><button onClick={() => notify('Выберите файл для отправки')}><FileText size={16} /> Файл</button><button onClick={() => notify('Опрос создан')}><Plus size={16} /> Опрос</button></div>}<textarea disabled={!sessionId || Boolean(gameOver)} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage() } }} placeholder={gameOver ?? 'Написать сообщение...'} rows={1} /><button className={`icon-button ${emojiOpen ? 'selected' : ''}`} aria-label="Смайлики" onClick={() => setEmojiOpen(!emojiOpen)}><Smile size={21} /></button>{emojiOpen && <div className="emoji-picker">{popularEmojis.map((emoji) => <button key={emoji} onClick={() => { setDraft((current) => `${current}${current ? ' ' : ''}${emoji}`); setEmojiOpen(false) }} aria-label={`Добавить ${emoji}`}>{emoji}</button>)}</div>}<button className={`send-button ${draft.trim() ? 'send-button-active' : ''}`} onClick={() => void sendMessage()} aria-label="Отправить"><Send size={19} /></button></div>
          <div className="composer-tools"><span>Enter — отправить</span><div><button aria-label="Добавить фото" onClick={() => notify('Выберите фотографию для отправки')}><Image size={16} /></button><button aria-label="Добавить геолокацию" onClick={() => notify('Геолокация добавлена к сообщению')}><MapPin size={16} /></button><button aria-label="Голосовое сообщение" onClick={() => notify('Запись голосового сообщения началась')}><Volume2 size={16} /></button></div></div>
        </footer>
      </section>
      {infoOpen && <aside className="info-panel"><button className="info-close" onClick={() => setInfoOpen(false)} aria-label="Закрыть информацию"><X size={18} /></button><div className="info-building"><div className={`building-avatar building-${selectedChat.color} info-avatar`}><div className="building-roof" /><div className="building-windows">▪▪<br />▪▪</div></div><h2>{selectedChat.title}</h2><p>42 участника · 6 онлайн</p></div><div className="info-tabs"><button className="active">Участники</button><button>Медиа</button></div><div className="info-search"><Search size={15} /><input placeholder="Поиск жильца" /></div><div className="info-residents">{residents.map((resident) => <div className="info-resident" key={resident.name}><Avatar initials={resident.initials} color={resident.color} online={resident.role === 'в сети'} /><div><strong>{resident.name}</strong><small>{resident.role}</small></div></div>)}</div></aside>}
      {settingsOpen && <div className="modal-backdrop" role="presentation" onClick={() => setSettingsOpen(false)}><section className="game-settings" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()}><header><div><h2 id="settings-title">Настройки игры</h2><p>Управляйте правилами симуляции чата</p></div><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Закрыть настройки"><X size={20} /></button></header><label className="setting-row"><span><strong>Драматичный режим</strong><small>NPC чаще вступают в перепалки</small></span><input type="checkbox" checked={gameOptions.drama} onChange={(event) => setGameOptions({ ...gameOptions, drama: event.target.checked })} /></label><label className="setting-row"><span><strong>Фоновый шум</strong><small>Локальные реплики жильцов без вызова LLM</small></span><input type="checkbox" checked={gameOptions.autoNoise} onChange={(event) => setGameOptions({ ...gameOptions, autoNoise: event.target.checked })} /></label><label className="setting-row"><span><strong>Сложный режим</strong><small>Подозрительность растёт быстрее</small></span><input type="checkbox" checked={gameOptions.hardMode} onChange={(event) => setGameOptions({ ...gameOptions, hardMode: event.target.checked })} /></label><div className="settings-metrics"><div><span>Напряжение</span><b>{metrics.tension}</b></div><div><span>Подозрение</span><b>{metrics.suspicion}</b></div></div><button className="primary-button" onClick={() => { setSettingsOpen(false); notify('Настройки игры сохранены') }}>Сохранить</button></section></div>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
