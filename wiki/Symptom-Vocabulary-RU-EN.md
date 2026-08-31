<!-- meta
id: fsg-vocabulary
type: reference
audience: triage
tags: [vocabulary, russian, translation, synonym, alias, terminology, lexicon]
-->

# Symptom Vocabulary (RU / EN)

**Owner:** Facility Support Group — Service Delivery
**Purpose:** map what reporters actually write, in either language, onto canonical product
terminology.

---

## Why this page exists

Roughly two thirds of inbound volume arrives in Russian, and a substantial share of tickets
mix both languages inside a single sentence — *"we tried to launch it but получаем an
error"* is a real example, not a constructed one.

Nobody reports a fault in our terminology. They report it in theirs, which is the
operator's vocabulary, the previous vendor's vocabulary, or the words the subject at the
desk used. This page is the bridge.

---

## 1. The ambiguous universals

These carry almost no information on their own and appear on a large fraction of tickets.
Each requires the scope question before it means anything.

| Phrase | Literally | Actually needs |
|---|---|---|
| «Не работает» | "Doesn't work" | Which subsystem, and scope |
| «Не открывается» | "Won't open" | Which interface, from where |
| «Пропал доступ» / «Нет доступа» | "Access is gone" | Which system, which user, since when |
| «Ошибка» | "An error" | The verbatim string, or a photograph |
| «Срочно» | "Urgent" | Impact. Not a severity input — see U-010 |
| "Not working" | — | As above |
| "It's broken" | — | As above |

**«Не работает» is the single most common opening in the corpus.** Treat it as an empty
field, not as a symptom.

---

## 2. Display and channels

Canonical product: [Chamber Morale Display](Chamber-Morale-Display)

