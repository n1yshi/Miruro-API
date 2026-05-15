# Miruro Wrapper API

A Node.js/Express wrapper for the Miruro anime streaming API. Provides decrypted access to anime metadata, episode lists, and video sources.

## Features

- Search anime, get autocomplete suggestions, filter by genre/tag/year/season/format/status
- Trending, popular, upcoming, currently airing, and schedule endpoints
- Full anime details: characters, relations, recommendations, staff, stats
- Multi-provider episode lists with streaming sources (kiwi, zoro, arc, pahe, etc.)
- Origin-based and API key security middleware

## Quick Start

```bash
npm install
npm start
```

The server starts on `http://localhost:3000`.

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins |
| `API_KEY` | Optional API key for authentication |

## API Endpoints

### Search & Discovery
| Endpoint | Description |
|---|---|
| `GET /search?query=&page=&per_page=` | Search anime by name |
| `GET /suggestions?query=` | Autocomplete (max 8 results) |
| `GET /spotlight` | Top 10 trending + popular |
| `GET /filter?genre=&tag=&year=&season=&format=&status=&sort=&page=&per_page=` | Advanced filtering |

### Collections
| Endpoint | Description |
|---|---|
| `GET /trending?page=&per_page=` | Currently trending |
| `GET /popular?page=&per_page=` | Most popular |
| `GET /upcoming?page=&per_page=` | Upcoming releases |
| `GET /recent?page=&per_page=` | Currently airing |
| `GET /schedule?page=&per_page=` | Airing schedule with timestamps |

### Anime Details
| Endpoint | Description |
|---|---|
| `GET /info/{anilist_id}` | Full anime info (characters, staff, relations, recommendations) |
| `GET /anime/{id}/characters?page=&per_page=` | Character list with voice actors |
| `GET /anime/{id}/relations` | Related media |
| `GET /anime/{id}/recommendations?page=&per_page=` | Community recommendations |

### Streaming
| Endpoint | Description |
|---|---|
| `GET /episodes/{anilist_id}` | All episodes from all providers |
| `GET /sources?episodeId=&provider=&anilistId=&category=` | Video sources for an episode |
| `GET /watch/{provider}/{anilistId}/{category}/{slug}` | Simplified video sources using slug from episodes |

## Deployment

### Docker
```bash
docker build -t miruro-wrapper .
docker run -p 3000:3000 miruro-wrapper
```

### Vercel
Push to your repo and connect to Vercel — it auto-detects `vercel.json`.
