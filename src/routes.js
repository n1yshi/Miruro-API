import { Router } from 'express';
import { anilistQuery, fetchCollection, LIST_FIELDS, FULL_FIELDS, SORT_MAP } from './anilist.js';
import { fetchRawEpisodes, injectSourceSlugs, fetchPipeSources, getProviderStreamType } from './pipe.js';

let router = Router();

router.get('/search', async (req, res) => {
  let query = req.query.query;
  let page = parseInt(req.query.page) || 1;
  let perPage = parseInt(req.query.per_page) || 20;
  let gql = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          ${LIST_FIELDS}
        }
      }
    }
  `;
  let data = await anilistQuery(gql, { search: query, page, perPage });
  let pd = data.Page || {};
  let pi = pd.pageInfo || {};
  res.json({
    page: pi.currentPage || page,
    perPage: pi.perPage || perPage,
    total: pi.total || 0,
    hasNextPage: pi.hasNextPage || false,
    results: pd.media || [],
  });
});

router.get('/suggestions', async (req, res) => {
  let query = req.query.query;
  let gql = `
    query ($search: String) {
      Page(page: 1, perPage: 8) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          id
          title { romaji english }
          coverImage { large }
          format
          status
          startDate { year }
          episodes
        }
      }
    }
  `;
  let data = await anilistQuery(gql, { search: query });
  let results = [];
  let items = data.Page?.media || [];
  for (let item of items) {
    results.push({
      id: item.id,
      title: item.title?.english || item.title?.romaji,
      title_romaji: item.title?.romaji,
      poster: item.coverImage?.large,
      format: item.format,
      status: item.status,
      year: item.startDate?.year,
      episodes: item.episodes,
    });
  }
  res.json({ suggestions: results });
});

router.get('/filter', async (req, res) => {
  let { genre, tag, year, season, format, status, sort } = req.query;
  let page = parseInt(req.query.page) || 1;
  let perPage = parseInt(req.query.per_page) || 20;

  let args = ['type: ANIME', 'sort: [' + (SORT_MAP[sort] || 'POPULARITY_DESC') + ']'];
  let variables = { page, perPage };
  let varTypes = ['$page: Int', '$perPage: Int'];

  if (genre) {
    args.push('genre: $genre');
    variables.genre = genre;
    varTypes.push('$genre: String');
  }
  if (tag) {
    args.push('tag: $tag');
    variables.tag = tag;
    varTypes.push('$tag: String');
  }
  if (year) {
    args.push('seasonYear: $seasonYear');
    variables.seasonYear = parseInt(year);
    varTypes.push('$seasonYear: Int');
  }
  if (season) {
    args.push('season: $season');
    variables.season = season.toUpperCase();
    varTypes.push('$season: MediaSeason');
  }
  if (format) {
    args.push('format: $format');
    variables.format = format.toUpperCase();
    varTypes.push('$format: MediaFormat');
  }
  if (status) {
    args.push('status: $status');
    variables.status = status.toUpperCase();
    varTypes.push('$status: MediaStatus');
  }

  let gql = `
    query (${varTypes.join(', ')}) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(${args.join(', ')}) {
          ${LIST_FIELDS}
        }
      }
    }
  `;
  let data = await anilistQuery(gql, variables);
  let pd = data.Page || {};
  let pi = pd.pageInfo || {};
  res.json({
    page: pi.currentPage || page,
    perPage: pi.perPage || perPage,
    total: pi.total || 0,
    hasNextPage: pi.hasNextPage || false,
    results: pd.media || [],
  });
});

router.get('/spotlight', async (req, res) => {
  let gql = `
    query {
      Page(page: 1, perPage: 10) {
        media(sort: [TRENDING_DESC, POPULARITY_DESC], type: ANIME) {
          ${LIST_FIELDS}
        }
      }
    }
  `;
  let data = await anilistQuery(gql);
  res.json({ results: data.Page?.media || [] });
});

router.get('/trending', async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  let perPage = parseInt(req.query.per_page) || 20;
  res.json(await fetchCollection('TRENDING_DESC', null, page, perPage));
});

router.get('/popular', async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  let perPage = parseInt(req.query.per_page) || 20;
  res.json(await fetchCollection('POPULARITY_DESC', null, page, perPage));
});

router.get('/upcoming', async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  let perPage = parseInt(req.query.per_page) || 20;
  res.json(await fetchCollection('POPULARITY_DESC', 'NOT_YET_RELEASED', page, perPage));
});

router.get('/recent', async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  let perPage = parseInt(req.query.per_page) || 20;
  res.json(await fetchCollection('START_DATE_DESC', 'RELEASING', page, perPage));
});

router.get('/schedule', async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  let perPage = parseInt(req.query.per_page) || 20;
  let gql = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        airingSchedules(notYetAired: true, sort: TIME) {
          episode
          airingAt
          timeUntilAiring
          media {
            ${LIST_FIELDS}
          }
        }
      }
    }
  `;
  let data = await anilistQuery(gql, { page, perPage });
  let pd = data.Page || {};
  let pi = pd.pageInfo || {};
  let results = [];
  for (let item of pd.airingSchedules || []) {
    let entry = item.media || {};
    entry.next_episode = item.episode;
    entry.airingAt = item.airingAt;
    entry.timeUntilAiring = item.timeUntilAiring;
    results.push(entry);
  }
  res.json({
    page: pi.currentPage || page,
    perPage: pi.perPage || perPage,
    total: pi.total || 0,
    hasNextPage: pi.hasNextPage || false,
    results,
  });
});

