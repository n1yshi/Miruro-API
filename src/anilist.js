const ANILIST_URL = 'https://graphql.anilist.co';

export const LIST_FIELDS = `
    id
    title { romaji english native }
    coverImage { large extraLarge }
    bannerImage
    format
    season
    seasonYear
    episodes
    duration
    status
    averageScore
    meanScore
    popularity
    favourites
    genres
    source
    countryOfOrigin
    isAdult
    studios(isMain: true) { nodes { name isAnimationStudio } }
    nextAiringEpisode { episode airingAt timeUntilAiring }
    startDate { year month day }
    endDate { year month day }
`;

export const FULL_FIELDS = `
    id
    idMal
    title { romaji english native }
    description(asHtml: false)
    coverImage { large extraLarge color }
    bannerImage
    format
    season
    seasonYear
    episodes
    duration
    status
    averageScore
    meanScore
    popularity
    favourites
    trending
    genres
    tags { name rank isMediaSpoiler }
    source
    countryOfOrigin
    isAdult
    hashtag
    synonyms
    siteUrl
    trailer { id site thumbnail }
    studios { nodes { id name isAnimationStudio siteUrl } }
    nextAiringEpisode { episode airingAt timeUntilAiring }
    startDate { year month day }
    endDate { year month day }
    characters(sort: [ROLE, RELEVANCE], perPage: 25) {
        edges {
            role
            node { id name { full native } image { large } }
            voiceActors(language: JAPANESE) { id name { full native } image { large } languageV2 }
        }
    }
    staff(sort: RELEVANCE, perPage: 25) {
        edges {
            role
            node { id name { full native } image { large } }
        }
    }
    relations {
        edges {
            relationType(version: 2)
            node {
                id
                title { romaji english native }
                coverImage { large }
                format
                type
                status
                episodes
                meanScore
            }
        }
    }
    recommendations(sort: RATING_DESC, perPage: 10) {
        nodes {
            rating
            mediaRecommendation {
                id
                title { romaji english native }
                coverImage { large }
                format
                episodes
                status
                meanScore
                averageScore
            }
        }
    }
    externalLinks { url site type }
    streamingEpisodes { title thumbnail url site }
    stats {
        scoreDistribution { score amount }
        statusDistribution { status amount }
    }
`;

export const SORT_MAP = {
  SCORE_DESC: 'SCORE_DESC',
  POPULARITY_DESC: 'POPULARITY_DESC',
  TRENDING_DESC: 'TRENDING_DESC',
  START_DATE_DESC: 'START_DATE_DESC',
  FAVOURITES_DESC: 'FAVOURITES_DESC',
  UPDATED_AT_DESC: 'UPDATED_AT_DESC',
};

export async function anilistQuery(query, variables) {
  let body = { query };
  if (variables) body.variables = variables;
  let res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('AniList query failed');
  let json = await res.json();
  return json.data || {};
}

export async function fetchCollection(sortType, status, page, perPage) {
  let statusFilter = status ? ', status: ' + status : '';
  let gql = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(type: ANIME, sort: [${sortType}]${statusFilter}) {
          ${LIST_FIELDS}
        }
      }
    }
  `;
  let data = await anilistQuery(gql, { page, perPage });
  let pd = data.Page || {};
  let pi = pd.pageInfo || {};
  return {
    page: pi.currentPage || page,
    perPage: pi.perPage || perPage,
    total: pi.total || 0,
    hasNextPage: pi.hasNextPage || false,
    results: pd.media || [],
  };
}
