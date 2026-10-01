export type ItemStatus = 'backlog' | 'playing' | 'completed' | 'dropped';

export const STATUS_ORDER: ItemStatus[] = ['playing', 'completed', 'backlog', 'dropped'];

export const STATUS_META: Record<
  ItemStatus,
  { label: string; short: string; color: string; glow: string; ring: string }
> = {
  playing: {
    label: 'Играю',
    short: 'PLAY',
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.22)',
    ring: 'ring-cyan-400/40',
  },
  completed: {
    label: 'Пройдено',
    short: 'DONE',
    color: '#a3e635',
    glow: 'rgba(163,230,53,0.22)',
    ring: 'ring-lime-400/40',
  },
  backlog: {
    label: 'В планах',
    short: 'BACKLOG',
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.22)',
    ring: 'ring-violet-400/40',
  },
  dropped: {
    label: 'Брошено',
    short: 'DROPPED',
    color: '#fb7185',
    glow: 'rgba(251,113,133,0.22)',
    ring: 'ring-rose-400/40',
  },
};

export interface Game {
  id: number;
  steam_appid: number;
  name: string;
  header_image: string | null;
  background_image: string | null;
  capsule_image: string | null;
  library_image: string | null;
  release_date: string | null;
  developers: string[];
  publishers: string[];
  genres: string[];
  platforms: string[];
  short_description: string | null;
  metacritic: number | null;
  price: string | null;
}

export interface CollectionItem {
  id: number;
  user_id: string;
  game_id: number;
  status: ItemStatus;
  rating: number | null;
  hours_played: number | null;
  finished_at: string | null;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  game: Game;
  category_ids: number[];
}

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  accent: string;
  is_public: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  item_count?: number;
}

export interface TierRow {
  id: number;
  tier_list_id: number;
  key: string;
  label: string;
  color: string;
  sort_order: number;
  items: TierEntry[];
}

export interface TierEntry {
  id: number;
  tier_row_id: number;
  game_id: number;
  position: number;
  game: Game;
}

export interface TierList {
  id: number;
  user_id: string;
  name: string;
  description: string | null;
  theme: string;
  is_public: boolean;
  friends_visible: boolean;
  created_at: string;
  updated_at: string;
  rows?: TierRow[];
  owner?: Pick<Profile, 'id' | 'username' | 'display_name' | 'accent' | 'avatar_url'>;
}

export type FriendshipStatus = 'pending' | 'accepted';

export interface Friendship {
  id: number;
  user_id: string;
  friend_id: string;
  status: FriendshipStatus;
  created_at: string;
  accepted_at: string | null;
  /** Which side of the edge the current viewer is on. Filled in by the friends API. */
  direction?: 'incoming' | 'outgoing' | 'friend';
  profile?: Profile;
}

export interface ShowcaseEntry {
  user_id: string;
  game_id: number;
  position: number;
  game: Game;
}

export type AddFriendResult =
  | 'pending'
  | 'friends'
  | 'self'
  | 'not_found'
  | 'unauthorized';

export interface SteamGameLite {
  steamAppid: number;
  name: string;
  headerImage: string;
  capsuleImage: string;
  libraryImage: string;
  backgroundImage: string;
  releaseDate: string | null;
  developers: string[];
  publishers: string[];
  genres: string[];
  shortDescription: string;
  metacritic: number | null;
  price: string | null;
  platforms: string[];
  /** 'game' | 'dlc' | 'demo' | ... - used to keep DLC out of the top of search results */
  type?: string;
  /** total Steam reviews, used as a popularity signal in search */
  reviews?: number;
}

export interface FeaturedLists {
  topSellers: { appid: number; name: string; header: string }[];
  specials: { appid: number; name: string; header: string }[];
  newReleases: { appid: number; name: string; header: string }[];
}
