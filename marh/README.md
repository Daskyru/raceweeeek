# Схемы трасс NASCAR (источник)

Файлы из этой папки копируются в `public/nascar/tracks/marh/` с нормализованными именами. Соответствие `track_id` → URL задаётся в `src/api/nascarTrackMarhImages.json`.

Чтобы добавить или заменить схему:

1. Положите изображение сюда (PNG/JPG).
2. Добавьте строку в `nascarTrackMarhImages.json`: ключ — **`track_id`** из календаря/API (`race_list_basic` → `track_id`), значение — путь `/nascar/tracks/marh/<slug>.<ext>`.
3. Скопируйте файл в `public/nascar/tracks/marh/` с тем же именем, что в JSON (или обновите скрипт копирования).

Имена файлов вида `162.png` (только ID) пока не используются — карта задаётся в JSON.

## Соответствие файлов → `track_id` (NASCAR `tracks.json`)

Источник имён: `https://cf.nascar.com/cacher/tracks.json` (`track_id`, `track_name`).

| Файл в `marh/` | track_id | Примечание |
|----------------|----------|------------|
| Atlanta Motor Speedway.png | 111 | В фиде трасса названа **EchoPark Speedway** (тот же complex). |
| Chicago Street Race.png | 218 | **Chicago Street Race**. |
| San Diego Street Course.png | 221 | В фиде — **Naval Base Coronado**. |
| Остальные имена совпадают с `track_name` (с пробелами/дефисами). |