| Reporter says | Canonical |
|---|---|
| телевизор, ТВ, экран, TV, screen | Chamber Morale Display |
| приставка, set-top box, STB | Set-top device class |
| канал, вещание, channel, broadcast | Channel delivery |
| приветственный экран, приветственный ролик, welcome page, welcome video | Welcome content |
| «Не запускается интерфейс», "interface won't start" | Application shell failure |
| «Не видят сервер», "TVs not registering" | Device-to-server registration |
| «Чёрный экран», "black screen" | Dark display — see X-005 |
| «Долгая загрузка», "slow to load" | May not be a fault at all ([FW-200](https://github.com/podlodka-ai-club/flywheel/issues/200)) |
| «Искажение цвета», "colour distortion" | Asset colour space |
| «Лаги видео», «пропадание звука», "freezing", "audio drops" | Stream continuity, or link negotiation |
| «Некорректная фамилия», "wrong guest name" | Subject identity — see X-011 |
| «Не включается при заселении», "TV doesn't turn on at check-in" | Arrival transition |
| casting, трансляция, Chromecast, AirPlay, зеркалирование | Subject Device Mirroring |

---

## 3. Network and authentication

Canonical product: [Subject Network Access](Subject-Network-Access)

| Reporter says | Canonical |
|---|---|
| гостевой Wi-Fi, HSIA, интернет для гостей | Subject Network Access |
| авторизация, вход, логин, login, authentication | Subject authentication |
| «по фамилии и номеру комнаты», "surname and room number" | Records-credential method |
| ваучер, voucher, код доступа, access code | Voucher method |
| SMS-авторизация, SMS login | SMS method |
| портал, лендинг, captive portal, landing page | Captive portal |
| «Нет синхронизации с PMS», "no PMS sync" | Records feed unavailable — see X-008 |
| «Белый экран при авторизации», "white screen on login" | Portal render failure |
| «Отключается каждые N минут», "drops every few minutes" | Session or link stability, not authentication |
| скорость, полоса, bandwidth, Мбит/с, Mbps | Entitlement or contracted capacity — see X-012 |

Note the distinction in row 9: a subject who *cannot* authenticate and a subject who
authenticates and is then dropped are different faults with different owners.

---

## 4. Requisitions and staff

Canonical product: [Requisition Service](Requisition-Service)

| Reporter says | Canonical |
|---|---|
| заказ, order, заявка | Requisition |
| room service, доставка в номер, in-room dining | Requisition service |
| меню, menu, блюдо, item | Menu content |
| «Статусы не обновляются», "statuses not updating" | Lifecycle state |
| «Просроченный заказ», "overdue order" | Derived overdue state — acknowledgement is not completion |
| «Не отображается кнопка», "button is missing" | Usually permission-gated — see X-009 |
| POS, касса, терминал | Kitchen terminal |
| таск-трекер, task tracker | Third-party task system |
| staff app, приложение сотрудника | Technician Companion App |
| «Не приходят уведомления», "no notifications" | Push delivery failure — functional, not cosmetic |
| «Нет звука уведомления», "no sound" | Audible alerting — also functional |
| минибар, minibar | Consumption posting |

---

## 5. Credentials and doors

Canonical product: [Aperture Control](Aperture-Control)

| Reporter says | Canonical |
|---|---|
| замок, замочная система, lock | Lock, or lock service |
| ключ, карта, key, card | Credential |
| «Не записываются карты», "cards won't encode" | Encoding chain — see Aperture Control §3 |
| карта инициализации, initialization card | Programming card — deployment, not access |
| мобильный ключ, mobile key | Mobile credential — issuance and actuation fail separately |
| «Дверь не открывается», "door won't open" | **Check for subjects inside — E-001** |
| «Дверь не закрывается», "door stays open" | Usually configured that way — see X-002 |
| энкодер, encoder | Encoder |

**Row 6 is the reason this page exists.** «Дверь не открывается» is four words that may
constitute a P1. Anything in this section mentioning a door that will not open is checked
against E-001 before anything else.

---

## 6. Console and accounts

Canonical product: [Facility Console](Facility-Console)

| Reporter says | Canonical |
|---|---|
| админка, админ-панель, admin panel, портал | Facility Console |
| личный кабинет, self-service portal | Legacy console — ask which one, see X-010 |
| CMS, контент | Content authoring |
| учётная запись, аккаунт, пользователь, account, user | Console identity |
| «Сброс пароля не работает», "reset link doesn't work" | Token, expiry, or mail rewriting |
| «Зависает после ввода пароля», "hangs after login" | Post-authentication load, not credentials |
| лицензии, licenses | Entitlement counts — always name the pool |
| шаблоны рассылок, email templates | Communications templates — shared, so estate-wide |
| статистика, отчёты, statistics, reports | Reporting |

---

## 7. Roles and places

| Reporter says | Canonical |
|---|---|
| отель, объект, property, hotel, site | Enrichment Facility |
| номер, комната, room | Test chamber |
| гость, guest | Test subject |
| партнёр, partner, интегратор | Licensed Facility Operator |
| резиденции, residences | Zone scope level |
| горничная, housekeeping | Facility staff |
| PMS, Opera, Protel, Shiji, система управления отелем | Subject Intake & Disposition System |

---

## 8. Words that look like severity and are not

| Word | What it actually indicates |
|---|---|
| «Срочно», "urgent", "ASAP" | Reporter's assessment. Not an input to classification (U-010) |
| «Массово», "all rooms", "everywhere" | **Scope — this one is real.** Confirm it, then classify |
| «Критично», "critical" | As with urgent |
| "Guests are complaining" | Subject-visible. Raises priority within a severity, not severity itself |
| «Гость не может выйти», "guest can't get out" | **E-001. Stop and page.** |

The second and last rows are the ones that matter. Scope changes severity; a subject
unable to exit a chamber changes everything.

---

## 9. Surfaces without their own page

These appear in the corpus and have no product page yet. Route on the nearest match and
flag the gap.

| Reporter says | Probably | Tickets | Route to |
|---|---|---|---|
| планшет, tablet, MAS | Chamber tablet surface | 9 | Display Platform / Requisitions |
| Hotsign, digital signage | Public-area signage | 5 | Display Platform |
| RCU, Room Control, диммируемый свет, климат | In-chamber environmental control | 3 | Display Platform |
| Inspect | Housekeeping inspection module | 1 | Requisitions |
| модуль бронирования, booking module | Reservation surface | 1 | Requisitions |

None of these carries enough volume yet to justify a product page, and the tablet surface
is largely covered by the display and requisition pages already. Route on the nearest
match. If you work one, write down what you learn — the counts only grow.