router.get('/info/:anilist_id', async (req, res) => {
  let gql = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${FULL_FIELDS}
      }
    }
  `;
  let data = await anilistQuery(gql, { id: parseInt(req.params.anilist_id) });
  if (!data.Media) return res.status(404).json({ detail: 'Anime not found' });
  res.json(data.Media);
});

router.get('/anime/:anilist_id/characters', async (req, res) => {
  let id = parseInt(req.params.anilist_id);
  let page = parseInt(req.query.page) || 1;
  let perPage = parseInt(req.query.per_page) || 25;
  let gql = `
    query ($id: Int, $page: Int, $perPage: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english }
        characters(sort: [ROLE, RELEVANCE], page: $page, perPage: $perPage) {
          pageInfo { total currentPage lastPage hasNextPage perPage }
          edges {
            role
            node {
              id
              name { full native userPreferred }
              image { large medium }
              description
              gender
              dateOfBirth { year month day }
              age
              favourites
              siteUrl
            }
            voiceActors {
              id
              name { full native }
              image { large }
              languageV2
            }
          }
        }
      }
    }
  `;
  let data = await anilistQuery(gql, { id, page, perPage });
  let media = data.Media;
  if (!media) return res.status(404).json({ detail: 'Anime not found' });
  let chars = media.characters || {};
  let pi = chars.pageInfo || {};
  res.json({
    page: pi.currentPage || page,
    perPage: pi.perPage || perPage,
    total: pi.total || 0,
    hasNextPage: pi.hasNextPage || false,
    characters: chars.edges || [],
  });
});

router.get('/anime/:anilist_id/relations', async (req, res) => {
  let id = parseInt(req.params.anilist_id);
  let gql = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english }
        relations {
          edges {
            relationType(version: 2)
            node {
              id
              title { romaji english native }
              coverImage { large }
              bannerImage
              format
              type
              status
              episodes
              chapters
              meanScore
              averageScore
              popularity
              startDate { year month day }
            }
          }
        }
      }
    }
  `;
  let data = await anilistQuery(gql, { id });
  let media = data.Media;
  if (!media) return res.status(404).json({ detail: 'Anime not found' });
  res.json({
    id: media.id,
    title: media.title,
    relations: media.relations?.edges || [],
  });
});

router.get('/anime/:anilist_id/recommendations', async (req, res) => {
  let id = parseInt(req.params.anilist_id);
  let page = parseInt(req.query.page) || 1;
  let perPage = parseInt(req.query.per_page) || 10;
  let gql = `
    query ($id: Int, $page: Int, $perPage: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english }
        recommendations(sort: RATING_DESC, page: $page, perPage: $perPage) {
          pageInfo { total currentPage lastPage hasNextPage perPage }
          nodes {
            rating
            mediaRecommendation {
              id
              title { romaji english native }
              coverImage { large extraLarge }
              bannerImage
              format
              episodes
              status
              meanScore
              averageScore
              popularity
              genres
              startDate { year }
            }
          }
        }
      }
    }
  `;
  let data = await anilistQuery(gql, { id, page, perPage });
  let media = data.Media;
  if (!media) return res.status(404).json({ detail: 'Anime not found' });
  let recs = media.recommendations || {};
  let pi = recs.pageInfo || {};
  res.json({
    page: pi.currentPage || page,
    perPage: pi.perPage || perPage,
    total: pi.total || 0,
    hasNextPage: pi.hasNextPage || false,
    recommendations: recs.nodes || [],
  });
});

router.get('/episodes/:anilist_id', async (req, res) => {
  let anilistId = parseInt(req.params.anilist_id);
  let data = await fetchRawEpisodes(anilistId);
  res.json(injectSourceSlugs(data, anilistId));
});

router.get('/sources', async (req, res) => {
  let { episodeId, provider, anilistId, category } = req.query;
  anilistId = parseInt(anilistId);
  category = category || 'sub';

  let data = await fetchPipeSources(episodeId, provider, anilistId, category);
  if (data && typeof data === 'object') {
    data.providerType = getProviderStreamType(provider);
  }
  res.json(data);
});

router.get('/watch/:provider/:anilist_id/:category/:slug', async (req, res) => {
  let { provider, anilist_id, category, slug } = req.params;
  let anilistId = parseInt(anilist_id);
  let data = await fetchRawEpisodes(anilistId);
  let provData = data.providers?.[provider] || {};
  let epList = provData.episodes?.[category] || [];

  let targetId = null;
  for (let ep of epList) {
    let origId = ep.id || '';
    let prefix = origId.includes(':') ? origId.split(':')[0] : origId;
    if (prefix + '-' + ep.number === slug) {
      targetId = origId;
      break;
    }
  }

  if (!targetId) {
    return res.status(404).json({ detail: 'Episode slug \'' + slug + '\' not found for provider ' + provider });
  }

  let sources = await fetchPipeSources(targetId, provider, anilistId, category);
  if (sources && typeof sources === 'object') {
    sources.providerType = getProviderStreamType(provider);
  }
  res.json(sources);
});

export default router;
